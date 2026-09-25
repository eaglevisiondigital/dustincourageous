# Dustin Courageous build checkpoint

Updated September 25, 2026 UTC (September 24 in America/Chicago).

## Resume here

Repository: eaglevisiondigital/dustincourageous. Development branch:
build/adventure-club-app. Application: club-app/. Never merge to main without
Dave's explicit approval. Supabase project: vrixketvinzhsfwwcqiu only.
Preview: https://deploy-preview-1--dustincourageous.netlify.app

Read LAUNCH_MILESTONES.md and DIGITAL_BOOK_READER.md for implementation and
verification boundaries. Inspect current branch before choosing new work.
Do not repeat completed batches without a concrete defect or required gate.
Read ALPHA_VERIFICATION.md for the latest deployed authorization evidence.

## Latest completed implementation

- Launch verification now includes 13 passing checks against real deployed
  tables/policies/functions under authenticated and anonymous database roles.
  Covered household/child/bookmark/support isolation, notification read/write
  ownership, denied cross-family child edits, removed/non-guardian access and
  selected-child digital entitlements across two households. All fixtures were
  rolled back; follow-up found zero fixture households/tickets. Security advisor
  returned zero findings. This is database authorization evidence, not an
  Auth-issued session, Storage HTTP or signed-in browser walkthrough.
- Cloud browser reached the development preview's guardian sign-in screen;
  one secure sign-in attempt returned `Invalid login credentials`, so no guardian
  session was established. Manual sign-in or a valid test guardian account is
  needed. See ALPHA_VERIFICATION.md for boundaries; do not reset credentials or
  treat this as a completed signed-in walkthrough.
- Guardian planning/help/inbox batch:
  - Events show the event timezone, matching date badge, end time, address,
    HTTPS online link and device-local start time when different. Guardians can
    download a standalone calendar reminder and refresh events. Calendar text
    is escaped and folded by UTF-8 byte count; UTC instants preserve DST offsets.
    Reminders contain event details only, not child/household registrations, and
    do not confirm attendance or update automatically. Invalid timing blocks
    new registration and calendar export; existing registrations can be canceled.
  - Family support history now opens the submitted message and current status,
    submission/update/resolution times, with a refreshable scoped detail dialog.
    Internal metadata, assigned staff and priority are not requested. This is
    original-request viewing, not a two-way support conversation implementation.
  - Notifications offer All/Unread views with server-side filtering and fresh
    cursors on filter changes. Successful read updates remove alerts from the
    unread view. Requests from replaced inboxes cannot update the current view.
  - 13 new tests cover calendar encoding, timezones/DST, unsafe links, support
    scoping and unread filters. Supabase tests use actual SDK/mock HTTP; calendar
    tests generate files in memory. Browser/device/calendar-import checks are
    still pending. No schema, policy, provider or approved-content changes.
- Guardian notifications now support loading older alerts and refreshing the
  newest alerts. Pages use timestamp plus ID cursors, preserving microseconds
  and tied timestamps, with 12 displayed rows and one lookahead. Failed older
  loads retain the list and retry cursor. Account changes remount the inbox;
  stale requests cannot update it. Read/refresh/page requests are serialized.
  Five new tests use the actual Supabase SDK with mocked HTTP responses to check
  guardian filtering, request encoding, page boundaries, same-time alerts, new
  arrivals, malformed cursors and denied/wrong-user responses. They do not prove
  live RLS or signed-in UI behavior. No schema or policy changes.
- Family Hub saved reading places now offer Read together. Each launch checks
  current access and resumes the server's latest position using the existing
  protected reader, not the historical page displayed in the list. Locked and
  unavailable books retain their saved history. Failed checks can be retried;
  canceled/unmounted checks cannot open a reader later. Reading-history refresh
  does not unmount an open reader. Closing returns focus to the selected book
  button or history section. No schema, permission, artwork or XP changes.
  Production build and 194 existing regression tests pass; signed-in interaction
  and device verification remain pending.
- Guardian sign-in, account creation and password recovery now include accessible
  Show/Hide password controls. Fields start hidden; switching sign-in/signup
  resets visibility. Recovery fields have independent controls. Existing
  validation, autocomplete and submit locking remain in place. This closes a
  guardian account usability gap, not the signed-in Alpha verification gate.
  Verified by TypeScript/build and the existing 194 regression tests; browser
  and real-device interaction checks remain pending. No backend changes.
- Protected digital book reader with child-specific household entitlements,
  private image storage, resumable positions, fit/enlarge view, keyboard and
  touch navigation, and accessible page text.
- Admin digital edition preparation, immutable uploads, preparation retry,
  edition review and exact-content governance before release.
- Digital launch readiness checks, bookmark privacy export and inventory.
- Family Hub child progress now includes up to 20 recent digital reading places,
  with book title, saved page and local save time. Unavailable book metadata
  retains the saved place. Errors remain distinct from empty reading history.
  Confirmed reader saves refresh this panel. No completion or XP awarded by it.
- 212 automated tests pass. Production build checked with this batch. GitHub CI
  must be checked on the pushed commit before reporting completion.
- No schema or permissions changed in the Family Hub reading-history batch.

## Pending, not launch-verified

- Signed-in guardian/free/premium walkthrough, real phone/tablet touch behavior,
  screen-reader walkthrough and actual Storage HTTP authorization testing.
- No digital manifest was prepared as of the last database check. Book 1 proof
  was tested locally, not published or uploaded as an approved digital edition.
- Final Book 1 original page/spread images, correct reading order, unnumbered
  artwork and page text/descriptions are still needed from Dave. The supplied
  PDF page 37 prayer opens "Jesus," and needs correction to "Dear God,".
- Payment, outbound email/push and GoodBarber providers remain unconfigured.
  Keep paid checkout unavailable until a chosen provider is safely configured.
  Payment expiry/cancellation races and early callbacks need validation before
  enabling payments. Never invent membership or product pricing.
- Browser policy blocked local file viewing; do not bypass that restriction.
- Last schema batch: Supabase security advisor zero findings; performance
  notices remain documented in DIGITAL_BOOK_READER.md. This is not a claim
  that all production or device checks are complete.

## Locked decisions

Free membership plus future monthly paid membership with digital books and
expanded challenges. Final names, allocation and pricing need the approved
product decisions. Free book companions do not imply full digital book access.

Guardian controls household and children. Preserve RLS and least privilege.
No child email/social network, no service-role browser credentials. Use generated
database types. Supabase remains the authority, including with GoodBarber.

DC Bible v2026.1 governs creative work; Master Production Manual v2026.1 governs
technical production. Preserve approved characters/artwork and the exact DC
shield. No em dashes in Dustin content. Every prayer begins "Dear God,".
Human governance approval is required for release. Proof files are test inputs,
not approved release assets.

## Next useful work

1. Prioritize Alpha verification over more incidental interface additions:
   inspect ALPHA_VERIFICATION.md and review selected-household premium access
   outside digital books (generic entitlement callers remain an open audit).
2. Complete signed-in preview QA when an authorized test session is available.
3. Prepare the corrected Book 1 edition when source images arrive, then run human
   governance review before publishing. Do not auto-approve creative content.
4. Continue provider readiness without enabling unconfigured checkout.
5. Support currently stores the original request and status only. A future
   two-way thread needs guardian/staff permissions, retry-safe replies, privacy
   export/deletion coverage and notification behavior before implementation.

User authorizes continued development and development-branch pushes. Keep
batches concrete, verify once against the relevant risks, and report what
changed and what remains untested. No live main merge is authorized.
