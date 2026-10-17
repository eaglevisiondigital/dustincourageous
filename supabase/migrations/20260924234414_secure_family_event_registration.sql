-- Guardians retain read-only table access. These narrow commands validate the
-- caller before performing writes and counting seats across all households.
create or replace function private.register_for_event_impl(
  p_event_id uuid, p_household_id uuid, p_child_profile_id uuid default null
) returns text language plpgsql security definer set search_path='' as $$
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
  if p_child_profile_id is not null and not exists (
    select 1 from public.child_profiles where id=p_child_profile_id and household_id=p_household_id
  ) then raise exception 'Child does not belong to this household'; end if;

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
$$;

create or replace function private.cancel_event_registration_impl(p_registration_id uuid)
returns void language plpgsql security definer set search_path='' as $$
declare v_event_id uuid;
begin
  if (select auth.uid()) is null then raise exception 'Guardian household access required'; end if;
  select event_id into v_event_id from public.event_registrations
  where id=p_registration_id and private.can_manage_household(household_id);
  if not found then raise exception 'Registration not found'; end if;
  -- Match registration's lock order so cancellation cannot race its seat count.
  perform 1 from public.events where id=v_event_id for update;
  update public.event_registrations set status='canceled',canceled_at=coalesce(canceled_at,now())
  where id=p_registration_id and private.can_manage_household(household_id)
    and status in ('registered','waitlist','canceled');
  if not found then raise exception 'Registration cannot be canceled'; end if;
end;
$$;

revoke all on function private.register_for_event_impl(uuid,uuid,uuid) from public,anon;
revoke all on function private.cancel_event_registration_impl(uuid) from public,anon;
grant execute on function private.register_for_event_impl(uuid,uuid,uuid) to authenticated;
grant execute on function private.cancel_event_registration_impl(uuid) to authenticated;

create or replace function public.register_for_event(
  p_event_id uuid,p_household_id uuid,p_child_profile_id uuid default null
) returns text language sql security invoker set search_path='' as $$
  select private.register_for_event_impl(p_event_id,p_household_id,p_child_profile_id);
$$;
create or replace function public.cancel_event_registration(p_registration_id uuid)
returns void language sql security invoker set search_path='' as $$
  select private.cancel_event_registration_impl(p_registration_id);
$$;
revoke all on function public.register_for_event(uuid,uuid,uuid) from public,anon;
revoke all on function public.cancel_event_registration(uuid) from public,anon;
grant execute on function public.register_for_event(uuid,uuid,uuid) to authenticated;
grant execute on function public.cancel_event_registration(uuid) to authenticated;
