create function private.admin_get_digital_book_launch_gate_impl()
returns table(area text,check_key text,title text,severity text,passed boolean,detail text)
language plpgsql stable security definer set search_path = '' as $$
declare prepared integer; missing integer; approved integer; released integer;
begin
  if (select auth.uid()) is null or not private.is_app_admin() then
    raise exception 'Adventure Club administrator access required' using errcode='42501';
  end if;
  select count(*) into prepared from private.digital_book_manifests;
  select count(*) into missing from private.digital_book_manifests m,
    jsonb_array_elements(m.manifest->'pages') page
    where not exists(select 1 from storage.objects o where o.bucket_id='dc-digital-books' and o.name=page->>'path');
  select count(*) into approved from private.digital_book_manifests m
    join public.books b on b.id=m.book_id
    where b.metadata->'digital_reader'=jsonb_build_object('revision',m.manifest->>'revision',
      'sha256',encode(extensions.digest(m.manifest::text,'sha256'),'hex'))
      and exists(select 1 from public.dc_content_reviews r where r.entity_type='book' and r.entity_id=b.id
        and r.status='approved' and r.content_fingerprint=private.dc_entity_fingerprint('book',b.id));
  select count(*) into released from private.digital_book_manifests m where private.digital_book_released(m.book_id);

  return query values
    ('Digital books','digital_book_private_storage','Digital book storage is private','blocker',
      exists(select 1 from storage.buckets b where b.id='dc-digital-books' and b.public=false),
      'Private storage is required to protect full-book page files.'),
    ('Digital books','digital_book_edition_prepared','A digital edition has been prepared','warning',prepared>0,
      prepared::text||' prepared edition(s). Required before offering digital books; prepare corrected images in Books Admin.'),
    ('Digital books','digital_book_page_files','Prepared editions have all page files','warning',prepared>0 and missing=0,
      case when prepared=0 then 'No prepared edition to check. Upload the final page files in Books Admin.'
      else missing::text||' referenced page file(s) missing from private storage. Restore missing files before digital release.' end),
    ('Digital books','digital_book_current_approval','Prepared editions have current human approval','warning',prepared>0 and approved=prepared,
      approved::text||' of '||prepared::text||' edition(s) match current DC Governance approval. Required before digital release.'),
    ('Digital books','digital_book_available','An approved digital edition is released','warning',released>0,
      released::text||' edition(s) pass publication, release-date and governance checks. Required before offering digital books. Signed-in device and Storage tests remain separate.');
end;
$$;
revoke all on function private.admin_get_digital_book_launch_gate_impl() from public,anon,authenticated;
grant execute on function private.admin_get_digital_book_launch_gate_impl() to authenticated;

create or replace function public.admin_get_production_launch_gate()
returns table(area text,check_key text,title text,severity text,passed boolean,detail text)
language sql stable security invoker set search_path = '' as $$
  select * from private.admin_get_production_launch_gate_impl()
  union all select * from private.admin_get_book_launch_gate_impl()
  union all select * from private.admin_get_book_release_gate_impl()
  union all select * from private.admin_get_membership_tier_gate_impl()
  union all select * from private.admin_get_digital_book_launch_gate_impl();
$$;
