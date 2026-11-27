set lock_timeout = '5s';

create or replace function private.can_record_child_activity(p_child_id uuid,p_content_id uuid)
returns boolean language sql stable security definer set search_path='' as $$
  select (select auth.uid()) is not null
    and private.can_manage_child(p_child_id)
    and exists (
      select 1 from public.child_profiles cp
      join public.content_items ci on ci.id=p_content_id
      where cp.id=p_child_id and cp.status='active'
        and ci.status='published'
        and (ci.available_from is null or ci.available_from<=now())
        and (ci.available_until is null or ci.available_until>now())
        and (
          ci.access_level in ('free','member')
          or (ci.access_level='premium' and (
            exists (
              select 1 from public.household_subscriptions hs
              join public.plan_entitlements pe on pe.plan_id=hs.plan_id
              where hs.household_id=cp.household_id
                and hs.status in ('trialing','active','comped')
                and (hs.current_period_end is null or hs.current_period_end>now())
                and pe.entitlement_key='premium_content'
            ) or exists (
              select 1 from public.household_entitlement_grants heg
              where heg.household_id=cp.household_id and heg.entitlement_key='premium_content'
                and heg.starts_at<=now() and (heg.ends_at is null or heg.ends_at>now())
            )
          ))
        )
    );
$$;
revoke all on function private.can_record_child_activity(uuid,uuid) from public,anon;
grant execute on function private.can_record_child_activity(uuid,uuid) to authenticated;

drop policy if exists child_content_progress_insert on public.child_content_progress;
create policy child_content_progress_insert on public.child_content_progress
for insert to authenticated
with check (private.can_record_child_activity(child_profile_id,content_item_id));

drop policy if exists child_content_progress_update on public.child_content_progress;
create policy child_content_progress_update on public.child_content_progress
for update to authenticated
using (private.can_manage_child(child_profile_id))
with check (private.can_record_child_activity(child_profile_id,content_item_id));
