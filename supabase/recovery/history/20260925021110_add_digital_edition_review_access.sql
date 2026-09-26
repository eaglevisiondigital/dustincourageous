alter table private.digital_book_manifests add constraint digital_book_revision_is_string
  check (jsonb_typeof(manifest->'revision')='string');

create function private.admin_get_digital_book_impl(p_book_id uuid)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
begin
  if (select auth.uid()) is null or not private.is_content_admin() then
    raise exception 'Content administrator required' using errcode='42501';
  end if;
  return (select manifest from private.digital_book_manifests where book_id=p_book_id);
end;
$$;
create function public.admin_get_digital_book(p_book_id uuid)
returns jsonb language sql stable security invoker set search_path = '' as $$
  select private.admin_get_digital_book_impl(p_book_id);
$$;
revoke all on function private.admin_get_digital_book_impl(uuid),public.admin_get_digital_book(uuid) from public,anon,authenticated;
grant execute on function private.admin_get_digital_book_impl(uuid),public.admin_get_digital_book(uuid) to authenticated;
