# Adventure Club launch milestones

Status checkpoint: September 24, 2026, America/Chicago.
Code reviewed through commit 8834035610b1b1dcdffed9155a834afdc2d66ee1.

## What the latest work actually accomplished

The last twelve commits primarily strengthened existing flows. They did not
represent twelve new product features. Distinct fixes covered event capacity,
group approval and code reuse, account setup, support retries, progress loading,
activity access, secure file links, and verified Book Adventure saves.

The current 174 automated tests and green CI establish tested logic and build
health. Most tests use mocked clients; SQL regression fixtures often replace
authorization helpers. They do not establish signed-in browser, real-device,
real-payment, or full cross-household RLS correctness.

## Milestones and acceptance evidence

| Milestone | Current evidence | Remaining work | Depends on Dave |
| --- | --- | --- | --- |
| Usable free web Alpha | Family and child screens implemented; build and unit tests pass | Signed-in guardian walkthrough: signup, household, child, PIN, complete challenge, reload and confirm saved progress; record failures and fixes | Authorized test sign-in if no testing session is available |
| Protected digital books | Digital-book entitlement exists; Bookshelf provides companion progress | Implement protected reader/file delivery, resume behavior, and access-denial checks; test with approved assets before release | Approved book files |
| Paid monthly membership | Free and premium plan records active; premium monthly price is null | Approved pricing, recurring billing integration, verified entitlement activation and cancellation behavior | Pricing and provider approval/configuration |
| Store payments | Authoritative checkout and webhook foundation exists | Provider adapter integration; verify real sandbox lifecycle including capture after local expiry/cancel, retries, fulfillment and reconciliation | Provider approval/configuration |
| Guardian communications | Queue, preferences, worker and scheduling implemented | Configure providers and prove delivery, suppression and failure recovery | Provider configuration |
| GoodBarber shell | Installation foundation exists | Configure shell and prove login, navigation, links, PIN behavior and notifications on devices | GoodBarber setup/access |
| Launch content approval | Governance workflow exists | Human review of exact launch content and approved artwork; no automatic approval by the build agent | Founder review |

Provider records were checked at this checkpoint: commerce, email, push and
GoodBarber are all not_configured. This does not by itself establish the state of
Supabase Auth's own email delivery.

## Next implementation milestone

Protected digital-book delivery and reader foundation, with no unapproved book
content or invented pricing. Missing final files must not be presented as the
only remaining work. Keep the release path unavailable until approved files,
governance and access checks are in place.

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
