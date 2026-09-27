-- Catalog metadata is readable by families. Keep page descriptions and paths private.
create table private.digital_book_manifests (
  book_id uuid primary key references public.books(id) on delete cascade,
  manifest jsonb not null,
  updated_at timestamptz not null default now(),
  constraint valid_digital_book_manifest check (private.digital_book_manifest_valid(book_id,manifest))
);
revoke all on private.digital_book_manifests from public,anon,authenticated;

create or replace function private.validate_digital_book_manifest()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if new.metadata ? 'digital_reader' and not exists (
    select 1 from private.digital_book_manifests m where m.book_id=new.id
      and new.metadata->'digital_reader'=jsonb_build_object('revision',m.manifest->>'revision',
        'sha256',encode(extensions.digest(m.manifest::text,'sha256'),'hex'))
  ) then raise exception 'Prepare digital book pages through Books Admin'; end if;
  return new;
end;
$$;

create or replace function private.digital_book_released(p_book_id uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.books b join private.digital_book_manifests m on m.book_id=b.id
    where b.id=p_book_id and b.status='published'
      and (b.release_date is null or b.release_date<=current_date)
      and b.metadata->'digital_reader'=jsonb_build_object('revision',m.manifest->>'revision',
        'sha256',encode(extensions.digest(m.manifest::text,'sha256'),'hex'))
      and exists (select 1 from public.dc_content_reviews r
        where r.entity_type='book' and r.entity_id=b.id and r.status='approved'
          and r.content_fingerprint=private.dc_entity_fingerprint('book',b.id))
  );
$$;

create or replace function private.digital_book_object_readable(p_path text)
returns boolean language plpgsql stable security definer set search_path = '' as $$
declare target_book_id uuid;
begin
  if (select auth.uid()) is null then return false; end if;
  begin target_book_id:=split_part(p_path,'/',1)::uuid;
  exception when invalid_text_representation then return false; end;
  return private.digital_book_released(target_book_id)
    and exists (select 1 from private.digital_book_manifests m, jsonb_array_elements(m.manifest->'pages') page
      where m.book_id=target_book_id and page->>'path'=p_path)
    and exists (select 1 from public.child_profiles cp
      join public.household_members hm on hm.household_id=cp.household_id
      where hm.user_id=(select auth.uid()) and hm.status='active' and hm.role in ('owner','parent','guardian')
        and cp.status='active' and private.child_has_digital_book_access(cp.id,target_book_id));
end;
$$;

create or replace function private.get_digital_book_impl(p_child_profile_id uuid,p_book_id uuid)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare content jsonb; position integer;
begin
  if (select auth.uid()) is null or not private.can_manage_child(p_child_profile_id)
    or not exists (select 1 from public.child_profiles where id=p_child_profile_id and status='active') then
    raise exception 'Child access denied' using errcode='42501';
  end if;
  if not private.digital_book_released(p_book_id) then return jsonb_build_object('availability','unavailable'); end if;
  if not private.child_has_digital_book_access(p_child_profile_id,p_book_id) then return jsonb_build_object('availability','locked'); end if;
  select manifest into content from private.digital_book_manifests where book_id=p_book_id;
  select page_number into position from public.child_book_reading_positions
    where child_profile_id=p_child_profile_id and book_id=p_book_id and revision=content->>'revision';
  return jsonb_build_object('availability','ready','revision',content->>'revision','pages',content->'pages',
    'page_number',least(coalesce(position,1),jsonb_array_length(content->'pages')));
end;
$$;

create or replace function private.save_digital_book_position_impl(p_child_profile_id uuid,p_book_id uuid,p_revision text,p_page_number integer)
returns integer language plpgsql security definer set search_path = '' as $$
declare content jsonb;
begin
  perform 1 from public.books where id=p_book_id for share;
  if not private.child_has_digital_book_access(p_child_profile_id,p_book_id) or not private.digital_book_released(p_book_id) then
    raise exception 'Digital book access denied' using errcode='42501';
  end if;
  select manifest into content from private.digital_book_manifests where book_id=p_book_id;
  if p_revision is distinct from content->>'revision' or p_page_number is null
    or p_page_number not between 1 and jsonb_array_length(content->'pages') then
    raise exception 'Refresh this book before saving your place' using errcode='22023';
  end if;
  insert into public.child_book_reading_positions(child_profile_id,book_id,revision,page_number)
    values(p_child_profile_id,p_book_id,p_revision,p_page_number)
    on conflict(child_profile_id,book_id) do update set revision=excluded.revision,page_number=excluded.page_number,updated_at=now();
  return p_page_number;
end;
$$;

create function private.admin_prepare_digital_book_impl(p_book_id uuid,p_manifest jsonb)
returns text language plpgsql security definer set search_path = '' as $$
declare previous jsonb; reference jsonb;
begin
  if (select auth.uid()) is null or not private.is_content_admin() then
    raise exception 'Content administrator required' using errcode='42501';
  end if;
  perform 1 from public.books where id=p_book_id for update;
  if not found then raise exception 'Book not found'; end if;
  if not private.digital_book_manifest_valid(p_book_id,p_manifest) then raise exception 'Invalid digital book manifest'; end if;
  if exists (select 1 from jsonb_array_elements(p_manifest->'pages') page
    where not exists (select 1 from storage.objects o where o.bucket_id='dc-digital-books' and o.name=page->>'path')) then
    raise exception 'Upload every page before preparing this digital edition';
  end if;
  select manifest into previous from private.digital_book_manifests where book_id=p_book_id;
  reference:=jsonb_build_object('revision',p_manifest->>'revision','sha256',encode(extensions.digest(p_manifest::text,'sha256'),'hex'));
  if previous=p_manifest and exists (select 1 from public.books where id=p_book_id and metadata->'digital_reader'=reference) then
    return p_manifest->>'revision';
  end if;
  if previous->>'revision'=p_manifest->>'revision' then raise exception 'Changed pages require a new edition revision'; end if;
  insert into private.digital_book_manifests(book_id,manifest) values(p_book_id,p_manifest)
    on conflict(book_id) do update set manifest=excluded.manifest,updated_at=now();
  -- Existing book mutation audit and governance triggers record and invalidate this change.
  update public.books set metadata=jsonb_set(metadata,'{digital_reader}',reference),status='draft' where id=p_book_id;
  return p_manifest->>'revision';
end;
$$;
create function public.admin_prepare_digital_book(p_book_id uuid,p_manifest jsonb)
returns text language sql security invoker set search_path = '' as $$
  select private.admin_prepare_digital_book_impl(p_book_id,p_manifest);
$$;
revoke all on function private.admin_prepare_digital_book_impl(uuid,jsonb),public.admin_prepare_digital_book(uuid,jsonb) from public,anon,authenticated;
grant execute on function private.admin_prepare_digital_book_impl(uuid,jsonb),public.admin_prepare_digital_book(uuid,jsonb) to authenticated;
