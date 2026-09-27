# Established decisions

Recorded September 26, 2026 from the user's supplied handoff, existing repository handoff/milestone documents and verified implementation. This records prior decisions; it does not invent approvals.

| Decision | Authority / evidence |
| --- | --- |
| Chat owns strategy/approval; Codex engineering; Work external research/live validation | User operating instructions and September 26 audit assignment |
| Keep development on build/adventure-club-app; no unapproved main merge | User handoff and club-app/BUILD_HANDOFF.md |
| Dustin must be independently sellable and operable | User handoff; dedicated Supabase project |
| Guardian -> household -> child; minimize child data and prevent cross-family exposure | User handoff; deployed RLS/helper model |
| DC Bible v2026.1 controls creative work; Production Manual v2026.1 technical production | User handoff; database governance registry |
| Preserve approved character/artwork/shield, biblical/Word-of-Faith direction; prayers begin Dear God | User handoff and existing locked decisions |
| Human governance approval is required; proof/source files are not automatically approved release assets | Existing BUILD_HANDOFF and DIGITAL_BOOK_READER |
| Free book companions do not grant full digital books; bookmarks do not award completion XP | Existing docs and deployed reader/progress implementation |
| Do not invent paid plan names/prices or activate providers without approved configuration | Existing BUILD_HANDOFF and milestones |
| Supabase owns authorization and progress, including future GoodBarber integration | Existing function architecture and handoff |
| September 26 is a baseline audit, not permission for the next major package | Current user assignment |

## September 26 approved security repair

The user subsequently authorized the focused PIN/RPC repair package. Its persistent failure contract is NULL/no token, not an exception that rolls back the PIN counter. Public decision/Book/admin RPCs retain invoker/RLS behavior; only guarded private helpers receive the necessary EXECUTE permissions. Book awards use a narrow trusted completion wrapper, and the existing revoke RPC uses explicit user/household checks inside a definer boundary. These are security implementation decisions within that approved package, not new product rules.

Evidence: [security repair report](docs/audits/2026-09-26-security-repair.md).

## September 26 authorized recovery package

The user subsequently authorized database/Edge source recovery, migration-history
forensics, an isolated restoration test and SQL CI. The original 40 live records
and 24 root migration files remain unchanged. Exact historical SQL is archived
outside the executable migration path; a separate current-state catalog/bootstrap
recovers definitions missing from history without pretending to recreate original
change records. All ten Edge sources are preserved exactly, including legacy
versions; nothing is deployed or retired in this package.

Recovery fidelity includes explicit legacy ACL inventory, not a new product
permission policy. The isolated runner alone restores that evidence; provider
jobs remain inactive and no live secret/data values are copied. Native PostgreSQL
tests and full local Supabase CI are distinguished from live Auth/Storage/provider
acceptance. These choices implement the authorized recovery scope, not launch
approval or permission for the next major package.

See [the recovery runbook](docs/recovery/RECOVERY_RUNBOOK.md) and
[migration mapping](docs/recovery/MIGRATION_HISTORY_MAP.md).

## Unresolved decisions and inputs

- Exact approved paid membership pricing/provider and launch scope.
- Authoritative full Founder’s Edition v2026.1 Bible and Master Production Manual files: not found in repository or accessible attachment filename search. Database registry descriptions are not full copies.
- Corrected original Book 1 art, accessible text, reading order and human release approval.
- Authorized signed-in/device acceptance arrangements.
- Chat review of the completed ACL implementation, outstanding platform/Auth actions, verified checkout blocker, and Work-led acceptance scope.

Technical defects and missing source/history are tracked in SECURITY_MODEL.md and the baseline report, not treated as new product decisions.

## September 26 approved dependency-aware hardening

The user authorized a bounded least-privilege/Auth package after recovery: map
actual dependencies first, remove excessive current/default client permissions,
preserve repaired boundaries and isolated recovery, and enable leaked-password
protection without unrelated Auth/provider changes. Migration `20260927013941`
implements the available database scope. The matrix is explicit about caller
versus owner execution and narrow column permissions. Three inspection helpers
use invoker RLS; no new privileged mutation boundary was introduced.

Two actions are not silently marked complete: internal supabase_admin defaults
need supported platform help; leaked-password protection needs an authorized
configuration connection or dashboard session. Exact handoffs are in docs/security.
The existing checkout SQL error was reproduced before/after ACL changes; its repair
requires Chat-scoped follow-up. No broad Edge/provider redesign or legacy endpoint
retirement was included. The user directs Work-led signed-in/browser/device
acceptance next, after Chat reviews this report.

## September 26 approved targeted checkout repair

The user authorized repair of the existing create_checkout_order ambiguity and
its identity/write boundary, preserving pricing rules, prior security work and
recovery. A public invoker plus one explicitly guarded private checkout operation
implements that authorization. The public API and every pre-existing ACL/policy
remain unchanged. A reproduced same-function inventory race requires exclusive
product/variant row locks; SQL NULL carts obey the existing nonempty-cart rule.

This is neither provider selection/activation nor payment acceptance. The separate
provider-handoff authorization defect is returned to Chat for a subsequent scoped
package. Existing separate-draft repeated-request semantics and payment-counted
promo redemptions are retained, not new product decisions. See the
[checkout report](docs/audits/2026-09-26-checkout-repair.md).

## September 26 approved bounded provider-handoff repair

PRIMARY CHAT authorized correcting the handoff permission boundary and the unsafe
adapter-before-persistence sequence, including only the minimal claim/retry state
needed for a recoverable external handoff. The implementation keeps public order
and checkout states and the existing finalization signature. A private one-attempt
record, guardian claim/finalization and service-only receipt attestation provide
that boundary without generic client updates.

After uncertainty, the same checkout must not automatically dispatch the adapter
again. Operators reconcile using the durable attempt/checkout correlation key;
a recorded successful receipt supports local finalization retry. No automatic
refund, cancellation, provider selection or global payment semantics are invented.
Provider contract/sandbox acceptance and live activation remain separate approvals.

PRIMARY CHAT also supplies external September 26 Work verification that leaked-
password protection is enabled and its warning cleared. Supabase Support's default-
ACL question remains pending and does not block Work's acceptance pass. These facts
supersede the earlier unresolved Auth configuration notes, not historical evidence.
