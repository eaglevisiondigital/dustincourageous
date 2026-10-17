
drop policy if exists households_select_member on public.households;
create policy households_select_member
on public.households for select
to authenticated
using (private.is_household_member(id));

drop policy if exists households_update_manager on public.households;
create policy households_update_manager
on public.households for update
to authenticated
using (private.can_manage_household(id))
with check (private.can_manage_household(id));

drop policy if exists household_members_select_household on public.household_members;
create policy household_members_select_household
on public.household_members for select
to authenticated
using (private.is_household_member(household_id));

drop policy if exists household_members_insert_initial_owner on public.household_members;
revoke insert on public.household_members from authenticated;
