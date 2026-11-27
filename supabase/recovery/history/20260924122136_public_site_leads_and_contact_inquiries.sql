
create table public.marketing_leads (
  id uuid primary key default gen_random_uuid(),
  lead_type text not null check (lead_type in ('adventure_club_waitlist','book_launch','general_updates','other')),
  source_page text,
  parent_guardian_name text,
  email text not null,
  child_first_name text,
  child_age smallint check (child_age is null or child_age between 0 and 18),
  parent_guardian_consent boolean not null default false,
  marketing_consent boolean not null default false,
  consent_text text,
  consented_at timestamptz,
  status text not null default 'active' check (status in ('active','unsubscribed','invalid','archived')),
  ip_hash text,
  user_agent_hash text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index marketing_leads_email_idx on public.marketing_leads(lower(email), created_at desc);
create index marketing_leads_type_idx on public.marketing_leads(lead_type, status, created_at desc);
create index marketing_leads_ip_idx on public.marketing_leads(ip_hash, created_at desc) where ip_hash is not null;

create table public.contact_inquiries (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email text not null,
  message text not null,
  source_page text,
  status text not null default 'new' check (status in ('new','in_progress','resolved','spam','archived')),
  ip_hash text,
  user_agent_hash text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index contact_inquiries_status_idx on public.contact_inquiries(status, created_at desc);
create index contact_inquiries_email_idx on public.contact_inquiries(lower(email), created_at desc);
create index contact_inquiries_ip_idx on public.contact_inquiries(ip_hash, created_at desc) where ip_hash is not null;

alter table public.marketing_leads enable row level security;
alter table public.contact_inquiries enable row level security;

create policy marketing_leads_admin_read
on public.marketing_leads for select
to authenticated
using (private.is_app_admin());

create policy contact_inquiries_admin_read
on public.contact_inquiries for select
to authenticated
using (private.is_app_admin());

create policy contact_inquiries_support_update
on public.contact_inquiries for update
to authenticated
using (
  exists (
    select 1 from public.app_admins aa
    where aa.user_id = (select auth.uid())
      and aa.status = 'active'
      and aa.role in ('super_admin','operations_admin','support_admin')
  )
)
with check (
  exists (
    select 1 from public.app_admins aa
    where aa.user_id = (select auth.uid())
      and aa.status = 'active'
      and aa.role in ('super_admin','operations_admin','support_admin')
  )
);

grant select on public.marketing_leads to authenticated;
grant select, update on public.contact_inquiries to authenticated;
grant all on public.marketing_leads to service_role;
grant all on public.contact_inquiries to service_role;
