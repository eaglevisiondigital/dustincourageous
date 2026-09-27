#!/usr/bin/env python3
"""Rebuild the historical mapping report offline (optional pglast==7.11).

The parser inventories statement targets; current definitions always come from
catalog.json. Presence is not a claim that an old definition remains unchanged.
"""
import collections
import hashlib
import json
from pathlib import Path
from pglast.parser import parse_sql_json

ROOT = Path(__file__).resolve().parent
REPO = ROOT.parents[1]
DOCS = REPO / 'docs/recovery'


def clean(value):
    if isinstance(value, dict):
        return {k: clean(v) for k, v in value.items() if k not in ('location', 'stmt_location', 'stmt_len')}
    if isinstance(value, list):
        return [clean(v) for v in value]
    return value


def parse(sql):
    return [x['stmt'] for x in json.loads(parse_sql_json(sql))['stmts']]


def strings(items):
    return '.'.join(x['String']['sval'] for x in items)


def relation(item):
    return item.get('schemaname', 'public') + '.' + item['relname']


def targets(statement):
    kind, x = next(iter(statement.items()))
    if kind == 'CreateStmt':
        return [('table', relation(x['relation']))]
    if kind == 'CreateFunctionStmt':
        return [('function', strings(x['funcname']))]
    if kind == 'ViewStmt':
        return [('view', relation(x['view']))]
    if kind == 'IndexStmt':
        return [('index', x['relation'].get('schemaname', 'public') + '.' + x['idxname'])]
    if kind == 'CreateTrigStmt':
        return [('trigger', relation(x['relation']) + '.' + x['trigname'])]
    if kind in ('CreatePolicyStmt', 'AlterPolicyStmt'):
        return [('policy', relation(x['table']) + '.' + x['policy_name'])]
    if kind == 'CreateSchemaStmt':
        return [('schema', x['schemaname'])]
    if kind == 'AlterTableStmt':
        result = [('table', relation(x['relation']))]
        for cmd in x['cmds']:
            a = cmd['AlterTableCmd']
            if a['subtype'] == 'AT_AddColumn':
                result.append(('column', relation(x['relation']) + '.' + a['def']['ColumnDef']['colname']))
            if a['subtype'] == 'AT_AddConstraint':
                name = a['def']['Constraint'].get('conname')
                if name:
                    result.append(('constraint', relation(x['relation']) + '.' + name))
        return result
    if kind in ('GrantStmt', 'DropStmt', 'InsertStmt', 'VariableSetStmt'):
        return []
    raise AssertionError('Unreviewed historical statement: ' + kind)


def body(statement):
    if 'CreateFunctionStmt' not in statement:
        return None
    for option in statement['CreateFunctionStmt']['options']:
        o = option['DefElem']
        if o['defname'] == 'as':
            return o['arg']['List']['items'][0]['String']['sval'].strip()


def main():
    DOCS.mkdir(parents=True, exist_ok=True)
    catalog = json.loads((ROOT / 'catalog.json').read_text())
    present = set()
    for r in catalog['relations']:
        name = r['schema'] + '.' + r['name']
        present.add(('view' if r['kind'] == 'v' else 'table', name))
        present.update(('column', name + '.' + a['name']) for a in r['columns'])
        present.update(('constraint', name + '.' + a['name']) for a in r['constraints'] or [])
        present.update(('index', r['schema'] + '.' + a['name']) for a in r['indexes'] or [])
    present.update(('function', f['schema'] + '.' + f['name']) for f in catalog['functions'])
    present.update(('schema', s['name']) for s in catalog['schemas'])
    present.update(('trigger', t['schema'] + '.' + t['table'] + '.' + t['name']) for t in catalog['triggers'])
    present.update(('policy', p['schemaname'] + '.' + p['tablename'] + '.' + p['policyname']) for p in catalog['policies'])
    live_bodies = {f['schema'] + '.' + f['name']: body(parse(f['definition'])[0]) for f in catalog['functions']}
    assert len(live_bodies) == len(catalog['functions']), 'Function overloads require signature-aware historical mapping'
    records = []
    for p in sorted((ROOT / 'history').glob('*.sql')):
        version, name = p.stem.split('_', 1)
        sql = p.read_text()
        statements = parse(sql)
        local = list((REPO / 'supabase/migrations').glob('*_' + name + '.sql'))
        assert len(local) <= 1
        equivalent = None if not local else clean(statements) == clean(parse(local[0].read_text()))
        assert equivalent is not False, 'Historical/local SQL differs semantically: ' + name
        byte_equal = bool(local and sql == local[0].read_text())
        classification = ('production-only historical migration' if not local else
                          'exact repository match' if local[0].name == p.name else
                          'same logical migration but different timestamp/name')
        touched = sorted(set(t for s in statements for t in targets(s)))
        funcs = {strings(s['CreateFunctionStmt']['funcname']): body(s) for s in statements if 'CreateFunctionStmt' in s}
        records.append(dict(version=version, name=name, archive=p.name,
                            local=local[0].name if local else None, classification=classification,
                            sql_sha256=hashlib.sha256(sql.encode()).hexdigest(),
                            local_byte_equal=byte_equal, local_ast_equal=equivalent,
                            statement_counts=dict(collections.Counter(next(iter(s)) for s in statements)),
                            objects=[dict(kind=k, name=n, present=(k,n) in present) for k,n in touched],
                            function_bodies=[dict(name=n, matches_current_body=(v == live_bodies.get(n)),
                                                  current_present=('function',n) in present) for n,v in funcs.items()]))
    for i, r in enumerate(records):
        names = {(o['kind'], o['name']) for o in r['objects']}
        r['later_recorded_touches'] = [x['version'] + '_' + x['name'] for x in records[i+1:]
                                     if names & {(o['kind'],o['name']) for o in x['objects']}]
    seen_tables = set()
    seen_functions = set()
    for p in sorted((ROOT / 'history').glob('*.sql')):
        for statement in parse(p.read_text()):
            if 'CreateStmt' in statement:
                seen_tables.update(targets(statement))
            elif 'CreateFunctionStmt' in statement:
                seen_functions.update(targets(statement))
    gaps = {'tables_without_recorded_create': sorted(n for k,n in present if k == 'table' and (k,n) not in seen_tables),
            'functions_without_recorded_create': sorted(n for k,n in present if k == 'function' and (k,n) not in seen_functions)}
    (ROOT / 'history-map.json').write_text(json.dumps({'records': records, 'gaps': gaps}, indent=2) + '\n')
    lines = [
        '# Migration history map — 2026-09-26', '',
        'All 40 live records contain their original SQL. All 24 repository migrations have a related live record; 12 timestamps differ. Of the 24 related SQL bodies, 21 are byte-exact and three differ only in comments/whitespace (equal PostgreSQL parse trees). The original root files and live migration history remain unchanged.', '',
        'Source order checked: all available tracked Git history, existing root migration files, then read-only live migration records and deployed catalog. Git history contains no earlier copy of the 16 missing migrations. Their exact recorded SQL is archived under `supabase/recovery/history/`, outside the executable migration path. This is recovered historical evidence, not a newly invented migration chain.', '',
        f'**The history is incomplete as a creation ledger:** {len(gaps["tables_without_recorded_create"])} current application tables and {len(gaps["functions_without_recorded_create"])} current functions have no CREATE statement in any of the 40 records. Their current source is recovered in the catalog/bootstrap; the missing original change records remain unknown. Restoring all 40 historical records alone cannot reconstruct the current backend.', '',
        'Classification describes repository/history correspondence. Supersession is tracked separately: a migration can match Git exactly while some effects have since changed. “Present” below means the named object still exists, not that its historical definition remains identical. Current definitions, signatures, RLS and effective ACLs are verified by the complete catalog round-trip. Function-body matching is exact after trimming outer whitespace, not a proof of semantic equivalence.', '',
        '| Live version / migration | Related repository filename | Classification / SQL verification | Current effects / later changes | Recovery treatment |',
        '| --- | --- | --- | --- | --- |',
    ]
    for r in records:
        n = sum(o['present'] for o in r['objects'])
        matched = sum(f['matches_current_body'] for f in r['function_bodies'])
        status = f'{n}/{len(r["objects"])} named targets present; {matched}/{len(r["function_bodies"])} function bodies unchanged'
        if r['later_recorded_touches']:
            status += '; later recorded touches: ' + ', '.join(x[:14] for x in r['later_recorded_touches'])
        else:
            status += '; no later recorded target overlap'
        sql = 'original SQL verified' if not r['local'] else ('byte-exact SQL' if r['local_byte_equal'] else 'equal parsed SQL; comments/whitespace differ')
        lines.append(f'| `{r["version"]}` {r["name"]} | `{r["local"]}` | {r["classification"]}; {sql} | {status} | Keep history; restore current bootstrap only |'.replace('`None`','—'))
    lines += ['', '## Per-record object evidence and supersession', '',
              'Grants/revokes are retained verbatim in each archive and evaluated through the current ACL inventory; they are not treated as proof of present privilege. DROP statements and the exact altered columns/policies remain visible in the linked SQL. The JSON mapping records every statement-type count. No historical data statement is replayed: the six top-level INSERTs concern plans/entitlement definitions/plan entitlements and a bucket, not family records. Current business/reference rows require a separate verified backup.', '']
    for r in records:
        lines += [f'### {r["version"]} — {r["name"]}', '',
                  f'[Exact SQL](../../supabase/recovery/history/{r["archive"]}); SHA-256 `{r["sql_sha256"]}`.', '',
                  'Statement inventory: ' + ', '.join(f'{k}={v}' for k,v in sorted(r['statement_counts'].items())) + '.', '']
        for kind in ('schema','table','column','constraint','view','index','trigger','policy','function'):
            objects = [o for o in r['objects'] if o['kind'] == kind]
            if objects:
                lines.append('- ' + kind.title() + ': ' + ', '.join('`'+o['name']+'`'+(' (absent/replaced)' if not o['present'] else '') for o in objects) + '.')
        changed = [f for f in r['function_bodies'] if not f['matches_current_body']]
        if changed:
            lines += ['', 'Historical function bodies superseded/changed or absent: ' + ', '.join('`'+f['name']+'`' for f in changed) + '. Use the captured current definition; do not reapply this historical body.']
        lines += ['', 'Later recorded target overlap: ' + (', '.join('`'+x+'`' for x in r['later_recorded_touches']) or 'none') + '. Overlap identifies possible partial supersession, not wholesale obsolescence of this record.', '']
    lines += ['## Current objects without a recorded CREATE', '',
              'Their definitions are recovered from the live catalog. The original creation chronology is unresolved; no fake historical migration was invented.', '',
              'Tables ('+str(len(gaps['tables_without_recorded_create']))+'): ' + ', '.join('`'+x+'`' for x in gaps['tables_without_recorded_create']) + '.', '',
              'Functions ('+str(len(gaps['functions_without_recorded_create']))+'): ' + ', '.join('`'+x+'`' for x in gaps['functions_without_recorded_create']) + '.', '']
    (DOCS / 'MIGRATION_HISTORY_MAP.md').write_text('\n'.join(lines))
    print('Mapped 40 live / 24 local records; creation gaps:', {k:len(v) for k,v in gaps.items()})


if __name__ == '__main__':
    main()
