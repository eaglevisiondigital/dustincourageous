# Book 1 Activity Zone — first playable practice surfaces

## Asset provenance and scope
- All four printable PDFs and the full coloring collection are identical Git blob references from the existing approved `book-1-coloring-sheets/` directory. Copied into the Vite app's `public/printables/book1/` output path. They are not regenerated or edited.
- Official shield and Book 1 cover are reused from `assets/images/` as exact Git blobs.
- The picture puzzle uses only `book1-preview-wall-pages17-18.webp`, the already-public Book 1 preview asset. No full protected book pages or new source imagery is exposed.
- Courage Mission visual art now uses four **exact crops** of the published mission panel on KDP interior PDF page 36 (39-page v04 master). The crops are assembled into a compressed 2x2 WebP atlas for the app, retaining approved faces/shields/scene content, but omitting the book's print gutters and yellow caption strips. Image presentation remains subject to signed-in desktop/mobile visual QA.
- Coloring thumbnails are previews rendered from the existing unchanged four-page approved coloring PDF, combined as a compressed 2x2 WebP atlas. The underlying four printable PDFs and complete set remain byte-exact and unchanged.

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

## October 11 mission and coloring artwork integration

- New app assets: `club-app/public/assets/images/book1-courage-mission-atlas.webp` and `club-app/public/assets/images/book1-coloring-previews-atlas.webp`.
- Each atlas is 2x2 in book order. CSS maps card positions to exact atlas quadrants; client does not load the 342 MB KDP master.
- The mission page is a print layout only; the new cards include no center gutter and no print-page alignment offsets.
- The previews use WebP compression solely for screen display; the original source PDFs are still the print/download files.
- Mission selection remains practice-only with no server XP, household writes or child data collection.

## October 11 digital coloring practice
- Four 1-bit, clean line-art PNG derivatives were rendered from the original approved four-page Book 1 coloring PDF for interactive browser display. All four printable PDFs remain byte-identical, with unchanged art, publication text and QR codes.
- Kids can select a color and tap-to-fill an enclosed region. Undo keeps at most four prior canvas snapshots to bound memory; Reset and Save-to-Device PNG are available.
- Keyboard users can focus the canvas, move a cursor with arrow keys, and fill with Enter/Space. Printable PDFs remain an alternative for physical coloring.
- Coloring is entirely browser-local: there is no Auth/Storage/database save, no private media exposure, no child name embedded in output files, no XP, and no entitlement changes. Closing or switching the active page discards unsaved coloring.
- This is not yet full brush painting, cloud save, or a paid feature. Phase 2 can add brush/eraser and guardian-controlled saved gallery after an explicit privacy and access design.
