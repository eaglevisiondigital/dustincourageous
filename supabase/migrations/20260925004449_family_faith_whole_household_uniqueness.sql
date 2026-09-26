-- Treat the whole-family NULL child scope as one completion, just like a child.
-- Keep the existing key columns and conflict target used by the application.
set local lock_timeout='5s';
alter table public.household_faith_sessions
  drop constraint household_faith_sessions_household_id_family_faith_guide_id_key,
  add constraint household_faith_sessions_household_id_family_faith_guide_id_key
    unique nulls not distinct (household_id,family_faith_guide_id,child_profile_id);
