# MantisNXT – Supplier Rules Engine Dev Kit

This kit packages every artifact your agent builder needs to make the supplier‑specific price‑list workflow deterministic: architecture notes, execution plan, prompts, rule templates, and machine‑readable analysis pulled from the current spreadsheets.

## Contents
- `PLAN.md` – end‑to‑end plan mapped to the live repo (agent route, worker, UI, validation).
- `API_PLAYBOOK.md` – request/response details plus cURL helpers for uploads, rule CRUD, and SSE monitoring.
- `PROMPTS.md` – JSON‑only prompts for structure planning and per‑row extraction with VAT logic.
- `RULES_DSL.md` – canonical JSON schema the rules engine understands (`join_sheets`, `sheet_loop`, validations, approvals).
- `RULE_TEMPLATES/*.json` – ready‑to‑POST payloads: Decksaver join, sheet loop template, VAT policy template, validation template set.
- `PATCH_GUIDE.md` – file‑by‑file pointers so rules execute before heuristics and VAT becomes deterministic.
- `MAPPINGS_SYNONYMS.json` – header aliases for SKU, description, category, price, stock, VAT.
- `NOTES_FULL_BREAKDOWN.md` – consolidated analysis covering workbook quirks, AI audit, VAT/stock rules, and roadmap context.
- `ARTIFACTS/` – machine generated analysis of your upload bundle (`uploads_001_summary.json` + `.csv` for rapid header profiling).

## Canonical schema (per product row)

| Field | What to extract | Notes |
| --- | --- | --- |
| `supplier` | Cleaned sheet/tab name. | Trim underscores, title case (e.g. `Avid_PRO TOOLS` → `Avid Pro Tools`). |
| `supplier_sku` | CODE / sku / model / part number column. | Pick the most structured alphanumeric column; ignore notes. |
| `name` | DESCRIPTION / PRODUCT NAME / ITEM text. | Use the widest descriptive text column. |
| `category_raw` | Section headers or explicit Category/Materials columns. | Associates rows with headings like “DI BOXES”. |
| `stock_on_hand` | STOCK / SOH / QTY ON HAND values. | Keep null when absent; warn instead of failing. |
| `stock_on_order` | ON ORDER / Incoming / ETA Qty. | Usually blank; treat as optional warning. |
| `cost_price_ex_vat` | NETT/EXCL, Dealer, or derived price. | Prefer EX VAT values; divide INCL by `(1 + vat_rate)` when only gross pricing exists. |
| `vat_rate` | Numeric VAT rate (decimal). | Default to 0.15 for ZA when not explicit; compute from VAT% column if present. |
| Optional context | `currency`, `brand`, `uom`, `notes`. | Persist inside `attrs_json` for downstream services. |

## Using the kit
1. Copy or zip `DevKit_MantisNXT_SupplierRules` and hand it to the engineer or agent workflow owner.
2. Import the JSON templates through `/api/supplier-rulesets` (fill in the real `supplier_id`) so the Decksaver join and sheet loop logic are persisted.
3. Follow `PLAN.md` and `PATCH_GUIDE.md` to wire the rules engine, VAT normalization, column aliasing, and UI affordances into the upload path.
4. Connect `PROMPTS.md` to your configured AI service (`document_analysis`) so the upload wizard can request structured mappings/rows when heuristics fall short.
5. Keep `ARTIFACTS/` nearby; the JSON/CSV summaries seed `column_aliases`, highlight header noise, and speed debugging for new suppliers.

Treat this folder as the single source of truth for supplier uploads. Whenever a new rule type, prompt, or validation policy ships, update the kit so future onboarding stays zero‑assumption.
