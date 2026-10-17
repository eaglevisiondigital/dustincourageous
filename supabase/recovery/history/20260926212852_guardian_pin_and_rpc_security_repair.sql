-- Forward-only repair for the deployed Adventure Club schema (September 26 audit).
-- Depends on existing guardian security/session tables, RLS, book progress,
-- readiness, entitlement, XP/badge helpers and the admin launch-gate wrapper.
-- No historical migration replay, table/policy change or data rewrite.
-- Recovery: prefer a corrective forward migration. Revoking the three new
-- EXECUTE grants fails these paths closed; restoring the old unlock body
-- would reintroduce the PIN lockout defect and is not a safe rollback.
set lock_timeout='5s';
set statement_timeout='30s';

CREATE OR REPLACE FUNCTION private.verify_guardian_pin_impl(p_household_id uuid, p_pin text)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_row private.household_guardian_security%rowtype;
  v_next_attempts integer;
  v_now timestamptz;
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

  -- Evaluate time after the row lock: concurrent requests serialize here.
  v_now := clock_timestamp();
  if v_row.locked_until is not null and v_row.locked_until > v_now then
    return false;
  end if;

  if extensions.crypt(p_pin, v_row.pin_hash) = v_row.pin_hash then
    update private.household_guardian_security
    set failed_attempts = 0,
        locked_until = null,
        updated_at = v_now
    where household_id = p_household_id;
    return true;
  end if;

  v_next_attempts := v_row.failed_attempts + 1;

  update private.household_guardian_security
  set failed_attempts =
        case when v_next_attempts >= 5 then 0 else v_next_attempts end,
      locked_until =
        case when v_next_attempts >= 5 then v_now + interval '15 minutes' else null end,
      updated_at = v_now
  where household_id = p_household_id;

  return false;
end;
$function$;

CREATE OR REPLACE FUNCTION private.create_guardian_unlock_session_impl(p_household_id uuid, p_pin text)
 RETURNS text
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_token text;
begin
  if not private.verify_guardian_pin_impl(p_household_id,p_pin) then
    -- A normal NULL response commits the attempt/lockout changes.
    -- Raising here would roll back the verifier's security state.
    return null;
  end if;

  update private.guardian_unlock_sessions
  set revoked_at=clock_timestamp()
  where household_id=p_household_id
    and user_id=(select auth.uid())
    and revoked_at is null;

  v_token := encode(extensions.gen_random_bytes(32),'hex');

  insert into private.guardian_unlock_sessions(
    household_id,user_id,token_hash,expires_at
  )
  values(
    p_household_id,
    (select auth.uid()),
    encode(extensions.digest(v_token,'sha256'),'hex'),
    clock_timestamp()+interval '30 minutes'
  );

  return v_token;
end;
$function$;

create or replace function private.guardian_unlock_session_valid(p_household_id uuid, p_token text)
returns boolean language plpgsql security definer set search_path='' as $function$
declare v_id uuid;
begin
  if not private.can_manage_household(p_household_id) then return false; end if;
  -- Check and touch the session in one statement. A concurrent revocation is
  -- rechecked after its row lock, and expiry uses wall time rather than tx start.
  update private.guardian_unlock_sessions gus
  set last_used_at=clock_timestamp()
  where gus.household_id=p_household_id
    and gus.user_id=(select auth.uid())
    and gus.revoked_at is null
    and gus.expires_at>clock_timestamp()
    and gus.token_hash=encode(extensions.digest(trim(p_token),'sha256'),'hex')
  returning gus.id into v_id;
  return v_id is not null;
end;
$function$;

-- The helper checks Auth identity, guardian membership, household, hash, expiry
-- and revocation internally; its sole mutation is last_used_at on that session.
revoke all on function private.guardian_unlock_session_valid(uuid,text) from public,anon;
grant execute on function private.guardian_unlock_session_valid(uuid,text) to authenticated;

create or replace function private.award_completed_book_adventure(p_child_profile_id uuid,p_book_id uuid)
returns void language plpgsql security definer set search_path='' as $function$
declare
  v_ready boolean;
  v_xp integer;
begin
  if (select auth.uid()) is null or not private.can_manage_child(p_child_profile_id) then
    raise exception 'Guardian household access required';
  end if;
  if not private.child_has_book_companion_access(p_child_profile_id,p_book_id) then
    raise exception 'Book companion access required';
  end if;
  -- This wrapper accepts identifiers only, never caller-selected XP or sources.
  -- The invoker RPC must already have persisted completed progress under RLS.
  perform 1 from public.child_book_progress
  where child_profile_id=p_child_profile_id and book_id=p_book_id
    and status='adventure_completed' and adventure_completed_at is not null
  for update;
  if not found then raise exception 'Completed Book Adventure required'; end if;

  select adventure_completion_xp into v_xp from public.books
  where id=p_book_id and (status in ('coming_soon','published') or private.is_app_admin());
  if not found then raise exception 'Book is not available'; end if;

  -- Recheck authoritative required steps inside this privileged boundary.
  -- A hidden/incomplete linked requirement must not become an award shortcut.
  select ready_for_adventure_completion into v_ready
  from public.get_child_book_adventure_summary(p_child_profile_id,p_book_id);
  if not coalesce(v_ready,false) then
    raise exception 'Required Book Adventure steps are not complete';
  end if;

  if coalesce(v_xp,0)>0 then
    perform private.award_xp_event(p_child_profile_id,v_xp,
      'book_adventure_completed','book',p_book_id,'Full Book Adventure completed');
  end if;
  perform private.evaluate_child_badges(p_child_profile_id);
end;
$function$;
revoke all on function private.award_completed_book_adventure(uuid,uuid) from public,anon;
grant execute on function private.award_completed_book_adventure(uuid,uuid) to authenticated;

CREATE OR REPLACE FUNCTION public.complete_child_book_adventure(p_child_profile_id uuid, p_book_id uuid)
 RETURNS boolean
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
declare
  v_ready boolean;
begin
  if not private.can_manage_child(p_child_profile_id) then
    raise exception 'Guardian household access required';
  end if;

  if not private.child_has_book_companion_access(p_child_profile_id,p_book_id) then
    raise exception 'Book companion access required';
  end if;

  select ready_for_adventure_completion
    into v_ready
  from public.get_child_book_adventure_summary(p_child_profile_id,p_book_id);

  if not coalesce(v_ready,false) then
    raise exception 'Required Book Adventure steps are not complete';
  end if;

  insert into public.child_book_progress (
    child_profile_id,book_id,status,started_at,completed_at,adventure_completed_at
  )
  values (
    p_child_profile_id,p_book_id,'adventure_completed',now(),now(),now()
  )
  on conflict (child_profile_id,book_id) do update
  set status='adventure_completed',
      started_at=coalesce(public.child_book_progress.started_at,now()),
      completed_at=coalesce(public.child_book_progress.completed_at,now()),
      adventure_completed_at=coalesce(public.child_book_progress.adventure_completed_at,now());

  perform private.award_completed_book_adventure(p_child_profile_id,p_book_id);

  return true;
end;
$function$;

-- This existing no-argument definer checks private.is_app_admin(), backed by
-- app_admins rather than editable metadata. Other gate components already use
-- this same boundary. The public gate remains SECURITY INVOKER.
revoke all on function private.admin_get_production_launch_gate_impl() from public,anon;
grant execute on function private.admin_get_production_launch_gate_impl() to authenticated;

-- Required revocation regression exposed the same boundary defect: this
-- existing, explicitly authorized RPC could not update its private table.
-- Definer access is restricted to the caller's own sessions in a managed home.
CREATE OR REPLACE FUNCTION public.revoke_guardian_unlock_sessions(p_household_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
begin
  if not private.can_manage_household(p_household_id) then
    raise exception 'Guardian household access required';
  end if;

  update private.guardian_unlock_sessions
  set revoked_at=clock_timestamp()
  where household_id=p_household_id
    and user_id=(select auth.uid())
    and revoked_at is null;
end;
$function$;
revoke all on function public.revoke_guardian_unlock_sessions(uuid) from public,anon;

-- Raw award_xp_event/evaluate_child_badges grants are deliberately unchanged.
reset lock_timeout;
reset statement_timeout;
