-- Full digital books have separate access from free Book Companions.
-- The manifest is part of books.metadata, hence part of its governance fingerprint.
create function private.digital_book_manifest_valid(p_book_id uuid, p_manifest jsonb)
returns boolean language plpgsql immutable set search_path = '' as $$
declare page jsonb; paths text[] := '{}'; prefix text;
begin
  if p_book_id is null or p_manifest is null or jsonb_typeof(p_manifest) <> 'object'
    or coalesce(p_manifest->>'revision','') !~ '^[a-z0-9][a-z0-9-]{0,63}$'
    or jsonb_typeof(p_manifest->'pages') is distinct from 'array' then return false; end if;
  if jsonb_array_length(p_manifest->'pages') not between 1 and 300 then return false; end if;
  prefix := p_book_id::text || '/' || (p_manifest->>'revision') || '/';
  for page in select value from jsonb_array_elements(p_manifest->'pages') loop
    if jsonb_typeof(page) <> 'object'
      or jsonb_typeof(page->'path') is distinct from 'string'
      or left(page->>'path',length(prefix)) <> prefix
      or substring(page->>'path' from length(prefix)+1) !~ '^[a-zA-Z0-9_-]+\.(png|jpg|jpeg|webp)$'
      or jsonb_typeof(page->'alt') is distinct from 'string'
      or length(btrim(page->>'alt')) not between 1 and 10000
      or (page->>'alt') like '%' || chr(8212) || '%'
      or (page->>'path') = any(paths) then return false; end if;
    paths := array_append(paths,page->>'path');
  end loop;
  return true;
end;
$$;

create function private.validate_digital_book_manifest()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if new.metadata ? 'digital_reader' then
    if not private.digital_book_manifest_valid(new.id,new.metadata->'digital_reader') then
      raise exception 'Invalid digital book manifest';
    end if;
    if exists (
      select 1 from jsonb_array_elements(new.metadata->'digital_reader'->'pages') page
      where not exists (select 1 from storage.objects o where o.bucket_id='dc-digital-books' and o.name=page->>'path')
    ) then raise exception 'Upload every approved page before saving its manifest'; end if;
  end if;
  return new;
end;
$$;
create trigger validate_digital_book_manifest before insert or update of metadata on public.books
for each row execute function private.validate_digital_book_manifest();

create function private.digital_book_released(p_book_id uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.books b where b.id=p_book_id and b.status='published'
      and (b.release_date is null or b.release_date <= current_date)
      and private.digital_book_manifest_valid(b.id,b.metadata->'digital_reader')
      and exists (select 1 from public.dc_content_reviews r
        where r.entity_type='book' and r.entity_id=b.id and r.status='approved'
          and r.content_fingerprint=private.dc_entity_fingerprint('book',b.id))
  );
$$;

create function private.child_has_digital_book_access(p_child_profile_id uuid,p_book_id uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select (select auth.uid()) is not null and private.can_manage_child(p_child_profile_id)
    and exists (select 1 from public.child_profiles cp
      where cp.id=p_child_profile_id and cp.status='active' and (
        exists (select 1 from public.household_subscriptions hs
          join public.plan_entitlements pe on pe.plan_id=hs.plan_id
          where hs.household_id=cp.household_id and hs.status in ('trialing','active','comped')
            and (hs.current_period_end is null or hs.current_period_end>now()) and pe.entitlement_key='digital_books')
        or exists (select 1 from public.household_entitlement_grants g
          where g.household_id=cp.household_id and g.entitlement_key='digital_books'
            and g.starts_at<=now() and (g.ends_at is null or g.ends_at>now()))
        or exists (select 1 from public.household_book_access a
          where a.household_id=cp.household_id and a.book_id=p_book_id
            and a.starts_at<=now() and (a.ends_at is null or a.ends_at>now()))
      ));
$$;

create function private.digital_book_object_readable(p_path text)
returns boolean language plpgsql stable security definer set search_path = '' as $$
declare book_id uuid;
begin
  if (select auth.uid()) is null then return false; end if;
  begin book_id := split_part(p_path,'/',1)::uuid;
  exception when invalid_text_representation then return false; end;
  return private.digital_book_released(book_id)
    and exists (select 1 from public.books b, jsonb_array_elements(b.metadata->'digital_reader'->'pages') page
      where b.id=book_id and page->>'path'=p_path)
    and exists (select 1 from public.child_profiles cp
      join public.household_members hm on hm.household_id=cp.household_id
      where hm.user_id=(select auth.uid()) and hm.status='active' and hm.role in ('owner','parent','guardian')
        and cp.status='active' and private.child_has_digital_book_access(cp.id,book_id));
end;
$$;

insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values ('dc-digital-books','dc-digital-books',false,20971520,array['image/png','image/jpeg','image/webp']);
create policy dc_digital_book_read on storage.objects for select to authenticated
using (bucket_id='dc-digital-books' and (private.is_content_admin() or private.digital_book_object_readable(name)));
create policy dc_digital_book_upload on storage.objects for insert to authenticated
with check (bucket_id='dc-digital-books' and private.is_content_admin()
  and name ~ '^[0-9a-f-]{36}/[a-z0-9][a-z0-9-]{0,63}/[a-zA-Z0-9_-]+\.(png|jpg|jpeg|webp)$');
-- No authenticated UPDATE/DELETE policies: revised artwork needs a new object path.

create table public.child_book_reading_positions (
  child_profile_id uuid not null references public.child_profiles(id) on delete cascade,
  book_id uuid not null references public.books(id) on delete cascade,
  revision text not null,
  page_number integer not null check (page_number between 1 and 300),
  updated_at timestamptz not null default now(),
  primary key(child_profile_id,book_id)
);
create index child_book_reading_positions_book_idx on public.child_book_reading_positions(book_id);
alter table public.child_book_reading_positions enable row level security;
revoke all on public.child_book_reading_positions from public,anon,authenticated;
grant select on public.child_book_reading_positions to authenticated;
create policy dc_read_own_book_position on public.child_book_reading_positions for select to authenticated
using (private.child_has_digital_book_access(child_profile_id,book_id) and private.digital_book_released(book_id));

create function private.get_digital_book_impl(p_child_profile_id uuid,p_book_id uuid)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare manifest jsonb; position integer;
begin
  if (select auth.uid()) is null or not private.can_manage_child(p_child_profile_id)
    or not exists (select 1 from public.child_profiles where id=p_child_profile_id and status='active') then
    raise exception 'Child access denied' using errcode='42501';
  end if;
  if not private.digital_book_released(p_book_id) then return jsonb_build_object('availability','unavailable'); end if;
  if not private.child_has_digital_book_access(p_child_profile_id,p_book_id) then
    return jsonb_build_object('availability','locked');
  end if;
  select metadata->'digital_reader' into manifest from public.books where id=p_book_id;
  select page_number into position from public.child_book_reading_positions
    where child_profile_id=p_child_profile_id and book_id=p_book_id and revision=manifest->>'revision';
  return jsonb_build_object('availability','ready','revision',manifest->>'revision','pages',manifest->'pages',
    'page_number',least(coalesce(position,1),jsonb_array_length(manifest->'pages')));
end;
$$;
create function public.get_digital_book(p_child_profile_id uuid,p_book_id uuid)
returns jsonb language sql stable security invoker set search_path = '' as $$
  select private.get_digital_book_impl(p_child_profile_id,p_book_id);
$$;

create function private.save_digital_book_position_impl(p_child_profile_id uuid,p_book_id uuid,p_revision text,p_page_number integer)
returns integer language plpgsql security definer set search_path = '' as $$
declare manifest jsonb;
begin
  -- Serialize against changes to this book's manifest and publication state.
  select metadata->'digital_reader' into manifest from public.books where id=p_book_id for share;
  if not private.child_has_digital_book_access(p_child_profile_id,p_book_id) or not private.digital_book_released(p_book_id) then
    raise exception 'Digital book access denied' using errcode='42501';
  end if;
  if p_revision is distinct from manifest->>'revision' or p_page_number is null
    or p_page_number not between 1 and jsonb_array_length(manifest->'pages') then
    raise exception 'Refresh this book before saving your place' using errcode='22023';
  end if;
  insert into public.child_book_reading_positions(child_profile_id,book_id,revision,page_number)
    values(p_child_profile_id,p_book_id,p_revision,p_page_number)
    on conflict(child_profile_id,book_id) do update set revision=excluded.revision,page_number=excluded.page_number,updated_at=now();
  return p_page_number;
end;
$$;
create function public.save_digital_book_position(p_child_profile_id uuid,p_book_id uuid,p_revision text,p_page_number integer)
returns integer language sql security invoker set search_path = '' as $$
  select private.save_digital_book_position_impl(p_child_profile_id,p_book_id,p_revision,p_page_number);
$$;

revoke all on function private.digital_book_manifest_valid(uuid,jsonb),private.validate_digital_book_manifest(),
  private.digital_book_released(uuid),private.child_has_digital_book_access(uuid,uuid),private.digital_book_object_readable(text),
  private.get_digital_book_impl(uuid,uuid),private.save_digital_book_position_impl(uuid,uuid,text,integer),
  public.get_digital_book(uuid,uuid),public.save_digital_book_position(uuid,uuid,text,integer) from public,anon,authenticated;
grant execute on function private.digital_book_released(uuid),private.child_has_digital_book_access(uuid,uuid),
  private.digital_book_object_readable(text),private.get_digital_book_impl(uuid,uuid),
  private.save_digital_book_position_impl(uuid,uuid,text,integer),public.get_digital_book(uuid,uuid),
  public.save_digital_book_position(uuid,uuid,text,integer) to authenticated;
