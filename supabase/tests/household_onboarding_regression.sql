-- Actual deployed onboarding RPC and RLS. All fixtures roll back.
begin;
create temporary table dc_onboarding_fixture as select gen_random_uuid() as guardian;
grant select on dc_onboarding_fixture to authenticated;
insert into auth.users(id,raw_app_meta_data,raw_user_meta_data)
select guardian,'{}'::jsonb,'{}'::jsonb from dc_onboarding_fixture;
select set_config('request.jwt.claim.sub',(select guardian::text from dc_onboarding_fixture),true);
set local role authenticated;
do $$
declare home uuid;
begin
  if current_user <> 'authenticated' then raise exception 'Wrong test role'; end if;
  home := public.create_household_with_consent(' DC onboarding rollback fixture ','America/Chicago');
  if not exists(select 1 from public.households where id=home and name='DC onboarding rollback fixture' and created_by=auth.uid()) then
    raise exception 'Created household is not visible to owner';
  end if;
  if not exists(select 1 from public.household_members where household_id=home and user_id=auth.uid() and role='owner' and status='active') then
    raise exception 'Owner membership missing';
  end if;
  if not exists(select 1 from public.household_consents where household_id=home and guardian_user_id=auth.uid() and consent_key='guardian_account_terms' and action='granted') then
    raise exception 'Consent missing';
  end if;
  if exists(select 1 from public.households where id<>home) then
    raise exception 'Other household exposed to new guardian';
  end if;
end $$;
reset role;
select set_config('request.jwt.claim.sub','',true);
set local role anon;
do $$
begin
  begin
    perform public.create_household_with_consent('Anonymous denied','America/Chicago');
    raise exception 'Anonymous creation unexpectedly allowed';
  exception when insufficient_privilege then null;
    when raise_exception then
      if sqlerrm <> 'Authentication required' then raise; end if;
  end;
end $$;
reset role;
select 'PASS: authenticated creation, owner visibility/membership, consent, family isolation and anonymous denial' as result;
rollback;
