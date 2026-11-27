# Dustin Courageous global Family Hub and Kid View delivery report

Date: November 27, 2026  
Status: **DRAFT READY on development preview** / **BLOCKED for production and physical-QR acceptance**

## Code and hosting

- Repository: `eaglevisiondigital/dustincourageous`
- Development branch: `build/adventure-club-app`
- Application implementation commit: `e44c16d323e41bed92b2c5491eac84f61d4e30e7`
- Recovery CI install repair: `af6cbe2dc2ddd56f73921fad35373bbb75b3ca86`
- Netlify project: `dustincourageous`
- Preview URL: `https://deploy-preview-1--dustincourageous.netlify.app`
- Netlify app deploy `6b0992346e6d9ac6ad1af8d3`: **ready** for the implementation commit
- Root `netlify.toml`: `club-app` build, Vite publish `dist`, SPA redirect
- Dedicated data backend: Supabase `vrixketvinzhsfwwcqiu`
- Public main `57b37be469569b909095172de0cd5bc392a755b8` unchanged. Public marketing domain is not claimed to serve the new Club UI.

## Applied globally

- One shared root `data-template="dc-global-v1"` used by **all** signed-in households.
- Kid View remains the locked approved shared Adventure Home/Bible/Books/Activities/Trophy experience. This is not a Sally-only fork.
- Family Hub now has centralized approved-palette navy, electric blue, red, gold, scenic imagery, family cards, progress-card and navigation styling, and responsive layouts.
- Parent-facing overview displays actual household name, stored Parent/Guardian preference, real child list, membership summary, Book Companion access checked by the existing authorized RPC, per-child Books/Activities destinations, and existing progress/approval controls.
- Family-only content and data are not copied. Existing RLS, guardian PIN, entitlement checks, child progress, book availability and server XP rules are unchanged.
- `/join?next=books` and `/join?next=activities` are allowed display routes that start adult signup and continue to Kid View after Auth, household setup and PIN. The URL cannot choose another household, child, paid entitlement, admin section or external destination.
- Existing signup email confirmation callback preserves the original path/query string.

## Evidence: implemented, built and verified

**App build + typecheck + 348/348 application tests passed.**  
**94/94 disposable Supabase Auth/PostgREST checks passed** with actual JWTs and separate synthetic households. Tests explicitly confirm cross-household reads and updates denied, foreign digital-book child denied, authorized current-household reads, guardian PIN lock/cooldown/revoke, completed reading persistence, verified activities/Book Adventure awards and duplicate XP denied. Synthetic fixtures stayed in disposable recovery.

**Recovery:** the pinned official Supabase CLI v2.118.0 installer restored the previously broken CI dependency path without database/schema changes; full database bootstrap, ACL/catalog equivalence, RLS and private-function invariants, and post-HTTP-fixture schema verification passed.

CI: `https://github.com/eaglevisiondigital/dustincourageous/actions/runs/46015561732`  
Preview deployed app: `https://app.netlify.com/projects/dustincourageous/deploys/6b0992346e6d9ac6ad1af8d3`

The hosted database's household, child, book-progress, challenge-progress,
activity-progress and badge tables were independently inspected read-only:
RLS enabled; no hosted data, auth settings or providers were mutated.

## Remaining: BLOCKED as independently accepted production journey

1. Live desktop and physical-phone browser sign-ins using **two separate real or authorized test households**, proving the correct family roster, zero unauthorized visibility, parent-vs-guardian vocabulary, PIN control and dynamic child switching. CI local synthetic JWTs do NOT constitute live browser acceptance.
2. Scan Book 1's **actual printed QR** to establish its exact destination. The static marketing site and Club preview are distinct. No public redirect has been verified/changed.
3. New adult QR signup, real email confirmation, household creation, first child, parent PIN, entitled book access and activity completion on desktop and mobile. Verify responsive/accessible behavior, not only the preview build.
4. Founder visual acceptance of Family Hub's rendered global implementation versus the **one approved October 15 Family Hub screenshot**. No alternative visual design approved.
5. Any public site migration/production promotion must be separately authorized and pass the launch gate. No merge to `main`, live payment activation or private Book 1 digital publication was done.

**Conclusion:** Global implementation is real and ready for all users of the
**deployed preview**. The same code will serve all future users once promoted.
It is NOT accurate to claim global production release or completed printed-QR
mobile acceptance yet.

## Permanent maintenance rule

Edit shared React components and versioned global CSS once, validate it once,
deploy it once. New and existing households receive the change automatically.
Never duplicate the interface in per-family storage, clone Sally test data,
or override security/entitlement rules through client-side styling.
