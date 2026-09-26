# Verified build state

Updated September 26, 2026 after the authorized security repair and source recovery.
Security implementation: `baa054d`; recovery implementation checkpoints: `0df0c18`,
`98c0cd0`. Detailed evidence: [recovery report](docs/audits/2026-09-26-recovery.md),
[runbook](docs/recovery/RECOVERY_RUNBOOK.md) and
[security repair report](docs/audits/2026-09-26-security-repair.md).
The original [baseline](docs/audits/2026-09-26-baseline.md) remains historical evidence.

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

All 40 live migration SQL records are now archived and mapped against the 24
unchanged root files: 12 same-version matches, 12 timestamp differences, 16
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

## Verification

- Fresh native PostgreSQL 17.11 restore matches the complete captured application
  catalog/effective ACLs, before and after tests.
- Full local Supabase restoration and SQL CI pass at `98c0cd0`:
  [GitHub run 36278291652](https://github.com/eaglevisiondigital/dustincourageous/actions/runs/36278291652).
- Ten isolated SQL suites include the four security suites (85 checks: PIN 29,
  guardian RPC 21, Book Adventure 19, admin gate 16), household RLS (13 checks),
  onboarding, guardian decisions, digital reader, reading privacy and digital gate.
- Real independent PIN transactions contend on the household row lock, return
  denial, persist cooldown and issue zero tokens. Correct PIN during cooldown is
  denied; fixture cleanup is verified. The native clean run observed five blocked
  requests at one sampling point out of six attempts.
- 280 application tests pass; production build and all ten Edge syntax checks pass
  locally and in CI. The existing 522.38 kB main-chunk warning remains.
- Buckets/policies and five inactive cron definitions are represented. No providers
  or live jobs are activated. CI has no production credentials or hosted link.
- Source recovery does not prove Auth-issued sessions, Storage HTTP, browser/device
  journeys, real provider behavior or complete customer-data/file restoration.

## Remaining issues and next package

- Supabase Auth leaked-password protection remains disabled; unchanged.
- The advisor still flags the intentionally authenticated SECURITY DEFINER revoke
  RPC. Its body restricts access to the caller's managed household and sessions.
- Broad legacy table/view/default ACLs and seven implicit PUBLIC helper grants
  require a separate dependency-aware least-privilege review. No sweeping cleanup
  was included in recovery.
- Edge legacy CORS/rate limits, adapter HTTPS/secrets, privacy races and live browser
  invocation require the targeted follow-up described in the Edge audit.
- Encrypted data/Auth/file backups, full Auth configuration, approved reference
  data and fresh destination secrets remain separate recovery inputs.
- Full authoritative Bible/Production Manual files, final Book 1 assets/approval,
  provider readiness and signed-in/device acceptance remain outstanding.

Recommended next package: Chat-reviewed least-privilege/Auth launch hardening,
with targeted Edge/Work acceptance scoped from the recovery audit. It has not
been started. Recovery source completion is not launch or content approval.
