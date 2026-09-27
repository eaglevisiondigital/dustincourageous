
create or replace function private.prevent_completed_progress_reversal()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if old.status = 'completed' and new.status <> 'completed' and not private.is_app_admin() then
    raise exception 'Completed progress cannot be reversed';
  end if;
  return new;
end;
$$;

revoke all on function private.prevent_completed_progress_reversal() from public, anon, authenticated;

drop trigger if exists challenge_progress_prevent_reversal on public.child_challenge_progress;
create trigger challenge_progress_prevent_reversal
before update of status on public.child_challenge_progress
for each row execute function private.prevent_completed_progress_reversal();

drop trigger if exists adventure_progress_prevent_reversal on public.child_adventure_progress;
create trigger adventure_progress_prevent_reversal
before update of status on public.child_adventure_progress
for each row execute function private.prevent_completed_progress_reversal();
