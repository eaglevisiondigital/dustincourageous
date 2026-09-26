-- Family actions write existing per-child records in one transaction. No new XP
-- rules or approval bypasses: existing progress/completion triggers remain authoritative.
create or replace function public.complete_family_faith_participants(
 p_household_id uuid,p_guide_id uuid,p_child_ids uuid[])
returns table(child_profile_id uuid,status text)
language plpgsql security invoker set search_path=''
as $$
declare v_child uuid; v_ids uuid[];
begin
 if (select auth.uid()) is null or not private.can_manage_household(p_household_id) then
  raise exception 'Guardian household access required'; end if;
 select array_agg(distinct x order by x) into v_ids from unnest(p_child_ids) x;
 if coalesce(cardinality(v_ids),0)=0 or cardinality(v_ids)>100 or array_position(v_ids,null) is not null then
  raise exception 'Choose participating children'; end if;
 if exists(select 1 from unnest(v_ids) x where not exists(select 1 from public.child_profiles cp
   where cp.id=x and cp.household_id=p_household_id and cp.status='active')) then
  raise exception 'Every participant must be an active child in this household'; end if;
 if not exists(select 1 from public.family_faith_guides g where g.id=p_guide_id
   and g.status='published' and (g.available_from is null or g.available_from<=now())
   and (g.available_until is null or g.available_until>now())
   and (g.access_level in ('free','member') or (g.access_level='premium'
     and private.household_has_active_entitlement(p_household_id,'premium_content')))) then
  raise exception 'Family Faith access required'; end if;
 foreach v_child in array v_ids loop
  insert into public.household_faith_sessions(household_id,family_faith_guide_id,child_profile_id,completed_by)
   values(p_household_id,p_guide_id,v_child,(select auth.uid()))
   on conflict on constraint household_faith_sessions_household_id_family_faith_guide_id_key do nothing;
  child_profile_id:=v_child; status:='completed'; return next;
 end loop;
end;
$$;
revoke all on function public.complete_family_faith_participants(uuid,uuid,uuid[]) from public,anon;
grant execute on function public.complete_family_faith_participants(uuid,uuid,uuid[]) to authenticated;

create or replace function public.save_family_challenge_participants(
 p_household_id uuid,p_challenge_id uuid,p_child_ids uuid[],p_action text,p_step_ids uuid[] default '{}')
returns table(child_profile_id uuid,status text)
language plpgsql security invoker set search_path=''
as $$
declare v_child uuid; v_ids uuid[]; v_progress uuid; v_status text; v_approval boolean;
begin
 if (select auth.uid()) is null or not private.can_manage_household(p_household_id) then
  raise exception 'Guardian household access required'; end if;
 if p_action is null or p_action not in ('participate','complete') then raise exception 'Invalid family action'; end if;
 select array_agg(distinct x order by x) into v_ids from unnest(p_child_ids) x;
 if coalesce(cardinality(v_ids),0)=0 or cardinality(v_ids)>100 or array_position(v_ids,null) is not null then
  raise exception 'Choose participating children'; end if;
 -- Validate the entire selection before any writes. Any later failure also rolls back all children.
 if exists(select 1 from unnest(v_ids) x where not exists(select 1 from public.child_profiles cp
   where cp.id=x and cp.household_id=p_household_id and cp.status='active')
   or not private.child_can_access_challenge(x,p_challenge_id)) then
  raise exception 'Every participant must have access to this challenge in this household'; end if;
 select c.parent_approval_required into v_approval from public.challenges c where c.id=p_challenge_id;
 if not found then raise exception 'Challenge access required'; end if;
 if exists(select 1 from unnest(p_step_ids) x where x is null or not exists(
   select 1 from public.challenge_steps cs where cs.id=x and cs.challenge_id=p_challenge_id)) then
  raise exception 'Invalid challenge step'; end if;
 if p_action='complete' and exists(select 1 from public.challenge_steps cs
   where cs.challenge_id=p_challenge_id and cs.is_required and not(cs.id=any(coalesce(p_step_ids,'{}')))) then
  raise exception 'Confirm every required step for the selected children'; end if;
 foreach v_child in array v_ids loop
  insert into public.child_challenge_progress(child_profile_id,challenge_id,status,started_at)
   values(v_child,p_challenge_id,'in_progress',now())
   on conflict on constraint child_challenge_progress_child_profile_id_challenge_id_key do nothing;
  select p.id,p.status into v_progress,v_status from public.child_challenge_progress p
   where p.child_profile_id=v_child and p.challenge_id=p_challenge_id for update;
  if v_progress is null then raise exception 'Progress could not be confirmed'; end if;
  if v_status not in ('completed','pending_parent') then
   insert into public.child_step_progress(child_challenge_progress_id,challenge_step_id,completed,completed_at)
    select v_progress,x,true,now() from (select distinct unnest(p_step_ids) x) s
    on conflict (child_challenge_progress_id,challenge_step_id) do update set completed=true,completed_at=excluded.completed_at;
   update public.child_challenge_progress p set
    status=case when p_action='complete' then case when v_approval then 'pending_parent' else 'completed' end else 'in_progress' end,
    started_at=coalesce(p.started_at,now()),submitted_at=case when p_action='complete' then now() else p.submitted_at end
    where p.id=v_progress returning p.status into v_status;
  end if;
  child_profile_id:=v_child; status:=v_status; return next;
 end loop;
end;
$$;
revoke all on function public.save_family_challenge_participants(uuid,uuid,uuid[],text,uuid[]) from public,anon;
grant execute on function public.save_family_challenge_participants(uuid,uuid,uuid[],text,uuid[]) to authenticated;
