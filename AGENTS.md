# Dustin Courageous engineering instructions

## Start here

- Repository: `eaglevisiondigital/dustincourageous`.
- Active development branch: `build/adventure-club-app`. Do not merge to or modify `main` without explicit approval from the primary Chat/user.
- Dedicated Supabase project: `vrixketvinzhsfwwcqiu`, Dustin Courageous Adventure Club.
- Read CURRENT_BUILD_STATE.md, ARCHITECTURE.md, SECURITY_MODEL.md and DECISIONS.md before changes. Also read club-app/BUILD_HANDOFF.md, club-app/LAUNCH_MILESTONES.md, club-app/DIGITAL_BOOK_READER.md and club-app/ALPHA_VERIFICATION.md for the relevant work.
- Inspect actual code, migrations, database state, tests and configuration. Historical test counts and migration filenames do not prove current deployment state.
- The September 26 baseline found substantial completed implementation. Do not rebuild the backend or repeat completed batches.
- The next major package requires Chat review of docs/audits/2026-09-26-baseline.md.
- The focused security repair was subsequently authorized and completed. Read docs/audits/2026-09-26-security-repair.md before continuing. The recommended recovery package has not been authorized or started.

## Division of responsibility

Chat owns strategy, product/UX/policy/permissions decisions, major architecture, prioritization and approval.
Codex implements, tests, audits, secures and documents software.
Work handles external research, browser investigation and live user-journey validation.
For an unresolved decision or external task, provide a complete copy-and-paste handoff beginning with RECOMMENDED THINKING LEVEL: MEDIUM / HIGH / EXTRA HIGH and CHAT DECISION NEEDED or WORK TASK NEEDED.
Recommend the lowest reliable level: Medium for routine work, High for authorization, RLS, sensitive schema changes and complex integration; Extra High only when complexity warrants it. Do not claim a model setting changed unless it actually did.

## Permanent constraints

- Keep Dustin independently sellable: separate backend, auth, storage, billing, deployment and operating ownership. Do not combine it with other Eagle Vision/Global Propel products.
- Guardian-controlled households and children; no public child profiles, open child chat or unnecessary child personal data.
- Preserve approved artwork, character appearance and DC shield. Dustin is approximately age nine with childlike proportions.
- Preserve biblical/Word-of-Faith direction. Prayers begin "Dear God,". Do not generate or reinterpret approved creative assets.
- Dustin Courageous Bible, Founder’s Edition v2026.1, is creative authority. Master Production Manual, Founder’s Edition v2026.1, is technical production authority. Their full files were not available during this audit; repository summaries and database registry entries are not substitutes.
- Do not invent pricing, approvals, business rules, implementation status or source documents.
- No unapproved destructive production operations, resource recreation or replay of applied migrations.
- No automatic governance/content approval or provider activation.

## Engineering and verification

Preserve architecture and unrelated systems. Consider least privilege, family isolation, service-role secrecy, validation, data integrity, migration ordering, rollback implications, accessibility and maintainability.
Use meaningful existing/new tests for behavior and authorization boundaries. Verify actual authenticated/anonymous database roles when relevant; mocked helpers do not prove deployed privileges.
Never fix a missing private-helper grant by broadly exposing unguarded XP, badge or admin functions. Preserve narrowly authorized server-side boundaries.
Never include tokens, credentials or family records in documentation, logs or commits.
Install committed dependencies in club-app with `npm ci --ignore-scripts`; run `npm test` and `npm run build`.
CI Edge syntax check: from club-app, `./node_modules/.bin/tsc --ignoreConfig --noEmit --noCheck --noResolve --skipLibCheck --target es2022 --module esnext ../supabase/functions/*/index.ts`. This is syntax validation, not full Deno runtime typechecking.
SQL regressions must be reviewed before execution. Some temporarily replace functions/policies and require live locks even though they roll back; do not blindly run all files on production.
Database recovery is incomplete: the baseline had 39 live migration entries versus 23 files, including 12 timestamp mismatches. The matched security forward migration brings totals to 40 live entries / 24 files; the 16 missing names and 12 old timestamp mismatches are unchanged. Do not run db push/reset or repair migration history without an approved reconciliation plan.

## Completion and continuity

After meaningful work update CURRENT_BUILD_STATE.md and relevant architecture/security/decision records from verified evidence.
Preserve historical decisions and distinguish implemented, automatically tested, manually accepted and pending.
Return COMPLETED, CHANGED, TESTED, SECURITY, DOCUMENTATION, UNRESOLVED, NEXT RECOMMENDED BUILD and CHAT HANDOFF. Include migrations, limitations and enough evidence for Chat to choose the next package.
Do not start the next major package merely because it is recommended.
