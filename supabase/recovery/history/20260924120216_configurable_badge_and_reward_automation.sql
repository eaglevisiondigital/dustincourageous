
create table public.badge_rules (
  id uuid primary key default gen_random_uuid(),
  badge_id uuid not null references public.badges(id) on delete cascade,
  rule_type text not null check (
    rule_type in ('xp_threshold','challenge_count','adventure_count','streak','challenge_type_count','manual')
  ),
  threshold_value integer check (threshold_value is null or threshold_value > 0),
  streak_key text,
  challenge_type text,
  is_active boolean not null default true,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (
    (rule_type = 'manual')
    or threshold_value is not null
  ),
  check (
    rule_type <> 'streak'
    or streak_key is not null
  ),
  check (
    rule_type <> 'challenge_type_count'
    or challenge_type is not null
  )
);

create index badge_rules_badge_idx on public.badge_rules(badge_id);
create index badge_rules_active_type_idx on public.badge_rules(is_active, rule_type);

create trigger badge_rules_set_updated_at
before update on public.badge_rules
for each row execute function private.set_updated_at();

alter table public.badge_rules enable row level security;

create policy badge_rules_read
on public.badge_rules for select
to anon, authenticated
using (
  is_active = true
  and exists (
    select 1 from public.badges b
    where b.id = badge_rules.badge_id
      and b.is_active = true
  )
);

create policy badge_rules_admin_insert
on public.badge_rules for insert
to authenticated
with check (private.is_content_admin());

create policy badge_rules_admin_update
on public.badge_rules for update
to authenticated
using (private.is_content_admin())
with check (private.is_content_admin());

create policy badge_rules_admin_delete
on public.badge_rules for delete
to authenticated
using (private.is_content_admin());

grant select on public.badge_rules to anon, authenticated;
grant insert, update, delete on public.badge_rules to authenticated;
grant all on public.badge_rules to service_role;

create or replace function private.evaluate_child_badges(p_child_profile_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_household_id uuid;
  v_child_name text;
  v_rule record;
  v_value bigint;
  v_award_id uuid;
begin
  select cp.household_id, cp.display_name
    into v_household_id, v_child_name
  from public.child_profiles cp
  where cp.id = p_child_profile_id;

  if v_household_id is null then
    return;
  end if;

  for v_rule in
    select br.*, b.name as badge_name
    from public.badge_rules br
    join public.badges b on b.id = br.badge_id
    where br.is_active = true
      and b.is_active = true
      and br.rule_type <> 'manual'
  loop
    v_value := 0;

    case v_rule.rule_type
      when 'xp_threshold' then
        select coalesce(sum(x.points), 0)
          into v_value
        from public.xp_ledger x
        where x.child_profile_id = p_child_profile_id;

      when 'challenge_count' then
        select count(*)
          into v_value
        from public.child_challenge_progress ccp
        where ccp.child_profile_id = p_child_profile_id
          and ccp.status = 'completed';

      when 'adventure_count' then
        select count(*)
          into v_value
        from public.child_adventure_progress cap
        where cap.child_profile_id = p_child_profile_id
          and cap.status = 'completed';

      when 'streak' then
        select coalesce(cs.current_count, 0)
          into v_value
        from public.child_streaks cs
        where cs.child_profile_id = p_child_profile_id
          and cs.streak_key = v_rule.streak_key;

        v_value := coalesce(v_value, 0);

      when 'challenge_type_count' then
        select count(*)
          into v_value
        from public.child_challenge_progress ccp
        join public.challenges c on c.id = ccp.challenge_id
        where ccp.child_profile_id = p_child_profile_id
          and ccp.status = 'completed'
          and c.challenge_type = v_rule.challenge_type;

      else
        v_value := 0;
    end case;

    if v_value >= v_rule.threshold_value then
      v_award_id := null;

      insert into public.badge_awards
        (child_profile_id, badge_id, source_type, source_id, metadata)
      values
        (
          p_child_profile_id,
          v_rule.badge_id,
          'badge_rule',
          v_rule.id,
          jsonb_build_object(
            'rule_type', v_rule.rule_type,
            'threshold_value', v_rule.threshold_value,
            'value_at_award', v_value
          )
        )
      on conflict (child_profile_id, badge_id) do nothing
      returning id into v_award_id;

      if v_award_id is not null then
        insert into public.child_activity_events
          (child_profile_id, household_id, event_type, title, description, source_type, source_id)
        values
          (
            p_child_profile_id,
            v_household_id,
            'badge_earned',
            'New badge earned',
            v_rule.badge_name,
            'badge',
            v_rule.badge_id
          );

        insert into public.user_notifications
          (user_id, household_id, child_profile_id, notification_type, title, body, deep_link, metadata)
        select
          hm.user_id,
          v_household_id,
          p_child_profile_id,
          'badge_earned',
          'New badge earned!',
          coalesce(v_child_name, 'Your child') || ' earned the ' || v_rule.badge_name || ' badge.',
          '/family/children/' || p_child_profile_id::text || '/badges',
          jsonb_build_object('badge_id', v_rule.badge_id, 'badge_rule_id', v_rule.id)
        from public.household_members hm
        where hm.household_id = v_household_id
          and hm.status = 'active'
          and hm.role in ('owner','parent','guardian');
      end if;
    end if;
  end loop;
end;
$$;

revoke all on function private.evaluate_child_badges(uuid) from public, anon, authenticated;

create or replace function private.evaluate_badges_after_progress()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.status = 'completed'
     and (tg_op = 'INSERT' or old.status is distinct from 'completed') then
    perform private.evaluate_child_badges(new.child_profile_id);
  end if;
  return new;
end;
$$;

revoke all on function private.evaluate_badges_after_progress() from public, anon, authenticated;

drop trigger if exists zz_challenge_progress_evaluate_badges on public.child_challenge_progress;
create trigger zz_challenge_progress_evaluate_badges
after insert or update of status on public.child_challenge_progress
for each row execute function private.evaluate_badges_after_progress();

drop trigger if exists zz_adventure_progress_evaluate_badges on public.child_adventure_progress;
create trigger zz_adventure_progress_evaluate_badges
after insert or update of status on public.child_adventure_progress
for each row execute function private.evaluate_badges_after_progress();

create or replace function private.notify_reward_unlock()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_household_id uuid;
  v_child_name text;
  v_reward_name text;
begin
  select cp.household_id, cp.display_name, r.name
    into v_household_id, v_child_name, v_reward_name
  from public.child_profiles cp
  join public.rewards r on r.id = new.reward_id
  where cp.id = new.child_profile_id;

  insert into public.child_activity_events
    (child_profile_id, household_id, event_type, title, description, source_type, source_id)
  values
    (
      new.child_profile_id,
      v_household_id,
      'reward_unlocked',
      'Reward unlocked',
      v_reward_name,
      'reward',
      new.reward_id
    );

  insert into public.user_notifications
    (user_id, household_id, child_profile_id, notification_type, title, body, deep_link, metadata)
  select
    hm.user_id,
    v_household_id,
    new.child_profile_id,
    'reward_unlocked',
    'A reward was unlocked!',
    coalesce(v_child_name, 'Your child') || ' unlocked ' || v_reward_name || '.',
    '/family/rewards',
    jsonb_build_object('reward_id', new.reward_id, 'reward_unlock_id', new.id)
  from public.household_members hm
  where hm.household_id = v_household_id
    and hm.status = 'active'
    and hm.role in ('owner','parent','guardian');

  return new;
end;
$$;

revoke all on function private.notify_reward_unlock() from public, anon, authenticated;

drop trigger if exists reward_unlock_notify on public.reward_unlocks;
create trigger reward_unlock_notify
after insert on public.reward_unlocks
for each row execute function private.notify_reward_unlock();

create policy reward_redemptions_admin_update
on public.reward_redemptions for update
to authenticated
using (private.is_app_admin())
with check (private.is_app_admin());

grant update on public.reward_redemptions to authenticated;

create or replace function private.sync_reward_redemption_fulfillment()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.status = 'fulfilled'
     and old.status is distinct from 'fulfilled' then
    new.fulfilled_at := coalesce(new.fulfilled_at, now());

    update public.reward_unlocks
      set redeemed_at = coalesce(redeemed_at, now())
    where id = new.reward_unlock_id;
  end if;

  return new;
end;
$$;

revoke all on function private.sync_reward_redemption_fulfillment() from public, anon, authenticated;

drop trigger if exists reward_redemption_sync_fulfillment on public.reward_redemptions;
create trigger reward_redemption_sync_fulfillment
before update of status on public.reward_redemptions
for each row execute function private.sync_reward_redemption_fulfillment();
