# Migration history map — 2026-09-26

All 40 live records contain their original SQL. All 24 repository migrations have a related live record; 12 timestamps differ. Of the 24 related SQL bodies, 21 are byte-exact and three differ only in comments/whitespace (equal PostgreSQL parse trees). The original root files and live migration history remain unchanged.

Source order checked: all available tracked Git history, existing root migration files, then read-only live migration records and deployed catalog. Git history contains no earlier copy of the 16 missing migrations. Their exact recorded SQL is archived under `supabase/recovery/history/`, outside the executable migration path. This is recovered historical evidence, not a newly invented migration chain.

**The history is incomplete as a creation ledger:** 70 current application tables and 131 current functions have no CREATE statement in any of the 40 records. Their current source is recovered in the catalog/bootstrap; the missing original change records remain unknown. Restoring all 40 historical records alone cannot reconstruct the current backend.

Classification describes repository/history correspondence. Supersession is tracked separately: a migration can match Git exactly while some effects have since changed. “Present” below means the named object still exists, not that its historical definition remains identical. Current definitions, signatures, RLS and effective ACLs are verified by the complete catalog round-trip. Function-body matching is exact after trimming outer whitespace, not a proof of semantic equivalence.

| Live version / migration | Related repository filename | Classification / SQL verification | Current effects / later changes | Recovery treatment |
| --- | --- | --- | --- | --- |
| `20260924114237` foundation_family_membership_security | — | production-only historical migration; original SQL verified | 48/49 named targets present; 5/5 function bodies unchanged; later recorded touches: 20260924120124 | Keep history; restore current bootstrap only |
| `20260924114305` foundation_foreign_key_indexes | — | production-only historical migration; original SQL verified | 6/6 named targets present; 0/0 function bodies unchanged; no later recorded target overlap | Keep history; restore current bootstrap only |
| `20260924114606` adventure_club_core_engine | — | production-only historical migration; original SQL verified | 96/96 named targets present; 5/5 function bodies unchanged; later recorded touches: 20260924123317, 20260924221321 | Keep history; restore current bootstrap only |
| `20260924114628` challenge_assignment_assigned_by_index | — | production-only historical migration; original SQL verified | 1/1 named targets present; 0/0 function bodies unchanged; no later recorded target overlap | Keep history; restore current bootstrap only |
| `20260924114937` admin_notifications_media_activity | — | production-only historical migration; original SQL verified | 77/78 named targets present; 2/2 function bodies unchanged; no later recorded target overlap | Keep history; restore current bootstrap only |
| `20260924115118` trusted_progression_automation | — | production-only historical migration; original SQL verified | 9/9 named targets present; 1/4 function bodies unchanged; later recorded touches: 20260925120823 | Keep history; restore current bootstrap only |
| `20260924115151` prevent_completed_progress_reversal | — | production-only historical migration; original SQL verified | 3/3 named targets present; 1/1 function bodies unchanged; no later recorded target overlap | Keep history; restore current bootstrap only |
| `20260924120124` tighten_household_membership_authority | — | production-only historical migration; original SQL verified | 3/3 named targets present; 0/0 function bodies unchanged; no later recorded target overlap | Keep history; restore current bootstrap only |
| `20260924120216` configurable_badge_and_reward_automation | — | production-only historical migration; original SQL verified | 17/17 named targets present; 2/4 function bodies unchanged; later recorded touches: 20260924120556, 20260924120733 | Keep history; restore current bootstrap only |
| `20260924120556` admin_draft_visibility_and_operations_roles | — | production-only historical migration; original SQL verified | 18/18 named targets present; 1/1 function bodies unchanged; no later recorded target overlap | Keep history; restore current bootstrap only |
| `20260924120705` atomic_admin_content_operations_and_audit | — | production-only historical migration; original SQL verified | 13/13 named targets present; 4/4 function bodies unchanged; no later recorded target overlap | Keep history; restore current bootstrap only |
| `20260924120733` harden_reward_redemption_fulfillment | — | production-only historical migration; original SQL verified | 3/3 named targets present; 2/2 function bodies unchanged; no later recorded target overlap | Keep history; restore current bootstrap only |
| `20260924121208` guardian_pin_lock | — | production-only historical migration; original SQL verified | 4/4 named targets present; 0/3 function bodies unchanged; later recorded touches: 20260924121443 | Keep history; restore current bootstrap only |
| `20260924121443` move_guardian_pin_privilege_to_private_helpers | — | production-only historical migration; original SQL verified | 6/6 named targets present; 5/6 function bodies unchanged; later recorded touches: 20260926212852 | Keep history; restore current bootstrap only |
| `20260924122136` public_site_leads_and_contact_inquiries | — | production-only historical migration; original SQL verified | 11/11 named targets present; 0/0 function bodies unchanged; no later recorded target overlap | Keep history; restore current bootstrap only |
| `20260924123317` weekly_stars_streak_badges_and_lifetime_badge_levels | — | production-only historical migration; original SQL verified | 45/45 named targets present; 1/1 function bodies unchanged; no later recorded target overlap | Keep history; restore current bootstrap only |
| `20260924205627` guard_book_progress_regression | `20260924205627_guard_book_progress_regression.sql` | exact repository match; byte-exact SQL | 2/2 named targets present; 1/1 function bodies unchanged; no later recorded target overlap | Keep history; restore current bootstrap only |
| `20260924210810` enforce_book_companion_access | `20260924212000_enforce_book_companion_access.sql` | same logical migration but different timestamp/name; byte-exact SQL | 4/4 named targets present; 1/3 function bodies unchanged; later recorded touches: 20260925120823, 20260926212852 | Keep history; restore current bootstrap only |
| `20260924211023` add_book_launch_checks | `20260924212500_add_book_launch_checks.sql` | same logical migration but different timestamp/name; byte-exact SQL | 2/2 named targets present; 1/2 function bodies unchanged; later recorded touches: 20260924220618, 20260924221449, 20260925025111 | Keep history; restore current bootstrap only |
| `20260924211143` index_integration_test_provider | `20260924213000_index_integration_test_provider.sql` | same logical migration but different timestamp/name; equal parsed SQL; comments/whitespace differ | 1/1 named targets present; 0/0 function bodies unchanged; no later recorded target overlap | Keep history; restore current bootstrap only |
| `20260924220618` add_book_release_launch_checks | `20260924215000_add_book_release_launch_checks.sql` | same logical migration but different timestamp/name; byte-exact SQL | 2/2 named targets present; 1/2 function bodies unchanged; later recorded touches: 20260924221449, 20260925025111 | Keep history; restore current bootstrap only |
| `20260924221321` define_membership_tiers_and_challenge_access | `20260924222500_define_membership_tiers_and_challenge_access.sql` | same logical migration but different timestamp/name; byte-exact SQL | 4/4 named targets present; 1/2 function bodies unchanged; later recorded touches: 20260925120823 | Keep history; restore current bootstrap only |
| `20260924221449` add_membership_launch_checks | `20260924223000_add_membership_launch_checks.sql` | same logical migration but different timestamp/name; byte-exact SQL | 2/2 named targets present; 1/2 function bodies unchanged; later recorded touches: 20260925025111 | Keep history; restore current bootstrap only |
| `20260924230504` guard_concurrent_guardian_decisions | `20260924230504_guard_concurrent_guardian_decisions.sql` | exact repository match; equal parsed SQL; comments/whitespace differ | 2/2 named targets present; 2/2 function bodies unchanged; no later recorded target overlap | Keep history; restore current bootstrap only |
| `20260924234414` secure_family_event_registration | `20260924234414_secure_family_event_registration.sql` | exact repository match; byte-exact SQL | 4/4 named targets present; 3/4 function bodies unchanged; later recorded touches: 20260925120823, 20260925122342 | Keep history; restore current bootstrap only |
| `20260925004449` family_faith_whole_household_uniqueness | `20260925004449_family_faith_whole_household_uniqueness.sql` | exact repository match; byte-exact SQL | 2/2 named targets present; 0/0 function bodies unchanged; no later recorded target overlap | Keep history; restore current bootstrap only |
| `20260925011427` harden_guardian_group_membership | `20260925011427_harden_guardian_group_membership.sql` | exact repository match; byte-exact SQL | 3/3 named targets present; 2/2 function bodies unchanged; no later recorded target overlap | Keep history; restore current bootstrap only |
| `20260925013210` enforce_activity_completion_access | `20260925013210_enforce_activity_completion_access.sql` | exact repository match; byte-exact SQL | 3/3 named targets present; 1/1 function bodies unchanged; no later recorded target overlap | Keep history; restore current bootstrap only |
| `20260925015358` add_protected_digital_book_reader | `20260925015358_add_protected_digital_book_reader.sql` | exact repository match; byte-exact SQL | 15/15 named targets present; 4/9 function bodies unchanged; later recorded touches: 20260925020034, 20260925023737 | Keep history; restore current bootstrap only |
| `20260925020034` protect_digital_book_manifest_text | `20260925020034_protect_digital_book_manifest_text.sql` | exact repository match; byte-exact SQL | 8/8 named targets present; 7/7 function bodies unchanged; later recorded touches: 20260925021110 | Keep history; restore current bootstrap only |
| `20260925021110` add_digital_edition_review_access | `20260925021110_add_digital_edition_review_access.sql` | exact repository match; byte-exact SQL | 4/4 named targets present; 2/2 function bodies unchanged; no later recorded target overlap | Keep history; restore current bootstrap only |
| `20260925023737` include_reading_positions_in_privacy | `20260925023737_include_reading_positions_in_privacy.sql` | exact repository match; equal parsed SQL; comments/whitespace differ | 3/3 named targets present; 1/1 function bodies unchanged; no later recorded target overlap | Keep history; restore current bootstrap only |
| `20260925025111` add_digital_book_launch_readiness | `20260925025111_add_digital_book_launch_readiness.sql` | exact repository match; byte-exact SQL | 2/2 named targets present; 2/2 function bodies unchanged; no later recorded target overlap | Keep history; restore current bootstrap only |
| `20260925111607` fix_household_onboarding_returning | `20260925111603_fix_household_onboarding_returning.sql` | same logical migration but different timestamp/name; byte-exact SQL | 1/1 named targets present; 1/1 function bodies unchanged; no later recorded target overlap | Keep history; restore current bootstrap only |
| `20260925120823` scope_child_household_premium_access | `20260925120405_scope_child_household_premium_access.sql` | same logical migration but different timestamp/name; byte-exact SQL | 13/13 named targets present; 9/10 function bodies unchanged; later recorded touches: 20260925122342 | Keep history; restore current bootstrap only |
| `20260925122342` scope_event_registration_audience | `20260925122115_scope_event_registration_audience.sql` | same logical migration but different timestamp/name; byte-exact SQL | 2/2 named targets present; 2/2 function bodies unchanged; no later recorded target overlap | Keep history; restore current bootstrap only |
| `20260925124058` family_activity_participants | `20260925123327_family_activity_participants.sql` | same logical migration but different timestamp/name; byte-exact SQL | 2/2 named targets present; 2/2 function bodies unchanged; no later recorded target overlap | Keep history; restore current bootstrap only |
| `20260925131404` protect_direct_family_faith_credit | `20260925131231_protect_direct_family_faith_credit.sql` | same logical migration but different timestamp/name; byte-exact SQL | 1/1 named targets present; 0/0 function bodies unchanged; no later recorded target overlap | Keep history; restore current bootstrap only |
| `20260925133014` validate_payment_checkout_under_lock | `20260925132731_validate_payment_checkout_under_lock.sql` | same logical migration but different timestamp/name; byte-exact SQL | 1/1 named targets present; 1/1 function bodies unchanged; no later recorded target overlap | Keep history; restore current bootstrap only |
| `20260926212852` guardian_pin_and_rpc_security_repair | `20260926212852_guardian_pin_and_rpc_security_repair.sql` | exact repository match; byte-exact SQL | 6/6 named targets present; 6/6 function bodies unchanged; no later recorded target overlap | Keep history; restore current bootstrap only |

## Per-record object evidence and supersession

Grants/revokes are retained verbatim in each archive and evaluated through the current ACL inventory; they are not treated as proof of present privilege. DROP statements and the exact altered columns/policies remain visible in the linked SQL. The JSON mapping records every statement-type count. No historical data statement is replayed: the six top-level INSERTs concern plans/entitlement definitions/plan entitlements and a bucket, not family records. Current business/reference rows require a separate verified backup.

### 20260924114237 — foundation_family_membership_security

[Exact SQL](../../supabase/recovery/history/20260924114237_foundation_family_membership_security.sql); SHA-256 `760c8858299218406fa0207e18b1a6cb0b8f05f8efded3b4a78ebfda86e76eca`.

Statement inventory: AlterTableStmt=10, CreateFunctionStmt=5, CreatePolicyStmt=18, CreateSchemaStmt=1, CreateStmt=10, CreateTrigStmt=7, DropStmt=1, GrantStmt=31, IndexStmt=8, InsertStmt=3.

- Schema: `private`.
- Table: `public.child_profiles`, `public.entitlement_definitions`, `public.household_consents`, `public.household_entitlement_grants`, `public.household_members`, `public.household_subscriptions`, `public.households`, `public.membership_plans`, `public.plan_entitlements`, `public.profiles`.
- Index: `public.child_profiles_household_idx`, `public.household_consents_guardian_idx`, `public.household_consents_household_idx`, `public.household_entitlement_grants_lookup_idx`, `public.household_members_household_idx`, `public.household_members_user_idx`, `public.household_subscriptions_household_idx`, `public.household_subscriptions_provider_subscription_uidx`.
- Trigger: `auth.users.on_auth_user_created`, `public.child_profiles.child_profiles_set_updated_at`, `public.entitlement_definitions.entitlement_definitions_set_updated_at`, `public.household_subscriptions.household_subscriptions_set_updated_at`, `public.households.households_set_updated_at`, `public.membership_plans.membership_plans_set_updated_at`, `public.profiles.profiles_set_updated_at`.
- Policy: `public.child_profiles.child_profiles_delete_manager`, `public.child_profiles.child_profiles_insert_manager`, `public.child_profiles.child_profiles_select_household`, `public.child_profiles.child_profiles_update_manager`, `public.entitlement_definitions.entitlement_definitions_read_active`, `public.household_consents.household_consents_insert_guardian`, `public.household_consents.household_consents_select_household`, `public.household_entitlement_grants.household_entitlement_grants_select_household`, `public.household_members.household_members_insert_initial_owner` (absent/replaced), `public.household_members.household_members_select_household`, `public.household_subscriptions.household_subscriptions_select_household`, `public.households.households_insert_creator`, `public.households.households_select_member`, `public.households.households_update_manager`, `public.membership_plans.membership_plans_read_active`, `public.plan_entitlements.plan_entitlements_read_active`, `public.profiles.profiles_select_self`, `public.profiles.profiles_update_self`.
- Function: `private.can_manage_household`, `private.handle_new_auth_user`, `private.is_household_member`, `private.is_household_owner`, `private.set_updated_at`.

Later recorded target overlap: `20260924120124_tighten_household_membership_authority`. Overlap identifies possible partial supersession, not wholesale obsolescence of this record.

### 20260924114305 — foundation_foreign_key_indexes

[Exact SQL](../../supabase/recovery/history/20260924114305_foundation_foreign_key_indexes.sql); SHA-256 `0157e4d615a00ab2ba028fce96bff5cd714d82263e4b829fd8d3f7dd8d55b465`.

Statement inventory: IndexStmt=6.

- Index: `public.child_profiles_created_by_idx`, `public.household_consents_child_profile_idx`, `public.household_entitlement_grants_entitlement_idx`, `public.household_subscriptions_plan_idx`, `public.households_created_by_idx`, `public.plan_entitlements_entitlement_idx`.

Later recorded target overlap: none. Overlap identifies possible partial supersession, not wholesale obsolescence of this record.

### 20260924114606 — adventure_club_core_engine

[Exact SQL](../../supabase/recovery/history/20260924114606_adventure_club_core_engine.sql); SHA-256 `087fb59f9e0ddd5da33ff93e043e189020aaca401ffae6d7f1d3c4c92e5dc56f`.

Statement inventory: AlterTableStmt=21, CreateFunctionStmt=5, CreatePolicyStmt=33, CreateStmt=21, CreateTrigStmt=10, GrantStmt=53, IndexStmt=26, ViewStmt=1.

- Table: `public.adventure_challenges`, `public.adventure_content_links`, `public.adventures`, `public.badge_awards`, `public.badges`, `public.book_content_links`, `public.books`, `public.challenge_assignments`, `public.challenge_steps`, `public.challenges`, `public.child_adventure_progress`, `public.child_challenge_progress`, `public.child_step_progress`, `public.child_streaks`, `public.content_items`, `public.household_book_access`, `public.levels`, `public.reward_redemptions`, `public.reward_unlocks`, `public.rewards`, `public.xp_ledger`.
- View: `public.child_xp_totals`.
- Index: `public.adventure_challenges_challenge_idx`, `public.adventure_content_links_content_idx`, `public.adventures_book_idx`, `public.adventures_publish_idx`, `public.badge_awards_badge_idx`, `public.badge_awards_child_idx`, `public.book_content_links_content_idx`, `public.challenge_assignments_challenge_idx`, `public.challenge_assignments_child_idx`, `public.challenge_assignments_household_idx`, `public.challenge_steps_challenge_idx`, `public.challenge_steps_content_idx`, `public.challenges_publish_idx`, `public.challenges_type_idx`, `public.child_adventure_progress_adventure_idx`, `public.child_challenge_progress_approved_by_idx`, `public.child_challenge_progress_challenge_idx`, `public.child_step_progress_step_idx`, `public.content_items_publish_idx`, `public.household_book_access_book_idx`, `public.household_book_access_household_idx`, `public.reward_redemptions_requested_by_idx`, `public.reward_unlocks_child_idx`, `public.reward_unlocks_reward_idx`, `public.xp_ledger_child_idx`, `public.xp_ledger_source_idx`.
- Trigger: `public.adventures.adventures_set_updated_at`, `public.badges.badges_set_updated_at`, `public.books.books_set_updated_at`, `public.challenges.challenges_set_updated_at`, `public.child_adventure_progress.child_adventure_progress_set_updated_at`, `public.child_challenge_progress.child_challenge_progress_set_updated_at`, `public.child_step_progress.child_step_progress_set_updated_at`, `public.content_items.content_items_set_updated_at`, `public.levels.levels_set_updated_at`, `public.rewards.rewards_set_updated_at`.
- Policy: `public.adventure_challenges.adventure_challenges_read`, `public.adventure_content_links.adventure_content_links_read`, `public.adventures.adventures_read_authenticated`, `public.adventures.adventures_read_free`, `public.badge_awards.badge_awards_read`, `public.badges.badges_read`, `public.book_content_links.book_content_links_read`, `public.books.books_read_public`, `public.challenge_assignments.challenge_assignments_insert_parent`, `public.challenge_assignments.challenge_assignments_read`, `public.challenge_steps.challenge_steps_read`, `public.challenges.challenges_read_authenticated`, `public.challenges.challenges_read_free`, `public.child_adventure_progress.child_adventure_progress_insert`, `public.child_adventure_progress.child_adventure_progress_read`, `public.child_adventure_progress.child_adventure_progress_update`, `public.child_challenge_progress.child_challenge_progress_insert`, `public.child_challenge_progress.child_challenge_progress_read`, `public.child_challenge_progress.child_challenge_progress_update`, `public.child_step_progress.child_step_progress_insert`, `public.child_step_progress.child_step_progress_read`, `public.child_step_progress.child_step_progress_update`, `public.child_streaks.child_streaks_read`, `public.content_items.content_items_read_authenticated`, `public.content_items.content_items_read_free`, `public.household_book_access.household_book_access_read`, `public.levels.levels_read`, `public.reward_redemptions.reward_redemptions_insert`, `public.reward_redemptions.reward_redemptions_read`, `public.reward_unlocks.reward_unlocks_read`, `public.rewards.rewards_read_authenticated`, `public.rewards.rewards_read_free`, `public.xp_ledger.xp_ledger_read`.
- Function: `private.can_manage_challenge_progress`, `private.can_manage_child`, `private.can_view_child`, `private.user_has_active_entitlement`, `private.user_has_household`.

Later recorded target overlap: `20260924123317_weekly_stars_streak_badges_and_lifetime_badge_levels`, `20260924221321_define_membership_tiers_and_challenge_access`. Overlap identifies possible partial supersession, not wholesale obsolescence of this record.

### 20260924114628 — challenge_assignment_assigned_by_index

[Exact SQL](../../supabase/recovery/history/20260924114628_challenge_assignment_assigned_by_index.sql); SHA-256 `f66e6a6f426d50590a33a70f7bca1fec2d0d3051ed8c80d8cd6b854090eb2479`.

Statement inventory: IndexStmt=1.

- Index: `public.challenge_assignments_assigned_by_idx`.

Later recorded target overlap: none. Overlap identifies possible partial supersession, not wholesale obsolescence of this record.

### 20260924114937 — admin_notifications_media_activity

[Exact SQL](../../supabase/recovery/history/20260924114937_admin_notifications_media_activity.sql); SHA-256 `eadaca5f4ab2c2daaf99c805ea9a91c1df78c17cabff4cdb64be07f6efc6d2e7`.

Statement inventory: AlterTableStmt=7, CreateFunctionStmt=2, CreatePolicyStmt=50, CreateStmt=7, CreateTrigStmt=4, GrantStmt=30, IndexStmt=15.

- Table: `public.admin_audit_log`, `public.app_admins`, `public.child_activity_events`, `public.media_assets`, `public.notification_preferences`, `public.push_devices`, `public.user_notifications`.
- Index: `public.admin_audit_actor_idx`, `public.admin_audit_child_idx`, `public.admin_audit_entity_idx`, `public.admin_audit_household_idx`, `public.app_admins_created_by_idx`, `public.child_activity_child_idx`, `public.child_activity_household_idx`, `public.child_activity_source_idx`, `public.media_assets_created_by_idx`, `public.media_assets_delivery_idx`, `public.media_assets_entitlement_idx`, `public.push_devices_user_idx`, `public.user_notifications_child_idx`, `public.user_notifications_household_idx`, `public.user_notifications_user_idx`.
- Trigger: `public.app_admins.app_admins_set_updated_at`, `public.media_assets.media_assets_set_updated_at`, `public.notification_preferences.notification_preferences_set_updated_at`, `public.push_devices.push_devices_set_updated_at`.
- Policy: `public.admin_audit_log.admin_audit_read_admin`, `public.adventure_challenges.adventure_challenges_admin_delete`, `public.adventure_challenges.adventure_challenges_admin_insert`, `public.adventure_challenges.adventure_challenges_admin_update`, `public.adventure_content_links.adventure_content_links_admin_delete`, `public.adventure_content_links.adventure_content_links_admin_insert`, `public.adventure_content_links.adventure_content_links_admin_update`, `public.adventures.adventures_admin_delete`, `public.adventures.adventures_admin_insert`, `public.adventures.adventures_admin_update`, `public.app_admins.app_admins_read_self`, `public.badges.badges_admin_delete`, `public.badges.badges_admin_insert`, `public.badges.badges_admin_update`, `public.book_content_links.book_content_links_admin_delete`, `public.book_content_links.book_content_links_admin_insert`, `public.book_content_links.book_content_links_admin_update`, `public.books.books_admin_delete`, `public.books.books_admin_insert`, `public.books.books_admin_update`, `public.challenge_steps.challenge_steps_admin_delete`, `public.challenge_steps.challenge_steps_admin_insert`, `public.challenge_steps.challenge_steps_admin_update`, `public.challenges.challenges_admin_delete`, `public.challenges.challenges_admin_insert`, `public.challenges.challenges_admin_update`, `public.child_activity_events.child_activity_read_household`, `public.content_items.content_items_admin_delete`, `public.content_items.content_items_admin_insert`, `public.content_items.content_items_admin_update`, `public.levels.levels_admin_delete`, `public.levels.levels_admin_insert`, `public.levels.levels_admin_update`, `public.media_assets.media_assets_admin_delete`, `public.media_assets.media_assets_admin_insert`, `public.media_assets.media_assets_admin_update`, `public.media_assets.media_assets_read_authenticated`, `public.media_assets.media_assets_read_public`, `public.notification_preferences.notification_preferences_insert_self`, `public.notification_preferences.notification_preferences_read_self`, `public.notification_preferences.notification_preferences_update_self`, `public.push_devices.push_devices_delete_self`, `public.push_devices.push_devices_insert_self`, `public.push_devices.push_devices_read_self` (absent/replaced), `public.push_devices.push_devices_update_self`, `public.rewards.rewards_admin_delete`, `public.rewards.rewards_admin_insert`, `public.rewards.rewards_admin_update`, `public.user_notifications.user_notifications_read_self`, `public.user_notifications.user_notifications_update_self`.
- Function: `private.is_app_admin`, `private.is_content_admin`.

Later recorded target overlap: none. Overlap identifies possible partial supersession, not wholesale obsolescence of this record.

### 20260924115118 — trusted_progression_automation

[Exact SQL](../../supabase/recovery/history/20260924115118_trusted_progression_automation.sql); SHA-256 `16b044f888831a87d7b3b1cf0aee1ac792573be7d4d29b83ea720bd4cf7bbb59`.

Statement inventory: CreateFunctionStmt=4, CreateTrigStmt=4, DropStmt=4, GrantStmt=4, IndexStmt=1.

- Index: `public.xp_ledger_unique_source_event`.
- Trigger: `public.child_adventure_progress.adventure_progress_process_completion`, `public.child_challenge_progress.challenge_progress_process_completion`, `public.child_challenge_progress.challenge_progress_validate_completion`, `public.households.households_initialize_after_insert`.
- Function: `private.initialize_household`, `private.process_adventure_completion`, `private.process_challenge_completion`, `private.validate_challenge_completion`.

Historical function bodies superseded/changed or absent: `private.validate_challenge_completion`, `private.process_challenge_completion`, `private.process_adventure_completion`. Use the captured current definition; do not reapply this historical body.

Later recorded target overlap: `20260925120823_scope_child_household_premium_access`. Overlap identifies possible partial supersession, not wholesale obsolescence of this record.

### 20260924115151 — prevent_completed_progress_reversal

[Exact SQL](../../supabase/recovery/history/20260924115151_prevent_completed_progress_reversal.sql); SHA-256 `132d04ba99f9004408e688a1968bb5152274b981c088a40bf014b9684f50893e`.

Statement inventory: CreateFunctionStmt=1, CreateTrigStmt=2, DropStmt=2, GrantStmt=1.

- Trigger: `public.child_adventure_progress.adventure_progress_prevent_reversal`, `public.child_challenge_progress.challenge_progress_prevent_reversal`.
- Function: `private.prevent_completed_progress_reversal`.

Later recorded target overlap: none. Overlap identifies possible partial supersession, not wholesale obsolescence of this record.

### 20260924120124 — tighten_household_membership_authority

[Exact SQL](../../supabase/recovery/history/20260924120124_tighten_household_membership_authority.sql); SHA-256 `a3355493451142e2fe037ea9e40b45c554cbd11734934fec935fef1f3c51984d`.

Statement inventory: CreatePolicyStmt=3, DropStmt=4, GrantStmt=1.

- Policy: `public.household_members.household_members_select_household`, `public.households.households_select_member`, `public.households.households_update_manager`.

Later recorded target overlap: none. Overlap identifies possible partial supersession, not wholesale obsolescence of this record.

### 20260924120216 — configurable_badge_and_reward_automation

[Exact SQL](../../supabase/recovery/history/20260924120216_configurable_badge_and_reward_automation.sql); SHA-256 `bc3abc593c81cd40d71a9fa8f5b7779d2cc52fb7b40831235c33205d51791062`.

Statement inventory: AlterTableStmt=1, CreateFunctionStmt=4, CreatePolicyStmt=5, CreateStmt=1, CreateTrigStmt=5, DropStmt=4, GrantStmt=8, IndexStmt=2.

- Table: `public.badge_rules`.
- Index: `public.badge_rules_active_type_idx`, `public.badge_rules_badge_idx`.
- Trigger: `public.badge_rules.badge_rules_set_updated_at`, `public.child_adventure_progress.zz_adventure_progress_evaluate_badges`, `public.child_challenge_progress.zz_challenge_progress_evaluate_badges`, `public.reward_redemptions.reward_redemption_sync_fulfillment`, `public.reward_unlocks.reward_unlock_notify`.
- Policy: `public.badge_rules.badge_rules_admin_delete`, `public.badge_rules.badge_rules_admin_insert`, `public.badge_rules.badge_rules_admin_update`, `public.badge_rules.badge_rules_read`, `public.reward_redemptions.reward_redemptions_admin_update`.
- Function: `private.evaluate_badges_after_progress`, `private.evaluate_child_badges`, `private.notify_reward_unlock`, `private.sync_reward_redemption_fulfillment`.

Historical function bodies superseded/changed or absent: `private.evaluate_child_badges`, `private.sync_reward_redemption_fulfillment`. Use the captured current definition; do not reapply this historical body.

Later recorded target overlap: `20260924120556_admin_draft_visibility_and_operations_roles`, `20260924120733_harden_reward_redemption_fulfillment`. Overlap identifies possible partial supersession, not wholesale obsolescence of this record.

### 20260924120556 — admin_draft_visibility_and_operations_roles

[Exact SQL](../../supabase/recovery/history/20260924120556_admin_draft_visibility_and_operations_roles.sql); SHA-256 `770ee07ce5efddce78b8b26d8df2a94369d0c2821149185508872c0a06ab0451`.

Statement inventory: CreateFunctionStmt=1, CreatePolicyStmt=17, DropStmt=1, GrantStmt=3.

- Policy: `public.adventure_challenges.adventure_challenges_admin_select_all`, `public.adventure_content_links.adventure_content_links_admin_select_all`, `public.adventures.adventures_admin_select_all`, `public.badge_rules.badge_rules_admin_select_all`, `public.badges.badges_admin_select_all`, `public.book_content_links.book_content_links_admin_select_all`, `public.books.books_admin_select_all`, `public.challenge_steps.challenge_steps_admin_select_all`, `public.challenges.challenges_admin_select_all`, `public.content_items.content_items_admin_select_all`, `public.household_consents.household_consents_admin_select_all`, `public.household_entitlement_grants.household_entitlement_grants_admin_select_all`, `public.household_subscriptions.household_subscriptions_admin_select_all`, `public.levels.levels_admin_select_all`, `public.reward_redemptions.reward_redemptions_admin_select_all`, `public.reward_redemptions.reward_redemptions_admin_update`, `public.rewards.rewards_admin_select_all`.
- Function: `private.is_operations_admin`.

Later recorded target overlap: none. Overlap identifies possible partial supersession, not wholesale obsolescence of this record.

### 20260924120705 — atomic_admin_content_operations_and_audit

[Exact SQL](../../supabase/recovery/history/20260924120705_atomic_admin_content_operations_and_audit.sql); SHA-256 `a3bce604277eee720a86de0b4bfee55b7096e3910a7e609a3023aff515a076cb`.

Statement inventory: CreateFunctionStmt=4, CreateTrigStmt=9, DropStmt=9, GrantStmt=7.

- Trigger: `public.adventures.audit_adventures_admin`, `public.badge_rules.audit_badge_rules_admin`, `public.badges.audit_badges_admin`, `public.books.audit_books_admin`, `public.challenges.audit_challenges_admin`, `public.content_items.audit_content_items_admin`, `public.levels.audit_levels_admin`, `public.reward_redemptions.audit_reward_redemptions_admin`, `public.rewards.audit_rewards_admin`.
- Function: `private.audit_admin_mutation`, `public.admin_create_badge_with_rule`, `public.admin_create_challenge`, `public.admin_create_reward`.

Later recorded target overlap: none. Overlap identifies possible partial supersession, not wholesale obsolescence of this record.

### 20260924120733 — harden_reward_redemption_fulfillment

[Exact SQL](../../supabase/recovery/history/20260924120733_harden_reward_redemption_fulfillment.sql); SHA-256 `2e7ebe7aa90adf7c4a217bc2ab3e160369bccb0f95eb22a6334095cd99ab4a49`.

Statement inventory: CreateFunctionStmt=2, CreateTrigStmt=1, DropStmt=1, GrantStmt=2.

- Trigger: `public.reward_redemptions.aa_reward_redemption_validate_transition`.
- Function: `private.sync_reward_redemption_fulfillment`, `private.validate_reward_redemption_transition`.

Later recorded target overlap: none. Overlap identifies possible partial supersession, not wholesale obsolescence of this record.

### 20260924121208 — guardian_pin_lock

[Exact SQL](../../supabase/recovery/history/20260924121208_guardian_pin_lock.sql); SHA-256 `9f70430a9cf83ce9e04b5bb0fa4204654a8adcd2248fa887e04129f1b8e39a97`.

Statement inventory: CreateFunctionStmt=3, CreateStmt=1, GrantStmt=7.

- Table: `private.household_guardian_security`.
- Function: `public.guardian_pin_status`, `public.set_guardian_pin`, `public.verify_guardian_pin`.

Historical function bodies superseded/changed or absent: `public.set_guardian_pin`, `public.guardian_pin_status`, `public.verify_guardian_pin`. Use the captured current definition; do not reapply this historical body.

Later recorded target overlap: `20260924121443_move_guardian_pin_privilege_to_private_helpers`. Overlap identifies possible partial supersession, not wholesale obsolescence of this record.

### 20260924121443 — move_guardian_pin_privilege_to_private_helpers

[Exact SQL](../../supabase/recovery/history/20260924121443_move_guardian_pin_privilege_to_private_helpers.sql); SHA-256 `3d407b748ed7718baf4ceebd8c88317b57438817afd1b1f93c47ce5a6df9a2fe`.

Statement inventory: CreateFunctionStmt=6, GrantStmt=12.

- Function: `private.guardian_pin_status_impl`, `private.set_guardian_pin_impl`, `private.verify_guardian_pin_impl`, `public.guardian_pin_status`, `public.set_guardian_pin`, `public.verify_guardian_pin`.

Historical function bodies superseded/changed or absent: `private.verify_guardian_pin_impl`. Use the captured current definition; do not reapply this historical body.

Later recorded target overlap: `20260926212852_guardian_pin_and_rpc_security_repair`. Overlap identifies possible partial supersession, not wholesale obsolescence of this record.

### 20260924122136 — public_site_leads_and_contact_inquiries

[Exact SQL](../../supabase/recovery/history/20260924122136_public_site_leads_and_contact_inquiries.sql); SHA-256 `a00d0f6bc35aa27663edf4ae49bc8f0e6c85c464f9b274f565fc369ba5295237`.

Statement inventory: AlterTableStmt=2, CreatePolicyStmt=3, CreateStmt=2, GrantStmt=4, IndexStmt=6.

- Table: `public.contact_inquiries`, `public.marketing_leads`.
- Index: `public.contact_inquiries_email_idx`, `public.contact_inquiries_ip_idx`, `public.contact_inquiries_status_idx`, `public.marketing_leads_email_idx`, `public.marketing_leads_ip_idx`, `public.marketing_leads_type_idx`.
- Policy: `public.contact_inquiries.contact_inquiries_admin_read`, `public.contact_inquiries.contact_inquiries_support_update`, `public.marketing_leads.marketing_leads_admin_read`.

Later recorded target overlap: none. Overlap identifies possible partial supersession, not wholesale obsolescence of this record.

### 20260924123317 — weekly_stars_streak_badges_and_lifetime_badge_levels

[Exact SQL](../../supabase/recovery/history/20260924123317_weekly_stars_streak_badges_and_lifetime_badge_levels.sql); SHA-256 `47d26c967002037f7a74011838fad02631b5c7b59e85e5cc8c16f892e4c2d194`.

Statement inventory: AlterTableStmt=8, CreateFunctionStmt=1, CreatePolicyStmt=14, CreateStmt=6, CreateTrigStmt=5, DropStmt=1, GrantStmt=17, IndexStmt=9, ViewStmt=2.

- Table: `public.achievement_token_ledger`, `public.badges`, `public.challenge_series`, `public.challenges`, `public.child_series_streaks`, `public.child_series_weekly_completions`, `public.series_badge_rules`, `public.streak_badge_earnings`.
- Column: `public.badges.badge_family_key`, `public.badges.badge_scope`, `public.badges.badge_tier`, `public.challenges.challenge_series_id`, `public.challenges.period_end`, `public.challenges.period_start`.
- View: `public.child_active_streak_badges`, `public.child_token_totals`.
- Index: `public.achievement_token_child_idx`, `public.achievement_token_series_idx`, `public.achievement_token_unique_source_idx`, `public.badges_family_tier_idx`, `public.challenges_series_period_idx`, `public.child_series_weekly_completions_challenge_idx`, `public.child_series_weekly_completions_child_idx`, `public.series_badge_rules_series_idx`, `public.streak_badge_earnings_child_idx`.
- Trigger: `public.challenge_series.audit_challenge_series_admin`, `public.challenge_series.challenge_series_set_updated_at`, `public.child_challenge_progress.zz_weekly_series_progression`, `public.series_badge_rules.audit_series_badge_rules_admin`, `public.series_badge_rules.series_badge_rules_set_updated_at`.
- Policy: `public.achievement_token_ledger.achievement_token_read_child`, `public.challenge_series.challenge_series_admin_delete`, `public.challenge_series.challenge_series_admin_insert`, `public.challenge_series.challenge_series_admin_select_all`, `public.challenge_series.challenge_series_admin_update`, `public.challenge_series.challenge_series_read_active`, `public.child_series_streaks.child_series_streaks_read`, `public.child_series_weekly_completions.child_series_weekly_completions_read`, `public.series_badge_rules.series_badge_rules_admin_delete`, `public.series_badge_rules.series_badge_rules_admin_insert`, `public.series_badge_rules.series_badge_rules_admin_select_all`, `public.series_badge_rules.series_badge_rules_admin_update`, `public.series_badge_rules.series_badge_rules_read`, `public.streak_badge_earnings.streak_badge_earnings_read`.
- Function: `private.process_weekly_series_completion`.

Later recorded target overlap: none. Overlap identifies possible partial supersession, not wholesale obsolescence of this record.

### 20260924205627 — guard_book_progress_regression

[Exact SQL](../../supabase/recovery/history/20260924205627_guard_book_progress_regression.sql); SHA-256 `9fefc1255928ec54bd444417e9c3441f46e7068e5b203bdaeeb9fbb96e2460ac`.

Statement inventory: CreateFunctionStmt=1, CreateTrigStmt=1, DropStmt=1.

- Trigger: `public.child_book_progress.prevent_book_progress_regression`.
- Function: `private.prevent_book_progress_regression`.

Later recorded target overlap: none. Overlap identifies possible partial supersession, not wholesale obsolescence of this record.

### 20260924210810 — enforce_book_companion_access

[Exact SQL](../../supabase/recovery/history/20260924210810_enforce_book_companion_access.sql); SHA-256 `54016f176689c7a320fed54953baafc616c7ab5d54ec233c9fdd64e531c7bb20`.

Statement inventory: CreateFunctionStmt=3, CreateTrigStmt=1, DropStmt=1, GrantStmt=2.

- Trigger: `public.child_book_progress.enforce_child_book_access`.
- Function: `private.enforce_child_book_access`, `public.complete_child_book_adventure`, `public.has_book_access`.

Historical function bodies superseded/changed or absent: `private.enforce_child_book_access`, `public.complete_child_book_adventure`. Use the captured current definition; do not reapply this historical body.

Later recorded target overlap: `20260925120823_scope_child_household_premium_access`, `20260926212852_guardian_pin_and_rpc_security_repair`. Overlap identifies possible partial supersession, not wholesale obsolescence of this record.

### 20260924211023 — add_book_launch_checks

[Exact SQL](../../supabase/recovery/history/20260924211023_add_book_launch_checks.sql); SHA-256 `eb5ee700aa7863b3d4ef8b58ac732e051786f20a3d25e6cbe8eddf99cfe9bfba`.

Statement inventory: CreateFunctionStmt=2.

- Function: `private.admin_get_book_launch_gate_impl`, `public.admin_get_production_launch_gate`.

Historical function bodies superseded/changed or absent: `public.admin_get_production_launch_gate`. Use the captured current definition; do not reapply this historical body.

Later recorded target overlap: `20260924220618_add_book_release_launch_checks`, `20260924221449_add_membership_launch_checks`, `20260925025111_add_digital_book_launch_readiness`. Overlap identifies possible partial supersession, not wholesale obsolescence of this record.

### 20260924211143 — index_integration_test_provider

[Exact SQL](../../supabase/recovery/history/20260924211143_index_integration_test_provider.sql); SHA-256 `c0d1c23b3df4deb549343d156db8a8c77d874b83d7414012cf66ead5499b6d55`.

Statement inventory: IndexStmt=1.

- Index: `public.integration_test_runs_provider_id_idx`.

Later recorded target overlap: none. Overlap identifies possible partial supersession, not wholesale obsolescence of this record.

### 20260924220618 — add_book_release_launch_checks

[Exact SQL](../../supabase/recovery/history/20260924220618_add_book_release_launch_checks.sql); SHA-256 `6ec59100be5fc16ba5565e7078085779302c6abe190bd491978ac361b872783e`.

Statement inventory: CreateFunctionStmt=2.

- Function: `private.admin_get_book_release_gate_impl`, `public.admin_get_production_launch_gate`.

Historical function bodies superseded/changed or absent: `public.admin_get_production_launch_gate`. Use the captured current definition; do not reapply this historical body.

Later recorded target overlap: `20260924221449_add_membership_launch_checks`, `20260925025111_add_digital_book_launch_readiness`. Overlap identifies possible partial supersession, not wholesale obsolescence of this record.

### 20260924221321 — define_membership_tiers_and_challenge_access

[Exact SQL](../../supabase/recovery/history/20260924221321_define_membership_tiers_and_challenge_access.sql); SHA-256 `2a8afd8ea8f42b2daa96044e5207179dca304e6c66d9d2c3f8ff054f2da2704a`.

Statement inventory: CreateFunctionStmt=2, CreatePolicyStmt=1, CreateTrigStmt=1, DropStmt=2, InsertStmt=2.

- Trigger: `public.child_challenge_progress.enforce_child_challenge_access`.
- Policy: `public.challenges.challenges_read_authenticated`.
- Function: `private.enforce_child_challenge_access`, `private.user_can_access_challenge`.

Historical function bodies superseded/changed or absent: `private.enforce_child_challenge_access`. Use the captured current definition; do not reapply this historical body.

Later recorded target overlap: `20260925120823_scope_child_household_premium_access`. Overlap identifies possible partial supersession, not wholesale obsolescence of this record.

### 20260924221449 — add_membership_launch_checks

[Exact SQL](../../supabase/recovery/history/20260924221449_add_membership_launch_checks.sql); SHA-256 `9e5f7c04db2a560073445401bc73f7f48b08c7769ecfe9a9faaa7cf4e5272944`.

Statement inventory: CreateFunctionStmt=2.

- Function: `private.admin_get_membership_tier_gate_impl`, `public.admin_get_production_launch_gate`.

Historical function bodies superseded/changed or absent: `public.admin_get_production_launch_gate`. Use the captured current definition; do not reapply this historical body.

Later recorded target overlap: `20260925025111_add_digital_book_launch_readiness`. Overlap identifies possible partial supersession, not wholesale obsolescence of this record.

### 20260924230504 — guard_concurrent_guardian_decisions

[Exact SQL](../../supabase/recovery/history/20260924230504_guard_concurrent_guardian_decisions.sql); SHA-256 `e0396a9873d6d427f2f33ac92cd02fe2ff63170fcdbdc94e3dd7bcf89051b18a`.

Statement inventory: CreateFunctionStmt=2.

- Function: `public.approve_parent_challenge`, `public.return_parent_challenge`.

Later recorded target overlap: none. Overlap identifies possible partial supersession, not wholesale obsolescence of this record.

### 20260924234414 — secure_family_event_registration

[Exact SQL](../../supabase/recovery/history/20260924234414_secure_family_event_registration.sql); SHA-256 `9116c7e7d45fb6208ae78ca7ba73ccbeeb29b7fe8b0472561289e394746568ab`.

Statement inventory: CreateFunctionStmt=4, GrantStmt=8.

- Function: `private.cancel_event_registration_impl`, `private.register_for_event_impl`, `public.cancel_event_registration`, `public.register_for_event`.

Historical function bodies superseded/changed or absent: `private.register_for_event_impl`. Use the captured current definition; do not reapply this historical body.

Later recorded target overlap: `20260925120823_scope_child_household_premium_access`, `20260925122342_scope_event_registration_audience`. Overlap identifies possible partial supersession, not wholesale obsolescence of this record.

### 20260925004449 — family_faith_whole_household_uniqueness

[Exact SQL](../../supabase/recovery/history/20260925004449_family_faith_whole_household_uniqueness.sql); SHA-256 `d80550faa43a775b3ca79fbc1cd4d1d9863029039d549b3b66c3398bf04bcc52`.

Statement inventory: AlterTableStmt=1, VariableSetStmt=1.

- Table: `public.household_faith_sessions`.
- Constraint: `public.household_faith_sessions.household_faith_sessions_household_id_family_faith_guide_id_key`.

Later recorded target overlap: none. Overlap identifies possible partial supersession, not wholesale obsolescence of this record.

### 20260925011427 — harden_guardian_group_membership

[Exact SQL](../../supabase/recovery/history/20260925011427_harden_guardian_group_membership.sql); SHA-256 `74a642aaa9563d523a8972b599e1e414378d6d3f124568c98ca72b57f7efca1e`.

Statement inventory: CreateFunctionStmt=2, CreatePolicyStmt=1, DropStmt=2, GrantStmt=9, VariableSetStmt=1.

- Policy: `public.child_group_memberships.child_group_memberships_update`.
- Function: `private.join_child_to_group_impl`, `public.withdraw_child_from_group`.

Later recorded target overlap: none. Overlap identifies possible partial supersession, not wholesale obsolescence of this record.

### 20260925013210 — enforce_activity_completion_access

[Exact SQL](../../supabase/recovery/history/20260925013210_enforce_activity_completion_access.sql); SHA-256 `2a4c3eb9131f050339e1d177788f7b4a1c7f84dda657ed4f94be5256a366da9f`.

Statement inventory: CreateFunctionStmt=1, CreatePolicyStmt=2, DropStmt=2, GrantStmt=2, VariableSetStmt=1.

- Policy: `public.child_content_progress.child_content_progress_insert`, `public.child_content_progress.child_content_progress_update`.
- Function: `private.can_record_child_activity`.

Later recorded target overlap: none. Overlap identifies possible partial supersession, not wholesale obsolescence of this record.

### 20260925015358 — add_protected_digital_book_reader

[Exact SQL](../../supabase/recovery/history/20260925015358_add_protected_digital_book_reader.sql); SHA-256 `10dd3258075838993516fc34ec0f1ee7cedf70783118849114f6f485f9a06a87`.

Statement inventory: AlterTableStmt=1, CreateFunctionStmt=9, CreatePolicyStmt=3, CreateStmt=1, CreateTrigStmt=1, GrantStmt=4, IndexStmt=1, InsertStmt=1.

- Table: `public.child_book_reading_positions`.
- Index: `public.child_book_reading_positions_book_idx`.
- Trigger: `public.books.validate_digital_book_manifest`.
- Policy: `public.child_book_reading_positions.dc_read_own_book_position`, `storage.objects.dc_digital_book_read`, `storage.objects.dc_digital_book_upload`.
- Function: `private.child_has_digital_book_access`, `private.digital_book_manifest_valid`, `private.digital_book_object_readable`, `private.digital_book_released`, `private.get_digital_book_impl`, `private.save_digital_book_position_impl`, `private.validate_digital_book_manifest`, `public.get_digital_book`, `public.save_digital_book_position`.

Historical function bodies superseded/changed or absent: `private.validate_digital_book_manifest`, `private.digital_book_released`, `private.digital_book_object_readable`, `private.get_digital_book_impl`, `private.save_digital_book_position_impl`. Use the captured current definition; do not reapply this historical body.

Later recorded target overlap: `20260925020034_protect_digital_book_manifest_text`, `20260925023737_include_reading_positions_in_privacy`. Overlap identifies possible partial supersession, not wholesale obsolescence of this record.

### 20260925020034 — protect_digital_book_manifest_text

[Exact SQL](../../supabase/recovery/history/20260925020034_protect_digital_book_manifest_text.sql); SHA-256 `dc8eb28c79a0e775a33e5c0cb70273da11882fbc7a5efac01986a8acedccbbbd`.

Statement inventory: CreateFunctionStmt=7, CreateStmt=1, GrantStmt=3.

- Table: `private.digital_book_manifests`.
- Function: `private.admin_prepare_digital_book_impl`, `private.digital_book_object_readable`, `private.digital_book_released`, `private.get_digital_book_impl`, `private.save_digital_book_position_impl`, `private.validate_digital_book_manifest`, `public.admin_prepare_digital_book`.

Later recorded target overlap: `20260925021110_add_digital_edition_review_access`. Overlap identifies possible partial supersession, not wholesale obsolescence of this record.

### 20260925021110 — add_digital_edition_review_access

[Exact SQL](../../supabase/recovery/history/20260925021110_add_digital_edition_review_access.sql); SHA-256 `eacd9b1917a592d66fbf6235d4874b7831361c1e5c0de1aa5edb0ce60501e723`.

Statement inventory: AlterTableStmt=1, CreateFunctionStmt=2, GrantStmt=2.

- Table: `private.digital_book_manifests`.
- Constraint: `private.digital_book_manifests.digital_book_revision_is_string`.
- Function: `private.admin_get_digital_book_impl`, `public.admin_get_digital_book`.

Later recorded target overlap: none. Overlap identifies possible partial supersession, not wholesale obsolescence of this record.

### 20260925023737 — include_reading_positions_in_privacy

[Exact SQL](../../supabase/recovery/history/20260925023737_include_reading_positions_in_privacy.sql); SHA-256 `4f622f794d91fdb81d7e2e8256f7a798c48a7c7d7c9ac1e3f6e9df0ba61778a3`.

Statement inventory: CreateFunctionStmt=1, CreatePolicyStmt=1, DropStmt=1, ViewStmt=1.

- View: `public.child_data_inventory`.
- Policy: `public.child_book_reading_positions.dc_read_own_book_position`.
- Function: `private.privacy_export_payload_impl`.

Later recorded target overlap: none. Overlap identifies possible partial supersession, not wholesale obsolescence of this record.

### 20260925025111 — add_digital_book_launch_readiness

[Exact SQL](../../supabase/recovery/history/20260925025111_add_digital_book_launch_readiness.sql); SHA-256 `b9b6aa41cc433526ce606fb5dbe473fc22348999f66ddc01d15dc1dcd3f657cb`.

Statement inventory: CreateFunctionStmt=2, GrantStmt=2.

- Function: `private.admin_get_digital_book_launch_gate_impl`, `public.admin_get_production_launch_gate`.

Later recorded target overlap: none. Overlap identifies possible partial supersession, not wholesale obsolescence of this record.

### 20260925111607 — fix_household_onboarding_returning

[Exact SQL](../../supabase/recovery/history/20260925111607_fix_household_onboarding_returning.sql); SHA-256 `d648fb8060b8bb848ed89e5f3ffc5359c47d6fb35063fec20b2e2d91846d4183`.

Statement inventory: CreateFunctionStmt=1.

- Function: `public.create_household_with_consent`.

Later recorded target overlap: none. Overlap identifies possible partial supersession, not wholesale obsolescence of this record.

### 20260925120823 — scope_child_household_premium_access

[Exact SQL](../../supabase/recovery/history/20260925120823_scope_child_household_premium_access.sql); SHA-256 `cf7fac0e94109050281a032a9d95c47148c434912e7213658c5e22ad5aa45700`.

Statement inventory: CreateFunctionStmt=10, CreateTrigStmt=3, DropStmt=3, GrantStmt=9.

- Trigger: `public.child_adventure_progress.enforce_child_adventure_access`, `public.child_book_progress.enforce_child_book_access`, `public.child_challenge_progress.enforce_child_challenge_access`.
- Function: `private.child_can_access_adventure`, `private.child_can_access_challenge`, `private.child_has_book_companion_access`, `private.enforce_child_adventure_access`, `private.enforce_child_book_access`, `private.enforce_child_challenge_access`, `private.household_has_active_entitlement`, `private.process_adventure_completion`, `private.process_challenge_completion`, `private.register_for_event_impl`.

Historical function bodies superseded/changed or absent: `private.register_for_event_impl`. Use the captured current definition; do not reapply this historical body.

Later recorded target overlap: `20260925122342_scope_event_registration_audience`. Overlap identifies possible partial supersession, not wholesale obsolescence of this record.

### 20260925122342 — scope_event_registration_audience

[Exact SQL](../../supabase/recovery/history/20260925122342_scope_event_registration_audience.sql); SHA-256 `371df7c8ddb261bcd53a81fc7b7b16635436a1aa7ba1b702501dd2de9f62d673`.

Statement inventory: CreateFunctionStmt=2, GrantStmt=2.

- Function: `private.event_audience_allows_registration`, `private.register_for_event_impl`.

Later recorded target overlap: none. Overlap identifies possible partial supersession, not wholesale obsolescence of this record.

### 20260925124058 — family_activity_participants

[Exact SQL](../../supabase/recovery/history/20260925124058_family_activity_participants.sql); SHA-256 `de2367b204b79b7e59183b5af59fb8d9113f0355f2ed02ca57d8559a79a4aa2e`.

Statement inventory: CreateFunctionStmt=2, GrantStmt=4.

- Function: `public.complete_family_faith_participants`, `public.save_family_challenge_participants`.

Later recorded target overlap: none. Overlap identifies possible partial supersession, not wholesale obsolescence of this record.

### 20260925131404 — protect_direct_family_faith_credit

[Exact SQL](../../supabase/recovery/history/20260925131404_protect_direct_family_faith_credit.sql); SHA-256 `dc6eb4e9eed2f4161baa19f707265270b981e00f6945555ef1fd93ff99a69f6c`.

Statement inventory: AlterPolicyStmt=1.

- Policy: `public.household_faith_sessions.household_faith_sessions_insert`.

Later recorded target overlap: none. Overlap identifies possible partial supersession, not wholesale obsolescence of this record.

### 20260925133014 — validate_payment_checkout_under_lock

[Exact SQL](../../supabase/recovery/history/20260925133014_validate_payment_checkout_under_lock.sql); SHA-256 `5fbee7f7031a0d5e34a52ce48de3875351b5ca6ce234382157043f1548f91e1f`.

Statement inventory: CreateFunctionStmt=1.

- Function: `public.mark_order_paid_from_provider`.

Later recorded target overlap: none. Overlap identifies possible partial supersession, not wholesale obsolescence of this record.

### 20260926212852 — guardian_pin_and_rpc_security_repair

[Exact SQL](../../supabase/recovery/history/20260926212852_guardian_pin_and_rpc_security_repair.sql); SHA-256 `249e3b9103f0e0905cbd641a2f43966e6e2362ab92e8b23d9d8c83be7e51153b`.

Statement inventory: CreateFunctionStmt=6, GrantStmt=7, VariableSetStmt=4.

- Function: `private.award_completed_book_adventure`, `private.create_guardian_unlock_session_impl`, `private.guardian_unlock_session_valid`, `private.verify_guardian_pin_impl`, `public.complete_child_book_adventure`, `public.revoke_guardian_unlock_sessions`.

Later recorded target overlap: none. Overlap identifies possible partial supersession, not wholesale obsolescence of this record.

## Current objects without a recorded CREATE

Their definitions are recovered from the live catalog. The original creation chronology is unresolved; no fake historical migration was invented.

Tables (70): `private.group_join_codes`, `private.guardian_unlock_sessions`, `private.household_invitation_tokens`, `private.organization_invitation_tokens`, `private.system_secret_hashes`, `private.worker_auth_tokens`, `public.adventure_groups`, `public.app_installations`, `public.automated_notification_log`, `public.book_challenges`, `public.book_devotional_series`, `public.book_identity_truths`, `public.book_power_verses`, `public.book_prayer_prompts`, `public.book_reward_rules`, `public.checkout_sessions`, `public.child_book_progress`, `public.child_content_progress`, `public.child_devotional_progress`, `public.child_group_memberships`, `public.child_identity_progress`, `public.child_prayer_progress`, `public.child_scripture_progress`, `public.consent_policies`, `public.data_privacy_requests`, `public.dc_blueprint_requirements`, `public.dc_brand_assets`, `public.dc_character_profiles`, `public.dc_content_blueprints`, `public.dc_content_reviews`, `public.dc_governance_rules`, `public.dc_governance_standards`, `public.delivery_worker_runs`, `public.devotional_days`, `public.devotional_series`, `public.event_registrations`, `public.events`, `public.family_faith_guides`, `public.fulfillments`, `public.group_challenge_assignments`, `public.group_leaders`, `public.household_faith_sessions`, `public.household_invitations`, `public.identity_truths`, `public.integration_events`, `public.integration_providers`, `public.integration_test_runs`, `public.inventory_reservations`, `public.notification_campaign_recipients`, `public.notification_campaigns`, `public.notification_deliveries`, `public.notification_reminder_rules`, `public.notification_templates`, `public.order_items`, `public.orders`, `public.organization_invitations`, `public.organization_members`, `public.organizations`, `public.payment_webhook_events`, `public.power_verses`, `public.prayer_prompts`, `public.product_book_access_rules`, `public.product_entitlement_rules`, `public.product_variants`, `public.products`, `public.promo_codes`, `public.referral_attributions`, `public.referral_codes`, `public.scripture_passages`, `public.support_tickets`.

Functions (131): `private.accept_household_invitation_impl`, `private.accept_organization_invitation_impl`, `private.admin_daily_metrics_impl`, `private.admin_get_production_launch_gate_impl`, `private.admin_platform_snapshot_impl`, `private.after_token_insert_evaluate_badges`, `private.after_xp_insert_evaluate_badges`, `private.attribute_referral_impl`, `private.award_xp_event`, `private.can_approve_dc_governance`, `private.can_lead_group`, `private.can_manage_event`, `private.can_manage_org`, `private.can_manage_privacy_requests`, `private.can_schedule_notifications`, `private.can_view_event`, `private.claim_marketing_leads_for_household_impl`, `private.create_group_join_code_impl`, `private.create_household_invitation_impl`, `private.create_organization_invitation_impl`, `private.dc_entity_fingerprint`, `private.dc_entity_payload`, `private.dc_row_fingerprint`, `private.demote_changed_dc_content`, `private.demote_changed_dc_product`, `private.demote_changed_notification_template`, `private.dispatch_automated_notification_reminders`, `private.dispatch_due_notification_campaigns`, `private.enforce_dc_prayer_opening`, `private.enforce_dc_publish_gate`, `private.expire_checkout_sessions`, `private.get_group_progress_summary_impl`, `private.get_group_roster_impl`, `private.get_household_adults_impl`, `private.get_or_create_referral_code_impl`, `private.has_approved_dc_review`, `private.household_is_paid_member`, `private.initialize_organization`, `private.invoke_notification_delivery_worker`, `private.is_org_member`, `private.notification_audience_count_impl`, `private.notification_next_delivery_at`, `private.notification_preference_allows`, `private.notify_pending_parent_challenge`, `private.preview_group_join_code_impl`, `private.preview_organization_invitation_impl`, `private.process_book_progress`, `private.process_content_completed`, `private.process_devotional_completed`, `private.process_family_faith_session`, `private.process_paid_order_access`, `private.process_prayer_completed`, `private.process_scripture_memorized`, `private.queue_external_notification_delivery`, `private.unlock_book_milestone_rewards`, `private.user_has_book_access`, `private.validate_notification_reminder_scope`, `public.accept_household_invitation`, `public.accept_organization_invitation`, `public.admin_add_devotional_day`, `public.admin_cancel_notification_campaign`, `public.admin_create_book`, `public.admin_create_challenge_series`, `public.admin_create_content_item`, `public.admin_create_devotional_series`, `public.admin_create_family_faith_guide`, `public.admin_create_identity_truth`, `public.admin_create_lifetime_badge_level`, `public.admin_create_notification_reminder_rule`, `public.admin_create_notification_template`, `public.admin_create_organization`, `public.admin_create_power_verse`, `public.admin_create_prayer_prompt`, `public.admin_create_product`, `public.admin_create_product_variant`, `public.admin_create_promo_code`, `public.admin_create_scripture`, `public.admin_create_series_streak_badge`, `public.admin_create_weekly_challenge`, `public.admin_get_daily_metrics`, `public.admin_get_platform_snapshot`, `public.admin_link_book_experience`, `public.admin_link_book_reward`, `public.admin_preview_notification_audience`, `public.admin_schedule_notification_campaign`, `public.admin_set_order_status`, `public.approve_dc_content_review`, `public.archive_child_profile`, `public.attribute_referral`, `public.begin_checkout_provider_handoff`, `public.cancel_checkout_session`, `public.cancel_data_privacy_request`, `public.cancel_organization_invitation`, `public.capture_marketing_lead`, `public.claim_marketing_leads_for_household`, `public.claim_notification_deliveries`, `public.complete_notification_delivery`, `public.create_adventure_group`, `public.create_checkout_order`, `public.create_child_with_consent`, `public.create_group_join_code`, `public.create_guardian_unlock_session`, `public.create_household_invitation`, `public.create_organization_invitation`, `public.dc_preflight_scan`, `public.deactivate_app_installation`, `public.get_checkout_readiness`, `public.get_child_achievement_progress`, `public.get_child_book_adventure_steps`, `public.get_child_book_adventure_summary`, `public.get_group_progress_summary`, `public.get_group_roster`, `public.get_household_adults`, `public.get_notification_delivery_payload`, `public.get_or_create_referral_code`, `public.join_child_to_group`, `public.preview_group_join_code`, `public.preview_organization_invitation`, `public.privacy_export_payload`, `public.publish_dc_entity`, `public.record_household_consent`, `public.record_integration_event`, `public.register_app_installation`, `public.remove_household_adult`, `public.request_data_privacy_action`, `public.request_dc_content_review`, `public.restore_child_profile`, `public.revoke_household_invitation`, `public.update_integration_provider_health`, `public.validate_worker_token`, `public.verify_privacy_cleanup_secret`.
