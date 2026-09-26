# Adventure Club launch milestones

> September 26: [CURRENT_BUILD_STATE.md](../CURRENT_BUILD_STATE.md) and the
> [security repair report](../docs/audits/2026-09-26-security-repair.md) supersede
> historical summaries below. PIN/RPC repairs passed 85 new SQL checks and the
> real concurrency test; 280 app tests/build/CI passed. Recovery/reproducibility
> is the recommended next package, subject to Chat approval. Device, provider
> and content-approval gates remain open.

Status checkpoint: September 24, 2026, America/Chicago.
Latest milestone: protected digital-reader and Books Admin preparation foundation.
See [digital book reader checkpoint](DIGITAL_BOOK_READER.md) for verification and source-file findings.

## What the latest work actually accomplished

September 25: Added Mark Loaded Notifications Read to the family inbox. The action
updates only the current adult's loaded unread IDs, deduplicates them and confirms
returned IDs, ownership and read status. Already-read and unloaded notifications
are excluded. Partial confirmations update only confirmed items; the remainder
stay visible with refresh guidance. Unread-only mode removes confirmed rows while
preserving its older-page cursor. Refreshes retain the visible notification list,
and loading/working states block overlapping actions. Older-notification button
labels now use title case. Five tests cover scope, no-op inputs, ownership,
partial results and invalid responses; all 280 tests and production build pass.
No delivery providers, communication preferences, messages or backend permissions
changed. Signed-in bulk-read and device interaction acceptance remain pending.

September 25: Reward request recovery now spans families and staff. Family rewards
stay visible through reloads, block requests while stale, and commit the displayed
unlock/status snapshot only after both reads succeed. Added refresh controls in
normal and empty states, confirmed-request feedback, unavailable-reward blocking,
and explicit title-cased status labels. Requests require both the exact unlock ID
and requested status in the returned confirmation.

Staff fulfillment actions now block overlapping clicks, compare the displayed
status in the UPDATE predicate, validate allowed UI transitions and require the
exact returned request ID/status before confirming success. Zero-row/stale updates
cannot silently succeed. A strict refresh path keeps staff actions blocked after
refresh failures and offers Refresh Reward Requests; other admin callers retain
their existing refresh behavior. Six tests cover transitions, stale/missing rows,
request identity and safe labels. All 275 tests and production build pass. Backend
RLS/transition permissions remain unchanged; no real rewards were requested,
approved, denied or fulfilled during this batch. Signed-in family/staff device and
concurrent-update acceptance remain pending.

September 25: Parent approval queues now preserve loaded rows and action feedback
during refreshes, show stale-data errors inline, and disable decisions/PIN entry
until the queue is current. Refresh Approvals is available in both populated and
All Clear states. Unlock and decision attempts perform a final queue reload;
self-generated progress events do not launch competing loads while an action runs.
The queue explicitly scopes active children to the current household, deduplicates
requested IDs, rejects foreign/inactive/duplicate returned rows and skips empty
roster queries. Stable oldest-first ordering uses a 50-item page plus lookahead;
50+ Waiting explains that reviewing those items exposes the next waiting entries.
Decision confirmation now requires the exact progress ID, child ID and expected
completed/in-progress status. Five tests cover queue scope, limits, empty rosters,
invalid results and decision confirmation. All 269 tests and production build pass.
No PIN lifetime, backend permission, approval or XP rule changes. Actual signed-in
PIN, approval, returned-task and device interaction acceptance remains pending.

September 25: Family challenge refreshes now retain the activity, participant
selection and confirmed per-child results. Progress errors display inline and block
writes until a successful refresh. Save completion triggers one final refresh;
self-generated progress events no longer start a competing refresh during the save.
Shared step confirmations clear after saves, external progress updates, explicit
refreshes and roster changes. Assignment and challenge-list refreshes preserve an
available open editor, suspend writes while loading/failed, and refresh its progress
when resumed. Added Refresh Challenges in normal and empty states; a removed selected
challenge requires an explicit new selection instead of silently switching tasks.

Challenge and Family Faith selections now discard removed child IDs and never
select newly added children automatically. This fixes a silent Family Faith save
no-op after roster changes. The shared participant picker shows a selected-child
count. A tested challenge loader checks published activity identity, scopes progress
to unique requested child IDs, rejects foreign/duplicate rows and skips progress
queries for empty rosters. Five new tests cover these boundaries; all 264 tests and
production build pass. Actual signed-in refresh/error/device interactions remain
pending. Existing atomic participation, approval, access and XP rules are unchanged.

September 25: Adult Account settings now provide a separate saved-contact JSON
export (name, email, optional phone and Parent/Guardian choice). It freshly verifies
the requesting adult and reads their own profile, allowlists contact fields, and
never serializes Auth sessions or arbitrary metadata. A visible download link
supports deliberate device downloads; its object URL is revoked on replacement,
refresh, save or unmount. This supplements household/child privacy exports, whose
schema remains unchanged. No email, SMS, provider or authorization changes.

Unsaved account edits now show a notice, request an explicit discard before an
in-section refresh, and register the browser's page-unload warning. In-app section
navigation is not intercepted, so the notice asks adults to save before leaving.
Legacy accounts with no valid relationship must explicitly choose Parent or
Guardian when saving, instead of silently preselecting Guardian. Existing badge
fallback remains unchanged until a choice is saved. Account actions wrap with
spacing and 44px minimum target heights. Four new tests cover export field limits,
identity/read failures, absent contact values and editable-field change detection;
all 259 tests and production build pass. Signed-in device, download and unsaved-form
interaction acceptance remain pending.

September 25: Routine same-adult TOKEN_REFRESHED, USER_UPDATED and repeated
SIGNED_IN events now update the session without replacing the mounted workspace
or restarting an existing family load. This prevents automatic auth events from
clearing family selections and account forms. Initial sessions, missing/different
identities, sign-out, recovery and other events retain full transition behavior.
An independent event counter prevents late getSession results from overwriting an
auth event without invalidating ongoing family loads. Four decision-helper tests
cover event/identity boundaries; all 255 tests and production build pass. Backend
authorization remains enforced per request. No RLS, role or session lifetime changes.
Real browser token-refresh/account-edit acceptance remains pending.

September 25: Family Faith refreshes preserve the displayed guide and per-child
save results. Loading/errors are shown inline when guides are already available;
saves and participant/guide changes are disabled until progress is current. Added
Refresh Family Faith to normal and empty states, plus progress-event refreshes.
Own save events defer to the existing final refresh. An unavailable selected guide
no longer silently switches to another activity; the family explicitly chooses a
new guide. Confirmed results remain visible even when no guides remain. Existing
251 tests and production build pass. This batch adds no new automated UI tests;
signed-in device/recovery acceptance remains pending. No schema, content, consent
or XP changes.

September 25: Password recovery remains mounted ahead of account-loading screens
while a recovery session exists, so USER_UPDATED family refreshes do not replace the
form during save. Successful saves show Password Updated before explicit Continue.
Return To Sign In signs out the local browser session and clears the guardian token;
failures remain visible. Recovery errors use shared guidance, including expired
sessions and same-password errors. Failed email redirects display fixed recovery
instructions instead of arbitrary URL error descriptions. Two additional helper
tests cover redirect errors and recovery guidance; all 251 tests and production
build pass. No passwords, emails or real recovery actions were submitted during
verification. Actual email-link, device and session acceptance remains pending.

September 25: Auth recovery feedback now maps documented Supabase error codes to
plain-language guidance for unconfirmed email, incorrect credentials, throttling,
weak passwords and unavailable signup. Unconfirmed sign-in offers confirmation
resend directly. Successful email requests and rate-limited email attempts start a
60-second in-memory retry pause shared across signup/reset/resend; sign-in remains
available. This is UI pacing, not a security rate limit, provider configuration fix
or promise of email delivery. No automatic email retries or messages were sent in
verification. Four pure-helper tests cover error guidance and retry timing. All 249
app tests and production build pass. Real signup/recovery email delivery and device
acceptance remain pending.

September 25: Open challenge progress rows now launch the existing multi-child
Family Challenge editor directly from Family Activity History. No participants are
preselected, including when the history filter names one child. The editor stays
mounted after completion removes a row from the open list, preserving save results.
Opening another row starts a fresh editor; close, filter and other open actions are
disabled during saves. Opening moves keyboard focus to the editor heading. Only
matching published challenge joins expose an open action; unavailable content
retains its status context. The editor freshly requires published content on load.
One new SDK/mock-HTTP test verifies published/mismatched/hidden relations. All 245
tests and production build pass. No schema, permissions, PIN or XP rules changed.
Signed-in device and keyboard acceptance remains pending.

September 25: Family Activity History now includes In Progress & Awaiting Approval
above the recorded activity feed. The shared All Children/individual-child filter
shows current challenge status, child name and last update; it explicitly separates
participation/pending approval from completion XP. Refreshes after progress events;
failed requests retain displayed rows with an out-of-date warning and retry.
Queries restrict active children and selected household using an inner child join,
request no evidence text, and disclose the 50-row recent-result limit. Unavailable
challenge titles retain status context. Four SDK/mock-HTTP tests cover scope,
archived/foreign children, pending status, hidden joins, limits and error handling.
All 244 app tests and production build pass. Existing child/progress SELECT policies
were inspected. No schema, permissions or XP writes changed. Signed-in device
acceptance remains pending.

September 25: Privacy-controls feedback and refresh reliability improved. Success
messages survive the follow-up refresh. Loading failures have a separate alert and
Refresh Privacy Controls action; controls are disabled until a successful reload.
A shared in-flight guard blocks overlapping actions and releases on thrown errors,
with an uncertain-result message instead of leaving controls stuck. Child selection
no longer triggers redundant network reloads. Stale load responses are ignored and
the component remounts for household/account changes. Request/status/export labels
use initial capitals. Existing 240 tests pass; production build passes. No database,
permission, consent-policy or export-content changes. Signed-in device acceptance
of privacy actions remains pending.

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

September 25: Added Family-first activity participation with multi-child checkboxes
for family challenges/projects and Faith At Home, plus shared mode on guardian
challenge dialogs. Atomic per-child saves preserve configured XP, required steps,
PIN approvals and idempotency. Ten SQL integration checks and 218 app tests pass;
production build passes. Signed-in multi-child device acceptance remains open.

September 25: Event registration now qualifies the selected child/family for the
specific group or organization. Removed memberships and paused groups/orgs are
blocked. Eight audience checks pass alongside premium-access and capacity/retry
regressions; synthetic event publication is isolated to transaction-only copies.
The frontend explains expected eligibility failures. Signed-in acceptance is open.

September 25: Fixed a reproduced cross-household Book Companion access leak.
Selected-household checks now protect companion/challenge/adventure writes,
premium XP-threshold rewards and premium event registration. Adventure progress
also rejects unpublished/unavailable content. Ten targeted SQL checks and the
existing 13 deployed RLS checks pass; content-publication fixtures are temporary
copies, never approval of real content. No historical records were changed.
See ALPHA_VERIFICATION.md for test limits and remaining audience/HTTP gates.

The launch-verification batch added and executed 13 rollback-only checks against
actual deployed tables, policies and functions under authenticated/anon roles.
It verified concrete household isolation and digital-entitlement scenarios
without mocked authorization helpers. It did not issue real Auth sessions or
exercise Storage HTTP. The preview is reachable but awaits guardian sign-in.
See [Alpha verification evidence](ALPHA_VERIFICATION.md) for exact results and
the remaining premium-access and signed-in acceptance gates.

The larger guardian planning/help/inbox batch adds event timezone and location
details, safe online links, downloadable calendar reminders and event refresh;
household-scoped support request viewing and refresh; and server-filtered unread
notifications with independent pagination. All 212 tests and the production
build pass. These are three implemented guardian workflows, not a claim of
signed-in acceptance or launch readiness. Calendar imports, real-device behavior,
and actual signed-in support/inbox checks remain to be completed.

The guardian notification-history batch removes the fixed 12-alert viewing
limit. Load older notifications preserves stable timestamp/ID ordering, while
Refresh returns to the newest alerts. Failed page requests retain the displayed
history and retry position. All 199 tests and the production build pass; five
new SDK/mock-HTTP tests cover paging and guardian scoping. Live signed-in
notification and cross-account checks remain pending.

The Family Hub reading continuation batch adds Read together directly to saved
reading places. It uses a fresh access check and the latest server position,
with retry/cancel and preserved history when access is unavailable. Existing
194 regression tests and the production build pass. The signed-in walkthrough
is still an open acceptance gate.

The guardian account usability batch adds Show/Hide password controls to sign-in,
signup and both recovery fields. Production build and the existing 194 tests
pass. Signed-in and physical-device acceptance remain pending.

The last twelve commits primarily strengthened existing flows. They did not
represent twelve new product features. Distinct fixes covered event capacity,
group approval and code reuse, account setup, support retries, progress loading,
activity access, secure file links, and verified Book Adventure saves.

Automated tests and CI establish tested logic and build
health. Most tests use mocked clients; SQL regression fixtures often replace
authorization helpers. They do not establish signed-in browser, real-device,
real-payment, or full cross-household RLS correctness.

## Milestones and acceptance evidence

| Milestone | Current evidence | Remaining work | Depends on Dave |
| --- | --- | --- | --- |
| Usable free web Alpha | Family and child screens implemented; build and unit tests pass | Signed-in guardian walkthrough: signup, household, child, PIN, complete challenge, reload and confirm saved progress; record failures and fixes | Authorized test sign-in if no testing session is available |
| Protected digital books | Reader, private image delivery, per-child resume, governed edition preparation/review, and isolated access tests implemented; supplied proof files checked | Signed-in reader/Storage and device walkthrough; finalize accessible text, source order, and corrected images; human approval before release | Corrected book images and final review |
| Paid monthly membership | Free and premium plan records active; premium monthly price is null | Approved pricing, recurring billing integration, verified entitlement activation and cancellation behavior | Pricing and provider approval/configuration |
| Store payments | Authoritative checkout and webhook foundation exists | Provider adapter integration; verify real sandbox lifecycle including capture after local expiry/cancel, retries, fulfillment and reconciliation | Provider approval/configuration |
| Guardian communications | Queue, preferences, worker and scheduling implemented | Configure providers and prove delivery, suppression and failure recovery | Provider configuration |
| GoodBarber shell | Installation foundation exists | Configure shell and prove login, navigation, links, PIN behavior and notifications on devices | GoodBarber setup/access |
| Launch content approval | Governance workflow exists | Human review of exact launch content and approved artwork; no automatic approval by the build agent | Founder review |

Provider records were checked at this checkpoint: commerce, email, push and
GoodBarber are all not_configured. This does not by itself establish the state of
Supabase Auth's own email delivery.

## Next implementation milestone

Finish private digital-book integration verification with final source images.
The reader foundation now exists, but real signed-in Storage and device tests
remain open. Keep the release path unavailable until corrected files, human
governance review and access checks are in place. Do not invent pricing.

Signed-in Alpha verification remains a parallel release gate. Record it as
pending until it actually happens; do not infer it from unit tests or CI.

## Checkpoint discipline

- Name the milestone advanced and the concrete behavior added or repaired.
- Distinguish implemented, automatically tested, manually verified and blocked.
- Revisit a completed area only for a reproduced defect, uncovered requirement,
  or necessary integration. Identify that reason in the checkpoint.
- Do not use growing test counts as a completion percentage.
- Keep the existing security audit backlog visible: broader cross-household
  entitlement scoping and real signed-in authorization tests remain open.
- Preserve the dedicated Dustin backend, approved DC assets, governance, prayer
  standard, guardian ownership and development-only branch workflow.
- Never merge into live main without explicit approval.
