# Notes & Breakdown

These notes condense the entire investigation—from the messy supplier workbook analysis to the AI/rules architecture review and the resulting action plan. Share them with anyone onboarding to the project.

---

## 1. Supplier workbook reality check
- **File set:** 35 sheets; 7 completely empty (Sheet1–Sheet7); the rest are brand‑specific (ABLETON, AUDIENT, Decksaver Product List, IK Multimedia, PRESONUS, etc.).
- **Structure:** header noise (contact info, marketing copy), optional section headers (“DI BOXES”, “KEYBOARDS”), actual product tables, then footer notes (“SPECIAL ORDER”, “All prices shown INCL VAT”).
- **Headers:** imported as `Unnamed: 0/1` when read naively because the real labels live inside the rows.
- **Implication:** every extract must classify rows (metadata vs section header vs product) before mapping to SKU/Name/Price.

### Field by field snapshot
| Field | Availability | Guidance |
| --- | --- | --- |
| Supplier | Not a column; derive from sheet/tab name (clean underscores). |
| SKU | Usually first structured column; look for headers like CODE, sku, MODEL, ITEM. Treat alphanumeric tokens with few spaces as the code. |
| Product Name | DESCRIPTION / PRODUCT NAME columns, or the widest text column following the SKU. |
| Category | Section headers (“CABLE TESTER”) or explicit columns (Materials, Group). |
| Stock on Hand | Appears sporadically as STOCK, SOH, STOCK COUNT; default to null when absent. |
| Stock on Order | Rare—mainly “SPECIAL ORDER” text. Accept null; treat as warning, not failure. |
| Cost Price | Mix of NETT EXCL (dealer), Selling Incl., STREET Incl., “request”. Need per sheet rules. |
| VAT (15%) | Never a dedicated numeric column; must derive using 15/115 ratio or explicit VAT% column. |

## 2. Platform audit (what already exists)
1. **AI service layer:** `ai_service_config` table plus `AIServiceConfigService` to create/update/test providers (OpenAI, Anthropic, Azure). Supports rate limiting and provider fallback.
2. **Upload agent (`POST /api/spp/agent`):** handles multipart uploads, runs AI extraction (JSON rows), inserts into `spp.pricelist_row`, executes validation, and pushes audit events to `public.ai_agent_audit`.
3. **Event timeline:** `GET /api/spp/events?upload_id=…` streams SSE updates; `GET /api/spp/audit` provides history.
4. **Staging + merge:** `spp.pricelist_upload` + `spp.pricelist_row` hold raw rows; core tables track suppliers, supplier_product, price_history, stock_on_hand. VAT and stock_on_order columns are currently missing.
5. **Rules engine skeleton:** `supplier-rules-engine.ts` can already join Decksaver sheets, store rules in `public.supplier_rules`, and log executions.
6. **UI state:** enhanced upload wizard scaffolding exists (shows upload ID, AI badge, SSE timeline) but the “Apply rules” flow and rule builder dialog are unfinished.

## 3. Why validation keeps failing
- Headers rarely contain the words “sku/category/cost”, so `generateAutoMappings` returns empty strings → required fields fail.
- Currency parsing strips non‑digits but still chokes on `R 1 234,56` or “request” cells → `parseFloat` becomes `NaN`.
- Schema lacks `stock_on_order` and `vat_rate`, so those expectations cannot be met.
- There is no persistence of user‑confirmed mappings; each upload starts from scratch, so the “learning” loop never exists.
- The upload wizard still assumes heuristics succeed; no UI surfaces the AI/rule suggestions vs heuristic ones.

## 4. AI involvement done right
1. **Schema first:** extend `FieldMappingSchema` with `stock_on_order` + `vat_rate` so pipelines can even carry those values.
2. **AI for mapping only:** keep heuristics for fast matches; when confidence < threshold, call the structure prompt (see `PROMPTS.md`) with headers + sample rows to get deterministic mappings.
3. **Persist learnings:** add `supplier_pricelist_mappings` storing header signature → mapping JSON; reuse on future uploads and feed into prompts.
4. **Row extraction prompt:** request canonical schema with explicit VAT logic (cost_ex_vat, vat_rate, stock fields) and enforce JSON responses.

## 5. Supplier rules engine status
- **Working today:** join Decksaver product list + price list, drop redundant SKU column, bring SKU (Part#), name (Product Title), category (Materials), brand (tab name), cost (NETT EXCL).
- **Needed upgrades:**
  - Honor `drop_right` when building the right sheet map.
  - Generalize to `sheet_loop` for the 32‑tab supplier scenario (brand from tab, category from section headers, VAT defaults).
  - Add `column_aliases`, `vat_policy`, `hard_requirements`, `warnings` to the DSL so each supplier defines its own tolerance.
  - Execute rules on the immediate upload path, not just via the worker re‑run.

## 6. VAT & price intelligence
- Recognize EX VAT vs INCL VAT columns via keywords (NETT, EXCL, Dealer vs Retail, Incl).
- If only INCL exists and supplier currency is ZAR, derive EX VAT: `price_ex_vat = price_incl / 1.15`.
- If both exist, trust EX VAT and use INCL to confirm VAT ratio (flag when out of tolerance ±2%).
- When encountering “request”, “SPECIAL ORDER”, or non‑numeric values, set prices to null and add a warning so the UI can prompt the supplier.

## 7. Validation policy redesign
- **Blocking errors:** missing `supplier_sku`, missing `name`, missing/invalid `cost_price_ex_vat`.
- **Warnings only:** missing category, missing stock_on_hand, missing stock_on_order, unknown VAT rate (unless supplier explicitly requires them).
- Each warning/error should include `row_num`, `field`, `reason`, and `proposed_fix` (e.g., “Set VAT policy to 15% or supply EX VAT column”).

## 8. Actionable checklist
1. Import rule templates (Decksaver join, sheet loop, VAT policy, validation set) for each supplier via `/api/supplier-rulesets`.
2. Patch the agent route to load rules pre‑heuristics, run VAT normalization, and emit warnings vs blocking errors correctly.
3. Finish the enhanced wizard: upload ID, AI badge, SSE timeline, rule application button, error summary.
4. Keep `ARTIFACTS/uploads_001_summary.*` handy—they provide per sheet header rows and best‑guess mappings to bootstrap aliases/rules.
5. Update documentation (this dev kit) whenever new suppliers or rule types are added so onboarding remains turnkey.

This breakdown is the narrative context behind every file in the dev kit—refer back whenever you need to explain “why” to stakeholders or new engineers.
