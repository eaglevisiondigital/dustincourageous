
create or replace function private.validate_reward_redemption_transition()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if old.status = new.status then
    return new;
  end if;

  if old.status in ('fulfilled','denied','canceled') then
    raise exception 'A finalized redemption cannot be reopened';
  end if;

  if old.status = 'requested' and new.status not in ('approved','denied','canceled') then
    raise exception 'Invalid redemption status transition';
  end if;

  if old.status = 'approved' and new.status not in ('processing','fulfilled','denied','canceled') then
    raise exception 'Invalid redemption status transition';
  end if;

  if old.status = 'processing' and new.status not in ('fulfilled','denied','canceled') then
    raise exception 'Invalid redemption status transition';
  end if;

  return new;
end;
$$;

revoke all on function private.validate_reward_redemption_transition() from public, anon, authenticated;

drop trigger if exists aa_reward_redemption_validate_transition on public.reward_redemptions;
create trigger aa_reward_redemption_validate_transition
before update of status on public.reward_redemptions
for each row execute function private.validate_reward_redemption_transition();

create or replace function private.sync_reward_redemption_fulfillment()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_reward_id uuid;
  v_reward_type text;
  v_inventory integer;
begin
  if new.status = 'fulfilled'
     and old.status is distinct from 'fulfilled' then

    select r.id, r.reward_type, r.inventory_quantity
      into v_reward_id, v_reward_type, v_inventory
    from public.reward_unlocks ru
    join public.rewards r on r.id = ru.reward_id
    where ru.id = new.reward_unlock_id
    for update of r;

    if v_reward_id is null then
      raise exception 'Reward could not be resolved';
    end if;

    if v_reward_type = 'physical' and v_inventory is not null then
      if v_inventory <= 0 then
        raise exception 'Reward is out of stock';
      end if;

      update public.rewards
      set inventory_quantity = inventory_quantity - 1
      where id = v_reward_id;
    end if;

    new.fulfilled_at := coalesce(new.fulfilled_at, now());

    update public.reward_unlocks
      set redeemed_at = coalesce(redeemed_at, now())
    where id = new.reward_unlock_id;
  end if;

  return new;
end;
$$;

revoke all on function private.sync_reward_redemption_fulfillment() from public, anon, authenticated;
