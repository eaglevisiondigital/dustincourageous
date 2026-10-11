# Protected digital books

> September 26 recovery update: all ten Edge sources and a separate current-state
> database bootstrap are now tracked. Native isolated restoration, ten SQL suites
> and concurrent PIN checks pass; see [CURRENT_BUILD_STATE.md](../CURRENT_BUILD_STATE.md)
> for the Supabase CI evidence and [the recovery runbook](../docs/recovery/RECOVERY_RUNBOOK.md).
> Earlier statements below about missing source or unapproved recovery are historical.
> Content, Auth/Storage/browser/device and provider acceptance remain separate.

> September 26 audit: the reader, privacy and digital subgate SQL regressions were
> rerun successfully; live prepared manifest count remains zero. The overall
> production launch gate helper-permission defect was subsequently repaired and
> the reader/privacy/subgate suites passed again. Auth leaked-password protection
> remains disabled. See the [repair report](../docs/audits/2026-09-26-security-repair.md).
> Historical test counts
> and zero-finding statements below apply to their original checkpoint. See
> [CURRENT_BUILD_STATE.md](../CURRENT_BUILD_STATE.md).

Checkpoint: September 24, 2026, America/Chicago.

## Implemented

- Guardians can choose Read together from a child's Family Hub reading history.
  A fresh protected lookup determines access, edition and saved page before the
  reader opens. Historical page numbers never grant access or override a newer
  saved position. Background history refresh preserves the open reader. A failed
  lookup offers retry; closing/canceling ignores late responses.
- Bookshelf opens a private image-page reader with previous/next, page selection,
  fit/enlarge controls, page-error retry, and a confirmed saved place per child.
- The focused page supports arrow keys, Home and End. Deliberate horizontal touch
  swipes turn one page in fit mode; loading, enlargement, vertical scrolling and
  canceled gestures do not trigger page changes. Pinch zoom remains available.
- A larger, wrapping text panel displays the reviewed page text and description
  from the private edition manifest. It does not generate or rewrite book text.
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

- 190 automated app tests pass, including 12 reader/preparation tests and four
  navigation-rule tests. The navigation tests cover target pages, bounds,
  blocked input, swipe direction and rejected gestures, not physical devices.
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


## October 11 final Book 1 digital source and reader plan

Authoritative print-interior source for Book 1 is now
`DC_Book1_KDP_Interior_FINAL_39_Pages_v04.pdf`, the 39-page KDP interior
submitted for final publication. It is 621 x 630 pt per page and approximately
342 MB. This supersedes the older 37-page production proof for digital-edition
content preparation. The separately supplied approved front cover is the
bookshelf/reader cover asset; the supplied print back cover is a book-detail /
marketing asset and is not part of the normal digital reading sequence.

Digital reading order follows physical-book logic:

- front cover: standalone cover before the interior
- interior page 1: standalone first right-hand page
- larger screens: interior spreads 2-3, 4-5, ... 38-39
- phones / narrow layouts: one interior page at a time in the same order
- print page 39 is retained as published artwork, but the signed-in product
  should follow it with an app-native Adventure Club completion surface rather
  than requiring the embedded QR code to continue

The digital edition is a protected interactive reader, not a downloadable PDF.
The KDP PDF is the source master. Production assets should be generated from that
master, stored privately, and referenced through the existing protected manifest
and entitlement model. Preserve artwork exactly; do not restyle or recompose the
published story pages.

The reader now supports touch swipe, keyboard navigation, direction-aware
storybook page-turn motion and an optional generated page-turn swoosh. The sound
preference is user-controllable and persisted locally. Reduced-motion users get
a short fade rather than the 3D turn. Navigation and reading-position saves do
not depend on audio support.

Book 1 content structure from the final interior:

- pages 1-3: character/publisher/title front matter
- pages 4-35: core No-Fear Secret story
- page 36: Power Verse + Dustin's Challenge
- page 37: Dustin's Prayer + Catch Phrase page
- page 38: "The End... For Now!" closing page
- page 39: Adventure Club join CTA / QR page

Because a signed-in reader is already inside Adventure Club, after the published
page 39 the app-native completion experience should provide direct actions such
as Continue My Book Adventure, Go to Courage Challenges, Read Together and Back
to My Bookshelf. Parent/Guardian wording on app-native surfaces follows the
saved family relationship choice; the published print artwork itself is not
rewritten dynamically.

Accessible page text/descriptions still require final human preparation and
governance review before release. The raw 342 MB PDF must never be exposed as a
public or member-download URL.
