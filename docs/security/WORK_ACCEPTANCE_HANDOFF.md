RECOMMENDED THINKING LEVEL: HIGH
WORK TASK NEEDED

Dustin Courageous Adventure Club. This is a proposed next phase for Chat review,
not authorization to activate providers, send messages or change production.

Read docs/audits/2026-09-26-privilege-hardening.md from
`eaglevisiondigital/dustincourageous`, branch `build/adventure-club-app`.
The dedicated backend is `vrixketvinzhsfwwcqiu`; migration `20260927013941` is applied.
Do not repeat completed backend, security repair or recovery implementation.

Verify the current preview artifact/commit before testing. The earlier documented
preview is https://deploy-preview-1--dustincourageous.netlify.app; this package did
not certify its current deployed artifact. Use Chat-approved test accounts and
synthetic households only; arrange required authentication/acceptance access with
the user rather than requesting tokens or accessing unrelated families.

Cover guardian signup/sign-in/confirmation/recovery, household onboarding/consent,
Family Hub, multiple children, profile edits, invites, guardian PIN and approvals,
activities/progress/XP/badges/rewards, bookshelf/reading position/privacy controls,
membership visibility, admin separation and mobile/accessibility behavior.
Record browser/device, scenario, expected/actual result, minimal reproducible steps,
commit/URL and redacted evidence. Separate observed failures from assumptions.

Known limits to carry forward:

- Leaked-password protection still needs an authorized dashboard/Management API
  change and verification. Its exact one-setting action is in AUTH_HARDENING.md.
- Three internal supabase_admin defaults need platform support; current application
  object grants/postgres defaults are hardened.
- `create_checkout_order` has a pre-existing ambiguous order_number SQL error,
  reproduced under old/new ACLs. Checkout is not payment accepted.
- Earlier Edge CORS/races/provider-test/adapter/legacy-retirement findings remain.
- No approved Book 1 manifest/art/content release or provider setup is implied by
  synthetic tests. Missing full creative authority files remain missing inputs.

Do not change policies, broaden permissions, fix implementation, enable providers,
process payments, approve content, merge main or promote production. Return a
prioritized acceptance report to Chat so it can scope narrowly targeted follow-up.
