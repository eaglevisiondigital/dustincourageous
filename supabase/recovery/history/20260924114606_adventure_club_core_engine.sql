
create or replace function private.user_has_household()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.household_members hm
    where hm.user_id = (select auth.uid())
      and hm.status = 'active'
  );
$$;

create or replace function private.user_has_active_entitlement(p_entitlement_key text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select
    exists (
      select 1
      from public.household_members hm
      join public.household_subscriptions hs
        on hs.household_id = hm.household_id
      join public.plan_entitlements pe
        on pe.plan_id = hs.plan_id
      where hm.user_id = (select auth.uid())
        and hm.status = 'active'
        and hs.status in ('trialing','active','comped')
        and (hs.current_period_end is null or hs.current_period_end > now())
        and pe.entitlement_key = p_entitlement_key
    )
    or exists (
      select 1
      from public.household_members hm
      join public.household_entitlement_grants heg
        on heg.household_id = hm.household_id
      where hm.user_id = (select auth.uid())
        and hm.status = 'active'
        and heg.entitlement_key = p_entitlement_key
        and heg.starts_at <= now()
        and (heg.ends_at is null or heg.ends_at > now())
    );
$$;

create or replace function private.can_view_child(p_child_profile_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.child_profiles cp
    join public.household_members hm
      on hm.household_id = cp.household_id
    where cp.id = p_child_profile_id
      and hm.user_id = (select auth.uid())
      and hm.status = 'active'
  );
$$;

create or replace function private.can_manage_child(p_child_profile_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.child_profiles cp
    join public.household_members hm
      on hm.household_id = cp.household_id
    where cp.id = p_child_profile_id
      and hm.user_id = (select auth.uid())
      and hm.status = 'active'
      and hm.role in ('owner','parent','guardian')
  );
$$;

revoke all on function private.user_has_household() from public;
revoke all on function private.user_has_active_entitlement(text) from public;
revoke all on function private.can_view_child(uuid) from public;
revoke all on function private.can_manage_child(uuid) from public;
grant execute on function private.user_has_household() to authenticated;
grant execute on function private.user_has_active_entitlement(text) to authenticated;
grant execute on function private.can_view_child(uuid) to authenticated;
grant execute on function private.can_manage_child(uuid) to authenticated;

create table public.books (
  id uuid primary key default gen_random_uuid(),
  book_number integer,
  title text not null,
  subtitle text,
  slug text not null unique,
  description text,
  cover_asset_key text,
  release_date date,
  status text not null default 'draft' check (status in ('draft','coming_soon','published','archived')),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.content_items (
  id uuid primary key default gen_random_uuid(),
  content_type text not null check (content_type in ('video','devotional','scripture','download','audio','article','activity','quiz','book_companion','other')),
  title text not null,
  slug text not null unique,
  summary text,
  body jsonb not null default '{}'::jsonb,
  asset_key text,
  thumbnail_asset_key text,
  access_level text not null default 'free' check (access_level in ('free','member','premium')),
  minimum_age smallint check (minimum_age is null or minimum_age between 0 and 18),
  maximum_age smallint check (maximum_age is null or maximum_age between 0 and 18),
  status text not null default 'draft' check (status in ('draft','scheduled','published','archived')),
  available_from timestamptz,
  available_until timestamptz,
  is_featured boolean not null default false,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (minimum_age is null or maximum_age is null or minimum_age <= maximum_age),
  check (available_until is null or available_from is null or available_until > available_from)
);

create index content_items_publish_idx
  on public.content_items(status, access_level, available_from, available_until);

create table public.book_content_links (
  book_id uuid not null references public.books(id) on delete cascade,
  content_item_id uuid not null references public.content_items(id) on delete cascade,
  sort_order integer not null default 0,
  relationship_type text not null default 'companion',
  created_at timestamptz not null default now(),
  primary key (book_id, content_item_id)
);

create index book_content_links_content_idx
  on public.book_content_links(content_item_id);

create table public.household_book_access (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  book_id uuid not null references public.books(id) on delete cascade,
  source_type text not null check (source_type in ('purchase','membership','gift','bundle','manual','promotion')),
  source_id text,
  starts_at timestamptz not null default now(),
  ends_at timestamptz,
  created_at timestamptz not null default now(),
  unique (household_id, book_id, source_type, source_id),
  check (ends_at is null or ends_at > starts_at)
);

create index household_book_access_household_idx
  on public.household_book_access(household_id, starts_at, ends_at);
create index household_book_access_book_idx
  on public.household_book_access(book_id);

create table public.adventures (
  id uuid primary key default gen_random_uuid(),
  book_id uuid references public.books(id) on delete set null,
  title text not null,
  slug text not null unique,
  description text,
  instructions text,
  cover_asset_key text,
  access_level text not null default 'free' check (access_level in ('free','member','premium')),
  minimum_age smallint check (minimum_age is null or minimum_age between 0 and 18),
  maximum_age smallint check (maximum_age is null or maximum_age between 0 and 18),
  status text not null default 'draft' check (status in ('draft','scheduled','published','archived')),
  available_from timestamptz,
  available_until timestamptz,
  estimated_days integer check (estimated_days is null or estimated_days > 0),
  completion_xp integer not null default 0 check (completion_xp >= 0),
  is_featured boolean not null default false,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (minimum_age is null or maximum_age is null or minimum_age <= maximum_age),
  check (available_until is null or available_from is null or available_until > available_from)
);

create index adventures_book_idx on public.adventures(book_id);
create index adventures_publish_idx
  on public.adventures(status, access_level, available_from, available_until);

create table public.adventure_content_links (
  adventure_id uuid not null references public.adventures(id) on delete cascade,
  content_item_id uuid not null references public.content_items(id) on delete cascade,
  sort_order integer not null default 0,
  is_required boolean not null default true,
  created_at timestamptz not null default now(),
  primary key (adventure_id, content_item_id)
);

create index adventure_content_links_content_idx
  on public.adventure_content_links(content_item_id);

create table public.challenges (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  slug text not null unique,
  challenge_type text not null check (challenge_type in ('daily','weekly','monthly','book','family','prayer','scripture','kindness','outreach','reading','school','other')),
  description text,
  instructions text,
  access_level text not null default 'free' check (access_level in ('free','member','premium')),
  minimum_age smallint check (minimum_age is null or minimum_age between 0 and 18),
  maximum_age smallint check (maximum_age is null or maximum_age between 0 and 18),
  xp_reward integer not null default 0 check (xp_reward >= 0),
  parent_approval_required boolean not null default false,
  schedule_mode text not null default 'always' check (schedule_mode in ('always','one_time','daily','weekly','monthly','custom')),
  recurrence_rule jsonb not null default '{}'::jsonb,
  status text not null default 'draft' check (status in ('draft','scheduled','published','archived')),
  available_from timestamptz,
  available_until timestamptz,
  is_featured boolean not null default false,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (minimum_age is null or maximum_age is null or minimum_age <= maximum_age),
  check (available_until is null or available_from is null or available_until > available_from)
);

create index challenges_publish_idx
  on public.challenges(status, access_level, available_from, available_until);
create index challenges_type_idx
  on public.challenges(challenge_type, status);

create table public.challenge_steps (
  id uuid primary key default gen_random_uuid(),
  challenge_id uuid not null references public.challenges(id) on delete cascade,
  content_item_id uuid references public.content_items(id) on delete set null,
  title text not null,
  instructions text,
  sort_order integer not null default 0,
  xp_reward integer not null default 0 check (xp_reward >= 0),
  is_required boolean not null default true,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index challenge_steps_challenge_idx
  on public.challenge_steps(challenge_id, sort_order);
create index challenge_steps_content_idx
  on public.challenge_steps(content_item_id)
  where content_item_id is not null;

create table public.adventure_challenges (
  adventure_id uuid not null references public.adventures(id) on delete cascade,
  challenge_id uuid not null references public.challenges(id) on delete cascade,
  sort_order integer not null default 0,
  is_required boolean not null default true,
  created_at timestamptz not null default now(),
  primary key (adventure_id, challenge_id)
);

create index adventure_challenges_challenge_idx
  on public.adventure_challenges(challenge_id);

create table public.challenge_assignments (
  id uuid primary key default gen_random_uuid(),
  challenge_id uuid not null references public.challenges(id) on delete cascade,
  household_id uuid not null references public.households(id) on delete cascade,
  child_profile_id uuid references public.child_profiles(id) on delete cascade,
  assignment_source text not null default 'parent' check (assignment_source in ('parent','system','admin','organization','promotion')),
  assigned_by uuid references auth.users(id) on delete set null,
  assigned_at timestamptz not null default now(),
  due_at timestamptz,
  metadata jsonb not null default '{}'::jsonb
);

create index challenge_assignments_household_idx
  on public.challenge_assignments(household_id, due_at);
create index challenge_assignments_child_idx
  on public.challenge_assignments(child_profile_id, due_at)
  where child_profile_id is not null;
create index challenge_assignments_challenge_idx
  on public.challenge_assignments(challenge_id);

create table public.child_adventure_progress (
  id uuid primary key default gen_random_uuid(),
  child_profile_id uuid not null references public.child_profiles(id) on delete cascade,
  adventure_id uuid not null references public.adventures(id) on delete cascade,
  status text not null default 'not_started' check (status in ('not_started','in_progress','completed')),
  started_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (child_profile_id, adventure_id)
);

create index child_adventure_progress_adventure_idx
  on public.child_adventure_progress(adventure_id, status);

create table public.child_challenge_progress (
  id uuid primary key default gen_random_uuid(),
  child_profile_id uuid not null references public.child_profiles(id) on delete cascade,
  challenge_id uuid not null references public.challenges(id) on delete cascade,
  status text not null default 'not_started' check (status in ('not_started','in_progress','pending_parent','completed','skipped')),
  evidence_text text,
  started_at timestamptz,
  submitted_at timestamptz,
  completed_at timestamptz,
  approved_by uuid references auth.users(id) on delete set null,
  approved_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (child_profile_id, challenge_id)
);

create index child_challenge_progress_challenge_idx
  on public.child_challenge_progress(challenge_id, status);
create index child_challenge_progress_approved_by_idx
  on public.child_challenge_progress(approved_by)
  where approved_by is not null;

create table public.child_step_progress (
  id uuid primary key default gen_random_uuid(),
  child_challenge_progress_id uuid not null references public.child_challenge_progress(id) on delete cascade,
  challenge_step_id uuid not null references public.challenge_steps(id) on delete cascade,
  completed boolean not null default false,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (child_challenge_progress_id, challenge_step_id)
);

create index child_step_progress_step_idx
  on public.child_step_progress(challenge_step_id, completed);

create table public.xp_ledger (
  id uuid primary key default gen_random_uuid(),
  child_profile_id uuid not null references public.child_profiles(id) on delete cascade,
  points integer not null,
  event_type text not null,
  source_type text,
  source_id uuid,
  description text,
  created_at timestamptz not null default now(),
  check (points <> 0)
);

create index xp_ledger_child_idx
  on public.xp_ledger(child_profile_id, created_at desc);
create index xp_ledger_source_idx
  on public.xp_ledger(source_type, source_id)
  where source_id is not null;

create table public.levels (
  id uuid primary key default gen_random_uuid(),
  level_number integer not null unique check (level_number > 0),
  name text not null,
  minimum_xp integer not null unique check (minimum_xp >= 0),
  description text,
  icon_asset_key text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.badges (
  id uuid primary key default gen_random_uuid(),
  badge_key text not null unique,
  name text not null,
  description text,
  icon_asset_key text,
  rarity text not null default 'standard' check (rarity in ('standard','special','rare','legendary')),
  is_active boolean not null default true,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.badge_awards (
  id uuid primary key default gen_random_uuid(),
  child_profile_id uuid not null references public.child_profiles(id) on delete cascade,
  badge_id uuid not null references public.badges(id) on delete cascade,
  source_type text,
  source_id uuid,
  awarded_at timestamptz not null default now(),
  metadata jsonb not null default '{}'::jsonb,
  unique (child_profile_id, badge_id)
);

create index badge_awards_badge_idx on public.badge_awards(badge_id);
create index badge_awards_child_idx on public.badge_awards(child_profile_id, awarded_at desc);

create table public.child_streaks (
  child_profile_id uuid not null references public.child_profiles(id) on delete cascade,
  streak_key text not null,
  current_count integer not null default 0 check (current_count >= 0),
  best_count integer not null default 0 check (best_count >= 0),
  last_activity_date date,
  updated_at timestamptz not null default now(),
  primary key (child_profile_id, streak_key)
);

create table public.rewards (
  id uuid primary key default gen_random_uuid(),
  reward_key text not null unique,
  name text not null,
  description text,
  reward_type text not null check (reward_type in ('digital','physical','experience','discount','other')),
  xp_required integer check (xp_required is null or xp_required >= 0),
  access_level text not null default 'member' check (access_level in ('free','member','premium')),
  asset_key text,
  inventory_quantity integer check (inventory_quantity is null or inventory_quantity >= 0),
  is_active boolean not null default true,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.reward_unlocks (
  id uuid primary key default gen_random_uuid(),
  child_profile_id uuid not null references public.child_profiles(id) on delete cascade,
  reward_id uuid not null references public.rewards(id) on delete cascade,
  unlock_source text not null,
  source_id uuid,
  unlocked_at timestamptz not null default now(),
  redeemed_at timestamptz,
  unique (child_profile_id, reward_id)
);

create index reward_unlocks_reward_idx on public.reward_unlocks(reward_id);
create index reward_unlocks_child_idx on public.reward_unlocks(child_profile_id, unlocked_at desc);

create table public.reward_redemptions (
  id uuid primary key default gen_random_uuid(),
  reward_unlock_id uuid not null unique references public.reward_unlocks(id) on delete restrict,
  requested_by uuid not null references auth.users(id) on delete restrict,
  status text not null default 'requested' check (status in ('requested','approved','processing','fulfilled','denied','canceled')),
  fulfillment_reference text,
  requested_at timestamptz not null default now(),
  fulfilled_at timestamptz,
  metadata jsonb not null default '{}'::jsonb
);

create index reward_redemptions_requested_by_idx
  on public.reward_redemptions(requested_by, requested_at desc);

create or replace function private.can_manage_challenge_progress(p_progress_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.child_challenge_progress ccp
    where ccp.id = p_progress_id
      and private.can_manage_child(ccp.child_profile_id)
  );
$$;

revoke all on function private.can_manage_challenge_progress(uuid) from public;
grant execute on function private.can_manage_challenge_progress(uuid) to authenticated;

create trigger books_set_updated_at
before update on public.books
for each row execute function private.set_updated_at();

create trigger content_items_set_updated_at
before update on public.content_items
for each row execute function private.set_updated_at();

create trigger adventures_set_updated_at
before update on public.adventures
for each row execute function private.set_updated_at();

create trigger challenges_set_updated_at
before update on public.challenges
for each row execute function private.set_updated_at();

create trigger child_adventure_progress_set_updated_at
before update on public.child_adventure_progress
for each row execute function private.set_updated_at();

create trigger child_challenge_progress_set_updated_at
before update on public.child_challenge_progress
for each row execute function private.set_updated_at();

create trigger child_step_progress_set_updated_at
before update on public.child_step_progress
for each row execute function private.set_updated_at();

create trigger levels_set_updated_at
before update on public.levels
for each row execute function private.set_updated_at();

create trigger badges_set_updated_at
before update on public.badges
for each row execute function private.set_updated_at();

create trigger rewards_set_updated_at
before update on public.rewards
for each row execute function private.set_updated_at();

alter table public.books enable row level security;
alter table public.content_items enable row level security;
alter table public.book_content_links enable row level security;
alter table public.household_book_access enable row level security;
alter table public.adventures enable row level security;
alter table public.adventure_content_links enable row level security;
alter table public.challenges enable row level security;
alter table public.challenge_steps enable row level security;
alter table public.adventure_challenges enable row level security;
alter table public.challenge_assignments enable row level security;
alter table public.child_adventure_progress enable row level security;
alter table public.child_challenge_progress enable row level security;
alter table public.child_step_progress enable row level security;
alter table public.xp_ledger enable row level security;
alter table public.levels enable row level security;
alter table public.badges enable row level security;
alter table public.badge_awards enable row level security;
alter table public.child_streaks enable row level security;
alter table public.rewards enable row level security;
alter table public.reward_unlocks enable row level security;
alter table public.reward_redemptions enable row level security;

create policy books_read_public
on public.books for select
to anon, authenticated
using (status in ('coming_soon','published'));

create policy content_items_read_free
on public.content_items for select
to anon
using (
  status = 'published'
  and access_level = 'free'
  and (available_from is null or available_from <= now())
  and (available_until is null or available_until > now())
);

create policy content_items_read_authenticated
on public.content_items for select
to authenticated
using (
  status = 'published'
  and (available_from is null or available_from <= now())
  and (available_until is null or available_until > now())
  and (
    access_level = 'free'
    or (access_level = 'member' and private.user_has_household())
    or (access_level = 'premium' and private.user_has_active_entitlement('premium_content'))
  )
);

create policy book_content_links_read
on public.book_content_links for select
to anon, authenticated
using (
  exists (
    select 1 from public.books b
    where b.id = book_content_links.book_id
      and b.status in ('coming_soon','published')
  )
);

create policy household_book_access_read
on public.household_book_access for select
to authenticated
using (private.is_household_member(household_id));

create policy adventures_read_free
on public.adventures for select
to anon
using (
  status = 'published'
  and access_level = 'free'
  and (available_from is null or available_from <= now())
  and (available_until is null or available_until > now())
);

create policy adventures_read_authenticated
on public.adventures for select
to authenticated
using (
  status = 'published'
  and (available_from is null or available_from <= now())
  and (available_until is null or available_until > now())
  and (
    access_level = 'free'
    or (access_level = 'member' and private.user_has_household())
    or (access_level = 'premium' and private.user_has_active_entitlement('premium_content'))
  )
);

create policy adventure_content_links_read
on public.adventure_content_links for select
to anon, authenticated
using (
  exists (
    select 1 from public.adventures a
    where a.id = adventure_content_links.adventure_id
  )
);

create policy challenges_read_free
on public.challenges for select
to anon
using (
  status = 'published'
  and access_level = 'free'
  and (available_from is null or available_from <= now())
  and (available_until is null or available_until > now())
);

create policy challenges_read_authenticated
on public.challenges for select
to authenticated
using (
  status = 'published'
  and (available_from is null or available_from <= now())
  and (available_until is null or available_until > now())
  and (
    access_level = 'free'
    or (access_level = 'member' and private.user_has_household())
    or (access_level = 'premium' and private.user_has_active_entitlement('premium_content'))
  )
);

create policy challenge_steps_read
on public.challenge_steps for select
to anon, authenticated
using (
  exists (
    select 1 from public.challenges c
    where c.id = challenge_steps.challenge_id
  )
);

create policy adventure_challenges_read
on public.adventure_challenges for select
to anon, authenticated
using (
  exists (
    select 1 from public.adventures a
    where a.id = adventure_challenges.adventure_id
  )
);

create policy challenge_assignments_read
on public.challenge_assignments for select
to authenticated
using (private.is_household_member(household_id));

create policy challenge_assignments_insert_parent
on public.challenge_assignments for insert
to authenticated
with check (
  private.can_manage_household(household_id)
  and assigned_by = (select auth.uid())
  and (
    child_profile_id is null
    or exists (
      select 1 from public.child_profiles cp
      where cp.id = challenge_assignments.child_profile_id
        and cp.household_id = challenge_assignments.household_id
    )
  )
);

create policy child_adventure_progress_read
on public.child_adventure_progress for select
to authenticated
using (private.can_view_child(child_profile_id));

create policy child_adventure_progress_insert
on public.child_adventure_progress for insert
to authenticated
with check (private.can_manage_child(child_profile_id));

create policy child_adventure_progress_update
on public.child_adventure_progress for update
to authenticated
using (private.can_manage_child(child_profile_id))
with check (private.can_manage_child(child_profile_id));

create policy child_challenge_progress_read
on public.child_challenge_progress for select
to authenticated
using (private.can_view_child(child_profile_id));

create policy child_challenge_progress_insert
on public.child_challenge_progress for insert
to authenticated
with check (private.can_manage_child(child_profile_id));

create policy child_challenge_progress_update
on public.child_challenge_progress for update
to authenticated
using (private.can_manage_child(child_profile_id))
with check (
  private.can_manage_child(child_profile_id)
  and (approved_by is null or approved_by = (select auth.uid()))
);

create policy child_step_progress_read
on public.child_step_progress for select
to authenticated
using (private.can_manage_challenge_progress(child_challenge_progress_id));

create policy child_step_progress_insert
on public.child_step_progress for insert
to authenticated
with check (private.can_manage_challenge_progress(child_challenge_progress_id));

create policy child_step_progress_update
on public.child_step_progress for update
to authenticated
using (private.can_manage_challenge_progress(child_challenge_progress_id))
with check (private.can_manage_challenge_progress(child_challenge_progress_id));

create policy xp_ledger_read
on public.xp_ledger for select
to authenticated
using (private.can_view_child(child_profile_id));

create policy levels_read
on public.levels for select
to anon, authenticated
using (is_active = true);

create policy badges_read
on public.badges for select
to anon, authenticated
using (is_active = true);

create policy badge_awards_read
on public.badge_awards for select
to authenticated
using (private.can_view_child(child_profile_id));

create policy child_streaks_read
on public.child_streaks for select
to authenticated
using (private.can_view_child(child_profile_id));

create policy rewards_read_free
on public.rewards for select
to anon
using (is_active = true and access_level = 'free');

create policy rewards_read_authenticated
on public.rewards for select
to authenticated
using (
  is_active = true
  and (
    access_level = 'free'
    or (access_level = 'member' and private.user_has_household())
    or (access_level = 'premium' and private.user_has_active_entitlement('rewards_redemption'))
  )
);

create policy reward_unlocks_read
on public.reward_unlocks for select
to authenticated
using (private.can_view_child(child_profile_id));

create policy reward_redemptions_read
on public.reward_redemptions for select
to authenticated
using (
  requested_by = (select auth.uid())
  or exists (
    select 1
    from public.reward_unlocks ru
    where ru.id = reward_redemptions.reward_unlock_id
      and private.can_view_child(ru.child_profile_id)
  )
);

create policy reward_redemptions_insert
on public.reward_redemptions for insert
to authenticated
with check (
  requested_by = (select auth.uid())
  and exists (
    select 1
    from public.reward_unlocks ru
    where ru.id = reward_redemptions.reward_unlock_id
      and private.can_manage_child(ru.child_profile_id)
      and ru.redeemed_at is null
  )
);

grant select on public.books to anon, authenticated;
grant select on public.content_items to anon, authenticated;
grant select on public.book_content_links to anon, authenticated;
grant select on public.household_book_access to authenticated;
grant select on public.adventures to anon, authenticated;
grant select on public.adventure_content_links to anon, authenticated;
grant select on public.challenges to anon, authenticated;
grant select on public.challenge_steps to anon, authenticated;
grant select on public.adventure_challenges to anon, authenticated;
grant select, insert on public.challenge_assignments to authenticated;
grant select, insert, update on public.child_adventure_progress to authenticated;
grant select, insert, update on public.child_challenge_progress to authenticated;
grant select, insert, update on public.child_step_progress to authenticated;
grant select on public.xp_ledger to authenticated;
grant select on public.levels to anon, authenticated;
grant select on public.badges to anon, authenticated;
grant select on public.badge_awards to authenticated;
grant select on public.child_streaks to authenticated;
grant select on public.rewards to anon, authenticated;
grant select on public.reward_unlocks to authenticated;
grant select, insert on public.reward_redemptions to authenticated;

grant all on public.books to service_role;
grant all on public.content_items to service_role;
grant all on public.book_content_links to service_role;
grant all on public.household_book_access to service_role;
grant all on public.adventures to service_role;
grant all on public.adventure_content_links to service_role;
grant all on public.challenges to service_role;
grant all on public.challenge_steps to service_role;
grant all on public.adventure_challenges to service_role;
grant all on public.challenge_assignments to service_role;
grant all on public.child_adventure_progress to service_role;
grant all on public.child_challenge_progress to service_role;
grant all on public.child_step_progress to service_role;
grant all on public.xp_ledger to service_role;
grant all on public.levels to service_role;
grant all on public.badges to service_role;
grant all on public.badge_awards to service_role;
grant all on public.child_streaks to service_role;
grant all on public.rewards to service_role;
grant all on public.reward_unlocks to service_role;
grant all on public.reward_redemptions to service_role;

create view public.child_xp_totals
with (security_invoker = true)
as
select child_profile_id, coalesce(sum(points), 0)::bigint as total_xp
from public.xp_ledger
group by child_profile_id;

grant select on public.child_xp_totals to authenticated;
