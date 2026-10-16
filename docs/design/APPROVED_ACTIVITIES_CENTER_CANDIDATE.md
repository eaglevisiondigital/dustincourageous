# Activities Center exact-screenshot candidate

**Status: staged development, NOT deployed, NOT visually approved.**

Sole founder approval: `docs/design/APPROVED_ADVENTURE_CLUB_VISUAL_CONTRACT_2026-10-15.md`.
Reference: `APPROVED_Activities_Center.png`, SHA-256 `77afddb1949c6ee32e0e0fa3ff7b4c327851b76f4a195430646ad56b17800cbd`.

This candidate implements the interactive Activities Center HTML/CSS according to the approved screenshot and preserves:
- Existing Scripture Scramble Easy/Medium/Hard phrase sizes, real answer checks and hints.
- Actual puzzle 6/20/40 difficulty, four approved public Book 1 scenes, and touch controls.
- Approved Book 1 Courage Mission illustrations and current practice-only mode.
- Printable and digital coloring, including no child data upload.
- Real published extra content and authenticated server completion behavior, unchanged.
- Parent/Guardian terminology, Auth/RLS/XP and book entitlement boundaries.

**BLOCKER:** The following five exact crops of the approved screenshot are ready in the PRIMARY CHAT working files but HAVE NOT been transferred into GitHub:
`club-app/public/assets/approved-ui/activities-hero-art.webp`,
`activities-scripture-art.webp`, `activities-missions-art.webp`,
`activities-puzzle-art.webp`, `activities-coloring-art.webp`.

Do not merge this candidate into `build/adventure-club-app` or deploy it until every exact referenced crop is uploaded, checked, and visible. Do not substitute any invented character or mockup art. Once assets are available, run application tests, typecheck/build, full recovery, and screenshot/device fidelity review. Example screenshot numbers and activity examples are decorative, not real user data. No production Book 1 reader content is published in this package.
