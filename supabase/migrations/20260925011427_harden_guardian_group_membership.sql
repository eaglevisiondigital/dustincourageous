set lock_timeout = '5s';

CREATE OR REPLACE FUNCTION private.join_child_to_group_impl(p_code text, p_child_profile_id uuid)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_join_code private.group_join_codes%rowtype;
  v_group_id uuid;
  v_household_id uuid;
  v_policy_version text;
begin
  if (select auth.uid()) is null or not private.can_manage_child(p_child_profile_id) then
    raise exception 'Guardian access required';
  end if;

  select cp.household_id
    into v_household_id
  from public.child_profiles cp
  where cp.id=p_child_profile_id and cp.status='active'
  for update;

  if not found then
    raise exception 'Active child profile required';
  end if;

  select *
    into v_join_code
  from private.group_join_codes
  where code_hash=encode(
      extensions.digest(upper(trim(p_code)),'sha256'),'hex'
    )
    and is_active=true
    and expires_at>now()
  for update;

  if not found then
    raise exception 'Join code is invalid, expired, or full';
  end if;

  if not exists(
    select 1
    from public.adventure_groups ag
    join public.organizations o on o.id=ag.organization_id
    where ag.id=v_join_code.group_id
      and ag.status='active'
      and o.status='active'
  ) then
    raise exception 'Group is not active';
  end if;

  -- The child lock serializes joins through different codes and withdrawal.
  -- An already-active membership does not consume another use or rewrite approval.
  if exists (
    select 1 from public.child_group_memberships
    where group_id=v_join_code.group_id and child_profile_id=p_child_profile_id
      and status='active'
  ) then
    return v_join_code.group_id;
  end if;

  if v_join_code.max_uses is not null and v_join_code.use_count>=v_join_code.max_uses then
    raise exception 'Join code is invalid, expired, or full';
  end if;

  select current_policy_version into v_policy_version
  from public.consent_policies
  where consent_key='group_participation' and is_active=true;
  if v_policy_version is null then
    raise exception 'Group participation consent is unavailable';
  end if;

  insert into public.child_group_memberships(
    group_id,child_profile_id,status,
    guardian_approved_by,guardian_approved_at,joined_at
  )
  values(
    v_join_code.group_id,
    p_child_profile_id,
    'active',
    (select auth.uid()),
    now(),
    now()
  )
  on conflict(group_id,child_profile_id) do update
  set status='active',
      guardian_approved_by=(select auth.uid()),
      guardian_approved_at=now(),
      joined_at=now(),
      ended_at=null;

  if v_policy_version is not null
     and not exists (
       select 1
       from public.current_household_consents chc
       where chc.household_id=v_household_id
         and chc.child_profile_id=p_child_profile_id
         and chc.consent_key='group_participation'
         and chc.action='granted'
         and chc.policy_version=v_policy_version
     ) then
    insert into public.household_consents(
      household_id,guardian_user_id,child_profile_id,
      consent_key,action,policy_version,metadata
    )
    values(
      v_household_id,
      (select auth.uid()),
      p_child_profile_id,
      'group_participation',
      'granted',
      v_policy_version,
      jsonb_build_object(
        'surface','group_join',
        'group_id',v_join_code.group_id
      )
    );
  end if;

  update private.group_join_codes
  set use_count=use_count+1
  where id=v_join_code.id;

  v_group_id:=v_join_code.group_id;
  return v_group_id;
end;
$function$;


-- Keep joins behind the code-validated guardian RPC. Direct updates can only
-- withdraw an existing membership, supporting both withdrawal and archiving.
revoke insert, update on public.child_group_memberships from public, anon, authenticated;
revoke insert (id,group_id,child_profile_id,status,guardian_approved_by,guardian_approved_at,joined_at,ended_at,metadata),
  update (id,group_id,child_profile_id,status,guardian_approved_by,guardian_approved_at,joined_at,ended_at,metadata)
  on public.child_group_memberships from public, anon, authenticated;
grant update (status,ended_at) on public.child_group_memberships to authenticated;

drop policy if exists child_group_memberships_insert on public.child_group_memberships;
drop policy if exists child_group_memberships_update on public.child_group_memberships;
create policy child_group_memberships_update on public.child_group_memberships
for update to authenticated
using (private.can_manage_child(child_profile_id))
with check (private.can_manage_child(child_profile_id) and status='withdrawn' and ended_at is not null);

create or replace function public.withdraw_child_from_group(p_group_id uuid,p_child_profile_id uuid)
returns void language plpgsql security invoker set search_path='' as $$
begin
  if (select auth.uid()) is null or not private.can_manage_child(p_child_profile_id) then
    raise exception 'Guardian access required';
  end if;
  perform 1 from public.child_profiles where id=p_child_profile_id for update;
  update public.child_group_memberships
  set status='withdrawn',ended_at=coalesce(ended_at,now())
  where group_id=p_group_id and child_profile_id=p_child_profile_id;
  if not found then raise exception 'Group membership not found'; end if;
end;
$$;

revoke all on function private.join_child_to_group_impl(text,uuid) from public,anon;
grant execute on function private.join_child_to_group_impl(text,uuid) to authenticated;
revoke all on function public.join_child_to_group(text,uuid) from public,anon;
grant execute on function public.join_child_to_group(text,uuid) to authenticated;
revoke all on function public.withdraw_child_from_group(uuid,uuid) from public,anon;
grant execute on function public.withdraw_child_from_group(uuid,uuid) to authenticated;
