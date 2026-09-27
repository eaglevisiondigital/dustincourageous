import json,collections
from pathlib import Path
root=Path.cwd();d=json.load(open('supabase/security/dependencies.json'));c=json.load(open('supabase/recovery/catalog.json'))
rel={x['schema']+'.'+x['name']:x for x in c['relations']};fns={x['schema']+'.'+x['name']:x for x in c['functions']}
grants=collections.defaultdict(lambda:collections.defaultdict(set));reasons=collections.defaultdict(lambda:collections.defaultdict(set)); queue=[]
def add(obj,op,why):
 reasons[obj][op].add(why)
 if op not in grants[obj]['authenticated']:grants[obj]['authenticated'].add(op);queue.append((obj,op))
def consume(deps,why):
 for t,ops in deps['relations'].items():
  for op in ops:add(t,op,why)
 for f in deps['functions']:add(f,'EXECUTE',why)
# Reviewed reduction: content payload/fingerprint run with caller rights.
for name in ('private.dc_entity_payload','private.dc_entity_fingerprint','private.household_is_paid_member'):
 d['functions'][name]['definer']=False
for s in d['sources']:
 if s['role']=='authenticated':
  for op in s['operations']:add(s['object'],op,s['source'])
for p in d['policies'].get('storage.objects',[]):
 consume(p,'Storage policy '+p['name'])
# Existing repaired PIN API is deliberately retained even though UI uses sessions.
add('public.verify_guardian_pin','EXECUTE','approved PIN repair API; guardian_pin_security_regression.sql')
visited_triggers=set()
while queue:
 obj,op=queue.pop(0)
 if obj in d['functions']:
  if not d['functions'][obj]['definer']:consume(d['functions'][obj],'invoker '+obj)
 else:
  if obj in d['views']:consume(d['views'][obj],'invoker view '+obj)
  for p in d['policies'].get(obj,[]):
   # Only applicable client policies, SELECT policies also govern writes with RETURNING/filter.
   if ('authenticated' in p['roles'] or 'public' in p['roles']) and (p['command'] in ('ALL',op) or p['command']=='SELECT'):
    consume(p,'RLS '+obj+'.'+p['name'])
  if op in ('INSERT','UPDATE','DELETE'):
   for fn in d['triggers'].get(obj,[]):
    if fn not in visited_triggers:
     visited_triggers.add(fn)
     if not d['functions'][fn]['definer']:consume(d['functions'][fn],'invoker trigger '+fn+' on '+obj)
# Preserve existing column-only restriction; never expand it to a table UPDATE.
objects=[]
for k,r in rel.items():
 cols={}
 if k=='public.child_group_memberships' and 'UPDATE' in grants[k]['authenticated']:
  grants[k]['authenticated'].remove('UPDATE');cols={'UPDATE':['status','ended_at']}
 if k in ('public.product_variants','public.promo_codes'):
  cols={'UPDATE':['id']}
  reasons[k]['UPDATE(id)'].add('public.create_checkout_order row locking (FOR SHARE / FOR UPDATE); RLS still applies')
 objects.append(dict(object=k,kind=r['kind'],authenticated=sorted(grants[k]['authenticated']),columns=cols,anon=[],reasons={op:sorted(v) for op,v in reasons[k].items()}))
for k,f in fns.items():
 g=sorted(grants[k]['authenticated']);dep=d['functions'][k]
 cat='6 trigger/internal helper' if dep['trigger'] else '4 admin-only RPC' if g and ('admin_' in k or k.endswith(('approve_dc_content_review','publish_dc_entity','dc_preflight_scan','submit_dc_content_review','return_dc_content_review'))) else '3 privileged guarded authenticated RPC' if g and dep['definer'] else '2 authenticated RPC/helper' if g else '5 server/worker-only function' if 'service_role=X' in (f['acl'] or '') else '7 owner-only implementation detail'
 objects.append(dict(object=k,kind='f',authenticated=g,anon=[],category=cat,reasons={op:sorted(v) for op,v in reasons[k].items()}))
(root/'supabase/security/proposed-policy.json').write_text(json.dumps({'objects':objects},indent=2)+'\n')
for o in objects:
 if o['kind']!='f':print(o['object'],','.join(o['authenticated']) or 'NONE')
print('Unused public functions',[o['object'] for o in objects if o['kind']=='f' and o['object'].startswith('public.') and not o['authenticated']])
print('Missing operation sources',[s for s in d['sources'] if not s['operations']])
print('Guarded helper exec newly needed',[o['object'] for o in objects if o['kind']=='f' and o['authenticated'] and 'authenticated=X' not in (fns[o['object']]['acl'] or '')])
