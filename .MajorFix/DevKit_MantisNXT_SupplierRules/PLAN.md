# Implementation Plan – Agent + Rules + VAT Intelligence

## Objectives
1. Execute supplier rules during the immediate upload flow so deterministic transformations run before heuristics or AI.
2. Normalize cost price (EX VAT) and VAT rate for every accepted row, deriving EX VAT from gross prices when needed.
3. Handle messy, multi‑tab workbooks (Decksaver paired lists, 32 brand tabs, ad‑hoc section headers) without assumptions.
4. Treat missing/ambiguous fields as warnings unless explicitly required; block only when SKU, description, or cost cannot be trusted.
5. Persist knowledge per supplier (rules + column aliases) so the system “learns” across uploads.

## Server work

### A. Rule‑aware immediate uploads
- **File:** `src/app/api/spp/agent/route.ts`
- On `action=upload_and_validate`, load `public.supplier_rules` (via `getSupplierRules`) before reading headers.
- If `join_sheets` or `sheet_loop` rules exist, run `applyPricelistRulesToExcel` on the uploaded buffer first; only fall back to heuristics/AI when rules return zero rows.
- Always log executions to `public.supplier_rule_executions` for audit + learning loops.

### B. VAT + price normalization
- Add `normalizePriceAndVat(row, vatPolicy)` helper inside the agent route.
- Preferred order: explicit EX VAT column → explicit VAT% column → derive from INCL price using supplier/profile VAT rate (default 0.15) → null with warning.
- Persist `cost_price_ex_vat`, `price_incl_vat`, and `vat_rate` on the staging row (`spp.pricelist_row`) and mirror them inside `attrs_json` for downstream consumers.

### C. Sheet loop + DSL extensions
- **File:** `src/lib/supplier-rules-engine.ts`
- Extend the DSL to include:
  - `sheet_loop`: iterate matching tabs, derive brand from tab name, apply `column_aliases`, emit canonical rows.
  - `column_aliases`: per supplier header hints for SKU, description, prices, stock.
  - `vat_policy`: `{ rate, mode: "ex"|"inc"|"detect", detect_keywords, ratio_tolerance }`.
  - `hard_requirements` & `warnings`: describe which canonical fields are blocking vs informational.
- Ensure `drop_right` truly removes columns in join transforms.

### D. Validation policy
- Required (blocking): `supplier_sku`, `name`, usable `cost_price_ex_vat`.
- Warnings (per supplier override): `category_raw`, `stock_on_hand`, `stock_on_order`, `vat_rate`.
- Surface row‑level diagnostics with `row_num`, `field`, `reason`, and `proposed_fix`.

### E. Persist mapping “memory”
- Add `supplier_pricelist_mappings` (supplier_id, header_signature, field_mappings, approved_by, approved_at).
- When a user confirms mappings, store them; before calling AI, attempt to reuse any mapping whose header signature matches.
- Feed these aliases into the sheet loop rules for future uploads.

### F. Async re‑run (unchanged)
- `/api/process/rerun` should continue to enqueue the worker with `{ use_rules_engine: true }`.
- Agent UI’s “Apply Active Rules” button simply triggers this endpoint after the initial upload.

## UI work

1. **Enhanced upload wizard (`src/components/supplier-portfolio/EnhancedPricelistUpload.tsx`):**
   - Keep upload ID + AI badge visible during Validate/Review.
   - Expose an “Apply rules” control that invokes `action=apply_rules_and_validate`.
   - Show VAT source (`ex`, `inc→ex`, `missing`) alongside totals.
2. **Rules dialog:**
   - “Create Rule” flow posts JSON to `/api/supplier-rulesets`.
   - Pre‑load templates (Decksaver join, sheet loop, VAT policy) for quick editing.
3. **Mapping + validation UX:**
   - Display heuristic vs AI mapping suggestions with confidence.
   - Surface warnings (missing category/SOH/SOO) without blocking merge; highlight blocking errors inline.

## Definition of done
- Decksaver workbook runs through upload wizard with zero manual column mapping and produces Supplier/SKU/Name/Category/SOH/SOO/Cost/VAT rows.
- Multi‑tab suppliers processed via `sheet_loop`, deriving brand from tab names and defaulting VAT to supplier profile (0.15) when absent.
- Validation output shows row counts, first 10 blocking errors, and warnings per rule configuration.
- `supplier_rule_executions` and `ai_agent_audit` contain entries for every run, enabling future analytics.
