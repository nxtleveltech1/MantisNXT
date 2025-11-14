SELECT proname,
       pg_get_function_identity_arguments(p.oid) AS args,
       nspname
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE proname = 'redeem_reward';
