create or replace function private.admin_get_book_release_gate_impl()
returns table(
  area text,
  check_key text,
  title text,
  severity text,
  passed boolean,
  detail text
)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not private.is_app_admin() then
    raise exception 'Adventure Club administrator access required';
  end if;

  return query
  select
    'Books'::text,
    'book_release_metadata'::text,
    'Public books have release details and approved cover references'::text,
    'blocker'::text,
    not exists(
      select 1
      from public.books b
      where b.status in ('coming_soon','published')
        and (
          b.release_date is null
          or b.cover_asset_key is null
          or btrim(b.cover_asset_key)=''
          or b.description is null
          or btrim(b.description)=''
        )
    ),
    (
      select count(*)::text || ' public book(s) missing release date, cover reference, or description'
      from public.books b
      where b.status in ('coming_soon','published')
        and (
          b.release_date is null
          or b.cover_asset_key is null
          or btrim(b.cover_asset_key)=''
          or b.description is null
          or btrim(b.description)=''
        )
    );

  return query
  select
    'Books'::text,
    'book_release_status'::text,
    'Released books are no longer marked coming soon'::text,
    'blocker'::text,
    not exists(
      select 1
      from public.books b
      where b.status='coming_soon'
        and b.release_date < current_date
    ),
    (
      select count(*)::text || ' past-release book(s) still marked coming soon'
      from public.books b
      where b.status='coming_soon'
        and b.release_date < current_date
    );
end;
$$;

create or replace function public.admin_get_production_launch_gate()
returns table(
  area text,
  check_key text,
  title text,
  severity text,
  passed boolean,
  detail text
)
language sql
stable
security invoker
set search_path = ''
as $$
  select * from private.admin_get_production_launch_gate_impl()
  union all
  select * from private.admin_get_book_launch_gate_impl()
  union all
  select * from private.admin_get_book_release_gate_impl();
$$;

