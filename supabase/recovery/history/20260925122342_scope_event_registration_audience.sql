-- Family participation must not inherit another child's audience or a leader's
-- management authority. Whole-family registrations require this household to qualify.
create or replace function private.event_audience_allows_registration(
  p_event_id uuid,p_household_id uuid,p_child_profile_id uuid default null)
returns boolean language sql stable security definer set search_path=''
as $$
 select (select auth.uid()) is not null
   and private.can_manage_household(p_household_id)
   and (p_child_profile_id is null or exists (
     select 1 from public.child_profiles cp where cp.id=p_child_profile_id
       and cp.household_id=p_household_id and cp.status='active'))
   and exists (
     select 1 from public.events e where e.id=p_event_id and e.status='published'
       and case
         when e.group_id is not null then exists (
           select 1 from public.adventure_groups ag
           join public.organizations o on o.id=ag.organization_id
           join public.child_group_memberships cgm on cgm.group_id=ag.id
           join public.child_profiles cp on cp.id=cgm.child_profile_id
           where ag.id=e.group_id and ag.status='active' and o.status='active'
             and (e.organization_id is null or e.organization_id=ag.organization_id)
             and cgm.status='active' and cp.status='active'
             and cp.household_id=p_household_id
             and (p_child_profile_id is null or cp.id=p_child_profile_id))
         when e.organization_id is not null then exists (
           select 1 from public.organizations o where o.id=e.organization_id and o.status='active'
             and ((p_child_profile_id is null and private.is_org_member(o.id))
               or exists (
                 select 1 from public.adventure_groups ag
                 join public.child_group_memberships cgm on cgm.group_id=ag.id
                 join public.child_profiles cp on cp.id=cgm.child_profile_id
                 where ag.organization_id=o.id and ag.status='active'
                   and cgm.status='active' and cp.status='active'
                   and cp.household_id=p_household_id
                   and (p_child_profile_id is null or cp.id=p_child_profile_id))))
         else true
       end);
$$;
revoke all on function private.event_audience_allows_registration(uuid,uuid,uuid) from public,anon;
grant execute on function private.event_audience_allows_registration(uuid,uuid,uuid) to authenticated;

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

  if not private.event_audience_allows_registration(p_event_id,p_household_id,p_child_profile_id) then
    raise exception 'Event is not available for this family selection';
  end if;

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
