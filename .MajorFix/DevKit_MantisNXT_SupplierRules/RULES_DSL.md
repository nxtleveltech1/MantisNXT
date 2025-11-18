# Supplier Rules DSL

Every rule persistable through `/api/supplier-rulesets` follows the same envelope. The engine executes rules in ascending `execution_order`, storing audit rows in `public.supplier_rule_executions`.

```json
{
  "supplier_id": "<uuid>",
  "rule_name": "string",
  "rule_type": "transformation | validation | approval | notification",
  "trigger_event": "pricelist_upload",
  "execution_order": 1,
  "is_blocking": false,
  "rule_config": { /* type-specific config */ }
}
```

## Transformation configs

### `join_sheets`
Use when a supplier ships related sheets (e.g., Decksaver product list + price list).

```json
"rule_config": {
  "join_sheets": {
    "left_sheet": "Decksaver product list",
    "right_sheet": "Decksaver price list",
    "join_on": { "left": "Product Title", "right": "Description" },
    "sheet_matcher": { "type": "includes", "threshold": 0.6 },
    "drop_right": ["sku"],
    "output_map": {
      "sku": { "sheet": "left", "column": "Part#" },
      "description": { "sheet": "left", "column": "Product Title" },
      "priceExVat": { "sheet": "right", "column": "NETT EXCL" },
      "brand": { "source": "sheet_name" },
      "category": { "sheet": "left", "column": "Materials" }
    }
  },
  "vat_policy": { "rate": 0.15, "mode": "ex" },
  "hard_requirements": ["sku", "description", "priceExVat"]
}
```

### `sheet_loop`
Iterates every tab matching the supplied glob/regex, infers brand from tab name, and applies column aliases. Ideal for suppliers with 30+ brand tabs.

```json
"rule_config": {
  "sheet_loop": {
    "include": ["*"],
    "exclude": ["Sheet1", "Sheet2"],
    "brand_source": "sheet_name",
    "tab_strategy": "per_tab_brand",
    "column_aliases": {
      "sku": ["SKU", "Stock Code", "Part#", "Model"],
      "name": ["Product Name", "Description", "Item"],
      "category": ["Category", "Materials", "Group", "Class"],
      "price_ex_vat": ["NETT EXCL", "Cost Ex VAT", "Dealer"],
      "price_inc_vat": ["RSP INCL VAT", "Retail Incl VAT"],
      "stock_on_hand": ["SOH", "Stock", "Qty", "Stock On Hand"],
      "stock_on_order": ["On Order", "Incoming", "ETA Qty"]
    },
    "section_headers_as_category": true,
    "uom_default": "EA"
  },
  "vat_policy": {
    "rate": 0.15,
    "mode": "detect",
    "detect_keywords": ["ex vat", "incl vat", "nett"],
    "ratio_tolerance": 0.02
  },
  "warnings": ["category_raw", "stock_on_order"]
}
```

### `vat_policy`
May also be saved as its own transformation rule to override defaults.

```json
"rule_config": {
  "vat_policy": {
    "rate": 0.15,
    "mode": "detect",              // ex, inc, detect
    "detect_keywords": ["ex", "excl", "incl"],
    "ratio_tolerance": 0.02,       // expected ratio vs 1 + rate
    "currency": "ZAR"
  }
}
```

## Validation configs

Validation rules run after transformations and may block the merge when `is_blocking=true`.

```json
"rule_config": {
  "field": "supplier_sku",
  "required": true,
  "pattern": "^[A-Za-z0-9\\-_/\\.\\s]+$",
  "min": null,
  "max": null,
  "warning_message": "Missing SKU; row sent back for correction."
}
```

Other supported keys:
- `allowed_values`: restrict to a list (e.g., currency codes).
- `max_variance_percent`: compare prices against previous uploads.
- `computation`: e.g., ensure `price_incl_vat = cost_price_ex_vat * 1.15 ± tolerance`.

## Approval & notification configs

- **Approval:** escalate when variance or manual flag triggers. Example: `{"rule_config":{"field":"cost_price_ex_vat","variance_percent":15,"approver_role":"pricing_manager"}}`.
- **Notification:** log informational events (e.g., “sheet missing stock counts”) without blocking or escalating.

## Execution model
1. Engine loads all active rules ordered by `execution_order`.
2. Transformation rules mutate the workbook buffer and emit canonical rows.
3. Validation rules inspect emitted rows; failures are surfaced to the UI with row numbers and reasons.
4. Approval/notification rules insert events into `public.ai_agent_audit` and return control to the agent workflow.

Persisting rules this way keeps the upload path deterministic, supplier‑specific, and auditable.
