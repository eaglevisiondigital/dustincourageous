create or replace function private.admin_get_book_launch_gate_impl()
returns table(
  area text,
  check_key text,
  title text,
  severity text,
  passed boolean,
  detail text
)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not private.is_app_admin() then
    raise exception 'Adventure Club administrator access required';
  end if;

  return query
  with public_books as (
    select b.id
    from public.books b
    where b.status in ('coming_soon','published')
  ), incomplete as (
    select pb.id
    from public_books pb
    where not exists (select 1 from public.book_power_verses x where x.book_id=pb.id and x.is_required)
       or not exists (select 1 from public.book_devotional_series x where x.book_id=pb.id and x.is_required)
       or not exists (select 1 from public.book_prayer_prompts x where x.book_id=pb.id and x.is_required)
       or not exists (select 1 from public.book_identity_truths x where x.book_id=pb.id and x.is_required)
       or not exists (select 1 from public.book_challenges x where x.book_id=pb.id and x.is_required)
       or not exists (select 1 from public.book_content_links x where x.book_id=pb.id and x.is_required)
  )
  select
    'Books'::text,
    'book_companion_structure'::text,
    'Public books have complete companion pathways'::text,
    'blocker'::text,
    not exists(select 1 from incomplete),
    (select count(*)::text || ' public book(s) missing a required companion component' from incomplete);

  return query
  select
    'Books'::text,
    'book_reward_configuration'::text,
    'Public books have completion rewards configured'::text,
    'blocker'::text,
    not exists(
      select 1 from public.books b
      where b.status in ('coming_soon','published')
        and (coalesce(b.completion_xp,0)<=0 or coalesce(b.adventure_completion_xp,0)<=0)
    ),
    (
      select count(*)::text || ' public book(s) missing book or adventure XP'
      from public.books b
      where b.status in ('coming_soon','published')
        and (coalesce(b.completion_xp,0)<=0 or coalesce(b.adventure_completion_xp,0)<=0)
    );

  return query
  select
    'Membership'::text,
    'book_companion_entitlement'::text,
    'Book Companion access has an active entitlement path'::text,
    'blocker'::text,
    exists(
      select 1
      from public.plan_entitlements pe
      join public.membership_plans mp on mp.id=pe.plan_id
      where pe.entitlement_key='book_companions'
        and mp.is_active=true
    ),
    (
      select count(*)::text || ' active membership plan(s) grant Book Companions'
      from public.plan_entitlements pe
      join public.membership_plans mp on mp.id=pe.plan_id
      where pe.entitlement_key='book_companions'
        and mp.is_active=true
    );
end;
$$;

create or replace function public.admin_get_production_launch_gate()
returns table(
  area text,
  check_key text,
  title text,
  severity text,
  passed boolean,
  detail text
)
language sql
stable
security invoker
set search_path = ''
as $$
  select * from private.admin_get_production_launch_gate_impl()
  union all
  select * from private.admin_get_book_launch_gate_impl();
$$;

