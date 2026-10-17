RECOMMENDED THINKING LEVEL: HIGH
CHAT DECISION NEEDED

Project: Dustin Courageous Adventure Club, `vrixketvinzhsfwwcqiu`.

The approved least-privilege package hardens all existing application objects and
application-owner (`postgres`) defaults. Three public-schema default ACL records
owned by the internal `supabase_admin` role remain broad. The connected hosted
role is `postgres`, is not superuser, and `pg_has_role(current_user,
'supabase_admin','MEMBER')` is false. All 120 application tables, 25 views, four
sequences and 213 functions are currently owned by `postgres`.

Please arrange a Supabase-supported platform action or support response covering:

1. Remove automatic `anon`/`authenticated` table/view/sequence/function grants
   from `supabase_admin` defaults for future objects in public.
2. Address implicit PUBLIC function EXECUTE as well: schema-local REVOKE cannot
   undo PostgreSQL's global default. Confirm a supported solution that preserves
   Auth/Storage/extension/platform functions and their intended roles.
3. Preserve necessary `postgres`, `service_role` and platform operating rights.
4. Return metadata evidence of the result; Codex will intentionally refresh the
   recovery capture and verify a fresh isolated restore. Do not hide/ignore these
   default ACLs in the verifier or manually edit system catalogs.

No platform role assumption, new superuser grant, broad compensating client grant,
existing object recreation, history repair or support message was performed by
Codex. The unresolved owner defaults remain captured exactly in recovery.

Reference: [Supabase roles](https://supabase.com/docs/guides/database/postgres/roles)
and [Data API privilege guidance](https://supabase.com/docs/guides/api/securing-your-api).
The official procedure covers postgres; it does not establish an authorized way
for this connection to act as supabase_admin. Do not treat community assurances
about future platform behavior as a verified guarantee.
