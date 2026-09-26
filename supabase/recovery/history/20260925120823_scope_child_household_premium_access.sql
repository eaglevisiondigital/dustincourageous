-- Scope child actions and earned benefits to the selected household.
-- Catalog visibility may still aggregate the guardian's households.
create or replace function private.household_has_active_entitlement(p_household_id uuid, p_entitlement_key text)
returns boolean language sql stable security definer set search_path = ''
as $$
  select (select auth.uid()) is not null
    and private.can_manage_household(p_household_id)
    and (
      exists (select 1 from public.household_subscriptions hs
        join public.plan_entitlements pe on pe.plan_id=hs.plan_id
        where hs.household_id=p_household_id
          and hs.status in ('trialing','active','comped')
          and (hs.current_period_end is null or hs.current_period_end>now())
          and pe.entitlement_key=p_entitlement_key)
      or exists (select 1 from public.household_entitlement_grants g
        where g.household_id=p_household_id and g.entitlement_key=p_entitlement_key
          and g.starts_at<=now() and (g.ends_at is null or g.ends_at>now()))
    );
$$;
revoke all on function private.household_has_active_entitlement(uuid,text) from public, anon;
grant execute on function private.household_has_active_entitlement(uuid,text) to authenticated;

create or replace function private.child_has_book_companion_access(p_child_profile_id uuid, p_book_id uuid)
returns boolean language sql stable security definer set search_path = ''
as $$
  select (select auth.uid()) is not null and private.can_manage_child(p_child_profile_id)
    and exists (select 1 from public.child_profiles cp
      where cp.id=p_child_profile_id and cp.status='active'
        and (private.is_app_admin()
          or private.household_has_active_entitlement(cp.household_id,'book_companions')
          or exists (select 1 from public.household_book_access a
            where a.household_id=cp.household_id and a.book_id=p_book_id
              and a.starts_at<=now() and (a.ends_at is null or a.ends_at>now()))));
$$;
revoke all on function private.child_has_book_companion_access(uuid,uuid) from public, anon;
grant execute on function private.child_has_book_companion_access(uuid,uuid) to authenticated;

create or replace function private.child_can_access_challenge(p_child_profile_id uuid, p_challenge_id uuid)
returns boolean language sql stable security definer set search_path = ''
as $$
  select (select auth.uid()) is not null and private.can_manage_child(p_child_profile_id)
    and exists (select 1 from public.child_profiles cp
      join public.challenges c on c.id=p_challenge_id
      where cp.id=p_child_profile_id and cp.status='active'
        and (private.is_app_admin() or (
          c.status='published'
          and (c.available_from is null or c.available_from<=now())
          and (c.available_until is null or c.available_until>now())
          and (c.access_level in ('free','member')
            or (c.access_level='premium'
              and private.household_has_active_entitlement(cp.household_id,'full_challenge_library'))))));
$$;
revoke all on function private.child_can_access_challenge(uuid,uuid) from public, anon;
grant execute on function private.child_can_access_challenge(uuid,uuid) to authenticated;

CREATE OR REPLACE FUNCTION private.enforce_child_book_access()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
begin
  if (select auth.uid()) is not null
    and not private.child_has_book_companion_access(new.child_profile_id, new.book_id)
  then
    raise exception 'Book companion access required';
  end if;

  return new;
end;
$function$;

CREATE OR REPLACE FUNCTION private.enforce_child_challenge_access()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
begin
  if (select auth.uid()) is not null
    and not private.child_can_access_challenge(new.child_profile_id, new.challenge_id)
  then
    raise exception 'Challenge access required';
  end if;

  return new;
end;
$function$;

CREATE OR REPLACE FUNCTION private.process_adventure_completion()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_xp integer;
  v_title text;
  v_household_id uuid;
  v_total_xp bigint;
begin
  if new.status <> 'completed' or (tg_op = 'UPDATE' and old.status = 'completed') then
    return new;
  end if;

  select a.completion_xp, a.title, cp.household_id
    into v_xp, v_title, v_household_id
  from public.adventures a
  join public.child_profiles cp on cp.id = new.child_profile_id
  where a.id = new.adventure_id;

  if new.completed_at is null then
    update public.child_adventure_progress
      set completed_at = now()
    where id = new.id and completed_at is null;
  end if;

  if coalesce(v_xp, 0) > 0 then
    insert into public.xp_ledger
      (child_profile_id, points, event_type, source_type, source_id, description)
    values
      (new.child_profile_id, v_xp, 'adventure_completed', 'adventure', new.adventure_id, v_title)
    on conflict do nothing;
  end if;

  insert into public.child_activity_events
    (child_profile_id, household_id, event_type, title, description, source_type, source_id, xp_delta)
  values
    (new.child_profile_id, v_household_id, 'adventure_completed',
     'Adventure completed', v_title, 'adventure', new.adventure_id, coalesce(v_xp,0));

  select coalesce(sum(points), 0)
    into v_total_xp
  from public.xp_ledger
  where child_profile_id = new.child_profile_id;

  insert into public.reward_unlocks
    (child_profile_id, reward_id, unlock_source, source_id)
  select
    new.child_profile_id,
    r.id,
    'xp_threshold',
    new.adventure_id
  from public.rewards r
  where r.is_active = true
    and r.xp_required is not null
    and r.xp_required <= v_total_xp
    and (
      r.access_level in ('free','member')
      or (r.access_level = 'premium' and private.household_has_active_entitlement(v_household_id, 'rewards_redemption'))
    )
  on conflict (child_profile_id, reward_id) do nothing;

  return new;
end;
$function$;

CREATE OR REPLACE FUNCTION private.process_challenge_completion()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_xp integer;
  v_title text;
  v_household_id uuid;
  v_total_xp bigint;
  v_today date := current_date;
begin
  if new.status <> 'completed' or (tg_op = 'UPDATE' and old.status = 'completed') then
    return new;
  end if;

  select c.xp_reward, c.title, cp.household_id
    into v_xp, v_title, v_household_id
  from public.challenges c
  join public.child_profiles cp on cp.id = new.child_profile_id
  where c.id = new.challenge_id;

  if v_xp is null then
    return new;
  end if;

  if v_xp > 0 then
    insert into public.xp_ledger
      (child_profile_id, points, event_type, source_type, source_id, description)
    values
      (new.child_profile_id, v_xp, 'challenge_completed', 'challenge', new.challenge_id, v_title)
    on conflict do nothing;
  end if;

  insert into public.child_activity_events
    (child_profile_id, household_id, event_type, title, description, source_type, source_id, xp_delta)
  values
    (new.child_profile_id, v_household_id, 'challenge_completed',
     'Challenge completed', v_title, 'challenge', new.challenge_id, v_xp);

  insert into public.child_streaks
    (child_profile_id, streak_key, current_count, best_count, last_activity_date)
  values
    (new.child_profile_id, 'challenge_completion', 1, 1, v_today)
  on conflict (child_profile_id, streak_key) do update
  set current_count =
        case
          when public.child_streaks.last_activity_date = v_today then public.child_streaks.current_count
          when public.child_streaks.last_activity_date = v_today - 1 then public.child_streaks.current_count + 1
          else 1
        end,
      best_count =
        greatest(
          public.child_streaks.best_count,
          case
            when public.child_streaks.last_activity_date = v_today then public.child_streaks.current_count
            when public.child_streaks.last_activity_date = v_today - 1 then public.child_streaks.current_count + 1
            else 1
          end
        ),
      last_activity_date = v_today,
      updated_at = now();

  select coalesce(sum(points), 0)
    into v_total_xp
  from public.xp_ledger
  where child_profile_id = new.child_profile_id;

  insert into public.reward_unlocks
    (child_profile_id, reward_id, unlock_source, source_id)
  select
    new.child_profile_id,
    r.id,
    'xp_threshold',
    new.challenge_id
  from public.rewards r
  where r.is_active = true
    and r.xp_required is not null
    and r.xp_required <= v_total_xp
    and (
      r.access_level in ('free','member')
      or (r.access_level = 'premium' and private.household_has_active_entitlement(v_household_id, 'rewards_redemption'))
    )
  on conflict (child_profile_id, reward_id) do nothing;

  insert into public.user_notifications
    (user_id, household_id, child_profile_id, notification_type, title, body, deep_link, metadata)
  select
    hm.user_id,
    v_household_id,
    new.child_profile_id,
    'child_challenge_completed',
    'Challenge completed!',
    coalesce(cp.display_name, 'Your child') || ' completed ' || v_title || '.',
    '/family/children/' || new.child_profile_id::text,
    jsonb_build_object('challenge_id', new.challenge_id, 'xp_awarded', v_xp)
  from public.household_members hm
  join public.child_profiles cp on cp.id = new.child_profile_id
  where hm.household_id = v_household_id
    and hm.status = 'active'
    and hm.role in ('owner','parent','guardian');

  return new;
end;
$function$;


-- Reassigning progress to another managed child must recheck that child's access.
drop trigger if exists enforce_child_book_access on public.child_book_progress;
create trigger enforce_child_book_access
before insert or update of child_profile_id,book_id,status on public.child_book_progress
for each row execute function private.enforce_child_book_access();
drop trigger if exists enforce_child_challenge_access on public.child_challenge_progress;
create trigger enforce_child_challenge_access
before insert or update of child_profile_id,challenge_id,status on public.child_challenge_progress
for each row execute function private.enforce_child_challenge_access();

CREATE OR REPLACE FUNCTION private.register_for_event_impl(p_event_id uuid, p_household_id uuid, p_child_profile_id uuid DEFAULT NULL::uuid)
 RETURNS text
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_capacity integer;
  v_registered bigint;
  v_status text;
begin
  if (select auth.uid()) is null or not private.can_manage_household(p_household_id) then
    raise exception 'Guardian household access required';
  end if;
  if not private.can_view_event(p_event_id) then
    raise exception 'Event is not available';
  end if;
  if exists (select 1 from public.events where id=p_event_id and access_level='premium')
    and not private.is_app_admin()
    and not private.household_has_active_entitlement(p_household_id,'premium_content')
  then raise exception 'This household requires premium event access'; end if;
  if p_child_profile_id is not null and not exists (
    select 1 from public.child_profiles where id=p_child_profile_id and household_id=p_household_id and status='active'
  ) then raise exception 'Child does not belong to this household'; end if;

  -- All registrations for one event serialize on this row. No roster data is
  -- returned to the caller, even though capacity includes other households.
  select capacity into v_capacity from public.events
  where id=p_event_id and status='published' and starts_at>now() for update;
  if not found then raise exception 'Event registration is closed'; end if;

  select status into v_status from public.event_registrations
  where event_id=p_event_id and household_id=p_household_id
    and child_profile_id is not distinct from p_child_profile_id;
  if found and v_status in ('registered','waitlist','attended') then return v_status; end if;

  select count(*) into v_registered from public.event_registrations
  where event_id=p_event_id and status in ('registered','attended');
  v_status:=case when v_capacity is null or v_registered<v_capacity then 'registered' else 'waitlist' end;
  if p_child_profile_id is null then
    insert into public.event_registrations(event_id,household_id,child_profile_id,registered_by,status)
    values(p_event_id,p_household_id,null,(select auth.uid()),v_status)
    on conflict(event_id,household_id) where child_profile_id is null do update
      set status=excluded.status,registered_by=excluded.registered_by,registered_at=now(),canceled_at=null;
  else
    insert into public.event_registrations(event_id,household_id,child_profile_id,registered_by,status)
    values(p_event_id,p_household_id,p_child_profile_id,(select auth.uid()),v_status)
    on conflict(event_id,child_profile_id) where child_profile_id is not null do update
      set status=excluded.status,registered_by=excluded.registered_by,registered_at=now(),canceled_at=null;
  end if;
  return v_status;
end;
$function$;

-- Adventure progress previously had only child ownership RLS, with no content gate.
create or replace function private.child_can_access_adventure(p_child_profile_id uuid, p_adventure_id uuid)
returns boolean language sql stable security definer set search_path = ''
as $$
  select (select auth.uid()) is not null and private.can_manage_child(p_child_profile_id)
    and exists (select 1 from public.child_profiles cp
      join public.adventures a on a.id=p_adventure_id
      where cp.id=p_child_profile_id and cp.status='active'
        and (private.is_app_admin() or (
          a.status='published'
          and (a.available_from is null or a.available_from<=now())
          and (a.available_until is null or a.available_until>now())
          and (a.access_level in ('free','member')
            or (a.access_level='premium'
              and private.household_has_active_entitlement(cp.household_id,'premium_content'))))));
$$;
revoke all on function private.child_can_access_adventure(uuid,uuid) from public, anon;
grant execute on function private.child_can_access_adventure(uuid,uuid) to authenticated;
create or replace function private.enforce_child_adventure_access()
returns trigger language plpgsql security definer set search_path = ''
as $$
begin
  if (select auth.uid()) is not null
    and not private.child_can_access_adventure(new.child_profile_id,new.adventure_id)
  then raise exception 'Adventure access required'; end if;
  return new;
end;
$$;
revoke all on function private.enforce_child_adventure_access() from public, anon;
drop trigger if exists enforce_child_adventure_access on public.child_adventure_progress;
create trigger enforce_child_adventure_access
before insert or update of child_profile_id,adventure_id,status on public.child_adventure_progress
for each row execute function private.enforce_child_adventure_access();
