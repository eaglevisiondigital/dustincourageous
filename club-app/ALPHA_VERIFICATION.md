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

## Browser evidence

The development preview loaded successfully in the cloud browser and displayed
the guardian sign-in screen, approved shield, and Show password control.
No guardian session was available. This establishes preview reachability only,
not successful authentication or family workflow acceptance.

## Still open before a family-ready claim

- Sign in through the real browser, complete guardian/household/child/PIN flows,
  complete an approved activity on a designated test child, reload, and verify
  persisted progress. Record the exact test account and results privately.
- Use actual Auth-issued sessions to verify PostgREST and Storage HTTP access.
  SQL role/JWT simulation does not validate token issuance or the HTTP gateways.
- Verify free/premium reader behavior with a reviewed, approved digital edition.
  Corrected Book 1 artwork, page text, reading order and human approval are pending.
- Check phone/tablet gestures, screen-reader behavior, and calendar import.
- Audit broader premium access outside the digital reader. The generic
  `private.user_has_active_entitlement` intentionally checks all of a user's
  active households; its callers in challenge/adventure completion, book
  companions and event access need a selected-household review. The 13 checks
  above establish digital-book scoping only, not these other paths.
- Configure and test payment, outbound communications and GoodBarber providers
  before enabling their production features. Pricing remains unapproved.

## Next milestone

Complete a recorded signed-in free-family walkthrough and the remaining
selected-household premium-access review. Add fixes only for observed failures
or requirements exposed by those checks. Avoid using unrelated interface
additions as evidence that these launch gates are complete.
