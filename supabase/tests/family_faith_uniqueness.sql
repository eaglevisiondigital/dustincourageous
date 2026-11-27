-- Uses the deployed table's indexes, defaults, and check constraints in an
-- isolated temporary table. Does not run production activity-history triggers.
begin;
create temp table faith_fixture (like public.household_faith_sessions including all);
do $$
declare
  household uuid:=gen_random_uuid(); guide uuid:=gen_random_uuid(); guardian uuid:=gen_random_uuid();
  child_a uuid:=gen_random_uuid(); child_b uuid:=gen_random_uuid();
begin
  insert into faith_fixture(household_id,family_faith_guide_id,child_profile_id,completed_by)
  values(household,guide,null,guardian),(household,guide,child_a,guardian),(household,guide,child_b,guardian);
  insert into faith_fixture(household_id,family_faith_guide_id,child_profile_id,completed_by)
  values(household,guide,null,guardian),(household,guide,child_a,guardian)
  on conflict(household_id,family_faith_guide_id,child_profile_id) do nothing;
  if (select count(*) from faith_fixture)<>3 then raise exception 'Repeated completion created duplicates'; end if;
  insert into faith_fixture(household_id,family_faith_guide_id,child_profile_id,completed_by)
  values(gen_random_uuid(),guide,null,guardian),(household,gen_random_uuid(),null,guardian);
  if (select count(*) from faith_fixture)<>5 then raise exception 'Independent household or guide was blocked'; end if;
end;
$$;
select 'Family Faith uniqueness fixtures passed' as result;
rollback;
