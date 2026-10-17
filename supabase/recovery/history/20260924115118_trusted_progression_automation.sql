
create unique index if not exists xp_ledger_unique_source_event
  on public.xp_ledger(child_profile_id, event_type, source_type, source_id)
  where source_id is not null;

create or replace function private.initialize_household()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_free_plan_id uuid;
begin
  if new.created_by is null then
    raise exception 'Household creator is required';
  end if;

  insert into public.household_members (household_id, user_id, role, status)
  values (new.id, new.created_by, 'owner', 'active')
  on conflict (household_id, user_id) do nothing;

  select id into v_free_plan_id
  from public.membership_plans
  where plan_key = 'free' and is_active = true
  limit 1;

  if v_free_plan_id is not null then
    insert into public.household_subscriptions
      (household_id, plan_id, status, provider, metadata)
    select new.id, v_free_plan_id, 'active', null, '{"system_assigned":true}'::jsonb
    where not exists (
      select 1 from public.household_subscriptions hs
      where hs.household_id = new.id
    );
  end if;

  insert into public.notification_preferences (user_id, timezone)
  values (new.created_by, new.timezone)
  on conflict (user_id) do nothing;

  return new;
end;
$$;

revoke all on function private.initialize_household() from public, anon, authenticated;

drop trigger if exists households_initialize_after_insert on public.households;
create trigger households_initialize_after_insert
after insert on public.households
for each row execute function private.initialize_household();

create or replace function private.validate_challenge_completion()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_required integer;
  v_completed integer;
  v_parent_approval boolean;
begin
  if new.status = 'completed' and (tg_op = 'INSERT' or old.status is distinct from 'completed') then
    select parent_approval_required
      into v_parent_approval
    from public.challenges
    where id = new.challenge_id;

    select count(*)
      into v_required
    from public.challenge_steps
    where challenge_id = new.challenge_id
      and is_required = true;

    if v_required > 0 then
      select count(*)
        into v_completed
      from public.child_step_progress csp
      join public.challenge_steps cs
        on cs.id = csp.challenge_step_id
      where csp.child_challenge_progress_id = new.id
        and cs.challenge_id = new.challenge_id
        and cs.is_required = true
        and csp.completed = true;

      if v_completed < v_required then
        raise exception 'Required challenge steps are incomplete';
      end if;
    end if;

    if v_parent_approval then
      if not private.can_manage_child(new.child_profile_id) then
        raise exception 'Guardian approval is required';
      end if;
      new.approved_by := (select auth.uid());
      new.approved_at := now();
    end if;

    if new.completed_at is null then
      new.completed_at := now();
    end if;
  end if;

  return new;
end;
$$;

revoke all on function private.validate_challenge_completion() from public, anon, authenticated;

drop trigger if exists challenge_progress_validate_completion on public.child_challenge_progress;
create trigger challenge_progress_validate_completion
before insert or update of status on public.child_challenge_progress
for each row execute function private.validate_challenge_completion();

create or replace function private.process_challenge_completion()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
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
      or (r.access_level = 'premium' and private.user_has_active_entitlement('rewards_redemption'))
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
$$;

revoke all on function private.process_challenge_completion() from public, anon, authenticated;

drop trigger if exists challenge_progress_process_completion on public.child_challenge_progress;
create trigger challenge_progress_process_completion
after insert or update of status on public.child_challenge_progress
for each row execute function private.process_challenge_completion();

create or replace function private.process_adventure_completion()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
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
      or (r.access_level = 'premium' and private.user_has_active_entitlement('rewards_redemption'))
    )
  on conflict (child_profile_id, reward_id) do nothing;

  return new;
end;
$$;

revoke all on function private.process_adventure_completion() from public, anon, authenticated;

drop trigger if exists adventure_progress_process_completion on public.child_adventure_progress;
create trigger adventure_progress_process_completion
after insert or update of status on public.child_adventure_progress
for each row execute function private.process_adventure_completion();
