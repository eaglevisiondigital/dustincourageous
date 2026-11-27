# Global Adventure Club and Family Hub Template — November 27, 2026

## Purpose
One shared React application and one global design system for every existing
and future Dustin Courageous family. The approved Sally screenshots were
visual reference examples only; no Sally account records are copied.

## Deployed source
Repository: `eaglevisiondigital/dustincourageous`
Branch: `build/adventure-club-app`
Build: Netlify root `netlify.toml` builds `club-app` (Vite/React).
Backend: independent Supabase project `vrixketvinzhsfwwcqiu`.

One root `data-template="dc-global-v1"` selects either the approved kid skin
or the shared Family Hub skin. Shared changes to
`club-app/src/global-template.css` and existing global components take effect
for all accounts on that deployed version; no per-household UI clones.
Family Hub overview adopts the approved DC color system/imagery and dynamically
renders actual household name, Parent/Guardian wording, children, progress,
book-companion access and membership entitlements. Its other pages retain
existing functional controls and inherit the same shared wrapper.

## QR/family entry foundation
Prepared `/join?next=books` and `/join?next=activities` on the Club app.
New adults see signup. Auth -> household -> first child -> PIN -> Kid View
continues to an allowlisted section. QR parameters cannot assign a household,
child, role, private content grant or admin route. Real signed-in access is
still checked by the existing RLS and book RPCs.

A printed physical book QR may point to `https://dustincourageous.com`
(the public marketing site), which is distinct from the branch preview.
The actual embedded QR destination and a verified production redirect from
that destination are **not confirmed**. Do not report a complete QR-to-live
production journey until external desktop/mobile tests pass.

## Privacy and acceptance
- No child email is requested; children remain beneath authenticated adults.
- Auth and active household membership remain authoritative; the URL is not.
- `has_book_access` reports household Book Companion entitlement, not
  permission to access unpublished full digital-book pages.
- Progress, XP, awards and approvals remain child-specific.
- Payments, email/push providers, private page publishing and production
  promotion remain disabled/held.
- Verify 2 independent family identities and denial of cross-family reads
  with actual Auth/PostgREST and browser requests.
- Verify QR scan -> signup/signin -> consent/onboarding -> PIN -> book/activity
  on desktop and mobile, including expired/revoked access, before accepting
  a live production claim.

Only the three locked October 15 screenshots, plus individually approved
narrow visual refinements, authorize the visual system. Real rendered Family
Hub requires founder screenshot acceptance.
