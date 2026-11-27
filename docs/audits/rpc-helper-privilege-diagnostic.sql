-- Read-only catalog diagnostic for S2. False means the invoker caller
-- cannot execute its direct private helper when that code path is reached.
-- Does not call privileged award functions or modify grants.
select caller,helper,
  has_function_privilege('authenticated',caller,'EXECUTE') as caller_allowed,
  (select prosecdef from pg_proc where oid=caller::regprocedure) as caller_definer,
  has_function_privilege('authenticated',helper,'EXECUTE') as helper_allowed
from (values
  ('public.approve_parent_challenge(uuid,text)','private.guardian_unlock_session_valid(uuid,text)'),
  ('public.return_parent_challenge(uuid,text)','private.guardian_unlock_session_valid(uuid,text)'),
  ('public.complete_child_book_adventure(uuid,uuid)','private.award_xp_event(uuid,integer,text,text,uuid,text)'),
  ('public.complete_child_book_adventure(uuid,uuid)','private.evaluate_child_badges(uuid)'),
  ('public.admin_get_production_launch_gate()','private.admin_get_production_launch_gate_impl()')
) dependencies(caller,helper);
