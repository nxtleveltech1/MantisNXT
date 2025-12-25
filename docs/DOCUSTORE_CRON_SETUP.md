# DocuStore Scheduled Tasks Setup

## Overview

DocuStore includes scheduled tasks for document expiration management and automated report generation. These tasks should be run via cron jobs or scheduled task runners.

## Scheduled Endpoints

### 1. Document Expiration Processing
**Endpoint:** `POST /api/v1/docustore/scheduled/expiration`

**Purpose:**
- Send expiration warnings (30, 14, 7, 1 days before expiration)
- Auto-archive expired documents

**Frequency:** Daily (recommended: 6:00 AM)

**Example Cron:**
```bash
0 6 * * * curl -X POST https://your-domain.com/api/v1/docustore/scheduled/expiration \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_API_KEY"
```

### 2. Scheduled Report Generation
**Endpoint:** `POST /api/v1/docustore/scheduled/reports`

**Purpose:**
- Generate daily reports (AR Aging, AP Aging)
- Generate weekly reports (Inventory, Logistics) - runs on Mondays
- Generate monthly reports (Balance Sheet, Income Statement, Tax Returns) - runs on 1st of month

**Frequency:** Daily (the endpoint handles daily/weekly/monthly logic internally)

**Example Cron:**
```bash
0 7 * * * curl -X POST https://your-domain.com/api/v1/docustore/scheduled/reports \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_API_KEY"
```

### 3. Run All Scheduled Tasks
**Endpoint:** `POST /api/v1/docustore/scheduled/run`

**Purpose:**
- Runs both expiration processing and report generation
- Convenient single endpoint for all scheduled tasks

**Frequency:** Daily (recommended: 6:00 AM)

**Example Cron:**
```bash
0 6 * * * curl -X POST https://your-domain.com/api/v1/docustore/scheduled/run \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_API_KEY"
```

## Vercel Cron Jobs

If using Vercel, add to `vercel.json`:

```json
{
  "crons": [
    {
      "path": "/api/v1/docustore/scheduled/run",
      "schedule": "0 6 * * *"
    }
  ]
}
```

## Environment Variables

Ensure these are set:
- `DEFAULT_ORG_ID` - Default organization ID (optional, will query DB if not set)
- `DOCUSTORE_STORAGE_PROVIDER` - Storage provider (filesystem, s3, r2, database)

## Security

**Important:** These endpoints should be protected with:
1. API key authentication (recommended)
2. IP whitelisting (if possible)
3. Internal network access only (if running on same infrastructure)

## Monitoring

Monitor these endpoints for:
- Success/failure rates
- Processing times
- Number of documents archived
- Number of reports generated

## Manual Execution

You can also trigger these manually for testing:

```bash
# Expiration processing
curl -X POST http://localhost:3000/api/v1/docustore/scheduled/expiration

# Report generation
curl -X POST http://localhost:3000/api/v1/docustore/scheduled/reports \
  -H "Content-Type: application/json" \
  -d '{"type": "daily"}'

# Run all tasks
curl -X POST http://localhost:3000/api/v1/docustore/scheduled/run
```

