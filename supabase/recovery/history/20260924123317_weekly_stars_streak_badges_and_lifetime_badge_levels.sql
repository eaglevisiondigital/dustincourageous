
alter table public.badges
  add column if not exists badge_scope text not null default 'lifetime'
    check (badge_scope in ('lifetime','streak','challenge','weekly','special')),
  add column if not exists badge_tier text
    check (badge_tier is null or badge_tier in ('bronze','silver','gold','platinum','diamond','legendary')),
  add column if not exists badge_family_key text;

create index if not exists badges_family_tier_idx
  on public.badges(badge_family_key, badge_tier)
  where badge_family_key is not null;

create table public.challenge_series (
  id uuid primary key default gen_random_uuid(),
  series_key text not null unique,
  name text not null,
  description text,
  cadence text not null default 'weekly'
    check (cadence in ('weekly','monthly','custom')),
  token_type text not null default 'weekly_star',
  token_amount integer not null default 1 check (token_amount > 0),
  status text not null default 'active'
    check (status in ('draft','active','paused','archived')),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger challenge_series_set_updated_at
before update on public.challenge_series
for each row execute function private.set_updated_at();

alter table public.challenge_series enable row level security;

create policy challenge_series_read_active
on public.challenge_series for select
to anon, authenticated
using (status = 'active' or private.is_app_admin());

create policy challenge_series_admin_insert
on public.challenge_series for insert
to authenticated
with check (private.is_content_admin());

create policy challenge_series_admin_update
on public.challenge_series for update
to authenticated
using (private.is_content_admin())
with check (private.is_content_admin());

create policy challenge_series_admin_delete
on public.challenge_series for delete
to authenticated
using (private.is_content_admin());

grant select on public.challenge_series to anon, authenticated;
grant insert, update, delete on public.challenge_series to authenticated;
grant all on public.challenge_series to service_role;

alter table public.challenges
  add column if not exists challenge_series_id uuid references public.challenge_series(id) on delete set null,
  add column if not exists period_start date,
  add column if not exists period_end date;

create index if not exists challenges_series_period_idx
  on public.challenges(challenge_series_id, period_start, period_end)
  where challenge_series_id is not null;

create table public.achievement_token_ledger (
  id uuid primary key default gen_random_uuid(),
  child_profile_id uuid not null references public.child_profiles(id) on delete cascade,
  token_type text not null,
  amount integer not null check (amount <> 0),
  event_type text not null,
  source_type text,
  source_id uuid,
  challenge_series_id uuid references public.challenge_series(id) on delete set null,
  period_start date,
  description text,
  created_at timestamptz not null default now()
);

create unique index achievement_token_unique_source_idx
  on public.achievement_token_ledger(child_profile_id, token_type, source_type, source_id)
  where source_id is not null;

create index achievement_token_child_idx
  on public.achievement_token_ledger(child_profile_id, token_type, created_at desc);

create index achievement_token_series_idx
  on public.achievement_token_ledger(challenge_series_id, period_start)
  where challenge_series_id is not null;

alter table public.achievement_token_ledger enable row level security;

create policy achievement_token_read_child
on public.achievement_token_ledger for select
to authenticated
using (private.can_view_child(child_profile_id));

grant select on public.achievement_token_ledger to authenticated;
grant all on public.achievement_token_ledger to service_role;

create table public.child_series_weekly_completions (
  id uuid primary key default gen_random_uuid(),
  child_profile_id uuid not null references public.child_profiles(id) on delete cascade,
  challenge_series_id uuid not null references public.challenge_series(id) on delete cascade,
  period_start date not null,
  challenge_id uuid not null references public.challenges(id) on delete cascade,
  progress_id uuid not null references public.child_challenge_progress(id) on delete cascade,
  completed_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  unique (child_profile_id, challenge_series_id, period_start)
);

create index child_series_weekly_completions_child_idx
  on public.child_series_weekly_completions(child_profile_id, challenge_series_id, period_start desc);

create index child_series_weekly_completions_challenge_idx
  on public.child_series_weekly_completions(challenge_id);

alter table public.child_series_weekly_completions enable row level security;

create policy child_series_weekly_completions_read
on public.child_series_weekly_completions for select
to authenticated
using (private.can_view_child(child_profile_id));

grant select on public.child_series_weekly_completions to authenticated;
grant all on public.child_series_weekly_completions to service_role;

create table public.child_series_streaks (
  child_profile_id uuid not null references public.child_profiles(id) on delete cascade,
  challenge_series_id uuid not null references public.challenge_series(id) on delete cascade,
  current_weeks integer not null default 0 check (current_weeks >= 0),
  best_weeks integer not null default 0 check (best_weeks >= 0),
  streak_started_period date,
  last_completed_period date,
  current_cycle integer not null default 1 check (current_cycle > 0),
  updated_at timestamptz not null default now(),
  primary key (child_profile_id, challenge_series_id)
);

alter table public.child_series_streaks enable row level security;

create policy child_series_streaks_read
on public.child_series_streaks for select
to authenticated
using (private.can_view_child(child_profile_id));

grant select on public.child_series_streaks to authenticated;
grant all on public.child_series_streaks to service_role;

create table public.series_badge_rules (
  id uuid primary key default gen_random_uuid(),
  challenge_series_id uuid not null references public.challenge_series(id) on delete cascade,
  badge_id uuid not null references public.badges(id) on delete cascade,
  consecutive_weeks_required integer not null check (consecutive_weeks_required > 0),
  active_only_while_current_streak boolean not null default true,
  is_active boolean not null default true,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (challenge_series_id, badge_id, consecutive_weeks_required)
);

create index series_badge_rules_series_idx
  on public.series_badge_rules(challenge_series_id, consecutive_weeks_required)
  where is_active = true;

create trigger series_badge_rules_set_updated_at
before update on public.series_badge_rules
for each row execute function private.set_updated_at();

alter table public.series_badge_rules enable row level security;

create policy series_badge_rules_read
on public.series_badge_rules for select
to anon, authenticated
using (is_active = true or private.is_app_admin());

create policy series_badge_rules_admin_insert
on public.series_badge_rules for insert
to authenticated
with check (private.is_content_admin());

create policy series_badge_rules_admin_update
on public.series_badge_rules for update
to authenticated
using (private.is_content_admin())
with check (private.is_content_admin());

create policy series_badge_rules_admin_delete
on public.series_badge_rules for delete
to authenticated
using (private.is_content_admin());

grant select on public.series_badge_rules to anon, authenticated;
grant insert, update, delete on public.series_badge_rules to authenticated;
grant all on public.series_badge_rules to service_role;

create table public.streak_badge_earnings (
  id uuid primary key default gen_random_uuid(),
  child_profile_id uuid not null references public.child_profiles(id) on delete cascade,
  challenge_series_id uuid not null references public.challenge_series(id) on delete cascade,
  series_badge_rule_id uuid not null references public.series_badge_rules(id) on delete cascade,
  badge_id uuid not null references public.badges(id) on delete cascade,
  streak_cycle integer not null check (streak_cycle > 0),
  streak_weeks_at_earn integer not null check (streak_weeks_at_earn > 0),
  earned_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  unique (child_profile_id, series_badge_rule_id, streak_cycle)
);

create index streak_badge_earnings_child_idx
  on public.streak_badge_earnings(child_profile_id, earned_at desc);

alter table public.streak_badge_earnings enable row level security;

create policy streak_badge_earnings_read
on public.streak_badge_earnings for select
to authenticated
using (private.can_view_child(child_profile_id));

grant select on public.streak_badge_earnings to authenticated;
grant all on public.streak_badge_earnings to service_role;

create or replace function private.process_weekly_series_completion()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_series_id uuid;
  v_period_start date;
  v_period_end date;
  v_token_type text;
  v_token_amount integer;
  v_household_id uuid;
  v_child_name text;
  v_current integer;
  v_best integer;
  v_started date;
  v_last date;
  v_cycle integer;
  v_new_current integer;
  v_new_best integer;
  v_new_started date;
  v_new_cycle integer;
  v_rule record;
  v_earning_id uuid;
begin
  if new.status <> 'completed'
     or (tg_op = 'UPDATE' and old.status = 'completed') then
    return new;
  end if;

  select
    c.challenge_series_id,
    c.period_start,
    c.period_end,
    cs.token_type,
    cs.token_amount,
    cp.household_id,
    cp.display_name
  into
    v_series_id,
    v_period_start,
    v_period_end,
    v_token_type,
    v_token_amount,
    v_household_id,
    v_child_name
  from public.challenges c
  join public.child_profiles cp on cp.id = new.child_profile_id
  left join public.challenge_series cs on cs.id = c.challenge_series_id
  where c.id = new.challenge_id;

  if v_series_id is null or v_period_start is null then
    return new;
  end if;

  insert into public.child_series_weekly_completions (
    child_profile_id,
    challenge_series_id,
    period_start,
    challenge_id,
    progress_id,
    completed_at
  )
  values (
    new.child_profile_id,
    v_series_id,
    v_period_start,
    new.challenge_id,
    new.id,
    coalesce(new.completed_at, now())
  )
  on conflict (child_profile_id, challenge_series_id, period_start) do nothing;

  if not found then
    return new;
  end if;

  insert into public.achievement_token_ledger (
    child_profile_id,
    token_type,
    amount,
    event_type,
    source_type,
    source_id,
    challenge_series_id,
    period_start,
    description
  )
  values (
    new.child_profile_id,
    coalesce(v_token_type, 'weekly_star'),
    coalesce(v_token_amount, 1),
    'weekly_challenge_completed',
    'challenge',
    new.challenge_id,
    v_series_id,
    v_period_start,
    'Weekly challenge completed'
  )
  on conflict do nothing;

  select
    css.current_weeks,
    css.best_weeks,
    css.streak_started_period,
    css.last_completed_period,
    css.current_cycle
  into
    v_current,
    v_best,
    v_started,
    v_last,
    v_cycle
  from public.child_series_streaks css
  where css.child_profile_id = new.child_profile_id
    and css.challenge_series_id = v_series_id
  for update;

  if not found then
    v_new_current := 1;
    v_new_best := 1;
    v_new_started := v_period_start;
    v_new_cycle := 1;
  elsif v_last = v_period_start then
    v_new_current := v_current;
    v_new_best := v_best;
    v_new_started := v_started;
    v_new_cycle := v_cycle;
  elsif v_last = v_period_start - 7 then
    v_new_current := v_current + 1;
    v_new_best := greatest(v_best, v_current + 1);
    v_new_started := v_started;
    v_new_cycle := v_cycle;
  else
    v_new_current := 1;
    v_new_best := greatest(v_best, 1);
    v_new_started := v_period_start;
    v_new_cycle := v_cycle + 1;
  end if;

  insert into public.child_series_streaks (
    child_profile_id,
    challenge_series_id,
    current_weeks,
    best_weeks,
    streak_started_period,
    last_completed_period,
    current_cycle,
    updated_at
  )
  values (
    new.child_profile_id,
    v_series_id,
    v_new_current,
    v_new_best,
    v_new_started,
    v_period_start,
    v_new_cycle,
    now()
  )
  on conflict (child_profile_id, challenge_series_id) do update
  set current_weeks = excluded.current_weeks,
      best_weeks = excluded.best_weeks,
      streak_started_period = excluded.streak_started_period,
      last_completed_period = excluded.last_completed_period,
      current_cycle = excluded.current_cycle,
      updated_at = now();

  for v_rule in
    select sbr.*, b.name as badge_name
    from public.series_badge_rules sbr
    join public.badges b on b.id = sbr.badge_id
    where sbr.challenge_series_id = v_series_id
      and sbr.is_active = true
      and b.is_active = true
      and v_new_current >= sbr.consecutive_weeks_required
  loop
    v_earning_id := null;

    insert into public.streak_badge_earnings (
      child_profile_id,
      challenge_series_id,
      series_badge_rule_id,
      badge_id,
      streak_cycle,
      streak_weeks_at_earn
    )
    values (
      new.child_profile_id,
      v_series_id,
      v_rule.id,
      v_rule.badge_id,
      v_new_cycle,
      v_new_current
    )
    on conflict (child_profile_id, series_badge_rule_id, streak_cycle) do nothing
    returning id into v_earning_id;

    if v_earning_id is not null then
      insert into public.child_activity_events (
        child_profile_id,
        household_id,
        event_type,
        title,
        description,
        source_type,
        source_id
      )
      values (
        new.child_profile_id,
        v_household_id,
        'streak_badge_earned',
        'Streak badge earned',
        v_rule.badge_name,
        'badge',
        v_rule.badge_id
      );

      insert into public.user_notifications (
        user_id,
        household_id,
        child_profile_id,
        notification_type,
        title,
        body,
        deep_link,
        metadata
      )
      select
        hm.user_id,
        v_household_id,
        new.child_profile_id,
        'streak_badge_earned',
        'A streak badge was earned!',
        coalesce(v_child_name, 'Your child') || ' earned the ' || v_rule.badge_name ||
          ' badge after ' || v_rule.consecutive_weeks_required || ' consecutive weeks.',
        '/family/children/' || new.child_profile_id::text || '/badges',
        jsonb_build_object(
          'badge_id', v_rule.badge_id,
          'series_badge_rule_id', v_rule.id,
          'streak_cycle', v_new_cycle,
          'streak_weeks', v_new_current
        )
      from public.household_members hm
      where hm.household_id = v_household_id
        and hm.status = 'active'
        and hm.role in ('owner','parent','guardian');
    end if;
  end loop;

  return new;
end;
$$;

revoke all on function private.process_weekly_series_completion() from public, anon, authenticated;

drop trigger if exists zz_weekly_series_progression on public.child_challenge_progress;
create trigger zz_weekly_series_progression
after insert or update of status on public.child_challenge_progress
for each row execute function private.process_weekly_series_completion();

create or replace view public.child_token_totals
with (security_invoker = true)
as
select
  child_profile_id,
  token_type,
  coalesce(sum(amount),0)::bigint as total
from public.achievement_token_ledger
group by child_profile_id, token_type;

grant select on public.child_token_totals to authenticated;

create or replace view public.child_active_streak_badges
with (security_invoker = true)
as
select
  css.child_profile_id,
  css.challenge_series_id,
  sbr.id as series_badge_rule_id,
  sbr.badge_id,
  sbr.consecutive_weeks_required,
  css.current_weeks,
  css.best_weeks,
  css.current_cycle,
  css.last_completed_period,
  (
    css.current_weeks >= sbr.consecutive_weeks_required
    and (
      css.last_completed_period >= (date_trunc('week', current_date)::date - 7)
    )
  ) as is_active
from public.child_series_streaks css
join public.series_badge_rules sbr
  on sbr.challenge_series_id = css.challenge_series_id
 and sbr.is_active = true;

grant select on public.child_active_streak_badges to authenticated;

create policy series_badge_rules_admin_select_all
on public.series_badge_rules for select
to authenticated
using (private.is_app_admin());

create policy challenge_series_admin_select_all
on public.challenge_series for select
to authenticated
using (private.is_app_admin());

create trigger audit_challenge_series_admin
after insert or update or delete on public.challenge_series
for each row execute function private.audit_admin_mutation();

create trigger audit_series_badge_rules_admin
after insert or update or delete on public.series_badge_rules
for each row execute function private.audit_admin_mutation();
