# AI Tagging System Fixes

## Summary

This document describes the fixes and verification performed on the AI Tagging / AI Config system.

## Changes Verified

### Task 1: Postgres Schema for `core.ai_tag_proposal`

**Status**: ✅ Already Correct

The database schema was verified to be correct:

```sql
-- Verified via Neon MCP on project: proud-mud-50346856

-- Column org_id exists with correct configuration:
org_id UUID NOT NULL DEFAULT '00000000-0000-0000-0000-000000000000'

-- Unique constraint exists:
CREATE UNIQUE INDEX ai_tag_proposal_org_id_normalized_name_key 
  ON core.ai_tag_proposal USING btree (org_id, normalized_name)

-- Status index exists:
CREATE INDEX idx_ai_tag_proposal_status 
  ON core.ai_tag_proposal USING btree (status)
```

No migration needed - the schema matches the expected structure.

### Task 2: TaggingEngine Error Handling

**Status**: ✅ Already Implemented

Location: [`src/lib/cmm/ai-tagging/TaggingEngine.ts`](../src/lib/cmm/ai-tagging/TaggingEngine.ts:253-296)

The TaggingEngine already has robust error handling for proposal writes:

1. **try/catch around `recordProposedTagForProduct`** (lines 253-296)
2. **Structured error logging** with job_id, product_id, provider, model, and DB error (lines 268-278)
3. **Status update for failed products** via `updateProductTaggingStatus` (lines 281-293)
4. **Continues processing** other products after an error (doesn't crash the batch)

### Task 3: JSON Parse Error on /admin/ai/config

**Status**: ✅ Already Fixed

Location: [`src/components/ai/admin/UnifiedServicePanel.tsx`](../src/components/ai/admin/UnifiedServicePanel.tsx)

The `UnifiedServicePanel` component already has proper error handling in mutation handlers with try/catch blocks that prevent JSON parse crashes.

### Task 4: Unified DB Connection

**Status**: ✅ Already Correct for Core Tagging Path

The core AI tagging modules use the unified connection:

| File | Import |
|------|--------|
| [`TaggingEngine.ts`](../src/lib/cmm/ai-tagging/TaggingEngine.ts:7) | `import { query as dbQuery } from '@/lib/database/unified-connection';` |
| [`proposed-tags/service.ts`](../src/lib/cmm/proposed-tags/service.ts:3) | `import { query } from '@/lib/database/unified-connection';` |
| [`proposed-tags/repository.ts`](../src/lib/cmm/proposed-tags/repository.ts:1) | `import { query } from '@/lib/database/unified-connection';` |

### Task 5: AI Service Config Validation

**Status**: ✅ Verified

Location: [`src/lib/ai/services/AIServiceConfigService.ts`](../src/lib/ai/services/AIServiceConfigService.ts:479-535)

The `testConnection` method (lines 479-535) provides:
- Config lookup by ID
- Latency measurement
- Provider/model testing with a simple prompt
- Success/failure response with error details

### Task 6: Legacy Proposals Missing `tag_proposal_id`

**Status**: ✅ Fixed via `database/migrations/0039_fix_schema_migrations_duration_ms.sql`

Older databases only exposed a `proposal_id` column for `core.ai_tag_proposal`, which caused
the TaggingEngine to fail with errors such as `column "tag_proposal_id" does not exist`.
 Migration **0039** now:
 
 - Adds `tag_proposal_id` with defaults and a `NOT NULL` constraint
 - Backfills every record from the legacy `proposal_id` (or generates UUIDs where missing)
 - Adds a trigger to keep `proposal_id` and `tag_proposal_id` synchronized for legacy callers

Run the verification helper to apply the fix locally:

```bash
bun tsx scripts/fix-ai-tagging-schema.ts
```

The script checks both `core.ai_tag_proposal` and `core.ai_tag_proposal_product` and will
apply the migration automatically when the new columns are missing.

---

## Verification Steps

### Run an AI Tagging Job

1. Navigate to the AI Tagging section in the admin UI
2. Create or select a tagging job
3. Start the job and observe:
   - Job creation in database
   - TaggingEngine calling configured provider
   - Proposals created in `core.ai_tag_proposal`
   - Product links in `core.ai_tag_proposal_product`

### Verify DB Records

```sql
-- Check proposals
SELECT tag_proposal_id, org_id, normalized_name, display_name, status, suggestion_count
FROM core.ai_tag_proposal
ORDER BY created_at DESC
LIMIT 10;

-- Check product links
SELECT ptp.tag_proposal_id, ptp.supplier_product_id, ptp.ai_confidence, ptp.status
FROM core.ai_tag_proposal_product ptp
ORDER BY ptp.created_at DESC
LIMIT 10;
```

### Test AI Config Page

1. Navigate to `/admin/ai/config`
2. Page should load without console errors
3. Click "Test" on any AI service config
4. Verify no JSON parse errors occur
5. Success/failure message should display properly

---

## Architecture Overview

```
┌──────────────────────────────────────────────────────────────┐
│                     AI Tagging Flow                          │
├──────────────────────────────────────────────────────────────┤
│                                                              │
│  TaggingEngine.tagBatch()                                    │
│       │                                                      │
│       ├── suggestTagsBatch() → AI Provider (OpenAI, etc.)    │
│       │                                                      │
│       └── processProduct()                                   │
│              │                                               │
│              ├── recordProposedTagForProduct()               │
│              │       │                                       │
│              │       ├── upsertProposedTag() → DB            │
│              │       │   (core.ai_tag_proposal)              │
│              │       │                                       │
│              │       └── linkProposedTagToProduct() → DB     │
│              │           (core.ai_tag_proposal_product)      │
│              │                                               │
│              └── updateProductTaggingStatus()                │
│                      │                                       │
│                      └── core.supplier_product               │
│                                                              │
└──────────────────────────────────────────────────────────────┘
```

---

## Key Files

| Purpose | File Path |
|---------|-----------|
| Tagging Engine | `src/lib/cmm/ai-tagging/TaggingEngine.ts` |
| Proposal Service | `src/lib/cmm/proposed-tags/service.ts` |
| Proposal Repository | `src/lib/cmm/proposed-tags/repository.ts` |
| AI Config Service | `src/lib/ai/services/AIServiceConfigService.ts` |
| Admin UI Panel | `src/components/ai/admin/UnifiedServicePanel.tsx` |
| Unified DB Connection | `src/lib/database/unified-connection.ts` |

---

## Database Tables

| Table | Purpose |
|-------|---------|
| `core.ai_tag_proposal` | Stores proposed tags with org_id, normalized_name, confidence, provider |
| `core.ai_tag_proposal_product` | Links proposals to products |
| `core.ai_tag_library` | Approved tags library |
| `core.ai_tag_assignment` | Assigned tags to products |
| `core.supplier_product` | Product records with tagging status |

---

## Troubleshooting

### "column org_id does not exist" Error

This error should not occur as the schema is correct. If it does:

1. Verify you're connected to the correct database (proud-mud-50346856)
2. Check if the migration `database/migrations/0036_ai_tag_proposals.sql` was applied
3. Run schema inspection via Neon MCP to verify columns

### JSON Parse Error on Test Button

If this occurs:

1. Check browser network tab for the actual response
2. Verify the test endpoint returns JSON with `{ ok: boolean, message: string }`
3. Check for empty response bodies

### Tagging Job Failures

1. Check logs for structured error output with job_id and product_id
2. Verify AI provider configuration (API key, model, endpoint)
3. Check product status in `core.supplier_product.ai_tagging_status`
