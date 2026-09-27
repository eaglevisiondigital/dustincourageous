#!/usr/bin/env python3
"""Render the reviewed positive allowlist; does not connect or apply changes."""
import json
from pathlib import Path
from collections import Counter
ROOT=Path(__file__).resolve().parents[2]
c=json.loads((ROOT/'supabase/recovery/catalog.json').read_text())
p=json.loads((ROOT/'supabase/security/proposed-policy.json').read_text())
d=json.loads((ROOT/'supabase/security/dependencies.json').read_text())
fns={x['schema']+'.'+x['name']:x for x in c['functions']}
service={s['object'] for s in d['sources'] if s['role']=='service_role' and 'EXECUTE' in s['operations']}
lines=['-- Dependency-aware client ACL hardening. Reviewed source matrix: docs/security/CLIENT_PRIVILEGE_MATRIX.md.',
'-- No application rows, policies, triggers, schedules, providers, or historical migrations are changed.',
'-- Hosted postgres cannot ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin; see platform blocker.',
"SET LOCAL lock_timeout = '5s';", "SET LOCAL statement_timeout = '60s';",
'REVOKE ALL ON ALL TABLES IN SCHEMA public, private FROM PUBLIC, anon, authenticated;',
'REVOKE ALL ON ALL SEQUENCES IN SCHEMA public, private FROM PUBLIC, anon, authenticated;',
'REVOKE ALL ON ALL FUNCTIONS IN SCHEMA public, private FROM PUBLIC, anon, authenticated, service_role;',
'-- Content inspection and membership-status helpers must respect caller RLS; nested owner calls retain owner rights.',
'ALTER FUNCTION private.dc_entity_payload(text,uuid) SECURITY INVOKER;',
'ALTER FUNCTION private.dc_entity_fingerprint(text,uuid) SECURITY INVOKER;',
'ALTER FUNCTION private.household_is_paid_member(uuid) SECURITY INVOKER;',
'-- Existing column-only group membership restriction is preserved below.']
for o in p['objects']:
 name=o['object']; ops=o['authenticated'];kind=o['kind']
 if kind=='f':
  f=fns[name];target=name+'('+f['identity_args']+')'
  o['service_role']=['EXECUTE'] if name in service else []
  if name in service:o['category']='5 server/worker-only function'
  elif not ops and not 'trigger' in o['category']:o['category']='7 owner-only implementation detail'
  if ops:lines.append(f'GRANT EXECUTE ON FUNCTION {target} TO authenticated;')
  if name in service:lines.append(f'GRANT EXECUTE ON FUNCTION {target} TO service_role;')
 else:
  assert kind!='v' or not set(ops)-{'SELECT'}
  assert not name.startswith('private.') or not ops
  if ops:lines.append(f'GRANT {", ".join(ops)} ON TABLE {name} TO authenticated;')
  for op,cols in o.get('columns',{}).items():lines.append(f'GRANT {op} ({", ".join(cols)}) ON TABLE {name} TO authenticated;')
lines += [
'-- Per-schema defaults are additive. Revoke global PUBLIC EXECUTE as well as explicit schema grants.',
'ALTER DEFAULT PRIVILEGES FOR ROLE postgres REVOKE EXECUTE ON FUNCTIONS FROM PUBLIC, anon, authenticated;',
'ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public REVOKE ALL ON TABLES FROM PUBLIC, anon, authenticated;',
'ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public REVOKE ALL ON SEQUENCES FROM PUBLIC, anon, authenticated;',
'ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public REVOKE ALL ON FUNCTIONS FROM PUBLIC, anon, authenticated;',
'-- Existing service_role and platform-owner defaults are retained. New client exposure requires explicit reviewed grants.',
"NOTIFY pgrst, 'reload schema';",'']
(ROOT/'supabase/migrations/20260927011823_dependency_aware_client_privileges.sql').write_text('\n'.join(lines))
(ROOT/'supabase/security/proposed-policy.json').write_text(json.dumps(p,indent=2)+'\n')
md=['# Client privilege matrix','',
'Prepared before production revocation from commit `60e151c5556a407982342a81c8bac42579597699`. This is a reviewed positive allowlist, not a blanket CRUD grant based on the presence of RLS. The current catalog, SQL policies, invoker views, triggers and all 213 function bodies were inspected. PostgreSQL 17 parsing found no unreviewed dynamic SQL or failed expressions.','',
'`supabase/security/dependencies.json` records 443 concrete browser/Edge call sites, the two conditional RPC paths, every parsed function/view dependency, RLS helpers, and trigger dependencies. `proposed-policy.json` records each retained operation and its sources. Admins and guardians share the authenticated database role; trusted membership/admin checks and unchanged RLS decide which rows each may use.','',
'Closure follows invoker RPCs/views, applicable policies and invoker trigger bodies. It stops at definer boundaries: their table permissions belong to the owner, not the browser. Trigger execution does not require a client EXECUTE grant on the trigger entrypoint. Existing group-membership UPDATE is column-only (`status`, `ended_at`); it is not widened. The checkout RPC locks products, variants and promo codes; PostgreSQL requires UPDATE permission for row locks. Existing product UPDATE is retained; variants/promos receive UPDATE(id) only, still subject to RLS. Its pre-existing ambiguous order_number failure is separately documented. All four sequences are identity sequences, tested without client sequence grants. PostgREST embedded relation reads are checked against source and the HTTP compatibility suite.','',
'Anonymous clients require no application table/view/function privileges: the static site submits to the preserved public Edge form, whose database calls use service_role. Sign-in/signup/reset use Auth APIs. Club data is loaded after authentication. Storage uses its unchanged seven policies; private digital books use signed-in guarded helpers, and public asset URLs do not require SQL grants on application tables.','',
'Nine explicit Edge worker/service RPCs retain service_role EXECUTE. Direct service-role table/Storage access is unchanged. Legacy Edge endpoints remain present. The repaired standalone verify_guardian_pin API is deliberately retained alongside the UI session API. Unused application RPCs remain owner-only.','',
'`private.dc_entity_payload` and `private.dc_entity_fingerprint` change from definer to invoker: direct client calls respect existing content RLS; nested owner/definer calls still execute with owner rights. `private.household_is_paid_member` also becomes invoker so an arbitrary household ID cannot disclose another family’s subscription state. This avoids retaining unguarded inspection privileges. No raw XP, badge, admin-assignment or entitlement mutation helper is exposed.','',
'## Tables and views','', '| Object | Kind | anon | authenticated | Required path |','| --- | --- | --- | --- | --- |']
for o in p['objects']:
 if o['kind']=='f':continue
 caps=', '.join(o['authenticated']) or 'none'
 if o.get('columns'):caps+='; '+', '.join(op+'('+', '.join(cols)+')' for op,cols in o['columns'].items())
 reasons='; '.join(op+': '+', '.join(v) for op,v in sorted(o['reasons'].items())) or 'No client path; owner/service or guarded definer only'
 md.append(f"| `{o['object']}` | {'view' if o['kind']=='v' else 'table'} | none | {caps} | {reasons} |")
md += ['','## Function execution','',
'Categories: 1 anonymous public (none required); 2 authenticated invoker RPC/helper; 3 guarded authenticated definer; 4 admin-only RPC/helper (trusted active app_admin checks/RLS); 5 service/worker; 6 trigger/internal; 7 owner-only detail. Names in category 3 that return booleans are authorization predicates, not mutation capabilities. Pure caller-supplied hashing helpers have no row access.','',
'| Function | Category | authenticated | service_role | Reason |','| --- | --- | --- | --- | --- |']
for o in p['objects']:
 if o['kind']!='f':continue
 why='; '.join(o['reasons'].get('EXECUTE',[])) or '; '.join(s['source'] for s in d['sources'] if s['object']==o['object'] and s['role']=='service_role') or 'Internal trigger/owner path; no direct client execution'
 md.append(f"| `{o['object']}` | {o['category']} | {'EXECUTE' if o['authenticated'] else 'none'} | {'EXECUTE' if o['service_role'] else 'none'} | {why} |")
md += ['','## Seven historical implicit PUBLIC helpers','',
'- The three admin gate implementations (`admin_get_book_launch_gate_impl`, `admin_get_book_release_gate_impl`, `admin_get_membership_tier_gate_impl`) retain only authenticated EXECUTE, required by the invoker production gate; each checks the active admin role.',
'- `enforce_child_book_access`, `enforce_child_challenge_access`, and `prevent_book_progress_regression` are trigger entrypoints. PUBLIC/client execution is removed; trigger invocation remains intact.',
'- `user_can_access_challenge` is only reached under owner/definer execution in the current graph. PUBLIC/client execution is removed.',
'','## Defaults and platform limitation','',
'For postgres, public table/view/sequence/function defaults lose client grants; a global function default removes implicit PUBLIC EXECUTE in every schema. service_role/platform-owner defaults remain. New client grants must be explicit.',
'','The hosted SQL role is postgres, is not a superuser, and is not a member of supabase_admin. The three supabase_admin-owned public default ACLs cannot be altered through that connection. They remain a named unresolved platform dependency, never treated as hardened or ignored by recovery verification. All current application objects are owned by postgres. Support must apply the owner-specific default revocations through a supported privileged platform path; no attempt is made to assume the internal role.',
'','Historical ACL evidence remains in `docs/recovery/LEGACY_GRANTS.md` and the catalog at commit `60e151c`. Current recovery must intentionally capture the resulting ACLs, including the unresolved platform defaults.','']
(ROOT/'docs/security/CLIENT_PRIVILEGE_MATRIX.md').write_text('\n'.join(md))
print('Policy counts',dict(Counter((o['kind'],bool(o['authenticated'])) for o in p['objects'])))
