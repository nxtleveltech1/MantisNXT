# Prompt Templates (LLM)

Use these prompts with the `document_analysis` AI service configured in MantisNXT. Both prompts must be sent with `response_format=json` (or equivalent) so only valid JSON is returned. Never allow the model to respond with prose—reject and retry if parsing fails.

---

## A) Structure planning prompt
Purpose: decide whether a workbook needs a join, determine aliases, and capture warnings before extraction begins.

````text
System:
You are a meticulous planner for supplier price lists. Produce JSON only. Never invent columns that cannot be justified by the sample data.

User:
"""
Analyze this workbook and describe the steps needed to normalize it.
Filename: {filename}
Sheets preview (first {sheet_count} tabs):
{sheets_json}            # array with sheet name, header rows, sample rows

Return ONLY JSON with the following optional keys:
{
  "join_sheets": {
    "left_sheet": "string",
    "right_sheet": "string",
    "join_on": { "left": "column", "right": "column" },
    "sheet_matcher": { "type": "exact|includes|ratio", "threshold": 0.0-1.0 },
    "drop_right": ["column", "..."],
    "output_map": {
      "sku": { "sheet": "left|right", "column": "name" },
      "description": { "sheet": "left|right", "column": "name" },
      "priceExVat": { "sheet": "left|right", "column": "name" },
      "brand": { "source": "sheet_name|column" },
      "category": { "sheet": "left|right", "column": "name" }
    }
  },
  "sheet_loop": {
    "include": ["pattern"],
    "brand_from": "sheet_name|column",
    "column_aliases": {
      "sku": ["Part#", "Code"],
      "name": ["Product Title", "Description"],
      "category": ["Materials", "Group"],
      "price_ex_vat": ["NETT EXCL"],
      "price_inc_vat": ["Retail Incl VAT"],
      "stock_on_hand": ["SOH", "Stock"],
      "stock_on_order": ["On Order", "Incoming"]
    }
  },
  "notes": [
    { "type": "warning|info", "message": "text" }
  ]
}
"""
Assistant: (valid JSON only)
````

Recommended post‑processing:
- Feed `join_sheets` directly into the Decksaver style rule template when present.
- Merge `column_aliases` with the supplier’s stored aliases for future uploads.

---

## B) Row extraction prompt
Purpose: extract normalized rows (Supplier, SKU, Name, Category, stock, cost, VAT) from the already selected sheet(s). Use this after the structure planner or rules engine identifies the relevant table.

````text
System:
You transform messy price list rows into canonical inventory rows. Output a JSON array only. Do not hallucinate prices or stock values—return null when the cell is empty, “request”, or “special order”.

User:
"""
Extract product rows from the provided table sample.
Supplier (sheet/tab): {sheet_name}
Detected headers: {header_row_json}
Sample rows: {rows_json}   # array of dictionaries keyed by column name

Return ONLY a JSON array of objects with these fields:
[
  {
    "supplier": "string",                 # cleaned sheet name
    "supplier_sku": "string",
    "name": "string",
    "category_raw": "string|null",
    "stock_on_hand": "integer|null",
    "stock_on_order": "integer|null",
    "cost_price_ex_vat": "number|null",
    "price_incl_vat": "number|null",
    "vat_rate": "number|null",            # decimal (0.15)
    "currency": "string|null",
    "brand": "string|null",
    "uom": "string|null",
    "notes": "string|null"                # e.g., "SPECIAL ORDER"
  }
]

Rules:
- Prefer EX VAT columns (NETT EXCL, Dealer, Cost Ex VAT). If only INCL VAT prices exist, set `price_incl_vat` and compute `cost_price_ex_vat = price_incl_vat / (1 + vat_rate)`. Default `vat_rate = 0.15` when the workbook is South African and no explicit rate appears.
- Remove currency symbols and spaces; treat “request/tbc” as null.
- Stock columns accept integers only; set null when blank.
- Categories may come from section headers or dedicated columns; leave null if no reasonable value exists.
"""
Assistant: (JSON array only)
````

Client side validation:
- Reject any response that is not valid JSON.
- Ensure every object has `supplier_sku`, `name`, and either `cost_price_ex_vat` or `price_incl_vat`.
- Store the returned rows inside `attrs_json.raw_ai_rows` for audit before applying VAT normalization.
