# Tags Management System - Implementation Plan

## Overview
Build a complete Tags management system that mirrors the Categories management system, including:
- Database schema for AI tagging tracking
- Batch processing with job management
- API routes for tagging operations
- UI pages for tag management
- Review/views system with pending_review status

## Architecture Mirror

### Categories System → Tags System Mapping

| Categories | Tags |
|------------|------|
| `core.category` | `core.ai_tag_library` (exists) |
| `core.supplier_product.ai_categorization_status` | `core.supplier_product.ai_tagging_status` (to create) |
| `core.ai_categorization_job` | `core.ai_tagging_job` (to create) |
| `core.ai_categorization_progress` | `core.ai_tagging_progress` (to create) |
| `JobManager` | `TagJobManager` (to create) |
| `CategorizationEngine` | `TaggingEngine` (to create) |
| `ProgressTracker` | `TagProgressTracker` (to create) |
| `/api/category/ai-categorization/*` | `/api/tag/ai-tagging/*` (to create) |
| `src/app/catalog/categories/(cmm)/ai-categorization/` | `src/app/catalog/tags/(cmm)/ai-tagging/` (to create) |

## Implementation Steps

### Phase 1: Database Schema (Neon MCP)
1. Create migration: `0035_ai_tagging_tracking.sql`
   - Add `ai_tagging_status` column to `core.supplier_product`
   - Create `core.ai_tagging_job` table
   - Create `core.ai_tagging_progress` table
   - Add indexes and constraints
   - Create helper functions

### Phase 2: Backend Services
2. Create `src/lib/cmm/ai-tagging/types.ts` (mirror `ai-categorization/types.ts`)
3. Create `src/lib/cmm/ai-tagging/TagProgressTracker.ts` (mirror `ProgressTracker.ts`)
4. Create `src/lib/cmm/ai-tagging/TaggingEngine.ts` (mirror `CategorizationEngine.ts`)
5. Create `src/lib/cmm/ai-tagging/TagJobManager.ts` (mirror `JobManager.ts`)
6. Create `src/lib/cmm/ai-tagging/index.ts` (export singleton instances)

### Phase 3: API Routes
7. Create `/api/tag/ai-tagging/jobs/route.ts`
8. Create `/api/tag/ai-tagging/start/route.ts`
9. Create `/api/tag/ai-tagging/status/[jobId]/route.ts`
10. Create `/api/tag/ai-tagging/products/route.ts`
11. Create `/api/tag/ai-tagging/stats/route.ts`
12. Create `/api/tag/ai-tagging/proposals/route.ts`
13. Create `/api/tag/ai-tagging/pause/[jobId]/route.ts`
14. Create `/api/tag/ai-tagging/resume/[jobId]/route.ts`
15. Create `/api/tag/ai-tagging/cancel/[jobId]/route.ts`

### Phase 4: UI Components
16. Create `src/components/catalog/ai-tagging/JobControlPanel.tsx`
17. Create `src/components/catalog/ai-tagging/ProgressMonitor.tsx`
18. Create `src/components/catalog/ai-tagging/ProductsTable.tsx`
19. Create `src/components/catalog/ai-tagging/StatisticsPanel.tsx`
20. Create `src/components/catalog/ai-tagging/ProposedTagsPanel.tsx`

### Phase 5: UI Pages
21. Create `src/app/catalog/tags/(cmm)/ai-tagging/page.tsx`

### Phase 6: Testing & Verification
22. Test with Chrome DevTools
23. Verify with Neon MCP
24. Run lint and type-check
25. Test end-to-end workflow

## Status Tracking

- [ ] Phase 1: Database Schema
- [ ] Phase 2: Backend Services
- [ ] Phase 3: API Routes
- [ ] Phase 4: UI Components
- [ ] Phase 5: UI Pages
- [ ] Phase 6: Testing & Verification

