
create table private.household_guardian_security (
  household_id uuid primary key references public.households(id) on delete cascade,
  pin_hash text not null,
  failed_attempts integer not null default 0 check (failed_attempts >= 0),
  locked_until timestamptz,
  updated_at timestamptz not null default now()
);

revoke all on private.household_guardian_security from public, anon, authenticated;

create or replace function public.set_guardian_pin(
  p_household_id uuid,
  p_pin text
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not private.can_manage_household(p_household_id) then
    raise exception 'Guardian access required';
  end if;

  if p_pin is null or p_pin !~ '^[0-9]{4,6}$' then
    raise exception 'Guardian PIN must be 4 to 6 digits';
  end if;

  insert into private.household_guardian_security (
    household_id, pin_hash, failed_attempts, locked_until, updated_at
  )
  values (
    p_household_id,
    extensions.crypt(p_pin, extensions.gen_salt('bf', 10)),
    0,
    null,
    now()
  )
  on conflict (household_id) do update
  set pin_hash = excluded.pin_hash,
      failed_attempts = 0,
      locked_until = null,
      updated_at = now();
end;
$$;

revoke all on function public.set_guardian_pin(uuid,text) from public, anon;
grant execute on function public.set_guardian_pin(uuid,text) to authenticated;

create or replace function public.guardian_pin_status(
  p_household_id uuid
)
returns table (
  configured boolean,
  locked_until timestamptz
)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not private.is_household_member(p_household_id) then
    raise exception 'Household access required';
  end if;

  return query
  select
    (hgs.household_id is not null) as configured,
    hgs.locked_until
  from (select p_household_id as household_id) input
  left join private.household_guardian_security hgs
    on hgs.household_id = input.household_id;
end;
$$;

revoke all on function public.guardian_pin_status(uuid) from public, anon;
grant execute on function public.guardian_pin_status(uuid) to authenticated;

create or replace function public.verify_guardian_pin(
  p_household_id uuid,
  p_pin text
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_row private.household_guardian_security%rowtype;
  v_next_attempts integer;
begin
  if not private.can_manage_household(p_household_id) then
    return false;
  end if;

  select *
    into v_row
  from private.household_guardian_security
  where household_id = p_household_id
  for update;

  if not found then
    return false;
  end if;

  if v_row.locked_until is not null and v_row.locked_until > now() then
    return false;
  end if;

  if extensions.crypt(p_pin, v_row.pin_hash) = v_row.pin_hash then
    update private.household_guardian_security
    set failed_attempts = 0,
        locked_until = null,
        updated_at = now()
    where household_id = p_household_id;

    return true;
  end if;

  v_next_attempts := v_row.failed_attempts + 1;

  update private.household_guardian_security
  set failed_attempts =
        case when v_next_attempts >= 5 then 0 else v_next_attempts end,
      locked_until =
        case when v_next_attempts >= 5 then now() + interval '15 minutes' else null end,
      updated_at = now()
  where household_id = p_household_id;

  return false;
end;
$$;

revoke all on function public.verify_guardian_pin(uuid,text) from public, anon;
grant execute on function public.verify_guardian_pin(uuid,text) to authenticated;
