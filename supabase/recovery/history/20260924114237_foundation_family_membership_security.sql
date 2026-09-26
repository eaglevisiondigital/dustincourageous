
create schema if not exists private;
revoke all on schema private from public;

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  first_name text,
  last_name text,
  display_name text,
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.households (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 1 and 120),
  created_by uuid not null references auth.users(id) on delete restrict,
  status text not null default 'active' check (status in ('active','paused','archived')),
  timezone text not null default 'America/Chicago',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.household_members (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null check (role in ('owner','parent','guardian','adult')),
  status text not null default 'active' check (status in ('invited','active','left','removed')),
  created_at timestamptz not null default now(),
  unique (household_id, user_id)
);

create index household_members_user_idx
  on public.household_members(user_id, status);
create index household_members_household_idx
  on public.household_members(household_id, status);

create table public.child_profiles (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  display_name text not null check (char_length(display_name) between 1 and 80),
  birth_year smallint check (birth_year is null or birth_year between 2000 and 2100),
  avatar_key text,
  status text not null default 'active' check (status in ('active','inactive','archived')),
  created_by uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index child_profiles_household_idx
  on public.child_profiles(household_id, status);

create table public.membership_plans (
  id uuid primary key default gen_random_uuid(),
  plan_key text not null unique,
  name text not null,
  description text,
  monthly_price_cents integer check (monthly_price_cents is null or monthly_price_cents >= 0),
  annual_price_cents integer check (annual_price_cents is null or annual_price_cents >= 0),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.entitlement_definitions (
  entitlement_key text primary key,
  name text not null,
  description text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.plan_entitlements (
  plan_id uuid not null references public.membership_plans(id) on delete cascade,
  entitlement_key text not null references public.entitlement_definitions(entitlement_key) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (plan_id, entitlement_key)
);

create table public.household_subscriptions (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  plan_id uuid not null references public.membership_plans(id) on delete restrict,
  status text not null check (status in ('trialing','active','past_due','paused','canceled','expired','comped')),
  provider text,
  provider_customer_id text,
  provider_subscription_id text,
  current_period_start timestamptz,
  current_period_end timestamptz,
  cancel_at_period_end boolean not null default false,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index household_subscriptions_household_idx
  on public.household_subscriptions(household_id, status);
create unique index household_subscriptions_provider_subscription_uidx
  on public.household_subscriptions(provider, provider_subscription_id)
  where provider_subscription_id is not null;

create table public.household_entitlement_grants (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  entitlement_key text not null references public.entitlement_definitions(entitlement_key) on delete restrict,
  source_type text not null check (source_type in ('subscription','manual','promotion','book_bundle','gift','migration')),
  source_id text,
  starts_at timestamptz not null default now(),
  ends_at timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  check (ends_at is null or ends_at > starts_at)
);

create index household_entitlement_grants_lookup_idx
  on public.household_entitlement_grants(household_id, entitlement_key, starts_at, ends_at);

create table public.household_consents (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  guardian_user_id uuid not null references auth.users(id) on delete restrict,
  child_profile_id uuid references public.child_profiles(id) on delete set null,
  consent_key text not null,
  action text not null check (action in ('granted','revoked')),
  policy_version text not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index household_consents_household_idx
  on public.household_consents(household_id, consent_key, created_at desc);
create index household_consents_guardian_idx
  on public.household_consents(guardian_user_id, created_at desc);

create or replace function private.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

revoke all on function private.set_updated_at() from public, anon, authenticated;

create trigger profiles_set_updated_at
before update on public.profiles
for each row execute function private.set_updated_at();

create trigger households_set_updated_at
before update on public.households
for each row execute function private.set_updated_at();

create trigger child_profiles_set_updated_at
before update on public.child_profiles
for each row execute function private.set_updated_at();

create trigger membership_plans_set_updated_at
before update on public.membership_plans
for each row execute function private.set_updated_at();

create trigger entitlement_definitions_set_updated_at
before update on public.entitlement_definitions
for each row execute function private.set_updated_at();

create trigger household_subscriptions_set_updated_at
before update on public.household_subscriptions
for each row execute function private.set_updated_at();

create or replace function private.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, first_name, last_name, display_name)
  values (
    new.id,
    nullif(new.raw_user_meta_data ->> 'first_name', ''),
    nullif(new.raw_user_meta_data ->> 'last_name', ''),
    nullif(coalesce(new.raw_user_meta_data ->> 'display_name', new.raw_user_meta_data ->> 'name'), '')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

revoke all on function private.handle_new_auth_user() from public, anon, authenticated;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function private.handle_new_auth_user();

create or replace function private.is_household_member(p_household_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.household_members hm
    where hm.household_id = p_household_id
      and hm.user_id = (select auth.uid())
      and hm.status = 'active'
  );
$$;

create or replace function private.can_manage_household(p_household_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.household_members hm
    where hm.household_id = p_household_id
      and hm.user_id = (select auth.uid())
      and hm.status = 'active'
      and hm.role in ('owner','parent','guardian')
  );
$$;

create or replace function private.is_household_owner(p_household_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.household_members hm
    where hm.household_id = p_household_id
      and hm.user_id = (select auth.uid())
      and hm.status = 'active'
      and hm.role = 'owner'
  );
$$;

revoke all on function private.is_household_member(uuid) from public;
revoke all on function private.can_manage_household(uuid) from public;
revoke all on function private.is_household_owner(uuid) from public;
grant usage on schema private to authenticated;
grant execute on function private.is_household_member(uuid) to authenticated;
grant execute on function private.can_manage_household(uuid) to authenticated;
grant execute on function private.is_household_owner(uuid) to authenticated;

alter table public.profiles enable row level security;
alter table public.households enable row level security;
alter table public.household_members enable row level security;
alter table public.child_profiles enable row level security;
alter table public.membership_plans enable row level security;
alter table public.entitlement_definitions enable row level security;
alter table public.plan_entitlements enable row level security;
alter table public.household_subscriptions enable row level security;
alter table public.household_entitlement_grants enable row level security;
alter table public.household_consents enable row level security;

create policy profiles_select_self
on public.profiles for select
to authenticated
using (id = (select auth.uid()));

create policy profiles_update_self
on public.profiles for update
to authenticated
using (id = (select auth.uid()))
with check (id = (select auth.uid()));

create policy households_select_member
on public.households for select
to authenticated
using (
  created_by = (select auth.uid())
  or private.is_household_member(id)
);

create policy households_insert_creator
on public.households for insert
to authenticated
with check (created_by = (select auth.uid()));

create policy households_update_manager
on public.households for update
to authenticated
using (
  created_by = (select auth.uid())
  or private.can_manage_household(id)
)
with check (
  created_by = (select auth.uid())
  or private.can_manage_household(id)
);

create policy household_members_select_household
on public.household_members for select
to authenticated
using (
  private.is_household_member(household_id)
  or exists (
    select 1
    from public.households h
    where h.id = household_members.household_id
      and h.created_by = (select auth.uid())
  )
);

create policy household_members_insert_initial_owner
on public.household_members for insert
to authenticated
with check (
  user_id = (select auth.uid())
  and role = 'owner'
  and status = 'active'
  and exists (
    select 1
    from public.households h
    where h.id = household_members.household_id
      and h.created_by = (select auth.uid())
  )
);

create policy child_profiles_select_household
on public.child_profiles for select
to authenticated
using (private.is_household_member(household_id));

create policy child_profiles_insert_manager
on public.child_profiles for insert
to authenticated
with check (
  private.can_manage_household(household_id)
  and created_by = (select auth.uid())
);

create policy child_profiles_update_manager
on public.child_profiles for update
to authenticated
using (private.can_manage_household(household_id))
with check (private.can_manage_household(household_id));

create policy child_profiles_delete_manager
on public.child_profiles for delete
to authenticated
using (private.can_manage_household(household_id));

create policy membership_plans_read_active
on public.membership_plans for select
to anon, authenticated
using (is_active = true);

create policy entitlement_definitions_read_active
on public.entitlement_definitions for select
to anon, authenticated
using (is_active = true);

create policy plan_entitlements_read_active
on public.plan_entitlements for select
to anon, authenticated
using (
  exists (
    select 1 from public.membership_plans mp
    where mp.id = plan_entitlements.plan_id
      and mp.is_active = true
  )
);

create policy household_subscriptions_select_household
on public.household_subscriptions for select
to authenticated
using (private.is_household_member(household_id));

create policy household_entitlement_grants_select_household
on public.household_entitlement_grants for select
to authenticated
using (private.is_household_member(household_id));

create policy household_consents_select_household
on public.household_consents for select
to authenticated
using (private.is_household_member(household_id));

create policy household_consents_insert_guardian
on public.household_consents for insert
to authenticated
with check (
  guardian_user_id = (select auth.uid())
  and private.can_manage_household(household_id)
  and (
    child_profile_id is null
    or exists (
      select 1
      from public.child_profiles cp
      where cp.id = household_consents.child_profile_id
        and cp.household_id = household_consents.household_id
    )
  )
);

grant usage on schema public to anon, authenticated, service_role;

grant select, update on public.profiles to authenticated;
grant select, insert, update on public.households to authenticated;
grant select, insert on public.household_members to authenticated;
grant select, insert, update, delete on public.child_profiles to authenticated;
grant select on public.membership_plans to anon, authenticated;
grant select on public.entitlement_definitions to anon, authenticated;
grant select on public.plan_entitlements to anon, authenticated;
grant select on public.household_subscriptions to authenticated;
grant select on public.household_entitlement_grants to authenticated;
grant select, insert on public.household_consents to authenticated;

grant all on public.profiles to service_role;
grant all on public.households to service_role;
grant all on public.household_members to service_role;
grant all on public.child_profiles to service_role;
grant all on public.membership_plans to service_role;
grant all on public.entitlement_definitions to service_role;
grant all on public.plan_entitlements to service_role;
grant all on public.household_subscriptions to service_role;
grant all on public.household_entitlement_grants to service_role;
grant all on public.household_consents to service_role;

insert into public.membership_plans
  (plan_key, name, description, monthly_price_cents, annual_price_cents, is_active)
values
  ('free', 'Adventure Club Free', 'Free household access to the Dustin Courageous Adventure Club.', 0, 0, true),
  ('premium', 'Adventure Club Premium', 'Premium household membership. Pricing will be finalized before launch.', null, null, true)
on conflict (plan_key) do nothing;

insert into public.entitlement_definitions
  (entitlement_key, name, description, is_active)
values
  ('club_access', 'Adventure Club Access', 'Access to the core Adventure Club experience.', true),
  ('premium_content', 'Premium Content', 'Access to premium adventures, videos, devotionals and member content.', true),
  ('member_downloads', 'Member Downloads', 'Access to member-only downloadable resources.', true),
  ('rewards_redemption', 'Rewards Redemption', 'Ability for a household to redeem eligible earned rewards.', true)
on conflict (entitlement_key) do nothing;

insert into public.plan_entitlements (plan_id, entitlement_key)
select mp.id, e.entitlement_key
from public.membership_plans mp
join public.entitlement_definitions e
  on (
    (mp.plan_key = 'free' and e.entitlement_key = 'club_access')
    or
    (mp.plan_key = 'premium' and e.entitlement_key in ('club_access','premium_content','member_downloads','rewards_redemption'))
  )
on conflict do nothing;
