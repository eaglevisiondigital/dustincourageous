# Existing architecture

Verified September 26, 2026 against application commit 80565df and Supabase vrixketvinzhsfwwcqiu. This records existing implementation, not a redesign.

## Applications and deployment

The root HTML/assets and dustin-courageous-netlify directory contain the existing public website.
The development branch adds club-app: React 19.3, TypeScript 7.0.2, Vite 8.3, Supabase JS 2.117.1, with pinned dependencies and a lockfile.
Root netlify.toml on development selects club-app as its base, builds with Node 24 and publishes dist with SPA fallback. Do not deploy this branch's root configuration over the public site without approval.
The main branch remains the static site. club.dustincourageous.com is a documented proposed production address, not a verified deployed endpoint. Current commerce CORS code does not list that proposed hostname, so confirm origin/redirect configuration before any future production cutover.

## Trust and data flow

Adult Supabase Auth identity -> profile -> active household membership -> child profiles.
The browser uses a publishable key and user session; database grants, RLS and authorized RPCs enforce access.
User-editable family_relationship is a display label, not a role. Admin authorization comes from active app_admins records, with narrower content/operations roles.
Child sessions are guardian-owned participation views, not separate child authentication identities.
Guardian unlock tokens are stored in sessionStorage; hashes, expiry and revocation are server-side. Ordinary family ownership and explicit PIN-required decisions are distinct controls.

Households own subscriptions, entitlement grants and book access. Child-specific entitlement helpers scope access to the selected child's household. Some catalog/media helpers aggregate the adult's household access; that is an existing boundary requiring further HTTP/acceptance review, not proof that every premium path is isolated.

## Progress and content

Challenge/step, adventure, scripture, devotional, prayer, content and book progress drive trusted database triggers for XP, badges, streaks and rewards.
Family actions accept explicit participants, preserve per-child credit and distinguish participation/pending approval from completion.
Saved digital reading positions do not award XP and are separate from Book Companion completion.
Protected digital manifests live in private.digital_book_manifests; catalog metadata contains revision/fingerprint only. Private page storage, current governance approval, release availability and household entitlement govern access.
Admin preparation stages immutable page paths and draft editions. Human approval remains required.

## Commerce and operations

Browser -> user-scoped checkout/order RPC -> commerce-checkout -> configured hosted adapter.
Trusted callback -> commerce-payment-webhook-v2 -> service-only mark_order_paid_from_provider.
The database owns totals, checkout state, entitlements and payment replay protection. No client card/CVV collection.
Provider configuration is absent, so this is a foundation, not accepted live payments.

Notification queues/preferences, campaign/reminder cron jobs and delivery workers are present; provider adapters handle outbound delivery.
Privacy export/cleanup functions are deployed; their source is missing from the checkout.
Public forms, admin integration diagnostics and legacy Edge versions also exist.
See the audit inventory for all ten deployed functions and five scheduled jobs.

## Recovery boundary

The repository does not yet contain a complete schema/bootstrap or every deployed Edge source.
Migration names/timestamps differ from live history. No supabase/config.toml was found.
Do not infer that a fresh database can be reconstructed from current files.
