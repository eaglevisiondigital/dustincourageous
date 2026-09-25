# Adventure Club launch milestones

Status checkpoint: September 24, 2026, America/Chicago.
Latest milestone: protected digital-reader and Books Admin preparation foundation.
See [digital book reader checkpoint](DIGITAL_BOOK_READER.md) for verification and source-file findings.

## What the latest work actually accomplished

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
