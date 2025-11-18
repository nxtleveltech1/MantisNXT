# Patch Guide

Use this checklist to wire the rules engine, VAT logic, and UI affordances into MantisNXT. The file paths below refer to the current repo layout.

---

## 1. Server – `src/app/api/spp/agent/route.ts`
1. **Load supplier rules during `upload_and_validate`:**
   - After persisting the upload session but before heuristics/AI mapping, call `getSupplierRules(supplierId, 'pricelist_upload')`.
   - When a rule has `join_sheets` or `sheet_loop`, run `applyPricelistRulesToExcel(buffer, ruleConfig)`; if rows are returned, skip heuristic extraction.
2. **Normalize prices and VAT:**
   - Introduce `normalizePriceAndVat(row, vatPolicy)` that prefers EX VAT columns, derives EX VAT from gross when needed, and stores `cost_price_ex_vat`, `price_incl_vat`, and `vat_rate`.
   - Persist those fields to `spp.pricelist_row` (add columns if missing) and mirror them in `attrs_json`.
3. **Stock on order + warnings:**
   - Parse `stock_on_order` headers via the mapping schema.
   - Emit warning level diagnostics instead of blocking validation when stock/category/VAT are missing unless the rule marks them `hard_requirements`.
4. **Audit trail:**
   - Record each rule execution + derived VAT info in `public.ai_agent_audit` for the SSE timeline.

## 2. Rules engine – `src/lib/supplier-rules-engine.ts`
1. **Enhance `join_sheets`:** respect `drop_right`, ensure sheet names are matched case-insensitively, and log when a join fails to produce matches.
2. **Implement `sheet_loop`:** iterate matching tabs, apply `column_aliases`, capture section headers as categories, and emit brand from sheet names.
3. **Support `vat_policy`, `hard_requirements`, `warnings`:** expose these to the agent route so validation knows what is blocking.
4. **Return structured diagnostics:** each emitted row should include metadata such as `brand_source`, `price_source`, and `rule_name`.

## 3. Async re-run – `src/app/api/process/rerun/route.ts`
- Ensure the queued job passes `{ use_rules_engine: true }` and copies any uploaded buffer needed for `join_sheets`.
- Update worker logging to include `rule_execution_id` so UI timelines stay in sync.

## 4. Schema + migrations
- Add columns to `spp.pricelist_row`: `cost_price_ex_vat`, `price_incl_vat`, `vat_rate`, `stock_on_order`.
- Create `supplier_pricelist_mappings` table for learned header mappings (supplier_id, header_signature hash, field_mappings JSONB, approvals).

## 5. UI – `src/components/supplier-portfolio/EnhancedPricelistUpload.tsx`
1. **Upload wizard:**
   - Keep upload ID, supplier name, and AI badge visible through Validate/Review.
   - Add an “Apply active supplier rules” button that POSTs `{ action: 'apply_rules_and_validate', upload_id }`.
   - Stream `/api/spp/events?upload_id=...` until a completion event arrives; render each audit entry with timestamp + rule name.
2. **Mapping screen:**
   - Display heuristic vs AI column mapping suggestions with confidence bars.
   - Clearly show when a saved supplier mapping or rule satisfied a required field (links to `supplier_rule_executions`).
3. **Review screen:**
   - Surface totals, valid/invalid counts, first 10 blocking errors, plus warning badges for missing category/SOH/SOO/VAT.
   - Show `price_source` (“EX VAT”, “INCL→EX”, “Missing”) and `vat_rate` for sampled rows to reassure users.

## 6. Rule builder UI
- Extend the existing rules panel to load templates from `/DevKit_MantisNXT_SupplierRules/RULE_TEMPLATES`.
- Provide JSON editors with validation hints (`RULES_DSL.md` schema).

Following this checklist ensures uploads run rules-first, VAT math becomes explicit, and the wizard finally reflects the AI/rule activity end users expect.
