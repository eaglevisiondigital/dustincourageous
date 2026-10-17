-- Guardians retain their children's reading history independently of content access.
drop policy dc_read_own_book_position on public.child_book_reading_positions;
create policy dc_read_own_book_position on public.child_book_reading_positions for select to authenticated
using (private.can_manage_child(child_profile_id));

CREATE OR REPLACE FUNCTION private.privacy_export_payload_impl(p_request_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_request public.data_privacy_requests%rowtype;
  v_household jsonb;
  v_children jsonb;
  v_payload jsonb;
begin
  select *
    into v_request
  from public.data_privacy_requests
  where id=p_request_id;

  if not found then
    raise exception 'Privacy request not found';
  end if;

  if not private.can_manage_household(v_request.household_id) then
    raise exception 'Guardian household access required';
  end if;

  if v_request.request_type not in ('export_household','export_child') then
    raise exception 'This request is not a data export';
  end if;

  if v_request.status in ('canceled','rejected') then
    raise exception 'This export request is not active';
  end if;

  select to_jsonb(h)
    into v_household
  from (
    select id,name,status,timezone,created_at,updated_at
    from public.households
    where id=v_request.household_id
  ) h;

  if v_request.request_type='export_child' then
    if v_request.child_profile_id is null then
      raise exception 'Child export request has no child profile';
    end if;

    select jsonb_agg(to_jsonb(cp))
      into v_children
    from (
      select id,household_id,display_name,birth_year,avatar_key,status,created_at,updated_at
      from public.child_profiles
      where id=v_request.child_profile_id
        and household_id=v_request.household_id
    ) cp;
  else
    select coalesce(jsonb_agg(to_jsonb(cp) order by cp.created_at),'[]'::jsonb)
      into v_children
    from (
      select id,household_id,display_name,birth_year,avatar_key,status,created_at,updated_at
      from public.child_profiles
      where household_id=v_request.household_id
    ) cp;
  end if;

  v_payload := jsonb_build_object(
    'export_version','2026.2',
    'generated_at',now(),
    'request_id',v_request.id,
    'request_type',v_request.request_type,
    'household',v_household,
    'children',coalesce(v_children,'[]'::jsonb),
    'guardian_profile',(
      select to_jsonb(p)
      from (
        select id,first_name,last_name,display_name,avatar_url,created_at,updated_at
        from public.profiles
        where id=(select auth.uid())
      ) p
    ),
    'household_members',(
      select coalesce(jsonb_agg(to_jsonb(x) order by x.created_at),'[]'::jsonb)
      from (
        select hm.user_id,hm.role,hm.status,hm.created_at,
               p.first_name,p.last_name,p.display_name
        from public.household_members hm
        left join public.profiles p on p.id=hm.user_id
        where hm.household_id=v_request.household_id
      ) x
    ),
    'consents',(
      select coalesce(jsonb_agg(to_jsonb(x) order by x.created_at),'[]'::jsonb)
      from (
        select hc.id,hc.guardian_user_id,hc.child_profile_id,hc.consent_key,
               hc.action,hc.policy_version,hc.metadata,hc.created_at
        from public.household_consents hc
        where hc.household_id=v_request.household_id
          and (
            v_request.request_type='export_household'
            or hc.child_profile_id=v_request.child_profile_id
            or hc.child_profile_id is null
          )
      ) x
    ),
    'child_challenge_progress',(
      select coalesce(jsonb_agg(to_jsonb(x) order by x.created_at),'[]'::jsonb)
      from public.child_challenge_progress x
      where exists (
        select 1 from public.child_profiles cp
        where cp.id=x.child_profile_id
          and cp.household_id=v_request.household_id
          and (v_request.request_type='export_household' or cp.id=v_request.child_profile_id)
      )
    ),
    'child_adventure_progress',(
      select coalesce(jsonb_agg(to_jsonb(x) order by x.created_at),'[]'::jsonb)
      from public.child_adventure_progress x
      where exists (
        select 1 from public.child_profiles cp
        where cp.id=x.child_profile_id
          and cp.household_id=v_request.household_id
          and (v_request.request_type='export_household' or cp.id=v_request.child_profile_id)
      )
    ),
    'scripture_progress',(
      select coalesce(jsonb_agg(to_jsonb(x) order by x.created_at),'[]'::jsonb)
      from public.child_scripture_progress x
      where exists (
        select 1 from public.child_profiles cp
        where cp.id=x.child_profile_id
          and cp.household_id=v_request.household_id
          and (v_request.request_type='export_household' or cp.id=v_request.child_profile_id)
      )
    ),
    'devotional_progress',(
      select coalesce(jsonb_agg(to_jsonb(x) order by x.created_at),'[]'::jsonb)
      from public.child_devotional_progress x
      where exists (
        select 1 from public.child_profiles cp
        where cp.id=x.child_profile_id
          and cp.household_id=v_request.household_id
          and (v_request.request_type='export_household' or cp.id=v_request.child_profile_id)
      )
    ),
    'prayer_progress',(
      select coalesce(jsonb_agg(to_jsonb(x) order by x.created_at),'[]'::jsonb)
      from public.child_prayer_progress x
      where exists (
        select 1 from public.child_profiles cp
        where cp.id=x.child_profile_id
          and cp.household_id=v_request.household_id
          and (v_request.request_type='export_household' or cp.id=v_request.child_profile_id)
      )
    ),
    'identity_progress',(
      select coalesce(jsonb_agg(to_jsonb(x) order by x.updated_at),'[]'::jsonb)
      from public.child_identity_progress x
      where exists (
        select 1 from public.child_profiles cp
        where cp.id=x.child_profile_id
          and cp.household_id=v_request.household_id
          and (v_request.request_type='export_household' or cp.id=v_request.child_profile_id)
      )
    ),
    'content_progress',(
      select coalesce(jsonb_agg(to_jsonb(x) order by x.created_at),'[]'::jsonb)
      from public.child_content_progress x
      where exists (
        select 1 from public.child_profiles cp
        where cp.id=x.child_profile_id
          and cp.household_id=v_request.household_id
          and (v_request.request_type='export_household' or cp.id=v_request.child_profile_id)
      )
    ),
    'book_progress',(
      select coalesce(jsonb_agg(to_jsonb(x) order by x.created_at),'[]'::jsonb)
      from public.child_book_progress x
      where exists (
        select 1 from public.child_profiles cp
        where cp.id=x.child_profile_id
          and cp.household_id=v_request.household_id
          and (v_request.request_type='export_household' or cp.id=v_request.child_profile_id)
      )
    ),
    'book_reading_positions',(
      select coalesce(jsonb_agg(to_jsonb(x) order by x.updated_at),'[]'::jsonb)
      from public.child_book_reading_positions x
      where exists (
        select 1 from public.child_profiles cp
        where cp.id=x.child_profile_id
          and cp.household_id=v_request.household_id
          and (v_request.request_type='export_household' or cp.id=v_request.child_profile_id)
      )
    ),
    'xp_ledger',(
      select coalesce(jsonb_agg(to_jsonb(x) order by x.created_at),'[]'::jsonb)
      from public.xp_ledger x
      where exists (
        select 1 from public.child_profiles cp
        where cp.id=x.child_profile_id
          and cp.household_id=v_request.household_id
          and (v_request.request_type='export_household' or cp.id=v_request.child_profile_id)
      )
    ),
    'badge_awards',(
      select coalesce(jsonb_agg(to_jsonb(x) order by x.awarded_at),'[]'::jsonb)
      from public.badge_awards x
      where exists (
        select 1 from public.child_profiles cp
        where cp.id=x.child_profile_id
          and cp.household_id=v_request.household_id
          and (v_request.request_type='export_household' or cp.id=v_request.child_profile_id)
      )
    ),
    'reward_unlocks',(
      select coalesce(jsonb_agg(to_jsonb(x) order by x.unlocked_at),'[]'::jsonb)
      from public.reward_unlocks x
      where exists (
        select 1 from public.child_profiles cp
        where cp.id=x.child_profile_id
          and cp.household_id=v_request.household_id
          and (v_request.request_type='export_household' or cp.id=v_request.child_profile_id)
      )
    ),
    'child_activity',(
      select coalesce(jsonb_agg(to_jsonb(x) order by x.created_at),'[]'::jsonb)
      from public.child_activity_events x
      where exists (
        select 1 from public.child_profiles cp
        where cp.id=x.child_profile_id
          and cp.household_id=v_request.household_id
          and (v_request.request_type='export_household' or cp.id=v_request.child_profile_id)
      )
    ),
    'group_memberships',(
      select coalesce(jsonb_agg(to_jsonb(x) order by x.joined_at),'[]'::jsonb)
      from public.child_group_memberships x
      where exists (
        select 1 from public.child_profiles cp
        where cp.id=x.child_profile_id
          and cp.household_id=v_request.household_id
          and (v_request.request_type='export_household' or cp.id=v_request.child_profile_id)
      )
    ),
    'event_registrations',(
      select coalesce(jsonb_agg(to_jsonb(x) order by x.registered_at),'[]'::jsonb)
      from public.event_registrations x
      where x.household_id=v_request.household_id
        and (
          v_request.request_type='export_household'
          or x.child_profile_id=v_request.child_profile_id
        )
    ),
    'family_faith_sessions',(
      select coalesce(jsonb_agg(to_jsonb(x) order by x.completed_at),'[]'::jsonb)
      from public.household_faith_sessions x
      where x.household_id=v_request.household_id
        and (
          v_request.request_type='export_household'
          or x.child_profile_id=v_request.child_profile_id
        )
    ),
    'orders',case when v_request.request_type='export_household' then (
      select coalesce(jsonb_agg(
        to_jsonb(o) || jsonb_build_object(
          'items',(
            select coalesce(jsonb_agg(to_jsonb(oi) order by oi.created_at),'[]'::jsonb)
            from public.order_items oi where oi.order_id=o.id
          ),
          'fulfillments',(
            select coalesce(jsonb_agg(to_jsonb(f) order by f.created_at),'[]'::jsonb)
            from public.fulfillments f where f.order_id=o.id
          )
        ) order by o.created_at
      ),'[]'::jsonb)
      from public.orders o
      where o.household_id=v_request.household_id
    ) else '[]'::jsonb end,
    'support_tickets',case when v_request.request_type='export_household' then (
      select coalesce(jsonb_agg(to_jsonb(x) order by x.created_at),'[]'::jsonb)
      from public.support_tickets x
      where x.household_id=v_request.household_id
        and x.user_id=(select auth.uid())
    ) else '[]'::jsonb end,
    'requesting_guardian_notifications',case when v_request.request_type='export_household' then (
      select coalesce(jsonb_agg(to_jsonb(x) order by x.created_at),'[]'::jsonb)
      from public.user_notifications x
      where x.user_id=(select auth.uid())
        and (x.household_id=v_request.household_id or x.household_id is null)
    ) else '[]'::jsonb end
  );

  return v_payload;
end;
$function$;


create or replace view public.child_data_inventory with (security_invoker=true) as
 SELECT id AS child_profile_id,
    household_id,
    display_name,
    status,
    ( SELECT count(*) AS count
           FROM public.child_challenge_progress x
          WHERE x.child_profile_id = cp.id) AS challenge_progress_records,
    ( SELECT count(*) AS count
           FROM public.child_adventure_progress x
          WHERE x.child_profile_id = cp.id) AS adventure_progress_records,
    ( SELECT count(*) AS count
           FROM public.child_scripture_progress x
          WHERE x.child_profile_id = cp.id) AS scripture_progress_records,
    ( SELECT count(*) AS count
           FROM public.child_devotional_progress x
          WHERE x.child_profile_id = cp.id) AS devotional_progress_records,
    ( SELECT count(*) AS count
           FROM public.child_prayer_progress x
          WHERE x.child_profile_id = cp.id) AS prayer_progress_records,
    ( SELECT count(*) AS count
           FROM public.child_identity_progress x
          WHERE x.child_profile_id = cp.id) AS identity_progress_records,
    ( SELECT count(*) AS count
           FROM public.child_content_progress x
          WHERE x.child_profile_id = cp.id) AS content_progress_records,
    ( SELECT count(*) AS count
           FROM public.child_book_progress x
          WHERE x.child_profile_id = cp.id) AS book_progress_records,
    ( SELECT count(*) AS count
           FROM public.xp_ledger x
          WHERE x.child_profile_id = cp.id) AS xp_records,
    ( SELECT count(*) AS count
           FROM public.badge_awards x
          WHERE x.child_profile_id = cp.id) AS badge_records,
    ( SELECT count(*) AS count
           FROM public.reward_unlocks x
          WHERE x.child_profile_id = cp.id) AS reward_records,
    ( SELECT count(*) AS count
           FROM public.child_activity_events x
          WHERE x.child_profile_id = cp.id) AS activity_records,
    ( SELECT count(*) AS count
           FROM public.child_group_memberships x
          WHERE x.child_profile_id = cp.id) AS group_membership_records,
    ( SELECT count(*) AS count
           FROM public.event_registrations x
          WHERE x.child_profile_id = cp.id) AS event_registration_records
,
    (select count(*) from public.child_book_reading_positions rp where rp.child_profile_id=cp.id) as reading_position_records
   FROM public.child_profiles cp;
