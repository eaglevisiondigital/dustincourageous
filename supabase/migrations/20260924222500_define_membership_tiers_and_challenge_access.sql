insert into public.entitlement_definitions (
  entitlement_key,
  name,
  description,
  is_active
)
values
  (
    'digital_books',
    'Digital Book Library',
    'Access to digital Dustin Courageous books included with the paid membership.',
    true
  ),
  (
    'full_challenge_library',
    'Complete Challenge Library',
    'Access to the complete premium Adventure Club challenge library.',
    true
  )
on conflict (entitlement_key) do update
set name=excluded.name,
    description=excluded.description,
    is_active=excluded.is_active,
    updated_at=now();

insert into public.plan_entitlements (plan_id,entitlement_key)
select mp.id,e.entitlement_key
from public.membership_plans mp
cross join (
  values ('digital_books'::text),('full_challenge_library'::text)
) e(entitlement_key)
where mp.plan_key='premium'
  and mp.is_active=true
on conflict (plan_id,entitlement_key) do nothing;

drop policy if exists challenges_read_authenticated on public.challenges;
create policy challenges_read_authenticated
on public.challenges
for select
to authenticated
using (
  status='published'
  and (available_from is null or available_from<=now())
  and (available_until is null or available_until>now())
  and (
    access_level='free'
    or (access_level='member' and private.user_has_household())
    or (
      access_level='premium'
      and private.user_has_active_entitlement('full_challenge_library')
    )
  )
);

create or replace function private.user_can_access_challenge(p_challenge_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select private.is_app_admin()
    or exists (
      select 1
      from public.challenges c
      where c.id=p_challenge_id
        and c.status='published'
        and (c.available_from is null or c.available_from<=now())
        and (c.available_until is null or c.available_until>now())
        and (
          c.access_level='free'
          or (c.access_level='member' and private.user_has_household())
          or (
            c.access_level='premium'
            and private.user_has_active_entitlement('full_challenge_library')
          )
        )
    );
$$;

create or replace function private.enforce_child_challenge_access()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if (select auth.uid()) is not null
    and not private.user_can_access_challenge(new.challenge_id)
  then
    raise exception 'Challenge access required';
  end if;

  return new;
end;
$$;

drop trigger if exists enforce_child_challenge_access on public.child_challenge_progress;
create trigger enforce_child_challenge_access
before insert or update of challenge_id,status on public.child_challenge_progress
for each row execute function private.enforce_child_challenge_access();

