SELECT proname,
       pg_get_function_identity_arguments(p.oid) AS args
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
  AND proname IN (
    'calculate_points_for_order',
    'redeem_reward',
    'update_customer_tier',
    'expire_points',
    'get_customer_rewards_summary',
    'update_customer_loyalty_on_transaction',
    'validate_reward_redemption',
    'auto_expire_redemptions'
  )
ORDER BY proname;
