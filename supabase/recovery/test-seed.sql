-- Synthetic CI fixtures only. These are NOT approved content or consent wording.
-- Production/reference data and artwork must come from a separate verified backup.
INSERT INTO public.consent_policies
 (consent_key,title,description,current_policy_version,required_for_core_service,is_active)
VALUES ('guardian_account_terms','Synthetic recovery test policy',
 'TEST ONLY: not approved terms and not for deployment.','recovery-test-only',true,true)
ON CONFLICT DO NOTHING;
INSERT INTO public.books(id,title,slug,book_number)
VALUES ('00000000-0000-4000-8000-000000000001','Synthetic recovery reference book',
 'dc-recovery-synthetic-book',-1) ON CONFLICT DO NOTHING;
INSERT INTO public.entitlement_definitions(entitlement_key,name,description,is_active)
VALUES ('digital_books','Synthetic digital book entitlement','TEST ONLY: isolated RLS fixture.',true)
ON CONFLICT DO NOTHING;
