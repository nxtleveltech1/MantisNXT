SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN ('loyalty_program', 'reward_catalog', 'reward_redemption', 'loyalty_transaction');
