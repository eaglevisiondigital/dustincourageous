-- Isolated function-logic fixtures. Authorization helpers are mocked; this does
-- not replace signed-in RLS tests or a simultaneous multi-session load test.
begin;
create temp table events(id uuid primary key,capacity integer,status text,starts_at timestamptz);
create temp table child_profiles(id uuid primary key,household_id uuid);
create temp table event_registrations(
  id uuid primary key default gen_random_uuid(),event_id uuid,household_id uuid,
  child_profile_id uuid,registered_by uuid,status text,
  registered_at timestamptz default now(),canceled_at timestamptz
);
create unique index on event_registrations(event_id,household_id) where child_profile_id is null;
create unique index on event_registrations(event_id,child_profile_id) where child_profile_id is not null;
create function pg_temp.can_manage_household(id uuid) returns boolean language sql as $$
 select id=current_setting('test.household')::uuid;
$$;
create function pg_temp.can_view_event(id uuid) returns boolean language sql as $$ select true; $$;
do $$
declare name text; definition text;
begin
  foreach name in array array['register_for_event_impl','cancel_event_registration_impl'] loop
    select pg_get_functiondef(p.oid) into definition from pg_proc p join pg_namespace n on n.oid=p.pronamespace
    where n.nspname='private' and p.proname=name;
    definition:=replace(definition,'private.'||name,'pg_temp.'||name);
    definition:=replace(definition,'public.','pg_temp.');
    definition:=replace(definition,'private.can_manage_household','pg_temp.can_manage_household');
    definition:=replace(definition,'private.can_view_event','pg_temp.can_view_event');
    execute definition;
  end loop;
end;
$$;
select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000001',true);
do $$
declare
  event_id uuid:=gen_random_uuid(); household_a uuid:=gen_random_uuid(); household_b uuid:=gen_random_uuid();
  child_a uuid:=gen_random_uuid(); registration_id uuid; result text;
begin
  insert into pg_temp.events values(event_id,1,'published',now()+interval '1 day');
  insert into pg_temp.child_profiles values(child_a,household_a);
  perform set_config('test.household',household_a::text,true);
  result:=pg_temp.register_for_event_impl(event_id,household_a,child_a);
  if result<>'registered' then raise exception 'First seat not registered'; end if;
  result:=pg_temp.register_for_event_impl(event_id,household_a,child_a);
  if result<>'registered' then raise exception 'Repeat registration lost its seat'; end if;
  select id into registration_id from pg_temp.event_registrations where child_profile_id=child_a;
  perform set_config('test.household',household_b::text,true);
  begin
    perform pg_temp.register_for_event_impl(event_id,household_a,null);
    raise exception 'Other household registration allowed';
  exception when others then
    if sqlerrm<>'Guardian household access required' then raise; end if;
  end;
  result:=pg_temp.register_for_event_impl(event_id,household_b,null);
  if result<>'waitlist' then raise exception 'Other household capacity not counted'; end if;
  begin
    perform pg_temp.cancel_event_registration_impl(registration_id);
    raise exception 'Cross-household cancellation allowed';
  exception when others then
    if sqlerrm<>'Registration not found' then raise; end if;
  end;
  begin
    perform pg_temp.register_for_event_impl(event_id,household_b,child_a);
    raise exception 'Cross-household child allowed';
  exception when others then
    if sqlerrm<>'Child does not belong to this household' then raise; end if;
  end;
  perform set_config('test.household',household_a::text,true);
  perform pg_temp.cancel_event_registration_impl(registration_id);
  perform pg_temp.cancel_event_registration_impl(registration_id);
  if (select status from pg_temp.event_registrations where id=registration_id)<>'canceled' then raise exception 'Cancel failed'; end if;
  result:=pg_temp.register_for_event_impl(event_id,household_a,child_a);
  if result<>'registered' then raise exception 'Re-registration failed'; end if;
  update pg_temp.event_registrations set status='attended' where id=registration_id;
  begin
    perform pg_temp.cancel_event_registration_impl(registration_id);
    raise exception 'Attendance was erased';
  exception when others then
    if sqlerrm<>'Registration cannot be canceled' then raise; end if;
  end;
  update pg_temp.events set starts_at=now()-interval '1 hour';
  begin
    perform pg_temp.register_for_event_impl(event_id,household_a,null);
    raise exception 'Past event registration allowed';
  exception when others then
    if sqlerrm<>'Event registration is closed' then raise; end if;
  end;
  perform set_config('request.jwt.claim.sub','',true);
  begin
    perform pg_temp.register_for_event_impl(event_id,household_a,null);
    raise exception 'Unauthenticated registration allowed';
  exception when others then
    if sqlerrm<>'Guardian household access required' then raise; end if;
  end;
end;
$$;
select 'family event regression fixtures passed' as result;
rollback;
