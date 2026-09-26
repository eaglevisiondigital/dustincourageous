-- Keep earned book and adventure milestones from moving backward.
create or replace function private.prevent_book_progress_regression()
returns trigger
language plpgsql
set search_path = ''
as $function$
begin
  if old.status = 'adventure_completed' and new.status <> 'adventure_completed' then
    raise exception 'A completed Book Adventure cannot be restarted';
  end if;

  if old.status = 'completed' and new.status in ('available', 'reading') then
    raise exception 'A completed book cannot be restarted';
  end if;

  return new;
end;
$function$;

drop trigger if exists prevent_book_progress_regression on public.child_book_progress;
create trigger prevent_book_progress_regression
before update of status on public.child_book_progress
for each row execute function private.prevent_book_progress_regression();
