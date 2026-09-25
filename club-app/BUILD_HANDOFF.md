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

## Latest completed implementation

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
- 194 automated tests pass. Production build checked with this batch. GitHub CI
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

1. Inspect existing milestones and pick an unfinished family-facing workflow.
2. Complete signed-in preview QA when an authorized test session is available.
3. Prepare the corrected Book 1 edition when source images arrive, then run human
   governance review before publishing. Do not auto-approve creative content.
4. Continue provider readiness without enabling unconfigured checkout.

User authorizes continued development and development-branch pushes. Keep
batches concrete, verify once against the relevant risks, and report what
changed and what remains untested. No live main merge is authorized.
