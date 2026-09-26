# Verified build state

Recovery package in progress (September 26, 2026): current schema and all ten Edge
Function sources have been captured without production writes. A native isolated
PostgreSQL restore matches the full captured application catalog/effective ACLs;
ten SQL suites and concurrent PIN checks pass. Supabase-platform CI and the final
forensic mapping/report are pending. See `supabase/recovery/`; do not replay its
historical evidence or the incomplete root migration chain against production.

Updated September 26, 2026 after the authorized guardian security/RPC repair.
Implementation checkpoint: baa054d, following baseline documentation commit 786a89a.
Detailed evidence: [security repair report](docs/audits/2026-09-26-security-repair.md).
The earlier [baseline](docs/audits/2026-09-26-baseline.md) remains historical evidence.

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

112 public tables with RLS, 298 public policies, eight private tables with no client table grants, 25 security-invoker views, 213 public/private functions.
The one new function is private.award_completed_book_adventure.
One forward migration was applied: 20260926212852_guardian_pin_and_rpc_security_repair.sql.
There are now 40 live migration entries and 24 repository files. The original 16 missing names and 12 historical timestamp mismatches are unchanged. No historical migration was renamed/replayed/repaired.
Ten deployed Edge Functions were identified at baseline; six lack checked-in source. This package changes no Edge deployment.
See the historical [inventory](docs/audits/2026-09-26-inventory.md) and the repair report. The repository is still not a replayable database baseline.

## Verification

- Four new actual-role SQL suites: 85 checks passed (PIN 29, guardian RPC 21, Book Adventure 19, admin gate 16).
- Independent-session PIN concurrency test: six blocked requests observed, six successful test executions, zero failed executions, persistent cooldown, zero issued tokens.
- Six existing SQL suites passed: deployed household RLS (13 checks), onboarding, guardian decisions, digital reader, reading privacy and digital launch gate.
- App tests: 280 passed, zero failed/skipped. Production TypeScript/Vite build and CI-equivalent Edge syntax check passed. The existing 522.38 kB main-chunk warning remains.
- [GitHub CI at implementation commit baa054d](https://github.com/eaglevisiondigital/dustincourageous/actions/runs/36275730607): success.
- All synthetic records and temporary concurrency jobs/run records were removed; cleanup was reverified after an app restart.
- Database-role tests do not substitute for Auth-issued sessions, Storage HTTP, signed-in browsers or devices. SQL suites are not yet run in GitHub CI because isolated database restoration remains unresolved.

## Remaining issues and next package

- Recover migration/bootstrap history and the six missing Edge sources; establish reproducible isolated restoration and SQL CI.
- Supabase Auth leaked-password protection remains disabled.
- The advisor flags the intentionally authenticated SECURITY DEFINER revoke-session RPC. Its body restricts updates to the caller's sessions in a managed household; private tables remain inaccessible. See SECURITY_MODEL.md.
- Full authoritative Bible and Master Production Manual files, final Book 1 assets/content approval, provider readiness and signed-in/device acceptance remain outstanding.
- Broader legacy grant review remains outside this package.

Recommended next package: database/deployment recovery and reproducibility, subject to PRIMARY CHAT approval. It has not begun.
