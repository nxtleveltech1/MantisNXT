# AI Category Management System

## Overview

A comprehensive AI-driven category management system that automatically categorizes products from your complete supply inventory portfolio using multiple AI providers with smart re-categorization logic, chunked background processing, and full resumability.

## Key Features

- **Smart Re-categorization**: Only re-categorizes when new AI confidence exceeds existing scores
- **Chunked Processing**: Processes large inventories in manageable batches (default 200 products)
- **Automatic Resumability**: Jobs can resume from last checkpoint after failures
- **Multi-Provider Support**: Works with OpenAI, Anthropic, and OpenAI-compatible providers
- **Real-time Progress**: Live progress monitoring with ETAs and performance metrics
- **Status Tracking**: Comprehensive tracking of categorization status for each product
- **Job Management**: Pause, resume, and cancel jobs at any time
- **Performance Optimization**: Dynamic batch sizing, parallel processing, rate limit handling

## Architecture

### Core Components

1. **JobManager** (`JobManager.ts`)
   - Orchestrates categorization jobs
   - Handles chunked processing with resumability
   - Manages job lifecycle (create, process, pause, resume, cancel)
   - Tracks progress and performance metrics

2. **CategorizationEngine** (`CategorizationEngine.ts`)
   - Implements smart re-categorization logic
   - Processes batches of products with AI
   - Applies results to database
   - Handles confidence comparison

3. **ProgressTracker** (`ProgressTracker.ts`)
   - Tracks real-time job progress
   - Manages batch-level metrics
   - Calculates ETAs and performance stats
   - Maintains progress history

### Database Schema

#### Tables

- **core.supplier_product** (extended)
  - `ai_categorization_status`: Current status (pending, processing, completed, failed, skipped)
  - `ai_confidence`: Confidence score (0-1) from AI
  - `ai_reasoning`: AI's reasoning for the categorization
  - `ai_provider`: Provider used (openai, anthropic, etc)
  - `ai_categorized_at`: Timestamp of last categorization
  - `previous_confidence`: Previous confidence before re-categorization

- **core.ai_categorization_job**: Job management
  - Tracks job lifecycle, progress, and configuration
  - Stores checkpoint for resumability (current_batch_offset)
  - Maintains performance metrics

- **core.ai_categorization_progress**: Batch-level tracking
  - Records individual batch execution details
  - Tracks tokens used, duration, success/failure counts
  - Enables granular progress monitoring

## Smart Re-categorization Logic

The system implements intelligent re-categorization rules:

1. **Product has NO category**: Always categorize if confidence >= threshold
2. **Product has category WITH ai_confidence**: Only re-categorize if new confidence > existing
3. **Product has category WITHOUT ai_confidence**: Re-categorize if new confidence >= threshold
4. **Force override mode**: Bypasses all rules, always re-categorizes

## API Endpoints

### Job Management

- `POST /api/category/ai-categorization/start` - Create and start a new job
- `GET /api/category/ai-categorization/status/:jobId` - Get detailed job status
- `POST /api/category/ai-categorization/pause/:jobId` - Pause a running job
- `POST /api/category/ai-categorization/resume/:jobId` - Resume a paused job
- `POST /api/category/ai-categorization/cancel/:jobId` - Cancel a job
- `GET /api/category/ai-categorization/jobs` - Get recent jobs

### Data Queries

- `GET /api/category/ai-categorization/products` - Query products with filters
- `GET /api/category/ai-categorization/stats` - Get overall statistics
- `POST /api/category/ai-categorization/recategorize` - Force re-categorization of specific products

## Dashboard

Access the full management dashboard at `/catalog/categories/7892`

### Features

- **Overview Tab**: Statistics, job control panel, active job monitoring
- **Jobs Tab**: Active and recent job history with controls
- **Products Tab**: Searchable, filterable table of all products
- **Settings Tab**: System configuration and policy documentation

## Usage

### Starting a Full Categorization Job

```typescript
const response = await fetch("/api/category/ai-categorization/start", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    job_type: "full_scan",
    filters: {
      exclude_categorized: true, // Skip already categorized products
      supplier_id: "optional-supplier-id"
    },
    config: {
      confidence_threshold: 0.7,
      force_recategorize: false,
      batch_delay_ms: 2000
    },
    batch_size: 200
  })
})

const { job_id, estimated_products } = await response.json()
```

### Monitoring Progress

```typescript
const response = await fetch(`/api/category/ai-categorization/status/${jobId}`)
const { job } = await response.json()

console.log(`Progress: ${job.progress_percentage}%`)
console.log(`ETA: ${job.eta_seconds} seconds`)
console.log(`Success rate: ${job.performance_metrics.success_rate}%`)
```

### Querying Categorized Products

```typescript
const response = await fetch(
  "/api/category/ai-categorization/products?status=completed&confidence_min=0.8&limit=50"
)
const { products, total } = await response.json()
```

## Programmatic Usage

```typescript
import { jobManager, categorizationEngine } from '@/lib/cmm/ai-categorization'

// Create a job
const jobId = await jobManager.createJob({
  job_type: 'full_scan',
  filters: { exclude_categorized: true },
  config: { confidence_threshold: 0.7 },
  batch_size: 200,
  created_by: 'system'
})

// Start processing (runs in background)
jobManager.processJob(jobId).catch(console.error)

// Get status
const status = await jobManager.getJobStatus(jobId)

// Pause/Resume
await jobManager.pauseJob(jobId)
await jobManager.resumeJob(jobId)
```

## Configuration

### AI Provider Setup

1. Navigate to **Admin → AI Services → Product Categories**
2. Configure your preferred provider(s):
   - OpenAI: Add API key, select model (e.g., gpt-4)
   - Anthropic: Add API key, select model (e.g., claude-3-sonnet)
   - OpenAI Compatible: Add base URL and API key
3. Enable the service
4. Set provider order preference

### Batch Configuration

- **Batch Size**: 50-500 products per batch (default: 200)
  - Smaller batches: More resilient, slower overall
  - Larger batches: Faster, but higher failure impact

- **Confidence Threshold**: 0.5-1.0 (default: 0.7)
  - Higher threshold: Only high-confidence categorizations
  - Lower threshold: More products categorized, potentially less accurate

- **Batch Delay**: 0-10000ms (default: 2000ms)
  - Helps respect rate limits
  - Reduces system load

## Performance Considerations

### Expected Performance

- **Throughput**: 2-5 products/second (depends on AI provider)
- **Success Rate**: 90-95% for typical product catalogs
- **Batch Duration**: 5-15 seconds per batch (200 products)
- **Memory Usage**: ~100-200MB per active job

### Optimization Tips

1. **Batch Size**: Start with 200, adjust based on provider rate limits
2. **Provider Selection**: Test different providers for your data
3. **Confidence Threshold**: Higher threshold = fewer but more accurate results
4. **Database Indexes**: Ensure indexes are created (automatic with migration)
5. **Concurrent Jobs**: Limit to 1-2 active jobs at a time

## Error Handling

### Automatic Retry

- Network errors: Retry with exponential backoff
- Timeout errors: Skip product, mark as failed
- Rate limit errors: Pause job, auto-resume after delay

### Manual Recovery

1. **Job stuck in 'running'**:
```sql
UPDATE core.ai_categorization_job 
SET status = 'paused' 
WHERE job_id = 'stuck-job-id';
```
Then resume via API

2. **High failure rate**:
   - Check AI service configuration
   - Verify product data quality
   - Review confidence threshold
   - Check provider API status

## Monitoring

### Key Metrics

- **Success Rate**: Should be >90%
- **Avg Confidence**: Should be >0.75
- **Batch Duration**: Should be <30s
- **Error Rate**: Should be <5%

### Logs

```bash
# Check job logs
tail -f logs/nextjs.log | grep 'JobManager'

# Check categorization engine logs
tail -f logs/nextjs.log | grep 'CategorizationEngine'
```

### Database Queries

```sql
-- Job performance summary
SELECT 
  job_type,
  COUNT(*) as total_jobs,
  AVG(successful_categorizations::float / NULLIF(total_products, 0)) as avg_success_rate,
  AVG(total_duration_ms) as avg_duration_ms
FROM core.ai_categorization_job
WHERE status = 'completed'
GROUP BY job_type;

-- Recent failures
SELECT 
  sp.supplier_sku,
  sp.name_from_supplier,
  sp.ai_reasoning
FROM core.supplier_product sp
WHERE sp.ai_categorization_status = 'failed'
ORDER BY sp.updated_at DESC
LIMIT 20;

-- Confidence distribution
SELECT 
  CASE 
    WHEN ai_confidence >= 0.8 THEN 'High'
    WHEN ai_confidence >= 0.6 THEN 'Medium'
    ELSE 'Low'
  END as confidence_level,
  COUNT(*) as count
FROM core.supplier_product
WHERE ai_confidence IS NOT NULL
GROUP BY confidence_level;
```

## Maintenance

### Cleanup Old Jobs

Progress records are automatically cleaned up after 30 days:

```sql
-- Manual cleanup if needed
DELETE FROM core.ai_categorization_progress
WHERE completed_at < NOW() - INTERVAL '30 days';
```

### Re-index Products

```sql
-- If queries become slow
REINDEX TABLE core.supplier_product;
VACUUM ANALYZE core.supplier_product;
```

## Troubleshooting

### Common Issues

1. **Jobs not starting**
   - Check AI service is enabled and has valid API key
   - Verify database connection
   - Check for existing running jobs (max 3)

2. **Low success rate**
   - Product data may be incomplete (missing names, descriptions)
   - Confidence threshold may be too high
   - AI provider may be having issues

3. **Slow performance**
   - Reduce batch size
   - Check network latency to AI provider
   - Verify database indexes exist
   - Check for concurrent jobs

4. **High memory usage**
   - Reduce batch size
   - Limit concurrent jobs
   - Check for memory leaks in logs

## Security Considerations

- AI API keys stored in secure configuration (never in code)
- Job execution requires appropriate permissions
- Rate limiting prevents abuse
- Error messages sanitized to prevent information leakage

## Future Enhancements

- [ ] Scheduled automatic categorization for new products
- [ ] A/B testing different AI providers
- [ ] Custom categorization rules/overrides
- [ ] Webhook notifications for job completion
- [ ] Export job reports to CSV/Excel
- [ ] Category suggestions with confidence intervals
- [ ] Multi-tenant isolation for org-level jobs

## Support

For issues or questions:
1. Check this README and testing guide
2. Review application logs
3. Check database for error details
4. Consult the testing guide: `docs/AI_CATEGORY_MANAGEMENT_TESTING.md`

