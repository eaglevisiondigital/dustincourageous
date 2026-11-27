# Activities Center exact-screenshot candidate

**Status: deployed to DEVELOPMENT PREVIEW, NOT founder-accepted visually, NOT production/main promoted.**

Sole founder approval: `docs/design/APPROVED_ADVENTURE_CLUB_VISUAL_CONTRACT_2026-10-15.md`.
Reference: `APPROVED_Activities_Center.png`, SHA-256 `77afddb1949c6ee32e0e0fa3ff7b4c327851b76f4a195430646ad56b17800cbd`.

This candidate implements the interactive Activities Center HTML/CSS according to the approved screenshot and preserves:
- Existing Scripture Scramble Easy/Medium/Hard phrase sizes, real answer checks and hints.
- Actual puzzle 6/20/40 difficulty, four approved public Book 1 scenes, and touch controls.
- Approved Book 1 Courage Mission illustrations and current practice-only mode.
- Printable and digital coloring, including no child data upload.
- Real published extra content and authenticated server completion behavior, unchanged.
- Parent/Guardian terminology, Auth/RLS/XP and book entitlement boundaries.

**Asset transfer completed:** All five screenshot crop assets are now present under
`club-app/public/assets/approved-ui/`. The SHA-256 of each crop is pinned
by `club-app/tests/approvedActivitiesArtwork.test.mjs`. They were derived from the sole
approved Activities Center reference, not from newly generated artwork.

The candidate is ready for CI/build and real screenshot fidelity review. Do not
claim final visual acceptance until founder reviews actual desktop and phone previews.
Screenshot examples and icons are decorative, not true user progress. No private
Book 1 reader pages or provider settings are published.

## Verified October 15 deployment checkpoint

- Exact approved Activities illustration crops are present and validated by hash.
- The working React Activities Center is deployed on `build/adventure-club-app`.
- At commit `8537f51763134b880c9b2b76d849e576e37fdc55`, **331 application tests** and full isolated Supabase recovery/authorization CI passed. Netlify reported the deploy preview ready.
- The original October 15 screenshot remains the SOLE approved design. Actual signed-in browser screenshot comparison and responsive/founder visual acceptance remain pending. Sample artwork does not establish real child XP or rewards.
- No changes to live payment providers, Supabase policies or Book 1 publication. `main` untouched.
