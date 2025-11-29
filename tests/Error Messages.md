x: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 120000,
  ssl: true
}
[LOOP] Cleanup handlers already registered, skipping...
[DB] [Query 7fa03d91-f919-48dd-96ea-e0f5290e010d] Before query execution: {
  state: 'closed',
  failures: 0,
  consecutiveSuccesses: 0,
  threshold: 10,
  lastFailure: null,
  openUntil: null
}
[DB] Acquiring client for query 7fa03d91-f919-48dd-96ea-e0f5290e010d...
[PASS] Query 7e14c66a-b011-4429-a155-a5129d2eda1f completed in 164ms, rows: 20
[TREND] Consecutive successes: 8/10
[WAIT] Circuit breaker reset pending: 8/10 consecutive successes
[RELEASE] Client released for query 7e14c66a-b011-4429-a155-a5129d2eda1f (destroyed: false)
[TagJobManager] getProductIdsForBatch offset=0 batchSize=20 filters={"exclude_tagged":true} -> 20 ids
[TagJobManager] fetchProductsForBatch offset=0 batchSize=20 -> ids=20
[DB] [Query 6c4561a5-f640-4196-8683-64edf960890d] Before query execution: {
  state: 'closed',
  failures: 0,
  consecutiveSuccesses: 8,
  threshold: 10,
  lastFailure: null,
  openUntil: null
}
[DB] Acquiring client for query 6c4561a5-f640-4196-8683-64edf960890d...
[PASS] Client acquired for query 6c4561a5-f640-4196-8683-64edf960890d in 1ms
[QUERY] Query 6c4561a5-f640-4196-8683-64edf960890d:
    WITH current_prices AS (
      SELECT DISTINCT ON (supplier_product_id)
   ...
[PASS] New client connected to enterprise pool
[PASS] Client acquired for query 687e813b-7eca-4054-b133-e8f7cf37dd2b in 1114ms
[QUERY] Query 687e813b-7eca-4054-b133-e8f7cf37dd2b:
      SELECT
        job_id,
        job_type,
        status,
        total_p...
[PASS] Query 6c4561a5-f640-4196-8683-64edf960890d completed in 467ms, rows: 20
[TREND] Consecutive successes: 9/10
[WAIT] Circuit breaker reset pending: 9/10 consecutive successes
[RELEASE] Client released for query 6c4561a5-f640-4196-8683-64edf960890d (destroyed: false)
[TagJobManager] fetchProductsForBatch enriched 20 products
[TagJobManager] Job d0461adc-541c-4eaa-8e9e-ef6169baa32c batch 0 fetched 20 products
[DB] [Query 293cad18-be31-497b-98f7-6e8099f01915] Before query execution: {
  state: 'closed',
  failures: 0,
  consecutiveSuccesses: 9,
  threshold: 10,
  lastFailure: null,
  openUntil: null
}
[DB] Acquiring client for query 293cad18-be31-497b-98f7-6e8099f01915...
[PASS] Client acquired for query 293cad18-be31-497b-98f7-6e8099f01915 in 0ms
[QUERY] Query 293cad18-be31-497b-98f7-6e8099f01915:
      INSERT INTO core.ai_tagging_progress (
        job_id, batch_number, batc...
[PASS] Query 687e813b-7eca-4054-b133-e8f7cf37dd2b completed in 467ms, rows: 20
[TREND] Consecutive successes: 10/10
[DB] [Circuit Breaker] Circuit breaker RESET: {
  state: 'closed',
  failures: 0,
  consecutiveSuccesses: 0,
  threshold: 10,
  lastFailure: null,
  openUntil: null
}
[RELEASE] Client released for query 687e813b-7eca-4054-b133-e8f7cf37dd2b (destroyed: false)
 GET /api/tag/ai-tagging/jobs?limit=20 200 in 1833ms
[PASS] Query 293cad18-be31-497b-98f7-6e8099f01915 completed in 170ms, rows: 1
[TREND] Consecutive successes: 1/10
[WAIT] Circuit breaker reset pending: 1/10 consecutive successes
[RELEASE] Client released for query 293cad18-be31-497b-98f7-6e8099f01915 (destroyed: false)
[TagJobManager] Job d0461adc-541c-4eaa-8e9e-ef6169baa32c batch 0 progress record 7bad8493-9077-4953-aafa-626ef1d9dd84 created
[DB] [Query ad01b7b6-b99b-4665-8f4f-65f8b0ecb73e] Before query execution: {
  state: 'closed',
  failures: 0,
  consecutiveSuccesses: 1,
  threshold: 10,
  lastFailure: null,
  openUntil: null
}
[DB] Acquiring client for query ad01b7b6-b99b-4665-8f4f-65f8b0ecb73e...
[PASS] Client acquired for query ad01b7b6-b99b-4665-8f4f-65f8b0ecb73e in 1ms
[QUERY] Query ad01b7b6-b99b-4665-8f4f-65f8b0ecb73e:
      UPDATE core.supplier_product
      SET ai_tagging_status = 'processing'
 ...
[PASS] Query ad01b7b6-b99b-4665-8f4f-65f8b0ecb73e completed in 264ms, rows: 20
[TREND] Consecutive successes: 2/10
[WAIT] Circuit breaker reset pending: 2/10 consecutive successes
[RELEASE] Client released for query ad01b7b6-b99b-4665-8f4f-65f8b0ecb73e (destroyed: false)
[TagJobManager] Job d0461adc-541c-4eaa-8e9e-ef6169baa32c batch 0 marked 20 products as processing
[TagJobManager] Job d0461adc-541c-4eaa-8e9e-ef6169baa32c batch 0 invoking tagBatch
[DB] [Query b630bf82-a272-426a-a6a3-4aff968f8391] Before query execution: {
  state: 'closed',
  failures: 0,
  consecutiveSuccesses: 2,
  threshold: 10,
  lastFailure: null,
  openUntil: null
}
[DB] Acquiring client for query b630bf82-a272-426a-a6a3-4aff968f8391...
[PASS] Client acquired for query b630bf82-a272-426a-a6a3-4aff968f8391 in 1ms
[QUERY] Query b630bf82-a272-426a-a6a3-4aff968f8391:
  CREATE TABLE IF NOT EXISTS core.ai_tag_library (
    tag_id TEXT PRIMARY KEY,...
[DB] [Query 89e55461-aced-4799-8d73-a050f1bf4dfd] Before query execution: {
  state: 'closed',
  failures: 0,
  consecutiveSuccesses: 0,
  threshold: 10,
  lastFailure: null,
  openUntil: null
}
[DB] Acquiring client for query 89e55461-aced-4799-8d73-a050f1bf4dfd...
[PASS] New client connected to enterprise pool
[PASS] Client acquired for query 7fa03d91-f919-48dd-96ea-e0f5290e010d in 1435ms
[QUERY] Query 7fa03d91-f919-48dd-96ea-e0f5290e010d:
      SELECT column_name
      FROM information_schema.columns
      WHERE tabl...
[PASS] Query b630bf82-a272-426a-a6a3-4aff968f8391 completed in 516ms, rows: 0
[TREND] Consecutive successes: 3/10
[WAIT] Circuit breaker reset pending: 3/10 consecutive successes
[RELEASE] Client released for query b630bf82-a272-426a-a6a3-4aff968f8391 (destroyed: false)
[DB] [Query a8dc2413-cc81-4b4b-87b4-00d1036b2067] Before query execution: {
  state: 'closed',
  failures: 0,
  consecutiveSuccesses: 3,
  threshold: 10,
  lastFailure: null,
  openUntil: null
}
[DB] Acquiring client for query a8dc2413-cc81-4b4b-87b4-00d1036b2067...
[PASS] Client acquired for query a8dc2413-cc81-4b4b-87b4-00d1036b2067 in 1ms
[QUERY] Query a8dc2413-cc81-4b4b-87b4-00d1036b2067:
    WITH counts AS (
      SELECT tag_id, COUNT(*) AS product_count
      FROM ...
[PASS] Query a8dc2413-cc81-4b4b-87b4-00d1036b2067 completed in 157ms, rows: 0
[TREND] Consecutive successes: 4/10
[WAIT] Circuit breaker reset pending: 4/10 consecutive successes
[RELEASE] Client released for query a8dc2413-cc81-4b4b-87b4-00d1036b2067 (destroyed: false)
[DB] [Query 39c5f3a4-0ba1-41d1-84d7-9a48dbac6b8d] Before query execution: {
  state: 'closed',
  failures: 0,
  consecutiveSuccesses: 4,
  threshold: 10,
  lastFailure: null,
  openUntil: null
}
[DB] Acquiring client for query 39c5f3a4-0ba1-41d1-84d7-9a48dbac6b8d...
[PASS] Client acquired for query 39c5f3a4-0ba1-41d1-84d7-9a48dbac6b8d in 0ms
[QUERY] Query 39c5f3a4-0ba1-41d1-84d7-9a48dbac6b8d:
    SELECT LOWER(TRIM(tag_value)) AS tag,
           COUNT(*)::bigint AS produc...
[PASS] Query 7fa03d91-f919-48dd-96ea-e0f5290e010d completed in 312ms, rows: 4
[TREND] Consecutive successes: 1/10
[WAIT] Circuit breaker reset pending: 1/10 consecutive successes
[RELEASE] Client released for query 7fa03d91-f919-48dd-96ea-e0f5290e010d (destroyed: false)
[DB] [Query ab8a5ce1-70d5-40c7-a4be-d9f5b2414810] Before query execution: {
  state: 'closed',
  failures: 0,
  consecutiveSuccesses: 1,
  threshold: 10,
  lastFailure: null,
  openUntil: null
}
[DB] Acquiring client for query ab8a5ce1-70d5-40c7-a4be-d9f5b2414810...
[PASS] Client acquired for query ab8a5ce1-70d5-40c7-a4be-d9f5b2414810 in 1ms
[QUERY] Query ab8a5ce1-70d5-40c7-a4be-d9f5b2414810:
      WITH stats AS (
        SELECT
          COUNT(*) as total_products,
   ...
[PASS] Query 39c5f3a4-0ba1-41d1-84d7-9a48dbac6b8d completed in 188ms, rows: 0
[TREND] Consecutive successes: 5/10
[WAIT] Circuit breaker reset pending: 5/10 consecutive successes
[RELEASE] Client released for query 39c5f3a4-0ba1-41d1-84d7-9a48dbac6b8d (destroyed: false)
[TaggingEngine] Requesting AI tag suggestions for 20 products (provider batch size=10, timeout=60000ms)
[suggestTagsBatch] ENTRY: 20 products, orgId: null
[tag-ai:resolver] ENTRY: Loading config for orgId: null
[tag-ai:resolver] Resolved orgId: 00000000-0000-0000-0000-000000000000
[DB] [Query ff7cac4f-3002-481b-871c-d5c13dc27fa0] Before query execution: {
  state: 'closed',
  failures: 0,
  consecutiveSuccesses: 5,
  threshold: 10,
  lastFailure: null,
  openUntil: null
}
[DB] Acquiring client for query ff7cac4f-3002-481b-871c-d5c13dc27fa0...
[PASS] Client acquired for query ff7cac4f-3002-481b-871c-d5c13dc27fa0 in 0ms
[QUERY] Query ff7cac4f-3002-481b-871c-d5c13dc27fa0:
    SELECT id, service_key
    FROM ai_service
    WHERE org_id = $1 AND servic...
[PASS] Query ab8a5ce1-70d5-40c7-a4be-d9f5b2414810 completed in 186ms, rows: 1
[TREND] Consecutive successes: 2/10
[WAIT] Circuit breaker reset pending: 2/10 consecutive successes
[RELEASE] Client released for query ab8a5ce1-70d5-40c7-a4be-d9f5b2414810 (destroyed: false)
 GET /api/tag/ai-tagging/stats 200 in 2879ms
[PASS] Query ff7cac4f-3002-481b-871c-d5c13dc27fa0 completed in 198ms, rows: 1
[TREND] Consecutive successes: 6/10
[WAIT] Circuit breaker reset pending: 6/10 consecutive successes
[RELEASE] Client released for query ff7cac4f-3002-481b-871c-d5c13dc27fa0 (destroyed: false)
[tag-ai:resolver] Service query result: 1 rows
[DB] [Query 48902c4f-4c01-4d64-a0d5-02a19371ba8e] Before query execution: {
  state: 'closed',
  failures: 0,
  consecutiveSuccesses: 6,
  threshold: 10,
  lastFailure: null,
  openUntil: null
}
[DB] Acquiring client for query 48902c4f-4c01-4d64-a0d5-02a19371ba8e...
[PASS] Client acquired for query 48902c4f-4c01-4d64-a0d5-02a19371ba8e in 1ms
[QUERY] Query 48902c4f-4c01-4d64-a0d5-02a19371ba8e:
    SELECT id, org_id, service_id, config, is_enabled as enabled
    FROM ai_se...
 [INFO] Compiling /api/tag/ai-tagging/status/[jobId] ...
[PASS] Query 48902c4f-4c01-4d64-a0d5-02a19371ba8e completed in 174ms, rows: 1
[TREND] Consecutive successes: 7/10
[WAIT] Circuit breaker reset pending: 7/10 consecutive successes
[RELEASE] Client released for query 48902c4f-4c01-4d64-a0d5-02a19371ba8e (destroyed: false)
[tag-ai:resolver] Found 1 providerInstances
[tag-ai:resolver] Using active provider instance: 1764298943156-5vswoboib (openai/gpt-5.1)
[tag-ai:resolver] Extracted 1 providers from config
[suggestTagsBatch] Config loaded: YES
[suggestTagsBatch] Found 1 providers for 20 products
[batcher] Starting tag batch process: providers=1, products=20
[engine] suggestTagsBatch start: provider=openrouter, model=openai/gpt-5.1, products=3, timeout=60000
[engine] suggestTagsBatch creating client: provider=openrouter, baseUrl=https://openrouter.ai/api/v1, hasApiKey=true, isOpenRouter=true
[engine] Using direct fetch for OpenRouter: model=openai/gpt-5.1
[engine] suggestTagsBatch start: provider=openrouter, model=openai/gpt-5.1, products=3, timeout=60000
[engine] suggestTagsBatch creating client: provider=openrouter, baseUrl=https://openrouter.ai/api/v1, hasApiKey=true, isOpenRouter=true
[engine] Using direct fetch for OpenRouter: model=openai/gpt-5.1
[engine] suggestTagsBatch start: provider=openrouter, model=openai/gpt-5.1, products=3, timeout=60000
[engine] suggestTagsBatch creating client: provider=openrouter, baseUrl=https://openrouter.ai/api/v1, hasApiKey=true, isOpenRouter=true
[engine] Using direct fetch for OpenRouter: model=openai/gpt-5.1
[engine] suggestTagsBatch start: provider=openrouter, model=openai/gpt-5.1, products=3, timeout=60000
[engine] suggestTagsBatch creating client: provider=openrouter, baseUrl=https://openrouter.ai/api/v1, hasApiKey=true, isOpenRouter=true
[engine] Using direct fetch for OpenRouter: model=openai/gpt-5.1
[engine] suggestTagsBatch start: provider=openrouter, model=openai/gpt-5.1, products=3, timeout=60000
[engine] suggestTagsBatch creating client: provider=openrouter, baseUrl=https://openrouter.ai/api/v1, hasApiKey=true, isOpenRouter=true
[engine] Using direct fetch for OpenRouter: model=openai/gpt-5.1
[engine] suggestTagsBatch start: provider=openrouter, model=openai/gpt-5.1, products=3, timeout=60000
[engine] suggestTagsBatch creating client: provider=openrouter, baseUrl=https://openrouter.ai/api/v1, hasApiKey=true, isOpenRouter=true
[engine] Using direct fetch for OpenRouter: model=openai/gpt-5.1
[engine] suggestTagsBatch start: provider=openrouter, model=openai/gpt-5.1, products=2, timeout=60000
[engine] suggestTagsBatch creating client: provider=openrouter, baseUrl=https://openrouter.ai/api/v1, hasApiKey=true, isOpenRouter=true
[engine] Using direct fetch for OpenRouter: model=openai/gpt-5.1
[PASS] New client connected to enterprise pool
[PASS] Client acquired for query 89e55461-aced-4799-8d73-a050f1bf4dfd in 1050ms
[QUERY] Query 89e55461-aced-4799-8d73-a050f1bf4dfd:
      SELECT
        job_id,
        job_type,
        status,
        total_p...
[PASS] Query 89e55461-aced-4799-8d73-a050f1bf4dfd completed in 512ms, rows: 20
[TREND] Consecutive successes: 3/10
[WAIT] Circuit breaker reset pending: 3/10 consecutive successes
[RELEASE] Client released for query 89e55461-aced-4799-8d73-a050f1bf4dfd (destroyed: false)
 GET /api/tag/ai-tagging/jobs?limit=20 200 in 2349ms
 [PASS] Compiled /api/tag/ai-tagging/status/[jobId] in 1513ms (1376 modules)
[GUARD] Setting up database cleanup handlers...
[CLEANUP] Removing 1 existing SIGTERM listeners
[CLEANUP] Removing 1 existing SIGINT listeners
[CLEANUP] Removing 1 existing exit listeners
[PASS] Cleanup handlers registered successfully
[READY] Unified database connection updated with enterprise manager
[DB] Initializing Enterprise Connection Pool with config: {
  host: 'postgresql://neondb_owner:npg_84ELeCFbOcGA@ep-stee...',
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 120000,
  ssl: true
}
[LOOP] Cleanup handlers already registered, skipping...
[DB] [Query af4d01e8-eeba-4aee-9dca-129e02d3d9cb] Before query execution: {
  state: 'closed',
  failures: 0,
  consecutiveSuccesses: 0,
  threshold: 10,
  lastFailure: null,
  openUntil: null
}
[DB] Acquiring client for query af4d01e8-eeba-4aee-9dca-129e02d3d9cb...
[PASS] New client connected to enterprise pool
[PASS] Client acquired for query af4d01e8-eeba-4aee-9dca-129e02d3d9cb in 929ms
[QUERY] Query af4d01e8-eeba-4aee-9dca-129e02d3d9cb:
      SELECT
        job_id,
        job_type,
        status,
        total_p...
[PASS] Query af4d01e8-eeba-4aee-9dca-129e02d3d9cb completed in 546ms, rows: 20
[TREND] Consecutive successes: 1/10
[WAIT] Circuit breaker reset pending: 1/10 consecutive successes
[RELEASE] Client released for query af4d01e8-eeba-4aee-9dca-129e02d3d9cb (destroyed: false)
 GET /api/tag/ai-tagging/jobs?limit=20 200 in 1925ms
[DB] [Query f55ca738-2349-4b15-a9fd-c6b2285c4123] Before query execution: {
  state: 'closed',
  failures: 0,
  consecutiveSuccesses: 1,
  threshold: 10,
  lastFailure: null,
  openUntil: null
}
[DB] Acquiring client for query f55ca738-2349-4b15-a9fd-c6b2285c4123...
[PASS] Client acquired for query f55ca738-2349-4b15-a9fd-c6b2285c4123 in 1ms
[QUERY] Query f55ca738-2349-4b15-a9fd-c6b2285c4123:
      SELECT
        job_id,
        job_type,
        status,
        total_p...
[PASS] Query f55ca738-2349-4b15-a9fd-c6b2285c4123 completed in 304ms, rows: 20
[TREND] Consecutive successes: 2/10
[WAIT] Circuit breaker reset pending: 2/10 consecutive successes
[RELEASE] Client released for query f55ca738-2349-4b15-a9fd-c6b2285c4123 (destroyed: false)
 GET /api/tag/ai-tagging/jobs?limit=20 200 in 435ms
[DB] [Query eae45036-66ff-4d86-8981-7d3df82794af] Before query execution: {
  state: 'closed',
  failures: 0,
  consecutiveSuccesses: 2,
  threshold: 10,
  lastFailure: null,
  openUntil: null
}
[DB] Acquiring client for query eae45036-66ff-4d86-8981-7d3df82794af...
[PASS] Client acquired for query eae45036-66ff-4d86-8981-7d3df82794af in 0ms
[QUERY] Query eae45036-66ff-4d86-8981-7d3df82794af:
      SELECT
        job_id,
        job_type,
        status,
        total_p...
[PASS] Query eae45036-66ff-4d86-8981-7d3df82794af completed in 304ms, rows: 20
[TREND] Consecutive successes: 3/10
[WAIT] Circuit breaker reset pending: 3/10 consecutive successes
[RELEASE] Client released for query eae45036-66ff-4d86-8981-7d3df82794af (destroyed: false)
 GET /api/tag/ai-tagging/jobs?limit=20 200 in 462ms
[DB] [Query c792e0aa-44f1-4b17-ac44-300d161b4aaa] Before query execution: {
  state: 'closed',
  failures: 0,
  consecutiveSuccesses: 3,
  threshold: 10,
  lastFailure: null,
  openUntil: null
}
[DB] Acquiring client for query c792e0aa-44f1-4b17-ac44-300d161b4aaa...
[PASS] Client acquired for query c792e0aa-44f1-4b17-ac44-300d161b4aaa in 1ms
[QUERY] Query c792e0aa-44f1-4b17-ac44-300d161b4aaa:
      SELECT
        job_id,
        job_type,
        status,
        total_p...
[PASS] Query c792e0aa-44f1-4b17-ac44-300d161b4aaa completed in 304ms, rows: 20
[TREND] Consecutive successes: 4/10
[WAIT] Circuit breaker reset pending: 4/10 consecutive successes
[RELEASE] Client released for query c792e0aa-44f1-4b17-ac44-300d161b4aaa (destroyed: false)
 GET /api/tag/ai-tagging/jobs?limit=20 200 in 464ms
[GUARD] Setting up database cleanup handlers...
[PASS] Cleanup handlers registered successfully
[READY] Unified database connection updated with enterprise manager
[DB] [Query 1f74940b-e8ae-4ac5-aa03-ab99bb71c37d] Before query execution: {
  state: 'closed',
  failures: 0,
  consecutiveSuccesses: 4,
  threshold: 10,
  lastFailure: null,
  openUntil: null
}
[DB] Acquiring client for query 1f74940b-e8ae-4ac5-aa03-ab99bb71c37d...
[DB] [Query 13edcbcf-4914-4656-a6a1-5ca0e01f6d6f] Before query execution: {
  state: 'closed',
  failures: 0,
  consecutiveSuccesses: 4,
  threshold: 10,
  lastFailure: null,
  openUntil: null
}
[DB] Acquiring client for query 13edcbcf-4914-4656-a6a1-5ca0e01f6d6f...
[PASS] Client acquired for query 1f74940b-e8ae-4ac5-aa03-ab99bb71c37d in 5ms
[QUERY] Query 1f74940b-e8ae-4ac5-aa03-ab99bb71c37d:
      SELECT
        job_id,
        job_type,
        status,
        total_p...
[PASS] Query 1f74940b-e8ae-4ac5-aa03-ab99bb71c37d completed in 155ms, rows: 1
[TREND] Consecutive successes: 5/10
[WAIT] Circuit breaker reset pending: 5/10 consecutive successes
[RELEASE] Client released for query 1f74940b-e8ae-4ac5-aa03-ab99bb71c37d (destroyed: false)
[DB] [Query f349fa49-de06-4fd6-8b5b-9e2c2920783c] Before query execution: {
  state: 'closed',
  failures: 0,
  consecutiveSuccesses: 5,
  threshold: 10,
  lastFailure: null,
  openUntil: null
}
[DB] Acquiring client for query f349fa49-de06-4fd6-8b5b-9e2c2920783c...
[PASS] Client acquired for query f349fa49-de06-4fd6-8b5b-9e2c2920783c in 1ms
[QUERY] Query f349fa49-de06-4fd6-8b5b-9e2c2920783c:
      WITH batch_stats AS (
        SELECT
          COUNT(*) as completed_bat...
[PASS] Query f349fa49-de06-4fd6-8b5b-9e2c2920783c completed in 193ms, rows: 1
[TREND] Consecutive successes: 6/10
[WAIT] Circuit breaker reset pending: 6/10 consecutive successes
[RELEASE] Client released for query f349fa49-de06-4fd6-8b5b-9e2c2920783c (destroyed: false)
[DB] [Query 25e28d6d-3459-4ed7-9799-972f69b13c27] Before query execution: {
  state: 'closed',
  failures: 0,
  consecutiveSuccesses: 6,
  threshold: 10,
  lastFailure: null,
  openUntil: null
}
[DB] Acquiring client for query 25e28d6d-3459-4ed7-9799-972f69b13c27...
[PASS] Client acquired for query 25e28d6d-3459-4ed7-9799-972f69b13c27 in 2ms
[QUERY] Query 25e28d6d-3459-4ed7-9799-972f69b13c27:
      SELECT
        batch_number,
        error_message,
        products_in_...
[DB] [Query 2bc32020-47b5-4e3c-ad2e-fd86399fe9a7] Before query execution: {
  state: 'closed',
  failures: 0,
  consecutiveSuccesses: 6,
  threshold: 10,
  lastFailure: null,
  openUntil: null
}
[DB] Acquiring client for query 2bc32020-47b5-4e3c-ad2e-fd86399fe9a7...
[PASS] Query 25e28d6d-3459-4ed7-9799-972f69b13c27 completed in 174ms, rows: 0
[TREND] Consecutive successes: 7/10
[WAIT] Circuit breaker reset pending: 7/10 consecutive successes
[RELEASE] Client released for query 25e28d6d-3459-4ed7-9799-972f69b13c27 (destroyed: false)
[DB] [Query c9bb8d69-b66c-4009-8dca-ab7bd4614259] Before query execution: {
  state: 'closed',
  failures: 0,
  consecutiveSuccesses: 7,
  threshold: 10,
  lastFailure: null,
  openUntil: null
}
[DB] Acquiring client for query c9bb8d69-b66c-4009-8dca-ab7bd4614259...
[PASS] Client acquired for query c9bb8d69-b66c-4009-8dca-ab7bd4614259 in 1ms
[QUERY] Query c9bb8d69-b66c-4009-8dca-ab7bd4614259:
      WITH batch_metrics AS (
        SELECT
          SUM(successful_count + ...
[DB] [Query a6615817-5ec3-4fab-8343-bab7fa938ddc] Before query execution: {
  state: 'closed',
  failures: 0,
  consecutiveSuccesses: 7,
  threshold: 10,
  lastFailure: null,
  openUntil: null
}
[DB] Acquiring client for query a6615817-5ec3-4fab-8343-bab7fa938ddc...
[PASS] Query c9bb8d69-b66c-4009-8dca-ab7bd4614259 completed in 155ms, rows: 1
[TREND] Consecutive successes: 8/10
[WAIT] Circuit breaker reset pending: 8/10 consecutive successes
[RELEASE] Client released for query c9bb8d69-b66c-4009-8dca-ab7bd4614259 (destroyed: false)
 GET /api/tag/ai-tagging/status/d0461adc-541c-4eaa-8e9e-ef6169baa32c 200 in 23383ms
[DB] [Query 233d2125-9d37-428e-9e1f-c420c434c5d6] Before query execution: {
  state: 'closed',
  failures: 0,
  consecutiveSuccesses: 8,
  threshold: 10,
  lastFailure: null,
  openUntil: null
}
[DB] Acquiring client for query 233d2125-9d37-428e-9e1f-c420c434c5d6...
[PASS] Client acquired for query 233d2125-9d37-428e-9e1f-c420c434c5d6 in 1ms
[QUERY] Query 233d2125-9d37-428e-9e1f-c420c434c5d6:
      SELECT
        job_id,
        job_type,
        status,
        total_p...
[PASS] New client connected to enterprise pool
[PASS] Client acquired for query 13edcbcf-4914-4656-a6a1-5ca0e01f6d6f in 1095ms
[QUERY] Query 13edcbcf-4914-4656-a6a1-5ca0e01f6d6f:
      SELECT
        job_id,
        job_type,
        status,
        total_p...
[PASS] Query 233d2125-9d37-428e-9e1f-c420c434c5d6 completed in 153ms, rows: 1
[TREND] Consecutive successes: 9/10
[WAIT] Circuit breaker reset pending: 9/10 consecutive successes
[RELEASE] Client released for query 233d2125-9d37-428e-9e1f-c420c434c5d6 (destroyed: false)
[DB] [Query c588ff15-c40a-4fe0-9804-fed08c4bedbb] Before query execution: {
  state: 'closed',
  failures: 0,
  consecutiveSuccesses: 9,
  threshold: 10,
  lastFailure: null,
  openUntil: null
}
[DB] Acquiring client for query c588ff15-c40a-4fe0-9804-fed08c4bedbb...
[PASS] Client acquired for query c588ff15-c40a-4fe0-9804-fed08c4bedbb in 2ms
[QUERY] Query c588ff15-c40a-4fe0-9804-fed08c4bedbb:
      WITH batch_stats AS (
        SELECT
          COUNT(*) as completed_bat...
[PASS] Query c588ff15-c40a-4fe0-9804-fed08c4bedbb completed in 153ms, rows: 1
[TREND] Consecutive successes: 10/10
[DB] [Circuit Breaker] Circuit breaker RESET: {
  state: 'closed',
  failures: 0,
  consecutiveSuccesses: 0,
  threshold: 10,
  lastFailure: null,
  openUntil: null
}
[RELEASE] Client released for query c588ff15-c40a-4fe0-9804-fed08c4bedbb (destroyed: false)
[DB] [Query d5764bc5-12e4-4f1f-b1b6-7cb3814ec7b1] Before query execution: {
  state: 'closed',
  failures: 0,
  consecutiveSuccesses: 0,
  threshold: 10,
  lastFailure: null,
  openUntil: null
}
[DB] Acquiring client for query d5764bc5-12e4-4f1f-b1b6-7cb3814ec7b1...
[PASS] Client acquired for query d5764bc5-12e4-4f1f-b1b6-7cb3814ec7b1 in 1ms
[QUERY] Query d5764bc5-12e4-4f1f-b1b6-7cb3814ec7b1:
      SELECT
        batch_number,
        error_message,
        products_in_...
[PASS] New client connected to enterprise pool
[PASS] Client acquired for query 2bc32020-47b5-4e3c-ad2e-fd86399fe9a7 in 1009ms
[QUERY] Query 2bc32020-47b5-4e3c-ad2e-fd86399fe9a7:
      SELECT
        job_id,
        job_type,
        status,
        total_p...
[PASS] Query 13edcbcf-4914-4656-a6a1-5ca0e01f6d6f completed in 305ms, rows: 1
[TREND] Consecutive successes: 1/10
[WAIT] Circuit breaker reset pending: 1/10 consecutive successes
[RELEASE] Client released for query 13edcbcf-4914-4656-a6a1-5ca0e01f6d6f (destroyed: false)
[DB] [Query 05c61923-5122-4bb2-bd20-9c9053ec5dd4] Before query execution: {
  state: 'closed',
  failures: 0,
  consecutiveSuccesses: 1,
  threshold: 10,
  lastFailure: null,
  openUntil: null
}
[DB] Acquiring client for query 05c61923-5122-4bb2-bd20-9c9053ec5dd4...
[PASS] Client acquired for query 05c61923-5122-4bb2-bd20-9c9053ec5dd4 in 1ms
[QUERY] Query 05c61923-5122-4bb2-bd20-9c9053ec5dd4:
      WITH batch_stats AS (
        SELECT
          COUNT(*) as completed_bat...
[PASS] Query d5764bc5-12e4-4f1f-b1b6-7cb3814ec7b1 completed in 153ms, rows: 0
[TREND] Consecutive successes: 2/10
[WAIT] Circuit breaker reset pending: 2/10 consecutive successes
[RELEASE] Client released for query d5764bc5-12e4-4f1f-b1b6-7cb3814ec7b1 (destroyed: false)
[DB] [Query 2f63d806-654d-43ed-a22c-1eeff0f052a1] Before query execution: {
  state: 'closed',
  failures: 0,
  consecutiveSuccesses: 2,
  threshold: 10,
  lastFailure: null,
  openUntil: null
}
[DB] Acquiring client for query 2f63d806-654d-43ed-a22c-1eeff0f052a1...
[PASS] Client acquired for query 2f63d806-654d-43ed-a22c-1eeff0f052a1 in 1ms
[QUERY] Query 2f63d806-654d-43ed-a22c-1eeff0f052a1:
      WITH batch_metrics AS (
        SELECT
          SUM(successful_count + ...
[PASS] Query 05c61923-5122-4bb2-bd20-9c9053ec5dd4 completed in 154ms, rows: 1
[TREND] Consecutive successes: 3/10
[WAIT] Circuit breaker reset pending: 3/10 consecutive successes
[RELEASE] Client released for query 05c61923-5122-4bb2-bd20-9c9053ec5dd4 (destroyed: false)
[DB] [Query d5c6e8ad-2593-4f95-b69a-0f039254365c] Before query execution: {
  state: 'closed',
  failures: 0,
  consecutiveSuccesses: 3,
  threshold: 10,
  lastFailure: null,
  openUntil: null
}
[DB] Acquiring client for query d5c6e8ad-2593-4f95-b69a-0f039254365c...
[PASS] Client acquired for query d5c6e8ad-2593-4f95-b69a-0f039254365c in 2ms
[QUERY] Query d5c6e8ad-2593-4f95-b69a-0f039254365c:
      SELECT
        batch_number,
        error_message,
        products_in_...
[PASS] New client connected to enterprise pool
[PASS] Client acquired for query a6615817-5ec3-4fab-8343-bab7fa938ddc in 980ms
[QUERY] Query a6615817-5ec3-4fab-8343-bab7fa938ddc:
      SELECT
        job_id,
        job_type,
        status,
        total_p...
[PASS] Query 2f63d806-654d-43ed-a22c-1eeff0f052a1 completed in 153ms, rows: 1
[TREND] Consecutive successes: 4/10
[WAIT] Circuit breaker reset pending: 4/10 consecutive successes
[RELEASE] Client released for query 2f63d806-654d-43ed-a22c-1eeff0f052a1 (destroyed: false)
 GET /api/tag/ai-tagging/status/d0461adc-541c-4eaa-8e9e-ef6169baa32c 200 in 887ms
[PASS] Query d5c6e8ad-2593-4f95-b69a-0f039254365c completed in 256ms, rows: 0
[TREND] Consecutive successes: 5/10
[WAIT] Circuit breaker reset pending: 5/10 consecutive successes
[RELEASE] Client released for query d5c6e8ad-2593-4f95-b69a-0f039254365c (destroyed: false)
[DB] [Query a4bc545c-ed64-40c6-9273-22657dcb9e50] Before query execution: {
  state: 'closed',
  failures: 0,
  consecutiveSuccesses: 5,
  threshold: 10,
  lastFailure: null,
  openUntil: null
}
[DB] Acquiring client for query a4bc545c-ed64-40c6-9273-22657dcb9e50...
[PASS] Client acquired for query a4bc545c-ed64-40c6-9273-22657dcb9e50 in 4ms
[QUERY] Query a4bc545c-ed64-40c6-9273-22657dcb9e50:
      WITH batch_metrics AS (
        SELECT
          SUM(successful_count + ...
[DB] [Query a8479f94-878f-4e4b-aeaf-194d8972fcd6] Before query execution: {
  state: 'closed',
  failures: 0,
  consecutiveSuccesses: 5,
  threshold: 10,
  lastFailure: null,
  openUntil: null
}
[DB] Acquiring client for query a8479f94-878f-4e4b-aeaf-194d8972fcd6...
[PASS] Client acquired for query a8479f94-878f-4e4b-aeaf-194d8972fcd6 in 2ms
[QUERY] Query a8479f94-878f-4e4b-aeaf-194d8972fcd6:
      SELECT
        job_id,
        job_type,
        status,
        total_p...
[PASS] Query 2bc32020-47b5-4e3c-ad2e-fd86399fe9a7 completed in 548ms, rows: 20
[TREND] Consecutive successes: 6/10
[WAIT] Circuit breaker reset pending: 6/10 consecutive successes
[RELEASE] Client released for query 2bc32020-47b5-4e3c-ad2e-fd86399fe9a7 (destroyed: false)
 GET /api/tag/ai-tagging/jobs?limit=20 200 in 1779ms
[PASS] Query a6615817-5ec3-4fab-8343-bab7fa938ddc completed in 393ms, rows: 1
[TREND] Consecutive successes: 7/10
[WAIT] Circuit breaker reset pending: 7/10 consecutive successes
[RELEASE] Client released for query a6615817-5ec3-4fab-8343-bab7fa938ddc (destroyed: false)
[DB] [Query 9dc100c8-4029-4099-8c81-56ae183518f0] Before query execution: {
  state: 'closed',
  failures: 0,
  consecutiveSuccesses: 7,
  threshold: 10,
  lastFailure: null,
  openUntil: null
}
[DB] Acquiring client for query 9dc100c8-4029-4099-8c81-56ae183518f0...
[PASS] Client acquired for query 9dc100c8-4029-4099-8c81-56ae183518f0 in 1ms
[QUERY] Query 9dc100c8-4029-4099-8c81-56ae183518f0:
      WITH batch_stats AS (
        SELECT
          COUNT(*) as completed_bat...
[PASS] Query a4bc545c-ed64-40c6-9273-22657dcb9e50 completed in 156ms, rows: 1
[TREND] Consecutive successes: 8/10
[WAIT] Circuit breaker reset pending: 8/10 consecutive successes
[RELEASE] Client released for query a4bc545c-ed64-40c6-9273-22657dcb9e50 (destroyed: false)
 GET /api/tag/ai-tagging/status/d0461adc-541c-4eaa-8e9e-ef6169baa32c 200 in 4757ms
[PASS] Query a8479f94-878f-4e4b-aeaf-194d8972fcd6 completed in 154ms, rows: 1
[TREND] Consecutive successes: 9/10
[WAIT] Circuit breaker reset pending: 9/10 consecutive successes
[RELEASE] Client released for query a8479f94-878f-4e4b-aeaf-194d8972fcd6 (destroyed: false)
[DB] [Query d6053da6-3d56-407a-9908-7850420f6a07] Before query execution: {
  state: 'closed',
  failures: 0,
  consecutiveSuccesses: 9,
  threshold: 10,
  lastFailure: null,
  openUntil: null
}
[DB] Acquiring client for query d6053da6-3d56-407a-9908-7850420f6a07...
[PASS] Client acquired for query d6053da6-3d56-407a-9908-7850420f6a07 in 1ms
[QUERY] Query d6053da6-3d56-407a-9908-7850420f6a07:
      WITH batch_stats AS (
        SELECT
          COUNT(*) as completed_bat...
[PASS] Query 9dc100c8-4029-4099-8c81-56ae183518f0 completed in 154ms, rows: 1
[TREND] Consecutive successes: 10/10
[DB] [Circuit Breaker] Circuit breaker RESET: {
  state: 'closed',
  failures: 0,
  consecutiveSuccesses: 0,
  threshold: 10,
  lastFailure: null,
  openUntil: null
}
[RELEASE] Client released for query 9dc100c8-4029-4099-8c81-56ae183518f0 (destroyed: false)
[DB] [Query bbe8c959-b703-4eb4-b114-36218d6b63c1] Before query execution: {
  state: 'closed',
  failures: 0,
  consecutiveSuccesses: 0,
  threshold: 10,
  lastFailure: null,
  openUntil: null
}
[DB] Acquiring client for query bbe8c959-b703-4eb4-b114-36218d6b63c1...
[PASS] Client acquired for query bbe8c959-b703-4eb4-b114-36218d6b63c1 in 1ms
[QUERY] Query bbe8c959-b703-4eb4-b114-36218d6b63c1:
      SELECT
        batch_number,
        error_message,
        products_in_...
[PASS] Query d6053da6-3d56-407a-9908-7850420f6a07 completed in 154ms, rows: 1
[TREND] Consecutive successes: 1/10
[WAIT] Circuit breaker reset pending: 1/10 consecutive successes
[RELEASE] Client released for query d6053da6-3d56-407a-9908-7850420f6a07 (destroyed: false)
[DB] [Query f54eb41f-58d0-4ff1-bcb6-61381af6318e] Before query execution: {
  state: 'closed',
  failures: 0,
  consecutiveSuccesses: 1,
  threshold: 10,
  lastFailure: null,
  openUntil: null
}
[DB] Acquiring client for query f54eb41f-58d0-4ff1-bcb6-61381af6318e...
[PASS] Client acquired for query f54eb41f-58d0-4ff1-bcb6-61381af6318e in 2ms
[QUERY] Query f54eb41f-58d0-4ff1-bcb6-61381af6318e:
      SELECT
        batch_number,
        error_message,
        products_in_...
[PASS] Query bbe8c959-b703-4eb4-b114-36218d6b63c1 completed in 154ms, rows: 0
[TREND] Consecutive successes: 2/10
[WAIT] Circuit breaker reset pending: 2/10 consecutive successes
[RELEASE] Client released for query bbe8c959-b703-4eb4-b114-36218d6b63c1 (destroyed: false)
[DB] [Query 0a6810bd-c1d1-4fc1-aedd-5d86dfd62b8e] Before query execution: {
  state: 'closed',
  failures: 0,
  consecutiveSuccesses: 2,
  threshold: 10,
  lastFailure: null,
  openUntil: null
}
[DB] Acquiring client for query 0a6810bd-c1d1-4fc1-aedd-5d86dfd62b8e...
[PASS] Client acquired for query 0a6810bd-c1d1-4fc1-aedd-5d86dfd62b8e in 2ms
[QUERY] Query 0a6810bd-c1d1-4fc1-aedd-5d86dfd62b8e:
      WITH batch_metrics AS (
        SELECT
          SUM(successful_count + ...
[PASS] Query f54eb41f-58d0-4ff1-bcb6-61381af6318e completed in 154ms, rows: 0
[TREND] Consecutive successes: 3/10
[WAIT] Circuit breaker reset pending: 3/10 consecutive successes
[RELEASE] Client released for query f54eb41f-58d0-4ff1-bcb6-61381af6318e (destroyed: false)
[DB] [Query 4d8c39d6-b3df-4d1a-89c4-851200cbdf35] Before query execution: {
  state: 'closed',
  failures: 0,
  consecutiveSuccesses: 3,
  threshold: 10,
  lastFailure: null,
  openUntil: null
}
[DB] Acquiring client for query 4d8c39d6-b3df-4d1a-89c4-851200cbdf35...
[PASS] Client acquired for query 4d8c39d6-b3df-4d1a-89c4-851200cbdf35 in 1ms
[QUERY] Query 4d8c39d6-b3df-4d1a-89c4-851200cbdf35:
      WITH batch_metrics AS (
        SELECT
          SUM(successful_count + ...
[PASS] Query 0a6810bd-c1d1-4fc1-aedd-5d86dfd62b8e completed in 153ms, rows: 1
[TREND] Consecutive successes: 4/10
[WAIT] Circuit breaker reset pending: 4/10 consecutive successes
[RELEASE] Client released for query 0a6810bd-c1d1-4fc1-aedd-5d86dfd62b8e (destroyed: false)
 GET /api/tag/ai-tagging/status/d0461adc-541c-4eaa-8e9e-ef6169baa32c 200 in 2192ms
[PASS] Query 4d8c39d6-b3df-4d1a-89c4-851200cbdf35 completed in 153ms, rows: 1
[TREND] Consecutive successes: 5/10
[WAIT] Circuit breaker reset pending: 5/10 consecutive successes
[RELEASE] Client released for query 4d8c39d6-b3df-4d1a-89c4-851200cbdf35 (destroyed: false)
 GET /api/tag/ai-tagging/status/d0461adc-541c-4eaa-8e9e-ef6169baa32c 200 in 895ms
[GUARD] Setting up database cleanup handlers...
[PASS] Cleanup handlers registered successfully
[READY] Unified database connection updated with enterprise manager
[DB] [Query 4a3db321-775c-4422-b6c6-d54da9c8337c] Before query execution: {
  state: 'closed',
  failures: 0,
  consecutiveSuccesses: 5,
  threshold: 10,
  lastFailure: null,
  openUntil: null
}
[DB] Acquiring client for query 4a3db321-775c-4422-b6c6-d54da9c8337c...
[PASS] Client acquired for query 4a3db321-775c-4422-b6c6-d54da9c8337c in 2ms
[QUERY] Query 4a3db321-775c-4422-b6c6-d54da9c8337c:
      SELECT
        job_id,
        job_type,
        status,
        total_p...
[PASS] Query 4a3db321-775c-4422-b6c6-d54da9c8337c completed in 154ms, rows: 1
[TREND] Consecutive successes: 6/10
[WAIT] Circuit breaker reset pending: 6/10 consecutive successes
[RELEASE] Client released for query 4a3db321-775c-4422-b6c6-d54da9c8337c (destroyed: false)
[DB] [Query 573f85e1-5b07-4ee6-a19b-80c102fd5b6f] Before query execution: {
  state: 'closed',
  failures: 0,
  consecutiveSuccesses: 6,
  threshold: 10,
  lastFailure: null,
  openUntil: null
}
[DB] Acquiring client for query 573f85e1-5b07-4ee6-a19b-80c102fd5b6f...
[PASS] Client acquired for query 573f85e1-5b07-4ee6-a19b-80c102fd5b6f in 1ms
[QUERY] Query 573f85e1-5b07-4ee6-a19b-80c102fd5b6f:
      WITH batch_stats AS (
        SELECT
          COUNT(*) as completed_bat...
[PASS] Query 573f85e1-5b07-4ee6-a19b-80c102fd5b6f completed in 154ms, rows: 1
[TREND] Consecutive successes: 7/10
[WAIT] Circuit breaker reset pending: 7/10 consecutive successes
[RELEASE] Client released for query 573f85e1-5b07-4ee6-a19b-80c102fd5b6f (destroyed: false)
[DB] [Query 4920c824-98ac-48c5-b841-36d040bce34c] Before query execution: {
  state: 'closed',
  failures: 0,
  consecutiveSuccesses: 7,
  threshold: 10,
  lastFailure: null,
  openUntil: null
}
[DB] Acquiring client for query 4920c824-98ac-48c5-b841-36d040bce34c...
[PASS] Client acquired for query 4920c824-98ac-48c5-b841-36d040bce34c in 0ms
[QUERY] Query 4920c824-98ac-48c5-b841-36d040bce34c:
      SELECT
        batch_number,
        error_message,
        products_in_...
[PASS] Query 4920c824-98ac-48c5-b841-36d040bce34c completed in 152ms, rows: 0
[TREND] Consecutive successes: 8/10
[WAIT] Circuit breaker reset pending: 8/10 consecutive successes
[RELEASE] Client released for query 4920c824-98ac-48c5-b841-36d040bce34c (destroyed: false)
[DB] [Query b4692feb-fd29-4a57-adfd-edbaef1e3220] Before query execution: {
  state: 'closed',
  failures: 0,
  consecutiveSuccesses: 8,
  threshold: 10,
  lastFailure: null,
  openUntil: null
}
[DB] Acquiring client for query b4692feb-fd29-4a57-adfd-edbaef1e3220...
[PASS] Client acquired for query b4692feb-fd29-4a57-adfd-edbaef1e3220 in 1ms
[QUERY] Query b4692feb-fd29-4a57-adfd-edbaef1e3220:
      WITH batch_metrics AS (
        SELECT
          SUM(successful_count + ...
[PASS] Query b4692feb-fd29-4a57-adfd-edbaef1e3220 completed in 153ms, rows: 1
[TREND] Consecutive successes: 9/10
[WAIT] Circuit breaker reset pending: 9/10 consecutive successes
[RELEASE] Client released for query b4692feb-fd29-4a57-adfd-edbaef1e3220 (destroyed: false)
 GET /api/tag/ai-tagging/status/d0461adc-541c-4eaa-8e9e-ef6169baa32c 200 in 904ms
[DB] [Query 04af3ac5-5526-46df-881c-8ee9505cf13a] Before query execution: {
  state: 'closed',
  failures: 0,
  consecutiveSuccesses: 9,
  threshold: 10,
  lastFailure: null,
  openUntil: null
}
[DB] Acquiring client for query 04af3ac5-5526-46df-881c-8ee9505cf13a...
[PASS] Client acquired for query 04af3ac5-5526-46df-881c-8ee9505cf13a in 1ms
[QUERY] Query 04af3ac5-5526-46df-881c-8ee9505cf13a:
      SELECT
        job_id,
        job_type,
        status,
        total_p...
[PASS] Query 04af3ac5-5526-46df-881c-8ee9505cf13a completed in 154ms, rows: 1
[TREND] Consecutive successes: 10/10
[DB] [Circuit Breaker] Circuit breaker RESET: {
  state: 'closed',
  failures: 0,
  consecutiveSuccesses: 0,
  threshold: 10,
  lastFailure: null,
  openUntil: null
}
[RELEASE] Client released for query 04af3ac5-5526-46df-881c-8ee9505cf13a (destroyed: false)
[DB] [Query 8efeb179-8643-40ec-bcde-92ad7b59b848] Before query execution: {
  state: 'closed',
  failures: 0,
  consecutiveSuccesses: 0,
  threshold: 10,
  lastFailure: null,
  openUntil: null
}
[DB] Acquiring client for query 8efeb179-8643-40ec-bcde-92ad7b59b848...
[PASS] Client acquired for query 8efeb179-8643-40ec-bcde-92ad7b59b848 in 1ms
[QUERY] Query 8efeb179-8643-40ec-bcde-92ad7b59b848:
      WITH batch_stats AS (
        SELECT
          COUNT(*) as completed_bat...
[PASS] Query 8efeb179-8643-40ec-bcde-92ad7b59b848 completed in 154ms, rows: 1
[TREND] Consecutive successes: 1/10
[WAIT] Circuit breaker reset pending: 1/10 consecutive successes
[RELEASE] Client released for query 8efeb179-8643-40ec-bcde-92ad7b59b848 (destroyed: false)
[DB] [Query 6d75fbcf-be42-4d30-be22-b3c6b76256f2] Before query execution: {
  state: 'closed',
  failures: 0,
  consecutiveSuccesses: 1,
  threshold: 10,
  lastFailure: null,
  openUntil: null
}
[DB] Acquiring client for query 6d75fbcf-be42-4d30-be22-b3c6b76256f2...
[PASS] Client acquired for query 6d75fbcf-be42-4d30-be22-b3c6b76256f2 in 1ms
[QUERY] Query 6d75fbcf-be42-4d30-be22-b3c6b76256f2:
      SELECT
        batch_number,
        error_message,
        products_in_...
[PASS] Query 6d75fbcf-be42-4d30-be22-b3c6b76256f2 completed in 153ms, rows: 0
[TREND] Consecutive successes: 2/10
[WAIT] Circuit breaker reset pending: 2/10 consecutive successes
[RELEASE] Client released for query 6d75fbcf-be42-4d30-be22-b3c6b76256f2 (destroyed: false)
[DB] [Query 2457d08b-13af-4ab4-bffa-d586691e8b58] Before query execution: {
  state: 'closed',
  failures: 0,
  consecutiveSuccesses: 2,
  threshold: 10,
  lastFailure: null,
  openUntil: null
}
[DB] Acquiring client for query 2457d08b-13af-4ab4-bffa-d586691e8b58...
[PASS] Client acquired for query 2457d08b-13af-4ab4-bffa-d586691e8b58 in 1ms
[QUERY] Query 2457d08b-13af-4ab4-bffa-d586691e8b58:
      WITH batch_metrics AS (
        SELECT
          SUM(successful_count + ...
[PASS] Query 2457d08b-13af-4ab4-bffa-d586691e8b58 completed in 153ms, rows: 1
[TREND] Consecutive successes: 3/10
[WAIT] Circuit breaker reset pending: 3/10 consecutive successes
[RELEASE] Client released for query 2457d08b-13af-4ab4-bffa-d586691e8b58 (destroyed: false)
 GET /api/tag/ai-tagging/status/d0461adc-541c-4eaa-8e9e-ef6169baa32c 200 in 787ms
[DB] [Query 946ad069-12ae-45c2-8a90-d7e9b3b61942] Before query execution: {
  state: 'closed',
  failures: 0,
  consecutiveSuccesses: 3,
  threshold: 10,
  lastFailure: null,
  openUntil: null
}
[DB] Acquiring client for query 946ad069-12ae-45c2-8a90-d7e9b3b61942...
[PASS] Client acquired for query 946ad069-12ae-45c2-8a90-d7e9b3b61942 in 0ms
[QUERY] Query 946ad069-12ae-45c2-8a90-d7e9b3b61942:
      SELECT
        job_id,
        job_type,
        status,
        total_p...
[PASS] Query 946ad069-12ae-45c2-8a90-d7e9b3b61942 completed in 152ms, rows: 1
[TREND] Consecutive successes: 4/10
[WAIT] Circuit breaker reset pending: 4/10 consecutive successes
[RELEASE] Client released for query 946ad069-12ae-45c2-8a90-d7e9b3b61942 (destroyed: false)
[DB] [Query 18e21077-5b1c-4d56-b059-9ce3c6c12c44] Before query execution: {
  state: 'closed',
  failures: 0,
  consecutiveSuccesses: 4,
  threshold: 10,
  lastFailure: null,
  openUntil: null
}
[DB] Acquiring client for query 18e21077-5b1c-4d56-b059-9ce3c6c12c44...
[PASS] Client acquired for query 18e21077-5b1c-4d56-b059-9ce3c6c12c44 in 2ms
[QUERY] Query 18e21077-5b1c-4d56-b059-9ce3c6c12c44:
      WITH batch_stats AS (
        SELECT
          COUNT(*) as completed_bat...
[engine] suggestTagsBatch success (OpenRouter direct fetch) provider=openrouter model=openai/gpt-5.1 suggestions=3
[PASS] Query 18e21077-5b1c-4d56-b059-9ce3c6c12c44 completed in 154ms, rows: 1
[TREND] Consecutive successes: 5/10
[WAIT] Circuit breaker reset pending: 5/10 consecutive successes
[RELEASE] Client released for query 18e21077-5b1c-4d56-b059-9ce3c6c12c44 (destroyed: false)
[DB] [Query a8dafacc-56f2-4d6e-a9c1-75d120ea7e5a] Before query execution: {
  state: 'closed',
  failures: 0,
  consecutiveSuccesses: 5,
  threshold: 10,
  lastFailure: null,
  openUntil: null
}
[DB] Acquiring client for query a8dafacc-56f2-4d6e-a9c1-75d120ea7e5a...
[PASS] Client acquired for query a8dafacc-56f2-4d6e-a9c1-75d120ea7e5a in 1ms
[QUERY] Query a8dafacc-56f2-4d6e-a9c1-75d120ea7e5a:
      SELECT
        batch_number,
        error_message,
        products_in_...
[PASS] Query a8dafacc-56f2-4d6e-a9c1-75d120ea7e5a completed in 153ms, rows: 0
[TREND] Consecutive successes: 6/10
[WAIT] Circuit breaker reset pending: 6/10 consecutive successes
[RELEASE] Client released for query a8dafacc-56f2-4d6e-a9c1-75d120ea7e5a (destroyed: false)
[DB] [Query 68101adb-c2d0-4a71-bf23-1cdd48bdd0b0] Before query execution: {
  state: 'closed',
  failures: 0,
  consecutiveSuccesses: 6,
  threshold: 10,
  lastFailure: null,
  openUntil: null
}
[DB] Acquiring client for query 68101adb-c2d0-4a71-bf23-1cdd48bdd0b0...
[PASS] Client acquired for query 68101adb-c2d0-4a71-bf23-1cdd48bdd0b0 in 1ms
[QUERY] Query 68101adb-c2d0-4a71-bf23-1cdd48bdd0b0:
      WITH batch_metrics AS (
        SELECT
          SUM(successful_count + ...
[PASS] Query 68101adb-c2d0-4a71-bf23-1cdd48bdd0b0 completed in 153ms, rows: 1
[TREND] Consecutive successes: 7/10
[WAIT] Circuit breaker reset pending: 7/10 consecutive successes
[RELEASE] Client released for query 68101adb-c2d0-4a71-bf23-1cdd48bdd0b0 (destroyed: false)
 GET /api/tag/ai-tagging/status/d0461adc-541c-4eaa-8e9e-ef6169baa32c 200 in 800ms
[GUARD] Setting up database cleanup handlers...
[PASS] Cleanup handlers registered successfully
[READY] Unified database connection updated with enterprise manager
[DB] [Query ca60ffd6-872c-44e8-8e43-addbdef48e69] Before query execution: {
  state: 'closed',
  failures: 0,
  consecutiveSuccesses: 7,
  threshold: 10,
  lastFailure: null,
  openUntil: null
}
[DB] Acquiring client for query ca60ffd6-872c-44e8-8e43-addbdef48e69...
[PASS] Client acquired for query ca60ffd6-872c-44e8-8e43-addbdef48e69 in 0ms
[QUERY] Query ca60ffd6-872c-44e8-8e43-addbdef48e69:
      SELECT
        job_id,
        job_type,
        status,
        total_p...
[DB] [Query 458dd3cc-9312-4983-96b4-386b5f50bbbc] Before query execution: {
  state: 'closed',
  failures: 0,
  consecutiveSuccesses: 7,
  threshold: 10,
  lastFailure: null,
  openUntil: null
}
[DB] Acquiring client for query 458dd3cc-9312-4983-96b4-386b5f50bbbc...
[PASS] Client acquired for query 458dd3cc-9312-4983-96b4-386b5f50bbbc in 1ms
[QUERY] Query 458dd3cc-9312-4983-96b4-386b5f50bbbc:
      SELECT
        job_id,
        job_type,
        status,
        total_p...
[PASS] Query ca60ffd6-872c-44e8-8e43-addbdef48e69 completed in 154ms, rows: 1
[TREND] Consecutive successes: 8/10
[WAIT] Circuit breaker reset pending: 8/10 consecutive successes
[RELEASE] Client released for query ca60ffd6-872c-44e8-8e43-addbdef48e69 (destroyed: false)
[DB] [Query 9134ae5c-2ee9-4e1d-b307-d213f24dde27] Before query execution: {
  state: 'closed',
  failures: 0,
  consecutiveSuccesses: 8,
  threshold: 10,
  lastFailure: null,
  openUntil: null
}
[DB] Acquiring client for query 9134ae5c-2ee9-4e1d-b307-d213f24dde27...
[PASS] Client acquired for query 9134ae5c-2ee9-4e1d-b307-d213f24dde27 in 2ms
[QUERY] Query 9134ae5c-2ee9-4e1d-b307-d213f24dde27:
      WITH batch_stats AS (
        SELECT
          COUNT(*) as completed_bat...
[PASS] Query 9134ae5c-2ee9-4e1d-b307-d213f24dde27 completed in 153ms, rows: 1
[TREND] Consecutive successes: 9/10
[WAIT] Circuit breaker reset pending: 9/10 consecutive successes
[RELEASE] Client released for query 9134ae5c-2ee9-4e1d-b307-d213f24dde27 (destroyed: false)
[DB] [Query 2146a324-c2da-4d65-9940-c36ee5d567e6] Before query execution: {
  state: 'closed',
  failures: 0,
  consecutiveSuccesses: 9,
  threshold: 10,
  lastFailure: null,
  openUntil: null
}
[DB] Acquiring client for query 2146a324-c2da-4d65-9940-c36ee5d567e6...
[PASS] Client acquired for query 2146a324-c2da-4d65-9940-c36ee5d567e6 in 1ms
[QUERY] Query 2146a324-c2da-4d65-9940-c36ee5d567e6:
      SELECT
        batch_number,
        error_message,
        products_in_...
[PASS] Query 458dd3cc-9312-4983-96b4-386b5f50bbbc completed in 306ms, rows: 20
[TREND] Consecutive successes: 10/10
[DB] [Circuit Breaker] Circuit breaker RESET: {
  state: 'closed',
  failures: 0,
  consecutiveSuccesses: 0,
  threshold: 10,
  lastFailure: null,
  openUntil: null
}
[RELEASE] Client released for query 458dd3cc-9312-4983-96b4-386b5f50bbbc (destroyed: false)
 GET /api/tag/ai-tagging/jobs?limit=20 200 in 615ms
[PASS] Query 2146a324-c2da-4d65-9940-c36ee5d567e6 completed in 153ms, rows: 0
[TREND] Consecutive successes: 1/10
[WAIT] Circuit breaker reset pending: 1/10 consecutive successes
[RELEASE] Client released for query 2146a324-c2da-4d65-9940-c36ee5d567e6 (destroyed: false)
[DB] [Query aa8c9271-4802-450e-8fba-c3781aa8bf3f] Before query execution: {
  state: 'closed',
  failures: 0,
  consecutiveSuccesses: 1,
  threshold: 10,
  lastFailure: null,
  openUntil: null
}
[DB] Acquiring client for query aa8c9271-4802-450e-8fba-c3781aa8bf3f...
[PASS] Client acquired for query aa8c9271-4802-450e-8fba-c3781aa8bf3f in 2ms
[QUERY] Query aa8c9271-4802-450e-8fba-c3781aa8bf3f:
      WITH batch_metrics AS (
        SELECT
          SUM(successful_count + ...
[PASS] Query aa8c9271-4802-450e-8fba-c3781aa8bf3f completed in 153ms, rows: 1
[TREND] Consecutive successes: 2/10
[WAIT] Circuit breaker reset pending: 2/10 consecutive successes
[RELEASE] Client released for query aa8c9271-4802-450e-8fba-c3781aa8bf3f (destroyed: false)
 GET /api/tag/ai-tagging/status/d0461adc-541c-4eaa-8e9e-ef6169baa32c 200 in 920ms
[DB] [Query b562672d-6985-4723-914f-e10e21388372] Before query execution: {
  state: 'closed',
  failures: 0,
  consecutiveSuccesses: 2,
  threshold: 10,
  lastFailure: null,
  openUntil: null
}
[DB] Acquiring client for query b562672d-6985-4723-914f-e10e21388372...
[PASS] Client acquired for query b562672d-6985-4723-914f-e10e21388372 in 1ms
[QUERY] Query b562672d-6985-4723-914f-e10e21388372:
      SELECT
        job_id,
        job_type,
        status,
        total_p...
[engine] suggestTagsBatch success (OpenRouter direct fetch) provider=openrouter model=openai/gpt-5.1 suggestions=3
[PASS] Query b562672d-6985-4723-914f-e10e21388372 completed in 153ms, rows: 1
[TREND] Consecutive successes: 3/10
[WAIT] Circuit breaker reset pending: 3/10 consecutive successes
[RELEASE] Client released for query b562672d-6985-4723-914f-e10e21388372 (destroyed: false)
[DB] [Query c2249e11-de9d-4f5f-a4e3-c5b1ed4203d9] Before query execution: {
  state: 'closed',
  failures: 0,
  consecutiveSuccesses: 3,
  threshold: 10,
  lastFailure: null,
  openUntil: null
}
[DB] Acquiring client for query c2249e11-de9d-4f5f-a4e3-c5b1ed4203d9...
[PASS] Client acquired for query c2249e11-de9d-4f5f-a4e3-c5b1ed4203d9 in 2ms
[QUERY] Query c2249e11-de9d-4f5f-a4e3-c5b1ed4203d9:
      WITH batch_stats AS (
        SELECT
          COUNT(*) as completed_bat...
[PASS] Query c2249e11-de9d-4f5f-a4e3-c5b1ed4203d9 completed in 154ms, rows: 1
[TREND] Consecutive successes: 4/10
[WAIT] Circuit breaker reset pending: 4/10 consecutive successes
[RELEASE] Client released for query c2249e11-de9d-4f5f-a4e3-c5b1ed4203d9 (destroyed: false)
[DB] [Query 97cc8653-b065-4a74-ace7-d091f2da6bed] Before query execution: {
  state: 'closed',
  failures: 0,
  consecutiveSuccesses: 4,
  threshold: 10,
  lastFailure: null,
  openUntil: null
}
[DB] Acquiring client for query 97cc8653-b065-4a74-ace7-d091f2da6bed...
[PASS] Client acquired for query 97cc8653-b065-4a74-ace7-d091f2da6bed in 1ms
[QUERY] Query 97cc8653-b065-4a74-ace7-d091f2da6bed:
      SELECT
        batch_number,
        error_message,
        products_in_...
[PASS] Query 97cc8653-b065-4a74-ace7-d091f2da6bed completed in 153ms, rows: 0
[TREND] Consecutive successes: 5/10
[WAIT] Circuit breaker reset pending: 5/10 consecutive successes
[RELEASE] Client released for query 97cc8653-b065-4a74-ace7-d091f2da6bed (destroyed: false)
[DB] [Query 8738197f-59c5-4b3b-a484-738445b9b50e] Before query execution: {
  state: 'closed',
  failures: 0,
  consecutiveSuccesses: 5,
  threshold: 10,
  lastFailure: null,
  openUntil: null
}
[DB] Acquiring client for query 8738197f-59c5-4b3b-a484-738445b9b50e...
[PASS] Client acquired for query 8738197f-59c5-4b3b-a484-738445b9b50e in 2ms
[QUERY] Query 8738197f-59c5-4b3b-a484-738445b9b50e:
      WITH batch_metrics AS (
        SELECT
          SUM(successful_count + ...
[PASS] Query 8738197f-59c5-4b3b-a484-738445b9b50e completed in 153ms, rows: 1
[TREND] Consecutive successes: 6/10
[WAIT] Circuit breaker reset pending: 6/10 consecutive successes
[RELEASE] Client released for query 8738197f-59c5-4b3b-a484-738445b9b50e (destroyed: false)
 GET /api/tag/ai-tagging/status/d0461adc-541c-4eaa-8e9e-ef6169baa32c 200 in 821ms
[DB] [Query 51f541d2-6df2-4083-97ab-4000e6dd3548] Before query execution: {
  state: 'closed',
  failures: 0,
  consecutiveSuccesses: 6,
  threshold: 10,
  lastFailure: null,
  openUntil: null
}
[DB] Acquiring client for query 51f541d2-6df2-4083-97ab-4000e6dd3548...
[PASS] Client acquired for query 51f541d2-6df2-4083-97ab-4000e6dd3548 in 1ms
[QUERY] Query 51f541d2-6df2-4083-97ab-4000e6dd3548:
      SELECT
        job_id,
        job_type,
        status,
        total_p...
[GUARD] Setting up database cleanup handlers...
[PASS] Cleanup handlers registered successfully
[READY] Unified database connection updated with enterprise manager
[PASS] Query 51f541d2-6df2-4083-97ab-4000e6dd3548 completed in 153ms, rows: 1
[TREND] Consecutive successes: 7/10
[WAIT] Circuit breaker reset pending: 7/10 consecutive successes
[RELEASE] Client released for query 51f541d2-6df2-4083-97ab-4000e6dd3548 (destroyed: false)
[DB] [Query 79dc7580-e2eb-406a-a184-d6bf200f1cf0] Before query execution: {
  state: 'closed',
  failures: 0,
  consecutiveSuccesses: 7,
  threshold: 10,
  lastFailure: null,
  openUntil: null
}
[DB] Acquiring client for query 79dc7580-e2eb-406a-a184-d6bf200f1cf0...
[PASS] Client acquired for query 79dc7580-e2eb-406a-a184-d6bf200f1cf0 in 1ms
[QUERY] Query 79dc7580-e2eb-406a-a184-d6bf200f1cf0:
      WITH batch_stats AS (
        SELECT
          COUNT(*) as completed_bat...
[PASS] Query 79dc7580-e2eb-406a-a184-d6bf200f1cf0 completed in 154ms, rows: 1
[TREND] Consecutive successes: 8/10
[WAIT] Circuit breaker reset pending: 8/10 consecutive successes
[RELEASE] Client released for query 79dc7580-e2eb-406a-a184-d6bf200f1cf0 (destroyed: false)
[DB] [Query a3f543d8-189c-41d5-87d5-0d858649edf4] Before query execution: {
  state: 'closed',
  failures: 0,
  consecutiveSuccesses: 8,
  threshold: 10,
  lastFailure: null,
  openUntil: null
}
[DB] Acquiring client for query a3f543d8-189c-41d5-87d5-0d858649edf4...
[PASS] Client acquired for query a3f543d8-189c-41d5-87d5-0d858649edf4 in 1ms
[QUERY] Query a3f543d8-189c-41d5-87d5-0d858649edf4:
      SELECT
        batch_number,
        error_message,
        products_in_...
[PASS] Query a3f543d8-189c-41d5-87d5-0d858649edf4 completed in 152ms, rows: 0
[TREND] Consecutive successes: 9/10
[WAIT] Circuit breaker reset pending: 9/10 consecutive successes
[RELEASE] Client released for query a3f543d8-189c-41d5-87d5-0d858649edf4 (destroyed: false)
[DB] [Query b44e2861-78c8-44c7-957f-5ae271467baf] Before query execution: {
  state: 'closed',
  failures: 0,
  consecutiveSuccesses: 9,
  threshold: 10,
  lastFailure: null,
  openUntil: null
}
[DB] Acquiring client for query b44e2861-78c8-44c7-957f-5ae271467baf...
[PASS] Client acquired for query b44e2861-78c8-44c7-957f-5ae271467baf in 0ms
[QUERY] Query b44e2861-78c8-44c7-957f-5ae271467baf:
      WITH batch_metrics AS (
        SELECT
          SUM(successful_count + ...
[PASS] Query b44e2861-78c8-44c7-957f-5ae271467baf completed in 153ms, rows: 1
[TREND] Consecutive successes: 10/10
[DB] [Circuit Breaker] Circuit breaker RESET: {
  state: 'closed',
  failures: 0,
  consecutiveSuccesses: 0,
  threshold: 10,
  lastFailure: null,
  openUntil: null
}
[RELEASE] Client released for query b44e2861-78c8-44c7-957f-5ae271467baf (destroyed: false)
 GET /api/tag/ai-tagging/status/d0461adc-541c-4eaa-8e9e-ef6169baa32c 200 in 806ms
[DB] [Query 0da2ad0e-446b-4424-8be6-c1173fbf5961] Before query execution: {
  state: 'closed',
  failures: 0,
  consecutiveSuccesses: 0,
  threshold: 10,
  lastFailure: null,
  openUntil: null
}
[DB] Acquiring client for query 0da2ad0e-446b-4424-8be6-c1173fbf5961...
[PASS] Client acquired for query 0da2ad0e-446b-4424-8be6-c1173fbf5961 in 0ms
[QUERY] Query 0da2ad0e-446b-4424-8be6-c1173fbf5961:
      SELECT
        job_id,
        job_type,
        status,
        total_p...
[PASS] Query 0da2ad0e-446b-4424-8be6-c1173fbf5961 completed in 153ms, rows: 1
[TREND] Consecutive successes: 1/10
[WAIT] Circuit breaker reset pending: 1/10 consecutive successes
[RELEASE] Client released for query 0da2ad0e-446b-4424-8be6-c1173fbf5961 (destroyed: false)
[DB] [Query a0ff62d0-8074-413b-8945-55582d540101] Before query execution: {
  state: 'closed',
  failures: 0,
  consecutiveSuccesses: 1,
  threshold: 10,
  lastFailure: null,
  openUntil: null
}
[DB] Acquiring client for query a0ff62d0-8074-413b-8945-55582d540101...
[PASS] Client acquired for query a0ff62d0-8074-413b-8945-55582d540101 in 1ms
[QUERY] Query a0ff62d0-8074-413b-8945-55582d540101:
      WITH batch_stats AS (
        SELECT
          COUNT(*) as completed_bat...
[PASS] Query a0ff62d0-8074-413b-8945-55582d540101 completed in 181ms, rows: 1
[TREND] Consecutive successes: 2/10
[WAIT] Circuit breaker reset pending: 2/10 consecutive successes
[RELEASE] Client released for query a0ff62d0-8074-413b-8945-55582d540101 (destroyed: false)
[DB] [Query dfa1069f-861e-4ce9-88a2-a636e19acf0c] Before query execution: {
  state: 'closed',
  failures: 0,
  consecutiveSuccesses: 2,
  threshold: 10,
  lastFailure: null,
  openUntil: null
}
[DB] Acquiring client for query dfa1069f-861e-4ce9-88a2-a636e19acf0c...
[PASS] Client acquired for query dfa1069f-861e-4ce9-88a2-a636e19acf0c in 1ms
[QUERY] Query dfa1069f-861e-4ce9-88a2-a636e19acf0c:
      SELECT
        batch_number,
        error_message,
        products_in_...
[PASS] Query dfa1069f-861e-4ce9-88a2-a636e19acf0c completed in 165ms, rows: 0
[TREND] Consecutive successes: 3/10
[WAIT] Circuit breaker reset pending: 3/10 consecutive successes
[RELEASE] Client released for query dfa1069f-861e-4ce9-88a2-a636e19acf0c (destroyed: false)
[DB] [Query bfa6ccfd-b8d5-4ef1-afea-92914d4043cb] Before query execution: {
  state: 'closed',
  failures: 0,
  consecutiveSuccesses: 3,
  threshold: 10,
  lastFailure: null,
  openUntil: null
}
[DB] Acquiring client for query bfa6ccfd-b8d5-4ef1-afea-92914d4043cb...
[PASS] Client acquired for query bfa6ccfd-b8d5-4ef1-afea-92914d4043cb in 2ms
[QUERY] Query bfa6ccfd-b8d5-4ef1-afea-92914d4043cb:
      WITH batch_metrics AS (
        SELECT
          SUM(successful_count + ...
[DB] [Query f061054e-5028-4a01-b4d0-179a138e2a58] Before query execution: {
  state: 'closed',
  failures: 0,
  consecutiveSuccesses: 3,
  threshold: 10,
  lastFailure: null,
  openUntil: null
}
[DB] Acquiring client for query f061054e-5028-4a01-b4d0-179a138e2a58...
[PASS] Client acquired for query f061054e-5028-4a01-b4d0-179a138e2a58 in 1ms
[QUERY] Query f061054e-5028-4a01-b4d0-179a138e2a58:
      SELECT
        job_id,
        job_type,
        status,
        total_p...
[PASS] Query bfa6ccfd-b8d5-4ef1-afea-92914d4043cb completed in 153ms, rows: 1
[TREND] Consecutive successes: 4/10
[WAIT] Circuit breaker reset pending: 4/10 consecutive successes
[RELEASE] Client released for query bfa6ccfd-b8d5-4ef1-afea-92914d4043cb (destroyed: false)
 GET /api/tag/ai-tagging/status/d0461adc-541c-4eaa-8e9e-ef6169baa32c 200 in 816ms
[PASS] Query f061054e-5028-4a01-b4d0-179a138e2a58 completed in 305ms, rows: 20
[TREND] Consecutive successes: 5/10
[WAIT] Circuit breaker reset pending: 5/10 consecutive successes
[RELEASE] Client released for query f061054e-5028-4a01-b4d0-179a138e2a58 (destroyed: false)
 GET /api/tag/ai-tagging/jobs?limit=20 200 in 570ms
[DB] [Query 1435522c-9b90-482c-a667-21aabd4b73dc] Before query execution: {
  state: 'closed',
  failures: 0,
  consecutiveSuccesses: 5,
  threshold: 10,
  lastFailure: null,
  openUntil: null
}
[DB] Acquiring client for query 1435522c-9b90-482c-a667-21aabd4b73dc...
[PASS] Client acquired for query 1435522c-9b90-482c-a667-21aabd4b73dc in 1ms
[QUERY] Query 1435522c-9b90-482c-a667-21aabd4b73dc:
      SELECT
        job_id,
        job_type,
        status,
        total_p...
[PASS] Query 1435522c-9b90-482c-a667-21aabd4b73dc completed in 154ms, rows: 1
[TREND] Consecutive successes: 6/10
[WAIT] Circuit breaker reset pending: 6/10 consecutive successes
[RELEASE] Client released for query 1435522c-9b90-482c-a667-21aabd4b73dc (destroyed: false)
[DB] [Query 925c0a89-a520-4144-aa7c-c19bbd89399f] Before query execution: {
  state: 'closed',
  failures: 0,
  consecutiveSuccesses: 6,
  threshold: 10,
  lastFailure: null,
  openUntil: null
}
[DB] Acquiring client for query 925c0a89-a520-4144-aa7c-c19bbd89399f...
[PASS] Client acquired for query 925c0a89-a520-4144-aa7c-c19bbd89399f in 1ms
[QUERY] Query 925c0a89-a520-4144-aa7c-c19bbd89399f:
      WITH batch_stats AS (
        SELECT
          COUNT(*) as completed_bat...
[PASS] Query 925c0a89-a520-4144-aa7c-c19bbd89399f completed in 154ms, rows: 1
[TREND] Consecutive successes: 7/10
[WAIT] Circuit breaker reset pending: 7/10 consecutive successes
[RELEASE] Client released for query 925c0a89-a520-4144-aa7c-c19bbd89399f (destroyed: false)
[DB] [Query 2f682c51-20f3-4a4f-9a2b-3fc38b912201] Before query execution: {
  state: 'closed',
  failures: 0,
  consecutiveSuccesses: 7,
  threshold: 10,
  lastFailure: null,
  openUntil: null
}
[DB] Acquiring client for query 2f682c51-20f3-4a4f-9a2b-3fc38b912201...
[PASS] Client acquired for query 2f682c51-20f3-4a4f-9a2b-3fc38b912201 in 1ms
[QUERY] Query 2f682c51-20f3-4a4f-9a2b-3fc38b912201:
      SELECT
        batch_number,
        error_message,
        products_in_...
[engine] suggestTagsBatch success (OpenRouter direct fetch) provider=openrouter model=openai/gpt-5.1 suggestions=2
[GUARD] Setting up database cleanup handlers...
[PASS] Cleanup handlers registered successfully
[READY] Unified database connection updated with enterprise manager
[PASS] Query 2f682c51-20f3-4a4f-9a2b-3fc38b912201 completed in 153ms, rows: 0
[TREND] Consecutive successes: 8/10
[WAIT] Circuit breaker reset pending: 8/10 consecutive successes
[RELEASE] Client released for query 2f682c51-20f3-4a4f-9a2b-3fc38b912201 (destroyed: false)
[DB] [Query efbd73ed-e48a-44b7-a0b3-4ef963037566] Before query execution: {
  state: 'closed',
  failures: 0,
  consecutiveSuccesses: 8,
  threshold: 10,
  lastFailure: null,
  openUntil: null
}
[DB] Acquiring client for query efbd73ed-e48a-44b7-a0b3-4ef963037566...
[PASS] Client acquired for query efbd73ed-e48a-44b7-a0b3-4ef963037566 in 1ms
[QUERY] Query efbd73ed-e48a-44b7-a0b3-4ef963037566:
      WITH batch_metrics AS (
        SELECT
          SUM(successful_count + ...
[PASS] Query efbd73ed-e48a-44b7-a0b3-4ef963037566 completed in 154ms, rows: 1
[TREND] Consecutive successes: 9/10
[WAIT] Circuit breaker reset pending: 9/10 consecutive successes
[RELEASE] Client released for query efbd73ed-e48a-44b7-a0b3-4ef963037566 (destroyed: false)
 GET /api/tag/ai-tagging/status/d0461adc-541c-4eaa-8e9e-ef6169baa32c 200 in 850ms
[DB] [Query 350cc62b-a320-47a5-8559-b75f6da5ca1c] Before query execution: {
  state: 'closed',
  failures: 0,
  consecutiveSuccesses: 9,
  threshold: 10,
  lastFailure: null,
  openUntil: null
}
[DB] Acquiring client for query 350cc62b-a320-47a5-8559-b75f6da5ca1c...
[PASS] Client acquired for query 350cc62b-a320-47a5-8559-b75f6da5ca1c in 1ms
[QUERY] Query 350cc62b-a320-47a5-8559-b75f6da5ca1c:
      SELECT
        job_id,
        job_type,
        status,
        total_p...
[PASS] Query 350cc62b-a320-47a5-8559-b75f6da5ca1c completed in 153ms, rows: 1
[TREND] Consecutive successes: 10/10
[DB] [Circuit Breaker] Circuit breaker RESET: {
  state: 'closed',
  failures: 0,
  consecutiveSuccesses: 0,
  threshold: 10,
  lastFailure: null,
  openUntil: null
}
[RELEASE] Client released for query 350cc62b-a320-47a5-8559-b75f6da5ca1c (destroyed: false)
[DB] [Query 7d8f5ef4-bd19-4ffb-8da6-6deb5408be6c] Before query execution: {
  state: 'closed',
  failures: 0,
  consecutiveSuccesses: 0,
  threshold: 10,
  lastFailure: null,
  openUntil: null
}
[DB] Acquiring client for query 7d8f5ef4-bd19-4ffb-8da6-6deb5408be6c...
[PASS] Client acquired for query 7d8f5ef4-bd19-4ffb-8da6-6deb5408be6c in 1ms
[QUERY] Query 7d8f5ef4-bd19-4ffb-8da6-6deb5408be6c:
      WITH batch_stats AS (
        SELECT
          COUNT(*) as completed_bat...
[PASS] Query 7d8f5ef4-bd19-4ffb-8da6-6deb5408be6c completed in 182ms, rows: 1
[TREND] Consecutive successes: 1/10
[WAIT] Circuit breaker reset pending: 1/10 consecutive successes
[RELEASE] Client released for query 7d8f5ef4-bd19-4ffb-8da6-6deb5408be6c (destroyed: false)
[DB] [Query 713f4bdd-16b1-44c2-991f-8b4d22bddfe4] Before query execution: {
  state: 'closed',
  failures: 0,
  consecutiveSuccesses: 1,
  threshold: 10,
  lastFailure: null,
  openUntil: null
}
[DB] Acquiring client for query 713f4bdd-16b1-44c2-991f-8b4d22bddfe4...
[PASS] Client acquired for query 713f4bdd-16b1-44c2-991f-8b4d22bddfe4 in 1ms
[QUERY] Query 713f4bdd-16b1-44c2-991f-8b4d22bddfe4:
      SELECT
        batch_number,
        error_message,
        products_in_...
[DB] [Query d9805d3b-c67e-413d-a941-749c58d55a98] Before query execution: {
  state: 'closed',
  failures: 0,
  consecutiveSuccesses: 1,
  threshold: 10,
  lastFailure: null,
  openUntil: null
}
[DB] Acquiring client for query d9805d3b-c67e-413d-a941-749c58d55a98...
[PASS] Client acquired for query d9805d3b-c67e-413d-a941-749c58d55a98 in 1ms
[QUERY] Query d9805d3b-c67e-413d-a941-749c58d55a98:
      SELECT
        job_id,
        job_type,
        status,
        total_p...
[PASS] Query 713f4bdd-16b1-44c2-991f-8b4d22bddfe4 completed in 153ms, rows: 0
[TREND] Consecutive successes: 2/10
[WAIT] Circuit breaker reset pending: 2/10 consecutive successes
[RELEASE] Client released for query 713f4bdd-16b1-44c2-991f-8b4d22bddfe4 (destroyed: false)
[DB] [Query 14f54202-a7b1-41f7-84d1-1e8be31c7b42] Before query execution: {
  state: 'closed',
  failures: 0,
  consecutiveSuccesses: 2,
  threshold: 10,
  lastFailure: null,
  openUntil: null
}
[DB] Acquiring client for query 14f54202-a7b1-41f7-84d1-1e8be31c7b42...
[PASS] Client acquired for query 14f54202-a7b1-41f7-84d1-1e8be31c7b42 in 1ms
[QUERY] Query 14f54202-a7b1-41f7-84d1-1e8be31c7b42:
      WITH batch_metrics AS (
        SELECT
          SUM(successful_count + ...
[PASS] Query 14f54202-a7b1-41f7-84d1-1e8be31c7b42 completed in 154ms, rows: 1
[TREND] Consecutive successes: 3/10
[WAIT] Circuit breaker reset pending: 3/10 consecutive successes
[RELEASE] Client released for query 14f54202-a7b1-41f7-84d1-1e8be31c7b42 (destroyed: false)
 GET /api/tag/ai-tagging/status/d0461adc-541c-4eaa-8e9e-ef6169baa32c 200 in 802ms
[engine] suggestTagsBatch success (OpenRouter direct fetch) provider=openrouter model=openai/gpt-5.1 suggestions=3
[PASS] Query d9805d3b-c67e-413d-a941-749c58d55a98 completed in 305ms, rows: 20
[TREND] Consecutive successes: 4/10
[WAIT] Circuit breaker reset pending: 4/10 consecutive successes
[RELEASE] Client released for query d9805d3b-c67e-413d-a941-749c58d55a98 (destroyed: false)
 GET /api/tag/ai-tagging/jobs?limit=20 200 in 486ms
[DB] [Query 8f4eefce-9758-44a8-98f7-1d52d71ac3ad] Before query execution: {
  state: 'closed',
  failures: 0,
  consecutiveSuccesses: 4,
  threshold: 10,
  lastFailure: null,
  openUntil: null
}
[DB] Acquiring client for query 8f4eefce-9758-44a8-98f7-1d52d71ac3ad...
[PASS] Client acquired for query 8f4eefce-9758-44a8-98f7-1d52d71ac3ad in 1ms
[QUERY] Query 8f4eefce-9758-44a8-98f7-1d52d71ac3ad:
      SELECT
        job_id,
        job_type,
        status,
        total_p...
[PASS] Query 8f4eefce-9758-44a8-98f7-1d52d71ac3ad completed in 153ms, rows: 1
[TREND] Consecutive successes: 5/10
[WAIT] Circuit breaker reset pending: 5/10 consecutive successes
[RELEASE] Client released for query 8f4eefce-9758-44a8-98f7-1d52d71ac3ad (destroyed: false)
[DB] [Query d394e41f-4fa0-47d4-93dd-d5e0cf4fd81a] Before query execution: {
  state: 'closed',
  failures: 0,
  consecutiveSuccesses: 5,
  threshold: 10,
  lastFailure: null,
  openUntil: null
}
[DB] Acquiring client for query d394e41f-4fa0-47d4-93dd-d5e0cf4fd81a...
[PASS] Client acquired for query d394e41f-4fa0-47d4-93dd-d5e0cf4fd81a in 3ms
[QUERY] Query d394e41f-4fa0-47d4-93dd-d5e0cf4fd81a:
      WITH batch_stats AS (
        SELECT
          COUNT(*) as completed_bat...
[PASS] Query d394e41f-4fa0-47d4-93dd-d5e0cf4fd81a completed in 153ms, rows: 1
[TREND] Consecutive successes: 6/10
[WAIT] Circuit breaker reset pending: 6/10 consecutive successes
[RELEASE] Client released for query d394e41f-4fa0-47d4-93dd-d5e0cf4fd81a (destroyed: false)
[DB] [Query 8744fd62-07e9-40ec-a0bd-13ef10788961] Before query execution: {
  state: 'closed',
  failures: 0,
  consecutiveSuccesses: 6,
  threshold: 10,
  lastFailure: null,
  openUntil: null
}
[DB] Acquiring client for query 8744fd62-07e9-40ec-a0bd-13ef10788961...
[PASS] Client acquired for query 8744fd62-07e9-40ec-a0bd-13ef10788961 in 1ms
[QUERY] Query 8744fd62-07e9-40ec-a0bd-13ef10788961:
      SELECT
        batch_number,
        error_message,
        products_in_...
[PASS] Query 8744fd62-07e9-40ec-a0bd-13ef10788961 completed in 153ms, rows: 0
[TREND] Consecutive successes: 7/10
[WAIT] Circuit breaker reset pending: 7/10 consecutive successes
[RELEASE] Client released for query 8744fd62-07e9-40ec-a0bd-13ef10788961 (destroyed: false)
[DB] [Query 75ea1f14-1223-4e11-b6f9-153a1d883e85] Before query execution: {
  state: 'closed',
  failures: 0,
  consecutiveSuccesses: 7,
  threshold: 10,
  lastFailure: null,
  openUntil: null
}
[DB] Acquiring client for query 75ea1f14-1223-4e11-b6f9-153a1d883e85...
[PASS] Client acquired for query 75ea1f14-1223-4e11-b6f9-153a1d883e85 in 1ms
[QUERY] Query 75ea1f14-1223-4e11-b6f9-153a1d883e85:
      WITH batch_metrics AS (
        SELECT
          SUM(successful_count + ...
[PASS] Query 75ea1f14-1223-4e11-b6f9-153a1d883e85 completed in 153ms, rows: 1
[TREND] Consecutive successes: 8/10
[WAIT] Circuit breaker reset pending: 8/10 consecutive successes
[RELEASE] Client released for query 75ea1f14-1223-4e11-b6f9-153a1d883e85 (destroyed: false)
 GET /api/tag/ai-tagging/status/d0461adc-541c-4eaa-8e9e-ef6169baa32c 200 in 818ms
[GUARD] Setting up database cleanup handlers...
[PASS] Cleanup handlers registered successfully
[READY] Unified database connection updated with enterprise manager
[DB] [Query 87ff54f1-4023-4b18-ae37-5121083520a7] Before query execution: {
  state: 'closed',
  failures: 0,
  consecutiveSuccesses: 8,
  threshold: 10,
  lastFailure: null,
  openUntil: null
}
[DB] Acquiring client for query 87ff54f1-4023-4b18-ae37-5121083520a7...
[PASS] Client acquired for query 87ff54f1-4023-4b18-ae37-5121083520a7 in 1ms
[QUERY] Query 87ff54f1-4023-4b18-ae37-5121083520a7:
      SELECT
        job_id,
        job_type,
        status,
        total_p...
[PASS] Query 87ff54f1-4023-4b18-ae37-5121083520a7 completed in 153ms, rows: 1
[TREND] Consecutive successes: 9/10
[WAIT] Circuit breaker reset pending: 9/10 consecutive successes
[RELEASE] Client released for query 87ff54f1-4023-4b18-ae37-5121083520a7 (destroyed: false)
[DB] [Query b6498638-c066-431f-ae46-05e19fba45ee] Before query execution: {
  state: 'closed',
  failures: 0,
  consecutiveSuccesses: 9,
  threshold: 10,
  lastFailure: null,
  openUntil: null
}
[DB] Acquiring client for query b6498638-c066-431f-ae46-05e19fba45ee...
[PASS] Client acquired for query b6498638-c066-431f-ae46-05e19fba45ee in 1ms
[QUERY] Query b6498638-c066-431f-ae46-05e19fba45ee:
      WITH batch_stats AS (
        SELECT
          COUNT(*) as completed_bat...
[PASS] Query b6498638-c066-431f-ae46-05e19fba45ee completed in 153ms, rows: 1
[TREND] Consecutive successes: 10/10
[DB] [Circuit Breaker] Circuit breaker RESET: {
  state: 'closed',
  failures: 0,
  consecutiveSuccesses: 0,
  threshold: 10,
  lastFailure: null,
  openUntil: null
}
[RELEASE] Client released for query b6498638-c066-431f-ae46-05e19fba45ee (destroyed: false)
[DB] [Query bbbaf0fb-b89d-4e9e-a91f-594adfffb13b] Before query execution: {
  state: 'closed',
  failures: 0,
  consecutiveSuccesses: 0,
  threshold: 10,
  lastFailure: null,
  openUntil: null
}
[DB] Acquiring client for query bbbaf0fb-b89d-4e9e-a91f-594adfffb13b...
[PASS] Client acquired for query bbbaf0fb-b89d-4e9e-a91f-594adfffb13b in 0ms
[QUERY] Query bbbaf0fb-b89d-4e9e-a91f-594adfffb13b:
      SELECT
        batch_number,
        error_message,
        products_in_...
[PASS] Query bbbaf0fb-b89d-4e9e-a91f-594adfffb13b completed in 152ms, rows: 0
[TREND] Consecutive successes: 1/10
[WAIT] Circuit breaker reset pending: 1/10 consecutive successes
[RELEASE] Client released for query bbbaf0fb-b89d-4e9e-a91f-594adfffb13b (destroyed: false)
[DB] [Query 2664cd92-f8a1-43f8-8a44-79103577d7ae] Before query execution: {
  state: 'closed',
  failures: 0,
  consecutiveSuccesses: 1,
  threshold: 10,
  lastFailure: null,
  openUntil: null
}
[DB] Acquiring client for query 2664cd92-f8a1-43f8-8a44-79103577d7ae...
[PASS] Client acquired for query 2664cd92-f8a1-43f8-8a44-79103577d7ae in 1ms
[QUERY] Query 2664cd92-f8a1-43f8-8a44-79103577d7ae:
      WITH batch_metrics AS (
        SELECT
          SUM(successful_count + ...
[PASS] Query 2664cd92-f8a1-43f8-8a44-79103577d7ae completed in 154ms, rows: 1
[TREND] Consecutive successes: 2/10
[WAIT] Circuit breaker reset pending: 2/10 consecutive successes
[RELEASE] Client released for query 2664cd92-f8a1-43f8-8a44-79103577d7ae (destroyed: false)
 GET /api/tag/ai-tagging/status/d0461adc-541c-4eaa-8e9e-ef6169baa32c 200 in 767ms
[DB] [Query 1b99d22c-49e6-45e9-a979-131f06c71c1c] Before query execution: {
  state: 'closed',
  failures: 0,
  consecutiveSuccesses: 2,
  threshold: 10,
  lastFailure: null,
  openUntil: null
}
[DB] Acquiring client for query 1b99d22c-49e6-45e9-a979-131f06c71c1c...
[PASS] Client acquired for query 1b99d22c-49e6-45e9-a979-131f06c71c1c in 1ms
[QUERY] Query 1b99d22c-49e6-45e9-a979-131f06c71c1c:
      SELECT
        job_id,
        job_type,
        status,
        total_p...
[PASS] Query 1b99d22c-49e6-45e9-a979-131f06c71c1c completed in 154ms, rows: 1
[TREND] Consecutive successes: 3/10
[WAIT] Circuit breaker reset pending: 3/10 consecutive successes
[RELEASE] Client released for query 1b99d22c-49e6-45e9-a979-131f06c71c1c (destroyed: false)
[DB] [Query fb64401b-1159-4d1b-9b50-25391b2c71d7] Before query execution: {
  state: 'closed',
  failures: 0,
  consecutiveSuccesses: 3,
  threshold: 10,
  lastFailure: null,
  openUntil: null
}
[DB] Acquiring client for query fb64401b-1159-4d1b-9b50-25391b2c71d7...
[PASS] Client acquired for query fb64401b-1159-4d1b-9b50-25391b2c71d7 in 1ms
[QUERY] Query fb64401b-1159-4d1b-9b50-25391b2c71d7:
      WITH batch_stats AS (
        SELECT
          COUNT(*) as completed_bat...
[GUARD] Setting up database cleanup handlers...
[PASS] Cleanup handlers registered successfully
[READY] Unified database connection updated with enterprise manager
[PASS] Query fb64401b-1159-4d1b-9b50-25391b2c71d7 completed in 154ms, rows: 1
[TREND] Consecutive successes: 4/10
[WAIT] Circuit breaker reset pending: 4/10 consecutive successes
[RELEASE] Client released for query fb64401b-1159-4d1b-9b50-25391b2c71d7 (destroyed: false)
[DB] [Query 92dc6708-5eab-4cf3-9180-5d588dd614a2] Before query execution: {
  state: 'closed',
  failures: 0,
  consecutiveSuccesses: 4,
  threshold: 10,
  lastFailure: null,
  openUntil: null
}
[DB] Acquiring client for query 92dc6708-5eab-4cf3-9180-5d588dd614a2...
[PASS] Client acquired for query 92dc6708-5eab-4cf3-9180-5d588dd614a2 in 0ms
[QUERY] Query 92dc6708-5eab-4cf3-9180-5d588dd614a2:
      SELECT
        batch_number,
        error_message,
        products_in_...
[PASS] Query 92dc6708-5eab-4cf3-9180-5d588dd614a2 completed in 153ms, rows: 0
[TREND] Consecutive successes: 5/10
[WAIT] Circuit breaker reset pending: 5/10 consecutive successes
[RELEASE] Client released for query 92dc6708-5eab-4cf3-9180-5d588dd614a2 (destroyed: false)
[DB] [Query b512a8f5-6340-4042-9244-92be2fd9882b] Before query execution: {
  state: 'closed',
  failures: 0,
  consecutiveSuccesses: 5,
  threshold: 10,
  lastFailure: null,
  openUntil: null
}
[DB] Acquiring client for query b512a8f5-6340-4042-9244-92be2fd9882b...
[PASS] Client acquired for query b512a8f5-6340-4042-9244-92be2fd9882b in 1ms
[QUERY] Query b512a8f5-6340-4042-9244-92be2fd9882b:
      WITH batch_metrics AS (
        SELECT
          SUM(successful_count + ...
[PASS] Query b512a8f5-6340-4042-9244-92be2fd9882b completed in 153ms, rows: 1
[TREND] Consecutive successes: 6/10
[WAIT] Circuit breaker reset pending: 6/10 consecutive successes
[RELEASE] Client released for query b512a8f5-6340-4042-9244-92be2fd9882b (destroyed: false)
 GET /api/tag/ai-tagging/status/d0461adc-541c-4eaa-8e9e-ef6169baa32c 200 in 766ms
[DB] [Query 58671b21-f4f6-49c6-9a19-ca13b873053c] Before query execution: {
  state: 'closed',
  failures: 0,
  consecutiveSuccesses: 6,
  threshold: 10,
  lastFailure: null,
  openUntil: null
}
[DB] Acquiring client for query 58671b21-f4f6-49c6-9a19-ca13b873053c...
[PASS] Client acquired for query 58671b21-f4f6-49c6-9a19-ca13b873053c in 1ms
[QUERY] Query 58671b21-f4f6-49c6-9a19-ca13b873053c:
      SELECT
        job_id,
        job_type,
        status,
        total_p...
[PASS] Query 58671b21-f4f6-49c6-9a19-ca13b873053c completed in 167ms, rows: 1
[TREND] Consecutive successes: 7/10
[WAIT] Circuit breaker reset pending: 7/10 consecutive successes
[RELEASE] Client released for query 58671b21-f4f6-49c6-9a19-ca13b873053c (destroyed: false)
[DB] [Query cb333642-17ea-43ea-afbd-578aa924a614] Before query execution: {
  state: 'closed',
  failures: 0,
  consecutiveSuccesses: 7,
  threshold: 10,
  lastFailure: null,
  openUntil: null
}
[DB] Acquiring client for query cb333642-17ea-43ea-afbd-578aa924a614...
[PASS] Client acquired for query cb333642-17ea-43ea-afbd-578aa924a614 in 1ms
[QUERY] Query cb333642-17ea-43ea-afbd-578aa924a614:
      WITH batch_stats AS (
        SELECT
          COUNT(*) as completed_bat...
[DB] [Query c404142e-a409-4a72-8278-fe6e5b3c82dc] Before query execution: {
  state: 'closed',
  failures: 0,
  consecutiveSuccesses: 7,
  threshold: 10,
  lastFailure: null,
  openUntil: null
}
[DB] Acquiring client for query c404142e-a409-4a72-8278-fe6e5b3c82dc...
[PASS] Client acquired for query c404142e-a409-4a72-8278-fe6e5b3c82dc in 0ms
[QUERY] Query c404142e-a409-4a72-8278-fe6e5b3c82dc:
      SELECT
        job_id,
        job_type,
        status,
        total_p...
[PASS] Query cb333642-17ea-43ea-afbd-578aa924a614 completed in 154ms, rows: 1
[TREND] Consecutive successes: 8/10
[WAIT] Circuit breaker reset pending: 8/10 consecutive successes
[RELEASE] Client released for query cb333642-17ea-43ea-afbd-578aa924a614 (destroyed: false)
[DB] [Query 082308e5-3d38-4ad5-993f-13e0232722e0] Before query execution: {
  state: 'closed',
  failures: 0,
  consecutiveSuccesses: 8,
  threshold: 10,
  lastFailure: null,
  openUntil: null
}
[DB] Acquiring client for query 082308e5-3d38-4ad5-993f-13e0232722e0...
[PASS] Client acquired for query 082308e5-3d38-4ad5-993f-13e0232722e0 in 2ms
[QUERY] Query 082308e5-3d38-4ad5-993f-13e0232722e0:
      SELECT
        batch_number,
        error_message,
        products_in_...
[PASS] Query 082308e5-3d38-4ad5-993f-13e0232722e0 completed in 436ms, rows: 0
[TREND] Consecutive successes: 9/10
[WAIT] Circuit breaker reset pending: 9/10 consecutive successes
[RELEASE] Client released for query 082308e5-3d38-4ad5-993f-13e0232722e0 (destroyed: false)
[DB] [Query 7c0420d3-d460-4e27-87a4-12f689560d8c] Before query execution: {
  state: 'closed',
  failures: 0,
  consecutiveSuccesses: 9,
  threshold: 10,
  lastFailure: null,
  openUntil: null
}
[DB] Acquiring client for query 7c0420d3-d460-4e27-87a4-12f689560d8c...
[PASS] Client acquired for query 7c0420d3-d460-4e27-87a4-12f689560d8c in 2ms
[QUERY] Query 7c0420d3-d460-4e27-87a4-12f689560d8c:
      WITH batch_metrics AS (
        SELECT
          SUM(successful_count + ...
[PASS] Query c404142e-a409-4a72-8278-fe6e5b3c82dc completed in 575ms, rows: 20
[TREND] Consecutive successes: 10/10
[DB] [Circuit Breaker] Circuit breaker RESET: {
  state: 'closed',
  failures: 0,
  consecutiveSuccesses: 0,
  threshold: 10,
  lastFailure: null,
  openUntil: null
}
[RELEASE] Client released for query c404142e-a409-4a72-8278-fe6e5b3c82dc (destroyed: false)
 GET /api/tag/ai-tagging/jobs?limit=20 200 in 885ms
[PASS] Query 7c0420d3-d460-4e27-87a4-12f689560d8c completed in 155ms, rows: 1
[TREND] Consecutive successes: 1/10
[WAIT] Circuit breaker reset pending: 1/10 consecutive successes
[RELEASE] Client released for query 7c0420d3-d460-4e27-87a4-12f689560d8c (destroyed: false)
 GET /api/tag/ai-tagging/status/d0461adc-541c-4eaa-8e9e-ef6169baa32c 200 in 1138ms
[DB] [Query 057916d4-4700-4827-8eb6-74a5dc4876b6] Before query execution: {
  state: 'closed',
  failures: 0,
  consecutiveSuccesses: 1,
  threshold: 10,
  lastFailure: null,
  openUntil: null
}
[DB] Acquiring client for query 057916d4-4700-4827-8eb6-74a5dc4876b6...
[PASS] Client acquired for query 057916d4-4700-4827-8eb6-74a5dc4876b6 in 2ms
[QUERY] Query 057916d4-4700-4827-8eb6-74a5dc4876b6:
      SELECT
        job_id,
        job_type,
        status,
        total_p...
[PASS] Query 057916d4-4700-4827-8eb6-74a5dc4876b6 completed in 154ms, rows: 1
[TREND] Consecutive successes: 2/10
[WAIT] Circuit breaker reset pending: 2/10 consecutive successes
[RELEASE] Client released for query 057916d4-4700-4827-8eb6-74a5dc4876b6 (destroyed: false)
[DB] [Query 9be80d7e-702b-40d9-a407-b4f310240959] Before query execution: {
  state: 'closed',
  failures: 0,
  consecutiveSuccesses: 2,
  threshold: 10,
  lastFailure: null,
  openUntil: null
}
[DB] Acquiring client for query 9be80d7e-702b-40d9-a407-b4f310240959...
[PASS] Client acquired for query 9be80d7e-702b-40d9-a407-b4f310240959 in 1ms
[QUERY] Query 9be80d7e-702b-40d9-a407-b4f310240959:
      WITH batch_stats AS (
        SELECT
          COUNT(*) as completed_bat...
[engine] suggestTagsBatch success (OpenRouter direct fetch) provider=openrouter model=openai/gpt-5.1 suggestions=2
[PASS] Query 9be80d7e-702b-40d9-a407-b4f310240959 completed in 153ms, rows: 1
[TREND] Consecutive successes: 3/10
[WAIT] Circuit breaker reset pending: 3/10 consecutive successes
[RELEASE] Client released for query 9be80d7e-702b-40d9-a407-b4f310240959 (destroyed: false)
[DB] [Query 9545a2f6-ce0f-4056-93eb-ebbb78f10a36] Before query execution: {
  state: 'closed',
  failures: 0,
  consecutiveSuccesses: 3,
  threshold: 10,
  lastFailure: null,
  openUntil: null
}
[DB] Acquiring client for query 9545a2f6-ce0f-4056-93eb-ebbb78f10a36...
[PASS] Client acquired for query 9545a2f6-ce0f-4056-93eb-ebbb78f10a36 in 0ms
[QUERY] Query 9545a2f6-ce0f-4056-93eb-ebbb78f10a36:
      SELECT
        batch_number,
        error_message,
        products_in_...
[engine] suggestTagsBatch success (OpenRouter direct fetch) provider=openrouter model=openai/gpt-5.1 suggestions=3
[PASS] Query 9545a2f6-ce0f-4056-93eb-ebbb78f10a36 completed in 153ms, rows: 0
[TREND] Consecutive successes: 4/10
[WAIT] Circuit breaker reset pending: 4/10 consecutive successes
[RELEASE] Client released for query 9545a2f6-ce0f-4056-93eb-ebbb78f10a36 (destroyed: false)
[DB] [Query b520e470-b988-4251-9c36-feb0976cfdf6] Before query execution: {
  state: 'closed',
  failures: 0,
  consecutiveSuccesses: 4,
  threshold: 10,
  lastFailure: null,
  openUntil: null
}
[DB] Acquiring client for query b520e470-b988-4251-9c36-feb0976cfdf6...
[PASS] Client acquired for query b520e470-b988-4251-9c36-feb0976cfdf6 in 1ms
[QUERY] Query b520e470-b988-4251-9c36-feb0976cfdf6:
      WITH batch_metrics AS (
        SELECT
          SUM(successful_count + ...
[engine] suggestTagsBatch success (OpenRouter direct fetch) provider=openrouter model=openai/gpt-5.1 suggestions=1
[batcher] Completed tag processing: suggestions count=17
[suggestTagsBatch] Processed 20 products -> 17 suggestions
[TaggingEngine] Received 17 AI tag suggestions
[DB] [Query 799147ae-72b5-4699-a272-2bc6971723a8] Before query execution: {
  state: 'closed',
  failures: 0,
  consecutiveSuccesses: 7,
  threshold: 10,
  lastFailure: null,
  openUntil: null
}
[DB] Acquiring client for query 799147ae-72b5-4699-a272-2bc6971723a8...
[PASS] Query b520e470-b988-4251-9c36-feb0976cfdf6 completed in 153ms, rows: 1
[TREND] Consecutive successes: 5/10
[WAIT] Circuit breaker reset pending: 5/10 consecutive successes
[RELEASE] Client released for query b520e470-b988-4251-9c36-feb0976cfdf6 (destroyed: false)
 GET /api/tag/ai-tagging/status/d0461adc-541c-4eaa-8e9e-ef6169baa32c 200 in 916ms
[GUARD] Setting up database cleanup handlers...
[PASS] Cleanup handlers registered successfully
[READY] Unified database connection updated with enterprise manager
[PASS] New client connected to enterprise pool
[PASS] Client acquired for query 799147ae-72b5-4699-a272-2bc6971723a8 in 961ms
[QUERY] Query 799147ae-72b5-4699-a272-2bc6971723a8:
      WITH upsert AS (
        INSERT INTO core.ai_tag_proposal (
          org...
[DB] [Query e7449507-2eb3-4bee-9ad4-f0d44bfe2df8] Before query execution: {
  state: 'closed',
  failures: 0,
  consecutiveSuccesses: 5,
  threshold: 10,
  lastFailure: null,
  openUntil: null
}
[DB] Acquiring client for query e7449507-2eb3-4bee-9ad4-f0d44bfe2df8...
[PASS] Client acquired for query e7449507-2eb3-4bee-9ad4-f0d44bfe2df8 in 1ms
[QUERY] Query e7449507-2eb3-4bee-9ad4-f0d44bfe2df8:
      SELECT
        job_id,
        job_type,
        status,
        total_p...
[PASS] Query e7449507-2eb3-4bee-9ad4-f0d44bfe2df8 completed in 153ms, rows: 1
[TREND] Consecutive successes: 6/10
[WAIT] Circuit breaker reset pending: 6/10 consecutive successes
[RELEASE] Client released for query e7449507-2eb3-4bee-9ad4-f0d44bfe2df8 (destroyed: false)
[DB] [Query 4547780d-d170-4416-a934-8d6d92a8a518] Before query execution: {
  state: 'closed',
  failures: 0,
  consecutiveSuccesses: 6,
  threshold: 10,
  lastFailure: null,
  openUntil: null
}
[DB] Acquiring client for query 4547780d-d170-4416-a934-8d6d92a8a518...
[PASS] Client acquired for query 4547780d-d170-4416-a934-8d6d92a8a518 in 0ms
[QUERY] Query 4547780d-d170-4416-a934-8d6d92a8a518:
      WITH batch_stats AS (
        SELECT
          COUNT(*) as completed_bat...
[FAIL] Query 799147ae-72b5-4699-a272-2bc6971723a8 attempt 1/4 failed after 323ms: column "tag_proposal_id" does not exist
[BLOCKED] Non-retryable error detected for query 799147ae-72b5-4699-a272-2bc6971723a8, aborting retries
[RELEASE] Client released for query 799147ae-72b5-4699-a272-2bc6971723a8 (destroyed: true)
[TaggingEngine] Failed to record tag proposal {
  jobId: 'd0461adc-541c-4eaa-8e9e-ef6169baa32c',
  productId: '0075c8d9-4686-4021-b3e0-8b8af71edf9b',
  productName: 'Adam Hall Cables K3 YWCC 0100 - Audio Cable 3.5mm Jack stereo to 2 x RCA male 1m',
  provider: 'unknown',
  model: 'unknown',
  proposedTag: 'Brand: Adam Hall',
  confidence: 0.99,
  dbError: 'Query failed after 4 attempts: column "tag_proposal_id" does not exist',
  timestamp: '2025-11-29T18:01:21.940Z'
}
[DB] [Query faecc47f-e0f1-4208-8e1c-51ede44c83a4] Before query execution: {
  state: 'closed',
  failures: 1,
  consecutiveSuccesses: 0,
  threshold: 10,
  lastFailure: '2025-11-29T18:01:21.939Z',
  openUntil: null
}
[DB] Acquiring client for query faecc47f-e0f1-4208-8e1c-51ede44c83a4...
[PASS] Query 4547780d-d170-4416-a934-8d6d92a8a518 completed in 157ms, rows: 1
[TREND] Consecutive successes: 7/10
[WAIT] Circuit breaker reset pending: 7/10 consecutive successes
[RELEASE] Client released for query 4547780d-d170-4416-a934-8d6d92a8a518 (destroyed: false)
[DB] [Query f759defb-bbd7-45be-b608-0d74dda95975] Before query execution: {
  state: 'closed',
  failures: 0,
  consecutiveSuccesses: 7,
  threshold: 10,
  lastFailure: null,
  openUntil: null
}
[DB] Acquiring client for query f759defb-bbd7-45be-b608-0d74dda95975...
[PASS] Client acquired for query f759defb-bbd7-45be-b608-0d74dda95975 in 1ms
[QUERY] Query f759defb-bbd7-45be-b608-0d74dda95975:
      SELECT
        batch_number,
        error_message,
        products_in_...
[PASS] Query f759defb-bbd7-45be-b608-0d74dda95975 completed in 231ms, rows: 0
[TREND] Consecutive successes: 8/10
[WAIT] Circuit breaker reset pending: 8/10 consecutive successes
[RELEASE] Client released for query f759defb-bbd7-45be-b608-0d74dda95975 (destroyed: false)
[DB] [Query a720a9dc-3112-4eef-bd10-7e24809aa990] Before query execution: {
  state: 'closed',
  failures: 0,
  consecutiveSuccesses: 8,
  threshold: 10,
  lastFailure: null,
  openUntil: null
}
[DB] Acquiring client for query a720a9dc-3112-4eef-bd10-7e24809aa990...
[PASS] Client acquired for query a720a9dc-3112-4eef-bd10-7e24809aa990 in 1ms
[QUERY] Query a720a9dc-3112-4eef-bd10-7e24809aa990:
      WITH batch_metrics AS (
        SELECT
          SUM(successful_count + ...
[PASS] Query a720a9dc-3112-4eef-bd10-7e24809aa990 completed in 154ms, rows: 1
[TREND] Consecutive successes: 9/10
[WAIT] Circuit breaker reset pending: 9/10 consecutive successes
[RELEASE] Client released for query a720a9dc-3112-4eef-bd10-7e24809aa990 (destroyed: false)
 GET /api/tag/ai-tagging/status/d0461adc-541c-4eaa-8e9e-ef6169baa32c 200 in 859ms
[PASS] New client connected to enterprise pool
[PASS] Client acquired for query faecc47f-e0f1-4208-8e1c-51ede44c83a4 in 940ms
[QUERY] Query faecc47f-e0f1-4208-8e1c-51ede44c83a4:
      UPDATE core.supplier_product
      SET
        ai_tagging_status = $2,
 ...
[DB] [Query 59e0330b-af1d-4190-8811-aa69e261a80c] Before query execution: {
  state: 'closed',
  failures: 0,
  consecutiveSuccesses: 9,
  threshold: 10,
  lastFailure: null,
  openUntil: null
}
[DB] Acquiring client for query 59e0330b-af1d-4190-8811-aa69e261a80c...
[PASS] Client acquired for query 59e0330b-af1d-4190-8811-aa69e261a80c in 1ms
[QUERY] Query 59e0330b-af1d-4190-8811-aa69e261a80c:
      SELECT
        job_id,
        job_type,
        status,
        total_p...
[PASS] Query 59e0330b-af1d-4190-8811-aa69e261a80c completed in 154ms, rows: 1
[TREND] Consecutive successes: 10/10
[DB] [Circuit Breaker] Circuit breaker RESET: {
  state: 'closed',
  failures: 0,
  consecutiveSuccesses: 0,
  threshold: 10,
  lastFailure: null,
  openUntil: null
}
[RELEASE] Client released for query 59e0330b-af1d-4190-8811-aa69e261a80c (destroyed: false)
[DB] [Query 391a9a34-c8fa-4690-87ff-f3a4629b12b4] Before query execution: {
  state: 'closed',
  failures: 0,
  consecutiveSuccesses: 0,
  threshold: 10,
  lastFailure: null,
  openUntil: null
}
[DB] Acquiring client for query 391a9a34-c8fa-4690-87ff-f3a4629b12b4...
[PASS] Client acquired for query 391a9a34-c8fa-4690-87ff-f3a4629b12b4 in 2ms
[QUERY] Query 391a9a34-c8fa-4690-87ff-f3a4629b12b4:
      WITH batch_stats AS (
        SELECT
          COUNT(*) as completed_bat...
[PASS] Query faecc47f-e0f1-4208-8e1c-51ede44c83a4 completed in 310ms, rows: 1
[TREND] Consecutive successes: 1/10
[WAIT] Circuit breaker reset pending: 1/10 consecutive successes
[RELEASE] Client released for query faecc47f-e0f1-4208-8e1c-51ede44c83a4 (destroyed: false)
[DB] [Query a4491f6b-d9e4-478e-a64d-0ae52c024295] Before query execution: {
  state: 'closed',
  failures: 1,
  consecutiveSuccesses: 1,
  threshold: 10,
  lastFailure: '2025-11-29T18:01:21.939Z',
  openUntil: null
}
[DB] Acquiring client for query a4491f6b-d9e4-478e-a64d-0ae52c024295...
[PASS] Client acquired for query a4491f6b-d9e4-478e-a64d-0ae52c024295 in 1ms
[QUERY] Query a4491f6b-d9e4-478e-a64d-0ae52c024295:
      WITH upsert AS (
        INSERT INTO core.ai_tag_proposal (
          org...
[PASS] Query 391a9a34-c8fa-4690-87ff-f3a4629b12b4 completed in 155ms, rows: 1
[TREND] Consecutive successes: 1/10
[WAIT] Circuit breaker reset pending: 1/10 consecutive successes
[RELEASE] Client released for query 391a9a34-c8fa-4690-87ff-f3a4629b12b4 (destroyed: false)
[DB] [Query 28faad4d-88fc-4b9e-9092-bea586aa3270] Before query execution: {
  state: 'closed',
  failures: 0,
  consecutiveSuccesses: 1,
  threshold: 10,
  lastFailure: null,
  openUntil: null
}
[DB] Acquiring client for query 28faad4d-88fc-4b9e-9092-bea586aa3270...
[PASS] Client acquired for query 28faad4d-88fc-4b9e-9092-bea586aa3270 in 1ms
[QUERY] Query 28faad4d-88fc-4b9e-9092-bea586aa3270:
      SELECT
        batch_number,
        error_message,
        products_in_...
[FAIL] Query a4491f6b-d9e4-478e-a64d-0ae52c024295 attempt 1/4 failed after 153ms: column "tag_proposal_id" does not exist
[BLOCKED] Non-retryable error detected for query a4491f6b-d9e4-478e-a64d-0ae52c024295, aborting retries
[RELEASE] Client released for query a4491f6b-d9e4-478e-a64d-0ae52c024295 (destroyed: true)
[TaggingEngine] Failed to record tag proposal {
  jobId: 'd0461adc-541c-4eaa-8e9e-ef6169baa32c',
  productId: '0075c8d9-4686-4021-b3e0-8b8af71edf9b',
  productName: 'Adam Hall Cables K3 YWCC 0100 - Audio Cable 3.5mm Jack stereo to 2 x RCA male 1m',
  provider: 'unknown',
  model: 'unknown',
  proposedTag: 'Audio Cables (Consumer)',
  confidence: 0.98,
  dbError: 'Query failed after 4 attempts: column "tag_proposal_id" does not exist',
  timestamp: '2025-11-29T18:01:23.349Z'
}
[DB] [Query f12b4664-8c4a-4d65-b5a2-cbb61fafe0c1] Before query execution: {
  state: 'closed',
  failures: 2,
  consecutiveSuccesses: 0,
  threshold: 10,
  lastFailure: '2025-11-29T18:01:23.348Z',
  openUntil: null
}
[DB] Acquiring client for query f12b4664-8c4a-4d65-b5a2-cbb61fafe0c1...
[PASS] Query 28faad4d-88fc-4b9e-9092-bea586aa3270 completed in 152ms, rows: 0
[TREND] Consecutive successes: 2/10
[WAIT] Circuit breaker reset pending: 2/10 consecutive successes
[RELEASE] Client released for query 28faad4d-88fc-4b9e-9092-bea586aa3270 (destroyed: false)
[DB] [Query 3b0d018f-c894-45cc-b28f-01931fc479a0] Before query execution: {
  state: 'closed',
  failures: 0,
  consecutiveSuccesses: 2,
  threshold: 10,
  lastFailure: null,
  openUntil: null
}
[DB] Acquiring client for query 3b0d018f-c894-45cc-b28f-01931fc479a0...
[PASS] Client acquired for query 3b0d018f-c894-45cc-b28f-01931fc479a0 in 1ms
[QUERY] Query 3b0d018f-c894-45cc-b28f-01931fc479a0:
      WITH batch_metrics AS (
        SELECT
          SUM(successful_count + ...
[PASS] Query 3b0d018f-c894-45cc-b28f-01931fc479a0 completed in 153ms, rows: 1
[TREND] Consecutive successes: 3/10
[WAIT] Circuit breaker reset pending: 3/10 consecutive successes
[RELEASE] Client released for query 3b0d018f-c894-45cc-b28f-01931fc479a0 (destroyed: false)
 GET /api/tag/ai-tagging/status/d0461adc-541c-4eaa-8e9e-ef6169baa32c 200 in 899ms
[GUARD] Setting up database cleanup handlers...
[PASS] Cleanup handlers registered successfully
[READY] Unified database connection updated with enterprise manager
[DB] [Query 915032d1-2717-46bc-83a0-631ea56cd2bc] Before query execution: {
  state: 'closed',
  failures: 0,
  consecutiveSuccesses: 3,
  threshold: 10,
  lastFailure: null,
  openUntil: null
}
[DB] Acquiring client for query 915032d1-2717-46bc-83a0-631ea56cd2bc...
[PASS] Client acquired for query 915032d1-2717-46bc-83a0-631ea56cd2bc in 1ms
[QUERY] Query 915032d1-2717-46bc-83a0-631ea56cd2bc:
      SELECT
        job_id,
        job_type,
        status,
        total_p...
[PASS] Query 915032d1-2717-46bc-83a0-631ea56cd2bc completed in 305ms, rows: 20
[TREND] Consecutive successes: 4/10
[WAIT] Circuit breaker reset pending: 4/10 consecutive successes
[RELEASE] Client released for query 915032d1-2717-46bc-83a0-631ea56cd2bc (destroyed: false)
 GET /api/tag/ai-tagging/jobs?limit=20 200 in 483ms
[PASS] New client connected to enterprise pool
[PASS] Client acquired for query f12b4664-8c4a-4d65-b5a2-cbb61fafe0c1 in 932ms
[QUERY] Query f12b4664-8c4a-4d65-b5a2-cbb61fafe0c1:
      UPDATE core.supplier_product
      SET
        ai_tagging_status = $2,
 ...
[PASS] Query f12b4664-8c4a-4d65-b5a2-cbb61fafe0c1 completed in 307ms, rows: 1
[TREND] Consecutive successes: 1/10
[WAIT] Circuit breaker reset pending: 1/10 consecutive successes
[RELEASE] Client released for query f12b4664-8c4a-4d65-b5a2-cbb61fafe0c1 (destroyed: false)
[DB] [Query 46f505fb-654b-45c4-bbec-077c9fa3ef67] Before query execution: {
  state: 'closed',
  failures: 2,
  consecutiveSuccesses: 1,
  threshold: 10,
  lastFailure: '2025-11-29T18:01:23.348Z',
  openUntil: null
}
[DB] Acquiring client for query 46f505fb-654b-45c4-bbec-077c9fa3ef67...
[PASS] Client acquired for query 46f505fb-654b-45c4-bbec-077c9fa3ef67 in 1ms
[QUERY] Query 46f505fb-654b-45c4-bbec-077c9fa3ef67:
      WITH upsert AS (
        INSERT INTO core.ai_tag_proposal (
          org...
[DB] [Query 35838cb6-4ddf-48f3-8e4b-578576e81967] Before query execution: {
  state: 'closed',
  failures: 0,
  consecutiveSuccesses: 4,
  threshold: 10,
  lastFailure: null,
  openUntil: null
}
[DB] Acquiring client for query 35838cb6-4ddf-48f3-8e4b-578576e81967...
[PASS] Client acquired for query 35838cb6-4ddf-48f3-8e4b-578576e81967 in 1ms
[QUERY] Query 35838cb6-4ddf-48f3-8e4b-578576e81967:
      SELECT
        job_id,
        job_type,
        status,
        total_p...
[FAIL] Query 46f505fb-654b-45c4-bbec-077c9fa3ef67 attempt 1/4 failed after 176ms: column "tag_proposal_id" does not exist
[BLOCKED] Non-retryable error detected for query 46f505fb-654b-45c4-bbec-077c9fa3ef67, aborting retries
[RELEASE] Client released for query 46f505fb-654b-45c4-bbec-077c9fa3ef67 (destroyed: true)
[TaggingEngine] Failed to record tag proposal {
  jobId: 'd0461adc-541c-4eaa-8e9e-ef6169baa32c',
  productId: '0075c8d9-4686-4021-b3e0-8b8af71edf9b',
  productName: 'Adam Hall Cables K3 YWCC 0100 - Audio Cable 3.5mm Jack stereo to 2 x RCA male 1m',
  provider: 'unknown',
  model: 'unknown',
  proposedTag: 'Y-Splitter Cable',
  confidence: 0.96,
  dbError: 'Query failed after 4 attempts: column "tag_proposal_id" does not exist',
  timestamp: '2025-11-29T18:01:24.773Z'
}
[DB] [Query 5eac7ef0-7912-4582-a281-3e2075b7b3c5] Before query execution: {
  state: 'closed',
  failures: 3,
  consecutiveSuccesses: 0,
  threshold: 10,
  lastFailure: '2025-11-29T18:01:24.768Z',
  openUntil: null
}
[DB] Acquiring client for query 5eac7ef0-7912-4582-a281-3e2075b7b3c5...
[PASS] Query 35838cb6-4ddf-48f3-8e4b-578576e81967 completed in 154ms, rows: 1
[TREND] Consecutive successes: 5/10
[WAIT] Circuit breaker reset pending: 5/10 consecutive successes
[RELEASE] Client released for query 35838cb6-4ddf-48f3-8e4b-578576e81967 (destroyed: false)
[DB] [Query f63634be-f0d4-44a2-9b52-c3ad0cd30381] Before query execution: {
  state: 'closed',
  failures: 0,
  consecutiveSuccesses: 5,
  threshold: 10,
  lastFailure: null,
  openUntil: null
}
[DB] Acquiring client for query f63634be-f0d4-44a2-9b52-c3ad0cd30381...
[PASS] Client acquired for query f63634be-f0d4-44a2-9b52-c3ad0cd30381 in 1ms
[QUERY] Query f63634be-f0d4-44a2-9b52-c3ad0cd30381:
      WITH batch_stats AS (
        SELECT
          COUNT(*) as completed_bat...
[PASS] Query f63634be-f0d4-44a2-9b52-c3ad0cd30381 completed in 154ms, rows: 1
[TREND] Consecutive successes: 6/10
[WAIT] Circuit breaker reset pending: 6/10 consecutive successes
[RELEASE] Client released for query f63634be-f0d4-44a2-9b52-c3ad0cd30381 (destroyed: false)
[DB] [Query 9f55dfdc-e0b7-4dc7-acf8-410d40f24338] Before query execution: {
  state: 'closed',
  failures: 0,
  consecutiveSuccesses: 6,
  threshold: 10,
  lastFailure: null,
  openUntil: null
}
[DB] Acquiring client for query 9f55dfdc-e0b7-4dc7-acf8-410d40f24338...
[PASS] Client acquired for query 9f55dfdc-e0b7-4dc7-acf8-410d40f24338 in 1ms
[QUERY] Query 9f55dfdc-e0b7-4dc7-acf8-410d40f24338:
      SELECT
        batch_number,
        error_message,
        products_in_...
[PASS] Query 9f55dfdc-e0b7-4dc7-acf8-410d40f24338 completed in 153ms, rows: 0
[TREND] Consecutive successes: 7/10
[WAIT] Circuit breaker reset pending: 7/10 consecutive successes
[RELEASE] Client released for query 9f55dfdc-e0b7-4dc7-acf8-410d40f24338 (destroyed: false)
[DB] [Query b51ac6af-df99-4b2d-8fab-78f837f315dc] Before query execution: {
  state: 'closed',
  failures: 0,
  consecutiveSuccesses: 7,
  threshold: 10,
  lastFailure: null,
  openUntil: null
}
[DB] Acquiring client for query b51ac6af-df99-4b2d-8fab-78f837f315dc...
[PASS] Client acquired for query b51ac6af-df99-4b2d-8fab-78f837f315dc in 2ms
[QUERY] Query b51ac6af-df99-4b2d-8fab-78f837f315dc:
      WITH batch_metrics AS (
        SELECT
          SUM(successful_count + ...
[PASS] Query b51ac6af-df99-4b2d-8fab-78f837f315dc completed in 153ms, rows: 1
[TREND] Consecutive successes: 8/10
[WAIT] Circuit breaker reset pending: 8/10 consecutive successes
[RELEASE] Client released for query b51ac6af-df99-4b2d-8fab-78f837f315dc (destroyed: false)
 GET /api/tag/ai-tagging/status/d0461adc-541c-4eaa-8e9e-ef6169baa32c 200 in 793ms
[PASS] New client connected to enterprise pool
[PASS] Client acquired for query 5eac7ef0-7912-4582-a281-3e2075b7b3c5 in 934ms
[QUERY] Query 5eac7ef0-7912-4582-a281-3e2075b7b3c5:
      UPDATE core.supplier_product
      SET
        ai_tagging_status = $2,
 ...
[DB] [Query 1dfd142a-2dd8-4a0b-a9ce-7228a8d9e79a] Before query execution: {
  state: 'closed',
  failures: 0,
  consecutiveSuccesses: 8,
  threshold: 10,
  lastFailure: null,
  openUntil: null
}
[DB] Acquiring client for query 1dfd142a-2dd8-4a0b-a9ce-7228a8d9e79a...
[PASS] Client acquired for query 1dfd142a-2dd8-4a0b-a9ce-7228a8d9e79a in 1ms
[QUERY] Query 1dfd142a-2dd8-4a0b-a9ce-7228a8d9e79a:
      SELECT
        job_id,
        job_type,
        status,
        total_p...
[PASS] Query 5eac7ef0-7912-4582-a281-3e2075b7b3c5 completed in 313ms, rows: 1
[TREND] Consecutive successes: 1/10
[WAIT] Circuit breaker reset pending: 1/10 consecutive successes
[RELEASE] Client released for query 5eac7ef0-7912-4582-a281-3e2075b7b3c5 (destroyed: false)
[DB] [Query 775655e9-55f4-4a32-8c6f-78704ef1eac0] Before query execution: {
  state: 'closed',
  failures: 3,
  consecutiveSuccesses: 1,
  threshold: 10,
  lastFailure: '2025-11-29T18:01:24.768Z',
  openUntil: null
}
[DB] Acquiring client for query 775655e9-55f4-4a32-8c6f-78704ef1eac0...
[PASS] Client acquired for query 775655e9-55f4-4a32-8c6f-78704ef1eac0 in 1ms
[QUERY] Query 775655e9-55f4-4a32-8c6f-78704ef1eac0:
      WITH upsert AS (
        INSERT INTO core.ai_tag_proposal (
          org...
[PASS] Query 1dfd142a-2dd8-4a0b-a9ce-7228a8d9e79a completed in 153ms, rows: 1
[TREND] Consecutive successes: 9/10
[WAIT] Circuit breaker reset pending: 9/10 consecutive successes
[RELEASE] Client released for query 1dfd142a-2dd8-4a0b-a9ce-7228a8d9e79a (destroyed: false)
[DB] [Query 71e9a84f-ab51-4b8b-bcc4-b2109ae41148] Before query execution: {
  state: 'closed',
  failures: 0,
  consecutiveSuccesses: 9,
  threshold: 10,
  lastFailure: null,
  openUntil: null
}
[DB] Acquiring client for query 71e9a84f-ab51-4b8b-bcc4-b2109ae41148...
[PASS] Client acquired for query 71e9a84f-ab51-4b8b-bcc4-b2109ae41148 in 2ms
[QUERY] Query 71e9a84f-ab51-4b8b-bcc4-b2109ae41148:
      WITH batch_stats AS (
        SELECT
          COUNT(*) as completed_bat...
[FAIL] Query 775655e9-55f4-4a32-8c6f-78704ef1eac0 attempt 1/4 failed after 154ms: column "tag_proposal_id" does not exist
[BLOCKED] Non-retryable error detected for query 775655e9-55f4-4a32-8c6f-78704ef1eac0, aborting retries
[RELEASE] Client released for query 775655e9-55f4-4a32-8c6f-78704ef1eac0 (destroyed: true)
[TaggingEngine] Failed to record tag proposal {
  jobId: 'd0461adc-541c-4eaa-8e9e-ef6169baa32c',
  productId: '0075c8d9-4686-4021-b3e0-8b8af71edf9b',
  productName: 'Adam Hall Cables K3 YWCC 0100 - Audio Cable 3.5mm Jack stereo to 2 x RCA male 1m',
  provider: 'unknown',
  model: 'unknown',
  proposedTag: '3.5mm Stereo Jack',
  confidence: 0.98,
  dbError: 'Query failed after 4 attempts: column "tag_proposal_id" does not exist',
  timestamp: '2025-11-29T18:01:26.181Z'
}
[DB] [Query 5a1725e2-3b37-4838-8791-3e3a4fcd11ea] Before query execution: {
  state: 'closed',
  failures: 4,
  consecutiveSuccesses: 0,
  threshold: 10,
  lastFailure: '2025-11-29T18:01:26.180Z',
  openUntil: null
}
[DB] Acquiring client for query 5a1725e2-3b37-4838-8791-3e3a4fcd11ea...
[PASS] Query 71e9a84f-ab51-4b8b-bcc4-b2109ae41148 completed in 154ms, rows: 1
[TREND] Consecutive successes: 10/10
[DB] [Circuit Breaker] Circuit breaker RESET: {
  state: 'closed',
  failures: 0,
  consecutiveSuccesses: 0,
  threshold: 10,
  lastFailure: null,
  openUntil: null
}
[RELEASE] Client released for query 71e9a84f-ab51-4b8b-bcc4-b2109ae41148 (destroyed: false)
[DB] [Query 646733e7-0950-47a0-a477-bdaf025cd136] Before query execution: {
  state: 'closed',
  failures: 0,
  consecutiveSuccesses: 0,
  threshold: 10,
  lastFailure: null,
  openUntil: null
}
[DB] Acquiring client for query 646733e7-0950-47a0-a477-bdaf025cd136...
[PASS] Client acquired for query 646733e7-0950-47a0-a477-bdaf025cd136 in 1ms
[QUERY] Query 646733e7-0950-47a0-a477-bdaf025cd136:
      SELECT
        batch_number,
        error_message,
        products_in_...
[GUARD] Setting up database cleanup handlers...
[PASS] Cleanup handlers registered successfully
[READY] Unified database connection updated with enterprise manager
[PASS] Query 646733e7-0950-47a0-a477-bdaf025cd136 completed in 153ms, rows: 0
[TREND] Consecutive successes: 1/10
[WAIT] Circuit breaker reset pending: 1/10 consecutive successes
[RELEASE] Client released for query 646733e7-0950-47a0-a477-bdaf025cd136 (destroyed: false)
[DB] [Query c22f2750-c901-454e-aceb-7e6dba82bd5c] Before query execution: {
  state: 'closed',
  failures: 0,
  consecutiveSuccesses: 1,
  threshold: 10,
  lastFailure: null,
  openUntil: null
}
[DB] Acquiring client for query c22f2750-c901-454e-aceb-7e6dba82bd5c...
[PASS] Client acquired for query c22f2750-c901-454e-aceb-7e6dba82bd5c in 1ms
[QUERY] Query c22f2750-c901-454e-aceb-7e6dba82bd5c:
      WITH batch_metrics AS (
        SELECT
          SUM(successful_count + ...
[PASS] Query c22f2750-c901-454e-aceb-7e6dba82bd5c completed in 154ms, rows: 1
[TREND] Consecutive successes: 2/10
[WAIT] Circuit breaker reset pending: 2/10 consecutive successes
[RELEASE] Client released for query c22f2750-c901-454e-aceb-7e6dba82bd5c (destroyed: false)
 GET /api/tag/ai-tagging/status/d0461adc-541c-4eaa-8e9e-ef6169baa32c 200 in 791ms
[PASS] New client connected to enterprise pool
[PASS] Client acquired for query 5a1725e2-3b37-4838-8791-3e3a4fcd11ea in 927ms
[QUERY] Query 5a1725e2-3b37-4838-8791-3e3a4fcd11ea:
      UPDATE core.supplier_product
      SET
        ai_tagging_status = $2,
 ...
[PASS] Query 5a1725e2-3b37-4838-8791-3e3a4fcd11ea completed in 308ms, rows: 1
[TREND] Consecutive successes: 1/10
[WAIT] Circuit breaker reset pending: 1/10 consecutive successes
[RELEASE] Client released for query 5a1725e2-3b37-4838-8791-3e3a4fcd11ea (destroyed: false)
[DB] [Query 8522029f-a7e9-4ffa-8980-aa62f178d399] Before query execution: {
  state: 'closed',
  failures: 4,
  consecutiveSuccesses: 1,
  threshold: 10,
  lastFailure: '2025-11-29T18:01:26.180Z',
  openUntil: null
}
[DB] Acquiring client for query 8522029f-a7e9-4ffa-8980-aa62f178d399...
[PASS] Client acquired for query 8522029f-a7e9-4ffa-8980-aa62f178d399 in 1ms
[QUERY] Query 8522029f-a7e9-4ffa-8980-aa62f178d399:
      WITH upsert AS (
        INSERT INTO core.ai_tag_proposal (
          org...
[FAIL] Query 8522029f-a7e9-4ffa-8980-aa62f178d399 attempt 1/4 failed after 154ms: column "tag_proposal_id" does not exist
[BLOCKED] Non-retryable error detected for query 8522029f-a7e9-4ffa-8980-aa62f178d399, aborting retries
[RELEASE] Client released for query 8522029f-a7e9-4ffa-8980-aa62f178d399 (destroyed: true)
[TaggingEngine] Failed to record tag proposal {
  jobId: 'd0461adc-541c-4eaa-8e9e-ef6169baa32c',
  productId: '0075c8d9-4686-4021-b3e0-8b8af71edf9b',
  productName: 'Adam Hall Cables K3 YWCC 0100 - Audio Cable 3.5mm Jack stereo to 2 x RCA male 1m',
  provider: 'unknown',
  model: 'unknown',
  proposedTag: '2 x RCA Male',
  confidence: 0.98,
  dbError: 'Query failed after 4 attempts: column "tag_proposal_id" does not exist',
  timestamp: '2025-11-29T18:01:27.575Z'
}
[DB] [Query efe3b8d8-3a94-4053-9568-52af9397c2be] Before query execution: {
  state: 'closed',
  failures: 5,
  consecutiveSuccesses: 0,
  threshold: 10,
  lastFailure: '2025-11-29T18:01:27.574Z',
  openUntil: null
}
[DB] Acquiring client for query efe3b8d8-3a94-4053-9568-52af9397c2be...
[DB] [Query 1ee51055-d3ae-4feb-b06b-9cfb3c19eaa4] Before query execution: {
  state: 'closed',
  failures: 0,
  consecutiveSuccesses: 2,
  threshold: 10,
  lastFailure: null,
  openUntil: null
}
[DB] Acquiring client for query 1ee51055-d3ae-4feb-b06b-9cfb3c19eaa4...
[PASS] Client acquired for query 1ee51055-d3ae-4feb-b06b-9cfb3c19eaa4 in 1ms
[QUERY] Query 1ee51055-d3ae-4feb-b06b-9cfb3c19eaa4:
      SELECT
        job_id,
        job_type,
        status,
        total_p...
[PASS] Query 1ee51055-d3ae-4feb-b06b-9cfb3c19eaa4 completed in 153ms, rows: 1
[TREND] Consecutive successes: 3/10
[WAIT] Circuit breaker reset pending: 3/10 consecutive successes
[RELEASE] Client released for query 1ee51055-d3ae-4feb-b06b-9cfb3c19eaa4 (destroyed: false)
[DB] [Query 12c03a0d-ab66-48f8-8d8d-7a04f14fd58c] Before query execution: {
  state: 'closed',
  failures: 0,
  consecutiveSuccesses: 3,
  threshold: 10,
  lastFailure: null,
  openUntil: null
}
[DB] Acquiring client for query 12c03a0d-ab66-48f8-8d8d-7a04f14fd58c...
[PASS] Client acquired for query 12c03a0d-ab66-48f8-8d8d-7a04f14fd58c in 0ms
[QUERY] Query 12c03a0d-ab66-48f8-8d8d-7a04f14fd58c:
      WITH batch_stats AS (
        SELECT
          COUNT(*) as completed_bat...
[PASS] Query 12c03a0d-ab66-48f8-8d8d-7a04f14fd58c completed in 153ms, rows: 1
[TREND] Consecutive successes: 4/10
[WAIT] Circuit breaker reset pending: 4/10 consecutive successes
[RELEASE] Client released for query 12c03a0d-ab66-48f8-8d8d-7a04f14fd58c (destroyed: false)
[DB] [Query 98c50937-bdad-4794-9a6c-8006440c9014] Before query execution: {
  state: 'closed',
  failures: 0,
  consecutiveSuccesses: 4,
  threshold: 10,
  lastFailure: null,
  openUntil: null
}
[DB] Acquiring client for query 98c50937-bdad-4794-9a6c-8006440c9014...
[PASS] Client acquired for query 98c50937-bdad-4794-9a6c-8006440c9014 in 1ms
[QUERY] Query 98c50937-bdad-4794-9a6c-8006440c9014:
      SELECT
        batch_number,
        error_message,
        products_in_...
[PASS] Query 98c50937-bdad-4794-9a6c-8006440c9014 completed in 153ms, rows: 0
[TREND] Consecutive successes: 5/10
[WAIT] Circuit breaker reset pending: 5/10 consecutive successes
[RELEASE] Client released for query 98c50937-bdad-4794-9a6c-8006440c9014 (destroyed: false)
[DB] [Query a0bb321e-81ef-4c63-8bd7-1d28ab8285c3] Before query execution: {
  state: 'closed',
  failures: 0,
  consecutiveSuccesses: 5,
  threshold: 10,
  lastFailure: null,
  openUntil: null
}
[DB] Acquiring client for query a0bb321e-81ef-4c63-8bd7-1d28ab8285c3...
[PASS] Client acquired for query a0bb321e-81ef-4c63-8bd7-1d28ab8285c3 in 1ms
[QUERY] Query a0bb321e-81ef-4c63-8bd7-1d28ab8285c3:
      WITH batch_metrics AS (
        SELECT
          SUM(successful_count + ...
[PASS] Query a0bb321e-81ef-4c63-8bd7-1d28ab8285c3 completed in 153ms, rows: 1
[TREND] Consecutive successes: 6/10
[WAIT] Circuit breaker reset pending: 6/10 consecutive successes
[RELEASE] Client released for query a0bb321e-81ef-4c63-8bd7-1d28ab8285c3 (destroyed: false)
 GET /api/tag/ai-tagging/status/d0461adc-541c-4eaa-8e9e-ef6169baa32c 200 in 752ms
[PASS] New client connected to enterprise pool
[PASS] Client acquired for query efe3b8d8-3a94-4053-9568-52af9397c2be in 933ms
[QUERY] Query efe3b8d8-3a94-4053-9568-52af9397c2be:
      UPDATE core.supplier_product
      SET
        ai_tagging_status = $2,
 ...
[PASS] Query efe3b8d8-3a94-4053-9568-52af9397c2be completed in 324ms, rows: 1
[TREND] Consecutive successes: 1/10
[WAIT] Circuit breaker reset pending: 1/10 consecutive successes
[RELEASE] Client released for query efe3b8d8-3a94-4053-9568-52af9397c2be (destroyed: false)
[DB] [Query 59c13895-601f-47a3-93bb-930ec93ffcc6] Before query execution: {
  state: 'closed',
  failures: 5,
  consecutiveSuccesses: 1,
  threshold: 10,
  lastFailure: '2025-11-29T18:01:27.574Z',
  openUntil: null
}
[DB] Acquiring client for query 59c13895-601f-47a3-93bb-930ec93ffcc6...
[PASS] Client acquired for query 59c13895-601f-47a3-93bb-930ec93ffcc6 in 1ms
[QUERY] Query 59c13895-601f-47a3-93bb-930ec93ffcc6:
      WITH upsert AS (
        INSERT INTO core.ai_tag_proposal (
          org...
[DB] [Query c8ca66a9-7979-4c8f-8adc-ee7085611ffc] Before query execution: {
  state: 'closed',
  failures: 0,
  consecutiveSuccesses: 6,
  threshold: 10,
  lastFailure: null,
  openUntil: null
}
[DB] Acquiring client for query c8ca66a9-7979-4c8f-8adc-ee7085611ffc...
[PASS] Client acquired for query c8ca66a9-7979-4c8f-8adc-ee7085611ffc in 1ms
[QUERY] Query c8ca66a9-7979-4c8f-8adc-ee7085611ffc:
      SELECT
        job_id,
        job_type,
        status,
        total_p...
[FAIL] Query 59c13895-601f-47a3-93bb-930ec93ffcc6 attempt 1/4 failed after 171ms: column "tag_proposal_id" does not exist
[BLOCKED] Non-retryable error detected for query 59c13895-601f-47a3-93bb-930ec93ffcc6, aborting retries
[RELEASE] Client released for query 59c13895-601f-47a3-93bb-930ec93ffcc6 (destroyed: true)
[TaggingEngine] Failed to record tag proposal {
  jobId: 'd0461adc-541c-4eaa-8e9e-ef6169baa32c',
  productId: '0075c8d9-4686-4021-b3e0-8b8af71edf9b',
  productName: 'Adam Hall Cables K3 YWCC 0100 - Audio Cable 3.5mm Jack stereo to 2 x RCA male 1m',
  provider: 'unknown',
  model: 'unknown',
  proposedTag: 'Cable Length: 1m',
  confidence: 0.98,
  dbError: 'Query failed after 4 attempts: column "tag_proposal_id" does not exist',
  timestamp: '2025-11-29T18:01:29.008Z'
}
[DB] [Query 3a23bbff-a4e2-48e4-92f7-ce4b4f11a996] Before query execution: {
  state: 'closed',
  failures: 6,
  consecutiveSuccesses: 0,
  threshold: 10,
  lastFailure: '2025-11-29T18:01:29.007Z',
  openUntil: null
}
[DB] Acquiring client for query 3a23bbff-a4e2-48e4-92f7-ce4b4f11a996...
[DB] [Query b68a2cb7-4b22-4b3d-af03-003d22aafe06] Before query execution: {
  state: 'closed',
  failures: 0,
  consecutiveSuccesses: 6,
  threshold: 10,
  lastFailure: null,
  openUntil: null
}
[DB] Acquiring client for query b68a2cb7-4b22-4b3d-af03-003d22aafe06...
[PASS] Client acquired for query b68a2cb7-4b22-4b3d-af03-003d22aafe06 in 1ms
[QUERY] Query b68a2cb7-4b22-4b3d-af03-003d22aafe06:
      SELECT
        job_id,
        job_type,
        status,
        total_p...
[PASS] Query c8ca66a9-7979-4c8f-8adc-ee7085611ffc completed in 307ms, rows: 20
[TREND] Consecutive successes: 7/10
[WAIT] Circuit breaker reset pending: 7/10 consecutive successes
[RELEASE] Client released for query c8ca66a9-7979-4c8f-8adc-ee7085611ffc (destroyed: false)
 GET /api/tag/ai-tagging/jobs?limit=20 200 in 507ms
[PASS] Query b68a2cb7-4b22-4b3d-af03-003d22aafe06 completed in 154ms, rows: 1
[TREND] Consecutive successes: 8/10
[WAIT] Circuit breaker reset pending: 8/10 consecutive successes
[RELEASE] Client released for query b68a2cb7-4b22-4b3d-af03-003d22aafe06 (destroyed: false)
[DB] [Query bbd683c9-47bd-412d-a42a-148695f1466e] Before query execution: {
  state: 'closed',
  failures: 0,
  consecutiveSuccesses: 8,
  threshold: 10,
  lastFailure: null,
  openUntil: null
}
[DB] Acquiring client for query bbd683c9-47bd-412d-a42a-148695f1466e...
[PASS] Client acquired for query bbd683c9-47bd-412d-a42a-148695f1466e in 1ms
[QUERY] Query bbd683c9-47bd-412d-a42a-148695f1466e:
      WITH batch_stats AS (
        SELECT
          COUNT(*) as completed_bat...
[GUARD] Setting up database cleanup handlers...
[PASS] Cleanup handlers registered successfully
[READY] Unified database connection updated with enterprise manager
[PASS] Query bbd683c9-47bd-412d-a42a-148695f1466e completed in 154ms, rows: 1
[TREND] Consecutive successes: 9/10
[WAIT] Circuit breaker reset pending: 9/10 consecutive successes
[RELEASE] Client released for query bbd683c9-47bd-412d-a42a-148695f1466e (destroyed: false)
[DB] [Query 09ecadfb-c910-4ed9-a0b6-93e4a4e42f1a] Before query execution: {
  state: 'closed',
  failures: 0,
  consecutiveSuccesses: 9,
  threshold: 10,
  lastFailure: null,
  openUntil: null
}
[DB] Acquiring client for query 09ecadfb-c910-4ed9-a0b6-93e4a4e42f1a...
[PASS] Client acquired for query 09ecadfb-c910-4ed9-a0b6-93e4a4e42f1a in 0ms
[QUERY] Query 09ecadfb-c910-4ed9-a0b6-93e4a4e42f1a:
      SELECT
        batch_number,
        error_message,
        products_in_...
[PASS] Query 09ecadfb-c910-4ed9-a0b6-93e4a4e42f1a completed in 153ms, rows: 0
[TREND] Consecutive successes: 10/10
[DB] [Circuit Breaker] Circuit breaker RESET: {
  state: 'closed',
  failures: 0,
  consecutiveSuccesses: 0,
  threshold: 10,
  lastFailure: null,
  openUntil: null
}
[RELEASE] Client released for query 09ecadfb-c910-4ed9-a0b6-93e4a4e42f1a (destroyed: false)
[DB] [Query a9c6e3a4-5676-4486-9d02-4cbfbbdab6d2] Before query execution: {
  state: 'closed',
  failures: 0,
  consecutiveSuccesses: 0,
  threshold: 10,
  lastFailure: null,
  openUntil: null
}
[DB] Acquiring client for query a9c6e3a4-5676-4486-9d02-4cbfbbdab6d2...
[PASS] Client acquired for query a9c6e3a4-5676-4486-9d02-4cbfbbdab6d2 in 0ms
[QUERY] Query a9c6e3a4-5676-4486-9d02-4cbfbbdab6d2:
      WITH batch_metrics AS (
        SELECT
          SUM(successful_count + ...
[PASS] Query a9c6e3a4-5676-4486-9d02-4cbfbbdab6d2 completed in 153ms, rows: 1
[TREND] Consecutive successes: 1/10
[WAIT] Circuit breaker reset pending: 1/10 consecutive successes
[RELEASE] Client released for query a9c6e3a4-5676-4486-9d02-4cbfbbdab6d2 (destroyed: false)
 GET /api/tag/ai-tagging/status/d0461adc-541c-4eaa-8e9e-ef6169baa32c 200 in 894ms
[PASS] New client connected to enterprise pool
[PASS] Client acquired for query 3a23bbff-a4e2-48e4-92f7-ce4b4f11a996 in 931ms
[QUERY] Query 3a23bbff-a4e2-48e4-92f7-ce4b4f11a996:
      UPDATE core.supplier_product
      SET
        ai_tagging_status = $2,
 ...
[PASS] Query 3a23bbff-a4e2-48e4-92f7-ce4b4f11a996 completed in 356ms, rows: 1
[TREND] Consecutive successes: 1/10
[WAIT] Circuit breaker reset pending: 1/10 consecutive successes
[RELEASE] Client released for query 3a23bbff-a4e2-48e4-92f7-ce4b4f11a996 (destroyed: false)
[DB] [Query 292ad3aa-8dbc-4a32-96c3-d1a78b0acfb8] Before query execution: {
  state: 'closed',
  failures: 6,
  consecutiveSuccesses: 1,
  threshold: 10,
  lastFailure: '2025-11-29T18:01:29.007Z',
  openUntil: null
}
[DB] Acquiring client for query 292ad3aa-8dbc-4a32-96c3-d1a78b0acfb8...
[PASS] Client acquired for query 292ad3aa-8dbc-4a32-96c3-d1a78b0acfb8 in 0ms
[QUERY] Query 292ad3aa-8dbc-4a32-96c3-d1a78b0acfb8:
      WITH upsert AS (
        INSERT INTO core.ai_tag_proposal (
          org...
[FAIL] Query 292ad3aa-8dbc-4a32-96c3-d1a78b0acfb8 attempt 1/4 failed after 153ms: column "tag_proposal_id" does not exist
[BLOCKED] Non-retryable error detected for query 292ad3aa-8dbc-4a32-96c3-d1a78b0acfb8, aborting retries
[RELEASE] Client released for query 292ad3aa-8dbc-4a32-96c3-d1a78b0acfb8 (destroyed: true)
[TaggingEngine] Failed to record tag proposal {
  jobId: 'd0461adc-541c-4eaa-8e9e-ef6169baa32c',
  productId: '0075c8d9-4686-4021-b3e0-8b8af71edf9b',
  productName: 'Adam Hall Cables K3 YWCC 0100 - Audio Cable 3.5mm Jack stereo to 2 x RCA male 1m',
  provider: 'unknown',
  model: 'unknown',
  proposedTag: 'Consumer Audio',
  confidence: 0.9,
  dbError: 'Query failed after 4 attempts: column "tag_proposal_id" does not exist',
  timestamp: '2025-11-29T18:01:30.455Z'
}
[DB] [Query 83eacdd3-3830-4a8c-8467-e975aae49c59] Before query execution: {
  state: 'closed',
  failures: 7,
  consecutiveSuccesses: 0,
  threshold: 10,
  lastFailure: '2025-11-29T18:01:30.454Z',
  openUntil: null
}
[DB] Acquiring client for query 83eacdd3-3830-4a8c-8467-e975aae49c59...
[DB] [Query edcb3099-d90a-4c07-9d73-4d802628fb9c] Before query execution: {
  state: 'closed',
  failures: 0,
  consecutiveSuccesses: 1,
  threshold: 10,
  lastFailure: null,
  openUntil: null
}
[DB] Acquiring client for query edcb3099-d90a-4c07-9d73-4d802628fb9c...
[PASS] Client acquired for query edcb3099-d90a-4c07-9d73-4d802628fb9c in 0ms
[QUERY] Query edcb3099-d90a-4c07-9d73-4d802628fb9c:
      SELECT
        job_id,
        job_type,
        status,
        total_p...
[PASS] Query edcb3099-d90a-4c07-9d73-4d802628fb9c completed in 153ms, rows: 1
[TREND] Consecutive successes: 2/10
[WAIT] Circuit breaker reset pending: 2/10 consecutive successes
[RELEASE] Client released for query edcb3099-d90a-4c07-9d73-4d802628fb9c (destroyed: false)
[DB] [Query ac315da3-d9ee-40ca-b78e-094b8b10e080] Before query execution: {
  state: 'closed',
  failures: 0,
  consecutiveSuccesses: 2,
  threshold: 10,
  lastFailure: null,
  openUntil: null
}
[DB] Acquiring client for query ac315da3-d9ee-40ca-b78e-094b8b10e080...
[PASS] Client acquired for query ac315da3-d9ee-40ca-b78e-094b8b10e080 in 1ms
[QUERY] Query ac315da3-d9ee-40ca-b78e-094b8b10e080:
      WITH batch_stats AS (
        SELECT
          COUNT(*) as completed_bat...
[PASS] Query ac315da3-d9ee-40ca-b78e-094b8b10e080 completed in 155ms, rows: 1
[TREND] Consecutive successes: 3/10
[WAIT] Circuit breaker reset pending: 3/10 consecutive successes
[RELEASE] Client released for query ac315da3-d9ee-40ca-b78e-094b8b10e080 (destroyed: false)
[DB] [Query 48b7b849-98e7-4e21-b2da-f539a75767d9] Before query execution: {
  state: 'closed',
  failures: 0,
  consecutiveSuccesses: 3,
  threshold: 10,
  lastFailure: null,
  openUntil: null
}
[DB] Acquiring client for query 48b7b849-98e7-4e21-b2da-f539a75767d9...
[PASS] Client acquired for query 48b7b849-98e7-4e21-b2da-f539a75767d9 in 1ms
[QUERY] Query 48b7b849-98e7-4e21-b2da-f539a75767d9:
      SELECT
        batch_number,
        error_message,
        products_in_...
[PASS] Query 48b7b849-98e7-4e21-b2da-f539a75767d9 completed in 152ms, rows: 0
[TREND] Consecutive successes: 4/10
[WAIT] Circuit breaker reset pending: 4/10 consecutive successes
[RELEASE] Client released for query 48b7b849-98e7-4e21-b2da-f539a75767d9 (destroyed: false)
[DB] [Query 51245a66-2201-4b39-bc79-e3df5a9f8534] Before query execution: {
  state: 'closed',
  failures: 0,
  consecutiveSuccesses: 4,
  threshold: 10,
  lastFailure: null,
  openUntil: null
}
[DB] Acquiring client for query 51245a66-2201-4b39-bc79-e3df5a9f8534...
[PASS] Client acquired for query 51245a66-2201-4b39-bc79-e3df5a9f8534 in 1ms
[QUERY] Query 51245a66-2201-4b39-bc79-e3df5a9f8534:
      WITH batch_metrics AS (
        SELECT
          SUM(successful_count + ...
[PASS] Query 51245a66-2201-4b39-bc79-e3df5a9f8534 completed in 154ms, rows: 1
[TREND] Consecutive successes: 5/10
[WAIT] Circuit breaker reset pending: 5/10 consecutive successes
[RELEASE] Client released for query 51245a66-2201-4b39-bc79-e3df5a9f8534 (destroyed: false)
 GET /api/tag/ai-tagging/status/d0461adc-541c-4eaa-8e9e-ef6169baa32c 200 in 764ms
[PASS] New client connected to enterprise pool
[PASS] Client acquired for query 83eacdd3-3830-4a8c-8467-e975aae49c59 in 940ms
[QUERY] Query 83eacdd3-3830-4a8c-8467-e975aae49c59:
      UPDATE core.supplier_product
      SET
        ai_tagging_status = $2,
 ...
[PASS] Query 83eacdd3-3830-4a8c-8467-e975aae49c59 completed in 307ms, rows: 1
[TREND] Consecutive successes: 1/10
[WAIT] Circuit breaker reset pending: 1/10 consecutive successes
[RELEASE] Client released for query 83eacdd3-3830-4a8c-8467-e975aae49c59 (destroyed: false)
[DB] [Query 721c1190-f1b5-4824-9666-3d30a4c418c4] Before query execution: {
  state: 'closed',
  failures: 7,
  consecutiveSuccesses: 1,
  threshold: 10,
  lastFailure: '2025-11-29T18:01:30.454Z',
  openUntil: null
}
[DB] Acquiring client for query 721c1190-f1b5-4824-9666-3d30a4c418c4...
[PASS] Client acquired for query 721c1190-f1b5-4824-9666-3d30a4c418c4 in 1ms
[QUERY] Query 721c1190-f1b5-4824-9666-3d30a4c418c4:
      WITH upsert AS (
        INSERT INTO core.ai_tag_proposal (
          org...
[FAIL] Query 721c1190-f1b5-4824-9666-3d30a4c418c4 attempt 1/4 failed after 165ms: column "tag_proposal_id" does not exist
[BLOCKED] Non-retryable error detected for query 721c1190-f1b5-4824-9666-3d30a4c418c4, aborting retries
[RELEASE] Client released for query 721c1190-f1b5-4824-9666-3d30a4c418c4 (destroyed: true)
[TaggingEngine] Failed to record tag proposal {
  jobId: 'd0461adc-541c-4eaa-8e9e-ef6169baa32c',
  productId: '0075c8d9-4686-4021-b3e0-8b8af71edf9b',
  productName: 'Adam Hall Cables K3 YWCC 0100 - Audio Cable 3.5mm Jack stereo to 2 x RCA male 1m',
  provider: 'unknown',
  model: 'unknown',
  proposedTag: 'Stereo Breakout',
  confidence: 0.9,
  dbError: 'Query failed after 4 attempts: column "tag_proposal_id" does not exist',
  timestamp: '2025-11-29T18:01:31.873Z'
}
[DB] [Query 24c7bbf5-9113-4b3b-944d-bd5b73564ac1] Before query execution: {
  state: 'closed',
  failures: 8,
  consecutiveSuccesses: 0,
  threshold: 10,
  lastFailure: '2025-11-29T18:01:31.872Z',
  openUntil: null
}
[DB] Acquiring client for query 24c7bbf5-9113-4b3b-944d-bd5b73564ac1...
[DB] [Query 4b7facc4-a607-4a05-be01-941689b9575c] Before query execution: {
  state: 'closed',
  failures: 0,
  consecutiveSuccesses: 5,
  threshold: 10,
  lastFailure: null,
  openUntil: null
}
[DB] Acquiring client for query 4b7facc4-a607-4a05-be01-941689b9575c...
[PASS] Client acquired for query 4b7facc4-a607-4a05-be01-941689b9575c in 1ms
[QUERY] Query 4b7facc4-a607-4a05-be01-941689b9575c:
      SELECT
        job_id,
        job_type,
        status,
        total_p...
[PASS] Query 4b7facc4-a607-4a05-be01-941689b9575c completed in 154ms, rows: 1
[TREND] Consecutive successes: 6/10
[WAIT] Circuit breaker reset pending: 6/10 consecutive successes
[RELEASE] Client released for query 4b7facc4-a607-4a05-be01-941689b9575c (destroyed: false)
[DB] [Query 74a0ab30-199b-45eb-a165-c30bbe7e82cc] Before query execution: {
  state: 'closed',
  failures: 0,
  consecutiveSuccesses: 6,
  threshold: 10,
  lastFailure: null,
  openUntil: null
}
[DB] Acquiring client for query 74a0ab30-199b-45eb-a165-c30bbe7e82cc...
[PASS] Client acquired for query 74a0ab30-199b-45eb-a165-c30bbe7e82cc in 1ms
[QUERY] Query 74a0ab30-199b-45eb-a165-c30bbe7e82cc:
      WITH batch_stats AS (
        SELECT
          COUNT(*) as completed_bat...
[PASS] Query 74a0ab30-199b-45eb-a165-c30bbe7e82cc completed in 154ms, rows: 1
[TREND] Consecutive successes: 7/10
[WAIT] Circuit breaker reset pending: 7/10 consecutive successes
[RELEASE] Client released for query 74a0ab30-199b-45eb-a165-c30bbe7e82cc (destroyed: false)
[DB] [Query a9748873-f275-46dc-9cbe-bdf39de1c2ed] Before query execution: {
  state: 'closed',
  failures: 0,
  consecutiveSuccesses: 7,
  threshold: 10,
  lastFailure: null,
  openUntil: null
}
[DB] Acquiring client for query a9748873-f275-46dc-9cbe-bdf39de1c2ed...
[PASS] Client acquired for query a9748873-f275-46dc-9cbe-bdf39de1c2ed in 1ms
[QUERY] Query a9748873-f275-46dc-9cbe-bdf39de1c2ed:
      SELECT
        batch_number,
        error_message,
        products_in_...
[GUARD] Setting up database cleanup handlers...
[PASS] Cleanup handlers registered successfully
[READY] Unified database connection updated with enterprise manager
[PASS] Query a9748873-f275-46dc-9cbe-bdf39de1c2ed completed in 153ms, rows: 0
[TREND] Consecutive successes: 8/10
[WAIT] Circuit breaker reset pending: 8/10 consecutive successes
[RELEASE] Client released for query a9748873-f275-46dc-9cbe-bdf39de1c2ed (destroyed: false)
[DB] [Query 763d9ada-4299-4d3f-9921-866bc36363c3] Before query execution: {
  state: 'closed',
  failures: 0,
  consecutiveSuccesses: 8,
  threshold: 10,
  lastFailure: null,
  openUntil: null
}
[DB] Acquiring client for query 763d9ada-4299-4d3f-9921-866bc36363c3...
[PASS] Client acquired for query 763d9ada-4299-4d3f-9921-866bc36363c3 in 1ms
[QUERY] Query 763d9ada-4299-4d3f-9921-866bc36363c3:
      WITH batch_metrics AS (
        SELECT
          SUM(successful_count + ...
[PASS] Query 763d9ada-4299-4d3f-9921-866bc36363c3 completed in 154ms, rows: 1
[TREND] Consecutive successes: 9/10
[WAIT] Circuit breaker reset pending: 9/10 consecutive successes
[RELEASE] Client released for query 763d9ada-4299-4d3f-9921-866bc36363c3 (destroyed: false)
 GET /api/tag/ai-tagging/status/d0461adc-541c-4eaa-8e9e-ef6169baa32c 200 in 800ms
[PASS] New client connected to enterprise pool
[PASS] Client acquired for query 24c7bbf5-9113-4b3b-944d-bd5b73564ac1 in 937ms
[QUERY] Query 24c7bbf5-9113-4b3b-944d-bd5b73564ac1:
      UPDATE core.supplier_product
      SET
        ai_tagging_status = $2,
 ...
[PASS] Query 24c7bbf5-9113-4b3b-944d-bd5b73564ac1 completed in 307ms, rows: 1
[TREND] Consecutive successes: 1/10
[WAIT] Circuit breaker reset pending: 1/10 consecutive successes
[RELEASE] Client released for query 24c7bbf5-9113-4b3b-944d-bd5b73564ac1 (destroyed: false)
[DB] [Query 4b6bb696-fd56-4f84-8091-d6daf911b0be] Before query execution: {
  state: 'closed',
  failures: 8,
  consecutiveSuccesses: 1,
  threshold: 10,
  lastFailure: '2025-11-29T18:01:31.872Z',
  openUntil: null
}
[DB] Acquiring client for query 4b6bb696-fd56-4f84-8091-d6daf911b0be...
[PASS] Client acquired for query 4b6bb696-fd56-4f84-8091-d6daf911b0be in 0ms
[QUERY] Query 4b6bb696-fd56-4f84-8091-d6daf911b0be:
      WITH upsert AS (
        INSERT INTO core.ai_tag_proposal (
          org...
[FAIL] Query 4b6bb696-fd56-4f84-8091-d6daf911b0be attempt 1/4 failed after 182ms: column "tag_proposal_id" does not exist
[BLOCKED] Non-retryable error detected for query 4b6bb696-fd56-4f84-8091-d6daf911b0be, aborting retries
[RELEASE] Client released for query 4b6bb696-fd56-4f84-8091-d6daf911b0be (destroyed: true)
[TaggingEngine] Failed to record tag proposal {
  jobId: 'd0461adc-541c-4eaa-8e9e-ef6169baa32c',
  productId: '0075c8d9-4686-4021-b3e0-8b8af71edf9b',
  productName: 'Adam Hall Cables K3 YWCC 0100 - Audio Cable 3.5mm Jack stereo to 2 x RCA male 1m',
  provider: 'unknown',
  model: 'unknown',
  proposedTag: 'Cables & Connectors',
  confidence: 0.95,
  dbError: 'Query failed after 4 attempts: column "tag_proposal_id" does not exist',
  timestamp: '2025-11-29T18:01:33.306Z'
}
[DB] [Query 74192bfd-1c06-43f2-9ae5-c706e0b19fa5] Before query execution: {
  state: 'closed',
  failures: 9,
  consecutiveSuccesses: 0,
  threshold: 10,
  lastFailure: '2025-11-29T18:01:33.305Z',
  openUntil: null
}
[DB] Acquiring client for query 74192bfd-1c06-43f2-9ae5-c706e0b19fa5...
[DB] [Query 7d2550f1-07a5-4613-a660-f99b73b883ac] Before query execution: {
  state: 'closed',
  failures: 0,
  consecutiveSuccesses: 9,
  threshold: 10,
  lastFailure: null,
  openUntil: null
}
[DB] Acquiring client for query 7d2550f1-07a5-4613-a660-f99b73b883ac...
[PASS] Client acquired for query 7d2550f1-07a5-4613-a660-f99b73b883ac in 1ms
[QUERY] Query 7d2550f1-07a5-4613-a660-f99b73b883ac:
      SELECT
        job_id,
        job_type,
        status,
        total_p...
[PASS] Query 7d2550f1-07a5-4613-a660-f99b73b883ac completed in 305ms, rows: 20
[TREND] Consecutive successes: 10/10
[DB] [Circuit Breaker] Circuit breaker RESET: {
  state: 'closed',
  failures: 0,
  consecutiveSuccesses: 0,
  threshold: 10,
  lastFailure: null,
  openUntil: null
}
[RELEASE] Client released for query 7d2550f1-07a5-4613-a660-f99b73b883ac (destroyed: false)
 GET /api/tag/ai-tagging/jobs?limit=20 200 in 426ms
[PASS] New client connected to enterprise pool
[PASS] Client acquired for query 74192bfd-1c06-43f2-9ae5-c706e0b19fa5 in 932ms
[QUERY] Query 74192bfd-1c06-43f2-9ae5-c706e0b19fa5:
      UPDATE core.supplier_product
      SET
        ai_tagging_status = $2,
 ...
[PASS] Query 74192bfd-1c06-43f2-9ae5-c706e0b19fa5 completed in 305ms, rows: 1
[TREND] Consecutive successes: 1/10
[WAIT] Circuit breaker reset pending: 1/10 consecutive successes
[RELEASE] Client released for query 74192bfd-1c06-43f2-9ae5-c706e0b19fa5 (destroyed: false)
[DB] [Query e18844a2-bcde-4cb8-8e75-a11663444a98] Before query execution: {
  state: 'closed',
  failures: 9,
  consecutiveSuccesses: 1,
  threshold: 10,
  lastFailure: '2025-11-29T18:01:33.305Z',
  openUntil: null
}
[DB] Acquiring client for query e18844a2-bcde-4cb8-8e75-a11663444a98...
[PASS] Client acquired for query e18844a2-bcde-4cb8-8e75-a11663444a98 in 1ms
[QUERY] Query e18844a2-bcde-4cb8-8e75-a11663444a98:
      WITH upsert AS (
        INSERT INTO core.ai_tag_proposal (
          org...
[FAIL] Query e18844a2-bcde-4cb8-8e75-a11663444a98 attempt 1/4 failed after 152ms: column "tag_proposal_id" does not exist
[BLOCKED] Non-retryable error detected for query e18844a2-bcde-4cb8-8e75-a11663444a98, aborting retries
[RELEASE] Client released for query e18844a2-bcde-4cb8-8e75-a11663444a98 (destroyed: true)
[TaggingEngine] Failed to record tag proposal {
  jobId: 'd0461adc-541c-4eaa-8e9e-ef6169baa32c',
  productId: '01a9b309-db3c-43c9-a71e-de474ae2c70a',
  productName: 'Radial JPC Active DI, stereo inputs for laptops & CD players, phantom powered',
  provider: 'unknown',
  model: 'unknown',
  proposedTag: 'Brand: Radial',
  confidence: 0.99,
  dbError: 'Query failed after 4 attempts: column "tag_proposal_id" does not exist',
  timestamp: '2025-11-29T18:01:34.702Z'
}
[DB] [Query 502578d3-a8e6-4b2d-877d-fd4168f83e21] Before query execution: {
  state: 'closed',
  failures: 10,
  consecutiveSuccesses: 0,
  threshold: 10,
  lastFailure: '2025-11-29T18:01:34.701Z',
  openUntil: null
}
[DB] Acquiring client for query 502578d3-a8e6-4b2d-877d-fd4168f83e21...
[DB] [Query 2139b4c4-fb79-4b6b-a9bc-fcab22621463] Before query execution: {
  state: 'closed',
  failures: 0,
  consecutiveSuccesses: 0,
  threshold: 10,
  lastFailure: null,
  openUntil: null
}
[DB] Acquiring client for query 2139b4c4-fb79-4b6b-a9bc-fcab22621463...
[PASS] Client acquired for query 2139b4c4-fb79-4b6b-a9bc-fcab22621463 in 1ms
[QUERY] Query 2139b4c4-fb79-4b6b-a9bc-fcab22621463:
      SELECT
        job_id,
        job_type,
        status,
        total_p...
[PASS] Query 2139b4c4-fb79-4b6b-a9bc-fcab22621463 completed in 153ms, rows: 1
[TREND] Consecutive successes: 1/10
[WAIT] Circuit breaker reset pending: 1/10 consecutive successes
[RELEASE] Client released for query 2139b4c4-fb79-4b6b-a9bc-fcab22621463 (destroyed: false)
[DB] [Query 0b5bfe51-637a-4e0a-9ec6-b60d4f45f6e7] Before query execution: {
  state: 'closed',
  failures: 0,
  consecutiveSuccesses: 1,
  threshold: 10,
  lastFailure: null,
  openUntil: null
}
[DB] Acquiring client for query 0b5bfe51-637a-4e0a-9ec6-b60d4f45f6e7...
[PASS] Client acquired for query 0b5bfe51-637a-4e0a-9ec6-b60d4f45f6e7 in 0ms
[QUERY] Query 0b5bfe51-637a-4e0a-9ec6-b60d4f45f6e7:
      WITH batch_stats AS (
        SELECT
          COUNT(*) as completed_bat...
[PASS] Query 0b5bfe51-637a-4e0a-9ec6-b60d4f45f6e7 completed in 154ms, rows: 1
[TREND] Consecutive successes: 2/10
[WAIT] Circuit breaker reset pending: 2/10 consecutive successes
[RELEASE] Client released for query 0b5bfe51-637a-4e0a-9ec6-b60d4f45f6e7 (destroyed: false)
[DB] [Query 5f87c6ad-03ce-4609-9c85-886758f1f42f] Before query execution: {
  state: 'closed',
  failures: 0,
  consecutiveSuccesses: 2,
  threshold: 10,
  lastFailure: null,
  openUntil: null
}
[DB] Acquiring client for query 5f87c6ad-03ce-4609-9c85-886758f1f42f...
[PASS] Client acquired for query 5f87c6ad-03ce-4609-9c85-886758f1f42f in 1ms
[QUERY] Query 5f87c6ad-03ce-4609-9c85-886758f1f42f:
      SELECT
        batch_number,
        error_message,
        products_in_...
[PASS] Query 5f87c6ad-03ce-4609-9c85-886758f1f42f completed in 155ms, rows: 0
[TREND] Consecutive successes: 3/10
[WAIT] Circuit breaker reset pending: 3/10 consecutive successes
[RELEASE] Client released for query 5f87c6ad-03ce-4609-9c85-886758f1f42f (destroyed: false)
[DB] [Query 7030b5bc-53e3-4f52-8d5a-b1ce6e37dea0] Before query execution: {
  state: 'closed',
  failures: 0,
  consecutiveSuccesses: 3,
  threshold: 10,
  lastFailure: null,
  openUntil: null
}
[DB] Acquiring client for query 7030b5bc-53e3-4f52-8d5a-b1ce6e37dea0...
[PASS] Client acquired for query 7030b5bc-53e3-4f52-8d5a-b1ce6e37dea0 in 1ms
[QUERY] Query 7030b5bc-53e3-4f52-8d5a-b1ce6e37dea0:
      WITH batch_metrics AS (
        SELECT
          SUM(successful_count + ...
[PASS] Query 7030b5bc-53e3-4f52-8d5a-b1ce6e37dea0 completed in 153ms, rows: 1
[TREND] Consecutive successes: 4/10
[WAIT] Circuit breaker reset pending: 4/10 consecutive successes
[RELEASE] Client released for query 7030b5bc-53e3-4f52-8d5a-b1ce6e37dea0 (destroyed: false)
 GET /api/tag/ai-tagging/status/d0461adc-541c-4eaa-8e9e-ef6169baa32c 200 in 753ms
[PASS] New client connected to enterprise pool
[PASS] Client acquired for query 502578d3-a8e6-4b2d-877d-fd4168f83e21 in 945ms
[QUERY] Query 502578d3-a8e6-4b2d-877d-fd4168f83e21:
      UPDATE core.supplier_product
      SET
        ai_tagging_status = $2,
 ...
[PASS] Query 502578d3-a8e6-4b2d-877d-fd4168f83e21 completed in 311ms, rows: 1
[TREND] Consecutive successes: 1/10
[WAIT] Circuit breaker reset pending: 1/10 consecutive successes
[RELEASE] Client released for query 502578d3-a8e6-4b2d-877d-fd4168f83e21 (destroyed: false)
[DB] [Query db5d7bf2-d6c7-4537-8ca8-90f97e2daedf] Before query execution: {
  state: 'closed',
  failures: 10,
  consecutiveSuccesses: 1,
  threshold: 10,
  lastFailure: '2025-11-29T18:01:34.701Z',
  openUntil: null
}
[DB] Acquiring client for query db5d7bf2-d6c7-4537-8ca8-90f97e2daedf...
[PASS] Client acquired for query db5d7bf2-d6c7-4537-8ca8-90f97e2daedf in 0ms
[QUERY] Query db5d7bf2-d6c7-4537-8ca8-90f97e2daedf:
      WITH upsert AS (
        INSERT INTO core.ai_tag_proposal (
          org...
[FAIL] Query db5d7bf2-d6c7-4537-8ca8-90f97e2daedf attempt 1/4 failed after 155ms: column "tag_proposal_id" does not exist
[BLOCKED] Non-retryable error detected for query db5d7bf2-d6c7-4537-8ca8-90f97e2daedf, aborting retries
[RELEASE] Client released for query db5d7bf2-d6c7-4537-8ca8-90f97e2daedf (destroyed: true)
[TaggingEngine] Failed to record tag proposal {
  jobId: 'd0461adc-541c-4eaa-8e9e-ef6169baa32c',
  productId: '01a9b309-db3c-43c9-a71e-de474ae2c70a',
  productName: 'Radial JPC Active DI, stereo inputs for laptops & CD players, phantom powered',
  provider: 'unknown',
  model: 'unknown',
  proposedTag: 'PA Accessories',
  confidence: 0.98,
  dbError: 'Query failed after 4 attempts: column "tag_proposal_id" does not exist',
  timestamp: '2025-11-29T18:01:36.118Z'
}
[DB] [Query f4877e98-d5ff-4f32-af35-9dbb171441ef] Before query execution: {
  state: 'closed',
  failures: 11,
  consecutiveSuccesses: 0,
  threshold: 10,
  lastFailure: '2025-11-29T18:01:36.117Z',
  openUntil: null
}
[DB] Acquiring client for query f4877e98-d5ff-4f32-af35-9dbb171441ef...
[GUARD] Setting up database cleanup handlers...
[PASS] Cleanup handlers registered successfully
[READY] Unified database connection updated with enterprise manager
[PASS] New client connected to enterprise pool
[PASS] Client acquired for query f4877e98-d5ff-4f32-af35-9dbb171441ef in 926ms
[QUERY] Query f4877e98-d5ff-4f32-af35-9dbb171441ef:
      UPDATE core.supplier_product
      SET
        ai_tagging_status = $2,
 ...
[PASS] Query f4877e98-d5ff-4f32-af35-9dbb171441ef completed in 306ms, rows: 1
[TREND] Consecutive successes: 1/10
[WAIT] Circuit breaker reset pending: 1/10 consecutive successes
[RELEASE] Client released for query f4877e98-d5ff-4f32-af35-9dbb171441ef (destroyed: false)
[DB] [Query cf25e970-2346-4f57-a432-e30fe13cea27] Before query execution: {
  state: 'closed',
  failures: 11,
  consecutiveSuccesses: 1,
  threshold: 10,
  lastFailure: '2025-11-29T18:01:36.117Z',
  openUntil: null
}
[DB] Acquiring client for query cf25e970-2346-4f57-a432-e30fe13cea27...
[PASS] Client acquired for query cf25e970-2346-4f57-a432-e30fe13cea27 in 0ms
[QUERY] Query cf25e970-2346-4f57-a432-e30fe13cea27:
      WITH upsert AS (
        INSERT INTO core.ai_tag_proposal (
          org...
[FAIL] Query cf25e970-2346-4f57-a432-e30fe13cea27 attempt 1/4 failed after 153ms: column "tag_proposal_id" does not exist
[BLOCKED] Non-retryable error detected for query cf25e970-2346-4f57-a432-e30fe13cea27, aborting retries
[RELEASE] Client released for query cf25e970-2346-4f57-a432-e30fe13cea27 (destroyed: true)
[TaggingEngine] Failed to record tag proposal {
  jobId: 'd0461adc-541c-4eaa-8e9e-ef6169baa32c',
  productId: '01a9b309-db3c-43c9-a71e-de474ae2c70a',
  productName: 'Radial JPC Active DI, stereo inputs for laptops & CD players, phantom powered',
  provider: 'unknown',
  model: 'unknown',
  proposedTag: 'Active DI Box',
  confidence: 0.99,
  dbError: 'Query failed after 4 attempts: column "tag_proposal_id" does not exist',
  timestamp: '2025-11-29T18:01:37.508Z'
}
[DB] [Query 12ed97c6-4d56-4ebc-a04f-1521439156c0] Before query execution: {
  state: 'closed',
  failures: 12,
  consecutiveSuccesses: 0,
  threshold: 10,
  lastFailure: '2025-11-29T18:01:37.508Z',
  openUntil: null
}
[DB] Acquiring client for query 12ed97c6-4d56-4ebc-a04f-1521439156c0...
[DB] [Query a3bfc7df-199d-42f4-bda6-a28c7dc6fa1b] Before query execution: {
  state: 'closed',
  failures: 0,
  consecutiveSuccesses: 4,
  threshold: 10,
  lastFailure: null,
  openUntil: null
}
[DB] Acquiring client for query a3bfc7df-199d-42f4-bda6-a28c7dc6fa1b...
[PASS] Client acquired for query a3bfc7df-199d-42f4-bda6-a28c7dc6fa1b in 1ms
[QUERY] Query a3bfc7df-199d-42f4-bda6-a28c7dc6fa1b:
      SELECT
        job_id,
        job_type,
        status,
        total_p...
[PASS] Query a3bfc7df-199d-42f4-bda6-a28c7dc6fa1b completed in 155ms, rows: 1
[TREND] Consecutive successes: 5/10
[WAIT] Circuit breaker reset pending: 5/10 consecutive successes
[RELEASE] Client released for query a3bfc7df-199d-42f4-bda6-a28c7dc6fa1b (destroyed: false)
[DB] [Query 77e40d27-93d3-41a2-8b1f-e4edb71202bb] Before query execution: {
  state: 'closed',
  failures: 0,
  consecutiveSuccesses: 5,
  threshold: 10,
  lastFailure: null,
  openUntil: null
}
[DB] Acquiring client for query 77e40d27-93d3-41a2-8b1f-e4edb71202bb...
[PASS] Client acquired for query 77e40d27-93d3-41a2-8b1f-e4edb71202bb in 1ms
[QUERY] Query 77e40d27-93d3-41a2-8b1f-e4edb71202bb:
      WITH batch_stats AS (
        SELECT
          COUNT(*) as completed_bat...
[PASS] Query 77e40d27-93d3-41a2-8b1f-e4edb71202bb completed in 154ms, rows: 1
[TREND] Consecutive successes: 6/10
[WAIT] Circuit breaker reset pending: 6/10 consecutive successes
[RELEASE] Client released for query 77e40d27-93d3-41a2-8b1f-e4edb71202bb (destroyed: false)
[DB] [Query 670611f3-a422-4a24-8265-7c00fe82493b] Before query execution: {
  state: 'closed',
  failures: 0,
  consecutiveSuccesses: 6,
  threshold: 10,
  lastFailure: null,
  openUntil: null
}
[DB] Acquiring client for query 670611f3-a422-4a24-8265-7c00fe82493b...
[PASS] Client acquired for query 670611f3-a422-4a24-8265-7c00fe82493b in 0ms
[QUERY] Query 670611f3-a422-4a24-8265-7c00fe82493b:
      SELECT
        batch_number,
        error_message,
        products_in_...
[PASS] Query 670611f3-a422-4a24-8265-7c00fe82493b completed in 153ms, rows: 0
[TREND] Consecutive successes: 7/10
[WAIT] Circuit breaker reset pending: 7/10 consecutive successes
[RELEASE] Client released for query 670611f3-a422-4a24-8265-7c00fe82493b (destroyed: false)
[DB] [Query b2516b12-5892-43aa-b715-bc70bfe58503] Before query execution: {
  state: 'closed',
  failures: 0,
  consecutiveSuccesses: 7,
  threshold: 10,
  lastFailure: null,
  openUntil: null
}
[DB] Acquiring client for query b2516b12-5892-43aa-b715-bc70bfe58503...
[PASS] Client acquired for query b2516b12-5892-43aa-b715-bc70bfe58503 in 1ms
[QUERY] Query b2516b12-5892-43aa-b715-bc70bfe58503:
      WITH batch_metrics AS (
        SELECT
          SUM(successful_count + ...
[PASS] New client connected to enterprise pool
[PASS] Client acquired for query 12ed97c6-4d56-4ebc-a04f-1521439156c0 in 938ms
[QUERY] Query 12ed97c6-4d56-4ebc-a04f-1521439156c0:
      UPDATE core.supplier_product
      SET
        ai_tagging_status = $2,
 ...
[PASS] Query b2516b12-5892-43aa-b715-bc70bfe58503 completed in 153ms, rows: 1
[TREND] Consecutive successes: 8/10
[WAIT] Circuit breaker reset pending: 8/10 consecutive successes
[RELEASE] Client released for query b2516b12-5892-43aa-b715-bc70bfe58503 (destroyed: false)
 GET /api/tag/ai-tagging/status/d0461adc-541c-4eaa-8e9e-ef6169baa32c 200 in 764ms
[PASS] Query 12ed97c6-4d56-4ebc-a04f-1521439156c0 completed in 318ms, rows: 1
[TREND] Consecutive successes: 1/10
[WAIT] Circuit breaker reset pending: 1/10 consecutive successes
[RELEASE] Client released for query 12ed97c6-4d56-4ebc-a04f-1521439156c0 (destroyed: false)
[DB] [Query 4f7f03a6-42c0-40ee-8b02-eb60b2d2306f] Before query execution: {
  state: 'closed',
  failures: 12,
  consecutiveSuccesses: 1,
  threshold: 10,
  lastFailure: '2025-11-29T18:01:37.508Z',
  openUntil: null
}
[DB] Acquiring client for query 4f7f03a6-42c0-40ee-8b02-eb60b2d2306f...
[PASS] Client acquired for query 4f7f03a6-42c0-40ee-8b02-eb60b2d2306f in 1ms
[QUERY] Query 4f7f03a6-42c0-40ee-8b02-eb60b2d2306f:
      WITH upsert AS (
        INSERT INTO core.ai_tag_proposal (
          org...
[DB] [Query 0a6b1dac-92d2-4328-9745-f7a63160e549] Before query execution: {
  state: 'closed',
  failures: 0,
  consecutiveSuccesses: 8,
  threshold: 10,
  lastFailure: null,
  openUntil: null
}
[DB] Acquiring client for query 0a6b1dac-92d2-4328-9745-f7a63160e549...
[PASS] Client acquired for query 0a6b1dac-92d2-4328-9745-f7a63160e549 in 0ms
[QUERY] Query 0a6b1dac-92d2-4328-9745-f7a63160e549:
      SELECT
        job_id,
        job_type,
        status,
        total_p...
[FAIL] Query 4f7f03a6-42c0-40ee-8b02-eb60b2d2306f attempt 1/4 failed after 154ms: column "tag_proposal_id" does not exist
[BLOCKED] Non-retryable error detected for query 4f7f03a6-42c0-40ee-8b02-eb60b2d2306f, aborting retries
[RELEASE] Client released for query 4f7f03a6-42c0-40ee-8b02-eb60b2d2306f (destroyed: true)
[TaggingEngine] Failed to record tag proposal {
  jobId: 'd0461adc-541c-4eaa-8e9e-ef6169baa32c',
  productId: '01a9b309-db3c-43c9-a71e-de474ae2c70a',
  productName: 'Radial JPC Active DI, stereo inputs for laptops & CD players, phantom powered',
  provider: 'unknown',
  model: 'unknown',
  proposedTag: 'Stereo Inputs',
  confidence: 0.97,
  dbError: 'Query failed after 4 attempts: column "tag_proposal_id" does not exist',
  timestamp: '2025-11-29T18:01:38.923Z'
}
[DB] [Query d729a756-3355-43a6-a430-7268ca3fc112] Before query execution: {
  state: 'closed',
  failures: 13,
  consecutiveSuccesses: 0,
  threshold: 10,
  lastFailure: '2025-11-29T18:01:38.922Z',
  openUntil: null
}
[DB] Acquiring client for query d729a756-3355-43a6-a430-7268ca3fc112...
[PASS] Query 0a6b1dac-92d2-4328-9745-f7a63160e549 completed in 306ms, rows: 20
[TREND] Consecutive successes: 9/10
[WAIT] Circuit breaker reset pending: 9/10 consecutive successes
[RELEASE] Client released for query 0a6b1dac-92d2-4328-9745-f7a63160e549 (destroyed: false)
 GET /api/tag/ai-tagging/jobs?limit=20 200 in 481ms
[GUARD] Setting up database cleanup handlers...
[PASS] Cleanup handlers registered successfully
[READY] Unified database connection updated with enterprise manager
[PASS] New client connected to enterprise pool
[PASS] Client acquired for query d729a756-3355-43a6-a430-7268ca3fc112 in 926ms
[QUERY] Query d729a756-3355-43a6-a430-7268ca3fc112:
      UPDATE core.supplier_product
      SET
        ai_tagging_status = $2,
 ...
[PASS] Query d729a756-3355-43a6-a430-7268ca3fc112 completed in 307ms, rows: 1
[TREND] Consecutive successes: 1/10
[WAIT] Circuit breaker reset pending: 1/10 consecutive successes
[RELEASE] Client released for query d729a756-3355-43a6-a430-7268ca3fc112 (destroyed: false)
[DB] [Query 4a56360b-a4ef-4bb2-87e1-f124fdfa5b15] Before query execution: {
  state: 'closed',
  failures: 13,
  consecutiveSuccesses: 1,
  threshold: 10,
  lastFailure: '2025-11-29T18:01:38.922Z',
  openUntil: null
}
[DB] Acquiring client for query 4a56360b-a4ef-4bb2-87e1-f124fdfa5b15...
[PASS] Client acquired for query 4a56360b-a4ef-4bb2-87e1-f124fdfa5b15 in 1ms
[QUERY] Query 4a56360b-a4ef-4bb2-87e1-f124fdfa5b15:
      WITH upsert AS (
        INSERT INTO core.ai_tag_proposal (
          org...
[FAIL] Query 4a56360b-a4ef-4bb2-87e1-f124fdfa5b15 attempt 1/4 failed after 152ms: column "tag_proposal_id" does not exist
[BLOCKED] Non-retryable error detected for query 4a56360b-a4ef-4bb2-87e1-f124fdfa5b15, aborting retries
[RELEASE] Client released for query 4a56360b-a4ef-4bb2-87e1-f124fdfa5b15 (destroyed: true)
[TaggingEngine] Failed to record tag proposal {
  jobId: 'd0461adc-541c-4eaa-8e9e-ef6169baa32c',
  productId: '01a9b309-db3c-43c9-a71e-de474ae2c70a',
  productName: 'Radial JPC Active DI, stereo inputs for laptops & CD players, phantom powered',
  provider: 'unknown',
  model: 'unknown',
  proposedTag: 'Phantom Powered',
  confidence: 0.99,
  dbError: 'Query failed after 4 attempts: column "tag_proposal_id" does not exist',
  timestamp: '2025-11-29T18:01:40.313Z'
}
[DB] [Query fdb6b7a1-bfe8-45b9-8197-7fdc3fc2db9f] Before query execution: {
  state: 'closed',
  failures: 14,
  consecutiveSuccesses: 0,
  threshold: 10,
  lastFailure: '2025-11-29T18:01:40.312Z',
  openUntil: null
}
[DB] Acquiring client for query fdb6b7a1-bfe8-45b9-8197-7fdc3fc2db9f...
[DB] [Query b2cb17b9-e480-4f3b-bafa-2f00209a788a] Before query execution: {
  state: 'closed',
  failures: 0,
  consecutiveSuccesses: 9,
  threshold: 10,
  lastFailure: null,
  openUntil: null
}
[DB] Acquiring client for query b2cb17b9-e480-4f3b-bafa-2f00209a788a...
[PASS] Client acquired for query b2cb17b9-e480-4f3b-bafa-2f00209a788a in 0ms
[QUERY] Query b2cb17b9-e480-4f3b-bafa-2f00209a788a:
      SELECT
        job_id,
        job_type,
        status,
        total_p...
[PASS] Query b2cb17b9-e480-4f3b-bafa-2f00209a788a completed in 153ms, rows: 1
[TREND] Consecutive successes: 10/10
[DB] [Circuit Breaker] Circuit breaker RESET: {
  state: 'closed',
  failures: 0,
  consecutiveSuccesses: 0,
  threshold: 10,
  lastFailure: null,
  openUntil: null
}
[RELEASE] Client released for query b2cb17b9-e480-4f3b-bafa-2f00209a788a (destroyed: false)
[DB] [Query e4edd4b1-fcab-4ba7-9ea1-55241be5ed79] Before query execution: {
  state: 'closed',
  failures: 0,
  consecutiveSuccesses: 0,
  threshold: 10,
  lastFailure: null,
  openUntil: null
}
[DB] Acquiring client for query e4edd4b1-fcab-4ba7-9ea1-55241be5ed79...
[PASS] Client acquired for query e4edd4b1-fcab-4ba7-9ea1-55241be5ed79 in 1ms
[QUERY] Query e4edd4b1-fcab-4ba7-9ea1-55241be5ed79:
      WITH batch_stats AS (
        SELECT
          COUNT(*) as completed_bat...
[PASS] Query e4edd4b1-fcab-4ba7-9ea1-55241be5ed79 completed in 154ms, rows: 1
[TREND] Consecutive successes: 1/10
[WAIT] Circuit breaker reset pending: 1/10 consecutive successes
[RELEASE] Client released for query e4edd4b1-fcab-4ba7-9ea1-55241be5ed79 (destroyed: false)
[DB] [Query 50fe8eda-1d75-4ebb-8602-5ec8a63425fd] Before query execution: {
  state: 'closed',
  failures: 0,
  consecutiveSuccesses: 1,
  threshold: 10,
  lastFailure: null,
  openUntil: null
}
[DB] Acquiring client for query 50fe8eda-1d75-4ebb-8602-5ec8a63425fd...
[PASS] Client acquired for query 50fe8eda-1d75-4ebb-8602-5ec8a63425fd in 0ms
[QUERY] Query 50fe8eda-1d75-4ebb-8602-5ec8a63425fd:
      SELECT
        batch_number,
        error_message,
        products_in_...
[PASS] New client connected to enterprise pool
[PASS] Client acquired for query fdb6b7a1-bfe8-45b9-8197-7fdc3fc2db9f in 931ms
[QUERY] Query fdb6b7a1-bfe8-45b9-8197-7fdc3fc2db9f:
      UPDATE core.supplier_product
      SET
        ai_tagging_status = $2,
 ...
[PASS] Query 50fe8eda-1d75-4ebb-8602-5ec8a63425fd completed in 153ms, rows: 0
[TREND] Consecutive successes: 2/10
[WAIT] Circuit breaker reset pending: 2/10 consecutive successes
[RELEASE] Client released for query 50fe8eda-1d75-4ebb-8602-5ec8a63425fd (destroyed: false)
[DB] [Query c293919b-32bb-42f6-b896-8f548726fe22] Before query execution: {
  state: 'closed',
  failures: 0,
  consecutiveSuccesses: 2,
  threshold: 10,
  lastFailure: null,
  openUntil: null
}
[DB] Acquiring client for query c293919b-32bb-42f6-b896-8f548726fe22...
[PASS] Client acquired for query c293919b-32bb-42f6-b896-8f548726fe22 in 1ms
[QUERY] Query c293919b-32bb-42f6-b896-8f548726fe22:
      WITH batch_metrics AS (
        SELECT
          SUM(successful_count + ...
[PASS] Query c293919b-32bb-42f6-b896-8f548726fe22 completed in 153ms, rows: 1
[TREND] Consecutive successes: 3/10
[WAIT] Circuit breaker reset pending: 3/10 consecutive successes
[RELEASE] Client released for query c293919b-32bb-42f6-b896-8f548726fe22 (destroyed: false)
 GET /api/tag/ai-tagging/status/d0461adc-541c-4eaa-8e9e-ef6169baa32c 200 in 757ms
[PASS] Query fdb6b7a1-bfe8-45b9-8197-7fdc3fc2db9f completed in 308ms, rows: 1
[TREND] Consecutive successes: 1/10
[WAIT] Circuit breaker reset pending: 1/10 consecutive successes
[RELEASE] Client released for query fdb6b7a1-bfe8-45b9-8197-7fdc3fc2db9f (destroyed: false)
[DB] [Query 0c90a4c7-24d5-4bc2-80ae-583ca9ec7eff] Before query execution: {
  state: 'closed',
  failures: 14,
  consecutiveSuccesses: 1,
  threshold: 10,
  lastFailure: '2025-11-29T18:01:40.312Z',
  openUntil: null
}
[DB] Acquiring client for query 0c90a4c7-24d5-4bc2-80ae-583ca9ec7eff...
[PASS] Client acquired for query 0c90a4c7-24d5-4bc2-80ae-583ca9ec7eff in 0ms
[QUERY] Query 0c90a4c7-24d5-4bc2-80ae-583ca9ec7eff:
      WITH upsert AS (
        INSERT INTO core.ai_tag_proposal (
          org...
[FAIL] Query 0c90a4c7-24d5-4bc2-80ae-583ca9ec7eff attempt 1/4 failed after 154ms: column "tag_proposal_id" does not exist
[BLOCKED] Non-retryable error detected for query 0c90a4c7-24d5-4bc2-80ae-583ca9ec7eff, aborting retries
[RELEASE] Client released for query 0c90a4c7-24d5-4bc2-80ae-583ca9ec7eff (destroyed: true)
[TaggingEngine] Failed to record tag proposal {
  jobId: 'd0461adc-541c-4eaa-8e9e-ef6169baa32c',
  productId: '01a9b309-db3c-43c9-a71e-de474ae2c70a',
  productName: 'Radial JPC Active DI, stereo inputs for laptops & CD players, phantom powered',
  provider: 'unknown',
  model: 'unknown',
  proposedTag: 'Laptop Audio Interface for PA',
  confidence: 0.9,
  dbError: 'Query failed after 4 attempts: column "tag_proposal_id" does not exist',
  timestamp: '2025-11-29T18:01:41.713Z'
}
[DB] [Query 9620e09c-ee57-404b-8051-32713f31346d] Before query execution: {
  state: 'closed',
  failures: 15,
  consecutiveSuccesses: 0,
  threshold: 10,
  lastFailure: '2025-11-29T18:01:41.712Z',
  openUntil: null
}
[DB] Acquiring client for query 9620e09c-ee57-404b-8051-32713f31346d...
[GUARD] Setting up database cleanup handlers...
[PASS] Cleanup handlers registered successfully
[READY] Unified database connection updated with enterprise manager
[PASS] New client connected to enterprise pool
[PASS] Client acquired for query 9620e09c-ee57-404b-8051-32713f31346d in 938ms
[QUERY] Query 9620e09c-ee57-404b-8051-32713f31346d:
      UPDATE core.supplier_product
      SET
        ai_tagging_status = $2,
 ...
[PASS] Query 9620e09c-ee57-404b-8051-32713f31346d completed in 311ms, rows: 1
[TREND] Consecutive successes: 1/10
[WAIT] Circuit breaker reset pending: 1/10 consecutive successes
[RELEASE] Client released for query 9620e09c-ee57-404b-8051-32713f31346d (destroyed: false)
[DB] [Query 349deaa8-b0b1-47ea-a0e0-eb88e4abefb5] Before query execution: {
  state: 'closed',
  failures: 15,
  consecutiveSuccesses: 1,
  threshold: 10,
  lastFailure: '2025-11-29T18:01:41.712Z',
  openUntil: null
}
[DB] Acquiring client for query 349deaa8-b0b1-47ea-a0e0-eb88e4abefb5...
[PASS] Client acquired for query 349deaa8-b0b1-47ea-a0e0-eb88e4abefb5 in 0ms
[QUERY] Query 349deaa8-b0b1-47ea-a0e0-eb88e4abefb5:
      WITH upsert AS (
        INSERT INTO core.ai_tag_proposal (
          org...
[FAIL] Query 349deaa8-b0b1-47ea-a0e0-eb88e4abefb5 attempt 1/4 failed after 155ms: column "tag_proposal_id" does not exist
[BLOCKED] Non-retryable error detected for query 349deaa8-b0b1-47ea-a0e0-eb88e4abefb5, aborting retries
[RELEASE] Client released for query 349deaa8-b0b1-47ea-a0e0-eb88e4abefb5 (destroyed: true)
[TaggingEngine] Failed to record tag proposal {
  jobId: 'd0461adc-541c-4eaa-8e9e-ef6169baa32c',
  productId: '01a9b309-db3c-43c9-a71e-de474ae2c70a',
  productName: 'Radial JPC Active DI, stereo inputs for laptops & CD players, phantom powered',
  provider: 'unknown',
  model: 'unknown',
  proposedTag: 'Pro Audio',
  confidence: 0.92,
  dbError: 'Query failed after 4 attempts: column "tag_proposal_id" does not exist',
  timestamp: '2025-11-29T18:01:43.122Z'
}
[DB] [Query 88e4c7e8-21ee-4216-b670-d546cc733baf] Before query execution: {
  state: 'closed',
  failures: 16,
  consecutiveSuccesses: 0,
  threshold: 10,
  lastFailure: '2025-11-29T18:01:43.121Z',
  openUntil: null
}
[DB] Acquiring client for query 88e4c7e8-21ee-4216-b670-d546cc733baf...
[DB] [Query 8b698d6b-91e6-4758-a877-2df3fa4b6f22] Before query execution: {
  state: 'closed',
  failures: 0,
  consecutiveSuccesses: 3,
  threshold: 10,
  lastFailure: null,
  openUntil: null
}
[DB] Acquiring client for query 8b698d6b-91e6-4758-a877-2df3fa4b6f22...
[PASS] Client acquired for query 8b698d6b-91e6-4758-a877-2df3fa4b6f22 in 1ms
[QUERY] Query 8b698d6b-91e6-4758-a877-2df3fa4b6f22:
      SELECT
        job_id,
        job_type,
        status,
        total_p...
[DB] [Query 747b3cb8-bb1f-4cdd-ba1f-4ab704ac5049] Before query execution: {
  state: 'closed',
  failures: 0,
  consecutiveSuccesses: 3,
  threshold: 10,
  lastFailure: null,
  openUntil: null
}
[DB] Acquiring client for query 747b3cb8-bb1f-4cdd-ba1f-4ab704ac5049...
[PASS] Client acquired for query 747b3cb8-bb1f-4cdd-ba1f-4ab704ac5049 in 2ms
[QUERY] Query 747b3cb8-bb1f-4cdd-ba1f-4ab704ac5049:
      SELECT
        job_id,
        job_type,
        status,
        total_p...
[PASS] Query 747b3cb8-bb1f-4cdd-ba1f-4ab704ac5049 completed in 153ms, rows: 1
[TREND] Consecutive successes: 4/10
[WAIT] Circuit breaker reset pending: 4/10 consecutive successes
[RELEASE] Client released for query 747b3cb8-bb1f-4cdd-ba1f-4ab704ac5049 (destroyed: false)
[DB] [Query a81614e6-ff5c-448c-980e-06d2169ee8c8] Before query execution: {
  state: 'closed',
  failures: 0,
  consecutiveSuccesses: 4,
  threshold: 10,
  lastFailure: null,
  openUntil: null
}
[DB] Acquiring client for query a81614e6-ff5c-448c-980e-06d2169ee8c8...
[PASS] Client acquired for query a81614e6-ff5c-448c-980e-06d2169ee8c8 in 0ms
[QUERY] Query a81614e6-ff5c-448c-980e-06d2169ee8c8:
      WITH batch_stats AS (
        SELECT
          COUNT(*) as completed_bat...
[PASS] New client connected to enterprise pool
[PASS] Client acquired for query 88e4c7e8-21ee-4216-b670-d546cc733baf in 943ms
[QUERY] Query 88e4c7e8-21ee-4216-b670-d546cc733baf:
      UPDATE core.supplier_product
      SET
        ai_tagging_status = $2,
 ...
[PASS] Query 8b698d6b-91e6-4758-a877-2df3fa4b6f22 completed in 305ms, rows: 20
[TREND] Consecutive successes: 5/10
[WAIT] Circuit breaker reset pending: 5/10 consecutive successes
[RELEASE] Client released for query 8b698d6b-91e6-4758-a877-2df3fa4b6f22 (destroyed: false)
 GET /api/tag/ai-tagging/jobs?limit=20 200 in 419ms
[PASS] Query a81614e6-ff5c-448c-980e-06d2169ee8c8 completed in 153ms, rows: 1
[TREND] Consecutive successes: 6/10
[WAIT] Circuit breaker reset pending: 6/10 consecutive successes
[RELEASE] Client released for query a81614e6-ff5c-448c-980e-06d2169ee8c8 (destroyed: false)
[DB] [Query 031c4b72-e914-4600-8087-52b89b336262] Before query execution: {
  state: 'closed',
  failures: 0,
  consecutiveSuccesses: 6,
  threshold: 10,
  lastFailure: null,
  openUntil: null
}
[DB] Acquiring client for query 031c4b72-e914-4600-8087-52b89b336262...
[PASS] Client acquired for query 031c4b72-e914-4600-8087-52b89b336262 in 1ms
[QUERY] Query 031c4b72-e914-4600-8087-52b89b336262:
      SELECT
        batch_number,
        error_message,
        products_in_...
[PASS] Query 031c4b72-e914-4600-8087-52b89b336262 completed in 153ms, rows: 0
[TREND] Consecutive successes: 7/10
[WAIT] Circuit breaker reset pending: 7/10 consecutive successes
[RELEASE] Client released for query 031c4b72-e914-4600-8087-52b89b336262 (destroyed: false)
[DB] [Query 14b5c093-65a8-45de-9bc0-e644ec402070] Before query execution: {
  state: 'closed',
  failures: 0,
  consecutiveSuccesses: 7,
  threshold: 10,
  lastFailure: null,
  openUntil: null
}
[DB] Acquiring client for query 14b5c093-65a8-45de-9bc0-e644ec402070...
[PASS] Client acquired for query 14b5c093-65a8-45de-9bc0-e644ec402070 in 0ms
[QUERY] Query 14b5c093-65a8-45de-9bc0-e644ec402070:
      WITH batch_metrics AS (
        SELECT
          SUM(successful_count + ...
[PASS] Query 88e4c7e8-21ee-4216-b670-d546cc733baf completed in 311ms, rows: 1
[TREND] Consecutive successes: 1/10
[WAIT] Circuit breaker reset pending: 1/10 consecutive successes
[RELEASE] Client released for query 88e4c7e8-21ee-4216-b670-d546cc733baf (destroyed: false)
[DB] [Query 5e1ade7c-dedf-4ad5-8476-06f1b99de6f9] Before query execution: {
  state: 'closed',
  failures: 16,
  consecutiveSuccesses: 1,
  threshold: 10,
  lastFailure: '2025-11-29T18:01:43.121Z',
  openUntil: null
}
[DB] Acquiring client for query 5e1ade7c-dedf-4ad5-8476-06f1b99de6f9...
[PASS] Client acquired for query 5e1ade7c-dedf-4ad5-8476-06f1b99de6f9 in 1ms
[QUERY] Query 5e1ade7c-dedf-4ad5-8476-06f1b99de6f9:
      WITH upsert AS (
        INSERT INTO core.ai_tag_proposal (
          org...
[PASS] Query 14b5c093-65a8-45de-9bc0-e644ec402070 completed in 153ms, rows: 1
[TREND] Consecutive successes: 8/10
[WAIT] Circuit breaker reset pending: 8/10 consecutive successes
[RELEASE] Client released for query 14b5c093-65a8-45de-9bc0-e644ec402070 (destroyed: false)
 GET /api/tag/ai-tagging/status/d0461adc-541c-4eaa-8e9e-ef6169baa32c 200 in 769ms
[FAIL] Query 5e1ade7c-dedf-4ad5-8476-06f1b99de6f9 attempt 1/4 failed after 154ms: column "tag_proposal_id" does not exist
[BLOCKED] Non-retryable error detected for query 5e1ade7c-dedf-4ad5-8476-06f1b99de6f9, aborting retries
[RELEASE] Client released for query 5e1ade7c-dedf-4ad5-8476-06f1b99de6f9 (destroyed: true)
[TaggingEngine] Failed to record tag proposal {
  jobId: 'd0461adc-541c-4eaa-8e9e-ef6169baa32c',
  productId: '01a9b309-db3c-43c9-a71e-de474ae2c70a',
  productName: 'Radial JPC Active DI, stereo inputs for laptops & CD players, phantom powered',
  provider: 'unknown',
  model: 'unknown',
  proposedTag: 'Live Sound',
  confidence: 0.9,
  dbError: 'Query failed after 4 attempts: column "tag_proposal_id" does not exist',
  timestamp: '2025-11-29T18:01:44.534Z'
}
[DB] [Query 5e1383b5-d62b-4673-b38a-c250d6bb4006] Before query execution: {
  state: 'closed',
  failures: 17,
  consecutiveSuccesses: 0,
  threshold: 10,
  lastFailure: '2025-11-29T18:01:44.534Z',
  openUntil: null
}
[DB] Acquiring client for query 5e1383b5-d62b-4673-b38a-c250d6bb4006...
[GUARD] Setting up database cleanup handlers...
[PASS] Cleanup handlers registered successfully
[READY] Unified database connection updated with enterprise manager
[PASS] New client connected to enterprise pool
[PASS] Client acquired for query 5e1383b5-d62b-4673-b38a-c250d6bb4006 in 927ms
[QUERY] Query 5e1383b5-d62b-4673-b38a-c250d6bb4006:
      UPDATE core.supplier_product
      SET
        ai_tagging_status = $2,
 ...
[PASS] Query 5e1383b5-d62b-4673-b38a-c250d6bb4006 completed in 307ms, rows: 1
[TREND] Consecutive successes: 1/10
[WAIT] Circuit breaker reset pending: 1/10 consecutive successes
[RELEASE] Client released for query 5e1383b5-d62b-4673-b38a-c250d6bb4006 (destroyed: false)
[DB] [Query ea75b2da-333e-422e-b1b6-1d5630ca6b28] Before query execution: {
  state: 'closed',
  failures: 17,
  consecutiveSuccesses: 1,
  threshold: 10,
  lastFailure: '2025-11-29T18:01:44.534Z',
  openUntil: null
}
[DB] Acquiring client for query ea75b2da-333e-422e-b1b6-1d5630ca6b28...
[PASS] Client acquired for query ea75b2da-333e-422e-b1b6-1d5630ca6b28 in 1ms
[QUERY] Query ea75b2da-333e-422e-b1b6-1d5630ca6b28:
      WITH upsert AS (
        INSERT INTO core.ai_tag_proposal (
          org...
[FAIL] Query ea75b2da-333e-422e-b1b6-1d5630ca6b28 attempt 1/4 failed after 154ms: column "tag_proposal_id" does not exist
[BLOCKED] Non-retryable error detected for query ea75b2da-333e-422e-b1b6-1d5630ca6b28, aborting retries
[RELEASE] Client released for query ea75b2da-333e-422e-b1b6-1d5630ca6b28 (destroyed: true)
[TaggingEngine] Failed to record tag proposal {
  jobId: 'd0461adc-541c-4eaa-8e9e-ef6169baa32c',
  productId: '02534e5e-54a3-42db-bc08-4457018c9937',
  productName: 'Elixir 16102 Acoustic Phosphor Bronze with NANOWEB Coating Medium (.013-.056',
  provider: 'unknown',
  model: 'unknown',
  proposedTag: 'Brand: Elixir Strings',
  confidence: 0.99,
  dbError: 'Query failed after 4 attempts: column "tag_proposal_id" does not exist',
  timestamp: '2025-11-29T18:01:45.928Z'
}
[DB] [Query bcde893c-e897-4e7a-8a33-479a4e13d342] Before query execution: {
  state: 'closed',
  failures: 18,
  consecutiveSuccesses: 0,
  threshold: 10,
  lastFailure: '2025-11-29T18:01:45.928Z',
  openUntil: null
}
[DB] Acquiring client for query bcde893c-e897-4e7a-8a33-479a4e13d342...
[DB] [Query 64473cc2-bfd1-4d84-ad43-fa9c224358e6] Before query execution: {
  state: 'closed',
  failures: 0,
  consecutiveSuccesses: 8,
  threshold: 10,
  lastFailure: null,
  openUntil: null
}
[DB] Acquiring client for query 64473cc2-bfd1-4d84-ad43-fa9c224358e6...
[PASS] Client acquired for query 64473cc2-bfd1-4d84-ad43-fa9c224358e6 in 1ms
[QUERY] Query 64473cc2-bfd1-4d84-ad43-fa9c224358e6:
      SELECT
        job_id,
        job_type,
        status,
        total_p...
[PASS] New client connected to enterprise pool
[PASS] Client acquired for query bcde893c-e897-4e7a-8a33-479a4e13d342 in 925ms
[QUERY] Query bcde893c-e897-4e7a-8a33-479a4e13d342:
      UPDATE core.supplier_product
      SET
        ai_tagging_status = $2,
 ...
[PASS] Query 64473cc2-bfd1-4d84-ad43-fa9c224358e6 completed in 153ms, rows: 1
[TREND] Consecutive successes: 9/10
[WAIT] Circuit breaker reset pending: 9/10 consecutive successes
[RELEASE] Client released for query 64473cc2-bfd1-4d84-ad43-fa9c224358e6 (destroyed: false)
[DB] [Query b7f08c54-a9c2-4fb0-b62b-79cffeacac99] Before query execution: {
  state: 'closed',
  failures: 0,
  consecutiveSuccesses: 9,
  threshold: 10,
  lastFailure: null,
  openUntil: null
}
[DB] Acquiring client for query b7f08c54-a9c2-4fb0-b62b-79cffeacac99...
[PASS] Client acquired for query b7f08c54-a9c2-4fb0-b62b-79cffeacac99 in 1ms
[QUERY] Query b7f08c54-a9c2-4fb0-b62b-79cffeacac99:
      WITH batch_stats AS (
        SELECT
          COUNT(*) as completed_bat...
[PASS] Query b7f08c54-a9c2-4fb0-b62b-79cffeacac99 completed in 154ms, rows: 1
[TREND] Consecutive successes: 10/10
[DB] [Circuit Breaker] Circuit breaker RESET: {
  state: 'closed',
  failures: 0,
  consecutiveSuccesses: 0,
  threshold: 10,
  lastFailure: null,
  openUntil: null
}
[RELEASE] Client released for query b7f08c54-a9c2-4fb0-b62b-79cffeacac99 (destroyed: false)
[DB] [Query 94d83790-6520-4308-af2b-dba4e88ed276] Before query execution: {
  state: 'closed',
  failures: 0,
  consecutiveSuccesses: 0,
  threshold: 10,
  lastFailure: null,
  openUntil: null
}
[DB] Acquiring client for query 94d83790-6520-4308-af2b-dba4e88ed276...
[PASS] Client acquired for query 94d83790-6520-4308-af2b-dba4e88ed276 in 1ms
[QUERY] Query 94d83790-6520-4308-af2b-dba4e88ed276:
      SELECT
        batch_number,
        error_message,
        products_in_...
[PASS] Query bcde893c-e897-4e7a-8a33-479a4e13d342 completed in 310ms, rows: 1
[TREND] Consecutive successes: 1/10
[WAIT] Circuit breaker reset pending: 1/10 consecutive successes
[RELEASE] Client released for query bcde893c-e897-4e7a-8a33-479a4e13d342 (destroyed: false)
[DB] [Query 2d0b19cb-0f38-434d-911d-2d22743c4964] Before query execution: {
  state: 'closed',
  failures: 18,
  consecutiveSuccesses: 1,
  threshold: 10,
  lastFailure: '2025-11-29T18:01:45.928Z',
  openUntil: null
}
[DB] Acquiring client for query 2d0b19cb-0f38-434d-911d-2d22743c4964...
[PASS] Client acquired for query 2d0b19cb-0f38-434d-911d-2d22743c4964 in 0ms
[QUERY] Query 2d0b19cb-0f38-434d-911d-2d22743c4964:
      WITH upsert AS (
        INSERT INTO core.ai_tag_proposal (
          org...
[PASS] Query 94d83790-6520-4308-af2b-dba4e88ed276 completed in 153ms, rows: 0
[TREND] Consecutive successes: 1/10
[WAIT] Circuit breaker reset pending: 1/10 consecutive successes
[RELEASE] Client released for query 94d83790-6520-4308-af2b-dba4e88ed276 (destroyed: false)
[DB] [Query 680e60c8-30bd-4207-9749-2ab99fdc2c08] Before query execution: {
  state: 'closed',
  failures: 0,
  consecutiveSuccesses: 1,
  threshold: 10,
  lastFailure: null,
  openUntil: null
}
[DB] Acquiring client for query 680e60c8-30bd-4207-9749-2ab99fdc2c08...
[PASS] Client acquired for query 680e60c8-30bd-4207-9749-2ab99fdc2c08 in 1ms
[QUERY] Query 680e60c8-30bd-4207-9749-2ab99fdc2c08:
      WITH batch_metrics AS (
        SELECT
          SUM(successful_count + ...
[FAIL] Query 2d0b19cb-0f38-434d-911d-2d22743c4964 attempt 1/4 failed after 157ms: column "tag_proposal_id" does not exist
[BLOCKED] Non-retryable error detected for query 2d0b19cb-0f38-434d-911d-2d22743c4964, aborting retries
[RELEASE] Client released for query 2d0b19cb-0f38-434d-911d-2d22743c4964 (destroyed: true)
[TaggingEngine] Failed to record tag proposal {
  jobId: 'd0461adc-541c-4eaa-8e9e-ef6169baa32c',
  productId: '02534e5e-54a3-42db-bc08-4457018c9937',
  productName: 'Elixir 16102 Acoustic Phosphor Bronze with NANOWEB Coating Medium (.013-.056',
  provider: 'unknown',
  model: 'unknown',
  proposedTag: 'Guitar Strings',
  confidence: 0.99,
  dbError: 'Query failed after 4 attempts: column "tag_proposal_id" does not exist',
  timestamp: '2025-11-29T18:01:47.325Z'
}
[DB] [Query 39c19d77-71d5-4960-ab80-4555f478f8ea] Before query execution: {
  state: 'closed',
  failures: 19,
  consecutiveSuccesses: 0,
  threshold: 10,
  lastFailure: '2025-11-29T18:01:47.325Z',
  openUntil: null
}
[DB] Acquiring client for query 39c19d77-71d5-4960-ab80-4555f478f8ea...
[PASS] Query 680e60c8-30bd-4207-9749-2ab99fdc2c08 completed in 153ms, rows: 1
[TREND] Consecutive successes: 2/10
[WAIT] Circuit breaker reset pending: 2/10 consecutive successes
[RELEASE] Client released for query 680e60c8-30bd-4207-9749-2ab99fdc2c08 (destroyed: false)
 GET /api/tag/ai-tagging/status/d0461adc-541c-4eaa-8e9e-ef6169baa32c 200 in 747ms
[GUARD] Setting up database cleanup handlers...
[PASS] Cleanup handlers registered successfully
[READY] Unified database connection updated with enterprise manager
[PASS] New client connected to enterprise pool
[PASS] Client acquired for query 39c19d77-71d5-4960-ab80-4555f478f8ea in 919ms
[QUERY] Query 39c19d77-71d5-4960-ab80-4555f478f8ea:
      UPDATE core.supplier_product
      SET
        ai_tagging_status = $2,
 ...
[PASS] Query 39c19d77-71d5-4960-ab80-4555f478f8ea completed in 303ms, rows: 1
[TREND] Consecutive successes: 1/10
[WAIT] Circuit breaker reset pending: 1/10 consecutive successes
[RELEASE] Client released for query 39c19d77-71d5-4960-ab80-4555f478f8ea (destroyed: false)
[DB] [Query 73d8f74f-cff1-4bc3-a1bb-dd7934b301e5] Before query execution: {
  state: 'closed',
  failures: 19,
  consecutiveSuccesses: 1,
  threshold: 10,
  lastFailure: '2025-11-29T18:01:47.325Z',
  openUntil: null
}
[DB] Acquiring client for query 73d8f74f-cff1-4bc3-a1bb-dd7934b301e5...
[PASS] Client acquired for query 73d8f74f-cff1-4bc3-a1bb-dd7934b301e5 in 1ms
[QUERY] Query 73d8f74f-cff1-4bc3-a1bb-dd7934b301e5:
      WITH upsert AS (
        INSERT INTO core.ai_tag_proposal (
          org...
[FAIL] Query 73d8f74f-cff1-4bc3-a1bb-dd7934b301e5 attempt 1/4 failed after 159ms: column "tag_proposal_id" does not exist
[BLOCKED] Non-retryable error detected for query 73d8f74f-cff1-4bc3-a1bb-dd7934b301e5, aborting retries
[RELEASE] Client released for query 73d8f74f-cff1-4bc3-a1bb-dd7934b301e5 (destroyed: true)
[TaggingEngine] Failed to record tag proposal {
  jobId: 'd0461adc-541c-4eaa-8e9e-ef6169baa32c',
  productId: '02534e5e-54a3-42db-bc08-4457018c9937',
  productName: 'Elixir 16102 Acoustic Phosphor Bronze with NANOWEB Coating Medium (.013-.056',
  provider: 'unknown',
  model: 'unknown',
  proposedTag: 'Acoustic Guitar',
  confidence: 0.98,
  dbError: 'Query failed after 4 attempts: column "tag_proposal_id" does not exist',
  timestamp: '2025-11-29T18:01:48.714Z'
}
[DB] [Query 84d503ac-d5e5-4e35-810e-3449b324b8e7] Before query execution: {
  state: 'closed',
  failures: 20,
  consecutiveSuccesses: 0,
  threshold: 10,
  lastFailure: '2025-11-29T18:01:48.714Z',
  openUntil: null
}
[DB] Acquiring client for query 84d503ac-d5e5-4e35-810e-3449b324b8e7...
[DB] [Query 2c2bc3e6-f5ed-48c3-afd5-d2501c2618df] Before query execution: {
  state: 'closed',
  failures: 0,
  consecutiveSuccesses: 2,
  threshold: 10,
  lastFailure: null,
  openUntil: null
}
[DB] Acquiring client for query 2c2bc3e6-f5ed-48c3-afd5-d2501c2618df...
[PASS] Client acquired for query 2c2bc3e6-f5ed-48c3-afd5-d2501c2618df in 0ms
[QUERY] Query 2c2bc3e6-f5ed-48c3-afd5-d2501c2618df:
      SELECT
        job_id,
        job_type,
        status,
        total_p...
[PASS] Query 2c2bc3e6-f5ed-48c3-afd5-d2501c2618df completed in 305ms, rows: 20
[TREND] Consecutive successes: 3/10
[WAIT] Circuit breaker reset pending: 3/10 consecutive successes
[RELEASE] Client released for query 2c2bc3e6-f5ed-48c3-afd5-d2501c2618df (destroyed: false)
 GET /api/tag/ai-tagging/jobs?limit=20 200 in 436ms
[PASS] New client connected to enterprise pool
[PASS] Client acquired for query 84d503ac-d5e5-4e35-810e-3449b324b8e7 in 927ms
[QUERY] Query 84d503ac-d5e5-4e35-810e-3449b324b8e7:
      UPDATE core.supplier_product
      SET
        ai_tagging_status = $2,
 ...
[DB] [Query 81415dbd-3c4a-4ca3-9a81-f1df8b4e0114] Before query execution: {
  state: 'closed',
  failures: 0,
  consecutiveSuccesses: 3,
  threshold: 10,
  lastFailure: null,
  openUntil: null
}
[DB] Acquiring client for query 81415dbd-3c4a-4ca3-9a81-f1df8b4e0114...
[PASS] Client acquired for query 81415dbd-3c4a-4ca3-9a81-f1df8b4e0114 in 1ms
[QUERY] Query 81415dbd-3c4a-4ca3-9a81-f1df8b4e0114:
      SELECT
        job_id,
        job_type,
        status,
        total_p...
[PASS] Query 84d503ac-d5e5-4e35-810e-3449b324b8e7 completed in 319ms, rows: 1
[TREND] Consecutive successes: 1/10
[WAIT] Circuit breaker reset pending: 1/10 consecutive successes
[RELEASE] Client released for query 84d503ac-d5e5-4e35-810e-3449b324b8e7 (destroyed: false)
[DB] [Query 401aeb15-c52a-4516-a7e7-320392f33898] Before query execution: {
  state: 'closed',
  failures: 20,
  consecutiveSuccesses: 1,
  threshold: 10,
  lastFailure: '2025-11-29T18:01:48.714Z',
  openUntil: null
}
[DB] Acquiring client for query 401aeb15-c52a-4516-a7e7-320392f33898...
[PASS] Client acquired for query 401aeb15-c52a-4516-a7e7-320392f33898 in 0ms
[QUERY] Query 401aeb15-c52a-4516-a7e7-320392f33898:
      WITH upsert AS (
        INSERT INTO core.ai_tag_proposal (
          org...
[PASS] Query 81415dbd-3c4a-4ca3-9a81-f1df8b4e0114 completed in 152ms, rows: 1
[TREND] Consecutive successes: 4/10
[WAIT] Circuit breaker reset pending: 4/10 consecutive successes
[RELEASE] Client released for query 81415dbd-3c4a-4ca3-9a81-f1df8b4e0114 (destroyed: false)
[DB] [Query 23eaf455-90c6-4752-8530-b6f639c83e59] Before query execution: {
  state: 'closed',
  failures: 0,
  consecutiveSuccesses: 4,
  threshold: 10,
  lastFailure: null,
  openUntil: null
}
[DB] Acquiring client for query 23eaf455-90c6-4752-8530-b6f639c83e59...
[PASS] Client acquired for query 23eaf455-90c6-4752-8530-b6f639c83e59 in 1ms
[QUERY] Query 23eaf455-90c6-4752-8530-b6f639c83e59:
      WITH batch_stats AS (
        SELECT
          COUNT(*) as completed_bat...
[FAIL] Query 401aeb15-c52a-4516-a7e7-320392f33898 attempt 1/4 failed after 154ms: column "tag_proposal_id" does not exist
[BLOCKED] Non-retryable error detected for query 401aeb15-c52a-4516-a7e7-320392f33898, aborting retries
[RELEASE] Client released for query 401aeb15-c52a-4516-a7e7-320392f33898 (destroyed: true)
[TaggingEngine] Failed to record tag proposal {
  jobId: 'd0461adc-541c-4eaa-8e9e-ef6169baa32c',
  productId: '025bf8a5-f37c-46c1-b117-bc1a21324f50',
  productName: 'Adam Hall Cables K3 BVV 0600 - Audio Cable 6.3mm Jack stereo to 6.3mm Jack stereo 6m',
  provider: 'unknown',
  model: 'unknown',
  proposedTag: 'Audio Cable',
  confidence: 0.98,
  dbError: 'Query failed after 4 attempts: column "tag_proposal_id" does not exist',
  timestamp: '2025-11-29T18:01:50.121Z'
}
[DB] [Query ae163588-e115-4c0e-a8a3-8d565e1018b1] Before query execution: {
  state: 'closed',
  failures: 21,
  consecutiveSuccesses: 0,
  threshold: 10,
  lastFailure: '2025-11-29T18:01:50.120Z',
  openUntil: null
}
[DB] Acquiring client for query ae163588-e115-4c0e-a8a3-8d565e1018b1...
[PASS] Query 23eaf455-90c6-4752-8530-b6f639c83e59 completed in 154ms, rows: 1
[TREND] Consecutive successes: 5/10
[WAIT] Circuit breaker reset pending: 5/10 consecutive successes
[RELEASE] Client released for query 23eaf455-90c6-4752-8530-b6f639c83e59 (destroyed: false)
[DB] [Query 87aeae1c-dd4d-4d16-899c-c40987c9635d] Before query execution: {
  state: 'closed',
  failures: 0,
  consecutiveSuccesses: 5,
  threshold: 10,
  lastFailure: null,
  openUntil: null
}
[DB] Acquiring client for query 87aeae1c-dd4d-4d16-899c-c40987c9635d...
[PASS] Client acquired for query 87aeae1c-dd4d-4d16-899c-c40987c9635d in 1ms
[QUERY] Query 87aeae1c-dd4d-4d16-899c-c40987c9635d:
      SELECT
        batch_number,
        error_message,
        products_in_...
[PASS] Query 87aeae1c-dd4d-4d16-899c-c40987c9635d completed in 152ms, rows: 0
[TREND] Consecutive successes: 6/10
[WAIT] Circuit breaker reset pending: 6/10 consecutive successes
[RELEASE] Client released for query 87aeae1c-dd4d-4d16-899c-c40987c9635d (destroyed: false)
[DB] [Query 9c44d0bd-84f7-4d8a-99e4-16572b857619] Before query execution: {
  state: 'closed',
  failures: 0,
  consecutiveSuccesses: 6,
  threshold: 10,
  lastFailure: null,
  openUntil: null
}
[DB] Acquiring client for query 9c44d0bd-84f7-4d8a-99e4-16572b857619...
[PASS] Client acquired for query 9c44d0bd-84f7-4d8a-99e4-16572b857619 in 1ms
[QUERY] Query 9c44d0bd-84f7-4d8a-99e4-16572b857619:
      WITH batch_metrics AS (
        SELECT
          SUM(successful_count + ...
[PASS] Query 9c44d0bd-84f7-4d8a-99e4-16572b857619 completed in 153ms, rows: 1
[TREND] Consecutive successes: 7/10
[WAIT] Circuit breaker reset pending: 7/10 consecutive successes
[RELEASE] Client released for query 9c44d0bd-84f7-4d8a-99e4-16572b857619 (destroyed: false)
 GET /api/tag/ai-tagging/status/d0461adc-541c-4eaa-8e9e-ef6169baa32c 200 in 729ms
[PASS] New client connected to enterprise pool
[PASS] Client acquired for query ae163588-e115-4c0e-a8a3-8d565e1018b1 in 937ms
[QUERY] Query ae163588-e115-4c0e-a8a3-8d565e1018b1:
      UPDATE core.supplier_product
      SET
        ai_tagging_status = $2,
 ...
[GUARD] Setting up database cleanup handlers...
[PASS] Cleanup handlers registered successfully
[READY] Unified database connection updated with enterprise manager
[PASS] Query ae163588-e115-4c0e-a8a3-8d565e1018b1 completed in 310ms, rows: 1
[TREND] Consecutive successes: 1/10
[WAIT] Circuit breaker reset pending: 1/10 consecutive successes
[RELEASE] Client released for query ae163588-e115-4c0e-a8a3-8d565e1018b1 (destroyed: false)
[DB] [Query 15e187c4-83d7-49f7-9b05-3b2b5d658443] Before query execution: {
  state: 'closed',
  failures: 21,
  consecutiveSuccesses: 1,
  threshold: 10,
  lastFailure: '2025-11-29T18:01:50.120Z',
  openUntil: null
}
[DB] Acquiring client for query 15e187c4-83d7-49f7-9b05-3b2b5d658443...
[PASS] Client acquired for query 15e187c4-83d7-49f7-9b05-3b2b5d658443 in 0ms
[QUERY] Query 15e187c4-83d7-49f7-9b05-3b2b5d658443:
      WITH upsert AS (
        INSERT INTO core.ai_tag_proposal (
          org...
[FAIL] Query 15e187c4-83d7-49f7-9b05-3b2b5d658443 attempt 1/4 failed after 155ms: column "tag_proposal_id" does not exist
[BLOCKED] Non-retryable error detected for query 15e187c4-83d7-49f7-9b05-3b2b5d658443, aborting retries
[RELEASE] Client released for query 15e187c4-83d7-49f7-9b05-3b2b5d658443 (destroyed: true)
[TaggingEngine] Failed to record tag proposal {
  jobId: 'd0461adc-541c-4eaa-8e9e-ef6169baa32c',
  productId: '025bf8a5-f37c-46c1-b117-bc1a21324f50',
  productName: 'Adam Hall Cables K3 BVV 0600 - Audio Cable 6.3mm Jack stereo to 6.3mm Jack stereo 6m',
  provider: 'unknown',
  model: 'unknown',
  proposedTag: '6.3mm Jack',
  confidence: 0.98,
  dbError: 'Query failed after 4 attempts: column "tag_proposal_id" does not exist',
  timestamp: '2025-11-29T18:01:51.528Z'
}
[DB] [Query bc253829-1cf7-4a35-846f-6251814939d9] Before query execution: {
  state: 'closed',
  failures: 22,
  consecutiveSuccesses: 0,
  threshold: 10,
  lastFailure: '2025-11-29T18:01:51.528Z',
  openUntil: null
}
[DB] Acquiring client for query bc253829-1cf7-4a35-846f-6251814939d9...
[PASS] New client connected to enterprise pool
[PASS] Client acquired for query bc253829-1cf7-4a35-846f-6251814939d9 in 937ms
[QUERY] Query bc253829-1cf7-4a35-846f-6251814939d9:
      UPDATE core.supplier_product
      SET
        ai_tagging_status = $2,
 ...
[PASS] Query bc253829-1cf7-4a35-846f-6251814939d9 completed in 311ms, rows: 1
[TREND] Consecutive successes: 1/10
[WAIT] Circuit breaker reset pending: 1/10 consecutive successes
[RELEASE] Client released for query bc253829-1cf7-4a35-846f-6251814939d9 (destroyed: false)
[DB] [Query 5148e94c-2104-4ba6-8b72-8a6f2fcd9afd] Before query execution: {
  state: 'closed',
  failures: 22,
  consecutiveSuccesses: 1,
  threshold: 10,
  lastFailure: '2025-11-29T18:01:51.528Z',
  openUntil: null
}
[DB] Acquiring client for query 5148e94c-2104-4ba6-8b72-8a6f2fcd9afd...
[PASS] Client acquired for query 5148e94c-2104-4ba6-8b72-8a6f2fcd9afd in 0ms
[QUERY] Query 5148e94c-2104-4ba6-8b72-8a6f2fcd9afd:
      WITH upsert AS (
        INSERT INTO core.ai_tag_proposal (
          org...
[DB] [Query 628e6300-f0e2-41ba-a87b-e28b28759cdd] Before query execution: {
  state: 'closed',
  failures: 0,
  consecutiveSuccesses: 7,
  threshold: 10,
  lastFailure: null,
  openUntil: null
}
[DB] Acquiring client for query 628e6300-f0e2-41ba-a87b-e28b28759cdd...
[PASS] Client acquired for query 628e6300-f0e2-41ba-a87b-e28b28759cdd in 0ms
[QUERY] Query 628e6300-f0e2-41ba-a87b-e28b28759cdd:
      SELECT
        job_id,
        job_type,
        status,
        total_p...
[FAIL] Query 5148e94c-2104-4ba6-8b72-8a6f2fcd9afd attempt 1/4 failed after 155ms: column "tag_proposal_id" does not exist
[BLOCKED] Non-retryable error detected for query 5148e94c-2104-4ba6-8b72-8a6f2fcd9afd, aborting retries
[RELEASE] Client released for query 5148e94c-2104-4ba6-8b72-8a6f2fcd9afd (destroyed: true)
[TaggingEngine] Failed to record tag proposal {
  jobId: 'd0461adc-541c-4eaa-8e9e-ef6169baa32c',
  productId: '025bf8a5-f37c-46c1-b117-bc1a21324f50',
  productName: 'Adam Hall Cables K3 BVV 0600 - Audio Cable 6.3mm Jack stereo to 6.3mm Jack stereo 6m',
  provider: 'unknown',
  model: 'unknown',
  proposedTag: 'TRS Stereo Jack',
  confidence: 0.96,
  dbError: 'Query failed after 4 attempts: column "tag_proposal_id" does not exist',
  timestamp: '2025-11-29T18:01:52.936Z'
}
[DB] [Query 56a92f39-aa47-4c38-b92c-a19868c3a781] Before query execution: {
  state: 'closed',
  failures: 23,
  consecutiveSuccesses: 0,
  threshold: 10,
  lastFailure: '2025-11-29T18:01:52.935Z',
  openUntil: null
}
[DB] Acquiring client for query 56a92f39-aa47-4c38-b92c-a19868c3a781...
[PASS] Query 628e6300-f0e2-41ba-a87b-e28b28759cdd completed in 153ms, rows: 1
[TREND] Consecutive successes: 8/10
[WAIT] Circuit breaker reset pending: 8/10 consecutive successes
[RELEASE] Client released for query 628e6300-f0e2-41ba-a87b-e28b28759cdd (destroyed: false)
[DB] [Query 0ffcc439-c4d1-4e56-8ad0-d149e53c2d62] Before query execution: {
  state: 'closed',
  failures: 0,
  consecutiveSuccesses: 8,
  threshold: 10,
  lastFailure: null,
  openUntil: null
}
[DB] Acquiring client for query 0ffcc439-c4d1-4e56-8ad0-d149e53c2d62...
[PASS] Client acquired for query 0ffcc439-c4d1-4e56-8ad0-d149e53c2d62 in 0ms
[QUERY] Query 0ffcc439-c4d1-4e56-8ad0-d149e53c2d62:
      WITH batch_stats AS (
        SELECT
          COUNT(*) as completed_bat...
[PASS] Query 0ffcc439-c4d1-4e56-8ad0-d149e53c2d62 completed in 155ms, rows: 1
[TREND] Consecutive successes: 9/10
[WAIT] Circuit breaker reset pending: 9/10 consecutive successes
[RELEASE] Client released for query 0ffcc439-c4d1-4e56-8ad0-d149e53c2d62 (destroyed: false)
[DB] [Query f6411ac4-6374-4bc5-9ef8-72e99ac3cd4b] Before query execution: {
  state: 'closed',
  failures: 0,
  consecutiveSuccesses: 9,
  threshold: 10,
  lastFailure: null,
  openUntil: null
}
[DB] Acquiring client for query f6411ac4-6374-4bc5-9ef8-72e99ac3cd4b...
[PASS] Client acquired for query f6411ac4-6374-4bc5-9ef8-72e99ac3cd4b in 2ms
[QUERY] Query f6411ac4-6374-4bc5-9ef8-72e99ac3cd4b:
      SELECT
        batch_number,
        error_message,
        products_in_...
[PASS] Query f6411ac4-6374-4bc5-9ef8-72e99ac3cd4b completed in 153ms, rows: 0
[TREND] Consecutive successes: 10/10
[DB] [Circuit Breaker] Circuit breaker RESET: {
  state: 'closed',
  failures: 0,
  consecutiveSuccesses: 0,
  threshold: 10,
  lastFailure: null,
  openUntil: null
}
[RELEASE] Client released for query f6411ac4-6374-4bc5-9ef8-72e99ac3cd4b (destroyed: false)
[DB] [Query 73746d80-12b6-4673-aebf-a10964b7df6d] Before query execution: {
  state: 'closed',
  failures: 0,
  consecutiveSuccesses: 0,
  threshold: 10,
  lastFailure: null,
  openUntil: null
}
[DB] Acquiring client for query 73746d80-12b6-4673-aebf-a10964b7df6d...
[PASS] Client acquired for query 73746d80-12b6-4673-aebf-a10964b7df6d in 1ms
[QUERY] Query 73746d80-12b6-4673-aebf-a10964b7df6d:
      WITH batch_metrics AS (
        SELECT
          SUM(successful_count + ...
[PASS] Query 73746d80-12b6-4673-aebf-a10964b7df6d completed in 153ms, rows: 1
[TREND] Consecutive successes: 1/10
[WAIT] Circuit breaker reset pending: 1/10 consecutive successes
[RELEASE] Client released for query 73746d80-12b6-4673-aebf-a10964b7df6d (destroyed: false)
 GET /api/tag/ai-tagging/status/d0461adc-541c-4eaa-8e9e-ef6169baa32c 200 in 740ms
[DB] [Query 7e8c94fc-348b-40d4-8372-1e07c262f0f5] Before query execution: {
  state: 'closed',
  failures: 0,
  consecutiveSuccesses: 1,
  threshold: 10,
  lastFailure: null,
  openUntil: null
}
[DB] Acquiring client for query 7e8c94fc-348b-40d4-8372-1e07c262f0f5...
[PASS] Client acquired for query 7e8c94fc-348b-40d4-8372-1e07c262f0f5 in 0ms
[QUERY] Query 7e8c94fc-348b-40d4-8372-1e07c262f0f5:
      SELECT
        job_id,
        job_type,
        status,
        total_p...
[PASS] New client connected to enterprise pool
[PASS] Client acquired for query 56a92f39-aa47-4c38-b92c-a19868c3a781 in 952ms
[QUERY] Query 56a92f39-aa47-4c38-b92c-a19868c3a781:
      UPDATE core.supplier_product
      SET
        ai_tagging_status = $2,
 ...
[PASS] Query 7e8c94fc-348b-40d4-8372-1e07c262f0f5 completed in 305ms, rows: 20
[TREND] Consecutive successes: 2/10
[WAIT] Circuit breaker reset pending: 2/10 consecutive successes
[RELEASE] Client released for query 7e8c94fc-348b-40d4-8372-1e07c262f0f5 (destroyed: false)
 GET /api/tag/ai-tagging/jobs?limit=20 200 in 457ms
[GUARD] Setting up database cleanup handlers...
[PASS] Cleanup handlers registered successfully
[READY] Unified database connection updated with enterprise manager
[PASS] Query 56a92f39-aa47-4c38-b92c-a19868c3a781 completed in 307ms, rows: 1
[TREND] Consecutive successes: 1/10
[WAIT] Circuit breaker reset pending: 1/10 consecutive successes
[RELEASE] Client released for query 56a92f39-aa47-4c38-b92c-a19868c3a781 (destroyed: false)
[DB] [Query ce4efbf7-ec68-4001-9fc1-6b244039a54c] Before query execution: {
  state: 'closed',
  failures: 23,
  consecutiveSuccesses: 1,
  threshold: 10,
  lastFailure: '2025-11-29T18:01:52.935Z',
  openUntil: null
}
[DB] Acquiring client for query ce4efbf7-ec68-4001-9fc1-6b244039a54c...
[PASS] Client acquired for query ce4efbf7-ec68-4001-9fc1-6b244039a54c in 1ms
[QUERY] Query ce4efbf7-ec68-4001-9fc1-6b244039a54c:
      WITH upsert AS (
        INSERT INTO core.ai_tag_proposal (
          org...
[FAIL] Query ce4efbf7-ec68-4001-9fc1-6b244039a54c attempt 1/4 failed after 154ms: column "tag_proposal_id" does not exist
[BLOCKED] Non-retryable error detected for query ce4efbf7-ec68-4001-9fc1-6b244039a54c, aborting retries
[RELEASE] Client released for query ce4efbf7-ec68-4001-9fc1-6b244039a54c (destroyed: true)
[TaggingEngine] Failed to record tag proposal {
  jobId: 'd0461adc-541c-4eaa-8e9e-ef6169baa32c',
  productId: '025bf8a5-f37c-46c1-b117-bc1a21324f50',
  productName: 'Adam Hall Cables K3 BVV 0600 - Audio Cable 6.3mm Jack stereo to 6.3mm Jack stereo 6m',
  provider: 'unknown',
  model: 'unknown',
  proposedTag: 'Balanced Cable',
  confidence: 0.9,
  dbError: 'Query failed after 4 attempts: column "tag_proposal_id" does not exist',
  timestamp: '2025-11-29T18:01:54.353Z'
}
[DB] [Query 0fdf78ed-100d-45ed-863b-02b6fbfbb5b9] Before query execution: {
  state: 'closed',
  failures: 24,
  consecutiveSuccesses: 0,
  threshold: 10,
  lastFailure: '2025-11-29T18:01:54.353Z',
  openUntil: null
}
[DB] Acquiring client for query 0fdf78ed-100d-45ed-863b-02b6fbfbb5b9...
[PASS] New client connected to enterprise pool
[PASS] Client acquired for query 0fdf78ed-100d-45ed-863b-02b6fbfbb5b9 in 924ms
[QUERY] Query 0fdf78ed-100d-45ed-863b-02b6fbfbb5b9:
      UPDATE core.supplier_product
      SET
        ai_tagging_status = $2,
 ...
[PASS] Query 0fdf78ed-100d-45ed-863b-02b6fbfbb5b9 completed in 303ms, rows: 1
[TREND] Consecutive successes: 1/10
[WAIT] Circuit breaker reset pending: 1/10 consecutive successes
[RELEASE] Client released for query 0fdf78ed-100d-45ed-863b-02b6fbfbb5b9 (destroyed: false)
[DB] [Query 1b509d0d-09a8-460a-96fd-04c9914f059e] Before query execution: {
  state: 'closed',
  failures: 24,
  consecutiveSuccesses: 1,
  threshold: 10,
  lastFailure: '2025-11-29T18:01:54.353Z',
  openUntil: null
}
[DB] Acquiring client for query 1b509d0d-09a8-460a-96fd-04c9914f059e...
[PASS] Client acquired for query 1b509d0d-09a8-460a-96fd-04c9914f059e in 0ms
[QUERY] Query 1b509d0d-09a8-460a-96fd-04c9914f059e:
      WITH upsert AS (
        INSERT INTO core.ai_tag_proposal (
          org...
[FAIL] Query 1b509d0d-09a8-460a-96fd-04c9914f059e attempt 1/4 failed after 159ms: column "tag_proposal_id" does not exist
[BLOCKED] Non-retryable error detected for query 1b509d0d-09a8-460a-96fd-04c9914f059e, aborting retries
[RELEASE] Client released for query 1b509d0d-09a8-460a-96fd-04c9914f059e (destroyed: true)
[TaggingEngine] Failed to record tag proposal {
  jobId: 'd0461adc-541c-4eaa-8e9e-ef6169baa32c',
  productId: '025bf8a5-f37c-46c1-b117-bc1a21324f50',
  productName: 'Adam Hall Cables K3 BVV 0600 - Audio Cable 6.3mm Jack stereo to 6.3mm Jack stereo 6m',
  provider: 'unknown',
  model: 'unknown',
  proposedTag: 'Instrument Cable',
  confidence: 0.9,
  dbError: 'Query failed after 4 attempts: column "tag_proposal_id" does not exist',
  timestamp: '2025-11-29T18:01:55.742Z'
}
[DB] [Query f041f9ec-369a-44bc-ba52-7a2dff8c3321] Before query execution: {
  state: 'closed',
  failures: 25,
  consecutiveSuccesses: 0,
  threshold: 10,
  lastFailure: '2025-11-29T18:01:55.742Z',
  openUntil: null
}
[DB] Acquiring client for query f041f9ec-369a-44bc-ba52-7a2dff8c3321...
[DB] [Query e72a156a-11a3-459d-b127-a9e993a47497] Before query execution: {
  state: 'closed',
  failures: 0,
  consecutiveSuccesses: 2,
  threshold: 10,
  lastFailure: null,
  openUntil: null
}
[DB] Acquiring client for query e72a156a-11a3-459d-b127-a9e993a47497...
[PASS] Client acquired for query e72a156a-11a3-459d-b127-a9e993a47497 in 1ms
[QUERY] Query e72a156a-11a3-459d-b127-a9e993a47497:
      SELECT
        job_id,
        job_type,
        status,
        total_p...
[PASS] Query e72a156a-11a3-459d-b127-a9e993a47497 completed in 153ms, rows: 1
[TREND] Consecutive successes: 3/10
[WAIT] Circuit breaker reset pending: 3/10 consecutive successes
[RELEASE] Client released for query e72a156a-11a3-459d-b127-a9e993a47497 (destroyed: false)
[DB] [Query 5e17894b-4934-4089-8e2b-bbf1e5ed766d] Before query execution: {
  state: 'closed',
  failures: 0,
  consecutiveSuccesses: 3,
  threshold: 10,
  lastFailure: null,
  openUntil: null
}
[DB] Acquiring client for query 5e17894b-4934-4089-8e2b-bbf1e5ed766d...
[PASS] Client acquired for query 5e17894b-4934-4089-8e2b-bbf1e5ed766d in 1ms
[QUERY] Query 5e17894b-4934-4089-8e2b-bbf1e5ed766d:
      WITH batch_stats AS (
        SELECT
          COUNT(*) as completed_bat...
[PASS] Query 5e17894b-4934-4089-8e2b-bbf1e5ed766d completed in 153ms, rows: 1
[TREND] Consecutive successes: 4/10
[WAIT] Circuit breaker reset pending: 4/10 consecutive successes
[RELEASE] Client released for query 5e17894b-4934-4089-8e2b-bbf1e5ed766d (destroyed: false)
[DB] [Query 386e8795-0f32-4c2b-b472-734398fce7cc] Before query execution: {
  state: 'closed',
  failures: 0,
  consecutiveSuccesses: 4,
  threshold: 10,
  lastFailure: null,
  openUntil: null
}
[DB] Acquiring client for query 386e8795-0f32-4c2b-b472-734398fce7cc...
[PASS] Client acquired for query 386e8795-0f32-4c2b-b472-734398fce7cc in 0ms
[QUERY] Query 386e8795-0f32-4c2b-b472-734398fce7cc:
      SELECT
        batch_number,
        error_message,
        products_in_...
[PASS] Query 386e8795-0f32-4c2b-b472-734398fce7cc completed in 152ms, rows: 0
[TREND] Consecutive successes: 5/10
[WAIT] Circuit breaker reset pending: 5/10 consecutive successes
[RELEASE] Client released for query 386e8795-0f32-4c2b-b472-734398fce7cc (destroyed: false)
[DB] [Query 29987bb8-a828-4f54-a04c-a0d160077182] Before query execution: {
  state: 'closed',
  failures: 0,
  consecutiveSuccesses: 5,
  threshold: 10,
  lastFailure: null,
  openUntil: null
}
[DB] Acquiring client for query 29987bb8-a828-4f54-a04c-a0d160077182...
[PASS] Client acquired for query 29987bb8-a828-4f54-a04c-a0d160077182 in 1ms
[QUERY] Query 29987bb8-a828-4f54-a04c-a0d160077182:
      WITH batch_metrics AS (
        SELECT
          SUM(successful_count + ...
[PASS] Query 29987bb8-a828-4f54-a04c-a0d160077182 completed in 154ms, rows: 1
[TREND] Consecutive successes: 6/10
[WAIT] Circuit breaker reset pending: 6/10 consecutive successes
[RELEASE] Client released for query 29987bb8-a828-4f54-a04c-a0d160077182 (destroyed: false)
 GET /api/tag/ai-tagging/status/d0461adc-541c-4eaa-8e9e-ef6169baa32c 200 in 747ms
[PASS] New client connected to enterprise pool
[PASS] Client acquired for query f041f9ec-369a-44bc-ba52-7a2dff8c3321 in 950ms
[QUERY] Query f041f9ec-369a-44bc-ba52-7a2dff8c3321:
      UPDATE core.supplier_product
      SET
        ai_tagging_status = $2,
 ...
[PASS] Query f041f9ec-369a-44bc-ba52-7a2dff8c3321 completed in 311ms, rows: 1
[TREND] Consecutive successes: 1/10
[WAIT] Circuit breaker reset pending: 1/10 consecutive successes
[RELEASE] Client released for query f041f9ec-369a-44bc-ba52-7a2dff8c3321 (destroyed: false)
[DB] [Query fa48d11a-7abb-40db-980c-ac621da37efe] Before query execution: {
  state: 'closed',
  failures: 25,
  consecutiveSuccesses: 1,
  threshold: 10,
  lastFailure: '2025-11-29T18:01:55.742Z',
  openUntil: null
}
[DB] Acquiring client for query fa48d11a-7abb-40db-980c-ac621da37efe...
[PASS] Client acquired for query fa48d11a-7abb-40db-980c-ac621da37efe in 1ms
[QUERY] Query fa48d11a-7abb-40db-980c-ac621da37efe:
      WITH upsert AS (
        INSERT INTO core.ai_tag_proposal (
          org...
[GUARD] Setting up database cleanup handlers...
[PASS] Cleanup handlers registered successfully
[READY] Unified database connection updated with enterprise manager
[FAIL] Query fa48d11a-7abb-40db-980c-ac621da37efe attempt 1/4 failed after 155ms: column "tag_proposal_id" does not exist
[BLOCKED] Non-retryable error detected for query fa48d11a-7abb-40db-980c-ac621da37efe, aborting retries
[RELEASE] Client released for query fa48d11a-7abb-40db-980c-ac621da37efe (destroyed: true)
[TaggingEngine] Failed to record tag proposal {
  jobId: 'd0461adc-541c-4eaa-8e9e-ef6169baa32c',
  productId: '025bf8a5-f37c-46c1-b117-bc1a21324f50',
  productName: 'Adam Hall Cables K3 BVV 0600 - Audio Cable 6.3mm Jack stereo to 6.3mm Jack stereo 6m',
  provider: 'unknown',
  model: 'unknown',
  proposedTag: '6m Length',
  confidence: 0.97,
  dbError: 'Query failed after 4 attempts: column "tag_proposal_id" does not exist',
  timestamp: '2025-11-29T18:01:57.164Z'
}
[DB] [Query fa1a6d4c-0992-4422-ba23-f7a4a1b1eec6] Before query execution: {
  state: 'closed',
  failures: 26,
  consecutiveSuccesses: 0,
  threshold: 10,
  lastFailure: '2025-11-29T18:01:57.163Z',
  openUntil: null
}
[DB] Acquiring client for query fa1a6d4c-0992-4422-ba23-f7a4a1b1eec6...
[PASS] New client connected to enterprise pool
[PASS] Client acquired for query fa1a6d4c-0992-4422-ba23-f7a4a1b1eec6 in 915ms
[QUERY] Query fa1a6d4c-0992-4422-ba23-f7a4a1b1eec6:
      UPDATE core.supplier_product
      SET
        ai_tagging_status = $2,
 ...
[PASS] Query fa1a6d4c-0992-4422-ba23-f7a4a1b1eec6 completed in 303ms, rows: 1
[TREND] Consecutive successes: 1/10
[WAIT] Circuit breaker reset pending: 1/10 consecutive successes
[RELEASE] Client released for query fa1a6d4c-0992-4422-ba23-f7a4a1b1eec6 (destroyed: false)
[DB] [Query be8db97e-eeae-44ba-82fc-2a9ab25619fe] Before query execution: {
  state: 'closed',
  failures: 26,
  consecutiveSuccesses: 1,
  threshold: 10,
  lastFailure: '2025-11-29T18:01:57.163Z',
  openUntil: null
}
[DB] Acquiring client for query be8db97e-eeae-44ba-82fc-2a9ab25619fe...
[PASS] Client acquired for query be8db97e-eeae-44ba-82fc-2a9ab25619fe in 1ms
[QUERY] Query be8db97e-eeae-44ba-82fc-2a9ab25619fe:
      WITH upsert AS (
        INSERT INTO core.ai_tag_proposal (
          org...
[FAIL] Query be8db97e-eeae-44ba-82fc-2a9ab25619fe attempt 1/4 failed after 152ms: column "tag_proposal_id" does not exist
[BLOCKED] Non-retryable error detected for query be8db97e-eeae-44ba-82fc-2a9ab25619fe, aborting retries
[RELEASE] Client released for query be8db97e-eeae-44ba-82fc-2a9ab25619fe (destroyed: true)
[TaggingEngine] Failed to record tag proposal {
  jobId: 'd0461adc-541c-4eaa-8e9e-ef6169baa32c',
  productId: '025bf8a5-f37c-46c1-b117-bc1a21324f50',
  productName: 'Adam Hall Cables K3 BVV 0600 - Audio Cable 6.3mm Jack stereo to 6.3mm Jack stereo 6m',
  provider: 'unknown',
  model: 'unknown',
  proposedTag: 'Adam Hall',
  confidence: 0.99,
  dbError: 'Query failed after 4 attempts: column "tag_proposal_id" does not exist',
  timestamp: '2025-11-29T18:01:58.538Z'
}
[DB] [Query 2dfd76b4-f48c-4976-a6f9-e46664a9aeb9] Before query execution: {
  state: 'closed',
  failures: 27,
  consecutiveSuccesses: 0,
  threshold: 10,
  lastFailure: '2025-11-29T18:01:58.538Z',
  openUntil: null
}
[DB] Acquiring client for query 2dfd76b4-f48c-4976-a6f9-e46664a9aeb9...
[DB] [Query 1a3bc2f6-b032-40bf-aa0d-e64f08e52dcd] Before query execution: {
  state: 'closed',
  failures: 0,
  consecutiveSuccesses: 6,
  threshold: 10,
  lastFailure: null,
  openUntil: null
}
[DB] Acquiring client for query 1a3bc2f6-b032-40bf-aa0d-e64f08e52dcd...
[PASS] Client acquired for query 1a3bc2f6-b032-40bf-aa0d-e64f08e52dcd in 0ms
[QUERY] Query 1a3bc2f6-b032-40bf-aa0d-e64f08e52dcd:
      SELECT
        job_id,
        job_type,
        status,
        total_p...
[DB] [Query f5e61249-4e65-4941-b15b-979b69acecfd] Before query execution: {
  state: 'closed',
  failures: 0,
  consecutiveSuccesses: 6,
  threshold: 10,
  lastFailure: null,
  openUntil: null
}
[DB] Acquiring client for query f5e61249-4e65-4941-b15b-979b69acecfd...
[PASS] Client acquired for query f5e61249-4e65-4941-b15b-979b69acecfd in 1ms
[QUERY] Query f5e61249-4e65-4941-b15b-979b69acecfd:
      SELECT
        job_id,
        job_type,
        status,
        total_p...
[PASS] Query f5e61249-4e65-4941-b15b-979b69acecfd completed in 153ms, rows: 1
[TREND] Consecutive successes: 7/10
[WAIT] Circuit breaker reset pending: 7/10 consecutive successes
[RELEASE] Client released for query f5e61249-4e65-4941-b15b-979b69acecfd (destroyed: false)
[DB] [Query 7478b2fa-d2b3-4b0f-92a0-f4f673d5d2cd] Before query execution: {
  state: 'closed',
  failures: 0,
  consecutiveSuccesses: 7,
  threshold: 10,
  lastFailure: null,
  openUntil: null
}
[DB] Acquiring client for query 7478b2fa-d2b3-4b0f-92a0-f4f673d5d2cd...
[PASS] Client acquired for query 7478b2fa-d2b3-4b0f-92a0-f4f673d5d2cd in 1ms
[QUERY] Query 7478b2fa-d2b3-4b0f-92a0-f4f673d5d2cd:
      WITH batch_stats AS (
        SELECT
          COUNT(*) as completed_bat...
[PASS] Query 1a3bc2f6-b032-40bf-aa0d-e64f08e52dcd completed in 304ms, rows: 20
[TREND] Consecutive successes: 8/10
[WAIT] Circuit breaker reset pending: 8/10 consecutive successes
[RELEASE] Client released for query 1a3bc2f6-b032-40bf-aa0d-e64f08e52dcd (destroyed: false)
 GET /api/tag/ai-tagging/jobs?limit=20 200 in 415ms
[PASS] Query 7478b2fa-d2b3-4b0f-92a0-f4f673d5d2cd completed in 154ms, rows: 1
[TREND] Consecutive successes: 9/10
[WAIT] Circuit breaker reset pending: 9/10 consecutive successes
[RELEASE] Client released for query 7478b2fa-d2b3-4b0f-92a0-f4f673d5d2cd (destroyed: false)
[DB] [Query 08b44470-b18b-4653-a7b1-198b0d6f791d] Before query execution: {
  state: 'closed',
  failures: 0,
  consecutiveSuccesses: 9,
  threshold: 10,
  lastFailure: null,
  openUntil: null
}
[DB] Acquiring client for query 08b44470-b18b-4653-a7b1-198b0d6f791d...
[PASS] Client acquired for query 08b44470-b18b-4653-a7b1-198b0d6f791d in 0ms
[QUERY] Query 08b44470-b18b-4653-a7b1-198b0d6f791d:
      SELECT
        batch_number,
        error_message,
        products_in_...
[PASS] Query 08b44470-b18b-4653-a7b1-198b0d6f791d completed in 153ms, rows: 0
[TREND] Consecutive successes: 10/10
[DB] [Circuit Breaker] Circuit breaker RESET: {
  state: 'closed',
  failures: 0,
  consecutiveSuccesses: 0,
  threshold: 10,
  lastFailure: null,
  openUntil: null
}
[RELEASE] Client released for query 08b44470-b18b-4653-a7b1-198b0d6f791d (destroyed: false)
[DB] [Query 6e7e45f1-8316-4389-8177-a723fa8eec35] Before query execution: {
  state: 'closed',
  failures: 0,
  consecutiveSuccesses: 0,
  threshold: 10,
  lastFailure: null,
  openUntil: null
}
[DB] Acquiring client for query 6e7e45f1-8316-4389-8177-a723fa8eec35...
[PASS] Client acquired for query 6e7e45f1-8316-4389-8177-a723fa8eec35 in 1ms
[QUERY] Query 6e7e45f1-8316-4389-8177-a723fa8eec35:
      WITH batch_metrics AS (
        SELECT
          SUM(successful_count + ...
[PASS] New client connected to enterprise pool
[PASS] Client acquired for query 2dfd76b4-f48c-4976-a6f9-e46664a9aeb9 in 957ms
[QUERY] Query 2dfd76b4-f48c-4976-a6f9-e46664a9aeb9:
      UPDATE core.supplier_product
      SET
        ai_tagging_status = $2,
 ...
[PASS] Query 6e7e45f1-8316-4389-8177-a723fa8eec35 completed in 154ms, rows: 1
[TREND] Consecutive successes: 1/10
[WAIT] Circuit breaker reset pending: 1/10 consecutive successes
[RELEASE] Client released for query 6e7e45f1-8316-4389-8177-a723fa8eec35 (destroyed: false)
 GET /api/tag/ai-tagging/status/d0461adc-541c-4eaa-8e9e-ef6169baa32c 200 in 766ms
[PASS] Query 2dfd76b4-f48c-4976-a6f9-e46664a9aeb9 completed in 307ms, rows: 1
[TREND] Consecutive successes: 1/10
[WAIT] Circuit breaker reset pending: 1/10 consecutive successes
[RELEASE] Client released for query 2dfd76b4-f48c-4976-a6f9-e46664a9aeb9 (destroyed: false)
[DB] [Query 44b029c9-1b22-4365-aa7e-c2b786955bad] Before query execution: {
  state: 'closed',
  failures: 27,
  consecutiveSuccesses: 1,
  threshold: 10,
  lastFailure: '2025-11-29T18:01:58.538Z',
  openUntil: null
}
[DB] Acquiring client for query 44b029c9-1b22-4365-aa7e-c2b786955bad...
[PASS] Client acquired for query 44b029c9-1b22-4365-aa7e-c2b786955bad in 1ms
[QUERY] Query 44b029c9-1b22-4365-aa7e-c2b786955bad:
      WITH upsert AS (
        INSERT INTO core.ai_tag_proposal (
          org...
[FAIL] Query 44b029c9-1b22-4365-aa7e-c2b786955bad attempt 1/4 failed after 154ms: column "tag_proposal_id" does not exist
[BLOCKED] Non-retryable error detected for query 44b029c9-1b22-4365-aa7e-c2b786955bad, aborting retries
[RELEASE] Client released for query 44b029c9-1b22-4365-aa7e-c2b786955bad (destroyed: true)
[TaggingEngine] Failed to record tag proposal {
  jobId: 'd0461adc-541c-4eaa-8e9e-ef6169baa32c',
  productId: '025bf8a5-f37c-46c1-b117-bc1a21324f50',
  productName: 'Adam Hall Cables K3 BVV 0600 - Audio Cable 6.3mm Jack stereo to 6.3mm Jack stereo 6m',
  provider: 'unknown',
  model: 'unknown',
  proposedTag: 'Active Music Distribution',
  confidence: 0.99,
  dbError: 'Query failed after 4 attempts: column "tag_proposal_id" does not exist',
  timestamp: '2025-11-29T18:01:59.960Z'
}
[DB] [Query 37ebd3ba-d9ac-44f2-9562-83ad9595cce8] Before query execution: {
  state: 'closed',
  failures: 28,
  consecutiveSuccesses: 0,
  threshold: 10,
  lastFailure: '2025-11-29T18:01:59.960Z',
  openUntil: null
}
[DB] Acquiring client for query 37ebd3ba-d9ac-44f2-9562-83ad9595cce8...
[GUARD] Setting up database cleanup handlers...
[PASS] Cleanup handlers registered successfully
[READY] Unified database connection updated with enterprise manager
[PASS] New client connected to enterprise pool
[PASS] Client acquired for query 37ebd3ba-d9ac-44f2-9562-83ad9595cce8 in 936ms
[QUERY] Query 37ebd3ba-d9ac-44f2-9562-83ad9595cce8:
      UPDATE core.supplier_product
      SET
        ai_tagging_status = $2,
 ...
[PASS] Query 37ebd3ba-d9ac-44f2-9562-83ad9595cce8 completed in 310ms, rows: 1
[TREND] Consecutive successes: 1/10
[WAIT] Circuit breaker reset pending: 1/10 consecutive successes
[RELEASE] Client released for query 37ebd3ba-d9ac-44f2-9562-83ad9595cce8 (destroyed: false)
[DB] [Query 0af3cb2f-6b78-42d8-ad97-634a584b9f11] Before query execution: {
  state: 'closed',
  failures: 28,
  consecutiveSuccesses: 1,
  threshold: 10,
  lastFailure: '2025-11-29T18:01:59.960Z',
  openUntil: null
}
[DB] Acquiring client for query 0af3cb2f-6b78-42d8-ad97-634a584b9f11...
[PASS] Client acquired for query 0af3cb2f-6b78-42d8-ad97-634a584b9f11 in 0ms
[QUERY] Query 0af3cb2f-6b78-42d8-ad97-634a584b9f11:
      WITH upsert AS (
        INSERT INTO core.ai_tag_proposal (
          org...
[FAIL] Query 0af3cb2f-6b78-42d8-ad97-634a584b9f11 attempt 1/4 failed after 171ms: column "tag_proposal_id" does not exist
[BLOCKED] Non-retryable error detected for query 0af3cb2f-6b78-42d8-ad97-634a584b9f11, aborting retries
[RELEASE] Client released for query 0af3cb2f-6b78-42d8-ad97-634a584b9f11 (destroyed: true)
[TaggingEngine] Failed to record tag proposal {
  jobId: 'd0461adc-541c-4eaa-8e9e-ef6169baa32c',
  productId: '025bf8a5-f37c-46c1-b117-bc1a21324f50',
  productName: 'Adam Hall Cables K3 BVV 0600 - Audio Cable 6.3mm Jack stereo to 6.3mm Jack stereo 6m',
  provider: 'unknown',
  model: 'unknown',
  proposedTag: 'Cables & Connectors',
  confidence: 0.95,
  dbError: 'Query failed after 4 attempts: column "tag_proposal_id" does not exist',
  timestamp: '2025-11-29T18:02:01.382Z'
}
[DB] [Query de2bd5d2-bd38-44df-9637-b3c55a78444f] Before query execution: {
  state: 'closed',
  failures: 29,
  consecutiveSuccesses: 0,
  threshold: 10,
  lastFailure: '2025-11-29T18:02:01.382Z',
  openUntil: null
}
[DB] Acquiring client for query de2bd5d2-bd38-44df-9637-b3c55a78444f...
[DB] [Query 7fc58fc9-af22-42d8-88a1-85597881e284] Before query execution: {
  state: 'closed',
  failures: 0,
  consecutiveSuccesses: 1,
  threshold: 10,
  lastFailure: null,
  openUntil: null
}
[DB] Acquiring client for query 7fc58fc9-af22-42d8-88a1-85597881e284...
[PASS] Client acquired for query 7fc58fc9-af22-42d8-88a1-85597881e284 in 1ms
[QUERY] Query 7fc58fc9-af22-42d8-88a1-85597881e284:
      SELECT
        job_id,
        job_type,
        status,
        total_p...
[PASS] Query 7fc58fc9-af22-42d8-88a1-85597881e284 completed in 154ms, rows: 1
[TREND] Consecutive successes: 2/10
[WAIT] Circuit breaker reset pending: 2/10 consecutive successes
[RELEASE] Client released for query 7fc58fc9-af22-42d8-88a1-85597881e284 (destroyed: false)
[DB] [Query 833d8bae-3325-46cb-8570-8b92f5b2b215] Before query execution: {
  state: 'closed',
  failures: 0,
  consecutiveSuccesses: 2,
  threshold: 10,
  lastFailure: null,
  openUntil: null
}
[DB] Acquiring client for query 833d8bae-3325-46cb-8570-8b92f5b2b215...
[PASS] Client acquired for query 833d8bae-3325-46cb-8570-8b92f5b2b215 in 0ms
[QUERY] Query 833d8bae-3325-46cb-8570-8b92f5b2b215:
      WITH batch_stats AS (
        SELECT
          COUNT(*) as completed_bat...
[PASS] Query 833d8bae-3325-46cb-8570-8b92f5b2b215 completed in 153ms, rows: 1
[TREND] Consecutive successes: 3/10
[WAIT] Circuit breaker reset pending: 3/10 consecutive successes
[RELEASE] Client released for query 833d8bae-3325-46cb-8570-8b92f5b2b215 (destroyed: false)
[DB] [Query 366a8f18-39ad-4203-8ca3-98eb4db9a94a] Before query execution: {
  state: 'closed',
  failures: 0,
  consecutiveSuccesses: 3,
  threshold: 10,
  lastFailure: null,
  openUntil: null
}
[DB] Acquiring client for query 366a8f18-39ad-4203-8ca3-98eb4db9a94a...
[PASS] Client acquired for query 366a8f18-39ad-4203-8ca3-98eb4db9a94a in 0ms
[QUERY] Query 366a8f18-39ad-4203-8ca3-98eb4db9a94a:
      SELECT
        batch_number,
        error_message,
        products_in_...
[PASS] Query 366a8f18-39ad-4203-8ca3-98eb4db9a94a completed in 153ms, rows: 0
[TREND] Consecutive successes: 4/10
[WAIT] Circuit breaker reset pending: 4/10 consecutive successes
[RELEASE] Client released for query 366a8f18-39ad-4203-8ca3-98eb4db9a94a (destroyed: false)
[DB] [Query 1e1543e8-dadd-4eaf-bae0-01492f611b78] Before query execution: {
  state: 'closed',
  failures: 0,
  consecutiveSuccesses: 4,
  threshold: 10,
  lastFailure: null,
  openUntil: null
}
[DB] Acquiring client for query 1e1543e8-dadd-4eaf-bae0-01492f611b78...
[PASS] Client acquired for query 1e1543e8-dadd-4eaf-bae0-01492f611b78 in 1ms
[QUERY] Query 1e1543e8-dadd-4eaf-bae0-01492f611b78:
      WITH batch_metrics AS (
        SELECT
          SUM(successful_count + ...
[PASS] New client connected to enterprise pool
[PASS] Client acquired for query de2bd5d2-bd38-44df-9637-b3c55a78444f in 928ms
[QUERY] Query de2bd5d2-bd38-44df-9637-b3c55a78444f:
      UPDATE core.supplier_product
      SET
        ai_tagging_status = $2,
 ...
[PASS] Query 1e1543e8-dadd-4eaf-bae0-01492f611b78 completed in 153ms, rows: 1
[TREND] Consecutive successes: 5/10
[WAIT] Circuit breaker reset pending: 5/10 consecutive successes
[RELEASE] Client released for query 1e1543e8-dadd-4eaf-bae0-01492f611b78 (destroyed: false)
 GET /api/tag/ai-tagging/status/d0461adc-541c-4eaa-8e9e-ef6169baa32c 200 in 728ms
[PASS] Query de2bd5d2-bd38-44df-9637-b3c55a78444f completed in 307ms, rows: 1
[TREND] Consecutive successes: 1/10
[WAIT] Circuit breaker reset pending: 1/10 consecutive successes
[RELEASE] Client released for query de2bd5d2-bd38-44df-9637-b3c55a78444f (destroyed: false)
[DB] [Query d14c672d-4856-43f9-82ba-4e6dc0e58a57] Before query execution: {
  state: 'closed',
  failures: 29,
  consecutiveSuccesses: 1,
  threshold: 10,
  lastFailure: '2025-11-29T18:02:01.382Z',
  openUntil: null
}
[DB] Acquiring client for query d14c672d-4856-43f9-82ba-4e6dc0e58a57...
[PASS] Client acquired for query d14c672d-4856-43f9-82ba-4e6dc0e58a57 in 0ms
[QUERY] Query d14c672d-4856-43f9-82ba-4e6dc0e58a57:
      WITH upsert AS (
        INSERT INTO core.ai_tag_proposal (
          org...
[FAIL] Query d14c672d-4856-43f9-82ba-4e6dc0e58a57 attempt 1/4 failed after 153ms: column "tag_proposal_id" does not exist
[BLOCKED] Non-retryable error detected for query d14c672d-4856-43f9-82ba-4e6dc0e58a57, aborting retries
[RELEASE] Client released for query d14c672d-4856-43f9-82ba-4e6dc0e58a57 (destroyed: true)
[TaggingEngine] Failed to record tag proposal {
  jobId: 'd0461adc-541c-4eaa-8e9e-ef6169baa32c',
  productId: '025bf8a5-f37c-46c1-b117-bc1a21324f50',
  productName: 'Adam Hall Cables K3 BVV 0600 - Audio Cable 6.3mm Jack stereo to 6.3mm Jack stereo 6m',
  provider: 'unknown',
  model: 'unknown',
  proposedTag: 'Stage & Studio Use',
  confidence: 0.85,
  dbError: 'Query failed after 4 attempts: column "tag_proposal_id" does not exist',
  timestamp: '2025-11-29T18:02:02.776Z'
}
[DB] [Query 4a1bc313-786a-424b-9b32-4397e6db4944] Before query execution: {
  state: 'closed',
  failures: 30,
  consecutiveSuccesses: 0,
  threshold: 10,
  lastFailure: '2025-11-29T18:02:02.776Z',
  openUntil: null
}
[DB] Acquiring client for query 4a1bc313-786a-424b-9b32-4397e6db4944...
[GUARD] Setting up database cleanup handlers...
[PASS] Cleanup handlers registered successfully
[READY] Unified database connection updated with enterprise manager
[PASS] New client connected to enterprise pool
[PASS] Client acquired for query 4a1bc313-786a-424b-9b32-4397e6db4944 in 928ms
[QUERY] Query 4a1bc313-786a-424b-9b32-4397e6db4944:
      UPDATE core.supplier_product
      SET
        ai_tagging_status = $2,
 ...
[DB] [Query 2ec13984-7861-49cd-aed0-5ac2f29bdf8d] Before query execution: {
  state: 'closed',
  failures: 0,
  consecutiveSuccesses: 5,
  threshold: 10,
  lastFailure: null,
  openUntil: null
}
[DB] Acquiring client for query 2ec13984-7861-49cd-aed0-5ac2f29bdf8d...
[PASS] Client acquired for query 2ec13984-7861-49cd-aed0-5ac2f29bdf8d in 1ms
[QUERY] Query 2ec13984-7861-49cd-aed0-5ac2f29bdf8d:
      SELECT
        job_id,
        job_type,
        status,
        total_p...
[PASS] Query 4a1bc313-786a-424b-9b32-4397e6db4944 completed in 306ms, rows: 1
[TREND] Consecutive successes: 1/10
[WAIT] Circuit breaker reset pending: 1/10 consecutive successes
[RELEASE] Client released for query 4a1bc313-786a-424b-9b32-4397e6db4944 (destroyed: false)
[DB] [Query 03ad4d1a-1149-460c-8bb2-fbe28acdfad8] Before query execution: {
  state: 'closed',
  failures: 30,
  consecutiveSuccesses: 1,
  threshold: 10,
  lastFailure: '2025-11-29T18:02:02.776Z',
  openUntil: null
}
[DB] Acquiring client for query 03ad4d1a-1149-460c-8bb2-fbe28acdfad8...
[PASS] Client acquired for query 03ad4d1a-1149-460c-8bb2-fbe28acdfad8 in 0ms
[QUERY] Query 03ad4d1a-1149-460c-8bb2-fbe28acdfad8:
      WITH upsert AS (
        INSERT INTO core.ai_tag_proposal (
          org...
[PASS] Query 2ec13984-7861-49cd-aed0-5ac2f29bdf8d completed in 306ms, rows: 20
[TREND] Consecutive successes: 6/10
[WAIT] Circuit breaker reset pending: 6/10 consecutive successes
[RELEASE] Client released for query 2ec13984-7861-49cd-aed0-5ac2f29bdf8d (destroyed: false)
 GET /api/tag/ai-tagging/jobs?limit=20 200 in 413ms
[FAIL] Query 03ad4d1a-1149-460c-8bb2-fbe28acdfad8 attempt 1/4 failed after 154ms: column "tag_proposal_id" does not exist
[BLOCKED] Non-retryable error detected for query 03ad4d1a-1149-460c-8bb2-fbe28acdfad8, aborting retries
[RELEASE] Client released for query 03ad4d1a-1149-460c-8bb2-fbe28acdfad8 (destroyed: true)
[TaggingEngine] Failed to record tag proposal {
  jobId: 'd0461adc-541c-4eaa-8e9e-ef6169baa32c',
  productId: '0372c911-b03c-43d5-9a25-6b0fbee88b01',
  productName: 'Plus Audio Headband microphone system - single ear (Beige',
  provider: 'unknown',
  model: 'unknown',
  proposedTag: 'Headband Microphone',
  confidence: 0.99,
  dbError: 'Query failed after 4 attempts: column "tag_proposal_id" does not exist',
  timestamp: '2025-11-29T18:02:04.169Z'
}
[DB] [Query 57fedf44-c18f-480f-809c-d3d1af86b82c] Before query execution: {
  state: 'closed',
  failures: 31,
  consecutiveSuccesses: 0,
  threshold: 10,
  lastFailure: '2025-11-29T18:02:04.168Z',
  openUntil: null
}
[DB] Acquiring client for query 57fedf44-c18f-480f-809c-d3d1af86b82c...
[DB] [Query 6ed33af3-279f-4648-8840-af1e8ebbfab9] Before query execution: {
  state: 'closed',
  failures: 0,
  consecutiveSuccesses: 6,
  threshold: 10,
  lastFailure: null,
  openUntil: null
}
[DB] Acquiring client for query 6ed33af3-279f-4648-8840-af1e8ebbfab9...
[PASS] Client acquired for query 6ed33af3-279f-4648-8840-af1e8ebbfab9 in 1ms
[QUERY] Query 6ed33af3-279f-4648-8840-af1e8ebbfab9:
      SELECT
        job_id,
        job_type,
        status,
        total_p...
[PASS] Query 6ed33af3-279f-4648-8840-af1e8ebbfab9 completed in 154ms, rows: 1
[TREND] Consecutive successes: 7/10
[WAIT] Circuit breaker reset pending: 7/10 consecutive successes
[RELEASE] Client released for query 6ed33af3-279f-4648-8840-af1e8ebbfab9 (destroyed: false)
[DB] [Query 0718ab6e-381b-4498-88a0-4a98dd4a48f5] Before query execution: {
  state: 'closed',
  failures: 0,
  consecutiveSuccesses: 7,
  threshold: 10,
  lastFailure: null,
  openUntil: null
}
[DB] Acquiring client for query 0718ab6e-381b-4498-88a0-4a98dd4a48f5...
[PASS] Client acquired for query 0718ab6e-381b-4498-88a0-4a98dd4a48f5 in 1ms
[QUERY] Query 0718ab6e-381b-4498-88a0-4a98dd4a48f5:
      WITH batch_stats AS (
        SELECT
          COUNT(*) as completed_bat...
[PASS] New client connected to enterprise pool
[PASS] Client acquired for query 57fedf44-c18f-480f-809c-d3d1af86b82c in 949ms
[QUERY] Query 57fedf44-c18f-480f-809c-d3d1af86b82c:
      UPDATE core.supplier_product
      SET
        ai_tagging_status = $2,
 ...
[PASS] Query 0718ab6e-381b-4498-88a0-4a98dd4a48f5 completed in 154ms, rows: 1
[TREND] Consecutive successes: 8/10
[WAIT] Circuit breaker reset pending: 8/10 consecutive successes
[RELEASE] Client released for query 0718ab6e-381b-4498-88a0-4a98dd4a48f5 (destroyed: false)
[DB] [Query 9a0b4df3-1c4f-4c7f-890f-5f9aadc0ffe3] Before query execution: {
  state: 'closed',
  failures: 0,
  consecutiveSuccesses: 8,
  threshold: 10,
  lastFailure: null,
  openUntil: null
}
[DB] Acquiring client for query 9a0b4df3-1c4f-4c7f-890f-5f9aadc0ffe3...
[PASS] Client acquired for query 9a0b4df3-1c4f-4c7f-890f-5f9aadc0ffe3 in 1ms
[QUERY] Query 9a0b4df3-1c4f-4c7f-890f-5f9aadc0ffe3:
      SELECT
        batch_number,
        error_message,
        products_in_...
[PASS] Query 9a0b4df3-1c4f-4c7f-890f-5f9aadc0ffe3 completed in 154ms, rows: 0
[TREND] Consecutive successes: 9/10
[WAIT] Circuit breaker reset pending: 9/10 consecutive successes
[RELEASE] Client released for query 9a0b4df3-1c4f-4c7f-890f-5f9aadc0ffe3 (destroyed: false)
[DB] [Query 4971fde7-166e-446f-8b1f-9b5cd6b56a18] Before query execution: {
  state: 'closed',
  failures: 0,
  consecutiveSuccesses: 9,
  threshold: 10,
  lastFailure: null,
  openUntil: null
}
[DB] Acquiring client for query 4971fde7-166e-446f-8b1f-9b5cd6b56a18...
[PASS] Client acquired for query 4971fde7-166e-446f-8b1f-9b5cd6b56a18 in 0ms
[QUERY] Query 4971fde7-166e-446f-8b1f-9b5cd6b56a18:
      WITH batch_metrics AS (
        SELECT
          SUM(successful_count + ...
[PASS] Query 57fedf44-c18f-480f-809c-d3d1af86b82c completed in 329ms, rows: 1
[TREND] Consecutive successes: 1/10
[WAIT] Circuit breaker reset pending: 1/10 consecutive successes
[RELEASE] Client released for query 57fedf44-c18f-480f-809c-d3d1af86b82c (destroyed: false)
[DB] [Query 6fed63e9-f591-4084-81e1-3de7a299b909] Before query execution: {
  state: 'closed',
  failures: 31,
  consecutiveSuccesses: 1,
  threshold: 10,
  lastFailure: '2025-11-29T18:02:04.168Z',
  openUntil: null
}
[DB] Acquiring client for query 6fed63e9-f591-4084-81e1-3de7a299b909...
[PASS] Client acquired for query 6fed63e9-f591-4084-81e1-3de7a299b909 in 1ms
[QUERY] Query 6fed63e9-f591-4084-81e1-3de7a299b909:
      WITH upsert AS (
        INSERT INTO core.ai_tag_proposal (
          org...
[PASS] Query 4971fde7-166e-446f-8b1f-9b5cd6b56a18 completed in 153ms, rows: 1
[TREND] Consecutive successes: 10/10
[DB] [Circuit Breaker] Circuit breaker RESET: {
  state: 'closed',
  failures: 0,
  consecutiveSuccesses: 0,
  threshold: 10,
  lastFailure: null,
  openUntil: null
}
[RELEASE] Client released for query 4971fde7-166e-446f-8b1f-9b5cd6b56a18 (destroyed: false)
 GET /api/tag/ai-tagging/status/d0461adc-541c-4eaa-8e9e-ef6169baa32c 200 in 737ms
[FAIL] Query 6fed63e9-f591-4084-81e1-3de7a299b909 attempt 1/4 failed after 155ms: column "tag_proposal_id" does not exist
[BLOCKED] Non-retryable error detected for query 6fed63e9-f591-4084-81e1-3de7a299b909, aborting retries
[RELEASE] Client released for query 6fed63e9-f591-4084-81e1-3de7a299b909 (destroyed: true)
[TaggingEngine] Failed to record tag proposal {
  jobId: 'd0461adc-541c-4eaa-8e9e-ef6169baa32c',
  productId: '0372c911-b03c-43d5-9a25-6b0fbee88b01',
  productName: 'Plus Audio Headband microphone system - single ear (Beige',
  provider: 'unknown',
  model: 'unknown',
  proposedTag: 'Headworn Microphone',
  confidence: 0.97,
  dbError: 'Query failed after 4 attempts: column "tag_proposal_id" does not exist',
  timestamp: '2025-11-29T18:02:05.607Z'
}
[DB] [Query a231d147-9a1a-462e-b6be-79f120492731] Before query execution: {
  state: 'closed',
  failures: 32,
  consecutiveSuccesses: 0,
  threshold: 10,
  lastFailure: '2025-11-29T18:02:05.606Z',
  openUntil: null
}
[DB] Acquiring client for query a231d147-9a1a-462e-b6be-79f120492731...
[GUARD] Setting up database cleanup handlers...
[PASS] Cleanup handlers registered successfully
[READY] Unified database connection updated with enterprise manager
[PASS] New client connected to enterprise pool
[PASS] Client acquired for query a231d147-9a1a-462e-b6be-79f120492731 in 925ms
[QUERY] Query a231d147-9a1a-462e-b6be-79f120492731:
      UPDATE core.supplier_product
      SET
        ai_tagging_status = $2,
 ...
[PASS] Query a231d147-9a1a-462e-b6be-79f120492731 completed in 306ms, rows: 1
[TREND] Consecutive successes: 1/10
[WAIT] Circuit breaker reset pending: 1/10 consecutive successes
[RELEASE] Client released for query a231d147-9a1a-462e-b6be-79f120492731 (destroyed: false)
[DB] [Query d6da65e7-f87a-45d4-b521-0df242bdc45a] Before query execution: {
  state: 'closed',
  failures: 32,
  consecutiveSuccesses: 1,
  threshold: 10,
  lastFailure: '2025-11-29T18:02:05.606Z',
  openUntil: null
}
[DB] Acquiring client for query d6da65e7-f87a-45d4-b521-0df242bdc45a...
[PASS] Client acquired for query d6da65e7-f87a-45d4-b521-0df242bdc45a in 1ms
[QUERY] Query d6da65e7-f87a-45d4-b521-0df242bdc45a:
      WITH upsert AS (
        INSERT INTO core.ai_tag_proposal (
          org...
[FAIL] Query d6da65e7-f87a-45d4-b521-0df242bdc45a attempt 1/4 failed after 153ms: column "tag_proposal_id" does not exist
[BLOCKED] Non-retryable error detected for query d6da65e7-f87a-45d4-b521-0df242bdc45a, aborting retries
[RELEASE] Client released for query d6da65e7-f87a-45d4-b521-0df242bdc45a (destroyed: true)
[TaggingEngine] Failed to record tag proposal {
  jobId: 'd0461adc-541c-4eaa-8e9e-ef6169baa32c',
  productId: '0372c911-b03c-43d5-9a25-6b0fbee88b01',
  productName: 'Plus Audio Headband microphone system - single ear (Beige',
  provider: 'unknown',
  model: 'unknown',
  proposedTag: 'Single Ear Mic',
  confidence: 0.97,
  dbError: 'Query failed after 4 attempts: column "tag_proposal_id" does not exist',
  timestamp: '2025-11-29T18:02:06.994Z'
}
[DB] [Query 818d91ac-1a34-47f2-93db-2c56d62a9784] Before query execution: {
  state: 'closed',
  failures: 33,
  consecutiveSuccesses: 0,
  threshold: 10,
  lastFailure: '2025-11-29T18:02:06.993Z',
  openUntil: null
}
[DB] Acquiring client for query 818d91ac-1a34-47f2-93db-2c56d62a9784...
[DB] [Query ec2d594c-444c-44b8-a2ec-5006c791e0d5] Before query execution: {
  state: 'closed',
  failures: 0,
  consecutiveSuccesses: 0,
  threshold: 10,
  lastFailure: null,
  openUntil: null
}
[DB] Acquiring client for query ec2d594c-444c-44b8-a2ec-5006c791e0d5...
[PASS] Client acquired for query ec2d594c-444c-44b8-a2ec-5006c791e0d5 in 1ms
[QUERY] Query ec2d594c-444c-44b8-a2ec-5006c791e0d5:
      SELECT
        job_id,
        job_type,
        status,
        total_p...
[PASS] New client connected to enterprise pool
[PASS] Client acquired for query 818d91ac-1a34-47f2-93db-2c56d62a9784 in 941ms
[QUERY] Query 818d91ac-1a34-47f2-93db-2c56d62a9784:
      UPDATE core.supplier_product
      SET
        ai_tagging_status = $2,
 ...
[PASS] Query ec2d594c-444c-44b8-a2ec-5006c791e0d5 completed in 153ms, rows: 1
[TREND] Consecutive successes: 1/10
[WAIT] Circuit breaker reset pending: 1/10 consecutive successes
[RELEASE] Client released for query ec2d594c-444c-44b8-a2ec-5006c791e0d5 (destroyed: false)
[DB] [Query b69fc57a-a63b-47d9-a25d-21690893ef59] Before query execution: {
  state: 'closed',
  failures: 0,
  consecutiveSuccesses: 1,
  threshold: 10,
  lastFailure: null,
  openUntil: null
}
[DB] Acquiring client for query b69fc57a-a63b-47d9-a25d-21690893ef59...
[PASS] Client acquired for query b69fc57a-a63b-47d9-a25d-21690893ef59 in 1ms
[QUERY] Query b69fc57a-a63b-47d9-a25d-21690893ef59:
      WITH batch_stats AS (
        SELECT
          COUNT(*) as completed_bat...
[PASS] Query b69fc57a-a63b-47d9-a25d-21690893ef59 completed in 154ms, rows: 1
[TREND] Consecutive successes: 2/10
[WAIT] Circuit breaker reset pending: 2/10 consecutive successes
[RELEASE] Client released for query b69fc57a-a63b-47d9-a25d-21690893ef59 (destroyed: false)
[DB] [Query 4ed31e1f-a829-47b7-9b34-928653162300] Before query execution: {
  state: 'closed',
  failures: 0,
  consecutiveSuccesses: 2,
  threshold: 10,
  lastFailure: null,
  openUntil: null
}
[DB] Acquiring client for query 4ed31e1f-a829-47b7-9b34-928653162300...
[PASS] Client acquired for query 4ed31e1f-a829-47b7-9b34-928653162300 in 0ms
[QUERY] Query 4ed31e1f-a829-47b7-9b34-928653162300:
      SELECT
        batch_number,
        error_message,
        products_in_...
[PASS] Query 818d91ac-1a34-47f2-93db-2c56d62a9784 completed in 305ms, rows: 1
[TREND] Consecutive successes: 1/10
[WAIT] Circuit breaker reset pending: 1/10 consecutive successes
[RELEASE] Client released for query 818d91ac-1a34-47f2-93db-2c56d62a9784 (destroyed: false)
[DB] [Query d5e83f7b-2022-49f2-970f-6df520b33d71] Before query execution: {
  state: 'closed',
  failures: 33,
  consecutiveSuccesses: 1,
  threshold: 10,
  lastFailure: '2025-11-29T18:02:06.993Z',
  openUntil: null
}
[DB] Acquiring client for query d5e83f7b-2022-49f2-970f-6df520b33d71...
[PASS] Client acquired for query d5e83f7b-2022-49f2-970f-6df520b33d71 in 0ms
[QUERY] Query d5e83f7b-2022-49f2-970f-6df520b33d71:
      WITH upsert AS (
        INSERT INTO core.ai_tag_proposal (
          org...
[PASS] Query 4ed31e1f-a829-47b7-9b34-928653162300 completed in 153ms, rows: 0
[TREND] Consecutive successes: 3/10
[WAIT] Circuit breaker reset pending: 3/10 consecutive successes
[RELEASE] Client released for query 4ed31e1f-a829-47b7-9b34-928653162300 (destroyed: false)
[DB] [Query e4a9af0f-f0a0-41da-91e9-0480ae67fd92] Before query execution: {
  state: 'closed',
  failures: 0,
  consecutiveSuccesses: 3,
  threshold: 10,
  lastFailure: null,
  openUntil: null
}
[DB] Acquiring client for query e4a9af0f-f0a0-41da-91e9-0480ae67fd92...
[PASS] Client acquired for query e4a9af0f-f0a0-41da-91e9-0480ae67fd92 in 1ms
[QUERY] Query e4a9af0f-f0a0-41da-91e9-0480ae67fd92:
      WITH batch_metrics AS (
        SELECT
          SUM(successful_count + ...
[FAIL] Query d5e83f7b-2022-49f2-970f-6df520b33d71 attempt 1/4 failed after 152ms: column "tag_proposal_id" does not exist
[BLOCKED] Non-retryable error detected for query d5e83f7b-2022-49f2-970f-6df520b33d71, aborting retries
[RELEASE] Client released for query d5e83f7b-2022-49f2-970f-6df520b33d71 (destroyed: true)
[TaggingEngine] Failed to record tag proposal {
  jobId: 'd0461adc-541c-4eaa-8e9e-ef6169baa32c',
  productId: '0372c911-b03c-43d5-9a25-6b0fbee88b01',
  productName: 'Plus Audio Headband microphone system - single ear (Beige',
  provider: 'unknown',
  model: 'unknown',
  proposedTag: 'Beige',
  confidence: 0.93,
  dbError: 'Query failed after 4 attempts: column "tag_proposal_id" does not exist',
  timestamp: '2025-11-29T18:02:08.396Z'
}
[DB] [Query f7c8f826-82f9-4235-8752-d7b8b27b6b49] Before query execution: {
  state: 'closed',
  failures: 34,
  consecutiveSuccesses: 0,
  threshold: 10,
  lastFailure: '2025-11-29T18:02:08.396Z',
  openUntil: null
}
[DB] Acquiring client for query f7c8f826-82f9-4235-8752-d7b8b27b6b49...
[PASS] Query e4a9af0f-f0a0-41da-91e9-0480ae67fd92 completed in 154ms, rows: 1
[TREND] Consecutive successes: 4/10
[WAIT] Circuit breaker reset pending: 4/10 consecutive successes
[RELEASE] Client released for query e4a9af0f-f0a0-41da-91e9-0480ae67fd92 (destroyed: false)
 GET /api/tag/ai-tagging/status/d0461adc-541c-4eaa-8e9e-ef6169baa32c 200 in 733ms
[DB] [Query 69564373-89ef-4807-8004-f9808040d4f4] Before query execution: {
  state: 'closed',
  failures: 0,
  consecutiveSuccesses: 4,
  threshold: 10,
  lastFailure: null,
  openUntil: null
}
[DB] Acquiring client for query 69564373-89ef-4807-8004-f9808040d4f4...
[PASS] Client acquired for query 69564373-89ef-4807-8004-f9808040d4f4 in 2ms
[QUERY] Query 69564373-89ef-4807-8004-f9808040d4f4:
      SELECT
        job_id,
        job_type,
        status,
        total_p...
[GUARD] Setting up database cleanup handlers...
[PASS] Cleanup handlers registered successfully
[READY] Unified database connection updated with enterprise manager
[PASS] Query 69564373-89ef-4807-8004-f9808040d4f4 completed in 305ms, rows: 20
[TREND] Consecutive successes: 5/10
[WAIT] Circuit breaker reset pending: 5/10 consecutive successes
[RELEASE] Client released for query 69564373-89ef-4807-8004-f9808040d4f4 (destroyed: false)
 GET /api/tag/ai-tagging/jobs?limit=20 200 in 451ms
[PASS] New client connected to enterprise pool
[PASS] Client acquired for query f7c8f826-82f9-4235-8752-d7b8b27b6b49 in 936ms
[QUERY] Query f7c8f826-82f9-4235-8752-d7b8b27b6b49:
      UPDATE core.supplier_product
      SET
        ai_tagging_status = $2,
 ...
[PASS] Query f7c8f826-82f9-4235-8752-d7b8b27b6b49 completed in 307ms, rows: 1
[TREND] Consecutive successes: 1/10
[WAIT] Circuit breaker reset pending: 1/10 consecutive successes
[RELEASE] Client released for query f7c8f826-82f9-4235-8752-d7b8b27b6b49 (destroyed: false)
[DB] [Query 36e3797f-9fa6-470b-97d9-80274718b63d] Before query execution: {
  state: 'closed',
  failures: 34,
  consecutiveSuccesses: 1,
  threshold: 10,
  lastFailure: '2025-11-29T18:02:08.396Z',
  openUntil: null
}
[DB] Acquiring client for query 36e3797f-9fa6-470b-97d9-80274718b63d...
[PASS] Client acquired for query 36e3797f-9fa6-470b-97d9-80274718b63d in 0ms
[QUERY] Query 36e3797f-9fa6-470b-97d9-80274718b63d:
      WITH upsert AS (
        INSERT INTO core.ai_tag_proposal (
          org...
[FAIL] Query 36e3797f-9fa6-470b-97d9-80274718b63d attempt 1/4 failed after 153ms: column "tag_proposal_id" does not exist
[BLOCKED] Non-retryable error detected for query 36e3797f-9fa6-470b-97d9-80274718b63d, aborting retries
[RELEASE] Client released for query 36e3797f-9fa6-470b-97d9-80274718b63d (destroyed: true)
[TaggingEngine] Failed to record tag proposal {
  jobId: 'd0461adc-541c-4eaa-8e9e-ef6169baa32c',
  productId: '0372c911-b03c-43d5-9a25-6b0fbee88b01',
  productName: 'Plus Audio Headband microphone system - single ear (Beige',
  provider: 'unknown',
  model: 'unknown',
  proposedTag: 'Wireless Microphone System',
  confidence: 0.98,
  dbError: 'Query failed after 4 attempts: column "tag_proposal_id" does not exist',
  timestamp: '2025-11-29T18:02:09.797Z'
}
[DB] [Query 1e23f75b-0009-4afb-a7d1-0f9ad92f5194] Before query execution: {
  state: 'closed',
  failures: 35,
  consecutiveSuccesses: 0,
  threshold: 10,
  lastFailure: '2025-11-29T18:02:09.797Z',
  openUntil: null
}
[DB] Acquiring client for query 1e23f75b-0009-4afb-a7d1-0f9ad92f5194...
[PASS] New client connected to enterprise pool
[PASS] Client acquired for query 1e23f75b-0009-4afb-a7d1-0f9ad92f5194 in 924ms
[QUERY] Query 1e23f75b-0009-4afb-a7d1-0f9ad92f5194:
      UPDATE core.supplier_product
      SET
        ai_tagging_status = $2,
 ...
[DB] [Query 84cc64ca-bf26-4b52-a478-f9a4b5a48568] Before query execution: {
  state: 'closed',
  failures: 0,
  consecutiveSuccesses: 5,
  threshold: 10,
  lastFailure: null,
  openUntil: null
}
[DB] Acquiring client for query 84cc64ca-bf26-4b52-a478-f9a4b5a48568...
[PASS] Client acquired for query 84cc64ca-bf26-4b52-a478-f9a4b5a48568 in 0ms
[QUERY] Query 84cc64ca-bf26-4b52-a478-f9a4b5a48568:
      SELECT
        job_id,
        job_type,
        status,
        total_p...
[PASS] Query 84cc64ca-bf26-4b52-a478-f9a4b5a48568 completed in 153ms, rows: 1
[TREND] Consecutive successes: 6/10
[WAIT] Circuit breaker reset pending: 6/10 consecutive successes
[RELEASE] Client released for query 84cc64ca-bf26-4b52-a478-f9a4b5a48568 (destroyed: false)
[DB] [Query 07bb5832-980c-4953-8717-7e712fa28be6] Before query execution: {
  state: 'closed',
  failures: 0,
  consecutiveSuccesses: 6,
  threshold: 10,
  lastFailure: null,
  openUntil: null
}
[DB] Acquiring client for query 07bb5832-980c-4953-8717-7e712fa28be6...
[PASS] Client acquired for query 07bb5832-980c-4953-8717-7e712fa28be6 in 1ms
[QUERY] Query 07bb5832-980c-4953-8717-7e712fa28be6:
      WITH batch_stats AS (
        SELECT
          COUNT(*) as completed_bat...
[PASS] Query 1e23f75b-0009-4afb-a7d1-0f9ad92f5194 completed in 307ms, rows: 1
[TREND] Consecutive successes: 1/10
[WAIT] Circuit breaker reset pending: 1/10 consecutive successes
[RELEASE] Client released for query 1e23f75b-0009-4afb-a7d1-0f9ad92f5194 (destroyed: false)
[DB] [Query 0d73cea5-eb06-4790-abda-bc7aa8def78a] Before query execution: {
  state: 'closed',
  failures: 35,
  consecutiveSuccesses: 1,
  threshold: 10,
  lastFailure: '2025-11-29T18:02:09.797Z',
  openUntil: null
}
[DB] Acquiring client for query 0d73cea5-eb06-4790-abda-bc7aa8def78a...
[PASS] Client acquired for query 0d73cea5-eb06-4790-abda-bc7aa8def78a in 1ms
[QUERY] Query 0d73cea5-eb06-4790-abda-bc7aa8def78a:
      WITH upsert AS (
        INSERT INTO core.ai_tag_proposal (
          org...
[PASS] Query 07bb5832-980c-4953-8717-7e712fa28be6 completed in 153ms, rows: 1
[TREND] Consecutive successes: 7/10
[WAIT] Circuit breaker reset pending: 7/10 consecutive successes
[RELEASE] Client released for query 07bb5832-980c-4953-8717-7e712fa28be6 (destroyed: false)
[DB] [Query 94a03ee7-ee0c-462c-90a7-64d9f381842d] Before query execution: {
  state: 'closed',
  failures: 0,
  consecutiveSuccesses: 7,
  threshold: 10,
  lastFailure: null,
  openUntil: null
}
[DB] Acquiring client for query 94a03ee7-ee0c-462c-90a7-64d9f381842d...
[PASS] Client acquired for query 94a03ee7-ee0c-462c-90a7-64d9f381842d in 0ms
[QUERY] Query 94a03ee7-ee0c-462c-90a7-64d9f381842d:
      SELECT
        batch_number,
        error_message,
        products_in_...
[FAIL] Query 0d73cea5-eb06-4790-abda-bc7aa8def78a attempt 1/4 failed after 153ms: column "tag_proposal_id" does not exist
[BLOCKED] Non-retryable error detected for query 0d73cea5-eb06-4790-abda-bc7aa8def78a, aborting retries
[RELEASE] Client released for query 0d73cea5-eb06-4790-abda-bc7aa8def78a (destroyed: true)
[TaggingEngine] Failed to record tag proposal {
  jobId: 'd0461adc-541c-4eaa-8e9e-ef6169baa32c',
  productId: '0372c911-b03c-43d5-9a25-6b0fbee88b01',
  productName: 'Plus Audio Headband microphone system - single ear (Beige',
  provider: 'unknown',
  model: 'unknown',
  proposedTag: 'Presentation Microphone',
  confidence: 0.88,
  dbError: 'Query failed after 4 attempts: column "tag_proposal_id" does not exist',
  timestamp: '2025-11-29T18:02:11.186Z'
}
[DB] [Query f38c5a18-5aa6-4cd4-8e74-ebdaf95b54e0] Before query execution: {
  state: 'closed',
  failures: 36,
  consecutiveSuccesses: 0,
  threshold: 10,
  lastFailure: '2025-11-29T18:02:11.185Z',
  openUntil: null
}
[DB] Acquiring client for query f38c5a18-5aa6-4cd4-8e74-ebdaf95b54e0...
[PASS] Query 94a03ee7-ee0c-462c-90a7-64d9f381842d completed in 153ms, rows: 0
[TREND] Consecutive successes: 8/10
[WAIT] Circuit breaker reset pending: 8/10 consecutive successes
[RELEASE] Client released for query 94a03ee7-ee0c-462c-90a7-64d9f381842d (destroyed: false)
[DB] [Query bc37ccdb-41eb-4a95-bbf2-2777195520a9] Before query execution: {
  state: 'closed',
  failures: 0,
  consecutiveSuccesses: 8,
  threshold: 10,
  lastFailure: null,
  openUntil: null
}
[DB] Acquiring client for query bc37ccdb-41eb-4a95-bbf2-2777195520a9...
[PASS] Client acquired for query bc37ccdb-41eb-4a95-bbf2-2777195520a9 in 1ms
[QUERY] Query bc37ccdb-41eb-4a95-bbf2-2777195520a9:
      WITH batch_metrics AS (
        SELECT
          SUM(successful_count + ...
[PASS] Query bc37ccdb-41eb-4a95-bbf2-2777195520a9 completed in 153ms, rows: 1
[TREND] Consecutive successes: 9/10
[WAIT] Circuit breaker reset pending: 9/10 consecutive successes
[RELEASE] Client released for query bc37ccdb-41eb-4a95-bbf2-2777195520a9 (destroyed: false)
 GET /api/tag/ai-tagging/status/d0461adc-541c-4eaa-8e9e-ef6169baa32c 200 in 733ms
[DB] [Query df07e51d-f4a1-45b9-ba1e-c9db2d4ee172] Before query execution: {
  state: 'closed',
  failures: 0,
  consecutiveSuccesses: 9,
  threshold: 10,
  lastFailure: null,
  openUntil: null
}
[DB] Acquiring client for query df07e51d-f4a1-45b9-ba1e-c9db2d4ee172...
[PASS] Client acquired for query df07e51d-f4a1-45b9-ba1e-c9db2d4ee172 in 0ms
[QUERY] Query df07e51d-f4a1-45b9-ba1e-c9db2d4ee172:
      SELECT
        job_id,
        job_type,
        status,
        total_p...
[DB] [Query 00335f87-fd4e-410a-90c7-fbbd80bf7354] Before query execution: {
  state: 'closed',
  failures: 0,
  consecutiveSuccesses: 9,
  threshold: 10,
  lastFailure: null,
  openUntil: null
}
[DB] Acquiring client for query 00335f87-fd4e-410a-90c7-fbbd80bf7354...
[PASS] Client acquired for query 00335f87-fd4e-410a-90c7-fbbd80bf7354 in 1ms
[QUERY] Query 00335f87-fd4e-410a-90c7-fbbd80bf7354:
      SELECT
        job_id,
        job_type,
        status,
        total_p...
[PASS] Query 00335f87-fd4e-410a-90c7-fbbd80bf7354 completed in 153ms, rows: 1
[TREND] Consecutive successes: 10/10
[DB] [Circuit Breaker] Circuit breaker RESET: {
  state: 'closed',
  failures: 0,
  consecutiveSuccesses: 0,
  threshold: 10,
  lastFailure: null,
  openUntil: null
}
[RELEASE] Client released for query 00335f87-fd4e-410a-90c7-fbbd80bf7354 (destroyed: false)
[DB] [Query 8c34ba84-5f96-4b37-b261-6b5b27a74309] Before query execution: {
  state: 'closed',
  failures: 0,
  consecutiveSuccesses: 0,
  threshold: 10,
  lastFailure: null,
  openUntil: null
}
[DB] Acquiring client for query 8c34ba84-5f96-4b37-b261-6b5b27a74309...
[PASS] Client acquired for query 8c34ba84-5f96-4b37-b261-6b5b27a74309 in 1ms
[QUERY] Query 8c34ba84-5f96-4b37-b261-6b5b27a74309:
      WITH batch_stats AS (
        SELECT
          COUNT(*) as completed_bat...
[PASS] New client connected to enterprise pool
[PASS] Client acquired for query f38c5a18-5aa6-4cd4-8e74-ebdaf95b54e0 in 1011ms
[QUERY] Query f38c5a18-5aa6-4cd4-8e74-ebdaf95b54e0:
      UPDATE core.supplier_product
      SET
        ai_tagging_status = $2,
 ...
[PASS] Query df07e51d-f4a1-45b9-ba1e-c9db2d4ee172 completed in 306ms, rows: 20
[TREND] Consecutive successes: 1/10
[WAIT] Circuit breaker reset pending: 1/10 consecutive successes
[RELEASE] Client released for query df07e51d-f4a1-45b9-ba1e-c9db2d4ee172 (destroyed: false)
 GET /api/tag/ai-tagging/jobs?limit=20 200 in 659ms
[PASS] Query 8c34ba84-5f96-4b37-b261-6b5b27a74309 completed in 153ms, rows: 1
[TREND] Consecutive successes: 2/10
[WAIT] Circuit breaker reset pending: 2/10 consecutive successes
[RELEASE] Client released for query 8c34ba84-5f96-4b37-b261-6b5b27a74309 (destroyed: false)
[DB] [Query 9e660b19-3a37-4115-a021-d4da9aabcb36] Before query execution: {
  state: 'closed',
  failures: 0,
  consecutiveSuccesses: 2,
  threshold: 10,
  lastFailure: null,
  openUntil: null
}
[DB] Acquiring client for query 9e660b19-3a37-4115-a021-d4da9aabcb36...
[PASS] Client acquired for query 9e660b19-3a37-4115-a021-d4da9aabcb36 in 2ms
[QUERY] Query 9e660b19-3a37-4115-a021-d4da9aabcb36:
      SELECT
        batch_number,
        error_message,
        products_in_...
[GUARD] Setting up database cleanup handlers...
[PASS] Cleanup handlers registered successfully
[READY] Unified database connection updated with enterprise manager
[PASS] Query f38c5a18-5aa6-4cd4-8e74-ebdaf95b54e0 completed in 303ms, rows: 1
[TREND] Consecutive successes: 1/10
[WAIT] Circuit breaker reset pending: 1/10 consecutive successes
[RELEASE] Client released for query f38c5a18-5aa6-4cd4-8e74-ebdaf95b54e0 (destroyed: false)
[DB] [Query eacce71d-de3e-4320-902a-8a11436c71a7] Before query execution: {
  state: 'closed',
  failures: 36,
  consecutiveSuccesses: 1,
  threshold: 10,
  lastFailure: '2025-11-29T18:02:11.185Z',
  openUntil: null
}
[DB] Acquiring client for query eacce71d-de3e-4320-902a-8a11436c71a7...
[PASS] Client acquired for query eacce71d-de3e-4320-902a-8a11436c71a7 in 1ms
[QUERY] Query eacce71d-de3e-4320-902a-8a11436c71a7:
      WITH upsert AS (
        INSERT INTO core.ai_tag_proposal (
          org...
[PASS] Query 9e660b19-3a37-4115-a021-d4da9aabcb36 completed in 153ms, rows: 0
[TREND] Consecutive successes: 3/10
[WAIT] Circuit breaker reset pending: 3/10 consecutive successes
[RELEASE] Client released for query 9e660b19-3a37-4115-a021-d4da9aabcb36 (destroyed: false)
[DB] [Query 8ae247a4-7615-44ac-84ef-21c6ff8c0ed5] Before query execution: {
  state: 'closed',
  failures: 0,
  consecutiveSuccesses: 3,
  threshold: 10,
  lastFailure: null,
  openUntil: null
}
[DB] Acquiring client for query 8ae247a4-7615-44ac-84ef-21c6ff8c0ed5...
[PASS] Client acquired for query 8ae247a4-7615-44ac-84ef-21c6ff8c0ed5 in 1ms
[QUERY] Query 8ae247a4-7615-44ac-84ef-21c6ff8c0ed5:
      WITH batch_metrics AS (
        SELECT
          SUM(successful_count + ...
[FAIL] Query eacce71d-de3e-4320-902a-8a11436c71a7 attempt 1/4 failed after 152ms: column "tag_proposal_id" does not exist
[BLOCKED] Non-retryable error detected for query eacce71d-de3e-4320-902a-8a11436c71a7, aborting retries
[RELEASE] Client released for query eacce71d-de3e-4320-902a-8a11436c71a7 (destroyed: true)
[TaggingEngine] Failed to record tag proposal {
  jobId: 'd0461adc-541c-4eaa-8e9e-ef6169baa32c',
  productId: '0372c911-b03c-43d5-9a25-6b0fbee88b01',
  productName: 'Plus Audio Headband microphone system - single ear (Beige',
  provider: 'unknown',
  model: 'unknown',
  proposedTag: 'Theatre & Stage',
  confidence: 0.86,
  dbError: 'Query failed after 4 attempts: column "tag_proposal_id" does not exist',
  timestamp: '2025-11-29T18:02:12.657Z'
}
[DB] [Query 3a421f85-9f65-4b41-9559-df8aa96d69e0] Before query execution: {
  state: 'closed',
  failures: 37,
  consecutiveSuccesses: 0,
  threshold: 10,
  lastFailure: '2025-11-29T18:02:12.656Z',
  openUntil: null
}
[DB] Acquiring client for query 3a421f85-9f65-4b41-9559-df8aa96d69e0...
[PASS] Query 8ae247a4-7615-44ac-84ef-21c6ff8c0ed5 completed in 152ms, rows: 1
[TREND] Consecutive successes: 4/10
[WAIT] Circuit breaker reset pending: 4/10 consecutive successes
[RELEASE] Client released for query 8ae247a4-7615-44ac-84ef-21c6ff8c0ed5 (destroyed: false)
 GET /api/tag/ai-tagging/status/d0461adc-541c-4eaa-8e9e-ef6169baa32c 200 in 989ms
[PASS] New client connected to enterprise pool
[PASS] Client acquired for query 3a421f85-9f65-4b41-9559-df8aa96d69e0 in 924ms
[QUERY] Query 3a421f85-9f65-4b41-9559-df8aa96d69e0:
      UPDATE core.supplier_product
      SET
        ai_tagging_status = $2,
 ...
[DB] [Query b90cbc0f-08bf-47f1-8894-c1fcf271f8b1] Before query execution: {
  state: 'closed',
  failures: 0,
  consecutiveSuccesses: 4,
  threshold: 10,
  lastFailure: null,
  openUntil: null
}
[DB] Acquiring client for query b90cbc0f-08bf-47f1-8894-c1fcf271f8b1...
[PASS] Client acquired for query b90cbc0f-08bf-47f1-8894-c1fcf271f8b1 in 0ms
[QUERY] Query b90cbc0f-08bf-47f1-8894-c1fcf271f8b1:
      SELECT
        job_id,
        job_type,
        status,
        total_p...
[DB] [Query b66a8d76-ce24-47ca-a4e5-e25d0d9759f1] Before query execution: {
  state: 'closed',
  failures: 0,
  consecutiveSuccesses: 4,
  threshold: 10,
  lastFailure: null,
  openUntil: null
}
[DB] Acquiring client for query b66a8d76-ce24-47ca-a4e5-e25d0d9759f1...
[PASS] Client acquired for query b66a8d76-ce24-47ca-a4e5-e25d0d9759f1 in 0ms
[QUERY] Query b66a8d76-ce24-47ca-a4e5-e25d0d9759f1:
      SELECT
        job_id,
        job_type,
        status,
        total_p...
[PASS] Query 3a421f85-9f65-4b41-9559-df8aa96d69e0 completed in 316ms, rows: 1
[TREND] Consecutive successes: 1/10
[WAIT] Circuit breaker reset pending: 1/10 consecutive successes
[RELEASE] Client released for query 3a421f85-9f65-4b41-9559-df8aa96d69e0 (destroyed: false)
[DB] [Query 6496aafc-918e-4411-9a43-d29b5a713604] Before query execution: {
  state: 'closed',
  failures: 37,
  consecutiveSuccesses: 1,
  threshold: 10,
  lastFailure: '2025-11-29T18:02:12.656Z',
  openUntil: null
}
[DB] Acquiring client for query 6496aafc-918e-4411-9a43-d29b5a713604...
[PASS] Client acquired for query 6496aafc-918e-4411-9a43-d29b5a713604 in 0ms
[QUERY] Query 6496aafc-918e-4411-9a43-d29b5a713604:
      WITH upsert AS (
        INSERT INTO core.ai_tag_proposal (
          org...
[PASS] Query b66a8d76-ce24-47ca-a4e5-e25d0d9759f1 completed in 153ms, rows: 1
[TREND] Consecutive successes: 5/10
[WAIT] Circuit breaker reset pending: 5/10 consecutive successes
[RELEASE] Client released for query b66a8d76-ce24-47ca-a4e5-e25d0d9759f1 (destroyed: false)
[DB] [Query 6e446a64-e6ea-41e2-81fe-08330dfec21b] Before query execution: {
  state: 'closed',
  failures: 0,
  consecutiveSuccesses: 5,
  threshold: 10,
  lastFailure: null,
  openUntil: null
}
[DB] Acquiring client for query 6e446a64-e6ea-41e2-81fe-08330dfec21b...
[PASS] Client acquired for query 6e446a64-e6ea-41e2-81fe-08330dfec21b in 1ms
[QUERY] Query 6e446a64-e6ea-41e2-81fe-08330dfec21b:
      WITH batch_stats AS (
        SELECT
          COUNT(*) as completed_bat...
[FAIL] Query 6496aafc-918e-4411-9a43-d29b5a713604 attempt 1/4 failed after 153ms: column "tag_proposal_id" does not exist
[BLOCKED] Non-retryable error detected for query 6496aafc-918e-4411-9a43-d29b5a713604, aborting retries
[RELEASE] Client released for query 6496aafc-918e-4411-9a43-d29b5a713604 (destroyed: true)
[TaggingEngine] Failed to record tag proposal {
  jobId: 'd0461adc-541c-4eaa-8e9e-ef6169baa32c',
  productId: '0372c911-b03c-43d5-9a25-6b0fbee88b01',
  productName: 'Plus Audio Headband microphone system - single ear (Beige',
  provider: 'unknown',
  model: 'unknown',
  proposedTag: 'Plus Audio',
  confidence: 0.99,
  dbError: 'Query failed after 4 attempts: column "tag_proposal_id" does not exist',
  timestamp: '2025-11-29T18:02:14.055Z'
}
[DB] [Query 14b81b05-90fe-4438-8376-61bbe4b87a5f] Before query execution: {
  state: 'closed',
  failures: 38,
  consecutiveSuccesses: 0,
  threshold: 10,
  lastFailure: '2025-11-29T18:02:14.055Z',
  openUntil: null
}
[DB] Acquiring client for query 14b81b05-90fe-4438-8376-61bbe4b87a5f...
[PASS] Query b90cbc0f-08bf-47f1-8894-c1fcf271f8b1 completed in 304ms, rows: 20
[TREND] Consecutive successes: 6/10
[WAIT] Circuit breaker reset pending: 6/10 consecutive successes
[RELEASE] Client released for query b90cbc0f-08bf-47f1-8894-c1fcf271f8b1 (destroyed: false)
 GET /api/tag/ai-tagging/jobs?limit=20 200 in 410ms
[PASS] Query 6e446a64-e6ea-41e2-81fe-08330dfec21b completed in 240ms, rows: 1
[TREND] Consecutive successes: 7/10
[WAIT] Circuit breaker reset pending: 7/10 consecutive successes
[RELEASE] Client released for query 6e446a64-e6ea-41e2-81fe-08330dfec21b (destroyed: false)
[DB] [Query 552195dc-863e-4f2b-87c6-63cab10dbcd9] Before query execution: {
  state: 'closed',
  failures: 0,
  consecutiveSuccesses: 7,
  threshold: 10,
  lastFailure: null,
  openUntil: null
}
[DB] Acquiring client for query 552195dc-863e-4f2b-87c6-63cab10dbcd9...
[PASS] Client acquired for query 552195dc-863e-4f2b-87c6-63cab10dbcd9 in 1ms
[QUERY] Query 552195dc-863e-4f2b-87c6-63cab10dbcd9:
      SELECT
        batch_number,
        error_message,
        products_in_...
[PASS] Query 552195dc-863e-4f2b-87c6-63cab10dbcd9 completed in 153ms, rows: 0
[TREND] Consecutive successes: 8/10
[WAIT] Circuit breaker reset pending: 8/10 consecutive successes
[RELEASE] Client released for query 552195dc-863e-4f2b-87c6-63cab10dbcd9 (destroyed: false)
[DB] [Query 669c002b-edfb-4cd6-9cf3-8f8e98892cd5] Before query execution: {
  state: 'closed',
  failures: 0,
  consecutiveSuccesses: 8,
  threshold: 10,
  lastFailure: null,
  openUntil: null
}
[DB] Acquiring client for query 669c002b-edfb-4cd6-9cf3-8f8e98892cd5...
[PASS] Client acquired for query 669c002b-edfb-4cd6-9cf3-8f8e98892cd5 in 0ms
[QUERY] Query 669c002b-edfb-4cd6-9cf3-8f8e98892cd5:
      WITH batch_metrics AS (
        SELECT
          SUM(successful_count + ...
[PASS] Query 669c002b-edfb-4cd6-9cf3-8f8e98892cd5 completed in 153ms, rows: 1
[TREND] Consecutive successes: 9/10
[WAIT] Circuit breaker reset pending: 9/10 consecutive successes
[RELEASE] Client released for query 669c002b-edfb-4cd6-9cf3-8f8e98892cd5 (destroyed: false)
 GET /api/tag/ai-tagging/status/d0461adc-541c-4eaa-8e9e-ef6169baa32c 200 in 846ms
[PASS] New client connected to enterprise pool
[PASS] Client acquired for query 14b81b05-90fe-4438-8376-61bbe4b87a5f in 926ms
[QUERY] Query 14b81b05-90fe-4438-8376-61bbe4b87a5f:
      UPDATE core.supplier_product
      SET
        ai_tagging_status = $2,
 ...
[GUARD] Setting up database cleanup handlers...
[PASS] Cleanup handlers registered successfully
[READY] Unified database connection updated with enterprise manager
[PASS] Query 14b81b05-90fe-4438-8376-61bbe4b87a5f completed in 308ms, rows: 1
[TREND] Consecutive successes: 1/10
[WAIT] Circuit breaker reset pending: 1/10 consecutive successes
[RELEASE] Client released for query 14b81b05-90fe-4438-8376-61bbe4b87a5f (destroyed: false)
[DB] [Query 3040c5b5-30c1-4be8-9312-34b31d52307f] Before query execution: {
  state: 'closed',
  failures: 38,
  consecutiveSuccesses: 1,
  threshold: 10,
  lastFailure: '2025-11-29T18:02:14.055Z',
  openUntil: null
}
[DB] Acquiring client for query 3040c5b5-30c1-4be8-9312-34b31d52307f...
[PASS] Client acquired for query 3040c5b5-30c1-4be8-9312-34b31d52307f in 1ms
[QUERY] Query 3040c5b5-30c1-4be8-9312-34b31d52307f:
      WITH upsert AS (
        INSERT INTO core.ai_tag_proposal (
          org...
[FAIL] Query 3040c5b5-30c1-4be8-9312-34b31d52307f attempt 1/4 failed after 156ms: column "tag_proposal_id" does not exist
[BLOCKED] Non-retryable error detected for query 3040c5b5-30c1-4be8-9312-34b31d52307f, aborting retries
[RELEASE] Client released for query 3040c5b5-30c1-4be8-9312-34b31d52307f (destroyed: true)
[TaggingEngine] Failed to record tag proposal {
  jobId: 'd0461adc-541c-4eaa-8e9e-ef6169baa32c',
  productId: '0372c911-b03c-43d5-9a25-6b0fbee88b01',
  productName: 'Plus Audio Headband microphone system - single ear (Beige',
  provider: 'unknown',
  model: 'unknown',
  proposedTag: 'Active Music Distribution',
  confidence: 0.99,
  dbError: 'Query failed after 4 attempts: column "tag_proposal_id" does not exist',
  timestamp: '2025-11-29T18:02:15.450Z'
}
[DB] [Query 213a2d32-6cff-49ff-8fd0-49147f7a44f7] Before query execution: {
  state: 'closed',
  failures: 39,
  consecutiveSuccesses: 0,
  threshold: 10,
  lastFailure: '2025-11-29T18:02:15.449Z',
  openUntil: null
}
[DB] Acquiring client for query 213a2d32-6cff-49ff-8fd0-49147f7a44f7...
[PASS] New client connected to enterprise pool
[PASS] Client acquired for query 213a2d32-6cff-49ff-8fd0-49147f7a44f7 in 924ms
[QUERY] Query 213a2d32-6cff-49ff-8fd0-49147f7a44f7:
      UPDATE core.supplier_product
      SET
        ai_tagging_status = $2,
 ...
[PASS] Query 213a2d32-6cff-49ff-8fd0-49147f7a44f7 completed in 306ms, rows: 1
[TREND] Consecutive successes: 1/10
[WAIT] Circuit breaker reset pending: 1/10 consecutive successes
[RELEASE] Client released for query 213a2d32-6cff-49ff-8fd0-49147f7a44f7 (destroyed: false)
[DB] [Query a3638fd9-7f49-4878-a95e-30b49123fdc9] Before query execution: {
  state: 'closed',
  failures: 39,
  consecutiveSuccesses: 1,
  threshold: 10,
  lastFailure: '2025-11-29T18:02:15.449Z',
  openUntil: null
}
[DB] Acquiring client for query a3638fd9-7f49-4878-a95e-30b49123fdc9...
[PASS] Client acquired for query a3638fd9-7f49-4878-a95e-30b49123fdc9 in 0ms
[QUERY] Query a3638fd9-7f49-4878-a95e-30b49123fdc9:
      WITH upsert AS (
        INSERT INTO core.ai_tag_proposal (
          org...
[DB] [Query 41827235-93ac-4846-98b3-894de79fdba9] Before query execution: {
  state: 'closed',
  failures: 0,
  consecutiveSuccesses: 9,
  threshold: 10,
  lastFailure: null,
  openUntil: null
}
[DB] Acquiring client for query 41827235-93ac-4846-98b3-894de79fdba9...
[PASS] Client acquired for query 41827235-93ac-4846-98b3-894de79fdba9 in 1ms
[QUERY] Query 41827235-93ac-4846-98b3-894de79fdba9:
      SELECT
        job_id,
        job_type,
        status,
        total_p...
[FAIL] Query a3638fd9-7f49-4878-a95e-30b49123fdc9 attempt 1/4 failed after 158ms: column "tag_proposal_id" does not exist
[BLOCKED] Non-retryable error detected for query a3638fd9-7f49-4878-a95e-30b49123fdc9, aborting retries
[RELEASE] Client released for query a3638fd9-7f49-4878-a95e-30b49123fdc9 (destroyed: true)
[TaggingEngine] Failed to record tag proposal {
  jobId: 'd0461adc-541c-4eaa-8e9e-ef6169baa32c',
  productId: '0372c911-b03c-43d5-9a25-6b0fbee88b01',
  productName: 'Plus Audio Headband microphone system - single ear (Beige',
  provider: 'unknown',
  model: 'unknown',
  proposedTag: 'Microphones & Wireless Systems',
  confidence: 0.94,
  dbError: 'Query failed after 4 attempts: column "tag_proposal_id" does not exist',
  timestamp: '2025-11-29T18:02:16.842Z'
}
[DB] [Query ce04ebb3-b265-4abd-bc05-4e979a8d343e] Before query execution: {
  state: 'closed',
  failures: 40,
  consecutiveSuccesses: 0,
  threshold: 10,
  lastFailure: '2025-11-29T18:02:16.842Z',
  openUntil: null
}
[DB] Acquiring client for query ce04ebb3-b265-4abd-bc05-4e979a8d343e...
[PASS] Query 41827235-93ac-4846-98b3-894de79fdba9 completed in 153ms, rows: 1
[TREND] Consecutive successes: 10/10
[DB] [Circuit Breaker] Circuit breaker RESET: {
  state: 'closed',
  failures: 0,
  consecutiveSuccesses: 0,
  threshold: 10,
  lastFailure: null,
  openUntil: null
}
[RELEASE] Client released for query 41827235-93ac-4846-98b3-894de79fdba9 (destroyed: false)
[DB] [Query bbf295a2-ba0f-424b-8b98-dfcd71156d95] Before query execution: {
  state: 'closed',
  failures: 0,
  consecutiveSuccesses: 0,
  threshold: 10,
  lastFailure: null,
  openUntil: null
}
[DB] Acquiring client for query bbf295a2-ba0f-424b-8b98-dfcd71156d95...
[PASS] Client acquired for query bbf295a2-ba0f-424b-8b98-dfcd71156d95 in 1ms
[QUERY] Query bbf295a2-ba0f-424b-8b98-dfcd71156d95:
      WITH batch_stats AS (
        SELECT
          COUNT(*) as completed_bat...
[PASS] Query bbf295a2-ba0f-424b-8b98-dfcd71156d95 completed in 154ms, rows: 1
[TREND] Consecutive successes: 1/10
[WAIT] Circuit breaker reset pending: 1/10 consecutive successes
[RELEASE] Client released for query bbf295a2-ba0f-424b-8b98-dfcd71156d95 (destroyed: false)
[DB] [Query a52c1dd7-4168-4dd0-bed7-16bc9b7fbea2] Before query execution: {
  state: 'closed',
  failures: 0,
  consecutiveSuccesses: 1,
  threshold: 10,
  lastFailure: null,
  openUntil: null
}
[DB] Acquiring client for query a52c1dd7-4168-4dd0-bed7-16bc9b7fbea2...
[PASS] Client acquired for query a52c1dd7-4168-4dd0-bed7-16bc9b7fbea2 in 1ms
[QUERY] Query a52c1dd7-4168-4dd0-bed7-16bc9b7fbea2:
      SELECT
        batch_number,
        error_message,
        products_in_...
[PASS] Query a52c1dd7-4168-4dd0-bed7-16bc9b7fbea2 completed in 154ms, rows: 0
[TREND] Consecutive successes: 2/10
[WAIT] Circuit breaker reset pending: 2/10 consecutive successes
[RELEASE] Client released for query a52c1dd7-4168-4dd0-bed7-16bc9b7fbea2 (destroyed: false)
[DB] [Query 168002ab-0368-4507-86b9-5b4d7e1141c5] Before query execution: {
  state: 'closed',
  failures: 0,
  consecutiveSuccesses: 2,
  threshold: 10,
  lastFailure: null,
  openUntil: null
}
[DB] Acquiring client for query 168002ab-0368-4507-86b9-5b4d7e1141c5...
[PASS] Client acquired for query 168002ab-0368-4507-86b9-5b4d7e1141c5 in 0ms
[QUERY] Query 168002ab-0368-4507-86b9-5b4d7e1141c5:
      WITH batch_metrics AS (
        SELECT
          SUM(successful_count + ...
[PASS] Query 168002ab-0368-4507-86b9-5b4d7e1141c5 completed in 153ms, rows: 1
[TREND] Consecutive successes: 3/10
[WAIT] Circuit breaker reset pending: 3/10 consecutive successes
[RELEASE] Client released for query 168002ab-0368-4507-86b9-5b4d7e1141c5 (destroyed: false)
 GET /api/tag/ai-tagging/status/d0461adc-541c-4eaa-8e9e-ef6169baa32c 200 in 740ms
[PASS] New client connected to enterprise pool
[PASS] Client acquired for query ce04ebb3-b265-4abd-bc05-4e979a8d343e in 951ms
[QUERY] Query ce04ebb3-b265-4abd-bc05-4e979a8d343e:
      UPDATE core.supplier_product
      SET
        ai_tagging_status = $2,
 ...
[GUARD] Setting up database cleanup handlers...
[PASS] Cleanup handlers registered successfully
[READY] Unified database connection updated with enterprise manager
[PASS] Query ce04ebb3-b265-4abd-bc05-4e979a8d343e completed in 306ms, rows: 1
[TREND] Consecutive successes: 1/10
[WAIT] Circuit breaker reset pending: 1/10 consecutive successes
[RELEASE] Client released for query ce04ebb3-b265-4abd-bc05-4e979a8d343e (destroyed: false)
[DB] [Query 90bfb14b-cfba-4c4d-a671-458f12257c47] Before query execution: {
  state: 'closed',
  failures: 40,
  consecutiveSuccesses: 1,
  threshold: 10,
  lastFailure: '2025-11-29T18:02:16.842Z',
  openUntil: null
}
[DB] Acquiring client for query 90bfb14b-cfba-4c4d-a671-458f12257c47...
[PASS] Client acquired for query 90bfb14b-cfba-4c4d-a671-458f12257c47 in 0ms
[QUERY] Query 90bfb14b-cfba-4c4d-a671-458f12257c47:
      WITH upsert AS (
        INSERT INTO core.ai_tag_proposal (
          org...
[FAIL] Query 90bfb14b-cfba-4c4d-a671-458f12257c47 attempt 1/4 failed after 153ms: column "tag_proposal_id" does not exist
[BLOCKED] Non-retryable error detected for query 90bfb14b-cfba-4c4d-a671-458f12257c47, aborting retries
[RELEASE] Client released for query 90bfb14b-cfba-4c4d-a671-458f12257c47 (destroyed: true)
[TaggingEngine] Failed to record tag proposal {
  jobId: 'd0461adc-541c-4eaa-8e9e-ef6169baa32c',
  productId: '06b11c7e-dc4b-4e19-8c5d-713e47210197',
  productName: 'Adam Hall Connectors 7546 - Y-Adapter 2 x 6.3mm stereo Jack female to 6.3mm stereo',
  provider: 'unknown',
  model: 'unknown',
  proposedTag: 'Y-Adapter',
  confidence: 0.99,
  dbError: 'Query failed after 4 attempts: column "tag_proposal_id" does not exist',
  timestamp: '2025-11-29T18:02:18.259Z'
}
[DB] [Query 9677c16e-f62f-425b-9f9c-e5b231a874e1] Before query execution: {
  state: 'closed',
  failures: 41,
  consecutiveSuccesses: 0,
  threshold: 10,
  lastFailure: '2025-11-29T18:02:18.259Z',
  openUntil: null
}
[DB] Acquiring client for query 9677c16e-f62f-425b-9f9c-e5b231a874e1...
[DB] [Query d5e997b3-b6a6-49bd-82de-227166b0e570] Before query execution: {
  state: 'closed',
  failures: 0,
  consecutiveSuccesses: 3,
  threshold: 10,
  lastFailure: null,
  openUntil: null
}
[DB] Acquiring client for query d5e997b3-b6a6-49bd-82de-227166b0e570...
[PASS] Client acquired for query d5e997b3-b6a6-49bd-82de-227166b0e570 in 0ms
[QUERY] Query d5e997b3-b6a6-49bd-82de-227166b0e570:
      SELECT
        job_id,
        job_type,
        status,
        total_p...
[PASS] Query d5e997b3-b6a6-49bd-82de-227166b0e570 completed in 304ms, rows: 20
[TREND] Consecutive successes: 4/10
[WAIT] Circuit breaker reset pending: 4/10 consecutive successes
[RELEASE] Client released for query d5e997b3-b6a6-49bd-82de-227166b0e570 (destroyed: false)
 GET /api/tag/ai-tagging/jobs?limit=20 200 in 409ms
[PASS] New client connected to enterprise pool
[PASS] Client acquired for query 9677c16e-f62f-425b-9f9c-e5b231a874e1 in 923ms
[QUERY] Query 9677c16e-f62f-425b-9f9c-e5b231a874e1:
      UPDATE core.supplier_product
      SET
        ai_tagging_status = $2,
 ...
[PASS] Query 9677c16e-f62f-425b-9f9c-e5b231a874e1 completed in 307ms, rows: 1
[TREND] Consecutive successes: 1/10
[WAIT] Circuit breaker reset pending: 1/10 consecutive successes
[RELEASE] Client released for query 9677c16e-f62f-425b-9f9c-e5b231a874e1 (destroyed: false)
[DB] [Query d4a9c8ed-0feb-440a-92c3-9c94af791c6c] Before query execution: {
  state: 'closed',
  failures: 41,
  consecutiveSuccesses: 1,
  threshold: 10,
  lastFailure: '2025-11-29T18:02:18.259Z',
  openUntil: null
}
[DB] Acquiring client for query d4a9c8ed-0feb-440a-92c3-9c94af791c6c...
[PASS] Client acquired for query d4a9c8ed-0feb-440a-92c3-9c94af791c6c in 0ms
[QUERY] Query d4a9c8ed-0feb-440a-92c3-9c94af791c6c:
      WITH upsert AS (
        INSERT INTO core.ai_tag_proposal (
          org...
[FAIL] Query d4a9c8ed-0feb-440a-92c3-9c94af791c6c attempt 1/4 failed after 153ms: column "tag_proposal_id" does not exist
[BLOCKED] Non-retryable error detected for query d4a9c8ed-0feb-440a-92c3-9c94af791c6c, aborting retries
[RELEASE] Client released for query d4a9c8ed-0feb-440a-92c3-9c94af791c6c (destroyed: true)
[TaggingEngine] Failed to record tag proposal {
  jobId: 'd0461adc-541c-4eaa-8e9e-ef6169baa32c',
  productId: '086d0dfd-1a2c-498a-b091-64043ac5614f',
  productName: 'Elixir 15425 Electric Bass Nickel Plated Steel with NANOWEB Coating Custom 5th and 6th Strings Super Light B, Long Scale (.125',
  provider: 'unknown',
  model: 'unknown',
  proposedTag: 'Brand: Elixir Strings',
  confidence: 0.99,
  dbError: 'Query failed after 4 attempts: column "tag_proposal_id" does not exist',
  timestamp: '2025-11-29T18:02:19.647Z'
}
[DB] [Query 7f491ffa-92ce-400b-aa30-34f1a6b962d7] Before query execution: {
  state: 'closed',
  failures: 42,
  consecutiveSuccesses: 0,
  threshold: 10,
  lastFailure: '2025-11-29T18:02:19.646Z',
  openUntil: null
}
[DB] Acquiring client for query 7f491ffa-92ce-400b-aa30-34f1a6b962d7...
[DB] [Query 2ab18add-11e6-41c0-b19b-c4aa7cc2feb5] Before query execution: {
  state: 'closed',
  failures: 0,
  consecutiveSuccesses: 4,
  threshold: 10,
  lastFailure: null,
  openUntil: null
}
[DB] Acquiring client for query 2ab18add-11e6-41c0-b19b-c4aa7cc2feb5...
[PASS] Client acquired for query 2ab18add-11e6-41c0-b19b-c4aa7cc2feb5 in 1ms
[QUERY] Query 2ab18add-11e6-41c0-b19b-c4aa7cc2feb5:
      SELECT
        job_id,
        job_type,
        status,
        total_p...
[PASS] Query 2ab18add-11e6-41c0-b19b-c4aa7cc2feb5 completed in 154ms, rows: 1
[TREND] Consecutive successes: 5/10
[WAIT] Circuit breaker reset pending: 5/10 consecutive successes
[RELEASE] Client released for query 2ab18add-11e6-41c0-b19b-c4aa7cc2feb5 (destroyed: false)
[DB] [Query 40f513fe-ac20-480a-8909-20a2bc875130] Before query execution: {
  state: 'closed',
  failures: 0,
  consecutiveSuccesses: 5,
  threshold: 10,
  lastFailure: null,
  openUntil: null
}
[DB] Acquiring client for query 40f513fe-ac20-480a-8909-20a2bc875130...
[PASS] Client acquired for query 40f513fe-ac20-480a-8909-20a2bc875130 in 0ms
[QUERY] Query 40f513fe-ac20-480a-8909-20a2bc875130:
      WITH batch_stats AS (
        SELECT
          COUNT(*) as completed_bat...
[PASS] Query 40f513fe-ac20-480a-8909-20a2bc875130 completed in 153ms, rows: 1
[TREND] Consecutive successes: 6/10
[WAIT] Circuit breaker reset pending: 6/10 consecutive successes
[RELEASE] Client released for query 40f513fe-ac20-480a-8909-20a2bc875130 (destroyed: false)
[DB] [Query 4b9ff93f-c9fd-4de2-a022-d575170569c2] Before query execution: {
  state: 'closed',
  failures: 0,
  consecutiveSuccesses: 6,
  threshold: 10,
  lastFailure: null,
  openUntil: null
}
[DB] Acquiring client for query 4b9ff93f-c9fd-4de2-a022-d575170569c2...
[PASS] Client acquired for query 4b9ff93f-c9fd-4de2-a022-d575170569c2 in 0ms
[QUERY] Query 4b9ff93f-c9fd-4de2-a022-d575170569c2:
      SELECT
        batch_number,
        error_message,
        products_in_...
[PASS] Query 4b9ff93f-c9fd-4de2-a022-d575170569c2 completed in 153ms, rows: 0
[TREND] Consecutive successes: 7/10
[WAIT] Circuit breaker reset pending: 7/10 consecutive successes
[RELEASE] Client released for query 4b9ff93f-c9fd-4de2-a022-d575170569c2 (destroyed: false)
[DB] [Query de4ad4b4-469c-43cb-bead-8968c0bebe1d] Before query execution: {
  state: 'closed',
  failures: 0,
  consecutiveSuccesses: 7,
  threshold: 10,
  lastFailure: null,
  openUntil: null
}
[DB] Acquiring client for query de4ad4b4-469c-43cb-bead-8968c0bebe1d...
[PASS] Client acquired for query de4ad4b4-469c-43cb-bead-8968c0bebe1d in 0ms
[QUERY] Query de4ad4b4-469c-43cb-bead-8968c0bebe1d:
      WITH batch_metrics AS (
        SELECT
          SUM(successful_count + ...
[PASS] Query de4ad4b4-469c-43cb-bead-8968c0bebe1d completed in 153ms, rows: 1
[TREND] Consecutive successes: 8/10
[WAIT] Circuit breaker reset pending: 8/10 consecutive successes
[RELEASE] Client released for query de4ad4b4-469c-43cb-bead-8968c0bebe1d (destroyed: false)
 GET /api/tag/ai-tagging/status/d0461adc-541c-4eaa-8e9e-ef6169baa32c 200 in 746ms
[PASS] New client connected to enterprise pool
[PASS] Client acquired for query 7f491ffa-92ce-400b-aa30-34f1a6b962d7 in 936ms
[QUERY] Query 7f491ffa-92ce-400b-aa30-34f1a6b962d7:
      UPDATE core.supplier_product
      SET
        ai_tagging_status = $2,
 ...
[PASS] Query 7f491ffa-92ce-400b-aa30-34f1a6b962d7 completed in 306ms, rows: 1
[TREND] Consecutive successes: 1/10
[WAIT] Circuit breaker reset pending: 1/10 consecutive successes
[RELEASE] Client released for query 7f491ffa-92ce-400b-aa30-34f1a6b962d7 (destroyed: false)
[DB] [Query 426b1d62-8bbc-419b-9430-7f6efc59ccfa] Before query execution: {
  state: 'closed',
  failures: 42,
  consecutiveSuccesses: 1,
  threshold: 10,
  lastFailure: '2025-11-29T18:02:19.646Z',
  openUntil: null
}
[DB] Acquiring client for query 426b1d62-8bbc-419b-9430-7f6efc59ccfa...
[PASS] Client acquired for query 426b1d62-8bbc-419b-9430-7f6efc59ccfa in 1ms
[QUERY] Query 426b1d62-8bbc-419b-9430-7f6efc59ccfa:
      WITH upsert AS (
        INSERT INTO core.ai_tag_proposal (
          org...
[GUARD] Setting up database cleanup handlers...
[PASS] Cleanup handlers registered successfully
[READY] Unified database connection updated with enterprise manager
[FAIL] Query 426b1d62-8bbc-419b-9430-7f6efc59ccfa attempt 1/4 failed after 152ms: column "tag_proposal_id" does not exist
[BLOCKED] Non-retryable error detected for query 426b1d62-8bbc-419b-9430-7f6efc59ccfa, aborting retries
[RELEASE] Client released for query 426b1d62-8bbc-419b-9430-7f6efc59ccfa (destroyed: true)
[TaggingEngine] Failed to record tag proposal {
  jobId: 'd0461adc-541c-4eaa-8e9e-ef6169baa32c',
  productId: '086d0dfd-1a2c-498a-b091-64043ac5614f',
  productName: 'Elixir 15425 Electric Bass Nickel Plated Steel with NANOWEB Coating Custom 5th and 6th Strings Super Light B, Long Scale (.125',
  provider: 'unknown',
  model: 'unknown',
  proposedTag: 'Category: Bass Strings',
  confidence: 0.99,
  dbError: 'Query failed after 4 attempts: column "tag_proposal_id" does not exist',
  timestamp: '2025-11-29T18:02:21.045Z'
}
[DB] [Query 902f5f34-b87c-4c4a-93a6-885064b3f9ea] Before query execution: {
  state: 'closed',
  failures: 43,
  consecutiveSuccesses: 0,
  threshold: 10,
  lastFailure: '2025-11-29T18:02:21.044Z',
  openUntil: null
}
[DB] Acquiring client for query 902f5f34-b87c-4c4a-93a6-885064b3f9ea...
[PASS] New client connected to enterprise pool
[PASS] Client acquired for query 902f5f34-b87c-4c4a-93a6-885064b3f9ea in 925ms
[QUERY] Query 902f5f34-b87c-4c4a-93a6-885064b3f9ea:
      UPDATE core.supplier_product
      SET
        ai_tagging_status = $2,
 ...
[PASS] Query 902f5f34-b87c-4c4a-93a6-885064b3f9ea completed in 321ms, rows: 1
[TREND] Consecutive successes: 1/10
[WAIT] Circuit breaker reset pending: 1/10 consecutive successes
[RELEASE] Client released for query 902f5f34-b87c-4c4a-93a6-885064b3f9ea (destroyed: false)
[DB] [Query 54514fb0-a83e-412c-aa23-82191b9e9ce8] Before query execution: {
  state: 'closed',
  failures: 43,
  consecutiveSuccesses: 1,
  threshold: 10,
  lastFailure: '2025-11-29T18:02:21.044Z',
  openUntil: null
}
[DB] Acquiring client for query 54514fb0-a83e-412c-aa23-82191b9e9ce8...
[PASS] Client acquired for query 54514fb0-a83e-412c-aa23-82191b9e9ce8 in 0ms
[QUERY] Query 54514fb0-a83e-412c-aa23-82191b9e9ce8:
      WITH upsert AS (
        INSERT INTO core.ai_tag_proposal (
          org...
[FAIL] Query 54514fb0-a83e-412c-aa23-82191b9e9ce8 attempt 1/4 failed after 154ms: column "tag_proposal_id" does not exist
[BLOCKED] Non-retryable error detected for query 54514fb0-a83e-412c-aa23-82191b9e9ce8, aborting retries
[RELEASE] Client released for query 54514fb0-a83e-412c-aa23-82191b9e9ce8 (destroyed: true)
[TaggingEngine] Failed to record tag proposal {
  jobId: 'd0461adc-541c-4eaa-8e9e-ef6169baa32c',
  productId: '086d0dfd-1a2c-498a-b091-64043ac5614f',
  productName: 'Elixir 15425 Electric Bass Nickel Plated Steel with NANOWEB Coating Custom 5th and 6th Strings Super Light B, Long Scale (.125',
  provider: 'unknown',
  model: 'unknown',
  proposedTag: 'Instrument: Bass Guitar',
  confidence: 0.97,
  dbError: 'Query failed after 4 attempts: column "tag_proposal_id" does not exist',
  timestamp: '2025-11-29T18:02:22.448Z'
}
[DB] [Query 66778385-70d1-499f-b804-9e7673d72db2] Before query execution: {
  state: 'closed',
  failures: 44,
  consecutiveSuccesses: 0,
  threshold: 10,
  lastFailure: '2025-11-29T18:02:22.447Z',
  openUntil: null
}
[DB] Acquiring client for query 66778385-70d1-499f-b804-9e7673d72db2...
[DB] [Query 04eeb39c-a785-4ce9-a97c-4222f1e548e5] Before query execution: {
  state: 'closed',
  failures: 0,
  consecutiveSuccesses: 8,
  threshold: 10,
  lastFailure: null,
  openUntil: null
}
[DB] Acquiring client for query 04eeb39c-a785-4ce9-a97c-4222f1e548e5...
[PASS] Client acquired for query 04eeb39c-a785-4ce9-a97c-4222f1e548e5 in 1ms
[QUERY] Query 04eeb39c-a785-4ce9-a97c-4222f1e548e5:
      SELECT
        job_id,
        job_type,
        status,
        total_p...
[PASS] Query 04eeb39c-a785-4ce9-a97c-4222f1e548e5 completed in 153ms, rows: 1
[TREND] Consecutive successes: 9/10
[WAIT] Circuit breaker reset pending: 9/10 consecutive successes
[RELEASE] Client released for query 04eeb39c-a785-4ce9-a97c-4222f1e548e5 (destroyed: false)
[DB] [Query 37110e07-6aa3-4324-8849-065f1ba28823] Before query execution: {
  state: 'closed',
  failures: 0,
  consecutiveSuccesses: 9,
  threshold: 10,
  lastFailure: null,
  openUntil: null
}
[DB] Acquiring client for query 37110e07-6aa3-4324-8849-065f1ba28823...
[PASS] Client acquired for query 37110e07-6aa3-4324-8849-065f1ba28823 in 0ms
[QUERY] Query 37110e07-6aa3-4324-8849-065f1ba28823:
      WITH batch_stats AS (
        SELECT
          COUNT(*) as completed_bat...
[PASS] Query 37110e07-6aa3-4324-8849-065f1ba28823 completed in 154ms, rows: 1
[TREND] Consecutive successes: 10/10
[DB] [Circuit Breaker] Circuit breaker RESET: {
  state: 'closed',
  failures: 0,
  consecutiveSuccesses: 0,
  threshold: 10,
  lastFailure: null,
  openUntil: null
}
[RELEASE] Client released for query 37110e07-6aa3-4324-8849-065f1ba28823 (destroyed: false)
[DB] [Query f5b6b8ae-c874-4f3f-8bca-e96ba0a9f777] Before query execution: {
  state: 'closed',
  failures: 0,
  consecutiveSuccesses: 0,
  threshold: 10,
  lastFailure: null,
  openUntil: null
}
[DB] Acquiring client for query f5b6b8ae-c874-4f3f-8bca-e96ba0a9f777...
[PASS] Client acquired for query f5b6b8ae-c874-4f3f-8bca-e96ba0a9f777 in 2ms
[QUERY] Query f5b6b8ae-c874-4f3f-8bca-e96ba0a9f777:
      SELECT
        batch_number,
        error_message,
        products_in_...
[PASS] Query f5b6b8ae-c874-4f3f-8bca-e96ba0a9f777 completed in 153ms, rows: 0
[TREND] Consecutive successes: 1/10
[WAIT] Circuit breaker reset pending: 1/10 consecutive successes
[RELEASE] Client released for query f5b6b8ae-c874-4f3f-8bca-e96ba0a9f777 (destroyed: false)
[DB] [Query e9638684-b2e1-4919-bb3e-970c305b0a52] Before query execution: {
  state: 'closed',
  failures: 0,
  consecutiveSuccesses: 1,
  threshold: 10,
  lastFailure: null,
  openUntil: null
}
[DB] Acquiring client for query e9638684-b2e1-4919-bb3e-970c305b0a52...
[PASS] Client acquired for query e9638684-b2e1-4919-bb3e-970c305b0a52 in 0ms
[QUERY] Query e9638684-b2e1-4919-bb3e-970c305b0a52:
      WITH batch_metrics AS (
        SELECT
          SUM(successful_count + ...
[PASS] New client connected to enterprise pool
[PASS] Client acquired for query 66778385-70d1-499f-b804-9e7673d72db2 in 930ms
[QUERY] Query 66778385-70d1-499f-b804-9e7673d72db2:
      UPDATE core.supplier_product
      SET
        ai_tagging_status = $2,
 ...
[PASS] Query e9638684-b2e1-4919-bb3e-970c305b0a52 completed in 153ms, rows: 1
[TREND] Consecutive successes: 2/10
[WAIT] Circuit breaker reset pending: 2/10 consecutive successes
[RELEASE] Client released for query e9638684-b2e1-4919-bb3e-970c305b0a52 (destroyed: false)
 GET /api/tag/ai-tagging/status/d0461adc-541c-4eaa-8e9e-ef6169baa32c 200 in 760ms
[PASS] Query 66778385-70d1-499f-b804-9e7673d72db2 completed in 319ms, rows: 1
[TREND] Consecutive successes: 1/10
[WAIT] Circuit breaker reset pending: 1/10 consecutive successes
[RELEASE] Client released for query 66778385-70d1-499f-b804-9e7673d72db2 (destroyed: false)
[DB] [Query c5d29fc4-8b1b-4500-a0d6-a97440e8995c] Before query execution: {
  state: 'closed',
  failures: 44,
  consecutiveSuccesses: 1,
  threshold: 10,
  lastFailure: '2025-11-29T18:02:22.447Z',
  openUntil: null
}
[DB] Acquiring client for query c5d29fc4-8b1b-4500-a0d6-a97440e8995c...
[PASS] Client acquired for query c5d29fc4-8b1b-4500-a0d6-a97440e8995c in 0ms
[QUERY] Query c5d29fc4-8b1b-4500-a0d6-a97440e8995c:
      WITH upsert AS (
        INSERT INTO core.ai_tag_proposal (
          org...
[DB] [Query 41c9818c-dfcf-47ea-b318-eb706b1b5aef] Before query execution: {
  state: 'closed',
  failures: 0,
  consecutiveSuccesses: 2,
  threshold: 10,
  lastFailure: null,
  openUntil: null
}
[DB] Acquiring client for query 41c9818c-dfcf-47ea-b318-eb706b1b5aef...
[PASS] Client acquired for query 41c9818c-dfcf-47ea-b318-eb706b1b5aef in 0ms
[QUERY] Query 41c9818c-dfcf-47ea-b318-eb706b1b5aef:
      SELECT
        job_id,
        job_type,
        status,
        total_p...
[FAIL] Query c5d29fc4-8b1b-4500-a0d6-a97440e8995c attempt 1/4 failed after 152ms: column "tag_proposal_id" does not exist
[BLOCKED] Non-retryable error detected for query c5d29fc4-8b1b-4500-a0d6-a97440e8995c, aborting retries
[RELEASE] Client released for query c5d29fc4-8b1b-4500-a0d6-a97440e8995c (destroyed: true)
[TaggingEngine] Failed to record tag proposal {
  jobId: 'd0461adc-541c-4eaa-8e9e-ef6169baa32c',
  productId: '086d0dfd-1a2c-498a-b091-64043ac5614f',
  productName: 'Elixir 15425 Electric Bass Nickel Plated Steel with NANOWEB Coating Custom 5th and 6th Strings Super Light B, Long Scale (.125',
  provider: 'unknown',
  model: 'unknown',
  proposedTag: 'String Material: Nickel Plated Steel',
  confidence: 0.99,
  dbError: 'Query failed after 4 attempts: column "tag_proposal_id" does not exist',
  timestamp: '2025-11-29T18:02:23.853Z'
}
[DB] [Query 6edde2ec-328f-4a0e-8fa5-0b155b4b520c] Before query execution: {
  state: 'closed',
  failures: 45,
  consecutiveSuccesses: 0,
  threshold: 10,
  lastFailure: '2025-11-29T18:02:23.852Z',
  openUntil: null
}
[DB] Acquiring client for query 6edde2ec-328f-4a0e-8fa5-0b155b4b520c...
[GUARD] Setting up database cleanup handlers...
[PASS] Cleanup handlers registered successfully
[READY] Unified database connection updated with enterprise manager
[PASS] Query 41c9818c-dfcf-47ea-b318-eb706b1b5aef completed in 305ms, rows: 20
[TREND] Consecutive successes: 3/10
[WAIT] Circuit breaker reset pending: 3/10 consecutive successes
[RELEASE] Client released for query 41c9818c-dfcf-47ea-b318-eb706b1b5aef (destroyed: false)
 GET /api/tag/ai-tagging/jobs?limit=20 200 in 445ms
[PASS] New client connected to enterprise pool
[PASS] Client acquired for query 6edde2ec-328f-4a0e-8fa5-0b155b4b520c in 924ms
[QUERY] Query 6edde2ec-328f-4a0e-8fa5-0b155b4b520c:
      UPDATE core.supplier_product
      SET
        ai_tagging_status = $2,
 ...
[PASS] Query 6edde2ec-328f-4a0e-8fa5-0b155b4b520c completed in 305ms, rows: 1
[TREND] Consecutive successes: 1/10
[WAIT] Circuit breaker reset pending: 1/10 consecutive successes
[RELEASE] Client released for query 6edde2ec-328f-4a0e-8fa5-0b155b4b520c (destroyed: false)
[DB] [Query 909f080f-4df0-43d0-9d61-373a8708a834] Before query execution: {
  state: 'closed',
  failures: 45,
  consecutiveSuccesses: 1,
  threshold: 10,
  lastFailure: '2025-11-29T18:02:23.852Z',
  openUntil: null
}
[DB] Acquiring client for query 909f080f-4df0-43d0-9d61-373a8708a834...
[PASS] Client acquired for query 909f080f-4df0-43d0-9d61-373a8708a834 in 1ms
[QUERY] Query 909f080f-4df0-43d0-9d61-373a8708a834:
      WITH upsert AS (
        INSERT INTO core.ai_tag_proposal (
          org...
[FAIL] Query 909f080f-4df0-43d0-9d61-373a8708a834 attempt 1/4 failed after 152ms: column "tag_proposal_id" does not exist
[BLOCKED] Non-retryable error detected for query 909f080f-4df0-43d0-9d61-373a8708a834, aborting retries
[RELEASE] Client released for query 909f080f-4df0-43d0-9d61-373a8708a834 (destroyed: true)
[TaggingEngine] Failed to record tag proposal {
  jobId: 'd0461adc-541c-4eaa-8e9e-ef6169baa32c',
  productId: '086d0dfd-1a2c-498a-b091-64043ac5614f',
  productName: 'Elixir 15425 Electric Bass Nickel Plated Steel with NANOWEB Coating Custom 5th and 6th Strings Super Light B, Long Scale (.125',
  provider: 'unknown',
  model: 'unknown',
  proposedTag: 'Coating: NANOWEB',
  confidence: 0.99,
  dbError: 'Query failed after 4 attempts: column "tag_proposal_id" does not exist',
  timestamp: '2025-11-29T18:02:25.240Z'
}
[DB] [Query bb47b7f3-31fa-4c26-846c-3ba484a0c254] Before query execution: {
  state: 'closed',
  failures: 46,
  consecutiveSuccesses: 0,
  threshold: 10,
  lastFailure: '2025-11-29T18:02:25.240Z',
  openUntil: null
}
[DB] Acquiring client for query bb47b7f3-31fa-4c26-846c-3ba484a0c254...
[DB] [Query a23bdbd0-a77b-4d77-ab82-61af5f7dc5ff] Before query execution: {
  state: 'closed',
  failures: 0,
  consecutiveSuccesses: 3,
  threshold: 10,
  lastFailure: null,
  openUntil: null
}
[DB] Acquiring client for query a23bdbd0-a77b-4d77-ab82-61af5f7dc5ff...
[PASS] Client acquired for query a23bdbd0-a77b-4d77-ab82-61af5f7dc5ff in 1ms
[QUERY] Query a23bdbd0-a77b-4d77-ab82-61af5f7dc5ff:
      SELECT
        job_id,
        job_type,
        status,
        total_p...
[PASS] Query a23bdbd0-a77b-4d77-ab82-61af5f7dc5ff completed in 153ms, rows: 1
[TREND] Consecutive successes: 4/10
[WAIT] Circuit breaker reset pending: 4/10 consecutive successes
[RELEASE] Client released for query a23bdbd0-a77b-4d77-ab82-61af5f7dc5ff (destroyed: false)
[DB] [Query 8d8666dd-7a68-47b7-b15f-0ee6b5b3c532] Before query execution: {
  state: 'closed',
  failures: 0,
  consecutiveSuccesses: 4,
  threshold: 10,
  lastFailure: null,
  openUntil: null
}
[DB] Acquiring client for query 8d8666dd-7a68-47b7-b15f-0ee6b5b3c532...
[PASS] Client acquired for query 8d8666dd-7a68-47b7-b15f-0ee6b5b3c532 in 0ms
[QUERY] Query 8d8666dd-7a68-47b7-b15f-0ee6b5b3c532:
      WITH batch_stats AS (
        SELECT
          COUNT(*) as completed_bat...
[PASS] Query 8d8666dd-7a68-47b7-b15f-0ee6b5b3c532 completed in 154ms, rows: 1
[TREND] Consecutive successes: 5/10
[WAIT] Circuit breaker reset pending: 5/10 consecutive successes
[RELEASE] Client released for query 8d8666dd-7a68-47b7-b15f-0ee6b5b3c532 (destroyed: false)
[DB] [Query 2d625588-34bf-423b-bf5e-254a8be12c44] Before query execution: {
  state: 'closed',
  failures: 0,
  consecutiveSuccesses: 5,
  threshold: 10,
  lastFailure: null,
  openUntil: null
}
[DB] Acquiring client for query 2d625588-34bf-423b-bf5e-254a8be12c44...
[PASS] Client acquired for query 2d625588-34bf-423b-bf5e-254a8be12c44 in 0ms
[QUERY] Query 2d625588-34bf-423b-bf5e-254a8be12c44:
      SELECT
        batch_number,
        error_message,
        products_in_...
[PASS] New client connected to enterprise pool
[PASS] Client acquired for query bb47b7f3-31fa-4c26-846c-3ba484a0c254 in 924ms
[QUERY] Query bb47b7f3-31fa-4c26-846c-3ba484a0c254:
      UPDATE core.supplier_product
      SET
        ai_tagging_status = $2,
 ...
[PASS] Query 2d625588-34bf-423b-bf5e-254a8be12c44 completed in 153ms, rows: 0
[TREND] Consecutive successes: 6/10
[WAIT] Circuit breaker reset pending: 6/10 consecutive successes
[RELEASE] Client released for query 2d625588-34bf-423b-bf5e-254a8be12c44 (destroyed: false)
[DB] [Query f56675fc-eca4-4436-9a7b-bb089075a196] Before query execution: {
  state: 'closed',
  failures: 0,
  consecutiveSuccesses: 6,
  threshold: 10,
  lastFailure: null,
  openUntil: null
}
[DB] Acquiring client for query f56675fc-eca4-4436-9a7b-bb089075a196...
[PASS] Client acquired for query f56675fc-eca4-4436-9a7b-bb089075a196 in 0ms
[QUERY] Query f56675fc-eca4-4436-9a7b-bb089075a196:
      WITH batch_metrics AS (
        SELECT
          SUM(successful_count + ...
[PASS] Query f56675fc-eca4-4436-9a7b-bb089075a196 completed in 153ms, rows: 1
[TREND] Consecutive successes: 7/10
[WAIT] Circuit breaker reset pending: 7/10 consecutive successes
[RELEASE] Client released for query f56675fc-eca4-4436-9a7b-bb089075a196 (destroyed: false)
 GET /api/tag/ai-tagging/status/d0461adc-541c-4eaa-8e9e-ef6169baa32c 200 in 725ms
[PASS] Query bb47b7f3-31fa-4c26-846c-3ba484a0c254 completed in 307ms, rows: 1
[TREND] Consecutive successes: 1/10
[WAIT] Circuit breaker reset pending: 1/10 consecutive successes
[RELEASE] Client released for query bb47b7f3-31fa-4c26-846c-3ba484a0c254 (destroyed: false)
[DB] [Query 99df59e0-158a-4ff1-a63e-6aa338a9466e] Before query execution: {
  state: 'closed',
  failures: 46,
  consecutiveSuccesses: 1,
  threshold: 10,
  lastFailure: '2025-11-29T18:02:25.240Z',
  openUntil: null
}
[DB] Acquiring client for query 99df59e0-158a-4ff1-a63e-6aa338a9466e...
[PASS] Client acquired for query 99df59e0-158a-4ff1-a63e-6aa338a9466e in 1ms
[QUERY] Query 99df59e0-158a-4ff1-a63e-6aa338a9466e:
      WITH upsert AS (
        INSERT INTO core.ai_tag_proposal (
          org...
[FAIL] Query 99df59e0-158a-4ff1-a63e-6aa338a9466e attempt 1/4 failed after 153ms: column "tag_proposal_id" does not exist
[BLOCKED] Non-retryable error detected for query 99df59e0-158a-4ff1-a63e-6aa338a9466e, aborting retries
[RELEASE] Client released for query 99df59e0-158a-4ff1-a63e-6aa338a9466e (destroyed: true)
[TaggingEngine] Failed to record tag proposal {
  jobId: 'd0461adc-541c-4eaa-8e9e-ef6169baa32c',
  productId: '086d0dfd-1a2c-498a-b091-64043ac5614f',
  productName: 'Elixir 15425 Electric Bass Nickel Plated Steel with NANOWEB Coating Custom 5th and 6th Strings Super Light B, Long Scale (.125',
  provider: 'unknown',
  model: 'unknown',
  proposedTag: 'Scale Length: Long Scale',
  confidence: 0.96,
  dbError: 'Query failed after 4 attempts: column "tag_proposal_id" does not exist',
  timestamp: '2025-11-29T18:02:26.628Z'
}
[DB] [Query 3425169a-081d-4b14-8b25-99e29aea970a] Before query execution: {
  state: 'closed',
  failures: 47,
  consecutiveSuccesses: 0,
  threshold: 10,
  lastFailure: '2025-11-29T18:02:26.628Z',
  openUntil: null
}
[DB] Acquiring client for query 3425169a-081d-4b14-8b25-99e29aea970a...
[GUARD] Setting up database cleanup handlers...
[PASS] Cleanup handlers registered successfully
[READY] Unified database connection updated with enterprise manager
[PASS] New client connected to enterprise pool
[PASS] Client acquired for query 3425169a-081d-4b14-8b25-99e29aea970a in 923ms
[QUERY] Query 3425169a-081d-4b14-8b25-99e29aea970a:
      UPDATE core.supplier_product
      SET
        ai_tagging_status = $2,
 ...
[PASS] Query 3425169a-081d-4b14-8b25-99e29aea970a completed in 306ms, rows: 1
[TREND] Consecutive successes: 1/10
[WAIT] Circuit breaker reset pending: 1/10 consecutive successes
[RELEASE] Client released for query 3425169a-081d-4b14-8b25-99e29aea970a (destroyed: false)
[DB] [Query ee671bfb-1f3b-4523-8478-ca25df973276] Before query execution: {
  state: 'closed',
  failures: 47,
  consecutiveSuccesses: 1,
  threshold: 10,
  lastFailure: '2025-11-29T18:02:26.628Z',
  openUntil: null
}
[DB] Acquiring client for query ee671bfb-1f3b-4523-8478-ca25df973276...
[PASS] Client acquired for query ee671bfb-1f3b-4523-8478-ca25df973276 in 0ms
[QUERY] Query ee671bfb-1f3b-4523-8478-ca25df973276:
      WITH upsert AS (
        INSERT INTO core.ai_tag_proposal (
          org...
[FAIL] Query ee671bfb-1f3b-4523-8478-ca25df973276 attempt 1/4 failed after 153ms: column "tag_proposal_id" does not exist
[BLOCKED] Non-retryable error detected for query ee671bfb-1f3b-4523-8478-ca25df973276, aborting retries
[RELEASE] Client released for query ee671bfb-1f3b-4523-8478-ca25df973276 (destroyed: true)
[TaggingEngine] Failed to record tag proposal {
  jobId: 'd0461adc-541c-4eaa-8e9e-ef6169baa32c',
  productId: '086d0dfd-1a2c-498a-b091-64043ac5614f',
  productName: 'Elixir 15425 Electric Bass Nickel Plated Steel with NANOWEB Coating Custom 5th and 6th Strings Super Light B, Long Scale (.125',
  provider: 'unknown',
  model: 'unknown',
  proposedTag: 'Gauge: .125',
  confidence: 0.95,
  dbError: 'Query failed after 4 attempts: column "tag_proposal_id" does not exist',
  timestamp: '2025-11-29T18:02:28.015Z'
}
[DB] [Query 233dcab2-ded6-424b-a04d-eb8169afddff] Before query execution: {
  state: 'closed',
  failures: 48,
  consecutiveSuccesses: 0,
  threshold: 10,
  lastFailure: '2025-11-29T18:02:28.015Z',
  openUntil: null
}
[DB] Acquiring client for query 233dcab2-ded6-424b-a04d-eb8169afddff...
[DB] [Query 827fd1c4-91ed-4932-b7ca-033f4c720e62] Before query execution: {
  state: 'closed',
  failures: 0,
  consecutiveSuccesses: 7,
  threshold: 10,
  lastFailure: null,
  openUntil: null
}
[DB] Acquiring client for query 827fd1c4-91ed-4932-b7ca-033f4c720e62...
[PASS] Client acquired for query 827fd1c4-91ed-4932-b7ca-033f4c720e62 in 0ms
[QUERY] Query 827fd1c4-91ed-4932-b7ca-033f4c720e62:
      SELECT
        job_id,
        job_type,
        status,
        total_p...
[DB] [Query e1f4c819-8a1d-4d84-863c-935341dbe3cb] Before query execution: {
  state: 'closed',
  failures: 0,
  consecutiveSuccesses: 7,
  threshold: 10,
  lastFailure: null,
  openUntil: null
}
[DB] Acquiring client for query e1f4c819-8a1d-4d84-863c-935341dbe3cb...
[PASS] Client acquired for query e1f4c819-8a1d-4d84-863c-935341dbe3cb in 1ms
[QUERY] Query e1f4c819-8a1d-4d84-863c-935341dbe3cb:
      SELECT
        job_id,
        job_type,
        status,
        total_p...
[PASS] New client connected to enterprise pool
[PASS] Client acquired for query 233dcab2-ded6-424b-a04d-eb8169afddff in 1004ms
[QUERY] Query 233dcab2-ded6-424b-a04d-eb8169afddff:
      UPDATE core.supplier_product
      SET
        ai_tagging_status = $2,
 ...
[PASS] Query e1f4c819-8a1d-4d84-863c-935341dbe3cb completed in 153ms, rows: 1
[TREND] Consecutive successes: 8/10
[WAIT] Circuit breaker reset pending: 8/10 consecutive successes
[RELEASE] Client released for query e1f4c819-8a1d-4d84-863c-935341dbe3cb (destroyed: false)
[DB] [Query e4eeab92-b033-44db-a334-356d5cd5b362] Before query execution: {
  state: 'closed',
  failures: 0,
  consecutiveSuccesses: 8,
  threshold: 10,
  lastFailure: null,
  openUntil: null
}
[DB] Acquiring client for query e4eeab92-b033-44db-a334-356d5cd5b362...
[PASS] Client acquired for query e4eeab92-b033-44db-a334-356d5cd5b362 in 1ms
[QUERY] Query e4eeab92-b033-44db-a334-356d5cd5b362:
      WITH batch_stats AS (
        SELECT
          COUNT(*) as completed_bat...
[PASS] Query 827fd1c4-91ed-4932-b7ca-033f4c720e62 completed in 305ms, rows: 20
[TREND] Consecutive successes: 9/10
[WAIT] Circuit breaker reset pending: 9/10 consecutive successes
[RELEASE] Client released for query 827fd1c4-91ed-4932-b7ca-033f4c720e62 (destroyed: false)
 GET /api/tag/ai-tagging/jobs?limit=20 200 in 527ms
[PASS] Query e4eeab92-b033-44db-a334-356d5cd5b362 completed in 153ms, rows: 1
[TREND] Consecutive successes: 10/10
[DB] [Circuit Breaker] Circuit breaker RESET: {
  state: 'closed',
  failures: 0,
  consecutiveSuccesses: 0,
  threshold: 10,
  lastFailure: null,
  openUntil: null
}
[RELEASE] Client released for query e4eeab92-b033-44db-a334-356d5cd5b362 (destroyed: false)
[DB] [Query cd6d72ae-86ed-4a73-889a-9cbabcb2f147] Before query execution: {
  state: 'closed',
  failures: 0,
  consecutiveSuccesses: 0,
  threshold: 10,
  lastFailure: null,
  openUntil: null
}
[DB] Acquiring client for query cd6d72ae-86ed-4a73-889a-9cbabcb2f147...
[PASS] Client acquired for query cd6d72ae-86ed-4a73-889a-9cbabcb2f147 in 2ms
[QUERY] Query cd6d72ae-86ed-4a73-889a-9cbabcb2f147:
      SELECT
        batch_number,
        error_message,
        products_in_...
[PASS] Query 233dcab2-ded6-424b-a04d-eb8169afddff completed in 305ms, rows: 1
[TREND] Consecutive successes: 1/10
[WAIT] Circuit breaker reset pending: 1/10 consecutive successes
[RELEASE] Client released for query 233dcab2-ded6-424b-a04d-eb8169afddff (destroyed: false)
[DB] [Query cecf5b4e-8466-4ff7-af2a-2c50ca5092e9] Before query execution: {
  state: 'closed',
  failures: 48,
  consecutiveSuccesses: 1,
  threshold: 10,
  lastFailure: '2025-11-29T18:02:28.015Z',
  openUntil: null
}
[DB] Acquiring client for query cecf5b4e-8466-4ff7-af2a-2c50ca5092e9...
[PASS] Client acquired for query cecf5b4e-8466-4ff7-af2a-2c50ca5092e9 in 1ms
[QUERY] Query cecf5b4e-8466-4ff7-af2a-2c50ca5092e9:
      WITH upsert AS (
        INSERT INTO core.ai_tag_proposal (
          org...
[PASS] Query cd6d72ae-86ed-4a73-889a-9cbabcb2f147 completed in 154ms, rows: 0
[TREND] Consecutive successes: 1/10
[WAIT] Circuit breaker reset pending: 1/10 consecutive successes
[RELEASE] Client released for query cd6d72ae-86ed-4a73-889a-9cbabcb2f147 (destroyed: false)
[DB] [Query 2f63f73e-e80a-40db-9869-b536552e9eaf] Before query execution: {
  state: 'closed',
  failures: 0,
  consecutiveSuccesses: 1,
  threshold: 10,
  lastFailure: null,
  openUntil: null
}
[DB] Acquiring client for query 2f63f73e-e80a-40db-9869-b536552e9eaf...
[PASS] Client acquired for query 2f63f73e-e80a-40db-9869-b536552e9eaf in 1ms
[QUERY] Query 2f63f73e-e80a-40db-9869-b536552e9eaf:
      WITH batch_metrics AS (
        SELECT
          SUM(successful_count + ...
[FAIL] Query cecf5b4e-8466-4ff7-af2a-2c50ca5092e9 attempt 1/4 failed after 152ms: column "tag_proposal_id" does not exist
[BLOCKED] Non-retryable error detected for query cecf5b4e-8466-4ff7-af2a-2c50ca5092e9, aborting retries
[RELEASE] Client released for query cecf5b4e-8466-4ff7-af2a-2c50ca5092e9 (destroyed: true)
[TaggingEngine] Failed to record tag proposal {
  jobId: 'd0461adc-541c-4eaa-8e9e-ef6169baa32c',
  productId: '086d0dfd-1a2c-498a-b091-64043ac5614f',
  productName: 'Elixir 15425 Electric Bass Nickel Plated Steel with NANOWEB Coating Custom 5th and 6th Strings Super Light B, Long Scale (.125',
  provider: 'unknown',
  model: 'unknown',
  proposedTag: 'String Type: Single B String',
  confidence: 0.9,
  dbError: 'Query failed after 4 attempts: column "tag_proposal_id" does not exist',
  timestamp: '2025-11-29T18:02:29.483Z'
}
[DB] [Query a64c836e-7f7e-4339-b1f8-146a2d1e17ee] Before query execution: {
  state: 'closed',
  failures: 49,
  consecutiveSuccesses: 0,
  threshold: 10,
  lastFailure: '2025-11-29T18:02:29.483Z',
  openUntil: null
}
[DB] Acquiring client for query a64c836e-7f7e-4339-b1f8-146a2d1e17ee...
[PASS] Query 2f63f73e-e80a-40db-9869-b536552e9eaf completed in 153ms, rows: 1
[TREND] Consecutive successes: 2/10
[WAIT] Circuit breaker reset pending: 2/10 consecutive successes
[RELEASE] Client released for query 2f63f73e-e80a-40db-9869-b536552e9eaf (destroyed: false)
 GET /api/tag/ai-tagging/status/d0461adc-541c-4eaa-8e9e-ef6169baa32c 200 in 791ms
[GUARD] Setting up database cleanup handlers...
[PASS] Cleanup handlers registered successfully
[READY] Unified database connection updated with enterprise manager
[PASS] New client connected to enterprise pool