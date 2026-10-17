#!/usr/bin/env python3
"""Compare restored catalog to the independently captured live definitions/ACLs."""
import json
from pathlib import Path
from generate import acl_entries

ROOT = Path(__file__).resolve().parent


def normalized_acl(value, owner, kind):
    entries = acl_entries(value)
    if entries is None:
        entries = [(owner, {'schema': 'UC', 'relation': 'arwdDxtm', 'sequence': 'rwU', 'function': 'X'}[kind], owner)]
        if kind == 'function':
            entries.append(('PUBLIC', 'X', owner))
    # A grant's order/issuer does not change effective permissions. Preserve options.
    return sorted((r, ''.join(sorted(p))) for r, p, _ in entries if p)


def canonical(c):
    c = json.loads(json.dumps(c))
    for key, kind in [('schemas', 'schema'), ('relations', 'relation'),
                      ('sequences', 'sequence'), ('functions', 'function'),
                      ('default_privileges', 'relation')]:
        for item in c[key]:
            item['acl'] = normalized_acl(item['acl'], item['owner'], kind)
    for r in c['relations']:
        for a in r['columns']:
            if a['acl'] is not None:
                a['acl'] = normalized_acl(a['acl'], r['owner'], 'relation')
    c['view_dependencies'] = sorted(c['view_dependencies'], key=lambda x: json.dumps(x, sort_keys=True))
    return c


def verify_catalog(actual, native=False):
    expected = canonical(json.loads((ROOT / 'catalog.json').read_text()))
    actual = canonical(actual)
    differences = []

    def compare(a, b, path):
        if type(a) is not type(b):
            differences.append(path + ': value type differs')
        elif isinstance(a, dict):
            for k in sorted(a.keys() | b.keys()):
                if k not in a or k not in b:
                    differences.append(path + '.' + k + ': missing/unexpected field')
                else:
                    compare(a[k], b[k], path + '.' + k)
        elif isinstance(a, list):
            if len(a) != len(b):
                differences.append(f'{path}: expected {len(a)}, got {len(b)} entries')
            for i, (x, y) in enumerate(zip(a, b)):
                label = x.get('name', x.get('policyname', str(i))) if isinstance(x, dict) else str(i)
                compare(x, y, path + '[' + label + ']')
        elif a != b:
            differences.append(path + ': differs')

    for key in expected:
        if key not in ('server_version', 'extensions'):
            compare(expected[key], actual.get(key), key)
    required_extensions = {'pgcrypto', 'uuid-ossp', 'plpgsql'} if native else {e['name'] for e in expected['extensions']}
    present = {e['name'] for e in actual['extensions']}
    assert required_extensions <= present, 'Required managed extensions are missing'
    assert actual['server_version'].split('.')[0] == '17', 'Use reviewed PostgreSQL major version 17'
    if differences:
        raise AssertionError('Restored catalog differs:\n' + '\n'.join(differences[:60]))
    print(f'PASS: full application catalog and effective ACL comparison (PostgreSQL {actual["server_version"]}; '
          + ('native platform adapter' if native else 'Supabase platform') + ')', flush=True)
