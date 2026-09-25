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

September 25: Closed the direct-assignment discovery gap. Family Assignments now
combines existing household/child challenge_assignments with active-group
assignments, without changing the sidebar child. Direct entries are scoped to the
current household and active children; NULL-child assignments display Whole Family.
The selector separates Household & Child Assignments from Group Assignments and
names the recipient on individual entries. Published accessible content opens the
existing multi-child flow, which still begins with no participants selected.
Unavailable content stays disabled; either failed source shows a retryable load
error. Limits are explicit at 100 recent records per source. Four SDK/mock-HTTP
tests cover filters, household/child isolation, missing content and errors. All 240
app tests and production build pass. Existing deployed assignment SELECT policy
was inspected; no schema, grants, content publication or XP changes. Signed-in
assignment/device acceptance remains pending.

September 25: Existing adults can now update full name, optional contact phone
and Parent/Guardian display choice in Membership & Settings > Household > Your
Account Details. Reuses signup validation; account email is read-only. Clearing
the phone explicitly removes saved contact metadata without changing phone Auth,
verification or messaging consent. Fresh current-user checks precede writes;
profile writes target only the adult ID and confirm returned values. Auth metadata
and profile updates are separate requests, so partial/uncertain saves report that
some changes may have saved and offer retry/refresh instead of false success.
Five new mocked-client checks cover reads, identity changes, phone removal,
validation and partial-save failure. All 236 app tests and production build pass.
A rollback-only real authenticated-role check confirms own-profile name updates
and denial of cross-account edits. No schema or permission changes. Signed-in
settings/device acceptance is pending.

September 25: Adult signup now requires first and last name and retains required
email plus Parent/Guardian selection for family accounts. Optional Cell Phone is
stored as adult_contact_phone in the account's Auth metadata only; it does not
configure phone login, mark the number verified or opt into texts. Display name
remains first name, and the existing new-user trigger stores both names in the
adult profile. Existing Parent Controlled/Guardian Controlled badges still use
the selected relationship for presentation only. Four tests cover metadata,
required fields, phone validation and leader registration. All 231 app tests and
production build pass. A rolled-back real Auth/profile-trigger check confirms
name/contact/relationship persistence and no phone verification. Existing accounts
are not retroactively filled. Actual confirmation-email/device signup is pending.

September 25: Reproduced expired-checkout payment acceptance in the deployed
mark_order_paid_from_provider RPC using rollback-only synthetic orders. Deployed
`20260925132731_validate_payment_checkout_under_lock.sql`: payment confirmation
locks checkout before order, matching cancellation/expiry, then validates current
provider_pending status, clock-time expiry, provider/checkout identity, amount and
currency under those locks. Only pending_payment orders may newly become paid;
existing committed event replay behavior remains. No function permission expansion:
service_role only, never guardian/anonymous clients. Ten SQL checks pass before
and after deployment, including expired/canceled/early/mismatched inputs, valid
commit and replay. Fixtures use no products, inventory or real payment provider;
this is transition verification, not concurrent-load or live payment acceptance.
No prices, provider configuration or checkout enablement changed. Existing Edge
handler routes rejected captures to reconciliation. Full stock/fulfillment races,
early-provider callback retry and sandbox integration remain release gates.
App code is unchanged from the 227-test/build-passing checkpoint.

September 25: Reproduced a legacy/direct Faith completion access gap: an
unpublished draft guide accepted a child completion through direct table INSERT.
Deployed `20260925131231_protect_direct_family_faith_credit.sql` to strengthen the
existing INSERT policy with published/available guide checks, selected-household
premium access and active-child validation. Guardian ownership and authenticated
completed_by remain required. Existing history and household-only records are
unchanged. Nine direct-insert checks and ten atomic Family participation checks
pass before and after deployment. Synthetic published catalog rows exist only in
rolled-back test copies; no content was published or approved. Updated the older
family regression's catalog seam to exercise the strengthened deployed policy.
Cloud preview still has no signed-in session. App code is unchanged from the
227-test/build-passing checkpoint. Security advisor retains only the previously
recorded Auth leaked-password warning; no database findings.

September 25: Added Family Activity History to the Family workspace so guardians
can verify recorded child activity after leaving a challenge or reloading. Shows
child name, recorded title/description, local timestamp and nonzero XP delta, with
All Children or one-child filtering independent of the sidebar profile. Reads are
scoped to the current household and active child IDs; internal metadata is not
requested. Twenty-row pages use timestamp plus numeric ID cursors, preserving
microseconds. Older-load failures retain history/cursor; replaced filters ignore
late responses. Save/approval events refresh newest history, including a queued
refresh when a request is already running. This is existing recorded activity,
not a new participation ledger or proof that pending approvals awarded XP.
Four SDK/mock-HTTP tests cover scope, tied-time paging, unsafe/foreign records and
failure/empty behavior. All 227 tests and production build pass. Existing deployed
activity SELECT policy was inspected; no database changes. Signed-in history and
device acceptance remain pending. Previous Family Assignments CI passed.

September 25: Added Family Assignments directly to the Family workspace. Reads
active group memberships for the current family's children, combines sibling
memberships into one assignment entry, and shows group, assigned children and
local due time. Guardians open the existing multi-child activity flow without
switching child profiles. Other participating children still need challenge access;
completion does not enroll them in a group. Hidden/unpublished challenges remain
unavailable. The list shows up to 100 recent assignments with an explicit limit
notice, refresh/retry and distinct empty/error states. Existing deployed SELECT
policies were inspected; no policies, schema, content or credit rules changed.
Five SDK/mock-HTTP tests cover scoped queries, combined siblings, inactive/hidden
groups, unavailable content, unexpected rows and denied loads. All 223 app tests
and production build pass. Signed-in group-assignment/device acceptance is pending.

September 25: Completed the Family activity review loop. Family now includes the
existing household-scoped guardian PIN approval queue. Confirmed saves list each
selected child and the returned Participating, Awaiting Approval or Completed
state. Approval/return events refresh the displayed child statuses and clear
stale shared-step confirmations. Faith guide changes clear participant selection;
selection changes clear old save results. Narrow screens use a single participant
column. No new backend, authorization, XP or publication rules. Existing 218 tests
and production build pass; signed-in multi-child/device acceptance remains pending.

- September 25: Dave requested Family-first participation rather than selecting
  one child at a time. Family Hub now has a Family sidebar button/tab opening
  Family Challenges & Projects plus Faith At Home. Guardians check participating
  children, save participation, or complete for the selection. Existing challenge
  dialogs in guardian mode also offer Do This As A Family (including assignments).
  Shared required-step confirmations reset when the participant selection changes.
  Kid View does not expose family controls.
  Deployed `20260925123327_family_activity_participants.sql`: two SECURITY INVOKER
  RPCs validate the entire active-child/household/access selection and atomically
  write existing per-child records. Retries preserve completed/pending records;
  configured challenge XP is awarded only once through existing triggers. Required
  guardian PIN approval still applies per child. Faith completion records each
  participant's activity and eligible badge progress, with no invented XP rules.
  Prior NULL-child whole-family records are retained, not retroactively attributed.
  Ten SQL integration checks and 218 app tests pass; production build passes.
  Content-publication fixtures and the step-catalog lookup use transaction-only
  copies; real guardian/child progress/XP checks remain enforced. No content was
  published or approved. Signed-in device acceptance of the new flow is pending.

- September 25: Reproduced and fixed group-event registration borrowing another
  managed child's group membership. Deployed event-audience migration checks the
  selected child or household, gives a specific group precedence over its wider
  organization, and requires active child/group/organization membership. Adult
  leadership does not bypass selected-child participation. Whole-family group
  entries need a qualifying child in that household; organization-wide family
  entries may also qualify through the registering adult's active org membership.
  Existing registrations are retained and cancellation remains available.
  Family Events now explains audience, paid-access, closed-registration and
  inactive/wrong-family selections without exposing raw backend errors.
  Eight audience checks, ten premium checks, event capacity/retry regression,
  212 app tests and production build pass. Synthetic published event copies are
  test-only and all fixtures roll back. Signed-in/device acceptance remains open.

- September 25: Reproduced and repaired a cross-household Book Companion write:
  a dual-household guardian could use one family's entitlement for the other's
  child. Deployed `20260925120405_scope_child_household_premium_access.sql`.
  Child challenge/companion writes and challenge/adventure reward unlocks now
  use selected-household access. Adventure progress gains a published/available
  content gate; child reassignment rechecks access. Premium event registration
  checks the requested household; archived children cannot register.
  Ten targeted SQL checks pass, plus the existing 13 deployed RLS checks and
  event capacity/retry regression. Fixtures roll back and zero leftovers were
  confirmed. The premium test uses temporary published copies of synthetic
  drafts for content lookups only; actual content is never published/approved.
  Identity, household, entitlement, progress and reward paths remain real.
  Catalog reads still aggregate a guardian's households; group/organization
  event-audience scoping and signed-in HTTP/device acceptance remain open.
  Security advisor has no database findings; existing leaked-password Auth
  protection warning remains. See ALPHA_VERIFICATION.md for exact boundaries.

- September 25 screenshot review: standardized short action/field/status labels
  while keeping sentences and content copy intact. Raised muted-text contrast,
  darkened the primary red for white-label contrast, normalized Safari selects
  with 48px targets and visible chevrons, improved entitlement/consent spacing,
  wrapped settings tabs and plan rows, and reduced oversized store headings.
  Corrected light reading-history cards with inherited light text. Mandatory
  granted consent is a readable status; optional actions explicitly say Grant
  Consent/Revoke Consent without changing permissions. Added a rendering-error
  recovery screen and visible section loading feedback. The blank screenshot's
  original cause has not been reproduced. Existing 212 tests and production
  build pass; signed-in Safari/device review remains pending. Parent/Guardian
  display choice and red badge from the preceding batch remain in place.

- September 25: Added breathing room and 44px targets to account links below
  Sign In. Family signup requires a Parent/Guardian presentation choice saved
  in Auth user metadata (family_relationship). Family Hub and privacy badges use
  Parent Controlled for parent, Guardian Controlled otherwise, with a stronger
  red background and larger padding/type. Existing users can save their choice
  in Membership & Settings > Household > Your Family Label. This is per-account
  display metadata only, never authorization; no membership roles or policies
  change. Existing accounts default to Guardian until they choose. Build and
  regression checks run; live signup/update/device verification remains pending.

- September 25 device screenshots confirm Dave reached Family Hub after the
  onboarding fix. Shared pill/status spacing now prevents flex compression,
  centers labels with consistent line height, and uses title case for short
  labels while explanatory pill sentences retain sentence case. Family Hub and
  Sign Out labels corrected. Guardian Controlled and All Clear stay on one line;
  their card rows wrap instead of squeezing the badges. Notification counts are
  separate Unread/Loaded pills, with a 48px, inherited-font select. Mobile header
  now scrolls with the page, actions and primary tabs wrap, and compact headings
  align left. Production build passes. Cloud browser still has an unsigned-in
  signup form; updated signed-in device visual confirmation remains pending.

- September 25: Dave reached signed-in household setup on his device and
  reported creation failure. Reproduced SQLSTATE 42501 in the deployed RPC:
  INSERT RETURNING checked household SELECT RLS before the AFTER INSERT trigger
  created owner membership. Fixed by allocating the UUID before INSERT and
  returning it after membership and consent creation. SECURITY INVOKER and
  all policies remain unchanged. Deployed migration and rollback-only actual
  RPC test pass for creation, owner visibility/membership, consent, household
  isolation and anonymous denial. Device retry remains pending. Security advisor
  now reports Auth leaked-password protection disabled; no database findings.
  Remediation: https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection

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
