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

Evidence: [security repair report](docs/audits/2026-09-26-security-repair.md). The next recovery package still requires Chat approval.

## Unresolved decisions and inputs

- Exact approved paid membership pricing/provider and launch scope.
- Authoritative full Founder’s Edition v2026.1 Bible and Master Production Manual files: not found in repository or accessible attachment filename search. Database registry descriptions are not full copies.
- Corrected original Book 1 art, accessible text, reading order and human release approval.
- Authorized signed-in/device acceptance arrangements.
- Chat approval of the separate database/deployment recovery and reproducibility package.

Technical defects and missing source/history are tracked in SECURITY_MODEL.md and the baseline report, not treated as new product decisions.
