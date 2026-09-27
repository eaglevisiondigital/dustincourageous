RECOMMENDED THINKING LEVEL: HIGH
WORK TASK NEEDED

Dustin Courageous Adventure Club. This is a proposed next phase for Chat review,
not authorization to activate providers, send messages or change production.

Read docs/audits/2026-09-26-provider-handoff-repair.md and CURRENT_BUILD_STATE.md from
`eaglevisiondigital/dustincourageous`, branch `build/adventure-club-app`.
The dedicated backend is `vrixketvinzhsfwwcqiu`; migration `20260927030254` and
commerce-checkout Edge v4 are deployed. Checkout creation and handoff are repaired.
Do not repeat completed backend, security repair or recovery implementation.

Verify the current preview artifact/commit before testing. The earlier documented
preview is https://deploy-preview-1--dustincourageous.netlify.app; this package did
not certify its current deployed artifact. Use Chat-approved test accounts and
synthetic households only; arrange required authentication/acceptance access with
the user rather than requesting tokens or accessing unrelated families.

Cover guardian signup/sign-in/confirmation/recovery, household onboarding/consent,
Family Hub, multiple children, profile edits, invites, guardian PIN and approvals,
activities/progress/XP/badges/rewards, books/Read together/resume/privacy controls,
membership visibility, checkout through the safe pre-provider boundary, admin
separation and mobile/responsive/accessibility behavior. Verify checkout remains
blocked safely when provider configuration is absent; do not bypass readiness.
Record browser/device, scenario, expected/actual result, minimal reproducible steps,
commit/URL and redacted evidence. Separate observed failures from assumptions.

Known limits to carry forward:

- Leaked-password protection is enabled and its warning cleared per September 26,
  2026 external Work verification supplied by PRIMARY CHAT. Do not alter Auth settings.
- Three internal supabase_admin defaults need platform support; current application
  object grants/postgres defaults are hardened. Support's pending answer does not
  block this acceptance pass.
- Checkout creation and guarded provider handoff pass automated actual-role,
  concurrency and Auth/PostgREST tests. Real provider lifecycle is not accepted;
  unknown adapter outcomes require reconciliation rather than automatic redispatch.
- Earlier unrelated Edge CORS/worker-race/provider-test/legacy-retirement findings
  remain. The checkout adapter-before-persistence defect is repaired.
- No approved Book 1 manifest/art/content release or provider setup is implied by
  synthetic tests. Missing full creative authority files remain missing inputs.

Do not change policies, broaden permissions, fix implementation, enable providers,
process payments, approve content, merge main or promote production. Return a
prioritized acceptance report to Chat so it can scope narrowly targeted follow-up.
