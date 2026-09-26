# September 26, 2026 implementation inventory

> Historical inventory. The later [security repair](2026-09-26-security-repair.md)
> adds one matching forward migration and one private function: totals are now
> 40 live migrations / 24 files and 213 functions. The 16 missing names and 12
> old timestamp mismatches below are unchanged.

Observed against Supabase `vrixketvinzhsfwwcqiu` and code `80565df`.
No family rows, credentials or secret values are included. Name matching is not a statement-level migration equivalence proof.

## Migration mapping

39 live entries, 23 local name matches, 16 missing files, 12 timestamp mismatches. Never rerun a migration just because its local timestamp differs.

| Live version | Name | Repository filename |
| --- | --- | --- |
| 20260924114237 | foundation_family_membership_security | MISSING |
| 20260924114305 | foundation_foreign_key_indexes | MISSING |
| 20260924114606 | adventure_club_core_engine | MISSING |
| 20260924114628 | challenge_assignment_assigned_by_index | MISSING |
| 20260924114937 | admin_notifications_media_activity | MISSING |
| 20260924115118 | trusted_progression_automation | MISSING |
| 20260924115151 | prevent_completed_progress_reversal | MISSING |
| 20260924120124 | tighten_household_membership_authority | MISSING |
| 20260924120216 | configurable_badge_and_reward_automation | MISSING |
| 20260924120556 | admin_draft_visibility_and_operations_roles | MISSING |
| 20260924120705 | atomic_admin_content_operations_and_audit | MISSING |
| 20260924120733 | harden_reward_redemption_fulfillment | MISSING |
| 20260924121208 | guardian_pin_lock | MISSING |
| 20260924121443 | move_guardian_pin_privilege_to_private_helpers | MISSING |
| 20260924122136 | public_site_leads_and_contact_inquiries | MISSING |
| 20260924123317 | weekly_stars_streak_badges_and_lifetime_badge_levels | MISSING |
| 20260924205627 | guard_book_progress_regression | 20260924205627_guard_book_progress_regression.sql |
| 20260924210810 | enforce_book_companion_access | 20260924212000_enforce_book_companion_access.sql (timestamp differs) |
| 20260924211023 | add_book_launch_checks | 20260924212500_add_book_launch_checks.sql (timestamp differs) |
| 20260924211143 | index_integration_test_provider | 20260924213000_index_integration_test_provider.sql (timestamp differs) |
| 20260924220618 | add_book_release_launch_checks | 20260924215000_add_book_release_launch_checks.sql (timestamp differs) |
| 20260924221321 | define_membership_tiers_and_challenge_access | 20260924222500_define_membership_tiers_and_challenge_access.sql (timestamp differs) |
| 20260924221449 | add_membership_launch_checks | 20260924223000_add_membership_launch_checks.sql (timestamp differs) |
| 20260924230504 | guard_concurrent_guardian_decisions | 20260924230504_guard_concurrent_guardian_decisions.sql |
| 20260924234414 | secure_family_event_registration | 20260924234414_secure_family_event_registration.sql |
| 20260925004449 | family_faith_whole_household_uniqueness | 20260925004449_family_faith_whole_household_uniqueness.sql |
| 20260925011427 | harden_guardian_group_membership | 20260925011427_harden_guardian_group_membership.sql |
| 20260925013210 | enforce_activity_completion_access | 20260925013210_enforce_activity_completion_access.sql |
| 20260925015358 | add_protected_digital_book_reader | 20260925015358_add_protected_digital_book_reader.sql |
| 20260925020034 | protect_digital_book_manifest_text | 20260925020034_protect_digital_book_manifest_text.sql |
| 20260925021110 | add_digital_edition_review_access | 20260925021110_add_digital_edition_review_access.sql |
| 20260925023737 | include_reading_positions_in_privacy | 20260925023737_include_reading_positions_in_privacy.sql |
| 20260925025111 | add_digital_book_launch_readiness | 20260925025111_add_digital_book_launch_readiness.sql |
| 20260925111607 | fix_household_onboarding_returning | 20260925111603_fix_household_onboarding_returning.sql (timestamp differs) |
| 20260925120823 | scope_child_household_premium_access | 20260925120405_scope_child_household_premium_access.sql (timestamp differs) |
| 20260925122342 | scope_event_registration_audience | 20260925122115_scope_event_registration_audience.sql (timestamp differs) |
| 20260925124058 | family_activity_participants | 20260925123327_family_activity_participants.sql (timestamp differs) |
| 20260925131404 | protect_direct_family_faith_credit | 20260925131231_protect_direct_family_faith_credit.sql (timestamp differs) |
| 20260925133014 | validate_payment_checkout_under_lock | 20260925132731_validate_payment_checkout_under_lock.sql (timestamp differs) |

The initial database and multiple later systems cannot be recreated from the checked-in migrations alone. Recover migration history plus current schema, reconcile out-of-history DDL if present, and prove restoration in an isolated database before claiming a complete baseline. Do not alter live history as part of this audit.

## Deployed Edge Functions

| Slug | Version | Gateway JWT verification | Repository evidence |
| --- | --- | --- | --- |
| public-site-form | 1 | false | Source directory missing |
| privacy-export | 1 | true | Source directory missing |
| privacy-export-cleanup | 1 | false | Source directory missing |
| notification-delivery-worker | 1 | false | Source directory missing |
| notification-delivery-worker-v2 | 1 | false | Source exactly matches deployed files |
| commerce-checkout | 3 | true | Source exactly matches deployed files |
| commerce-payment-webhook | 1 | false | Source directory missing |
| commerce-payment-webhook-v2 | 3 | false | Source exactly matches deployed files |
| public-site-form-v2 | 1 | false | Source exactly matches deployed files |
| integration-provider-test | 1 | true | Source directory missing |

JWT=false is not automatically unauthenticated access: the workers/webhooks/cleanup use handler-specific secrets, and public forms are intentionally public. Guards were inspected; endpoints were not invoked.
The four matching source directories contain five TypeScript files (payment webhook includes validation.ts).
Missing sources: privacy-export, privacy-export-cleanup, integration-provider-test, commerce-payment-webhook, notification-delivery-worker, public-site-form.
Legacy functions remain active. Their external usage was not verified; do not delete them based only on their names.

## Database table / policy inventory

112 public tables, all RLS enabled; 298 public policies. Eight private tables have no direct client table grants.
The 212 public/private functions and 25 public security-invoker views were inspected through catalog metadata; full restore DDL is not captured in this inventory.

| Schema | Table | RLS | Policies |
| --- | --- | --- | --- |
| private | digital_book_manifests | false | 0 |
| private | group_join_codes | false | 0 |
| private | guardian_unlock_sessions | false | 0 |
| private | household_guardian_security | false | 0 |
| private | household_invitation_tokens | false | 0 |
| private | organization_invitation_tokens | false | 0 |
| private | system_secret_hashes | false | 0 |
| private | worker_auth_tokens | false | 0 |
| public | achievement_token_ledger | true | 1 |
| public | admin_audit_log | true | 1 |
| public | adventure_challenges | true | 5 |
| public | adventure_content_links | true | 5 |
| public | adventure_groups | true | 3 |
| public | adventures | true | 6 |
| public | app_admins | true | 1 |
| public | app_installations | true | 4 |
| public | automated_notification_log | true | 1 |
| public | badge_awards | true | 1 |
| public | badge_rules | true | 5 |
| public | badges | true | 5 |
| public | book_challenges | true | 2 |
| public | book_content_links | true | 5 |
| public | book_devotional_series | true | 2 |
| public | book_identity_truths | true | 2 |
| public | book_power_verses | true | 2 |
| public | book_prayer_prompts | true | 2 |
| public | book_reward_rules | true | 4 |
| public | books | true | 5 |
| public | challenge_assignments | true | 2 |
| public | challenge_series | true | 5 |
| public | challenge_steps | true | 5 |
| public | challenges | true | 6 |
| public | checkout_sessions | true | 1 |
| public | child_activity_events | true | 1 |
| public | child_adventure_progress | true | 3 |
| public | child_book_progress | true | 3 |
| public | child_book_reading_positions | true | 1 |
| public | child_challenge_progress | true | 3 |
| public | child_content_progress | true | 3 |
| public | child_devotional_progress | true | 3 |
| public | child_group_memberships | true | 2 |
| public | child_identity_progress | true | 3 |
| public | child_prayer_progress | true | 2 |
| public | child_profiles | true | 4 |
| public | child_scripture_progress | true | 3 |
| public | child_series_streaks | true | 1 |
| public | child_series_weekly_completions | true | 1 |
| public | child_step_progress | true | 3 |
| public | child_streaks | true | 1 |
| public | consent_policies | true | 2 |
| public | contact_inquiries | true | 2 |
| public | content_items | true | 6 |
| public | data_privacy_requests | true | 3 |
| public | dc_blueprint_requirements | true | 2 |
| public | dc_brand_assets | true | 2 |
| public | dc_character_profiles | true | 2 |
| public | dc_content_blueprints | true | 2 |
| public | dc_content_reviews | true | 3 |
| public | dc_governance_rules | true | 2 |
| public | dc_governance_standards | true | 2 |
| public | delivery_worker_runs | true | 1 |
| public | devotional_days | true | 5 |
| public | devotional_series | true | 5 |
| public | entitlement_definitions | true | 1 |
| public | event_registrations | true | 1 |
| public | events | true | 3 |
| public | family_faith_guides | true | 4 |
| public | fulfillments | true | 3 |
| public | group_challenge_assignments | true | 3 |
| public | group_leaders | true | 2 |
| public | household_book_access | true | 1 |
| public | household_consents | true | 3 |
| public | household_entitlement_grants | true | 2 |
| public | household_faith_sessions | true | 2 |
| public | household_invitations | true | 1 |
| public | household_members | true | 1 |
| public | household_subscriptions | true | 2 |
| public | households | true | 3 |
| public | identity_truths | true | 5 |
| public | integration_events | true | 1 |
| public | integration_providers | true | 2 |
| public | integration_test_runs | true | 1 |
| public | inventory_reservations | true | 1 |
| public | levels | true | 5 |
| public | marketing_leads | true | 2 |
| public | media_assets | true | 5 |
| public | membership_plans | true | 1 |
| public | notification_campaign_recipients | true | 1 |
| public | notification_campaigns | true | 3 |
| public | notification_deliveries | true | 1 |
| public | notification_preferences | true | 3 |
| public | notification_reminder_rules | true | 3 |
| public | notification_templates | true | 4 |
| public | order_items | true | 1 |
| public | orders | true | 2 |
| public | organization_invitations | true | 1 |
| public | organization_members | true | 2 |
| public | organizations | true | 3 |
| public | payment_webhook_events | true | 1 |
| public | plan_entitlements | true | 1 |
| public | power_verses | true | 5 |
| public | prayer_prompts | true | 5 |
| public | product_book_access_rules | true | 2 |
| public | product_entitlement_rules | true | 2 |
| public | product_variants | true | 4 |
| public | products | true | 4 |
| public | profiles | true | 2 |
| public | promo_codes | true | 2 |
| public | push_devices | true | 4 |
| public | referral_attributions | true | 1 |
| public | referral_codes | true | 1 |
| public | reward_redemptions | true | 4 |
| public | reward_unlocks | true | 1 |
| public | rewards | true | 6 |
| public | scripture_passages | true | 5 |
| public | series_badge_rules | true | 5 |
| public | streak_badge_earnings | true | 1 |
| public | support_tickets | true | 3 |
| public | user_notifications | true | 2 |
| public | xp_ledger | true | 1 |

## Storage, providers and scheduled jobs

Buckets: dc-public is public; dc-members, privacy-exports and dc-digital-books are private.
Prepared digital manifests: zero at audit time.
Provider registry: commerce-primary, email-primary, push-primary, goodbarber-app all not_configured / unknown. This registry does not establish Supabase Auth email deliverability or absence of environment secrets.

| Cron job | Schedule | Active |
| --- | --- | --- |
| dc-checkout-expiry-cleanup | */5 * * * * | true |
| dc-notification-campaign-dispatch | */5 * * * * | true |
| dc-notification-delivery-worker | * * * * * | true |
| dc-notification-reminder-dispatch | */15 * * * * | true |
| dc-privacy-export-cleanup-daily | 17 9 * * * | true |
