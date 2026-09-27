# Verified build state

## Approved checkout repair in verification

Starting at `bbd0b13`, the focused checkout creation repair is implemented in
candidate migration `20260927020843_secure_checkout_order_creation.sql`.
A fresh native restore passes 13 SQL suites (42 new checkout checks and ten
retained payment-lock checks), PIN/checkout concurrency, and exact catalog/ACL
comparison. All 282 app tests, build and ten Edge syntax checks pass.
Full Supabase Auth/PostgREST CI and hosted deployment are pending.
See [checkout repair report](docs/audits/2026-09-26-checkout-repair.md).
The separate provider-handoff invoker/write-policy defect remains unresolved;
provider activation and payments are outside this package.

## Completed preceding baseline

Updated September 26, 2026 (Chicago) after the approved least-privilege package.
Starting checkpoint `60e151c`; tested implementation `8ec568f`; live forward
migration `20260927013941_dependency_aware_client_privileges.sql`.
[Current hardening report](docs/audits/2026-09-26-privilege-hardening.md) records the
verified changes and remaining actions. **Database ACL hardening is deployed;
platform-owner defaults and hosted leaked-password protection remain unresolved.**
The earlier [security repair](docs/audits/2026-09-26-security-repair.md) and
[recovery](docs/audits/2026-09-26-recovery.md) are completed historical packages.
Do not rebuild them.

## Identity and history

- Repository: https://github.com/eaglevisiondigital/dustincourageous
- Development branch: build/adventure-club-app. Main remains 57b37be469569b909095172de0cd5bc392a755b8; this package does not merge or promote development.
- Supabase: Dustin Courageous Adventure Club, vrixketvinzhsfwwcqiu, PostgreSQL 17.6.1.166.
- Earlier checkpoints: 89e8416; audited application 80565df; baseline documentation 786a89a.
- Prior preview: https://deploy-preview-1--dustincourageous.netlify.app . Its current artifact and signed-in behavior were not reverified by this package.

## Implemented inventory

| System | Verified implementation | Remaining acceptance or dependency |
| --- | --- | --- |
| Adult authentication | Signup/sign-in, confirmation/resend, recovery, stable refresh, account contact editing/export | Real email-link/session/device walkthrough |
| Family/children | Household onboarding/consent, child profiles, invitations, privacy controls; repaired persistent guardian PIN lockout and revocation | Signed-in/device acceptance |
| Adventure Club | Adventures, challenges/steps, participation, assignments, Family Faith, history, parent approvals, XP/badges/streaks/rewards | Broader signed-in and concurrency acceptance; actual-role guardian approve/return now pass |
| Digital Book 1 | Bookshelf, protected reader, Read together, per-child resume, private manifests/images, admin preparation/review, privacy exports | No prepared manifest at baseline; corrected artwork/text/order, human approval and Storage HTTP/device acceptance |
| Book Companion | Steps/progress and completion; repaired real XP/badge award path with duplicate protection | Live approved-content/user-journey acceptance |
| Membership | Plans, subscriptions, grants, household-specific child access | Paid pricing/provider/recurring lifecycle acceptance |
| Commerce | Server-priced orders, checkout handoff, webhook/replay protection, locks/expiry | Provider configuration and sandbox lifecycle/fulfillment/reconciliation |
| Admin | Content, books, governance, media, organizations, events, communications, commerce, support, analytics/privacy; complete launch gate now works for established admin roles | Role/device acceptance; existing launch blockers remain blockers |
| Communications/support | Inbox, preferences/queues/cron/worker, original support request/status | Email/push configuration; two-way support conversation not implemented |
| GoodBarber | Installation and integration foundation | Provider configuration and shell/device acceptance |

## Security repair verified

- Wrong unlock PIN returns NULL, commits its attempt count, issues no token and preserves five-attempt/15-minute cooldown.
- The existing household PIN row lock serializes requests; time is evaluated after acquiring the lock.
- Six independent authenticated transactions were observed waiting on that mutex. All six completed with denial; lockout persisted, no sessions existed, and a correct PIN during cooldown was denied.
- Guardian approve/return and revocation pass real-role own-household success and unauthorized/cross-household denial checks.
- Book completion keeps the public invoker/RLS path and uses a narrow private award wrapper. Raw XP/badge helpers remain unavailable to authenticated clients.
- Admin gate keeps its public invoker wrapper and checks server-side app_admins. Editable metadata and client INSERT cannot establish admin status.
- Existing UI already handles a NULL unlock result; the TypeScript RPC return type now documents it.

## Database and recovery

112 public tables with RLS, 298 public policies, eight private tables without
client table grants, 25 security-invoker views, and 213 public/private functions.
The prior security repair added private.award_completed_book_adventure and applied
`20260926212852_guardian_pin_and_rpc_security_repair.sql`. **No new live migration,
production test fixture, Edge deployment or history change occurred in recovery.**

The original 40 migration SQL records are archived and mapped against the 24
unchanged historical root files: 12 same-version matches, 12 timestamp differences, 16
previously untracked records. Twenty-one related SQL bodies are byte-exact; three
have equal parsed SQL with only comment/whitespace differences. Current definitions
for 70 tables and 131 functions absent from recorded CREATE history are recovered
in the separate catalog/bootstrap. Historical chronology remains incomplete;
clean restoration no longer depends on inventing that history.

All ten deployed Edge sources are tracked and match the captured bundles. Six
missing directories and two import maps were restored. Legacy endpoints remain
unchanged. See [migration map](docs/recovery/MIGRATION_HISTORY_MAP.md),
[Edge audit](docs/recovery/EDGE_FUNCTION_AUDIT.md) and
[legacy ACL inventory](docs/recovery/LEGACY_GRANTS.md).

The new ACL migration adds one exact forward record: live history is now 41,
root migrations 25. The original 40 hashes and 12 timestamp differences are
unchanged. `supabase/recovery/forward-migrations.json` maps the new record.
The current bootstrap uses the new approved client ACLs, including explicit global
function defaults. The legacy capture remains available in Git and the labeled
security inventory. Three inaccessible platform-owner defaults remain captured.

## Verification

- Pre-deployment Supabase CI passes at `8ec568f`:
  [run 36286074438](https://github.com/eaglevisiondigital/dustincourageous/actions/runs/36286074438).
- Eleven SQL suites pass: PIN 29, guardian RPC 21, Book Adventure 19, admin 16,
  household RLS 15, privilege 28, onboarding and four older regressions.
- Six independent authenticated PIN attempts serialize, persist cooldown, issue
  zero tokens and deny the correct PIN during lockout; fixtures are cleaned.
- 51 actual isolated Auth/PostgREST checks pass, including approved table/view
  reads, embeddings, onboarding, invitations, PIN, privacy, admin, digital reader,
  activity/Book completion, identity inserts, duplicate XP and password/recovery.
- 282 application tests, production build and all ten Edge syntax checks pass.
  The existing large main-chunk warning remains; syntax is not full Deno validation.
- Fresh native PostgreSQL 17.11 and local Supabase 17.6 restore the new ACL model.
  Full catalog comparison passes before/after SQL and HTTP tests. A read-only
  post-deployment capture matches the tested new baseline exactly.
- Production received only ACL/default changes, three invoker-flag reductions,
  schema-cache notification and one new migration record. No family/Auth/commerce/
  Storage rows, jobs, providers, historical records or Auth settings were written.

## Current authorization policy

No client TRUNCATE/REFERENCES/TRIGGER/MAINTAIN on application tables; no anonymous
application table/view/function access; no client view writes or sequence grants.
Authenticated table SELECT/INSERT/UPDATE/DELETE counts are 104/58/51/1, plus narrow
column-only updates for group withdrawal and checkout row locking. Twenty invoker
views retain client SELECT. Function EXECUTE is 147 authenticated, nine service,
zero anon/PUBLIC. All private tables and raw award helpers remain protected.
See [the dependency matrix](docs/security/CLIENT_PRIVILEGE_MATRIX.md).

## Remaining issues and next step

- Leaked-password protection remains disabled. The Auth config tool is unavailable
  and the dashboard needs sign-in. [Exact action](docs/security/AUTH_HARDENING.md).
- Three supabase_admin-owned public default ACLs need a supported platform action;
  the hosted postgres connection cannot act as that internal role.
  [Chat handoff](docs/security/PLATFORM_DEFAULTS_HANDOFF.md).
- The pre-existing checkout RPC fails on ambiguous `order_number` in both legacy
  and hardened isolated restores. Other invoker dependencies need review in a
  Chat-scoped checkout fix; no payment acceptance is claimed.
- The intentionally guarded revoke-session definer still triggers an advisor warning.
- Existing Edge/CORS/races/adapter concerns, real email/Storage/browser/device/provider
  acceptance, protected data/file/Auth backups, full creative authority files and
  Book 1 assets/human approval remain outstanding.

Next: Chat review of the hardening report, resolution/routing of the two external
security actions, then **Work-led real signed-in/browser/device acceptance**.
No broad Edge/provider, launch or new major Codex package is authorized by this
recommendation.
