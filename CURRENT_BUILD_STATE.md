# Verified build state

Audit date: September 26, 2026. Audited application commit: `80565df747860bbe236c8aede09fd056d38e3ed5`.
This file describes that code and the live database observed during the audit; subsequent documentation commits do not imply new application behavior.

## Identity and history

- Repository: https://github.com/eaglevisiondigital/dustincourageous
- Development: `build/adventure-club-app`, 31 commits after checkpoint `89e84168813f5b7c0995ead8bc84d48b6f5c634b`.
- Remote main: `57b37be469569b909095172de0cd5bc392a755b8`, an ancestor of development. Its tree contains the static website, not club-app or supabase. No evidence of the development batch being merged to main.
- Supabase: Dustin Courageous Adventure Club, `vrixketvinzhsfwwcqiu`, ACTIVE_HEALTHY, PostgreSQL `17.6.1.166`, us-east-1.
- Prior preview: https://deploy-preview-1--dustincourageous.netlify.app . Its current deployed artifact and signed-in behavior were not reverified in this audit.
- Local checkout is now connected to origin and tracks the existing development branch.

## Implemented inventory

| System | Verified implementation | Remaining acceptance or dependency |
| --- | --- | --- |
| Adult authentication | Supabase signup/sign-in, confirmation/resend, password recovery, stable session refresh, account contact editing/export | Real email-link/session/device walkthrough |
| Family/children | Household onboarding and consent, child profiles, guardian PIN, family labels, invitations, privacy controls | PIN lockout defect and guardian decision helper permissions; signed-in acceptance |
| Adventure Club | Adventures, challenges/steps, multi-child participation, assignments, Family Faith, history, parent approvals, XP/badges/streaks/rewards | Actual guardian decision flow blocked by helper privilege gap; broader signed-in/concurrency acceptance |
| Digital Book 1 | Bookshelf, protected reader, Read together, per-child resume, private manifests/images, admin preparation/review, privacy exports | Zero live manifests; corrected images/text/order and human approval; Storage HTTP/device acceptance |
| Book Companion | Steps, progress, completion/XP foundation separate from reading positions | Full Book Adventure completion has inaccessible helper calls |
| Membership | Plans, subscriptions, entitlement grants, household-specific child access | Paid pricing/provider/recurring lifecycle acceptance |
| Commerce | Server-priced orders, checkout handoff, webhook validation, replay protection, lock/expiry checks | Provider remains not_configured; real sandbox lifecycle, fulfillment/concurrency/reconciliation |
| Admin | Content, books, governance, media, organizations, events, communications, commerce, support, analytics/privacy, launch readiness | Launch-readiness helper privilege defect; role/device acceptance |
| Communications/support | Inbox pagination/bulk read, preferences/queues/cron/worker; original support request/status | Email/push not_configured; two-way support conversation not implemented |
| GoodBarber | Installation and integration foundation | Provider not_configured; shell/device acceptance |

## Database and recovery

112 public tables, all with RLS; 298 public policies; 8 private tables without RLS but no anon/authenticated table grants; 25 public views use security_invoker; 212 public/private functions inspected.
Four buckets: dc-public (public), dc-members, dc-digital-books and privacy-exports (private).
39 live migration entries; 23 repository files match names, 12 with different timestamps; 16 recorded names have no file. This is not a replayable database baseline.
10 deployed Edge Functions; four checked-in functions match deployed source byte-for-byte. Six have no repository source directory.
See docs/audits/2026-09-26-inventory.md for exact inventories. No migrations were applied or changed.

## Verification on September 26

- Locked dependency install: success; npm reported zero vulnerabilities.
- App tests: 280 passed, zero failed/skipped.
- Production TypeScript/Vite build: passed; existing 522.38 kB main-chunk warning remains.
- CI-equivalent Edge syntax check: passed.
- GitHub push CI at audited commit: [success](https://github.com/eaglevisiondigital/dustincourageous/actions/runs/36187927877).
- Six existing SQL regression scripts passed: deployed household RLS (13 checks), household onboarding, payment checkout locking (10 checks), digital reader, reading privacy, digital launch subgate.
- Additional direct checks denied self-admin promotion and self-entitlement grants.
- Adversarial diagnostics reproduced PIN counter rollback and launch/helper privilege failures.
- All synthetic test data rolled back; follow-up fixture household/ticket counts were zero.
- Tests did not send messages, invoke payment adapters or publish content.

## Blocking findings and next step

1. Wrong-PIN unlock RPC raises after incrementing failed attempts, rolling the counter back. Six failed calls left zero attempts and no lockout.
2. Invoker RPCs cannot execute private helpers: guardian approve/return; Book Adventure XP/badge completion; production launch gate.
3. Database migration/bootstrap and deployed Edge source recovery are incomplete.
4. Leaked-password protection disabled, reported by the live security advisor.
5. Full authoritative Bible and Master Production Manual files remain unavailable; registry entries only.
6. Signed-in/device/Storage HTTP acceptance, final digital artwork and provider readiness remain open.

Recommended next Codex package: targeted guardian security and RPC privilege repair, with actual-role regression tests, then recovery/replay work. Chat must review the detailed report before that package begins.
