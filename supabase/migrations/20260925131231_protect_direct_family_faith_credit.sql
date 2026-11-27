-- Protect legacy/direct inserts as well as the atomic Family participation RPC.
-- Keep historical rows and household-only records readable without rewriting credit.
alter policy household_faith_sessions_insert on public.household_faith_sessions
with check (
 private.can_manage_household(household_id)
 and completed_by = (select auth.uid())
 and (child_profile_id is null or exists (
  select 1 from public.child_profiles cp
  where cp.id=household_faith_sessions.child_profile_id
    and cp.household_id=household_faith_sessions.household_id and cp.status='active'
 ))
 and exists (
  select 1 from public.family_faith_guides g
  where g.id=household_faith_sessions.family_faith_guide_id
    and g.status='published'
    and (g.available_from is null or g.available_from<=now())
    and (g.available_until is null or g.available_until>now())
    and (g.access_level in ('free','member') or (g.access_level='premium'
      and private.household_has_active_entitlement(household_faith_sessions.household_id,'premium_content')))
 )
);
