#!/usr/bin/env python3
"""Offline dependency inventory. Requires pglast==7.11; never connects to a database.

Produces review input, not automatic authorization. Qualified SQL is parsed using
PostgreSQL's grammar; PL/pgSQL expressions are extracted from its parsed body.
Dynamic SQL and parse failures require an explicit human-reviewed override.
"""
import json,re
from pathlib import Path
from collections import defaultdict
from pglast import parse_plpgsql
from pglast.parser import parse_sql_json
ROOT=Path(__file__).resolve().parents[2]
c=json.loads((ROOT/'supabase/recovery/catalog.json').read_text())
relations={x['schema']+'.'+x['name']:x for x in c['relations']}
functions={x['schema']+'.'+x['name']:x for x in c['functions']}
errors=[]

def walk(x):
    if isinstance(x,dict):
        yield x
        for v in x.values(): yield from walk(v)
    elif isinstance(x,list):
        for v in x: yield from walk(v)

def sql_deps(sql,label,mode=0):
    try: tree=json.loads(parse_sql_json(('SELECT ' if mode else '')+sql))
    except Exception as e:
        errors.append({'source':label,'sql':sql,'error':str(e)})
        return {},set()
    tbl=defaultdict(set); calls=set(); targets=set()
    for d in walk(tree):
        for kind,op in [('InsertStmt','INSERT'),('UpdateStmt','UPDATE'),('DeleteStmt','DELETE')]:
            if kind in d:
                v=d[kind]; r=v['relation']; name=r.get('schemaname','')+'.'+r['relname'];targets.add(id(r))
                if name in relations:
                    tbl[name].add(op)
                    if op!='INSERT' or v.get('returningList'): tbl[name].add('SELECT')
                    if v.get('onConflictClause',{}).get('action')=='ONCONFLICT_UPDATE':tbl[name].update(['UPDATE','SELECT'])
    for d in walk(tree):
        if 'RangeVar' in d:
            r=d['RangeVar'];name=r.get('schemaname','')+'.'+r['relname']
            if name in relations and id(r) not in targets:tbl[name].add('SELECT')
        if 'FuncCall' in d:
            name='.'.join(x['String']['sval'] for x in d['FuncCall']['funcname'])
            if name in functions:calls.add(name)
    return dict(tbl),calls

def merge(a,b):
    for k,v in b.items(): a.setdefault(k,set()).update(v)

def deps_function(f):
    s=f['definition']; tbl={}; calls=set()
    if 'LANGUAGE plpgsql' in s:
        try: tree=parse_plpgsql(s)
        except Exception as e:errors.append({'source':f['name'],'error':str(e)});return tbl,calls
        for d in walk(tree):
            if any('dynexecute' in k for k in d): errors.append({'source':f['name'],'dynamic_sql':d})
            if 'PLpgSQL_expr' in d:
                e=d['PLpgSQL_expr'];q=e['query'];mode=e.get('parseMode',0)
                if mode in (3,4,5):q=re.split(r'\s*(?::=|=)\s*',q,maxsplit=1)[-1];mode=2
                a,b=sql_deps(q,f['schema']+'.'+f['name'],mode!=0);merge(tbl,a);calls.update(b)
    else:
        body=re.search(r'AS (\$\w*\$)(.*?)\1',s,re.S).group(2)
        tbl,calls=sql_deps(body,f['schema']+'.'+f['name'])
    return tbl,calls

# Balanced JavaScript call scanner (strings/comments are skipped); conditional
# invitation RPC is the one known nonliteral RPC and is enumerated explicitly.
def end_call(s,pos):
    depth=0;i=pos;quote=None
    while i<len(s):
        ch=s[i]
        if quote:
            if ch=='\\':i+=2;continue
            if ch==quote:quote=None
        elif ch in "\"'`":quote=ch
        elif s[i:i+2]=='//':
            i=s.find('\n',i)
            if i<0:return len(s)
            continue
        elif s[i:i+2]=='/*':i=s.index('*/',i+2)+2;continue
        elif ch=='(':depth+=1
        elif ch==')':
            depth-=1
            if depth==0:return i+1
        i+=1
    raise ValueError('Unbalanced source call')

source=[]
for base in ['club-app/src','supabase/functions','assets/js']:
 for p in sorted((ROOT/base).rglob('*')):
  if p.suffix not in ('.ts','.tsx','.js'):continue
  s=p.read_text()
  for m in re.finditer(r'(\w+)\s*\.\s*(from|rpc)\s*\(',s):
    end=end_call(s,m.end()-1);arg=s[m.end():end-1];kind=m[2]
    literal=re.match(r'\s*[\"\']([\w-]+)[\"\']',arg)
    if not literal:
     if kind=='rpc' and 'decision ===' in arg:
      for n in ('approve_parent_challenge','return_parent_challenge'):
       source.append(dict(object='public.'+n,operations=['EXECUTE'],role='authenticated',source=str(p.relative_to(ROOT))+':'+str(s[:m.start()].count('\n')+1)+' (conditional RPC)'))
     elif kind=='rpc' and 'kind===' not in arg:raise AssertionError(('Review dynamic RPC',str(p),arg))
     continue
    name='public.'+literal[1]
    if name not in (relations if kind=='from' else functions):continue
    ops=set();pos=end
    if kind=='from':
     while (n:=re.match(r'\s*\.\s*(\w+)\s*\(',s[pos:])):
      op=n[1];pos=end_call(s,pos+n.end()-1)
      if op in ('select','insert','update','delete'):ops.add(op.upper())
      if op=='upsert':ops.update(['INSERT','UPDATE','SELECT'])
    else:ops.add('EXECUTE')
    role='authenticated' if base.startswith('club') or m[1]=='userClient' else 'service_role'
    source.append({'object':name,'operations':sorted(ops),'role':role,'source':str(p.relative_to(ROOT))+':'+str(s[:m.start()].count('\n')+1)})
# PostgREST resource embedding also requires SELECT on the related relation.
for p in sorted((ROOT/'club-app/src').rglob('*')):
 if p.suffix not in ('.ts','.tsx'):continue
 s=p.read_text()
 for m in re.finditer(r"\.select\(\s*[\"']([^\"']+)[\"']",s):
  for n in re.finditer(r'(\w+)(?:![\w_]+)*\(',m[1]):
   if 'public.'+n[1] in relations:
    source.append(dict(object='public.'+n[1],operations=['SELECT'],role='authenticated',source=str(p.relative_to(ROOT))+':'+str(s[:m.start()].count('\n')+1)+' (PostgREST embedding)'))
source += [dict(object='public.'+n,operations=['EXECUTE'],role='authenticated',source='club-app/src/lib/invitationAcceptance.ts:13 (conditional RPC)') for n in ['accept_household_invitation','accept_organization_invitation']]
fn={k:deps_function(f) for k,f in functions.items()}
views={k:sql_deps(v['view_definition'],k) for k,v in relations.items() if v['kind']=='v'}
pol={}
for p in c['policies']:
 k=p['schemaname']+'.'+p['tablename'];a,b=sql_deps('SELECT '+(p['qual'] or 'true')+', '+(p['with_check'] or 'true'),'policy '+p['policyname'])
 pol.setdefault(k,[]).append((p,a,b))
# Trigger entrypoint EXECUTE is checked when creating a trigger, not firing it.
triggers=defaultdict(list)
for t in c['triggers']:
 m=re.search(r'EXECUTE FUNCTION ([\w.]+)\(',t['definition']);assert m,t
 triggers[t['schema']+'.'+t['table']].append(m[1])

out={'sources':source,'functions':{k:{'relations':{t:sorted(o) for t,o in a.items()},'functions':sorted(b),'definer':'SECURITY DEFINER' in functions[k]['definition'],'trigger':'RETURNS trigger' in functions[k]['definition']} for k,(a,b) in fn.items()},'views':{k:{'relations':{t:sorted(o) for t,o in a.items()},'functions':sorted(b)} for k,(a,b) in views.items()},'policies':{k:[{'name':p['policyname'],'roles':p['roles'],'command':p['cmd'],'relations':{t:sorted(o) for t,o in a.items()},'functions':sorted(b)} for p,a,b in v] for k,v in pol.items()},'triggers':triggers,'parse_review':errors}
(ROOT/'supabase/security/dependencies.json').write_text(json.dumps(out,indent=2)+'\n')
print('Sources',len(source),'functions',len(fn),'views',len(views),'parse review',len(errors))
for e in errors:print(json.dumps(e)[:900])
