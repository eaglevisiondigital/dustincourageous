# Dustin Courageous Supabase Edge Functions

These functions belong to the standalone Dustin Courageous / Adventure Club Supabase project.

## Architecture

Supabase remains the source of truth for:
- authentication
- households and guardian permissions
- child profiles and progress
- memberships and entitlements
- products, pricing, inventory and orders
- notification queues and preferences
- DC Governance and publishing rules

External providers are adapters only. They do not own Dustin family data or authorization.

## Functions

### notification-delivery-worker-v2
Internal worker invoked by Supabase Cron every minute through a Vault-held worker token.

It:
- atomically claims queued notification deliveries
- respects guardian channel preferences and quiet hours
- sends only through configured providers
- records provider health and integration events
- retries transient failures
- suppresses delivery when providers are not configured rather than falsely marking messages sent

Supported adapter shapes today:
- email: Resend when environment variables are configured
- push: provider-neutral webhook adapter for GoodBarber or another push service

### commerce-checkout
Authenticated guardian checkout handoff.

It:
- receives a server-created checkout session ID
- loads the authoritative order total/items from Supabase
- never accepts browser-supplied prices
- calls the configured hosted checkout adapter
- requires an authenticated HTTPS adapter and returns only an HTTPS hosted checkout URL
- verifies the signed-in guardian created the checkout session before calling that adapter
- returns only the hosted checkout URL
- never collects raw card numbers or CVV

### commerce-payment-webhook-v2
Private provider callback.

It:
- authenticates the payment adapter with a dedicated webhook secret
- records provider event IDs idempotently
- transitions the order to paid once
- captures trusted shipping name/address from the adapter
- decrements inventory exactly once
- triggers existing product-to-book and product-to-entitlement access rules

## Provider adapter contract

The checkout adapter receives:
- checkout_session_id
- order_id / order_number
- authenticated user_id / household_id
- authoritative amount totals
- immutable item snapshots
- success/cancel return URLs

It returns:
- provider_checkout_id
- checkout_url

The payment adapter calls commerce-payment-webhook-v2 with:
- provider
- event_id
- event_type
- order_id
- provider_checkout_id returned during the checkout handoff
- payment_id
- amount_cents and currency matching the server-priced order
- customer_id (optional)
- status = paid
- shipping_name (optional)
- shipping_address object (optional)

No payment provider is selected or activated merely by this code. Provider credentials stay in Supabase Edge Function secrets/environment and never in GitHub or the browser.
The webhook rejects paid events whose provider checkout ID, amount, currency, or checkout state does not match the authoritative Supabase order.
The adapter should retry a 409 response after a short delay, since a very fast provider callback can arrive before checkout handoff has committed. It must send stable event and payment IDs on every retry.

Payment callback recovery:
- A matching, previously processed event returns success without changing the order again, including after fulfillment or refund handling.
- Non-paid callbacks are ignored without consuming the paid-event idempotency key.
- Reused event IDs with different payment details, late payments against expired/canceled checkouts, and failed payment transitions create a `payment_reconciliation_required` integration event. That record excludes shipping/customer details.
- A database lookup or audit-write failure returns 503 so the adapter retries. A 409 requires bounded retries and operations escalation, never a fresh charge.
- Before live activation, the provider adapter must reconcile expiry/cancellation with the actual provider payment state. Local expiry alone does not prove that funds were not captured. This integration remains a launch requirement.


### integration-provider-test
Authenticated operations-only safe connectivity checker.

It never sends a family notification or creates a charge.

Supported safe checks:
- email-primary: read-only provider credential validation where supported
- push-primary: adapter must explicitly return `ok=true` and `test_mode=true`
- commerce-primary: adapter must explicitly return `ok=true` and `test_mode=true`, with no checkout or charge created
- goodbarber-app: confirms that at least one active GoodBarber installation has registered against Supabase

Test results are written to `integration_test_runs` and displayed in Integrations & Delivery.

## Safety rule for adapter tests
A provider-neutral push or commerce adapter must treat `event = dc.integration.test` as a dry run. It must not send a notification, create a hosted checkout, authorize a card, capture funds, or mutate production customer data.
