# Approved Adventure Club Visual Contract — Package 1 / Kid Adventure Home

This package is an implementation candidate, NOT additional visual design approval.

## Authority

- Sole visual source: the three exact October 15, 2026 founder-approved screenshots, identified by SHA-256 in
  \`docs/design/APPROVED_ADVENTURE_CLUB_VISUAL_CONTRACT_2026-10-15.md\`.
- This package matches **Adventure Home** and establishes the shared kid shell. It does **not** claim the other pages are pixel-matched.
- All 3 WebP art fragments are **unaltered visual crops from the founder-approved Adventure Home screenshot**.
  No character or shield was generated or reinterpreted, and no full-screen screenshot was used as a nonfunctional UI.
- Crop provenance (source pixels in the 1672×941 approved Home PNG):
  - \`home-hero-art.webp\`: (815,117)–(1654,489). Shows only the approved Dustin/friends hero scene with no baked-in name.
  - \`adventure-sidebar-path.webp\`: (0,304)–(245,941). Includes approved scenic faith/courage/victory/purpose signage.
  - \`faith-courage-victory.webp\`: (352,367)–(676,489). Includes the three approved badge illustrations/labels.

**Do not use these snippets as permission to change the underlying original Dustin character, official shield, or approved print artwork.** Final desktop and phone visual review remains required.

## Functional preservation

- The existing \`FamilyPortal\` controls all active child, household and kid-lock state.
- Existing five kid navigation controls are moved from the content area to the approved top-bar location. Callback behavior is unchanged.
- Hero name is dynamic. Existing \`KidHomeFocus\` maintains actual book entitlement, next step, progress percentage, current Power Verse and controls.
- Four Today’s Adventures links invoke the existing Bookshelf, Bible Basecamp, Activities, and first available real challenge flows. If no challenge exists, it opens Activities rather than inventing one.
- Original authoritative XP/badges/streaks data remains intact in its own section below the quick actions. The existing challenge list remains below, now titled More Courage Challenges.
- Family View, Admin, SQL/RLS, Auth, payments, governance, book assets and release status are unchanged. \`main\` remains untouched.

## Remaining gates

- Real browser screenshots at 1672×941, tablet and phone compared to the exact locked PNG.
- Validate no visual clipping at 320px, 375px, 768px, 1024px and desktop.
- Founder approval of actual production UI, **not only the reference screenshot**, before treating Package 1 as visually accepted.
- Confirm keyboard and screen-reader navigation, child switching, loading/empty states and locked Family Hub.
- More detailed Activities Center and Family Hub styling will be implemented only against their locked screenshots, not imagined alternate layouts.
