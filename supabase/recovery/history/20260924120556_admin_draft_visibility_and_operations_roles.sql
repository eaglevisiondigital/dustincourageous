
create or replace function private.is_operations_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.app_admins aa
    where aa.user_id = (select auth.uid())
      and aa.status = 'active'
      and aa.role in ('super_admin','operations_admin')
  );
$$;

revoke all on function private.is_operations_admin() from public;
grant execute on function private.is_operations_admin() to authenticated;

drop policy if exists reward_redemptions_admin_update on public.reward_redemptions;
create policy reward_redemptions_admin_update
on public.reward_redemptions for update
to authenticated
using (private.is_operations_admin())
with check (private.is_operations_admin());

create policy books_admin_select_all
on public.books for select
to authenticated
using (private.is_app_admin());

create policy content_items_admin_select_all
on public.content_items for select
to authenticated
using (private.is_app_admin());

create policy book_content_links_admin_select_all
on public.book_content_links for select
to authenticated
using (private.is_app_admin());

create policy adventures_admin_select_all
on public.adventures for select
to authenticated
using (private.is_app_admin());

create policy adventure_content_links_admin_select_all
on public.adventure_content_links for select
to authenticated
using (private.is_app_admin());

create policy challenges_admin_select_all
on public.challenges for select
to authenticated
using (private.is_app_admin());

create policy challenge_steps_admin_select_all
on public.challenge_steps for select
to authenticated
using (private.is_app_admin());

create policy adventure_challenges_admin_select_all
on public.adventure_challenges for select
to authenticated
using (private.is_app_admin());

create policy levels_admin_select_all
on public.levels for select
to authenticated
using (private.is_app_admin());

create policy badges_admin_select_all
on public.badges for select
to authenticated
using (private.is_app_admin());

create policy badge_rules_admin_select_all
on public.badge_rules for select
to authenticated
using (private.is_app_admin());

create policy rewards_admin_select_all
on public.rewards for select
to authenticated
using (private.is_app_admin());

create policy reward_redemptions_admin_select_all
on public.reward_redemptions for select
to authenticated
using (private.is_app_admin());

create policy household_subscriptions_admin_select_all
on public.household_subscriptions for select
to authenticated
using (private.is_app_admin());

create policy household_entitlement_grants_admin_select_all
on public.household_entitlement_grants for select
to authenticated
using (private.is_app_admin());

create policy household_consents_admin_select_all
on public.household_consents for select
to authenticated
using (private.is_app_admin());

grant select on public.reward_redemptions to authenticated;
