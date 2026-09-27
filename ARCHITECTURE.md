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

The September 26 security repair makes a failed PIN return NULL so its attempt/cooldown transaction commits. A per-household row lock serializes attempts. Guardian decision RPCs remain invokers using a guarded token helper; the revoke RPC is an explicitly authorized definer restricted to the caller's own sessions. The complete admin gate remains an invoker over guarded private components.

Households own subscriptions, entitlement grants and book access. Child-specific entitlement helpers scope access to the selected child's household. Some catalog/media helpers aggregate the adult's household access; that is an existing boundary requiring further HTTP/acceptance review, not proof that every premium path is isolated.

## Progress and content

Challenge/step, adventure, scripture, devotional, prayer, content and book progress drive trusted database triggers for XP, badges, streaks and rewards.
Family actions accept explicit participants, preserve per-child credit and distinguish participation/pending approval from completion.
Saved digital reading positions do not award XP and are separate from Book Companion completion.
Book Adventure completion remains an invoker/RLS mutation and now calls private.award_completed_book_adventure for privileged credit. That wrapper validates Auth, child management, child-household access, persisted completion and authoritative required steps before selecting configured XP and evaluating badges. Raw award helpers remain unavailable to ordinary clients. See SECURITY_MODEL.md and the security repair report.
Protected digital manifests live in private.digital_book_manifests; catalog metadata contains revision/fingerprint only. Private page storage, current governance approval, release availability and household entitlement govern access.
Admin preparation stages immutable page paths and draft editions. Human approval remains required.

## Commerce and operations

Browser -> user-scoped checkout/order RPC -> commerce-checkout -> configured hosted adapter.
Trusted callback -> commerce-payment-webhook-v2 -> service-only mark_order_paid_from_provider.
The database owns totals, checkout state, entitlements and payment replay protection. No client card/CVV collection.
Provider configuration is absent, so this is a foundation, not accepted live payments.

Notification queues/preferences, campaign/reminder cron jobs and delivery workers are present; provider adapters handle outbound delivery.
Privacy export/cleanup functions are deployed; their exact source was recovered in the September 26 recovery package.
Public forms, admin integration diagnostics and legacy Edge versions also exist.
See the audit inventory for all ten deployed functions and five scheduled jobs.

## Recovery boundary

The separately authorized recovery package now supplies `supabase/recovery/` and
all ten deployed Edge sources. The current-state bootstrap represents 120 tables,
25 views, 214 functions, triggers, indexes, constraints, RLS, ACLs and bucket
definitions. A full catalog comparison verifies the isolated reconstruction.
Historical root migrations remain unchanged: 40 recorded live migrations map to
24 root files, with 12 timestamp differences. Exact SQL for all 40 is archived
separately; 70 current tables and 131 functions have no recorded CREATE in that
history. Do not replay the archive or repair history merely to align counts.

The isolated CLI project in `supabase/recovery/local` uses a fixed local container,
no hosted project credentials, synthetic reference data, and five inactive cron
definitions. It preserves the security repair and explicitly inventories legacy
grants. Families, Auth accounts/configuration, approved content, actual Storage
files and secret values require separate verified backups and a reviewed recovery
plan. See [the runbook](docs/recovery/RECOVERY_RUNBOOK.md),
[migration map](docs/recovery/MIGRATION_HISTORY_MAP.md) and
[Edge audit](docs/recovery/EDGE_FUNCTION_AUDIT.md).

## September 26 authorization hardening

The current recovery baseline now reflects deployed migration `20260927013941`:
positive client CRUD/EXECUTE allowlists, no dangerous client table rights, read-only
client views, no client identity-sequence grants, and explicit postgres defaults.
Content inspection and paid-status helpers use caller RLS. Existing invoker RPCs,
guarded owner helpers, Storage policies and ten Edge sources retain their design.
The dependency matrix covers browser/admin/worker calls, RLS, invoker triggers,
embedded PostgREST reads and column-only row-lock requirements.

The original 40-record archive stays frozen; the new exact forward record is
separate. Live/root counts are 41/25 with the old 12 timestamp mismatches unchanged.
Recovery supports and verifies explicit global function defaults. CI now issues
local Auth sessions and tests PostgREST as well as database roles. Local signup
autoconfirmation is fixture configuration only, never hosted Auth policy.

Remaining boundaries are explicit: platform-owned defaults need supported action,
leaked-password protection needs dashboard/Management API access, and the unchanged
checkout RPC has a pre-existing ambiguous order_number failure. Work-led signed-in
acceptance is next after Chat review; this is not a provider or launch package.

## Approved checkout creation boundary

The new creation repair keeps `public.create_checkout_order` as the browser-facing
invoker API and moves the existing server-priced transaction into
`private.create_checkout_order_impl`. That postgres-owned, empty-search-path
operation explicitly requires Auth UID and active household guardian management.
It reads only the caller's Auth email and writes a draft order, server-selected
lines, a created session and expiring reservations. No table grants or RLS policies
are widened. Product/variant FOR UPDATE locks serialize inventory reservations;
existing promo locking and pricing formulas remain.

The application still blocks checkout when no provider is configured. Independent
repeated RPC calls produce distinct drafts; the UI guards concurrent clicks and
uncertain retries. This package does not add server idempotency keys. The separate
`begin_checkout_provider_handoff` invoker/write-policy defect is verified and
remains a prerequisite to provider activation. See the
[creation repair report](docs/audits/2026-09-26-checkout-repair.md).

## Approved provider-handoff continuation

The separate handoff package now uses three bounded operations: guardian claim,
service-only receipt recording, guardian finalization. One private RLS-enabled
attempt per checkout commits before the Edge adapter POST. Existing public states
stay created/draft until the verified receipt atomically transitions them to
provider_pending/pending_payment. Matching retries reuse the recorded result;
uncertain results retain their durable claim and require reconciliation.

Lock order is checkout -> order -> attempt, compatible with existing callback and
expiry paths. The service receipt writer locks only the attempt. Public guardian
wrappers stay invokers; private definers independently check identity, guardian
membership, ownership, relationship, state and wall-clock expiry. Service-only
receipt attestation prevents guardians from inventing provider references.
No new generic client UPDATE or paid/entitlement capability is introduced.
See [the focused handoff report](docs/audits/2026-09-26-provider-handoff-repair.md)
for current verification/deployment status and reconciliation steps.

Hosted leaked-password protection is enabled per September 26, 2026 Work
verification supplied by PRIMARY CHAT. Earlier Auth access limitations above are
historical; Codex does not change Auth settings in this package. The separate
platform-owner default-ACL support question remains pending and nonblocking.
