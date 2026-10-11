# Book 1 Activity Zone — first playable practice surfaces

## Asset provenance and scope
- All four printable PDFs and the full coloring collection are identical Git blob references from the existing approved `book-1-coloring-sheets/` directory. Copied into the Vite app's `public/printables/book1/` output path. They are not regenerated or edited.
- Official shield and Book 1 cover are reused from `assets/images/` as exact Git blobs.
- The picture puzzle uses only `book1-preview-wall-pages17-18.webp`, the already-public Book 1 preview asset. No full protected book pages or new source imagery is exposed.
- Courage Missions use approved Book 1 page 36 wording and theming, but individual mission art crops are intentionally not yet bundled here. Do not represent this practice UI as the final approved challenge art layout.

## Authorization and UX
- Book 1 Courage Missions and Picture Puzzle are intentionally client-only practice experiences, with no `child_content_progress` write, no XP/badge award, no privacy submission or parent approval. Existing protected ChallengeDialog is untouched.
- Printables are existing approved free assets opened in a browser to print or download.
- Book 1 full reader and all gated activity packs remain under existing entitlement checks; these practice surfaces do not bypass subscriptions or permanent book ownership.
- Later XP awards must be validated server-side, idempotent, household-scoped and compatible with existing badges. No client `solved` state becomes authority.
- Future genuine jigsaw and three additional puzzle assets will use dedicated, approved images and the protected media delivery pipeline.

## Follow-up visual review
- Confirm top-of-page polish, desktop fill, mobile/touch swap usability, four mission instructions and printable PDF behavior in Chrome/Safari.
- Confirm the copyrighted Book 1 preview asset cropping looks correct at 3x2, 4x3 and 5x4 grids.
- Verify no conflicting classification of Family Hub versus Kid View navigation.
