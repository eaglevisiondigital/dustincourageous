# Protected digital books

Checkpoint: September 24, 2026, America/Chicago.

## Implemented

- Bookshelf opens a private image-page reader with previous/next, page selection,
  fit/enlarge controls, page-error retry, and a confirmed saved place per child.
- Original page/spread proportions are preserved. The current reader shows one
  supplied image at a time, so a full spread can be supplied as one image.
- Positions are separate from Book Companion completion and XP. They reset to
  page 1 when an approved edition revision changes. Across multiple devices,
  the last successful position write wins.
- Guardian privacy inventory and household/child exports include reading places,
  including archived children and history retained after digital access expires.
  Export version 2026.2 adds `book_reading_positions`. Permanent child deletion
  cascades these records through the existing foreign key.
- Each request checks the selected child's active household and guardian access.
  Full-book access requires `digital_books` or a current individual book grant.
  Free `book_companions` does not unlock full books.
- Authenticated downloads use the private `dc-digital-books` bucket. No public
  book URLs or persistent offline cache are created. Already downloaded bytes
  cannot be recalled; this is access control, not DRM.
- Page paths and accessible text live in a private manifest table. Catalog
  metadata stores only the edition revision and SHA-256 manifest fingerprint.
- Book publication, release date and an approved current governance fingerprint
  are required for family access. New editions return the book to draft.
- The existing Operations Launch Gate reports private storage, prepared editions,
  missing page files, current human approval and digital release availability.
  Digital-content warnings must be resolved before offering that feature, while
  an unsafe public book bucket is a production blocker. Areas with unresolved
  warnings are labeled "Needs review" rather than "Current".
- Books Admin prepares numbered image files, checks descriptions and order,
  uploads without overwriting, stages a draft, and previews prepared pages for
  human review. Existing book audit/governance triggers record the change.
- Interrupted upload retries reuse confirmed files. Uncertain existing uploads
  must match the source bytes. A different edition uses new object paths.

## Source-file check

Dave supplied these sources for testing, with corrected images expected later:

- `Dustin_Courageous_Book1_KDP_Production_Proof.pdf`: 37 raster pages, each
  2,588 x 2,625 pixels. All embedded images decoded successfully. Page numbers
  and text are baked into the images. This is not an editable text-layer PDF.
- `Dustin_Courageous_Book1_KDP_Full_Wrap_300DPI.pdf`: one print-cover image,
  5,202 x 2,625 pixels. Final digital cover should use its front-cover portion,
  with exact source artwork preserved, rather than displaying the whole wrap
  as the reader's cover.
- `dustin-courageous-complete-update-v18-book1-interactive-preview.zip`: website
  source and selected preview images, not the complete full-spread collection.
  Preview spreads are 1,774 x 887 pixels, below the PDF's source resolution.

The prayer on PDF page 37 opens with `Jesus,`. Final artwork must open with
`Dear God,` under the locked prayer standard. Printed number inconsistencies
remain in this test proof. Some final PDF pages contain two-page layouts within
one square page; original spreads are preferred for the final digital edition.
No source artwork was altered, uploaded to the public website, or approved for
release in this batch. No real book manifest was staged using placeholder text.

## Verification and remaining release gates

- 186 automated app tests pass, including 12 new reader/preparation tests.
- Production TypeScript/Vite build passes. The existing main-bundle size warning
  remains.
- `supabase/tests/digital_book_reader_regression.sql` passes against copies of
  deployed function bodies and isolated temporary fixtures, with real JWT claim
  parsing. It covers household scoping, guardians, free versus paid access,
  expiration, approval, release dates, path restrictions, saved positions,
  edition changes, admin checks and preparation retry behavior. Catalog checks
  verify actual deployed grants, private bucket configuration and position RLS.
  It does not exercise the Storage HTTP server or signed-in browser sessions.
- `supabase/tests/reading_privacy_regression.sql` checks household and child
  export isolation, archived-child history, empty results, and removed-guardian
  denial using temporary fixtures. It also verifies deployed history policy,
  inventory invoker security, and the child-deletion cascade constraint.
- `supabase/tests/digital_book_launch_gate_regression.sql` checks empty setup,
  private/public storage, missing files, stale/current approval, release state
  and admin denial. It uses temporary fixtures and mock release/admin helpers;
  the reader regression separately exercises the deployed release logic.
- All 37 actual proof images pass the client manifest/download checks in an
  isolated mocked-client test with byte sizes preserved. Saved-position calls
  in that source-file test are simulated, not live child records.
- Supabase security advisor: zero findings. Performance advisor retains
  [unused indexes](https://supabase.com/docs/guides/database/database-linter?lint=0005_unused_index),
  [multiple permissive policies](https://supabase.com/docs/guides/database/database-linter?lint=0006_multiple_permissive_policies),
  and the [Auth connection configuration notice](https://supabase.com/docs/guides/deployment/going-into-prod).
- Browser policy blocked opening local proof files. The private visual reader
  walkthrough, touch behavior, screen-reader experience, actual Storage HTTP
  access, and signed-in guardian/free/premium checks remain pending.
- Final image order, corrected prayer, unnumbered source artwork, readable page
  text/descriptions and human DC Governance approval are required before release.
- Automatic narration, animated page curls, offline reading, and converting
  print PDFs into finalized digital editions are not implemented here.

## Final source handoff

Use original PNG or high-quality JPG page/spread exports at their native aspect
ratio, ideally without printed page numbers or printer marks. Number filenames
in reading order. Include the front cover, end matter, and final text for
accessible descriptions. Do not stretch artwork to fit a different shape.
The original editable layout is best if further text changes are needed.

The uploader supports PNG/JPG/WebP, 1 to 300 images, 20 MB per image and 512 MB
per preparation. Supplied PDFs need source preparation before upload. Failed or
abandoned preparation can leave private unreferenced files; cleanup is an admin
operation and must not remove any file referenced by a reviewed edition.
