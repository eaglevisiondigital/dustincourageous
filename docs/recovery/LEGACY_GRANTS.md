# Legacy grant inventory — 2026-09-26

The isolated bootstrap preserves the captured **effective** object and column privileges. Full catalog comparison fails on additions/removals/changed grant options. No live grants changed. Historical default ACLs are explicit, not inherited accidentally from whichever Supabase CLI version happens to run. This is forensic fidelity, **not launch approval** for broad client privileges.

## Material concerns requiring a separate Chat-approved hardening package

- Both client roles have TRUNCATE, REFERENCES, TRIGGER and MAINTAIN on 111 public tables. RLS governs row access; it does not make these privileges safe. The normal REST API does not offer arbitrary SQL, but these ACLs still exceed client needs. Do not treat a green recovery gate as approval to expose direct database access.
- Both client roles have broad write/administrative ACLs on all 25 views, even though many operations are not supported by the view itself. All 25 views retain security_invoker=true.
- Six public-schema default ACL records (tables/sequences/functions for postgres and supabase_admin) broadly grant anon/authenticated/service_role. Future objects can inherit unwanted exposure; this deserves explicit change and regression coverage.
- Seven private functions retain implicit PUBLIC execution. Anonymous callers lack private-schema USAGE; authenticated callers have USAGE. The three admin-gate helpers retain internal admin checks; three are trigger functions; the challenge-access helper checks authorization. Review these individually rather than broadly granting/revoking helper execution.
- The raw XP/badge helpers remain owner-only. Eight private tables remain inaccessible directly to anon/authenticated. Repaired guardian and completion wrappers retain their narrow guarded grants.

## Per-object client ACLs

Codes: r SELECT, a INSERT, w UPDATE, d DELETE, D TRUNCATE, x REFERENCES, t TRIGGER, m MAINTAIN; X EXECUTE; U USAGE. Column-specific grants are listed separately. ACL order/issuer differences that do not change effective permissions are normalized by the verifier.

| Object | Kind | anon | authenticated |
| --- | --- | --- | --- |
| `private.digital_book_manifests` | r | `—` | `—` |
| `private.group_join_codes` | r | `—` | `—` |
| `private.guardian_unlock_sessions` | r | `—` | `—` |
| `private.household_guardian_security` | r | `—` | `—` |
| `private.household_invitation_tokens` | r | `—` | `—` |
| `private.organization_invitation_tokens` | r | `—` | `—` |
| `private.system_secret_hashes` | r | `—` | `—` |
| `private.worker_auth_tokens` | r | `—` | `—` |
| `public.achievement_token_ledger` | r | `arwdDxtm` | `arwdDxtm` |
| `public.admin_audit_log` | r | `arwdDxtm` | `arwdDxtm` |
| `public.admin_daily_metrics` | v | `arwdDxtm` | `awdDxtm` |
| `public.admin_platform_snapshot` | v | `arwdDxtm` | `awdDxtm` |
| `public.adventure_challenges` | r | `arwdDxtm` | `arwdDxtm` |
| `public.adventure_content_links` | r | `arwdDxtm` | `arwdDxtm` |
| `public.adventure_groups` | r | `arwdDxtm` | `arwdDxtm` |
| `public.adventures` | r | `arwdDxtm` | `arwdDxtm` |
| `public.app_admins` | r | `arwdDxtm` | `arwdDxtm` |
| `public.app_channel_health` | v | `arwdDxtm` | `arwdDxtm` |
| `public.app_installation_summary` | v | `arwdDxtm` | `arwdDxtm` |
| `public.app_installations` | r | `arwdDxtm` | `arwdDxtm` |
| `public.automated_notification_log` | r | `arwdDxtm` | `arwdDxtm` |
| `public.badge_awards` | r | `arwdDxtm` | `arwdDxtm` |
| `public.badge_rules` | r | `arwdDxtm` | `arwdDxtm` |
| `public.badges` | r | `arwdDxtm` | `arwdDxtm` |
| `public.book_challenges` | r | `arwdDxtm` | `arwdDxtm` |
| `public.book_content_links` | r | `arwdDxtm` | `arwdDxtm` |
| `public.book_devotional_series` | r | `arwdDxtm` | `arwdDxtm` |
| `public.book_identity_truths` | r | `arwdDxtm` | `arwdDxtm` |
| `public.book_power_verses` | r | `arwdDxtm` | `arwdDxtm` |
| `public.book_prayer_prompts` | r | `arwdDxtm` | `arwdDxtm` |
| `public.book_reward_rules` | r | `arwdDxtm` | `arwdDxtm` |
| `public.books` | r | `arwdDxtm` | `arwdDxtm` |
| `public.challenge_assignments` | r | `arwdDxtm` | `arwdDxtm` |
| `public.challenge_series` | r | `arwdDxtm` | `arwdDxtm` |
| `public.challenge_steps` | r | `arwdDxtm` | `arwdDxtm` |
| `public.challenges` | r | `arwdDxtm` | `arwdDxtm` |
| `public.checkout_session_summary` | v | `arwdDxtm` | `arwdDxtm` |
| `public.checkout_sessions` | r | `arwdDxtm` | `arwdDxtm` |
| `public.child_active_streak_badges` | v | `arwdDxtm` | `arwdDxtm` |
| `public.child_activity_events` | r | `arwdDxtm` | `arwdDxtm` |
| `public.child_adventure_progress` | r | `arwdDxtm` | `arwdDxtm` |
| `public.child_book_progress` | r | `arwdDxtm` | `arwdDxtm` |
| `public.child_book_reading_positions` | r | `—` | `r` |
| `public.child_challenge_progress` | r | `arwdDxtm` | `arwdDxtm` |
| `public.child_content_progress` | r | `arwdDxtm` | `arwdDxtm` |
| `public.child_data_inventory` | v | `arwdDxtm` | `arwdDxtm` |
| `public.child_devotional_progress` | r | `arwdDxtm` | `arwdDxtm` |
| `public.child_group_memberships` | r | `rdDxtm` | `rdDxtm` |
| `public.child_identity_progress` | r | `arwdDxtm` | `arwdDxtm` |
| `public.child_level_progress` | v | `arwdDxtm` | `arwdDxtm` |
| `public.child_prayer_progress` | r | `arwdDxtm` | `arwdDxtm` |
| `public.child_profiles` | r | `arwdDxtm` | `arwdDxtm` |
| `public.child_scripture_progress` | r | `arwdDxtm` | `arwdDxtm` |
| `public.child_series_streak_status` | v | `arwdDxtm` | `arwdDxtm` |
| `public.child_series_streaks` | r | `arwdDxtm` | `arwdDxtm` |
| `public.child_series_weekly_completions` | r | `arwdDxtm` | `arwdDxtm` |
| `public.child_step_progress` | r | `arwdDxtm` | `arwdDxtm` |
| `public.child_streaks` | r | `arwdDxtm` | `arwdDxtm` |
| `public.child_token_totals` | v | `arwdDxtm` | `arwdDxtm` |
| `public.child_xp_totals` | v | `arwdDxtm` | `arwdDxtm` |
| `public.commerce_readiness_summary` | v | `arwdDxtm` | `arwdDxtm` |
| `public.commerce_recent_webhooks` | v | `arwdDxtm` | `arwdDxtm` |
| `public.consent_policies` | r | `arwdDxtm` | `arwdDxtm` |
| `public.contact_inquiries` | r | `arwdDxtm` | `arwdDxtm` |
| `public.content_items` | r | `arwdDxtm` | `arwdDxtm` |
| `public.current_household_consents` | v | `arwdDxtm` | `arwdDxtm` |
| `public.data_privacy_requests` | r | `arwdDxtm` | `arwdDxtm` |
| `public.dc_blueprint_requirements` | r | `arwdDxtm` | `arwdDxtm` |
| `public.dc_brand_assets` | r | `arwdDxtm` | `arwdDxtm` |
| `public.dc_character_profiles` | r | `arwdDxtm` | `arwdDxtm` |
| `public.dc_content_blueprints` | r | `arwdDxtm` | `arwdDxtm` |
| `public.dc_content_reviews` | r | `arwdDxtm` | `arwdDxtm` |
| `public.dc_governance_entity_catalog` | v | `arwdDxtm` | `arwdDxtm` |
| `public.dc_governance_review_status` | v | `arwdDxtm` | `arwdDxtm` |
| `public.dc_governance_rules` | r | `arwdDxtm` | `arwdDxtm` |
| `public.dc_governance_standards` | r | `arwdDxtm` | `arwdDxtm` |
| `public.delivery_worker_health` | v | `arwdDxtm` | `arwdDxtm` |
| `public.delivery_worker_runs` | r | `arwdDxtm` | `arwdDxtm` |
| `public.devotional_days` | r | `arwdDxtm` | `arwdDxtm` |
| `public.devotional_series` | r | `arwdDxtm` | `arwdDxtm` |
| `public.entitlement_definitions` | r | `arwdDxtm` | `arwdDxtm` |
| `public.event_registrations` | r | `arwdDxtm` | `arwdDxtm` |
| `public.events` | r | `arwdDxtm` | `arwdDxtm` |
| `public.family_faith_guides` | r | `arwdDxtm` | `arwdDxtm` |
| `public.fulfillments` | r | `arwdDxtm` | `arwdDxtm` |
| `public.group_challenge_assignments` | r | `arwdDxtm` | `arwdDxtm` |
| `public.group_leaders` | r | `arwdDxtm` | `arwdDxtm` |
| `public.household_book_access` | r | `arwdDxtm` | `arwdDxtm` |
| `public.household_consents` | r | `arwdDxtm` | `arwdDxtm` |
| `public.household_entitlement_grants` | r | `arwdDxtm` | `arwdDxtm` |
| `public.household_faith_sessions` | r | `arwdDxtm` | `arwdDxtm` |
| `public.household_invitations` | r | `arwdDxtm` | `arwdDxtm` |
| `public.household_members` | r | `arwdDxtm` | `rwdDxtm` |
| `public.household_membership_summary` | v | `arwdDxtm` | `arwdDxtm` |
| `public.household_subscriptions` | r | `arwdDxtm` | `arwdDxtm` |
| `public.households` | r | `arwdDxtm` | `arwdDxtm` |
| `public.identity_truths` | r | `arwdDxtm` | `arwdDxtm` |
| `public.integration_events` | r | `arwdDxtm` | `arwdDxtm` |
| `public.integration_health_summary` | v | `arwdDxtm` | `arwdDxtm` |
| `public.integration_latest_tests` | v | `arwdDxtm` | `arwdDxtm` |
| `public.integration_providers` | r | `arwdDxtm` | `arwdDxtm` |
| `public.integration_test_runs` | r | `arwdDxtm` | `arwdDxtm` |
| `public.inventory_reservations` | r | `arwdDxtm` | `arwdDxtm` |
| `public.levels` | r | `arwdDxtm` | `arwdDxtm` |
| `public.marketing_conversion_summary` | v | `arwdDxtm` | `arwdDxtm` |
| `public.marketing_lead_summary` | v | `arwdDxtm` | `arwdDxtm` |
| `public.marketing_leads` | r | `arwdDxtm` | `arwdDxtm` |
| `public.media_assets` | r | `arwdDxtm` | `arwdDxtm` |
| `public.membership_plans` | r | `arwdDxtm` | `arwdDxtm` |
| `public.notification_campaign_recipients` | r | `arwdDxtm` | `arwdDxtm` |
| `public.notification_campaigns` | r | `arwdDxtm` | `arwdDxtm` |
| `public.notification_deliveries` | r | `arwdDxtm` | `arwdDxtm` |
| `public.notification_delivery_health` | v | `arwdDxtm` | `arwdDxtm` |
| `public.notification_preferences` | r | `arwdDxtm` | `arwdDxtm` |
| `public.notification_reminder_rules` | r | `arwdDxtm` | `arwdDxtm` |
| `public.notification_templates` | r | `arwdDxtm` | `arwdDxtm` |
| `public.order_items` | r | `arwdDxtm` | `arwdDxtm` |
| `public.orders` | r | `arwdDxtm` | `arwdDxtm` |
| `public.organization_invitations` | r | `arwdDxtm` | `arwdDxtm` |
| `public.organization_members` | r | `arwdDxtm` | `arwdDxtm` |
| `public.organizations` | r | `arwdDxtm` | `arwdDxtm` |
| `public.parent_child_progress_summary` | v | `arwdDxtm` | `arwdDxtm` |
| `public.payment_webhook_events` | r | `arwdDxtm` | `arwdDxtm` |
| `public.plan_entitlements` | r | `arwdDxtm` | `arwdDxtm` |
| `public.power_verses` | r | `arwdDxtm` | `arwdDxtm` |
| `public.prayer_prompts` | r | `arwdDxtm` | `arwdDxtm` |
| `public.product_book_access_rules` | r | `arwdDxtm` | `arwdDxtm` |
| `public.product_entitlement_rules` | r | `arwdDxtm` | `arwdDxtm` |
| `public.product_variants` | r | `arwdDxtm` | `arwdDxtm` |
| `public.products` | r | `arwdDxtm` | `arwdDxtm` |
| `public.profiles` | r | `arwdDxtm` | `arwdDxtm` |
| `public.promo_codes` | r | `arwdDxtm` | `arwdDxtm` |
| `public.public_site_pipeline_summary` | v | `arwdDxtm` | `arwdDxtm` |
| `public.push_devices` | r | `arwdDxtm` | `arwdDxtm` |
| `public.referral_attributions` | r | `arwdDxtm` | `arwdDxtm` |
| `public.referral_codes` | r | `arwdDxtm` | `arwdDxtm` |
| `public.reward_redemptions` | r | `arwdDxtm` | `arwdDxtm` |
| `public.reward_unlocks` | r | `arwdDxtm` | `arwdDxtm` |
| `public.rewards` | r | `arwdDxtm` | `arwdDxtm` |
| `public.scripture_passages` | r | `arwdDxtm` | `arwdDxtm` |
| `public.series_badge_rules` | r | `arwdDxtm` | `arwdDxtm` |
| `public.streak_badge_earnings` | r | `arwdDxtm` | `arwdDxtm` |
| `public.support_tickets` | r | `arwdDxtm` | `arwdDxtm` |
| `public.user_notifications` | r | `arwdDxtm` | `arwdDxtm` |
| `public.xp_ledger` | r | `arwdDxtm` | `arwdDxtm` |

Column ACL `public.child_group_memberships.status`: `{authenticated=w/postgres}`.

Column ACL `public.child_group_memberships.ended_at`: `{authenticated=w/postgres}`.

## Explicit helper and default ACL evidence

| Function | ACL (`NULL` means PostgreSQL owner + PUBLIC defaults) |
| --- | --- |
| `private.accept_household_invitation_impl(p_invitation_id uuid, p_token text)` | `{postgres=X/postgres,authenticated=X/postgres}` |
| `private.accept_organization_invitation_impl(p_invitation_id uuid, p_token text)` | `{postgres=X/postgres,authenticated=X/postgres}` |
| `private.admin_daily_metrics_impl(p_days integer)` | `{postgres=X/postgres,authenticated=X/postgres}` |
| `private.admin_get_book_launch_gate_impl()` | `NULL` |
| `private.admin_get_book_release_gate_impl()` | `NULL` |
| `private.admin_get_digital_book_impl(p_book_id uuid)` | `{postgres=X/postgres,authenticated=X/postgres}` |
| `private.admin_get_digital_book_launch_gate_impl()` | `{postgres=X/postgres,authenticated=X/postgres}` |
| `private.admin_get_membership_tier_gate_impl()` | `NULL` |
| `private.admin_get_production_launch_gate_impl()` | `{postgres=X/postgres,authenticated=X/postgres}` |
| `private.admin_platform_snapshot_impl()` | `{postgres=X/postgres,authenticated=X/postgres}` |
| `private.admin_prepare_digital_book_impl(p_book_id uuid, p_manifest jsonb)` | `{postgres=X/postgres,authenticated=X/postgres}` |
| `private.after_token_insert_evaluate_badges()` | `{postgres=X/postgres}` |
| `private.after_xp_insert_evaluate_badges()` | `{postgres=X/postgres}` |
| `private.attribute_referral_impl(p_code text, p_referred_household_id uuid, p_source text)` | `{postgres=X/postgres,authenticated=X/postgres}` |
| `private.audit_admin_mutation()` | `{postgres=X/postgres}` |
| `private.award_completed_book_adventure(p_child_profile_id uuid, p_book_id uuid)` | `{postgres=X/postgres,authenticated=X/postgres}` |
| `private.award_xp_event(p_child_profile_id uuid, p_points integer, p_event_type text, p_source_type text, p_source_id uuid, p_description text)` | `{postgres=X/postgres}` |
| `private.can_approve_dc_governance()` | `{postgres=X/postgres,authenticated=X/postgres}` |
| `private.can_lead_group(p_group_id uuid)` | `{postgres=X/postgres,authenticated=X/postgres}` |
| `private.can_manage_challenge_progress(p_progress_id uuid)` | `{postgres=X/postgres,authenticated=X/postgres}` |
| `private.can_manage_child(p_child_profile_id uuid)` | `{postgres=X/postgres,authenticated=X/postgres}` |
| `private.can_manage_event(p_event_id uuid)` | `{postgres=X/postgres,authenticated=X/postgres}` |
| `private.can_manage_household(p_household_id uuid)` | `{postgres=X/postgres,authenticated=X/postgres}` |
| `private.can_manage_org(p_organization_id uuid)` | `{postgres=X/postgres,authenticated=X/postgres}` |
| `private.can_manage_privacy_requests()` | `{postgres=X/postgres,authenticated=X/postgres}` |
| `private.can_record_child_activity(p_child_id uuid, p_content_id uuid)` | `{postgres=X/postgres,authenticated=X/postgres}` |
| `private.can_schedule_notifications()` | `{postgres=X/postgres,authenticated=X/postgres}` |
| `private.can_view_child(p_child_profile_id uuid)` | `{postgres=X/postgres,authenticated=X/postgres}` |
| `private.can_view_event(p_event_id uuid)` | `{postgres=X/postgres,authenticated=X/postgres}` |
| `private.cancel_event_registration_impl(p_registration_id uuid)` | `{postgres=X/postgres,authenticated=X/postgres}` |
| `private.child_can_access_adventure(p_child_profile_id uuid, p_adventure_id uuid)` | `{postgres=X/postgres,authenticated=X/postgres}` |
| `private.child_can_access_challenge(p_child_profile_id uuid, p_challenge_id uuid)` | `{postgres=X/postgres,authenticated=X/postgres}` |
| `private.child_has_book_companion_access(p_child_profile_id uuid, p_book_id uuid)` | `{postgres=X/postgres,authenticated=X/postgres}` |
| `private.child_has_digital_book_access(p_child_profile_id uuid, p_book_id uuid)` | `{postgres=X/postgres,authenticated=X/postgres}` |
| `private.claim_marketing_leads_for_household_impl(p_household_id uuid)` | `{postgres=X/postgres,authenticated=X/postgres}` |
| `private.create_group_join_code_impl(p_group_id uuid, p_expires_in_days integer, p_max_uses integer)` | `{postgres=X/postgres,authenticated=X/postgres}` |
| `private.create_guardian_unlock_session_impl(p_household_id uuid, p_pin text)` | `{postgres=X/postgres,authenticated=X/postgres}` |
| `private.create_household_invitation_impl(p_household_id uuid, p_email text, p_role text, p_expires_days integer)` | `{postgres=X/postgres,authenticated=X/postgres}` |
| `private.create_organization_invitation_impl(p_organization_id uuid, p_email text, p_organization_role text, p_group_id uuid, p_group_role text, p_expires_in_days integer)` | `{postgres=X/postgres,authenticated=X/postgres}` |
| `private.dc_entity_fingerprint(p_entity_type text, p_entity_id uuid)` | `{postgres=X/postgres,authenticated=X/postgres}` |
| `private.dc_entity_payload(p_entity_type text, p_entity_id uuid)` | `{postgres=X/postgres,authenticated=X/postgres}` |
| `private.dc_row_fingerprint(p_payload jsonb)` | `{postgres=X/postgres,authenticated=X/postgres}` |
| `private.demote_changed_dc_content()` | `{postgres=X/postgres}` |
| `private.demote_changed_dc_product()` | `{postgres=X/postgres}` |
| `private.demote_changed_notification_template()` | `{postgres=X/postgres}` |
| `private.digital_book_manifest_valid(p_book_id uuid, p_manifest jsonb)` | `{postgres=X/postgres}` |
| `private.digital_book_object_readable(p_path text)` | `{postgres=X/postgres,authenticated=X/postgres}` |
| `private.digital_book_released(p_book_id uuid)` | `{postgres=X/postgres,authenticated=X/postgres}` |
| `private.dispatch_automated_notification_reminders()` | `{postgres=X/postgres}` |
| `private.dispatch_due_notification_campaigns()` | `{postgres=X/postgres}` |
| `private.enforce_child_adventure_access()` | `{postgres=X/postgres}` |
| `private.enforce_child_book_access()` | `NULL` |
| `private.enforce_child_challenge_access()` | `NULL` |
| `private.enforce_dc_prayer_opening()` | `{postgres=X/postgres}` |
| `private.enforce_dc_publish_gate()` | `{postgres=X/postgres}` |
| `private.evaluate_badges_after_progress()` | `{postgres=X/postgres}` |
| `private.evaluate_child_badges(p_child_profile_id uuid)` | `{postgres=X/postgres}` |
| `private.event_audience_allows_registration(p_event_id uuid, p_household_id uuid, p_child_profile_id uuid)` | `{postgres=X/postgres,authenticated=X/postgres}` |
| `private.expire_checkout_sessions()` | `{postgres=X/postgres}` |
| `private.get_digital_book_impl(p_child_profile_id uuid, p_book_id uuid)` | `{postgres=X/postgres,authenticated=X/postgres}` |
| `private.get_group_progress_summary_impl(p_group_id uuid, p_challenge_id uuid)` | `{postgres=X/postgres,authenticated=X/postgres}` |
| `private.get_group_roster_impl(p_group_id uuid)` | `{postgres=X/postgres,authenticated=X/postgres}` |
| `private.get_household_adults_impl(p_household_id uuid)` | `{postgres=X/postgres,authenticated=X/postgres}` |
| `private.get_or_create_referral_code_impl(p_household_id uuid)` | `{postgres=X/postgres,authenticated=X/postgres}` |
| `private.guardian_pin_status_impl(p_household_id uuid)` | `{postgres=X/postgres,authenticated=X/postgres}` |
| `private.guardian_unlock_session_valid(p_household_id uuid, p_token text)` | `{postgres=X/postgres,authenticated=X/postgres}` |
| `private.handle_new_auth_user()` | `{postgres=X/postgres}` |
| `private.has_approved_dc_review(p_entity_type text, p_entity_id uuid)` | `{postgres=X/postgres,authenticated=X/postgres}` |
| `private.household_has_active_entitlement(p_household_id uuid, p_entitlement_key text)` | `{postgres=X/postgres,authenticated=X/postgres}` |
| `private.household_is_paid_member(p_household_id uuid)` | `{postgres=X/postgres,authenticated=X/postgres}` |
| `private.initialize_household()` | `{postgres=X/postgres}` |
| `private.initialize_organization()` | `{postgres=X/postgres}` |
| `private.invoke_notification_delivery_worker()` | `{postgres=X/postgres}` |
| `private.is_app_admin()` | `{postgres=X/postgres,authenticated=X/postgres}` |
| `private.is_content_admin()` | `{postgres=X/postgres,authenticated=X/postgres}` |
| `private.is_household_member(p_household_id uuid)` | `{postgres=X/postgres,authenticated=X/postgres}` |
| `private.is_household_owner(p_household_id uuid)` | `{postgres=X/postgres,authenticated=X/postgres}` |
| `private.is_operations_admin()` | `{postgres=X/postgres,authenticated=X/postgres}` |
| `private.is_org_member(p_organization_id uuid)` | `{postgres=X/postgres,authenticated=X/postgres}` |
| `private.join_child_to_group_impl(p_code text, p_child_profile_id uuid)` | `{postgres=X/postgres,authenticated=X/postgres}` |
| `private.notification_audience_count_impl(p_audience_type text, p_membership_plan_id uuid, p_household_id uuid, p_organization_id uuid, p_group_id uuid, p_event_id uuid)` | `{postgres=X/postgres,authenticated=X/postgres}` |
| `private.notification_next_delivery_at(p_user_id uuid)` | `{postgres=X/postgres}` |
| `private.notification_preference_allows(p_user_id uuid, p_notification_type text, p_channel text)` | `{postgres=X/postgres}` |
| `private.notify_pending_parent_challenge()` | `{postgres=X/postgres}` |
| `private.notify_reward_unlock()` | `{postgres=X/postgres}` |
| `private.prevent_book_progress_regression()` | `NULL` |
| `private.prevent_completed_progress_reversal()` | `{postgres=X/postgres}` |
| `private.preview_group_join_code_impl(p_code text)` | `{postgres=X/postgres,authenticated=X/postgres}` |
| `private.preview_organization_invitation_impl(p_invitation_id uuid, p_token text)` | `{postgres=X/postgres,authenticated=X/postgres}` |
| `private.privacy_export_payload_impl(p_request_id uuid)` | `{postgres=X/postgres,authenticated=X/postgres}` |
| `private.process_adventure_completion()` | `{postgres=X/postgres}` |
| `private.process_book_progress()` | `{postgres=X/postgres}` |
| `private.process_challenge_completion()` | `{postgres=X/postgres}` |
| `private.process_content_completed()` | `{postgres=X/postgres}` |
| `private.process_devotional_completed()` | `{postgres=X/postgres}` |
| `private.process_family_faith_session()` | `{postgres=X/postgres}` |
| `private.process_paid_order_access()` | `{postgres=X/postgres}` |
| `private.process_prayer_completed()` | `{postgres=X/postgres}` |
| `private.process_scripture_memorized()` | `{postgres=X/postgres}` |
| `private.process_weekly_series_completion()` | `{postgres=X/postgres}` |
| `private.queue_external_notification_delivery()` | `{postgres=X/postgres}` |
| `private.register_for_event_impl(p_event_id uuid, p_household_id uuid, p_child_profile_id uuid)` | `{postgres=X/postgres,authenticated=X/postgres}` |
| `private.save_digital_book_position_impl(p_child_profile_id uuid, p_book_id uuid, p_revision text, p_page_number integer)` | `{postgres=X/postgres,authenticated=X/postgres}` |
| `private.set_guardian_pin_impl(p_household_id uuid, p_pin text)` | `{postgres=X/postgres,authenticated=X/postgres}` |
| `private.set_updated_at()` | `{postgres=X/postgres}` |
| `private.sync_reward_redemption_fulfillment()` | `{postgres=X/postgres}` |
| `private.unlock_book_milestone_rewards()` | `{postgres=X/postgres}` |
| `private.user_can_access_challenge(p_challenge_id uuid)` | `NULL` |
| `private.user_has_active_entitlement(p_entitlement_key text)` | `{postgres=X/postgres,authenticated=X/postgres}` |
| `private.user_has_book_access(p_book_id uuid)` | `{postgres=X/postgres,authenticated=X/postgres}` |
| `private.user_has_household()` | `{postgres=X/postgres,authenticated=X/postgres}` |
| `private.validate_challenge_completion()` | `{postgres=X/postgres}` |
| `private.validate_digital_book_manifest()` | `{postgres=X/postgres}` |
| `private.validate_notification_reminder_scope()` | `{postgres=X/postgres}` |
| `private.validate_reward_redemption_transition()` | `{postgres=X/postgres}` |
| `private.verify_guardian_pin_impl(p_household_id uuid, p_pin text)` | `{postgres=X/postgres,authenticated=X/postgres}` |

## Default privileges

| Owner | Object class | Schema | Captured ACL |
| --- | --- | --- | --- |
| postgres | S | public | `{postgres=rwU/postgres,anon=rwU/postgres,authenticated=rwU/postgres,service_role=rwU/postgres}` |
| postgres | f | public | `{postgres=X/postgres,anon=X/postgres,authenticated=X/postgres,service_role=X/postgres}` |
| postgres | r | public | `{postgres=arwdDxtm/postgres,anon=arwdDxtm/postgres,authenticated=arwdDxtm/postgres,service_role=arwdDxtm/postgres}` |
| supabase_admin | S | public | `{postgres=rwU/supabase_admin,anon=rwU/supabase_admin,authenticated=rwU/supabase_admin,service_role=rwU/supabase_admin}` |
| supabase_admin | f | public | `{postgres=X/supabase_admin,anon=X/supabase_admin,authenticated=X/supabase_admin,service_role=X/supabase_admin}` |
| supabase_admin | r | public | `{postgres=arwdDxtm/supabase_admin,anon=arwdDxtm/supabase_admin,authenticated=arwdDxtm/supabase_admin,service_role=arwdDxtm/supabase_admin}` |

## Treatment in this package

Preserve and label the existing ACLs only inside the guarded isolated baseline, prove no privilege expansion, and request a dedicated least-privilege review. No sweeping cleanup, automatic production rollout, broad helper grants, provider activation or new approval policy is included. The localhost runner and inactive schedules prevent this faithful snapshot from silently becoming a launch configuration.
