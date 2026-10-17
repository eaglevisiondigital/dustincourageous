-- Version matches the migration applied to the standalone Dustin project.
-- Keep the existing guardian authorization and RLS behavior. The write itself
-- must still match the submission that was reviewed, even after a concurrent write.
create or replace function public.approve_parent_challenge(
  p_progress_id uuid, p_guardian_session_token text
) returns void
language plpgsql
security invoker
set search_path = ''
as $function$
declare
  v_child_id uuid;
  v_household_id uuid;
  v_status text;
  v_parent_approval boolean;
  v_submitted_at timestamptz;
begin
  select ccp.child_profile_id, cp.household_id, ccp.status,
         c.parent_approval_required, ccp.submitted_at
  into v_child_id, v_household_id, v_status, v_parent_approval, v_submitted_at
  from public.child_challenge_progress ccp
  join public.child_profiles cp on cp.id = ccp.child_profile_id
  join public.challenges c on c.id = ccp.challenge_id
  where ccp.id = p_progress_id;

  if v_child_id is null then
    raise exception 'Challenge progress not found';
  end if;
  if not v_parent_approval then
    raise exception 'This challenge does not require guardian approval';
  end if;
  if v_status <> 'pending_parent' then
    raise exception 'Challenge is not waiting for guardian approval';
  end if;
  if not private.guardian_unlock_session_valid(v_household_id, p_guardian_session_token) then
    raise exception 'Guardian unlock session is invalid or expired';
  end if;

  perform set_config('dc.guardian_approval_verified', 'true', true);
  update public.child_challenge_progress
  set status = 'completed'
  where id = p_progress_id
    and child_profile_id = v_child_id
    and status = 'pending_parent'
    and submitted_at is not distinct from v_submitted_at;
  if not found then
    raise exception 'Challenge changed while being reviewed. Refresh the approval queue.';
  end if;
end;
$function$;

create or replace function public.return_parent_challenge(
  p_progress_id uuid, p_guardian_session_token text
) returns void
language plpgsql
security invoker
set search_path = ''
as $function$
declare
  v_child_id uuid;
  v_household_id uuid;
  v_submitted_at timestamptz;
begin
  select ccp.child_profile_id, cp.household_id, ccp.submitted_at
  into v_child_id, v_household_id, v_submitted_at
  from public.child_challenge_progress ccp
  join public.child_profiles cp on cp.id = ccp.child_profile_id
  where ccp.id = p_progress_id and ccp.status = 'pending_parent';

  if v_child_id is null then
    raise exception 'Pending challenge approval not found';
  end if;
  if not private.guardian_unlock_session_valid(v_household_id, p_guardian_session_token) then
    raise exception 'Guardian unlock session is invalid or expired';
  end if;

  update public.child_challenge_progress
  set status = 'in_progress', submitted_at = null
  where id = p_progress_id
    and child_profile_id = v_child_id
    and status = 'pending_parent'
    and submitted_at is not distinct from v_submitted_at;
  if not found then
    raise exception 'Challenge changed while being reviewed. Refresh the approval queue.';
  end if;
end;
$function$;
