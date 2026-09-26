# Security model and audit findings

Verified September 26, 2026. This is a bounded implementation audit, not a certification of launch readiness.

## Established controls

- Public tables: 112/112 RLS enabled, 298 policies. Public views: 25/25 security_invoker.
- Active household membership gates family/child reads; owner/parent/guardian roles gate child management.
- Household membership mutation, paid entitlements, XP and privileged admin operations use controlled policies/RPCs.
- The audited browser uses a publishable key; no secret/service-role token found by the tracked-file pattern scan.
- Private tables have no direct anon/authenticated grants. Authenticated has private-schema USAGE for authorized helpers; anon does not. Effective Data API schema configuration was not verified through dashboard/HTTP.
- Inspected SECURITY DEFINER functions set search_path. Public privileged service functions deny anon/authenticated EXECUTE.
- Admin roles are stored in app_admins, not editable user metadata. Direct self-admin and self-entitlement INSERT checks were denied.
- Digital reader ownership, current approval, edition release and child-household entitlements protect manifests and private images.
- Service adapters validate authenticated users or dedicated worker/webhook secrets before privileged operations.
- Live advisor reports one warning: [leaked-password protection disabled](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection).

## Findings requiring the next repair package

### S1: PIN unlock failures do not retain lockout state

private.verify_guardian_pin_impl updates failed_attempts/locked_until.
private.create_guardian_unlock_session_impl then raises on a false result.
That exception rolls back the failed-attempt update. The UI calls create_guardian_unlock_session.
A rollback-only synthetic authenticated fixture made six wrong-PIN unlock calls; final failed_attempts=0 and locked_until remained null.
Impact: the intended five-attempt/15-minute protection is ineffective on this path. Supabase Auth session ownership is still required; this is not evidence of anonymous login bypass.
Repair the failure contract so attempts persist while callers get a denial without a token. Preserve household ownership, token binding, expiry/revocation and concurrency behavior; add actual-role tests.

Reproduction: [rollback-only PIN diagnostic](docs/audits/pin-lockout-diagnostic.sql).

### S2: Authorized user RPCs call helpers they cannot execute

| Invoker RPC | Private helper lacking authenticated EXECUTE |
| --- | --- |
| approve_parent_challenge / return_parent_challenge | guardian_unlock_session_valid |
| complete_child_book_adventure | award_xp_event; evaluate_child_badges |
| admin_get_production_launch_gate | admin_get_production_launch_gate_impl |

Direct authenticated-role invocation reproduced SQLSTATE 42501 for the guardian helper and full launch-gate RPC. Book completion's deployed body and ACLs show the same unreachable helper boundary once prerequisite checks pass; a full ready-book user journey was not executed.
The launch UI correctly reports unverified status after errors; this is not a false green launch result.
Do not broadly GRANT unguarded XP/badge functions or make all public wrappers SECURITY DEFINER. Implement the narrowest authorized boundary and test own-family success, foreign-family denial, ordinary guardian/admin separation and duplicate-credit protection.
The existing guardian decision regression substitutes a temporary unlock helper, so it cannot detect this live ACL failure.

Evidence query: [read-only privilege diagnostic](docs/audits/rpc-helper-privilege-diagnostic.sql).

### S3: Recovery and deployment coverage is incomplete

16 recorded migrations have no name-matching file; 12 of the 23 matches have timestamp differences. Six deployed Edge Functions are missing source directories.
This prevents declaring reproducible restoration or complete deployment review. Recover and review sources/history without replaying changes or deleting legacy functions blindly.

## Hardening and verification backlog

- Older public tables retain broad anon/authenticated SQL grants including TRUNCATE/REFERENCES/TRIGGER. Current RLS blocks tested row mutations, but these grants exceed least privilege; TRUNCATE is not governed by RLS. No browser/REST truncate exploit was demonstrated. Review and narrow grants with compatibility tests.
- Some private helpers retain inherited anonymous EXECUTE although anon lacks schema USAGE. Audit helper privilege intent before changing exposure.
- Private tables have no RLS; direct client access is denied. Review defense in depth without breaking protected helpers.
- Real Auth-issued sessions, Storage HTTP, guardian/free/premium browser behavior, devices/accessibility and provider lifecycle tests remain unverified.
- Legacy deployed functions remain active. Authentication guards were inspected, but external usage/decommissioning requirements are unknown.
- Pattern-based secret scanning is not full Git-history or runtime-secret auditing.
- No claim that passing 280 unit/mock tests proves all authorization paths safe.

## Tests run

Six existing SQL scripts passed with rollback: deployed_household_rls_regression (13 checks), household_onboarding_regression, payment_checkout_lock_regression (10 checks), digital_book_reader_regression, reading_privacy_regression and digital_book_launch_gate_regression.
First three exercise actual deployed tables/roles; reader/privacy/subgate tests use copied function bodies or temporary mocks plus selected live catalog assertions.
Additional self-escalation checks passed. PIN and helper-ACL diagnostics exposed the failures above.
No production schema, policies, grants, migrations, Auth settings or Edge deployments were changed.
