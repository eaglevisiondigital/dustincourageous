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
- payment_id
- customer_id (optional)
- status = paid
- shipping_name (optional)
- shipping_address object (optional)

No payment provider is selected or activated merely by this code. Provider credentials stay in Supabase Edge Function secrets/environment and never in GitHub or the browser.
