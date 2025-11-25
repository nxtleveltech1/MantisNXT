 GET /api/category/ai-categorization/jobs?limit=20 200 in 486ms
🔌 [Query 3e86b6f7-d60e-43a5-92d2-a46bcf4d95c2] Before query execution: {
  state: 'closed',
  failures: 0,
  consecutiveSuccesses: 7,
  threshold: 10,
  lastFailure: null,
  openUntil: null
}
🔌 Acquiring client for query 3e86b6f7-d60e-43a5-92d2-a46bcf4d95c2...
✅ Client acquired for query 3e86b6f7-d60e-43a5-92d2-a46bcf4d95c2 in 1ms
🔍 Query 3e86b6f7-d60e-43a5-92d2-a46bcf4d95c2:
      SELECT
        job_id,
        job_type,
        status,
        total_p...
✅ Query 3e86b6f7-d60e-43a5-92d2-a46bcf4d95c2 completed in 305ms, rows: 20
📈 Consecutive successes: 8/10
⏳ Circuit breaker reset pending: 8/10 consecutive successes
🔓 Client released for query 3e86b6f7-d60e-43a5-92d2-a46bcf4d95c2 (destroyed: false)
 GET /api/category/ai-categorization/jobs?limit=20 200 in 392ms

==== [/api/category/ai-categorization/start] incoming request ====
[API:start] payload: {
  job_type: 'full_scan',
  filters: { exclude_categorized: false },
  config: { confidence_threshold: 0.7, force_recategorize: true },
  batch_size: 10,
  product_limit: 20
}
[API:start] creating job…
🔌 [Query 757e0667-c635-4186-ba90-b8af939bd7f4] Before query execution: {
  state: 'closed',
  failures: 0,
  consecutiveSuccesses: 8,
  threshold: 10,
  lastFailure: null,
  openUntil: null
}
🔌 Acquiring client for query 757e0667-c635-4186-ba90-b8af939bd7f4...
✅ Client acquired for query 757e0667-c635-4186-ba90-b8af939bd7f4 in 1ms
🔍 Query 757e0667-c635-4186-ba90-b8af939bd7f4:
      SELECT COUNT(*) as count
      FROM core.supplier_product

    ...
✅ Query 757e0667-c635-4186-ba90-b8af939bd7f4 completed in 154ms, rows: 1
📈 Consecutive successes: 9/10
⏳ Circuit breaker reset pending: 9/10 consecutive successes
🔓 Client released for query 757e0667-c635-4186-ba90-b8af939bd7f4 (destroyed: false)
🔌 [Query aec55c54-a9ef-4220-9790-0d557b7a611e] Before query execution: {
  state: 'closed',
  failures: 0,
  consecutiveSuccesses: 9,
  threshold: 10,
  lastFailure: null,
  openUntil: null
}
🔌 Acquiring client for query aec55c54-a9ef-4220-9790-0d557b7a611e...
✅ Client acquired for query aec55c54-a9ef-4220-9790-0d557b7a611e in 1ms
🔍 Query aec55c54-a9ef-4220-9790-0d557b7a611e:
      INSERT INTO core.ai_categorization_job (
        job_type,
        total_...
✅ Query aec55c54-a9ef-4220-9790-0d557b7a611e completed in 154ms, rows: 1
📈 Consecutive successes: 10/10
🔌 [Circuit Breaker] Circuit breaker RESET: {
  state: 'closed',
  failures: 0,
  consecutiveSuccesses: 0,
  threshold: 10,
  lastFailure: null,
  openUntil: null
}
🔓 Client released for query aec55c54-a9ef-4220-9790-0d557b7a611e (destroyed: false)
[API:start] job created: df1895ec-e1cb-4626-b924-1c3921cd570e
🔌 [Query b1688548-3359-443e-8b2a-ccea8197f8c5] Before query execution: {
  state: 'closed',
  failures: 0,
  consecutiveSuccesses: 0,
  threshold: 10,
  lastFailure: null,
  openUntil: null
}
🔌 Acquiring client for query b1688548-3359-443e-8b2a-ccea8197f8c5...
✅ Client acquired for query b1688548-3359-443e-8b2a-ccea8197f8c5 in 0ms
🔍 Query b1688548-3359-443e-8b2a-ccea8197f8c5:
      SELECT
        job_id,
        job_type,
        status,
        total_p...
✅ Query b1688548-3359-443e-8b2a-ccea8197f8c5 completed in 153ms, rows: 1
📈 Consecutive successes: 1/10
⏳ Circuit breaker reset pending: 1/10 consecutive successes
🔓 Client released for query b1688548-3359-443e-8b2a-ccea8197f8c5 (destroyed: false)
[API:start] job snapshot after create: {
  job_id: 'df1895ec-e1cb-4626-b924-1c3921cd570e',
  job_type: 'full_scan',
  status: 'queued',
  total_products: 20,
  processed_products: 0,
  successful_categorizations: 0,
  failed_categorizations: 0,
  skipped_products: 0,
  current_batch_offset: 0,
  batch_size: 10,
  filters: { exclude_categorized: false },
  config: { force_recategorize: true, confidence_threshold: 0.7 },
  created_by: 'api_user',
  created_at: 2025-11-25T09:34:32.233Z,
  started_at: null,
  completed_at: null,
  paused_at: null,
  cancelled_at: null,
  last_activity_at: null,
  error_message: null,
  error_count: 0,
  total_duration_ms: null,
  avg_batch_duration_ms: null,
  total_tokens_used: 0
}
[API:start] scheduling background processor for job df1895ec-e1cb-4626-b924-1c3921cd570e

🚀 [JobManager] ============================================
🚀 [JobManager] STARTING JOB PROCESSING: df1895ec-e1cb-4626-b924-1c3921cd570e
🚀 [JobManager] ============================================

[JobManager] Job df1895ec-e1cb-4626-b924-1c3921cd570e marked as active
[JobManager] Fetching job details for df1895ec-e1cb-4626-b924-1c3921cd570e
🔌 [Query a83b661a-7901-48bb-8e39-9eea739510f6] Before query execution: {
  state: 'closed',
  failures: 0,
  consecutiveSuccesses: 1,
  threshold: 10,
  lastFailure: null,
  openUntil: null
}
🔌 Acquiring client for query a83b661a-7901-48bb-8e39-9eea739510f6...
[API:start] response -> {
  success: true,
  job_id: 'df1895ec-e1cb-4626-b924-1c3921cd570e',
  estimated_products: 20,
  message: 'Job df1895ec-e1cb-4626-b924-1c3921cd570e created and started processing'
}
 POST /api/category/ai-categorization/start 200 in 587ms
✅ Client acquired for query a83b661a-7901-48bb-8e39-9eea739510f6 in 4ms
🔍 Query a83b661a-7901-48bb-8e39-9eea739510f6:
      SELECT
        job_id,
        job_type,
        status,
        total_p...
🔌 [Query 63bbd3a3-91bc-4fae-a0dc-2f8081c18633] Before query execution: {
  state: 'closed',
  failures: 0,
  consecutiveSuccesses: 1,
  threshold: 10,
  lastFailure: null,
  openUntil: null
}
🔌 Acquiring client for query 63bbd3a3-91bc-4fae-a0dc-2f8081c18633...
✅ Client acquired for query 63bbd3a3-91bc-4fae-a0dc-2f8081c18633 in 0ms
🔍 Query 63bbd3a3-91bc-4fae-a0dc-2f8081c18633:
      SELECT
        job_id,
        job_type,
        status,
        total_p...
✅ Query a83b661a-7901-48bb-8e39-9eea739510f6 completed in 161ms, rows: 1
📈 Consecutive successes: 2/10
⏳ Circuit breaker reset pending: 2/10 consecutive successes
🔓 Client released for query a83b661a-7901-48bb-8e39-9eea739510f6 (destroyed: false)
[JobManager] Job details: status=queued, total_products=20, batch_size=10
[JobManager] Updating job status to 'running'
🔌 [Query 4de3113f-1e36-4cbe-864a-bdfcd56242d6] Before query execution: {
  state: 'closed',
  failures: 0,
  consecutiveSuccesses: 2,
  threshold: 10,
  lastFailure: null,
  openUntil: null
}
🔌 Acquiring client for query 4de3113f-1e36-4cbe-864a-bdfcd56242d6...
✅ Client acquired for query 4de3113f-1e36-4cbe-864a-bdfcd56242d6 in 0ms
🔍 Query 4de3113f-1e36-4cbe-864a-bdfcd56242d6:
      UPDATE core.ai_categorization_job
      SET
        status = $2,
       ...
🔌 [Query b412c620-a58a-4ff7-853c-299661947de2] Before query execution: {
  state: 'closed',
  failures: 0,
  consecutiveSuccesses: 2,
  threshold: 10,
  lastFailure: null,
  openUntil: null
}
🔌 Acquiring client for query b412c620-a58a-4ff7-853c-299661947de2...
✅ Client acquired for query b412c620-a58a-4ff7-853c-299661947de2 in 0ms
🔍 Query b412c620-a58a-4ff7-853c-299661947de2:
      WITH stats AS (
        SELECT
          COUNT(*) as total_products,
   ...
✅ Query 4de3113f-1e36-4cbe-864a-bdfcd56242d6 completed in 156ms, rows: 1
📈 Consecutive successes: 3/10
⏳ Circuit breaker reset pending: 3/10 consecutive successes
🔓 Client released for query 4de3113f-1e36-4cbe-864a-bdfcd56242d6 (destroyed: false)
🔌 [Query b7cbef6a-041c-4001-b533-330c370acbd6] Before query execution: {
  state: 'closed',
  failures: 0,
  consecutiveSuccesses: 3,
  threshold: 10,
  lastFailure: null,
  openUntil: null
}
🔌 Acquiring client for query b7cbef6a-041c-4001-b533-330c370acbd6...
✅ Client acquired for query b7cbef6a-041c-4001-b533-330c370acbd6 in 0ms
🔍 Query b7cbef6a-041c-4001-b533-330c370acbd6:
      UPDATE core.ai_categorization_job
      SET started_at = NOW()
      WHER...
✅ Query 63bbd3a3-91bc-4fae-a0dc-2f8081c18633 completed in 305ms, rows: 20
📈 Consecutive successes: 4/10
⏳ Circuit breaker reset pending: 4/10 consecutive successes
🔓 Client released for query 63bbd3a3-91bc-4fae-a0dc-2f8081c18633 (destroyed: false)
 GET /api/category/ai-categorization/jobs?limit=20 200 in 405ms
✅ Query b412c620-a58a-4ff7-853c-299661947de2 completed in 155ms, rows: 1
📈 Consecutive successes: 5/10
⏳ Circuit breaker reset pending: 5/10 consecutive successes
🔓 Client released for query b412c620-a58a-4ff7-853c-299661947de2 (destroyed: false)
 GET /api/category/ai-categorization/stats 200 in 313ms
✅ Query b7cbef6a-041c-4001-b533-330c370acbd6 completed in 154ms, rows: 1
📈 Consecutive successes: 6/10
⏳ Circuit breaker reset pending: 6/10 consecutive successes
🔓 Client released for query b7cbef6a-041c-4001-b533-330c370acbd6 (destroyed: false)
[JobManager] Job config: { force_recategorize: true, confidence_threshold: 0.7 }
[JobManager] Job filters: { exclude_categorized: false }
🔌 [Query e74f33c8-55b8-4ced-86a4-0f6b821f1d35] Before query execution: {
  state: 'closed',
  failures: 0,
  consecutiveSuccesses: 6,
  threshold: 10,
  lastFailure: null,
  openUntil: null
}
🔌 Acquiring client for query e74f33c8-55b8-4ced-86a4-0f6b821f1d35...
✅ Client acquired for query e74f33c8-55b8-4ced-86a4-0f6b821f1d35 in 0ms
🔍 Query e74f33c8-55b8-4ced-86a4-0f6b821f1d35:
      SELECT status
      FROM core.ai_categorization_job
      WHERE job_id = ...
✅ Query e74f33c8-55b8-4ced-86a4-0f6b821f1d35 completed in 167ms, rows: 1
📈 Consecutive successes: 7/10
⏳ Circuit breaker reset pending: 7/10 consecutive successes
🔓 Client released for query e74f33c8-55b8-4ced-86a4-0f6b821f1d35 (destroyed: false)
[JobManager] Job df1895ec-e1cb-4626-b924-1c3921cd570e fetching batch 0 (offset=0, size=10)
🔌 [Query ad9f8f56-f91e-48a5-aa45-19880f85b4de] Before query execution: {
  state: 'closed',
  failures: 0,
  consecutiveSuccesses: 7,
  threshold: 10,
  lastFailure: null,
  openUntil: null
}
🔌 Acquiring client for query ad9f8f56-f91e-48a5-aa45-19880f85b4de...
✅ Client acquired for query ad9f8f56-f91e-48a5-aa45-19880f85b4de in 1ms
🔍 Query ad9f8f56-f91e-48a5-aa45-19880f85b4de:
      SELECT supplier_product_id
      FROM core.supplier_product sp

   ...
🔌 [Query 0b9a1be3-da4e-48db-b70c-f859d797668a] Before query execution: {
  state: 'closed',
  failures: 0,
  consecutiveSuccesses: 7,
  threshold: 10,
  lastFailure: null,
  openUntil: null
}
🔌 Acquiring client for query 0b9a1be3-da4e-48db-b70c-f859d797668a...
✅ Client acquired for query 0b9a1be3-da4e-48db-b70c-f859d797668a in 1ms
🔍 Query 0b9a1be3-da4e-48db-b70c-f859d797668a:
      SELECT
        job_id,
        job_type,
        status,
        total_p...
✅ Query ad9f8f56-f91e-48a5-aa45-19880f85b4de completed in 319ms, rows: 10
📈 Consecutive successes: 8/10
⏳ Circuit breaker reset pending: 8/10 consecutive successes
🔓 Client released for query ad9f8f56-f91e-48a5-aa45-19880f85b4de (destroyed: false)
[JobManager] getProductIdsForBatch offset=0 batchSize=10 filters={"exclude_categorized":false} -> 10 ids
[JobManager] fetchProductsForBatch offset=0 batchSize=10 -> ids=10
🔌 [Query 1640a01d-e3af-4027-878b-bfd20512994e] Before query execution: {
  state: 'closed',
  failures: 0,
  consecutiveSuccesses: 8,
  threshold: 10,
  lastFailure: null,
  openUntil: null
}
🔌 Acquiring client for query 1640a01d-e3af-4027-878b-bfd20512994e...
✅ Client acquired for query 1640a01d-e3af-4027-878b-bfd20512994e in 0ms
🔍 Query 1640a01d-e3af-4027-878b-bfd20512994e:
    WITH current_prices AS (
      SELECT DISTINCT ON (supplier_product_id)
   ...
✅ Query 0b9a1be3-da4e-48db-b70c-f859d797668a completed in 166ms, rows: 1
📈 Consecutive successes: 9/10
⏳ Circuit breaker reset pending: 9/10 consecutive successes
🔓 Client released for query 0b9a1be3-da4e-48db-b70c-f859d797668a (destroyed: false)
🔌 [Query a62aac18-3897-473f-adc5-030918c2a123] Before query execution: {
  state: 'closed',
  failures: 0,
  consecutiveSuccesses: 9,
  threshold: 10,
  lastFailure: null,
  openUntil: null
}
🔌 Acquiring client for query a62aac18-3897-473f-adc5-030918c2a123...
✅ Client acquired for query a62aac18-3897-473f-adc5-030918c2a123 in 1ms
🔍 Query a62aac18-3897-473f-adc5-030918c2a123:
      WITH batch_stats AS (
        SELECT
          COUNT(*) as completed_bat...
🔌 [Query 98e9bb30-6e2e-4044-b143-26725a25bae0] Before query execution: {
  state: 'closed',
  failures: 0,
  consecutiveSuccesses: 9,
  threshold: 10,
  lastFailure: null,
  openUntil: null
}
🔌 Acquiring client for query 98e9bb30-6e2e-4044-b143-26725a25bae0...
✅ Client acquired for query 98e9bb30-6e2e-4044-b143-26725a25bae0 in 1ms
🔍 Query 98e9bb30-6e2e-4044-b143-26725a25bae0:
      SELECT
        job_id,
        job_type,
        status,
        total_p...
✅ Query 1640a01d-e3af-4027-878b-bfd20512994e completed in 163ms, rows: 10
📈 Consecutive successes: 10/10
🔌 [Circuit Breaker] Circuit breaker RESET: {
  state: 'closed',
  failures: 0,
  consecutiveSuccesses: 0,
  threshold: 10,
  lastFailure: null,
  openUntil: null
}
🔓 Client released for query 1640a01d-e3af-4027-878b-bfd20512994e (destroyed: false)
[JobManager] fetchProductsForBatch enriched 10 products
[JobManager] Job df1895ec-e1cb-4626-b924-1c3921cd570e batch 0 fetched 10 products
🔌 [Query a1853087-5b67-4c20-ad57-2342c3b0499e] Before query execution: {
  state: 'closed',
  failures: 0,
  consecutiveSuccesses: 0,
  threshold: 10,
  lastFailure: null,
  openUntil: null
}
🔌 Acquiring client for query a1853087-5b67-4c20-ad57-2342c3b0499e...
✅ Client acquired for query a1853087-5b67-4c20-ad57-2342c3b0499e in 1ms
🔍 Query a1853087-5b67-4c20-ad57-2342c3b0499e:
      INSERT INTO core.ai_categorization_progress (
        job_id, batch_numbe...
🔌 [Query 65854522-742a-406d-bf35-4cce6efceab2] Before query execution: {
  state: 'closed',
  failures: 0,
  consecutiveSuccesses: 0,
  threshold: 10,
  lastFailure: null,
  openUntil: null
}
🔌 Acquiring client for query 65854522-742a-406d-bf35-4cce6efceab2...
✅ Query a62aac18-3897-473f-adc5-030918c2a123 completed in 153ms, rows: 1
📈 Consecutive successes: 1/10
⏳ Circuit breaker reset pending: 1/10 consecutive successes
🔓 Client released for query a62aac18-3897-473f-adc5-030918c2a123 (destroyed: false)
🔌 [Query caa6d112-8fe6-4478-b761-d064bf6761af] Before query execution: {
  state: 'closed',
  failures: 0,
  consecutiveSuccesses: 1,
  threshold: 10,
  lastFailure: null,
  openUntil: null
}
🔌 Acquiring client for query caa6d112-8fe6-4478-b761-d064bf6761af...
✅ Client acquired for query caa6d112-8fe6-4478-b761-d064bf6761af in 1ms
🔍 Query caa6d112-8fe6-4478-b761-d064bf6761af:
      SELECT
        batch_number,
        error_message,
        products_in_...
✅ Query 98e9bb30-6e2e-4044-b143-26725a25bae0 completed in 155ms, rows: 1
📈 Consecutive successes: 2/10
⏳ Circuit breaker reset pending: 2/10 consecutive successes
🔓 Client released for query 98e9bb30-6e2e-4044-b143-26725a25bae0 (destroyed: false)
🔌 [Query 39b5b20f-3fde-4b40-8757-b1d2a9d2e5f1] Before query execution: {
  state: 'closed',
  failures: 0,
  consecutiveSuccesses: 2,
  threshold: 10,
  lastFailure: null,
  openUntil: null
}
🔌 Acquiring client for query 39b5b20f-3fde-4b40-8757-b1d2a9d2e5f1...
✅ Client acquired for query 39b5b20f-3fde-4b40-8757-b1d2a9d2e5f1 in 1ms
🔍 Query 39b5b20f-3fde-4b40-8757-b1d2a9d2e5f1:
      WITH batch_stats AS (
        SELECT
          COUNT(*) as completed_bat...
✅ Query a1853087-5b67-4c20-ad57-2342c3b0499e completed in 155ms, rows: 1
📈 Consecutive successes: 3/10
⏳ Circuit breaker reset pending: 3/10 consecutive successes
🔓 Client released for query a1853087-5b67-4c20-ad57-2342c3b0499e (destroyed: false)
[JobManager] Job df1895ec-e1cb-4626-b924-1c3921cd570e batch 0 progress record 4ab515f4-8e90-4a35-9c3b-8aadd2fbb93f created
🔌 [Query 4cf86934-eeb7-4508-97d5-895a3de7fa2e] Before query execution: {
  state: 'closed',
  failures: 0,
  consecutiveSuccesses: 3,
  threshold: 10,
  lastFailure: null,
  openUntil: null
}
🔌 Acquiring client for query 4cf86934-eeb7-4508-97d5-895a3de7fa2e...
✅ Client acquired for query 4cf86934-eeb7-4508-97d5-895a3de7fa2e in 1ms
🔍 Query 4cf86934-eeb7-4508-97d5-895a3de7fa2e:
      UPDATE core.supplier_product
      SET ai_categorization_status = 'proces...
✅ Query caa6d112-8fe6-4478-b761-d064bf6761af completed in 152ms, rows: 0
📈 Consecutive successes: 4/10
⏳ Circuit breaker reset pending: 4/10 consecutive successes
🔓 Client released for query caa6d112-8fe6-4478-b761-d064bf6761af (destroyed: false)
🔌 [Query bc50ca36-eeb9-43b3-a134-3ab4af36e335] Before query execution: {
  state: 'closed',
  failures: 0,
  consecutiveSuccesses: 4,
  threshold: 10,
  lastFailure: null,
  openUntil: null
}
🔌 Acquiring client for query bc50ca36-eeb9-43b3-a134-3ab4af36e335...
✅ Client acquired for query bc50ca36-eeb9-43b3-a134-3ab4af36e335 in 1ms
🔍 Query bc50ca36-eeb9-43b3-a134-3ab4af36e335:
      WITH batch_metrics AS (
        SELECT
          SUM(successful_count + ...
✅ Query 39b5b20f-3fde-4b40-8757-b1d2a9d2e5f1 completed in 153ms, rows: 1
📈 Consecutive successes: 5/10
⏳ Circuit breaker reset pending: 5/10 consecutive successes
🔓 Client released for query 39b5b20f-3fde-4b40-8757-b1d2a9d2e5f1 (destroyed: false)
🔌 [Query 6fe5a2ca-68c1-4a28-9599-e4500b3e011b] Before query execution: {
  state: 'closed',
  failures: 0,
  consecutiveSuccesses: 5,
  threshold: 10,
  lastFailure: null,
  openUntil: null
}
🔌 Acquiring client for query 6fe5a2ca-68c1-4a28-9599-e4500b3e011b...
✅ Client acquired for query 6fe5a2ca-68c1-4a28-9599-e4500b3e011b in 1ms
🔍 Query 6fe5a2ca-68c1-4a28-9599-e4500b3e011b:
      SELECT
        batch_number,
        error_message,
        products_in_...
✅ Query 4cf86934-eeb7-4508-97d5-895a3de7fa2e completed in 160ms, rows: 10
📈 Consecutive successes: 6/10
⏳ Circuit breaker reset pending: 6/10 consecutive successes
🔓 Client released for query 4cf86934-eeb7-4508-97d5-895a3de7fa2e (destroyed: false)
[JobManager] Job df1895ec-e1cb-4626-b924-1c3921cd570e batch 0 marked 10 products as processing
[JobManager] Job df1895ec-e1cb-4626-b924-1c3921cd570e batch 0 invoking categorizeBatch
[CategorizationEngine] Requesting AI suggestions for 10 products (provider batch size=10, timeout=60000ms)
[suggestCategoriesBatch] ENTRY: 10 products, orgId: null
[category-ai:resolver] ENTRY: Loading config for orgId: null
[category-ai:resolver] Resolved orgId: 00000000-0000-0000-0000-000000000000
🔌 [Query 74bb2b0c-465f-48a2-9bc1-6e925af113fe] Before query execution: {
  state: 'closed',
  failures: 0,
  consecutiveSuccesses: 6,
  threshold: 10,
  lastFailure: null,
  openUntil: null
}
🔌 Acquiring client for query 74bb2b0c-465f-48a2-9bc1-6e925af113fe...
✅ Client acquired for query 74bb2b0c-465f-48a2-9bc1-6e925af113fe in 1ms
🔍 Query 74bb2b0c-465f-48a2-9bc1-6e925af113fe:
    SELECT id, service_key
    FROM ai_service
    WHERE org_id = $1 AND servic...
✅ Query bc50ca36-eeb9-43b3-a134-3ab4af36e335 completed in 153ms, rows: 1
📈 Consecutive successes: 7/10
⏳ Circuit breaker reset pending: 7/10 consecutive successes
🔓 Client released for query bc50ca36-eeb9-43b3-a134-3ab4af36e335 (destroyed: false)
 GET /api/category/ai-categorization/status/df1895ec-e1cb-4626-b924-1c3921cd570e 200 in 1008ms
✅ Query 6fe5a2ca-68c1-4a28-9599-e4500b3e011b completed in 153ms, rows: 0
📈 Consecutive successes: 8/10
⏳ Circuit breaker reset pending: 8/10 consecutive successes
🔓 Client released for query 6fe5a2ca-68c1-4a28-9599-e4500b3e011b (destroyed: false)
🔌 [Query 6150d7bf-ff10-45d8-87bc-674d288e4f48] Before query execution: {
  state: 'closed',
  failures: 0,
  consecutiveSuccesses: 8,
  threshold: 10,
  lastFailure: null,
  openUntil: null
}
🔌 Acquiring client for query 6150d7bf-ff10-45d8-87bc-674d288e4f48...
✅ Client acquired for query 6150d7bf-ff10-45d8-87bc-674d288e4f48 in 1ms
🔍 Query 6150d7bf-ff10-45d8-87bc-674d288e4f48:
      WITH batch_metrics AS (
        SELECT
          SUM(successful_count + ...
✅ Query 74bb2b0c-465f-48a2-9bc1-6e925af113fe completed in 154ms, rows: 1
📈 Consecutive successes: 9/10
⏳ Circuit breaker reset pending: 9/10 consecutive successes
🔓 Client released for query 74bb2b0c-465f-48a2-9bc1-6e925af113fe (destroyed: false)
[category-ai:resolver] Service query result: 1 rows
🔌 [Query 981b0182-e0ef-4a70-81ad-5b434ec3a130] Before query execution: {
  state: 'closed',
  failures: 0,
  consecutiveSuccesses: 9,
  threshold: 10,
  lastFailure: null,
  openUntil: null
}
🔌 Acquiring client for query 981b0182-e0ef-4a70-81ad-5b434ec3a130...
✅ Client acquired for query 981b0182-e0ef-4a70-81ad-5b434ec3a130 in 1ms
🔍 Query 981b0182-e0ef-4a70-81ad-5b434ec3a130:
    SELECT id, org_id, service_id, config, is_enabled as enabled
    FROM ai_se...
✅ Query 6150d7bf-ff10-45d8-87bc-674d288e4f48 completed in 154ms, rows: 1
📈 Consecutive successes: 10/10
🔌 [Circuit Breaker] Circuit breaker RESET: {
  state: 'closed',
  failures: 0,
  consecutiveSuccesses: 0,
  threshold: 10,
  lastFailure: null,
  openUntil: null
}
🔓 Client released for query 6150d7bf-ff10-45d8-87bc-674d288e4f48 (destroyed: false)
 GET /api/category/ai-categorization/status/df1895ec-e1cb-4626-b924-1c3921cd570e 200 in 1178ms
✅ Query 981b0182-e0ef-4a70-81ad-5b434ec3a130 completed in 153ms, rows: 1
📈 Consecutive successes: 1/10
⏳ Circuit breaker reset pending: 1/10 consecutive successes
🔓 Client released for query 981b0182-e0ef-4a70-81ad-5b434ec3a130 (destroyed: false)
[category-ai:resolver] Found 1 providerInstances
[category-ai:resolver] Using active provider instance: 1764011833761-r1jthor14 (minimax:minimax-m2:free)
[category-ai:resolver] Extracted 1 providers from config
[suggestCategoriesBatch] Config loaded: YES
[suggestCategoriesBatch] Found 1 providers for 10 products
🔌 [Query 354ad2b3-dfac-4b82-bfb9-aad15a1c33f6] Before query execution: {
  state: 'closed',
  failures: 0,
  consecutiveSuccesses: 1,
  threshold: 10,
  lastFailure: null,
  openUntil: null
}
🔌 Acquiring client for query 354ad2b3-dfac-4b82-bfb9-aad15a1c33f6...
✅ Client acquired for query 354ad2b3-dfac-4b82-bfb9-aad15a1c33f6 in 1ms
🔍 Query 354ad2b3-dfac-4b82-bfb9-aad15a1c33f6:
    SELECT
      category_id,
      name,
      parent_id,
      path,
      l...
✅ Query 354ad2b3-dfac-4b82-bfb9-aad15a1c33f6 completed in 306ms, rows: 309
📈 Consecutive successes: 2/10
⏳ Circuit breaker reset pending: 2/10 consecutive successes
🔓 Client released for query 354ad2b3-dfac-4b82-bfb9-aad15a1c33f6 (destroyed: false)
[batcher] Starting batch process: providers=1, products=10
[batcher] Computing batch size for provider openai_compatible (model=minimax:minimax-m2:free)
[batcher] Provider openai_compatible optimal batch size=10
[batcher] Provider openai_compatible processing batch size 10 with timeout 60000ms (deadline in 119998ms)
[engine] runProviderBatch start: provider=openai_compatible, model=minimax:minimax-m2:free, products=10, timeout=60000
✅ New client connected to enterprise pool
✅ Client acquired for query 65854522-742a-406d-bf35-4cce6efceab2 in 925ms
🔍 Query 65854522-742a-406d-bf35-4cce6efceab2:
      SELECT
        job_id,
        job_type,
        status,
        total_p...
[batcher] Provider openai_compatible batch failed: Error: Chat completion failed (405 Method Not Allowed)
    at callChatCompletions (src\lib\cmm\category-ai\engine.ts:122:13)
    at async runProviderBatch (src\lib\cmm\category-ai\engine.ts:372:24)
    at async eval (src\lib\cmm\category-ai\batcher.ts:208:34)
    at async processBatchesAcrossProviders (src\lib\cmm\category-ai\batcher.ts:295:3)
    at async suggestCategoriesBatch (src\lib\cmm\category-ai\index.ts:64:18)
    at async CategorizationEngine.categorizeBatch (src\lib\cmm\ai-categorization\CategorizationEngine.ts:55:27)
    at async JobManager.processJob (src\lib\cmm\ai-categorization\JobManager.ts:170:31)
  120 |     if (!response.ok) {
  121 |       const responseText = await response.text();
> 122 |       throw new Error(
      |             ^
  123 |         `Chat completion failed (${response.status} ${response.statusText}) ${responseText.slice(0, 500)}`
  124 |       );
  125 |     }
[batcher] Completed processing: suggestions count=0
[suggestCategoriesBatch] Processed 10 products -> 0 suggestions
[CategorizationEngine] Received 0 AI suggestions
[JobManager] Job df1895ec-e1cb-4626-b924-1c3921cd570e batch 0 categorizeBatch returned: success=0, failed=0, skipped=10, pending_review=0
🔌 [Query 8b47e7fd-d960-4329-b692-f425cef59b84] Before query execution: {
  state: 'closed',
  failures: 0,
  consecutiveSuccesses: 2,
  threshold: 10,
  lastFailure: null,
  openUntil: null
}
🔌 Acquiring client for query 8b47e7fd-d960-4329-b692-f425cef59b84...
✅ Client acquired for query 8b47e7fd-d960-4329-b692-f425cef59b84 in 0ms
🔍 Query 8b47e7fd-d960-4329-b692-f425cef59b84:
      UPDATE core.supplier_product
      SET
        ai_categorization_status ...
✅ Query 8b47e7fd-d960-4329-b692-f425cef59b84 completed in 155ms, rows: 1
📈 Consecutive successes: 3/10
⏳ Circuit breaker reset pending: 3/10 consecutive successes
🔓 Client released for query 8b47e7fd-d960-4329-b692-f425cef59b84 (destroyed: false)
🔌 [Query dd1d098f-ebee-494b-92ec-e873244dae09] Before query execution: {
  state: 'closed',
  failures: 0,
  consecutiveSuccesses: 3,
  threshold: 10,
  lastFailure: null,
  openUntil: null
}
🔌 Acquiring client for query dd1d098f-ebee-494b-92ec-e873244dae09...
✅ Client acquired for query dd1d098f-ebee-494b-92ec-e873244dae09 in 0ms
🔍 Query dd1d098f-ebee-494b-92ec-e873244dae09:
      UPDATE core.supplier_product
      SET
        ai_categorization_status ...
🛡️ Setting up database cleanup handlers...
✅ Cleanup handlers registered successfully
🚀 Unified database connection updated with enterprise manager
✅ Query dd1d098f-ebee-494b-92ec-e873244dae09 completed in 155ms, rows: 1
📈 Consecutive successes: 4/10
⏳ Circuit breaker reset pending: 4/10 consecutive successes
🔓 Client released for query dd1d098f-ebee-494b-92ec-e873244dae09 (destroyed: false)
🔌 [Query b5af214f-5faf-4cbf-9135-0e5b5854ef8f] Before query execution: {
  state: 'closed',
  failures: 0,
  consecutiveSuccesses: 4,
  threshold: 10,
  lastFailure: null,
  openUntil: null
}
🔌 Acquiring client for query b5af214f-5faf-4cbf-9135-0e5b5854ef8f...
✅ Client acquired for query b5af214f-5faf-4cbf-9135-0e5b5854ef8f in 1ms
🔍 Query b5af214f-5faf-4cbf-9135-0e5b5854ef8f:
      UPDATE core.supplier_product
      SET
        ai_categorization_status ...
✅ Query 65854522-742a-406d-bf35-4cce6efceab2 completed in 454ms, rows: 20
📈 Consecutive successes: 5/10
⏳ Circuit breaker reset pending: 5/10 consecutive successes
🔓 Client released for query 65854522-742a-406d-bf35-4cce6efceab2 (destroyed: false)
 GET /api/category/ai-categorization/jobs?limit=20 200 in 1792ms
✅ Query b5af214f-5faf-4cbf-9135-0e5b5854ef8f completed in 155ms, rows: 1
📈 Consecutive successes: 6/10
⏳ Circuit breaker reset pending: 6/10 consecutive successes
🔓 Client released for query b5af214f-5faf-4cbf-9135-0e5b5854ef8f (destroyed: false)
🔌 [Query 5c7c942f-72fd-4075-9a90-ba90fe4b1cb0] Before query execution: {
  state: 'closed',
  failures: 0,
  consecutiveSuccesses: 6,
  threshold: 10,
  lastFailure: null,
  openUntil: null
}
🔌 Acquiring client for query 5c7c942f-72fd-4075-9a90-ba90fe4b1cb0...
✅ Client acquired for query 5c7c942f-72fd-4075-9a90-ba90fe4b1cb0 in 0ms
🔍 Query 5c7c942f-72fd-4075-9a90-ba90fe4b1cb0:
      UPDATE core.supplier_product
      SET
        ai_categorization_status ...
✅ Query 5c7c942f-72fd-4075-9a90-ba90fe4b1cb0 completed in 154ms, rows: 1
📈 Consecutive successes: 7/10
⏳ Circuit breaker reset pending: 7/10 consecutive successes
🔓 Client released for query 5c7c942f-72fd-4075-9a90-ba90fe4b1cb0 (destroyed: false)
🔌 [Query 800adb5b-7bf8-4842-a443-9e557833f6e0] Before query execution: {
  state: 'closed',
  failures: 0,
  consecutiveSuccesses: 7,
  threshold: 10,
  lastFailure: null,
  openUntil: null
}
🔌 Acquiring client for query 800adb5b-7bf8-4842-a443-9e557833f6e0...
✅ Client acquired for query 800adb5b-7bf8-4842-a443-9e557833f6e0 in 1ms
🔍 Query 800adb5b-7bf8-4842-a443-9e557833f6e0:
      UPDATE core.supplier_product
      SET
        ai_categorization_status ...
✅ Query 800adb5b-7bf8-4842-a443-9e557833f6e0 completed in 156ms, rows: 1
📈 Consecutive successes: 8/10
⏳ Circuit breaker reset pending: 8/10 consecutive successes
🔓 Client released for query 800adb5b-7bf8-4842-a443-9e557833f6e0 (destroyed: false)
🔌 [Query d2aa7dfb-7275-4681-bf66-b909a45915de] Before query execution: {
  state: 'closed',
  failures: 0,
  consecutiveSuccesses: 8,
  threshold: 10,
  lastFailure: null,
  openUntil: null
}
🔌 Acquiring client for query d2aa7dfb-7275-4681-bf66-b909a45915de...
✅ Client acquired for query d2aa7dfb-7275-4681-bf66-b909a45915de in 0ms
🔍 Query d2aa7dfb-7275-4681-bf66-b909a45915de:
      UPDATE core.supplier_product
      SET
        ai_categorization_status ...
✅ Query d2aa7dfb-7275-4681-bf66-b909a45915de completed in 154ms, rows: 1
📈 Consecutive successes: 9/10
⏳ Circuit breaker reset pending: 9/10 consecutive successes
🔓 Client released for query d2aa7dfb-7275-4681-bf66-b909a45915de (destroyed: false)
🔌 [Query 464f82c1-b919-4411-b63d-a51dbf599809] Before query execution: {
  state: 'closed',
  failures: 0,
  consecutiveSuccesses: 9,
  threshold: 10,
  lastFailure: null,
  openUntil: null
}
🔌 Acquiring client for query 464f82c1-b919-4411-b63d-a51dbf599809...
✅ Client acquired for query 464f82c1-b919-4411-b63d-a51dbf599809 in 0ms
🔍 Query 464f82c1-b919-4411-b63d-a51dbf599809:
      UPDATE core.supplier_product
      SET
        ai_categorization_status ...
✅ Query 464f82c1-b919-4411-b63d-a51dbf599809 completed in 155ms, rows: 1
📈 Consecutive successes: 10/10
🔌 [Circuit Breaker] Circuit breaker RESET: {
  state: 'closed',
  failures: 0,
  consecutiveSuccesses: 0,
  threshold: 10,
  lastFailure: null,
  openUntil: null
}
🔓 Client released for query 464f82c1-b919-4411-b63d-a51dbf599809 (destroyed: false)
🔌 [Query 11d3eb77-f3b6-4bc4-bda5-7113c081e0a3] Before query execution: {
  state: 'closed',
  failures: 0,
  consecutiveSuccesses: 0,
  threshold: 10,
  lastFailure: null,
  openUntil: null
}
🔌 Acquiring client for query 11d3eb77-f3b6-4bc4-bda5-7113c081e0a3...
✅ Client acquired for query 11d3eb77-f3b6-4bc4-bda5-7113c081e0a3 in 0ms
🔍 Query 11d3eb77-f3b6-4bc4-bda5-7113c081e0a3:
      UPDATE core.supplier_product
      SET
        ai_categorization_status ...
✅ Query 11d3eb77-f3b6-4bc4-bda5-7113c081e0a3 completed in 154ms, rows: 1
📈 Consecutive successes: 1/10
⏳ Circuit breaker reset pending: 1/10 consecutive successes
🔓 Client released for query 11d3eb77-f3b6-4bc4-bda5-7113c081e0a3 (destroyed: false)
🔌 [Query cfb1387a-d581-45d2-9658-505aed5a0692] Before query execution: {
  state: 'closed',
  failures: 0,
  consecutiveSuccesses: 1,
  threshold: 10,
  lastFailure: null,
  openUntil: null
}
🔌 Acquiring client for query cfb1387a-d581-45d2-9658-505aed5a0692...
✅ Client acquired for query cfb1387a-d581-45d2-9658-505aed5a0692 in 0ms
🔍 Query cfb1387a-d581-45d2-9658-505aed5a0692:
      UPDATE core.supplier_product
      SET
        ai_categorization_status ...
🔌 [Query b4684d34-06a7-47a3-81b2-560520c990ae] Before query execution: {
  state: 'closed',
  failures: 0,
  consecutiveSuccesses: 1,
  threshold: 10,
  lastFailure: null,
  openUntil: null
}
🔌 Acquiring client for query b4684d34-06a7-47a3-81b2-560520c990ae...
✅ Client acquired for query b4684d34-06a7-47a3-81b2-560520c990ae in 0ms
🔍 Query b4684d34-06a7-47a3-81b2-560520c990ae:
      SELECT
        job_id,
        job_type,
        status,
        total_p...
✅ Query cfb1387a-d581-45d2-9658-505aed5a0692 completed in 155ms, rows: 1
📈 Consecutive successes: 2/10
⏳ Circuit breaker reset pending: 2/10 consecutive successes
🔓 Client released for query cfb1387a-d581-45d2-9658-505aed5a0692 (destroyed: false)
🔌 [Query 5b02625c-73fe-4e03-bd20-ae50b1e7a7ea] Before query execution: {
  state: 'closed',
  failures: 0,
  consecutiveSuccesses: 2,
  threshold: 10,
  lastFailure: null,
  openUntil: null
}
🔌 Acquiring client for query 5b02625c-73fe-4e03-bd20-ae50b1e7a7ea...
✅ Client acquired for query 5b02625c-73fe-4e03-bd20-ae50b1e7a7ea in 1ms
🔍 Query 5b02625c-73fe-4e03-bd20-ae50b1e7a7ea:
      UPDATE core.supplier_product
      SET
        ai_categorization_status ...
✅ Query b4684d34-06a7-47a3-81b2-560520c990ae completed in 151ms, rows: 1
📈 Consecutive successes: 3/10
⏳ Circuit breaker reset pending: 3/10 consecutive successes
🔓 Client released for query b4684d34-06a7-47a3-81b2-560520c990ae (destroyed: false)
🔌 [Query 342f7e4e-95e0-414d-b3eb-67512f9ba9dc] Before query execution: {
  state: 'closed',
  failures: 0,
  consecutiveSuccesses: 3,
  threshold: 10,
  lastFailure: null,
  openUntil: null
}
🔌 Acquiring client for query 342f7e4e-95e0-414d-b3eb-67512f9ba9dc...
✅ Client acquired for query 342f7e4e-95e0-414d-b3eb-67512f9ba9dc in 0ms
🔍 Query 342f7e4e-95e0-414d-b3eb-67512f9ba9dc:
      WITH batch_stats AS (
        SELECT
          COUNT(*) as completed_bat...
✅ Query 5b02625c-73fe-4e03-bd20-ae50b1e7a7ea completed in 154ms, rows: 1
📈 Consecutive successes: 4/10
⏳ Circuit breaker reset pending: 4/10 consecutive successes
🔓 Client released for query 5b02625c-73fe-4e03-bd20-ae50b1e7a7ea (destroyed: false)
[JobManager] Job df1895ec-e1cb-4626-b924-1c3921cd570e batch 0 apply results -> errors=0
🔌 [Query 621febd8-3101-4fa8-be90-8f089f24c467] Before query execution: {
  state: 'closed',
  failures: 0,
  consecutiveSuccesses: 4,
  threshold: 10,
  lastFailure: null,
  openUntil: null
}
🔌 Acquiring client for query 621febd8-3101-4fa8-be90-8f089f24c467...
✅ Client acquired for query 621febd8-3101-4fa8-be90-8f089f24c467 in 0ms
🔍 Query 621febd8-3101-4fa8-be90-8f089f24c467:
      UPDATE core.ai_categorization_progress
      SET
        successful_coun...
✅ Query 342f7e4e-95e0-414d-b3eb-67512f9ba9dc completed in 152ms, rows: 1
📈 Consecutive successes: 5/10
⏳ Circuit breaker reset pending: 5/10 consecutive successes
🔓 Client released for query 342f7e4e-95e0-414d-b3eb-67512f9ba9dc (destroyed: false)
🔌 [Query f347160d-4e5a-4a7c-9aa3-e6ac1700fff4] Before query execution: {
  state: 'closed',
  failures: 0,
  consecutiveSuccesses: 5,
  threshold: 10,
  lastFailure: null,
  openUntil: null
}
🔌 Acquiring client for query f347160d-4e5a-4a7c-9aa3-e6ac1700fff4...
✅ Client acquired for query f347160d-4e5a-4a7c-9aa3-e6ac1700fff4 in 1ms
🔍 Query f347160d-4e5a-4a7c-9aa3-e6ac1700fff4:
      SELECT
        batch_number,
        error_message,
        products_in_...
✅ Query 621febd8-3101-4fa8-be90-8f089f24c467 completed in 153ms, rows: 1
📈 Consecutive successes: 6/10
⏳ Circuit breaker reset pending: 6/10 consecutive successes
🔓 Client released for query 621febd8-3101-4fa8-be90-8f089f24c467 (destroyed: false)
🔌 [Query 26196e13-1de7-483a-b188-a93808f595ca] Before query execution: {
  state: 'closed',
  failures: 0,
  consecutiveSuccesses: 6,
  threshold: 10,
  lastFailure: null,
  openUntil: null
}
🔌 Acquiring client for query 26196e13-1de7-483a-b188-a93808f595ca...
✅ Client acquired for query 26196e13-1de7-483a-b188-a93808f595ca in 1ms
🔍 Query 26196e13-1de7-483a-b188-a93808f595ca:
      UPDATE core.ai_categorization_job
      SET
        processed_products =...
✅ Query f347160d-4e5a-4a7c-9aa3-e6ac1700fff4 completed in 151ms, rows: 0
📈 Consecutive successes: 7/10
⏳ Circuit breaker reset pending: 7/10 consecutive successes
🔓 Client released for query f347160d-4e5a-4a7c-9aa3-e6ac1700fff4 (destroyed: false)
🔌 [Query dadf012d-2b36-41c3-ae2e-acf712000b88] Before query execution: {
  state: 'closed',
  failures: 0,
  consecutiveSuccesses: 7,
  threshold: 10,
  lastFailure: null,
  openUntil: null
}
🔌 Acquiring client for query dadf012d-2b36-41c3-ae2e-acf712000b88...
✅ Client acquired for query dadf012d-2b36-41c3-ae2e-acf712000b88 in 0ms
🔍 Query dadf012d-2b36-41c3-ae2e-acf712000b88:
      WITH batch_metrics AS (
        SELECT
          SUM(successful_count + ...
✅ Query 26196e13-1de7-483a-b188-a93808f595ca completed in 154ms, rows: 1
📈 Consecutive successes: 8/10
⏳ Circuit breaker reset pending: 8/10 consecutive successes
🔓 Client released for query 26196e13-1de7-483a-b188-a93808f595ca (destroyed: false)
🔌 [Query 14addb22-4b91-499f-880e-ebfd7b5f7ffc] Before query execution: {
  state: 'closed',
  failures: 0,
  consecutiveSuccesses: 8,
  threshold: 10,
  lastFailure: null,
  openUntil: null
}
🔌 Acquiring client for query 14addb22-4b91-499f-880e-ebfd7b5f7ffc...
✅ Client acquired for query 14addb22-4b91-499f-880e-ebfd7b5f7ffc in 1ms
🔍 Query 14addb22-4b91-499f-880e-ebfd7b5f7ffc:
      UPDATE core.ai_categorization_job j
      SET avg_batch_duration_ms = (
 ...
✅ Query dadf012d-2b36-41c3-ae2e-acf712000b88 completed in 151ms, rows: 1
📈 Consecutive successes: 9/10
⏳ Circuit breaker reset pending: 9/10 consecutive successes
🔓 Client released for query dadf012d-2b36-41c3-ae2e-acf712000b88 (destroyed: false)
 GET /api/category/ai-categorization/status/df1895ec-e1cb-4626-b924-1c3921cd570e 200 in 699ms
✅ Query 14addb22-4b91-499f-880e-ebfd7b5f7ffc completed in 154ms, rows: 1
📈 Consecutive successes: 10/10
🔌 [Circuit Breaker] Circuit breaker RESET: {
  state: 'closed',
  failures: 0,
  consecutiveSuccesses: 0,
  threshold: 10,
  lastFailure: null,
  openUntil: null
}
🔓 Client released for query 14addb22-4b91-499f-880e-ebfd7b5f7ffc (destroyed: false)
[JobManager] Job df1895ec-e1cb-4626-b924-1c3921cd570e batch 0: 0 succeeded, 0 failed, 10 skipped, 0 pending_review
🛡️ Setting up database cleanup handlers...
✅ Cleanup handlers registered successfully
🚀 Unified database connection updated with enterprise manager
🔌 [Query 5c5f2e32-2f3b-4d55-a372-96f85d122196] Before query execution: {
  state: 'closed',
  failures: 0,
  consecutiveSuccesses: 0,
  threshold: 10,
  lastFailure: null,
  openUntil: null
}
🔌 Acquiring client for query 5c5f2e32-2f3b-4d55-a372-96f85d122196...
✅ Client acquired for query 5c5f2e32-2f3b-4d55-a372-96f85d122196 in 0ms
🔍 Query 5c5f2e32-2f3b-4d55-a372-96f85d122196:
      SELECT
        job_id,
        job_type,
        status,
        total_p...
✅ Query 5c5f2e32-2f3b-4d55-a372-96f85d122196 completed in 305ms, rows: 20
📈 Consecutive successes: 1/10
⏳ Circuit breaker reset pending: 1/10 consecutive successes
🔓 Client released for query 5c5f2e32-2f3b-4d55-a372-96f85d122196 (destroyed: false)
 GET /api/category/ai-categorization/jobs?limit=20 200 in 381ms
🔌 [Query bdfa69f4-af84-4e2b-a946-96583192df44] Before query execution: {
  state: 'closed',
  failures: 0,
  consecutiveSuccesses: 1,
  threshold: 10,
  lastFailure: null,
  openUntil: null
}
🔌 Acquiring client for query bdfa69f4-af84-4e2b-a946-96583192df44...
✅ Client acquired for query bdfa69f4-af84-4e2b-a946-96583192df44 in 1ms
🔍 Query bdfa69f4-af84-4e2b-a946-96583192df44:
      SELECT status
      FROM core.ai_categorization_job
      WHERE job_id = ...
✅ Query bdfa69f4-af84-4e2b-a946-96583192df44 completed in 153ms, rows: 1
📈 Consecutive successes: 2/10
⏳ Circuit breaker reset pending: 2/10 consecutive successes
🔓 Client released for query bdfa69f4-af84-4e2b-a946-96583192df44 (destroyed: false)
[JobManager] Job df1895ec-e1cb-4626-b924-1c3921cd570e fetching batch 1 (offset=10, size=10)
🔌 [Query 1c62a01d-8115-40e6-ac40-99b14d064cc1] Before query execution: {
  state: 'closed',
  failures: 0,
  consecutiveSuccesses: 2,
  threshold: 10,
  lastFailure: null,
  openUntil: null
}
🔌 Acquiring client for query 1c62a01d-8115-40e6-ac40-99b14d064cc1...
✅ Client acquired for query 1c62a01d-8115-40e6-ac40-99b14d064cc1 in 1ms
🔍 Query 1c62a01d-8115-40e6-ac40-99b14d064cc1:
      SELECT supplier_product_id
      FROM core.supplier_product sp

   ...
✅ Query 1c62a01d-8115-40e6-ac40-99b14d064cc1 completed in 153ms, rows: 10
📈 Consecutive successes: 3/10
⏳ Circuit breaker reset pending: 3/10 consecutive successes
🔓 Client released for query 1c62a01d-8115-40e6-ac40-99b14d064cc1 (destroyed: false)
[JobManager] getProductIdsForBatch offset=10 batchSize=10 filters={"exclude_categorized":false} -> 10 ids
[JobManager] fetchProductsForBatch offset=10 batchSize=10 -> ids=10
🔌 [Query 7ea375b3-a4f6-439f-b688-8fd58ece6744] Before query execution: {
  state: 'closed',
  failures: 0,
  consecutiveSuccesses: 3,
  threshold: 10,
  lastFailure: null,
  openUntil: null
}
🔌 Acquiring client for query 7ea375b3-a4f6-439f-b688-8fd58ece6744...
✅ Client acquired for query 7ea375b3-a4f6-439f-b688-8fd58ece6744 in 0ms
🔍 Query 7ea375b3-a4f6-439f-b688-8fd58ece6744:
    WITH current_prices AS (
      SELECT DISTINCT ON (supplier_product_id)
   ...
🔌 [Query 0bc3d771-8444-4f52-a9a4-57522be8c469] Before query execution: {
  state: 'closed',
  failures: 0,
  consecutiveSuccesses: 3,
  threshold: 10,
  lastFailure: null,
  openUntil: null
}
🔌 Acquiring client for query 0bc3d771-8444-4f52-a9a4-57522be8c469...
✅ Client acquired for query 0bc3d771-8444-4f52-a9a4-57522be8c469 in 0ms
🔍 Query 0bc3d771-8444-4f52-a9a4-57522be8c469:
      SELECT
        job_id,
        job_type,
        status,
        total_p...
✅ Query 7ea375b3-a4f6-439f-b688-8fd58ece6744 completed in 156ms, rows: 10
📈 Consecutive successes: 4/10
⏳ Circuit breaker reset pending: 4/10 consecutive successes
🔓 Client released for query 7ea375b3-a4f6-439f-b688-8fd58ece6744 (destroyed: false)
[JobManager] fetchProductsForBatch enriched 10 products
[JobManager] Job df1895ec-e1cb-4626-b924-1c3921cd570e batch 1 fetched 10 products
🔌 [Query c2308ae1-5b06-4c71-aa7a-cd101809beef] Before query execution: {
  state: 'closed',
  failures: 0,
  consecutiveSuccesses: 4,
  threshold: 10,
  lastFailure: null,
  openUntil: null
}
🔌 Acquiring client for query c2308ae1-5b06-4c71-aa7a-cd101809beef...
✅ Client acquired for query c2308ae1-5b06-4c71-aa7a-cd101809beef in 0ms
🔍 Query c2308ae1-5b06-4c71-aa7a-cd101809beef:
      INSERT INTO core.ai_categorization_progress (
        job_id, batch_numbe...
✅ Query 0bc3d771-8444-4f52-a9a4-57522be8c469 completed in 150ms, rows: 1
📈 Consecutive successes: 5/10
⏳ Circuit breaker reset pending: 5/10 consecutive successes
🔓 Client released for query 0bc3d771-8444-4f52-a9a4-57522be8c469 (destroyed: false)
🔌 [Query c11627da-2f8b-48bc-89fe-91f52d815be7] Before query execution: {
  state: 'closed',
  failures: 0,
  consecutiveSuccesses: 5,
  threshold: 10,
  lastFailure: null,
  openUntil: null
}
🔌 Acquiring client for query c11627da-2f8b-48bc-89fe-91f52d815be7...
✅ Client acquired for query c11627da-2f8b-48bc-89fe-91f52d815be7 in 1ms
🔍 Query c11627da-2f8b-48bc-89fe-91f52d815be7:
      WITH batch_stats AS (
        SELECT
          COUNT(*) as completed_bat...
✅ Query c2308ae1-5b06-4c71-aa7a-cd101809beef completed in 153ms, rows: 1
📈 Consecutive successes: 6/10
⏳ Circuit breaker reset pending: 6/10 consecutive successes
🔓 Client released for query c2308ae1-5b06-4c71-aa7a-cd101809beef (destroyed: false)
[JobManager] Job df1895ec-e1cb-4626-b924-1c3921cd570e batch 1 progress record 296a7d30-2354-4660-b96d-c65bb2a68256 created
🔌 [Query 67bbdf88-20f6-4a83-b1f4-9ea5802d66b9] Before query execution: {
  state: 'closed',
  failures: 0,
  consecutiveSuccesses: 6,
  threshold: 10,
  lastFailure: null,
  openUntil: null
}
🔌 Acquiring client for query 67bbdf88-20f6-4a83-b1f4-9ea5802d66b9...
✅ Client acquired for query 67bbdf88-20f6-4a83-b1f4-9ea5802d66b9 in 0ms
🔍 Query 67bbdf88-20f6-4a83-b1f4-9ea5802d66b9:
      UPDATE core.supplier_product
      SET ai_categorization_status = 'proces...
✅ Query c11627da-2f8b-48bc-89fe-91f52d815be7 completed in 152ms, rows: 1
📈 Consecutive successes: 7/10
⏳ Circuit breaker reset pending: 7/10 consecutive successes
🔓 Client released for query c11627da-2f8b-48bc-89fe-91f52d815be7 (destroyed: false)
🔌 [Query 9ca06eac-64a7-4224-ada0-403c81f0368f] Before query execution: {
  state: 'closed',
  failures: 0,
  consecutiveSuccesses: 7,
  threshold: 10,
  lastFailure: null,
  openUntil: null
}
🔌 Acquiring client for query 9ca06eac-64a7-4224-ada0-403c81f0368f...
✅ Client acquired for query 9ca06eac-64a7-4224-ada0-403c81f0368f in 1ms
🔍 Query 9ca06eac-64a7-4224-ada0-403c81f0368f:
      SELECT
        batch_number,
        error_message,
        products_in_...
✅ Query 67bbdf88-20f6-4a83-b1f4-9ea5802d66b9 completed in 156ms, rows: 10
📈 Consecutive successes: 8/10
⏳ Circuit breaker reset pending: 8/10 consecutive successes
🔓 Client released for query 67bbdf88-20f6-4a83-b1f4-9ea5802d66b9 (destroyed: false)
[JobManager] Job df1895ec-e1cb-4626-b924-1c3921cd570e batch 1 marked 10 products as processing
[JobManager] Job df1895ec-e1cb-4626-b924-1c3921cd570e batch 1 invoking categorizeBatch
[CategorizationEngine] Requesting AI suggestions for 10 products (provider batch size=10, timeout=60000ms)
[suggestCategoriesBatch] ENTRY: 10 products, orgId: null
[category-ai:resolver] ENTRY: Loading config for orgId: null
[category-ai:resolver] Resolved orgId: 00000000-0000-0000-0000-000000000000
🔌 [Query 649c0fe4-9d71-4fee-9fae-f6b86c3327c9] Before query execution: {
  state: 'closed',
  failures: 0,
  consecutiveSuccesses: 8,
  threshold: 10,
  lastFailure: null,
  openUntil: null
}
🔌 Acquiring client for query 649c0fe4-9d71-4fee-9fae-f6b86c3327c9...
✅ Client acquired for query 649c0fe4-9d71-4fee-9fae-f6b86c3327c9 in 0ms
🔍 Query 649c0fe4-9d71-4fee-9fae-f6b86c3327c9:
    SELECT id, service_key
    FROM ai_service
    WHERE org_id = $1 AND servic...
✅ Query 9ca06eac-64a7-4224-ada0-403c81f0368f completed in 151ms, rows: 0
📈 Consecutive successes: 9/10
⏳ Circuit breaker reset pending: 9/10 consecutive successes
🔓 Client released for query 9ca06eac-64a7-4224-ada0-403c81f0368f (destroyed: false)
🔌 [Query edcfd093-2274-49fd-aafb-4c710102ff01] Before query execution: {
  state: 'closed',
  failures: 0,
  consecutiveSuccesses: 9,
  threshold: 10,
  lastFailure: null,
  openUntil: null
}
🔌 Acquiring client for query edcfd093-2274-49fd-aafb-4c710102ff01...
✅ Client acquired for query edcfd093-2274-49fd-aafb-4c710102ff01 in 1ms
🔍 Query edcfd093-2274-49fd-aafb-4c710102ff01:
      WITH batch_metrics AS (
        SELECT
          SUM(successful_count + ...
✅ Query 649c0fe4-9d71-4fee-9fae-f6b86c3327c9 completed in 153ms, rows: 1
📈 Consecutive successes: 10/10
🔌 [Circuit Breaker] Circuit breaker RESET: {
  state: 'closed',
  failures: 0,
  consecutiveSuccesses: 0,
  threshold: 10,
  lastFailure: null,
  openUntil: null
}
🔓 Client released for query 649c0fe4-9d71-4fee-9fae-f6b86c3327c9 (destroyed: false)
[category-ai:resolver] Service query result: 1 rows
🔌 [Query e4686c91-24e5-4915-8d26-b51346c5cb5b] Before query execution: {
  state: 'closed',
  failures: 0,
  consecutiveSuccesses: 0,
  threshold: 10,
  lastFailure: null,
  openUntil: null
}
🔌 Acquiring client for query e4686c91-24e5-4915-8d26-b51346c5cb5b...
✅ Client acquired for query e4686c91-24e5-4915-8d26-b51346c5cb5b in 0ms
🔍 Query e4686c91-24e5-4915-8d26-b51346c5cb5b:
    SELECT id, org_id, service_id, config, is_enabled as enabled
    FROM ai_se...
✅ Query edcfd093-2274-49fd-aafb-4c710102ff01 completed in 152ms, rows: 1
📈 Consecutive successes: 1/10
⏳ Circuit breaker reset pending: 1/10 consecutive successes
🔓 Client released for query edcfd093-2274-49fd-aafb-4c710102ff01 (destroyed: false)
 GET /api/category/ai-categorization/status/df1895ec-e1cb-4626-b924-1c3921cd570e 200 in 715ms
✅ Query e4686c91-24e5-4915-8d26-b51346c5cb5b completed in 152ms, rows: 1
📈 Consecutive successes: 2/10
⏳ Circuit breaker reset pending: 2/10 consecutive successes
🔓 Client released for query e4686c91-24e5-4915-8d26-b51346c5cb5b (destroyed: false)
[category-ai:resolver] Found 1 providerInstances
[category-ai:resolver] Using active provider instance: 1764011833761-r1jthor14 (minimax:minimax-m2:free)
[category-ai:resolver] Extracted 1 providers from config
[suggestCategoriesBatch] Config loaded: YES
[suggestCategoriesBatch] Found 1 providers for 10 products
🔌 [Query 5382b6f4-22a5-475e-93e8-0d28d8faf1bf] Before query execution: {
  state: 'closed',
  failures: 0,
  consecutiveSuccesses: 2,
  threshold: 10,
  lastFailure: null,
  openUntil: null
}
🔌 Acquiring client for query 5382b6f4-22a5-475e-93e8-0d28d8faf1bf...
✅ Client acquired for query 5382b6f4-22a5-475e-93e8-0d28d8faf1bf in 0ms
🔍 Query 5382b6f4-22a5-475e-93e8-0d28d8faf1bf:
    SELECT
      category_id,
      name,
      parent_id,
      path,
      l...
🛡️ Setting up database cleanup handlers...
✅ Cleanup handlers registered successfully
🚀 Unified database connection updated with enterprise manager
✅ Query 5382b6f4-22a5-475e-93e8-0d28d8faf1bf completed in 454ms, rows: 309
📈 Consecutive successes: 3/10
⏳ Circuit breaker reset pending: 3/10 consecutive successes
🔓 Client released for query 5382b6f4-22a5-475e-93e8-0d28d8faf1bf (destroyed: false)
[batcher] Starting batch process: providers=1, products=10
[batcher] Computing batch size for provider openai_compatible (model=minimax:minimax-m2:free)
[batcher] Provider openai_compatible optimal batch size=10
[batcher] Provider openai_compatible processing batch size 10 with timeout 60000ms (deadline in 119999ms)
[engine] runProviderBatch start: provider=openai_compatible, model=minimax:minimax-m2:free, products=10, timeout=60000
[batcher] Provider openai_compatible batch failed: Error: Chat completion failed (405 Method Not Allowed)
    at callChatCompletions (src\lib\cmm\category-ai\engine.ts:122:13)
    at async runProviderBatch (src\lib\cmm\category-ai\engine.ts:372:24)
    at async eval (src\lib\cmm\category-ai\batcher.ts:208:34)
    at async processBatchesAcrossProviders (src\lib\cmm\category-ai\batcher.ts:295:3)
    at async suggestCategoriesBatch (src\lib\cmm\category-ai\index.ts:64:18)
    at async CategorizationEngine.categorizeBatch (src\lib\cmm\ai-categorization\CategorizationEngine.ts:55:27)
    at async JobManager.processJob (src\lib\cmm\ai-categorization\JobManager.ts:170:31)
  120 |     if (!response.ok) {
  121 |       const responseText = await response.text();
> 122 |       throw new Error(
      |             ^
  123 |         `Chat completion failed (${response.status} ${response.statusText}) ${responseText.slice(0, 500)}`
  124 |       );
  125 |     }
[batcher] Completed processing: suggestions count=0
[suggestCategoriesBatch] Processed 10 products -> 0 suggestions
[CategorizationEngine] Received 0 AI suggestions
[JobManager] Job df1895ec-e1cb-4626-b924-1c3921cd570e batch 1 categorizeBatch returned: success=0, failed=0, skipped=10, pending_review=0
🔌 [Query 0fe669b4-d2a0-4fb4-b3be-31f9176ab0f5] Before query execution: {
  state: 'closed',
  failures: 0,
  consecutiveSuccesses: 3,
  threshold: 10,
  lastFailure: null,
  openUntil: null
}
🔌 Acquiring client for query 0fe669b4-d2a0-4fb4-b3be-31f9176ab0f5...
✅ Client acquired for query 0fe669b4-d2a0-4fb4-b3be-31f9176ab0f5 in 1ms
🔍 Query 0fe669b4-d2a0-4fb4-b3be-31f9176ab0f5:
      UPDATE core.supplier_product
      SET
        ai_categorization_status ...
✅ Query 0fe669b4-d2a0-4fb4-b3be-31f9176ab0f5 completed in 154ms, rows: 1
📈 Consecutive successes: 4/10
⏳ Circuit breaker reset pending: 4/10 consecutive successes
🔓 Client released for query 0fe669b4-d2a0-4fb4-b3be-31f9176ab0f5 (destroyed: false)
🔌 [Query 11ca5754-3fc1-400c-a4d8-1f21ee7cf244] Before query execution: {
  state: 'closed',
  failures: 0,
  consecutiveSuccesses: 4,
  threshold: 10,
  lastFailure: null,
  openUntil: null
}
🔌 Acquiring client for query 11ca5754-3fc1-400c-a4d8-1f21ee7cf244...
✅ Client acquired for query 11ca5754-3fc1-400c-a4d8-1f21ee7cf244 in 0ms
🔍 Query 11ca5754-3fc1-400c-a4d8-1f21ee7cf244:
      UPDATE core.supplier_product
      SET
        ai_categorization_status ...
✅ Query 11ca5754-3fc1-400c-a4d8-1f21ee7cf244 completed in 155ms, rows: 1
📈 Consecutive successes: 5/10
⏳ Circuit breaker reset pending: 5/10 consecutive successes
🔓 Client released for query 11ca5754-3fc1-400c-a4d8-1f21ee7cf244 (destroyed: false)
🔌 [Query 6868bb34-7a08-4c06-8e75-6c2dccfd5056] Before query execution: {
  state: 'closed',
  failures: 0,
  consecutiveSuccesses: 5,
  threshold: 10,
  lastFailure: null,
  openUntil: null
}
🔌 Acquiring client for query 6868bb34-7a08-4c06-8e75-6c2dccfd5056...
✅ Client acquired for query 6868bb34-7a08-4c06-8e75-6c2dccfd5056 in 0ms
🔍 Query 6868bb34-7a08-4c06-8e75-6c2dccfd5056:
      UPDATE core.supplier_product
      SET
        ai_categorization_status ...
✅ Query 6868bb34-7a08-4c06-8e75-6c2dccfd5056 completed in 156ms, rows: 1
📈 Consecutive successes: 6/10
⏳ Circuit breaker reset pending: 6/10 consecutive successes
🔓 Client released for query 6868bb34-7a08-4c06-8e75-6c2dccfd5056 (destroyed: false)
🔌 [Query e6883fa6-e57f-472b-a5c7-a0331c48d811] Before query execution: {
  state: 'closed',
  failures: 0,
  consecutiveSuccesses: 6,
  threshold: 10,
  lastFailure: null,
  openUntil: null
}
🔌 Acquiring client for query e6883fa6-e57f-472b-a5c7-a0331c48d811...
✅ Client acquired for query e6883fa6-e57f-472b-a5c7-a0331c48d811 in 0ms
🔍 Query e6883fa6-e57f-472b-a5c7-a0331c48d811:
      UPDATE core.supplier_product
      SET
        ai_categorization_status ...
✅ Query e6883fa6-e57f-472b-a5c7-a0331c48d811 completed in 154ms, rows: 1
📈 Consecutive successes: 7/10
⏳ Circuit breaker reset pending: 7/10 consecutive successes
🔓 Client released for query e6883fa6-e57f-472b-a5c7-a0331c48d811 (destroyed: false)
🔌 [Query 198dc6e1-4757-4fb4-88f1-3a6d946ec35a] Before query execution: {
  state: 'closed',
  failures: 0,
  consecutiveSuccesses: 7,
  threshold: 10,
  lastFailure: null,
  openUntil: null
}
🔌 Acquiring client for query 198dc6e1-4757-4fb4-88f1-3a6d946ec35a...
✅ Client acquired for query 198dc6e1-4757-4fb4-88f1-3a6d946ec35a in 1ms
🔍 Query 198dc6e1-4757-4fb4-88f1-3a6d946ec35a:
      UPDATE core.supplier_product
      SET
        ai_categorization_status ...
✅ Query 198dc6e1-4757-4fb4-88f1-3a6d946ec35a completed in 154ms, rows: 1
📈 Consecutive successes: 8/10
⏳ Circuit breaker reset pending: 8/10 consecutive successes
🔓 Client released for query 198dc6e1-4757-4fb4-88f1-3a6d946ec35a (destroyed: false)
🔌 [Query 6a2fa9b3-6348-40cc-a950-cab1713c7ca0] Before query execution: {
  state: 'closed',
  failures: 0,
  consecutiveSuccesses: 8,
  threshold: 10,
  lastFailure: null,
  openUntil: null
}
🔌 Acquiring client for query 6a2fa9b3-6348-40cc-a950-cab1713c7ca0...
✅ Client acquired for query 6a2fa9b3-6348-40cc-a950-cab1713c7ca0 in 1ms
🔍 Query 6a2fa9b3-6348-40cc-a950-cab1713c7ca0:
      UPDATE core.supplier_product
      SET
        ai_categorization_status ...
✅ Query 6a2fa9b3-6348-40cc-a950-cab1713c7ca0 completed in 154ms, rows: 1
📈 Consecutive successes: 9/10
⏳ Circuit breaker reset pending: 9/10 consecutive successes
🔓 Client released for query 6a2fa9b3-6348-40cc-a950-cab1713c7ca0 (destroyed: false)
🔌 [Query 4ccfa14a-b372-4ee8-820a-a90e07e23667] Before query execution: {
  state: 'closed',
  failures: 0,
  consecutiveSuccesses: 9,
  threshold: 10,
  lastFailure: null,
  openUntil: null
}
🔌 Acquiring client for query 4ccfa14a-b372-4ee8-820a-a90e07e23667...
✅ Client acquired for query 4ccfa14a-b372-4ee8-820a-a90e07e23667 in 0ms
🔍 Query 4ccfa14a-b372-4ee8-820a-a90e07e23667:
      UPDATE core.supplier_product
      SET
        ai_categorization_status ...
✅ Query 4ccfa14a-b372-4ee8-820a-a90e07e23667 completed in 154ms, rows: 1
📈 Consecutive successes: 10/10
🔌 [Circuit Breaker] Circuit breaker RESET: {
  state: 'closed',
  failures: 0,
  consecutiveSuccesses: 0,
  threshold: 10,
  lastFailure: null,
  openUntil: null
}
🔓 Client released for query 4ccfa14a-b372-4ee8-820a-a90e07e23667 (destroyed: false)
🔌 [Query 81a095a2-16d4-43e6-9e89-4a08b163b7f1] Before query execution: {
  state: 'closed',
  failures: 0,
  consecutiveSuccesses: 0,
  threshold: 10,
  lastFailure: null,
  openUntil: null
}
🔌 Acquiring client for query 81a095a2-16d4-43e6-9e89-4a08b163b7f1...
✅ Client acquired for query 81a095a2-16d4-43e6-9e89-4a08b163b7f1 in 0ms
🔍 Query 81a095a2-16d4-43e6-9e89-4a08b163b7f1:
      UPDATE core.supplier_product
      SET
        ai_categorization_status ...
✅ Query 81a095a2-16d4-43e6-9e89-4a08b163b7f1 completed in 154ms, rows: 1
📈 Consecutive successes: 1/10
⏳ Circuit breaker reset pending: 1/10 consecutive successes
🔓 Client released for query 81a095a2-16d4-43e6-9e89-4a08b163b7f1 (destroyed: false)
🔌 [Query 74c21fc4-cf2a-40df-b6ea-59ff8c9339ce] Before query execution: {
  state: 'closed',
  failures: 0,
  consecutiveSuccesses: 1,
  threshold: 10,
  lastFailure: null,
  openUntil: null
}
🔌 Acquiring client for query 74c21fc4-cf2a-40df-b6ea-59ff8c9339ce...
✅ Client acquired for query 74c21fc4-cf2a-40df-b6ea-59ff8c9339ce in 0ms
🔍 Query 74c21fc4-cf2a-40df-b6ea-59ff8c9339ce:
      UPDATE core.supplier_product
      SET
        ai_categorization_status ...
✅ Query 74c21fc4-cf2a-40df-b6ea-59ff8c9339ce completed in 155ms, rows: 1
📈 Consecutive successes: 2/10
⏳ Circuit breaker reset pending: 2/10 consecutive successes
🔓 Client released for query 74c21fc4-cf2a-40df-b6ea-59ff8c9339ce (destroyed: false)
🔌 [Query 8adb0e6c-b6a1-41d7-8807-a2bc6dcc453e] Before query execution: {
  state: 'closed',
  failures: 0,
  consecutiveSuccesses: 2,
  threshold: 10,
  lastFailure: null,
  openUntil: null
}
🔌 Acquiring client for query 8adb0e6c-b6a1-41d7-8807-a2bc6dcc453e...
✅ Client acquired for query 8adb0e6c-b6a1-41d7-8807-a2bc6dcc453e in 0ms
🔍 Query 8adb0e6c-b6a1-41d7-8807-a2bc6dcc453e:
      UPDATE core.supplier_product
      SET
        ai_categorization_status ...
✅ Query 8adb0e6c-b6a1-41d7-8807-a2bc6dcc453e completed in 154ms, rows: 1
📈 Consecutive successes: 3/10
⏳ Circuit breaker reset pending: 3/10 consecutive successes
🔓 Client released for query 8adb0e6c-b6a1-41d7-8807-a2bc6dcc453e (destroyed: false)
[JobManager] Job df1895ec-e1cb-4626-b924-1c3921cd570e batch 1 apply results -> errors=0
🔌 [Query c6767eb6-9f08-493c-aa29-29d58d8fd0fc] Before query execution: {
  state: 'closed',
  failures: 0,
  consecutiveSuccesses: 3,
  threshold: 10,
  lastFailure: null,
  openUntil: null
}
🔌 Acquiring client for query c6767eb6-9f08-493c-aa29-29d58d8fd0fc...
✅ Client acquired for query c6767eb6-9f08-493c-aa29-29d58d8fd0fc in 0ms
🔍 Query c6767eb6-9f08-493c-aa29-29d58d8fd0fc:
      UPDATE core.ai_categorization_progress
      SET
        successful_coun...
🔌 [Query 488620a8-4782-4071-9c9a-5aa2e86d5cc7] Before query execution: {
  state: 'closed',
  failures: 0,
  consecutiveSuccesses: 3,
  threshold: 10,
  lastFailure: null,
  openUntil: null
}
🔌 Acquiring client for query 488620a8-4782-4071-9c9a-5aa2e86d5cc7...
✅ Client acquired for query 488620a8-4782-4071-9c9a-5aa2e86d5cc7 in 0ms
🔍 Query 488620a8-4782-4071-9c9a-5aa2e86d5cc7:
      SELECT
        job_id,
        job_type,
        status,
        total_p...
✅ Query c6767eb6-9f08-493c-aa29-29d58d8fd0fc completed in 155ms, rows: 1
📈 Consecutive successes: 4/10
⏳ Circuit breaker reset pending: 4/10 consecutive successes
🔓 Client released for query c6767eb6-9f08-493c-aa29-29d58d8fd0fc (destroyed: false)
🔌 [Query 1689d0b0-983b-4d55-ad94-6eb3053ac67e] Before query execution: {
  state: 'closed',
  failures: 0,
  consecutiveSuccesses: 4,
  threshold: 10,
  lastFailure: null,
  openUntil: null
}
🔌 Acquiring client for query 1689d0b0-983b-4d55-ad94-6eb3053ac67e...
✅ Client acquired for query 1689d0b0-983b-4d55-ad94-6eb3053ac67e in 0ms
🔍 Query 1689d0b0-983b-4d55-ad94-6eb3053ac67e:
      UPDATE core.ai_categorization_job
      SET
        processed_products =...
✅ Query 488620a8-4782-4071-9c9a-5aa2e86d5cc7 completed in 150ms, rows: 1
📈 Consecutive successes: 5/10
⏳ Circuit breaker reset pending: 5/10 consecutive successes
🔓 Client released for query 488620a8-4782-4071-9c9a-5aa2e86d5cc7 (destroyed: false)
🔌 [Query caf9a5f1-b599-4fdb-918d-8965d86b467c] Before query execution: {
  state: 'closed',
  failures: 0,
  consecutiveSuccesses: 5,
  threshold: 10,
  lastFailure: null,
  openUntil: null
}
🔌 Acquiring client for query caf9a5f1-b599-4fdb-918d-8965d86b467c...
✅ Client acquired for query caf9a5f1-b599-4fdb-918d-8965d86b467c in 1ms
🔍 Query caf9a5f1-b599-4fdb-918d-8965d86b467c:
      WITH batch_stats AS (
        SELECT
          COUNT(*) as completed_bat...
✅ Query 1689d0b0-983b-4d55-ad94-6eb3053ac67e completed in 154ms, rows: 1
📈 Consecutive successes: 6/10
⏳ Circuit breaker reset pending: 6/10 consecutive successes
🔓 Client released for query 1689d0b0-983b-4d55-ad94-6eb3053ac67e (destroyed: false)
🔌 [Query 79f30103-48f0-4273-bb99-0ee7f702dcca] Before query execution: {
  state: 'closed',
  failures: 0,
  consecutiveSuccesses: 6,
  threshold: 10,
  lastFailure: null,
  openUntil: null
}
🔌 Acquiring client for query 79f30103-48f0-4273-bb99-0ee7f702dcca...
✅ Client acquired for query 79f30103-48f0-4273-bb99-0ee7f702dcca in 1ms
🔍 Query 79f30103-48f0-4273-bb99-0ee7f702dcca:
      UPDATE core.ai_categorization_job j
      SET avg_batch_duration_ms = (
 ...
✅ Query caf9a5f1-b599-4fdb-918d-8965d86b467c completed in 151ms, rows: 1
📈 Consecutive successes: 7/10
⏳ Circuit breaker reset pending: 7/10 consecutive successes
🔓 Client released for query caf9a5f1-b599-4fdb-918d-8965d86b467c (destroyed: false)
🔌 [Query c01fa5ce-a782-4ce1-9214-17ae5aece904] Before query execution: {
  state: 'closed',
  failures: 0,
  consecutiveSuccesses: 7,
  threshold: 10,
  lastFailure: null,
  openUntil: null
}
🔌 Acquiring client for query c01fa5ce-a782-4ce1-9214-17ae5aece904...
✅ Client acquired for query c01fa5ce-a782-4ce1-9214-17ae5aece904 in 1ms
🔍 Query c01fa5ce-a782-4ce1-9214-17ae5aece904:
      SELECT
        batch_number,
        error_message,
        products_in_...
✅ Query 79f30103-48f0-4273-bb99-0ee7f702dcca completed in 154ms, rows: 1
📈 Consecutive successes: 8/10
⏳ Circuit breaker reset pending: 8/10 consecutive successes
🔓 Client released for query 79f30103-48f0-4273-bb99-0ee7f702dcca (destroyed: false)
[JobManager] Job df1895ec-e1cb-4626-b924-1c3921cd570e batch 1: 0 succeeded, 0 failed, 10 skipped, 0 pending_review
🔌 [Query 43dfdd39-3f01-4a06-b616-c7a43d5a9db0] Before query execution: {
  state: 'closed',
  failures: 0,
  consecutiveSuccesses: 8,
  threshold: 10,
  lastFailure: null,
  openUntil: null
}
🔌 Acquiring client for query 43dfdd39-3f01-4a06-b616-c7a43d5a9db0...
✅ Client acquired for query 43dfdd39-3f01-4a06-b616-c7a43d5a9db0 in 0ms
🔍 Query 43dfdd39-3f01-4a06-b616-c7a43d5a9db0:
      SELECT status
      FROM core.ai_categorization_job
      WHERE job_id = ...
✅ Query c01fa5ce-a782-4ce1-9214-17ae5aece904 completed in 151ms, rows: 0
📈 Consecutive successes: 9/10
⏳ Circuit breaker reset pending: 9/10 consecutive successes
🔓 Client released for query c01fa5ce-a782-4ce1-9214-17ae5aece904 (destroyed: false)
🔌 [Query 7df53cbf-616d-40ab-838b-b1ce6c94ea8f] Before query execution: {
  state: 'closed',
  failures: 0,
  consecutiveSuccesses: 9,
  threshold: 10,
  lastFailure: null,
  openUntil: null
}
🔌 Acquiring client for query 7df53cbf-616d-40ab-838b-b1ce6c94ea8f...
✅ Client acquired for query 7df53cbf-616d-40ab-838b-b1ce6c94ea8f in 1ms
🔍 Query 7df53cbf-616d-40ab-838b-b1ce6c94ea8f:
      WITH batch_metrics AS (
        SELECT
          SUM(successful_count + ...
✅ Query 43dfdd39-3f01-4a06-b616-c7a43d5a9db0 completed in 153ms, rows: 1
📈 Consecutive successes: 10/10
🔌 [Circuit Breaker] Circuit breaker RESET: {
  state: 'closed',
  failures: 0,
  consecutiveSuccesses: 0,
  threshold: 10,
  lastFailure: null,
  openUntil: null
}
🔓 Client released for query 43dfdd39-3f01-4a06-b616-c7a43d5a9db0 (destroyed: false)
🔌 [Query b684c1d9-9d6b-4094-99ca-6e4e6e307e49] Before query execution: {
  state: 'closed',
  failures: 0,
  consecutiveSuccesses: 0,
  threshold: 10,
  lastFailure: null,
  openUntil: null
}
🔌 Acquiring client for query b684c1d9-9d6b-4094-99ca-6e4e6e307e49...
✅ Client acquired for query b684c1d9-9d6b-4094-99ca-6e4e6e307e49 in 0ms
🔍 Query b684c1d9-9d6b-4094-99ca-6e4e6e307e49:
      UPDATE core.ai_categorization_job
      SET
        status = 'completed'...
✅ Query 7df53cbf-616d-40ab-838b-b1ce6c94ea8f completed in 151ms, rows: 1
📈 Consecutive successes: 1/10
⏳ Circuit breaker reset pending: 1/10 consecutive successes
🔓 Client released for query 7df53cbf-616d-40ab-838b-b1ce6c94ea8f (destroyed: false)
 GET /api/category/ai-categorization/status/df1895ec-e1cb-4626-b924-1c3921cd570e 200 in 690ms
✅ Query b684c1d9-9d6b-4094-99ca-6e4e6e307e49 completed in 153ms, rows: 1
📈 Consecutive successes: 2/10
⏳ Circuit breaker reset pending: 2/10 consecutive successes
🔓 Client released for query b684c1d9-9d6b-4094-99ca-6e4e6e307e49 (destroyed: false)
[JobManager] Job df1895ec-e1cb-4626-b924-1c3921cd570e completed successfully
🛡️ Setting up database cleanup handlers...
✅ Cleanup handlers registered successfully
🚀 Unified database connection updated with enterprise manager
🔌 [Query b055cada-634a-4534-a27b-51c66ec2f547] Before query execution: {
  state: 'closed',
  failures: 0,
  consecutiveSuccesses: 2,
  threshold: 10,
  lastFailure: null,
  openUntil: null
}
🔌 Acquiring client for query b055cada-634a-4534-a27b-51c66ec2f547...
✅ Client acquired for query b055cada-634a-4534-a27b-51c66ec2f547 in 0ms
🔍 Query b055cada-634a-4534-a27b-51c66ec2f547:
      SELECT
        job_id,
        job_type,
        status,
        total_p...
✅ Query b055cada-634a-4534-a27b-51c66ec2f547 completed in 154ms, rows: 20
📈 Consecutive successes: 3/10
⏳ Circuit breaker reset pending: 3/10 consecutive successes
🔓 Client released for query b055cada-634a-4534-a27b-51c66ec2f547 (destroyed: false)
 GET /api/category/ai-categorization/jobs?limit=20 200 in 299ms
🔌 [Query 88d9a06b-d9d7-4a97-83d4-ededebb6c5f1] Before query execution: {
  state: 'closed',
  failures: 0,
  consecutiveSuccesses: 3,
  threshold: 10,
  lastFailure: null,
  openUntil: null
}
🔌 Acquiring client for query 88d9a06b-d9d7-4a97-83d4-ededebb6c5f1...
✅ Client acquired for query 88d9a06b-d9d7-4a97-83d4-ededebb6c5f1 in 0ms
🔍 Query 88d9a06b-d9d7-4a97-83d4-ededebb6c5f1:
      SELECT
        job_id,
        job_type,
        status,
        total_p...
✅ Query 88d9a06b-d9d7-4a97-83d4-ededebb6c5f1 completed in 304ms, rows: 20
📈 Consecutive successes: 4/10
⏳ Circuit breaker reset pending: 4/10 consecutive successes
🔓 Client released for query 88d9a06b-d9d7-4a97-83d4-ededebb6c5f1 (destroyed: false)
 GET /api/category/ai-categorization/jobs?limit=20 200 in 394ms
🔌 [Query 873eb12f-1852-417c-9b16-3b1da81ba989] Before query execution: {
  state: 'closed',
  failures: 0,
  consecutiveSuccesses: 4,
  threshold: 10,
  lastFailure: null,
  openUntil: null
}
🔌 Acquiring client for query 873eb12f-1852-417c-9b16-3b1da81ba989...
🔌 [Query aaecfc48-8f25-420a-9882-22ddb145d000] Before query execution: {
  state: 'closed',
  failures: 0,
  consecutiveSuccesses: 4,
  threshold: 10,
  lastFailure: null,
  openUntil: null
}
🔌 Acquiring client for query aaecfc48-8f25-420a-9882-22ddb145d000...
🔌 [Query 841239c2-034e-457c-a721-dd82a1edcb8a] Before query execution: {
  state: 'closed',
  failures: 0,
  consecutiveSuccesses: 4,
  threshold: 10,
  lastFailure: null,
  openUntil: null
}
🔌 Acquiring client for query 841239c2-034e-457c-a721-dd82a1edcb8a...
✅ Client acquired for query 873eb12f-1852-417c-9b16-3b1da81ba989 in 2ms
🔍 Query 873eb12f-1852-417c-9b16-3b1da81ba989:
      SELECT
        'supplier' as entity_type,
        'supplier_added' as act...
✅ Client acquired for query aaecfc48-8f25-420a-9882-22ddb145d000 in 2ms
🔍 Query aaecfc48-8f25-420a-9882-22ddb145d000:
      SELECT
        'inventory' as entity_type,
        'inventory_update' as ...
✅ Client acquired for query 841239c2-034e-457c-a721-dd82a1edcb8a in 2ms
🔍 Query 841239c2-034e-457c-a721-dd82a1edcb8a:
      SELECT
        'inventory' as entity_type,
        'item_added' as activi...
✅ Query aaecfc48-8f25-420a-9882-22ddb145d000 completed in 151ms, rows: 10
📈 Consecutive successes: 5/10
⏳ Circuit breaker reset pending: 5/10 consecutive successes
🔓 Client released for query aaecfc48-8f25-420a-9882-22ddb145d000 (destroyed: false)
✅ Query 873eb12f-1852-417c-9b16-3b1da81ba989 completed in 153ms, rows: 7
📈 Consecutive successes: 6/10
⏳ Circuit breaker reset pending: 6/10 consecutive successes
🔓 Client released for query 873eb12f-1852-417c-9b16-3b1da81ba989 (destroyed: false)
✅ Query 841239c2-034e-457c-a721-dd82a1edcb8a completed in 153ms, rows: 5
📈 Consecutive successes: 7/10
⏳ Circuit breaker reset pending: 7/10 consecutive successes
🔓 Client released for query 841239c2-034e-457c-a721-dd82a1edcb8a (destroyed: false)
📊 Retrieved 6 recent activities
 GET /api/activities/recent?limit=6 200 in 315ms
🔌 [Query 4420cdb6-506a-455c-af74-9f17001da116] Before query execution: {
  state: 'closed',
  failures: 0,
  consecutiveSuccesses: 7,
  threshold: 10,
  lastFailure: null,
  openUntil: null
}
🔌 Acquiring client for query 4420cdb6-506a-455c-af74-9f17001da116...
✅ Client acquired for query 4420cdb6-506a-455c-af74-9f17001da116 in 0ms
🔍 Query 4420cdb6-506a-455c-af74-9f17001da116:
      SELECT
        job_id,
        job_type,
        status,
        total_p...
✅ Query 4420cdb6-506a-455c-af74-9f17001da116 completed in 306ms, rows: 20
📈 Consecutive successes: 8/10
⏳ Circuit breaker reset pending: 8/10 consecutive successes
🔓 Client released for query 4420cdb6-506a-455c-af74-9f17001da116 (destroyed: false)
 GET /api/category/ai-categorization/jobs?limit=20 200 in 438ms
🔌 [Query 9977b51f-a660-45f5-9f3c-588cf83a7b6c] Before query execution: {
  state: 'closed',
  failures: 0,
  consecutiveSuccesses: 8,
  threshold: 10,
  lastFailure: null,
  openUntil: null
}
🔌 Acquiring client for query 9977b51f-a660-45f5-9f3c-588cf83a7b6c...
✅ Client acquired for query 9977b51f-a660-45f5-9f3c-588cf83a7b6c in 1ms
🔍 Query 9977b51f-a660-45f5-9f3c-588cf83a7b6c:
      SELECT
        job_id,
        job_type,
        status,
        total_p...
✅ Query 9977b51f-a660-45f5-9f3c-588cf83a7b6c completed in 312ms, rows: 20
📈 Consecutive successes: 9/10
⏳ Circuit breaker reset pending: 9/10 consecutive successes
🔓 Client released for query 9977b51f-a660-45f5-9f3c-588cf83a7b6c (destroyed: false)
 GET /api/category/ai-categorization/jobs?limit=20 200 in 591ms
 ○ Compiling /api/suppliers ...
 ✓ Compiled /api/suppliers in 910ms (489 modules)
🛡️ Setting up database cleanup handlers...
🧹 Removing 1 existing SIGTERM listeners
🧹 Removing 1 existing SIGINT listeners
🧹 Removing 1 existing exit listeners
✅ Cleanup handlers registered successfully
🚀 Unified database connection updated with enterprise manager
🔌 Initializing Enterprise Connection Pool with config: {
  host: 'postgresql://neondb_owner:npg_84ELeCFbOcGA@ep-stee...',
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 120000,
  ssl: true
}
🔄 Cleanup handlers already registered, skipping...
🔌 [Query 2d8e956b-345b-4b5d-b581-2a9961ce78f7] Before query execution: {
  state: 'closed',
  failures: 0,
  consecutiveSuccesses: 0,
  threshold: 10,
  lastFailure: null,
  openUntil: null
}
🔌 Acquiring client for query 2d8e956b-345b-4b5d-b581-2a9961ce78f7...
✅ New client connected to enterprise pool
✅ Client acquired for query 2d8e956b-345b-4b5d-b581-2a9961ce78f7 in 948ms
🔍 Query 2d8e956b-345b-4b5d-b581-2a9961ce78f7:
    SELECT
      supplier_id::text as id,
      name,
      code,
      active...
✅ Query 2d8e956b-345b-4b5d-b581-2a9961ce78f7 completed in 318ms, rows: 7
📈 Consecutive successes: 1/10
⏳ Circuit breaker reset pending: 1/10 consecutive successes
🔓 Client released for query 2d8e956b-345b-4b5d-b581-2a9961ce78f7 (destroyed: false)
 GET /api/suppliers?status=active%2Cpreferred&includeMetrics=true 200 in 2573ms
 ○ Compiling /api/inventory ...
 ✓ Compiled /api/inventory in 1573ms (573 modules)
🛡️ Setting up database cleanup handlers...
🧹 Removing 1 existing SIGTERM listeners
🧹 Removing 1 existing SIGINT listeners
🧹 Removing 1 existing exit listeners
✅ Cleanup handlers registered successfully
🚀 Unified database connection updated with enterprise manager
🔌 Initializing Enterprise Connection Pool with config: {
  host: 'postgresql://neondb_owner:npg_84ELeCFbOcGA@ep-stee...',
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 120000,
  ssl: true
}
🔄 Cleanup handlers already registered, skipping...
🔌 [Query 8d3e2763-87d3-41bf-92f6-4a19129b18c8] Before query execution: {
  state: 'closed',
  failures: 0,
  consecutiveSuccesses: 0,
  threshold: 10,
  lastFailure: null,
  openUntil: null
}
🔌 Acquiring client for query 8d3e2763-87d3-41bf-92f6-4a19129b18c8...
🔌 [Query eaba24a0-0e6b-49c7-8dfe-22a79725d9f2] Before query execution: {
  state: 'closed',
  failures: 0,
  consecutiveSuccesses: 0,
  threshold: 10,
  lastFailure: null,
  openUntil: null
}
🔌 Acquiring client for query eaba24a0-0e6b-49c7-8dfe-22a79725d9f2...
🔌 [Query 5d66d4e3-5946-401f-b118-4dfaa8459049] Before query execution: {
  state: 'closed',
  failures: 0,
  consecutiveSuccesses: 0,
  threshold: 10,
  lastFailure: null,
  openUntil: null
}
🔌 Acquiring client for query 5d66d4e3-5946-401f-b118-4dfaa8459049...
🔌 [Query f0658fc6-961f-4e5e-b632-0a1213203f19] Before query execution: {
  state: 'closed',
  failures: 0,
  consecutiveSuccesses: 0,
  threshold: 10,
  lastFailure: null,
  openUntil: null
}
🔌 Acquiring client for query f0658fc6-961f-4e5e-b632-0a1213203f19...
🔌 [Query b4431ebd-98f5-41cf-89a4-c2eeeed60564] Before query execution: {
  state: 'closed',
  failures: 0,
  consecutiveSuccesses: 0,
  threshold: 10,
  lastFailure: null,
  openUntil: null
}
🔌 Acquiring client for query b4431ebd-98f5-41cf-89a4-c2eeeed60564...
✅ New client connected to enterprise pool
✅ Client acquired for query 5d66d4e3-5946-401f-b118-4dfaa8459049 in 1422ms
🔍 Query 5d66d4e3-5946-401f-b118-4dfaa8459049:
      SELECT
        'inventory' as entity_type,
        'item_added' as activi...
✅ New client connected to enterprise pool
✅ Client acquired for query 8d3e2763-87d3-41bf-92f6-4a19129b18c8 in 1431ms
🔍 Query 8d3e2763-87d3-41bf-92f6-4a19129b18c8:
      SELECT
        'supplier' as entity_type,
        'supplier_added' as act...
✅ New client connected to enterprise pool
✅ Client acquired for query f0658fc6-961f-4e5e-b632-0a1213203f19 in 1289ms
🔍 Query f0658fc6-961f-4e5e-b632-0a1213203f19:
      SELECT
        i.*,
        s.name as supplier_name,
        s.email as s...
✅ New client connected to enterprise pool
✅ Client acquired for query b4431ebd-98f5-41cf-89a4-c2eeeed60564 in 940ms
🔍 Query b4431ebd-98f5-41cf-89a4-c2eeeed60564:
      SELECT
        job_id,
        job_type,
        status,
        total_p...
✅ New client connected to enterprise pool
✅ Client acquired for query eaba24a0-0e6b-49c7-8dfe-22a79725d9f2 in 1434ms
🔍 Query eaba24a0-0e6b-49c7-8dfe-22a79725d9f2:
      SELECT
        'inventory' as entity_type,
        'inventory_update' as ...
✅ Query 8d3e2763-87d3-41bf-92f6-4a19129b18c8 completed in 305ms, rows: 7
📈 Consecutive successes: 1/10
⏳ Circuit breaker reset pending: 1/10 consecutive successes
🔓 Client released for query 8d3e2763-87d3-41bf-92f6-4a19129b18c8 (destroyed: false)
✅ Query 5d66d4e3-5946-401f-b118-4dfaa8459049 completed in 310ms, rows: 5
📈 Consecutive successes: 2/10
⏳ Circuit breaker reset pending: 2/10 consecutive successes
🔓 Client released for query 5d66d4e3-5946-401f-b118-4dfaa8459049 (destroyed: false)
✅ Query b4431ebd-98f5-41cf-89a4-c2eeeed60564 completed in 457ms, rows: 20
📈 Consecutive successes: 3/10
⏳ Circuit breaker reset pending: 3/10 consecutive successes
🔓 Client released for query b4431ebd-98f5-41cf-89a4-c2eeeed60564 (destroyed: false)
 GET /api/category/ai-categorization/jobs?limit=20 200 in 3385ms
✅ Query f0658fc6-961f-4e5e-b632-0a1213203f19 completed in 465ms, rows: 50
📈 Consecutive successes: 4/10
⏳ Circuit breaker reset pending: 4/10 consecutive successes
🔓 Client released for query f0658fc6-961f-4e5e-b632-0a1213203f19 (destroyed: false)
🔌 [Query 0741c6cd-41d6-4292-8790-0642d1d41760] Before query execution: {
  state: 'closed',
  failures: 0,
  consecutiveSuccesses: 4,
  threshold: 10,
  lastFailure: null,
  openUntil: null
}
🔌 Acquiring client for query 0741c6cd-41d6-4292-8790-0642d1d41760...
✅ Client acquired for query 0741c6cd-41d6-4292-8790-0642d1d41760 in 0ms
🔍 Query 0741c6cd-41d6-4292-8790-0642d1d41760:
      SELECT COUNT(*) as total
      FROM public.inventory_items i
      LEFT J...
✅ Query eaba24a0-0e6b-49c7-8dfe-22a79725d9f2 completed in 463ms, rows: 10
📈 Consecutive successes: 5/10
⏳ Circuit breaker reset pending: 5/10 consecutive successes
🔓 Client released for query eaba24a0-0e6b-49c7-8dfe-22a79725d9f2 (destroyed: false)
📊 Retrieved 6 recent activities
 GET /api/activities/recent?limit=6 200 in 3205ms
✅ Query 0741c6cd-41d6-4292-8790-0642d1d41760 completed in 153ms, rows: 1
📈 Consecutive successes: 6/10
⏳ Circuit breaker reset pending: 6/10 consecutive successes
🔓 Client released for query 0741c6cd-41d6-4292-8790-0642d1d41760 (destroyed: false)
 GET /api/inventory?includeAlerts=true&includeMetrics=true 200 in 3973ms
🔌 [Query 667dca5f-7144-46fb-aae6-d510ef093e60] Before query execution: {
  state: 'closed',
  failures: 0,
  consecutiveSuccesses: 6,
  threshold: 10,
  lastFailure: null,
  openUntil: null
}
🔌 Acquiring client for query 667dca5f-7144-46fb-aae6-d510ef093e60...
✅ Client acquired for query 667dca5f-7144-46fb-aae6-d510ef093e60 in 0ms
🔍 Query 667dca5f-7144-46fb-aae6-d510ef093e60:
      SELECT
        job_id,
        job_type,
        status,
        total_p...
✅ Query 667dca5f-7144-46fb-aae6-d510ef093e60 completed in 305ms, rows: 20
📈 Consecutive successes: 7/10
⏳ Circuit breaker reset pending: 7/10 consecutive successes
🔓 Client released for query 667dca5f-7144-46fb-aae6-d510ef093e60 (destroyed: false)
 GET /api/category/ai-categorization/jobs?limit=20 200 in 389ms
🔌 [Query a0c98586-e397-4af6-8106-4ddd8a7a7c02] Before query execution: {
  state: 'closed',
  failures: 0,
  consecutiveSuccesses: 7,
  threshold: 10,
  lastFailure: null,
  openUntil: null
}
🔌 Acquiring client for query a0c98586-e397-4af6-8106-4ddd8a7a7c02...
✅ Client acquired for query a0c98586-e397-4af6-8106-4ddd8a7a7c02 in 1ms
🔍 Query a0c98586-e397-4af6-8106-4ddd8a7a7c02:
      SELECT
        job_id,
        job_type,
        status,
        total_p...
✅ Query a0c98586-e397-4af6-8106-4ddd8a7a7c02 completed in 304ms, rows: 20
📈 Consecutive successes: 8/10
⏳ Circuit breaker reset pending: 8/10 consecutive successes
🔓 Client released for query a0c98586-e397-4af6-8106-4ddd8a7a7c02 (destroyed: false)
 GET /api/category/ai-categorization/jobs?limit=20 200 in 425ms
🔌 [Query a167746c-06c0-4aad-aaa3-ac13c7e78be0] Before query execution: {
  state: 'closed',
  failures: 0,
  consecutiveSuccesses: 8,
  threshold: 10,
  lastFailure: null,
  openUntil: null
}
🔌 Acquiring client for query a167746c-06c0-4aad-aaa3-ac13c7e78be0...
✅ Client acquired for query a167746c-06c0-4aad-aaa3-ac13c7e78be0 in 1ms
🔍 Query a167746c-06c0-4aad-aaa3-ac13c7e78be0:
      SELECT
        job_id,
        job_type,
        status,
        total_p...
✅ Query a167746c-06c0-4aad-aaa3-ac13c7e78be0 completed in 304ms, rows: 20
📈 Consecutive successes: 9/10
⏳ Circuit breaker reset pending: 9/10 consecutive successes
🔓 Client released for query a167746c-06c0-4aad-aaa3-ac13c7e78be0 (destroyed: false)
 GET /api/category/ai-categorization/jobs?limit=20 200 in 396ms
🔌 [Query 7a9d5798-a503-476d-9208-c365cf446115] Before query execution: {