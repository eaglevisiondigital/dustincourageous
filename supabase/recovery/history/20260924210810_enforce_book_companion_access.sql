create or replace function public.has_book_access(p_book_id uuid)
returns boolean
language sql
stable
security invoker
set search_path = ''
as $$
  select private.user_has_book_access(p_book_id);
$$;

revoke all on function public.has_book_access(uuid) from public;
grant execute on function public.has_book_access(uuid) to authenticated;

create or replace function private.enforce_child_book_access()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if (select auth.uid()) is not null
    and not private.user_has_book_access(new.book_id)
  then
    raise exception 'Book companion access required';
  end if;

  return new;
end;
$$;

drop trigger if exists enforce_child_book_access on public.child_book_progress;
create trigger enforce_child_book_access
before insert or update of book_id, status on public.child_book_progress
for each row execute function private.enforce_child_book_access();

create or replace function public.complete_child_book_adventure(
  p_child_profile_id uuid,
  p_book_id uuid
)
returns boolean
language plpgsql
set search_path = ''
as $$
declare
  v_ready boolean;
  v_xp integer;
begin
  if not private.can_manage_child(p_child_profile_id) then
    raise exception 'Guardian household access required';
  end if;

  if not private.user_has_book_access(p_book_id) then
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

  select adventure_completion_xp into v_xp
  from public.books
  where id=p_book_id;

  if coalesce(v_xp,0) > 0 then
    perform private.award_xp_event(
      p_child_profile_id,
      v_xp,
      'book_adventure_completed',
      'book',
      p_book_id,
      'Full Book Adventure completed'
    );
  end if;

  perform private.evaluate_child_badges(p_child_profile_id);

  return true;
end;
$$;

