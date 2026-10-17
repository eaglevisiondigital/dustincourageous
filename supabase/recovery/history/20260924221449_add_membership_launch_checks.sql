create or replace function private.admin_get_membership_tier_gate_impl()
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
  select
    'Membership'::text,
    'two_level_membership'::text,
    'Free and paid membership levels are active'::text,
    'blocker'::text,
    exists(select 1 from public.membership_plans where plan_key='free' and is_active=true)
      and exists(select 1 from public.membership_plans where plan_key='premium' and is_active=true),
    (
      select count(*)::text || ' required membership level(s) active'
      from public.membership_plans
      where plan_key in ('free','premium') and is_active=true
    );

  return query
  select
    'Membership'::text,
    'premium_feature_entitlements'::text,
    'Paid membership includes digital books and the complete challenge library'::text,
    'blocker'::text,
    (
      select count(distinct pe.entitlement_key)=2
      from public.membership_plans mp
      join public.plan_entitlements pe on pe.plan_id=mp.id
      where mp.plan_key='premium'
        and mp.is_active=true
        and pe.entitlement_key in ('digital_books','full_challenge_library')
    )
    and not exists(
      select 1
      from public.membership_plans mp
      join public.plan_entitlements pe on pe.plan_id=mp.id
      where mp.plan_key='free'
        and pe.entitlement_key in ('digital_books','full_challenge_library')
    ),
    'Paid-only feature boundaries enforced by entitlement';

  return query
  select
    'Membership'::text,
    'premium_pricing_approved'::text,
    'Paid membership pricing is approved and configured'::text,
    'warning'::text,
    exists(
      select 1
      from public.membership_plans mp
      where mp.plan_key='premium'
        and mp.is_active=true
        and coalesce(mp.monthly_price_cents,0)>0
    ),
    case
      when exists(
        select 1 from public.membership_plans mp
        where mp.plan_key='premium' and mp.is_active=true and coalesce(mp.monthly_price_cents,0)>0
      ) then 'Monthly paid membership price configured'
      else 'Final paid membership pricing is still pending approval'
    end;

  return query
  select
    'Membership'::text,
    'free_challenge_available'::text,
    'Free members have a published Courage Challenge'::text,
    'blocker'::text,
    exists(
      select 1 from public.challenges c
      where c.status='published'
        and c.access_level='free'
        and (c.available_from is null or c.available_from<=now())
        and (c.available_until is null or c.available_until>now())
    ),
    (
      select count(*)::text || ' free challenge(s) currently available'
      from public.challenges c
      where c.status='published'
        and c.access_level='free'
        and (c.available_from is null or c.available_from<=now())
        and (c.available_until is null or c.available_until>now())
    );

  return query
  select
    'Membership'::text,
    'premium_challenge_available'::text,
    'Paid members have premium challenges available'::text,
    'warning'::text,
    exists(
      select 1 from public.challenges c
      where c.status='published'
        and c.access_level='premium'
        and (c.available_from is null or c.available_from<=now())
        and (c.available_until is null or c.available_until>now())
    ),
    (
      select count(*)::text || ' premium challenge(s) currently available'
      from public.challenges c
      where c.status='published'
        and c.access_level='premium'
        and (c.available_from is null or c.available_from<=now())
        and (c.available_until is null or c.available_until>now())
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
  select * from private.admin_get_book_launch_gate_impl()
  union all
  select * from private.admin_get_book_release_gate_impl()
  union all
  select * from private.admin_get_membership_tier_gate_impl();
$$;

