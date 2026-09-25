# Adventure Club Alpha verification

Evidence recorded September 25, 2026 UTC, September 24 America/Chicago.
Development branch only. This is an evidence ledger, not a completion percentage.

## Verified against the deployed database

`supabase/tests/deployed_household_rls_regression.sql` passed 13 checks on project
`vrixketvinzhsfwwcqiu`. The test used actual deployed tables, functions, triggers
and RLS policies, with `SET LOCAL ROLE authenticated` and `SET LOCAL ROLE anon`.
It explicitly checked the active role, absence of RLS bypass, and synthetic JWT
identity. No authorization helpers were mocked or copied.

| Check | Result |
| --- | --- |
| Authenticated role and synthetic JWT identity applied | Passed |
| Guardian sees own household and child, not another family | Passed |
| Reading history excludes another household | Passed |
| Own notification updates work; another user's updates and reassignment fail | Passed |
| Support ticket reads exclude another household | Passed |
| Cross-family child edits and household reassignment fail | Passed |
| Direct bookmark writes fail; protected RPC is required | Passed |
| Free household does not inherit another family's digital access | Passed |
| Dual-household guardian gets digital access only for the entitled child | Passed |
| Expired digital entitlement is denied | Passed |
| Non-guardian adult cannot manage a child or read bookmarks | Passed |
| Removed membership revokes household, child and bookmark reads | Passed |
| Anonymous child reads and digital reader RPC access are denied | Passed |

All fixture rows were created inside one transaction and rolled back. Fixture
auth rows had no email, password or issued session. No book was published or
approved. An existing book ID was used only as a foreign-key reference for
temporary reading positions. Explicit support fixture numbers avoided advancing
the real ticket sequence. A follow-up query found zero fixture households and
zero fixture tickets remaining. Security advisor returned no findings.

Run this SQL only as a complete script in one administrator database session.
Do not execute fragments independently or replace `ROLLBACK` with `COMMIT`.
The current GitHub workflow does not run this deployed-database test; it was
executed through the connected project database tool. CI continues to run app
regression tests, build/typecheck and Edge Function syntax checks.

## Selected-household paid-access repair (September 25)

`household_premium_access_regression.sql` first reproduced a real companion
write leak on the deployed database. After the scoped-access migration, ten
checks pass: wrong-household companion writes, reassignment, draft content,
premium challenge/adventure access and rewards, premium event registration,
free XP without premium reward leakage, expired/future grants, non-guardian
adults, and removed guardians. The 13 checks above and the existing event
capacity/cancellation/retry regression still pass.

The first part uses real tables and deployed functions under authenticated RLS.
For published-content cases only, the test redirects content lookups to temporary
copies of synthetic drafts marked published. It does not mock identity,
membership, entitlement or progress/reward logic, but those content cases are
not a full unchanged-production-path or governance-publication acceptance test.
No real content was approved or released. All transactions rolled back; checks
confirmed zero fixture households, challenges, adventures, rewards and events.

New helpers live in the private schema with fixed search paths and explicit
execution grants. Existing RLS remains in force. Catalog visibility remains
user-wide; writes and earned benefits are scoped to the selected household.
Premium group/organization events now require the selected family's entitlement,
and registration audience qualification is now checked as described below.
No historical progress or rewards were rewritten by this repair.

Security advisor: no database findings; the existing Auth
[leaked-password protection setting](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection)
remains disabled and is an open launch task.

## Event registration audience repair (September 25)

`event_audience_regression.sql` reproduced registration for the wrong group via
another managed child. Eight checks now pass against real household, group and
registration paths, using only temporary synthetic event copies for publication.
Checks cover cross-household and sibling-group denial; eligible child/family
success; organization qualification; open events; leadership not bypassing
child participation; removed membership; paused groups; and paused organizations.
The ten premium checks and event capacity/cancellation/retry regression pass.
App tests (212) and production build pass. This is SQL integration evidence,
not Auth-issued HTTP or signed-in device acceptance.

Group-specific events require an active qualifying child in the selected
household, and a specific-child registration requires that child's membership.
Organization-wide whole-family registrations may also use the registering
adult's active organization membership. Management permissions are unchanged.
Existing registrations are not retroactively canceled or deleted.
Catalog visibility still reflects the signed-in user's accessible events and
may include events unavailable for a particular selected child.

## Browser evidence

The development preview loaded successfully in the cloud browser and displayed
the guardian sign-in screen, approved shield, and Show password control.
No guardian session was available initially. One secure email/password sign-in
attempt returned the visible message `Invalid login credentials`; a guardian
session was not established. No credentials were read or stored in the build
record. This establishes preview reachability and a displayed login failure,
not successful authentication or family workflow acceptance. Manual sign-in or
a valid test guardian account is needed to continue the browser walkthrough.

## Still open before a family-ready claim

- Sign in through the real browser, complete guardian/household/child/PIN flows,
  complete an approved activity on a designated test child, reload, and verify
  persisted progress. Record the exact test account and results privately.
- Use actual Auth-issued sessions to verify PostgREST and Storage HTTP access.
  SQL role/JWT simulation does not validate token issuance or the HTTP gateways.
- Verify free/premium reader behavior with a reviewed, approved digital edition.
  Corrected Book 1 artwork, page text, reading order and human approval are pending.
- Check phone/tablet gestures, screen-reader behavior, and calendar import.
- Complete signed-in HTTP verification of selected-household access. The scoped
  write/earned-benefit repair above is verified at the SQL layer; catalog reads
  intentionally still aggregate households. Group/organization registration
  qualification is verified below at the SQL layer; device acceptance remains open.
- Configure and test payment, outbound communications and GoodBarber providers
  before enabling their production features. Pricing remains unapproved.

## Next milestone

Complete a recorded signed-in free-family walkthrough and the remaining
selected-household premium-access review. Add fixes only for observed failures
or requirements exposed by those checks. Avoid using unrelated interface
additions as evidence that these launch gates are complete.
