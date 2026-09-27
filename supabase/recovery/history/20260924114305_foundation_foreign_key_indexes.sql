
create index if not exists households_created_by_idx
  on public.households(created_by);

create index if not exists child_profiles_created_by_idx
  on public.child_profiles(created_by);

create index if not exists household_consents_child_profile_idx
  on public.household_consents(child_profile_id)
  where child_profile_id is not null;

create index if not exists household_entitlement_grants_entitlement_idx
  on public.household_entitlement_grants(entitlement_key);

create index if not exists household_subscriptions_plan_idx
  on public.household_subscriptions(plan_id);

create index if not exists plan_entitlements_entitlement_idx
  on public.plan_entitlements(entitlement_key);
