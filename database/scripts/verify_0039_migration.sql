-- Verification script for migration 0039
-- Validates that tag_proposal_id backfill and FK constraints are properly set up

\echo 'Verifying migration 0039: tag_proposal_id backfill and FK constraints'
\echo '====================================================================='

-- Check that tag_proposal_id column exists on ai_tag_proposal_product
\echo ''
\echo '1. Checking tag_proposal_id column exists...'
SELECT 
    CASE 
        WHEN column_name IS NOT NULL THEN '✓ EXISTS'
        ELSE '✗ MISSING'
    END as status,
    'Column: core.ai_tag_proposal_product.tag_proposal_id' as object_name
FROM information_schema.columns
WHERE table_schema = 'core'
  AND table_name = 'ai_tag_proposal_product'
  AND column_name = 'tag_proposal_id';

-- Check for NULL values (should be 0 after backfill)
\echo ''
\echo '2. Checking for NULL tag_proposal_id values...'
SELECT 
    COUNT(*) as null_count,
    CASE 
        WHEN COUNT(*) = 0 THEN '✓ All rows backfilled'
        ELSE '⚠ ' || COUNT(*) || ' rows still have NULL tag_proposal_id'
    END as status
FROM core.ai_tag_proposal_product
WHERE tag_proposal_id IS NULL;

-- Check FK constraint exists
\echo ''
\echo '3. Checking FK constraint exists...'
SELECT 
    CASE 
        WHEN conname IS NOT NULL THEN '✓ EXISTS'
        ELSE '✗ MISSING'
    END as status,
    'FK: ' || conname as constraint_name
FROM pg_constraint
WHERE conname = 'ai_tag_proposal_product_tag_proposal_id_fkey'
  AND conrelid = 'core.ai_tag_proposal_product'::regclass;

-- Check for FK violations (rows with tag_proposal_id that don't exist in ai_tag_proposal)
\echo ''
\echo '4. Checking for FK violations...'
SELECT 
    COUNT(*) as violation_count,
    CASE 
        WHEN COUNT(*) = 0 THEN '✓ No FK violations'
        ELSE '✗ ' || COUNT(*) || ' FK violations found'
    END as status
FROM core.ai_tag_proposal_product tpp
LEFT JOIN core.ai_tag_proposal tp ON tp.tag_proposal_id = tpp.tag_proposal_id
WHERE tpp.tag_proposal_id IS NOT NULL
  AND tp.tag_proposal_id IS NULL;

-- Check trigger exists
\echo ''
\echo '5. Checking sync trigger exists...'
SELECT 
    CASE 
        WHEN tgname IS NOT NULL THEN '✓ EXISTS'
        ELSE '✗ MISSING'
    END as status,
    'Trigger: ' || tgname as trigger_name
FROM pg_trigger
WHERE tgname = 'trg_sync_ai_tag_proposal_product_ids'
  AND tgrelid = 'core.ai_tag_proposal_product'::regclass;

-- Check sync function exists
\echo ''
\echo '6. Checking sync function exists...'
SELECT 
    CASE 
        WHEN proname IS NOT NULL THEN '✓ EXISTS'
        ELSE '✗ MISSING'
    END as status,
    'Function: core.' || proname as function_name
FROM pg_proc
WHERE proname = 'sync_ai_tag_proposal_product_ids'
  AND pronamespace = 'core'::regnamespace;

\echo ''
\echo 'Verification complete!'
\echo '====================================================================='

