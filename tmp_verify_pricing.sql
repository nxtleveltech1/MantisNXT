SELECT column_name
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'pricing_recommendation'
  AND column_name IN ('review_status', 'auto_applied', 'estimated_revenue_impact');
