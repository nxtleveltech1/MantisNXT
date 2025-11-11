# Categories Module - Quick Reference

## Key Files

### Frontend
- `src/app/catalog/categories/(cmm)/tags/page.tsx` - Tag management UI (503 lines) ✅
- `src/app/catalog/categories/(cmm)/analytics/page.tsx` - Analytics UI (474 lines) ✅
- `src/app/catalog/categories/(cmm)/categories/page.tsx` - Category management (212 lines) ✅
- `src/app/catalog/categories/(cmm)/conflicts/page.tsx` - **STUB** ❌

### Backend Services
- `src/lib/cmm/tag-service-core.ts` - Core tag operations (300+ lines) ✅
- `src/lib/cmm/db-sql.ts` - Legacy operations ✅
- `src/lib/cmm/db.ts` - Schema detection ✅

### API Endpoints
- `src/app/api/tags/*` - Tag CRUD & assignment ✅
- `src/app/api/tags/analytics` - Analytics data ✅
- `src/app/api/tags/rules/*` - Rule management ✅

---

## Working Features ✅

### Tags
- [x] Create tags (custom, seasonal, stock)
- [x] List tags with product counts
- [x] Manual tag assignment
- [x] Keyword rules creation
- [x] Apply rules (both schemas)
- [x] Predictive tagging (core schema only)

### Analytics
- [x] Tag performance charts
- [x] Seasonality analysis
- [x] Category breakdown pie chart
- [x] Detailed metrics table
- [x] Both schema modes supported
- [x] Demo mode fallback

---

## Critical Issues 🔴

1. **Predictive-Assign Broken (Legacy)**
   - Type mismatch in `src/app/api/tags/predictive-assign/route.ts` (lines 40-45)
   - Missing properties: supplierId, stockType, attributes, updatedAt
   - Status: TS errors prevent compilation

2. **Conflicts Page Empty**
   - File: `src/app/catalog/categories/(cmm)/conflicts/page.tsx`
   - Just a wrapper component
   - No conflict detection/resolution UI

3. **Analytics Not Linked to Sales**
   - Core schema has no sales transaction data
   - Only price estimates available
   - Margin data unavailable in core mode

4. **Tag Update/Delete Missing**
   - Frontend has no edit/delete buttons
   - Backend has no update/delete endpoints

---

## Database Schema

### Core (Production)
```
core.ai_tag_library       - Tag definitions
core.ai_tag_assignment    - Product tag mappings
core.ai_tag_rule          - Automation rules
core.price_history        - Price tracking
core.supplier_product     - Product data
```

### Legacy (Deprecated)
```
public.tags               - Tag definitions
public.tag_assignments    - Product tag mappings
public.sales_analytics    - Historical sales
```

---

## Testing Checklist

- [ ] GET /api/tags (core) ✅
- [ ] GET /api/tags (legacy) ✅
- [ ] POST /api/tags (create) ✅
- [ ] POST /api/tags/assign (core) ✅
- [ ] POST /api/tags/assign (legacy) ⚠️
- [ ] POST /api/tags/predictive-assign (core) ✅
- [ ] POST /api/tags/predictive-assign (legacy) ❌
- [ ] GET /api/tags/analytics ✅
- [ ] POST /api/tags/rules/apply ✅

---

## Next Steps Priority

1. Fix predictive-assign type errors (blocker)
2. Implement tag update/delete
3. Build Conflicts resolution page
4. Connect analytics to sales data
5. Add bulk operations
6. Implement audit trail

---

## Schema Detection
- **Core**: Has `core.supplier_product` + `core.category` + `core.ai_categorization_job`
- **Legacy**: Has `products` + `categories` + `tags`
- **None**: Demo mode with hardcoded data
- Cache TTL: 5 minutes (configurable in `src/lib/cmm/db.ts`)

---

## Key Functions

### Tag Service (Core)
```typescript
listCoreTags()                    // All tags with counts
createCoreTag(name, type)         // Create tag
assignCoreTag(productId, tagId)   // Assign to product
listCoreTagRules()                // Rules with tag names
createCoreTagRule(keyword, tagId) // Create rule
applyCoreTagRules()               // Run all rules
predictiveAssignCoreTags()        // Predictive tagging
```

### Legacy Database
```typescript
listTags()                        // Get all tags
addTag(name, type)                // Create tag
assignTag(sku, tagId)             // Assign to product
listRules()                       // Get rules
addRuleKeyword(keyword, tagId)    // Create rule
```

---

## Debug Commands

```bash
# Check schema mode
curl http://localhost:3000/api/categories

# List tags
curl http://localhost:3000/api/tags

# Get analytics
curl http://localhost:3000/api/tags/analytics?tag=all

# List rules
curl http://localhost:3000/api/tags/rules

# Apply rules
curl -X POST http://localhost:3000/api/tags/rules/apply

# Predictive assign
curl -X POST http://localhost:3000/api/tags/predictive-assign
```

---

## Files to Review
1. Priority: `src/app/api/tags/predictive-assign/route.ts` (broken)
2. Priority: `src/app/catalog/categories/(cmm)/conflicts/page.tsx` (stub)
3. Reference: `src/lib/cmm/tag-service-core.ts` (core logic)
4. Reference: `src/lib/cmm/db.ts` (schema detection)
5. Reference: `src/app/api/tags/analytics/route.ts` (analytics logic)

---

**Last Updated**: Nov 10, 2024
**Status**: 60-70% Complete
**Blocking Issue**: Predictive-assign TypeScript errors
