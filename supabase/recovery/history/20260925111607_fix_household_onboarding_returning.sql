CREATE OR REPLACE FUNCTION public.create_household_with_consent(p_name text, p_timezone text)
RETURNS uuid LANGUAGE plpgsql SECURITY INVOKER SET search_path TO ''
AS $function$
declare
  v_household_id uuid := gen_random_uuid();
  v_policy_version text;
begin
  if (select auth.uid()) is null then
    raise exception 'Authentication required';
  end if;
  select current_policy_version into v_policy_version
  from public.consent_policies
  where consent_key='guardian_account_terms' and is_active=true;
  if v_policy_version is null then
    raise exception 'Guardian account terms are unavailable';
  end if;
  -- RETURNING checks SELECT RLS before the AFTER INSERT owner-membership
  -- trigger runs. Allocate the ID first, allowing that trigger to finish.
  insert into public.households(id,name,created_by,timezone)
  values(v_household_id,trim(p_name),(select auth.uid()),
    coalesce(nullif(trim(p_timezone),''),'America/Chicago'));
  insert into public.household_consents(
    household_id,guardian_user_id,child_profile_id,
    consent_key,action,policy_version,metadata
  ) values(
    v_household_id,(select auth.uid()),null,
    'guardian_account_terms','granted',v_policy_version,
    '{"surface":"household_onboarding"}'::jsonb
  );
  return v_household_id;
end;
$function$;
