
create table public.app_admins (
  user_id uuid primary key references auth.users(id) on delete cascade,
  role text not null check (role in ('super_admin','content_admin','operations_admin','support_admin','analyst')),
  status text not null default 'active' check (status in ('active','suspended','revoked')),
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index app_admins_created_by_idx
  on public.app_admins(created_by)
  where created_by is not null;

create or replace function private.is_app_admin()
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
  );
$$;

create or replace function private.is_content_admin()
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
      and aa.role in ('super_admin','content_admin','operations_admin')
  );
$$;

revoke all on function private.is_app_admin() from public;
revoke all on function private.is_content_admin() from public;
grant execute on function private.is_app_admin() to authenticated;
grant execute on function private.is_content_admin() to authenticated;

create trigger app_admins_set_updated_at
before update on public.app_admins
for each row execute function private.set_updated_at();

create table public.admin_audit_log (
  id bigint generated always as identity primary key,
  actor_user_id uuid references auth.users(id) on delete set null,
  action text not null,
  entity_type text not null,
  entity_id text,
  household_id uuid references public.households(id) on delete set null,
  child_profile_id uuid references public.child_profiles(id) on delete set null,
  before_state jsonb,
  after_state jsonb,
  request_id text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index admin_audit_actor_idx on public.admin_audit_log(actor_user_id, created_at desc);
create index admin_audit_entity_idx on public.admin_audit_log(entity_type, entity_id, created_at desc);
create index admin_audit_household_idx on public.admin_audit_log(household_id, created_at desc)
  where household_id is not null;
create index admin_audit_child_idx on public.admin_audit_log(child_profile_id, created_at desc)
  where child_profile_id is not null;

create table public.notification_preferences (
  user_id uuid primary key references auth.users(id) on delete cascade,
  email_enabled boolean not null default true,
  push_enabled boolean not null default true,
  product_updates boolean not null default true,
  child_progress boolean not null default true,
  rewards boolean not null default true,
  family_reminders boolean not null default true,
  marketing boolean not null default false,
  quiet_hours_start time,
  quiet_hours_end time,
  timezone text not null default 'America/Chicago',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger notification_preferences_set_updated_at
before update on public.notification_preferences
for each row execute function private.set_updated_at();

create table public.user_notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  household_id uuid references public.households(id) on delete cascade,
  child_profile_id uuid references public.child_profiles(id) on delete set null,
  notification_type text not null,
  title text not null,
  body text not null,
  deep_link text,
  image_asset_key text,
  priority text not null default 'normal' check (priority in ('low','normal','high','urgent')),
  status text not null default 'unread' check (status in ('unread','read','archived')),
  read_at timestamptz,
  expires_at timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index user_notifications_user_idx
  on public.user_notifications(user_id, status, created_at desc);
create index user_notifications_household_idx
  on public.user_notifications(household_id, created_at desc)
  where household_id is not null;
create index user_notifications_child_idx
  on public.user_notifications(child_profile_id, created_at desc)
  where child_profile_id is not null;

create table public.push_devices (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  provider text not null check (provider in ('webpush','goodbarber','apns','fcm','other')),
  device_token text not null,
  platform text check (platform in ('web','ios','android','ipad','other')),
  device_name text,
  app_version text,
  is_active boolean not null default true,
  last_seen_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (provider, device_token)
);

create index push_devices_user_idx
  on public.push_devices(user_id, is_active);

create trigger push_devices_set_updated_at
before update on public.push_devices
for each row execute function private.set_updated_at();

create table public.child_activity_events (
  id bigint generated always as identity primary key,
  child_profile_id uuid not null references public.child_profiles(id) on delete cascade,
  household_id uuid not null references public.households(id) on delete cascade,
  event_type text not null,
  title text not null,
  description text,
  source_type text,
  source_id uuid,
  xp_delta integer,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index child_activity_child_idx
  on public.child_activity_events(child_profile_id, created_at desc);
create index child_activity_household_idx
  on public.child_activity_events(household_id, created_at desc);
create index child_activity_source_idx
  on public.child_activity_events(source_type, source_id)
  where source_id is not null;

create table public.media_assets (
  id uuid primary key default gen_random_uuid(),
  asset_key text not null unique,
  title text,
  description text,
  bucket_name text not null,
  object_path text not null,
  media_type text not null check (media_type in ('image','video','audio','pdf','document','archive','other')),
  visibility text not null default 'private' check (visibility in ('public','member','premium','private')),
  entitlement_key text references public.entitlement_definitions(entitlement_key) on delete set null,
  status text not null default 'draft' check (status in ('draft','processing','ready','archived')),
  mime_type text,
  size_bytes bigint check (size_bytes is null or size_bytes >= 0),
  checksum_sha256 text,
  metadata jsonb not null default '{}'::jsonb,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (bucket_name, object_path)
);

create index media_assets_entitlement_idx on public.media_assets(entitlement_key)
  where entitlement_key is not null;
create index media_assets_created_by_idx on public.media_assets(created_by)
  where created_by is not null;
create index media_assets_delivery_idx on public.media_assets(status, visibility);

create trigger media_assets_set_updated_at
before update on public.media_assets
for each row execute function private.set_updated_at();

alter table public.app_admins enable row level security;
alter table public.admin_audit_log enable row level security;
alter table public.notification_preferences enable row level security;
alter table public.user_notifications enable row level security;
alter table public.push_devices enable row level security;
alter table public.child_activity_events enable row level security;
alter table public.media_assets enable row level security;

create policy app_admins_read_self
on public.app_admins for select
to authenticated
using (user_id = (select auth.uid()));

create policy admin_audit_read_admin
on public.admin_audit_log for select
to authenticated
using (private.is_app_admin());

create policy notification_preferences_read_self
on public.notification_preferences for select
to authenticated
using (user_id = (select auth.uid()));

create policy notification_preferences_insert_self
on public.notification_preferences for insert
to authenticated
with check (user_id = (select auth.uid()));

create policy notification_preferences_update_self
on public.notification_preferences for update
to authenticated
using (user_id = (select auth.uid()))
with check (user_id = (select auth.uid()));

create policy user_notifications_read_self
on public.user_notifications for select
to authenticated
using (user_id = (select auth.uid()));

create policy user_notifications_update_self
on public.user_notifications for update
to authenticated
using (user_id = (select auth.uid()))
with check (user_id = (select auth.uid()));

create policy push_devices_read_self
on public.push_devices for select
to authenticated
using (user_id = (select auth.uid()));

create policy push_devices_insert_self
on public.push_devices for insert
to authenticated
with check (user_id = (select auth.uid()));

create policy push_devices_update_self
on public.push_devices for update
to authenticated
using (user_id = (select auth.uid()))
with check (user_id = (select auth.uid()));

create policy push_devices_delete_self
on public.push_devices for delete
to authenticated
using (user_id = (select auth.uid()));

create policy child_activity_read_household
on public.child_activity_events for select
to authenticated
using (private.is_household_member(household_id));

create policy media_assets_read_public
on public.media_assets for select
to anon
using (status = 'ready' and visibility = 'public');

create policy media_assets_read_authenticated
on public.media_assets for select
to authenticated
using (
  status = 'ready'
  and (
    visibility = 'public'
    or (visibility = 'member' and private.user_has_household())
    or (
      visibility = 'premium'
      and entitlement_key is not null
      and private.user_has_active_entitlement(entitlement_key)
    )
    or private.is_app_admin()
  )
);

create policy media_assets_admin_insert
on public.media_assets for insert
to authenticated
with check (private.is_content_admin());

create policy media_assets_admin_update
on public.media_assets for update
to authenticated
using (private.is_content_admin())
with check (private.is_content_admin());

create policy media_assets_admin_delete
on public.media_assets for delete
to authenticated
using (private.is_content_admin());

create policy books_admin_insert
on public.books for insert to authenticated
with check (private.is_content_admin());
create policy books_admin_update
on public.books for update to authenticated
using (private.is_content_admin()) with check (private.is_content_admin());
create policy books_admin_delete
on public.books for delete to authenticated
using (private.is_content_admin());

create policy content_items_admin_insert
on public.content_items for insert to authenticated
with check (private.is_content_admin());
create policy content_items_admin_update
on public.content_items for update to authenticated
using (private.is_content_admin()) with check (private.is_content_admin());
create policy content_items_admin_delete
on public.content_items for delete to authenticated
using (private.is_content_admin());

create policy book_content_links_admin_insert
on public.book_content_links for insert to authenticated
with check (private.is_content_admin());
create policy book_content_links_admin_update
on public.book_content_links for update to authenticated
using (private.is_content_admin()) with check (private.is_content_admin());
create policy book_content_links_admin_delete
on public.book_content_links for delete to authenticated
using (private.is_content_admin());

create policy adventures_admin_insert
on public.adventures for insert to authenticated
with check (private.is_content_admin());
create policy adventures_admin_update
on public.adventures for update to authenticated
using (private.is_content_admin()) with check (private.is_content_admin());
create policy adventures_admin_delete
on public.adventures for delete to authenticated
using (private.is_content_admin());

create policy adventure_content_links_admin_insert
on public.adventure_content_links for insert to authenticated
with check (private.is_content_admin());
create policy adventure_content_links_admin_update
on public.adventure_content_links for update to authenticated
using (private.is_content_admin()) with check (private.is_content_admin());
create policy adventure_content_links_admin_delete
on public.adventure_content_links for delete to authenticated
using (private.is_content_admin());

create policy challenges_admin_insert
on public.challenges for insert to authenticated
with check (private.is_content_admin());
create policy challenges_admin_update
on public.challenges for update to authenticated
using (private.is_content_admin()) with check (private.is_content_admin());
create policy challenges_admin_delete
on public.challenges for delete to authenticated
using (private.is_content_admin());

create policy challenge_steps_admin_insert
on public.challenge_steps for insert to authenticated
with check (private.is_content_admin());
create policy challenge_steps_admin_update
on public.challenge_steps for update to authenticated
using (private.is_content_admin()) with check (private.is_content_admin());
create policy challenge_steps_admin_delete
on public.challenge_steps for delete to authenticated
using (private.is_content_admin());

create policy adventure_challenges_admin_insert
on public.adventure_challenges for insert to authenticated
with check (private.is_content_admin());
create policy adventure_challenges_admin_update
on public.adventure_challenges for update to authenticated
using (private.is_content_admin()) with check (private.is_content_admin());
create policy adventure_challenges_admin_delete
on public.adventure_challenges for delete to authenticated
using (private.is_content_admin());

create policy levels_admin_insert
on public.levels for insert to authenticated
with check (private.is_content_admin());
create policy levels_admin_update
on public.levels for update to authenticated
using (private.is_content_admin()) with check (private.is_content_admin());
create policy levels_admin_delete
on public.levels for delete to authenticated
using (private.is_content_admin());

create policy badges_admin_insert
on public.badges for insert to authenticated
with check (private.is_content_admin());
create policy badges_admin_update
on public.badges for update to authenticated
using (private.is_content_admin()) with check (private.is_content_admin());
create policy badges_admin_delete
on public.badges for delete to authenticated
using (private.is_content_admin());

create policy rewards_admin_insert
on public.rewards for insert to authenticated
with check (private.is_content_admin());
create policy rewards_admin_update
on public.rewards for update to authenticated
using (private.is_content_admin()) with check (private.is_content_admin());
create policy rewards_admin_delete
on public.rewards for delete to authenticated
using (private.is_content_admin());

grant select on public.app_admins to authenticated;
grant select on public.admin_audit_log to authenticated;
grant select, insert, update on public.notification_preferences to authenticated;
grant select, update on public.user_notifications to authenticated;
grant select, insert, update, delete on public.push_devices to authenticated;
grant select on public.child_activity_events to authenticated;
grant select on public.media_assets to anon, authenticated;
grant insert, update, delete on public.media_assets to authenticated;

grant insert, update, delete on public.books to authenticated;
grant insert, update, delete on public.content_items to authenticated;
grant insert, update, delete on public.book_content_links to authenticated;
grant insert, update, delete on public.adventures to authenticated;
grant insert, update, delete on public.adventure_content_links to authenticated;
grant insert, update, delete on public.challenges to authenticated;
grant insert, update, delete on public.challenge_steps to authenticated;
grant insert, update, delete on public.adventure_challenges to authenticated;
grant insert, update, delete on public.levels to authenticated;
grant insert, update, delete on public.badges to authenticated;
grant insert, update, delete on public.rewards to authenticated;

grant all on public.app_admins to service_role;
grant all on public.admin_audit_log to service_role;
grant all on public.notification_preferences to service_role;
grant all on public.user_notifications to service_role;
grant all on public.push_devices to service_role;
grant all on public.child_activity_events to service_role;
grant all on public.media_assets to service_role;
