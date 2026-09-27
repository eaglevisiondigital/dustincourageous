
create or replace function public.admin_create_challenge(
  p_title text,
  p_slug text,
  p_challenge_type text,
  p_description text default null,
  p_instructions text default null,
  p_access_level text default 'free',
  p_xp_reward integer default 0,
  p_parent_approval_required boolean default false,
  p_status text default 'draft',
  p_steps jsonb default '[]'::jsonb
)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_challenge_id uuid;
  v_step jsonb;
  v_order integer := 0;
begin
  if not private.is_content_admin() then
    raise exception 'Content administrator access required';
  end if;

  insert into public.challenges (
    title, slug, challenge_type, description, instructions,
    access_level, xp_reward, parent_approval_required, status
  )
  values (
    trim(p_title), trim(p_slug), p_challenge_type, nullif(trim(p_description), ''),
    nullif(trim(p_instructions), ''), p_access_level, greatest(p_xp_reward, 0),
    p_parent_approval_required, p_status
  )
  returning id into v_challenge_id;

  if jsonb_typeof(p_steps) = 'array' then
    for v_step in select value from jsonb_array_elements(p_steps)
    loop
      if nullif(trim(v_step ->> 'title'), '') is not null then
        insert into public.challenge_steps (
          challenge_id,
          title,
          instructions,
          sort_order,
          xp_reward,
          is_required
        )
        values (
          v_challenge_id,
          trim(v_step ->> 'title'),
          nullif(trim(v_step ->> 'instructions'), ''),
          v_order,
          greatest(coalesce((v_step ->> 'xp_reward')::integer, 0), 0),
          coalesce((v_step ->> 'is_required')::boolean, true)
        );
        v_order := v_order + 1;
      end if;
    end loop;
  end if;

  return v_challenge_id;
end;
$$;

revoke all on function public.admin_create_challenge(
  text,text,text,text,text,text,integer,boolean,text,jsonb
) from public, anon;
grant execute on function public.admin_create_challenge(
  text,text,text,text,text,text,integer,boolean,text,jsonb
) to authenticated;

create or replace function public.admin_create_badge_with_rule(
  p_badge_key text,
  p_name text,
  p_description text default null,
  p_rarity text default 'standard',
  p_rule_type text default 'manual',
  p_threshold_value integer default null,
  p_streak_key text default null,
  p_challenge_type text default null
)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_badge_id uuid;
begin
  if not private.is_content_admin() then
    raise exception 'Content administrator access required';
  end if;

  insert into public.badges (
    badge_key, name, description, rarity, is_active
  )
  values (
    trim(p_badge_key), trim(p_name), nullif(trim(p_description), ''),
    p_rarity, true
  )
  returning id into v_badge_id;

  insert into public.badge_rules (
    badge_id, rule_type, threshold_value, streak_key, challenge_type, is_active
  )
  values (
    v_badge_id,
    p_rule_type,
    case when p_rule_type = 'manual' then null else p_threshold_value end,
    case when p_rule_type = 'streak' then p_streak_key else null end,
    case when p_rule_type = 'challenge_type_count' then p_challenge_type else null end,
    true
  );

  return v_badge_id;
end;
$$;

revoke all on function public.admin_create_badge_with_rule(
  text,text,text,text,text,integer,text,text
) from public, anon;
grant execute on function public.admin_create_badge_with_rule(
  text,text,text,text,text,integer,text,text
) to authenticated;

create or replace function public.admin_create_reward(
  p_reward_key text,
  p_name text,
  p_description text default null,
  p_reward_type text default 'digital',
  p_xp_required integer default null,
  p_access_level text default 'member',
  p_inventory_quantity integer default null
)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_reward_id uuid;
begin
  if not private.is_content_admin() then
    raise exception 'Content administrator access required';
  end if;

  insert into public.rewards (
    reward_key, name, description, reward_type, xp_required,
    access_level, inventory_quantity, is_active
  )
  values (
    trim(p_reward_key), trim(p_name), nullif(trim(p_description), ''),
    p_reward_type, p_xp_required, p_access_level, p_inventory_quantity, true
  )
  returning id into v_reward_id;

  return v_reward_id;
end;
$$;

revoke all on function public.admin_create_reward(
  text,text,text,text,integer,text,integer
) from public, anon;
grant execute on function public.admin_create_reward(
  text,text,text,text,integer,text,integer
) to authenticated;

create or replace function private.audit_admin_mutation()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor uuid := (select auth.uid());
  v_entity_id text;
  v_before jsonb;
  v_after jsonb;
begin
  if tg_op = 'INSERT' then
    v_after := to_jsonb(new);
    v_entity_id := v_after ->> 'id';
  elsif tg_op = 'UPDATE' then
    v_before := to_jsonb(old);
    v_after := to_jsonb(new);
    v_entity_id := coalesce(v_after ->> 'id', v_before ->> 'id');
  else
    v_before := to_jsonb(old);
    v_entity_id := v_before ->> 'id';
  end if;

  if v_actor is not null and private.is_app_admin() then
    insert into public.admin_audit_log (
      actor_user_id,
      action,
      entity_type,
      entity_id,
      before_state,
      after_state,
      metadata
    )
    values (
      v_actor,
      lower(tg_op),
      tg_table_name,
      v_entity_id,
      v_before,
      v_after,
      jsonb_build_object('schema', tg_table_schema)
    );
  end if;

  return coalesce(new, old);
end;
$$;

revoke all on function private.audit_admin_mutation() from public, anon, authenticated;

drop trigger if exists audit_books_admin on public.books;
create trigger audit_books_admin after insert or update or delete on public.books
for each row execute function private.audit_admin_mutation();

drop trigger if exists audit_content_items_admin on public.content_items;
create trigger audit_content_items_admin after insert or update or delete on public.content_items
for each row execute function private.audit_admin_mutation();

drop trigger if exists audit_adventures_admin on public.adventures;
create trigger audit_adventures_admin after insert or update or delete on public.adventures
for each row execute function private.audit_admin_mutation();

drop trigger if exists audit_challenges_admin on public.challenges;
create trigger audit_challenges_admin after insert or update or delete on public.challenges
for each row execute function private.audit_admin_mutation();

drop trigger if exists audit_levels_admin on public.levels;
create trigger audit_levels_admin after insert or update or delete on public.levels
for each row execute function private.audit_admin_mutation();

drop trigger if exists audit_badges_admin on public.badges;
create trigger audit_badges_admin after insert or update or delete on public.badges
for each row execute function private.audit_admin_mutation();

drop trigger if exists audit_badge_rules_admin on public.badge_rules;
create trigger audit_badge_rules_admin after insert or update or delete on public.badge_rules
for each row execute function private.audit_admin_mutation();

drop trigger if exists audit_rewards_admin on public.rewards;
create trigger audit_rewards_admin after insert or update or delete on public.rewards
for each row execute function private.audit_admin_mutation();

drop trigger if exists audit_reward_redemptions_admin on public.reward_redemptions;
create trigger audit_reward_redemptions_admin after update on public.reward_redemptions
for each row execute function private.audit_admin_mutation();
