# API Playbook

This playbook captures every API touch point that powers the supplier upload experience—immediate uploads, rule execution, auditing, and AI prompts. Use the sample payloads as‑is and swap in the real `supplier_id`, `upload_id`, or host when integrating.

---

## 1. Upload + validate immediately
`POST /api/spp/agent` (multipart form)

| Field | Required | Notes |
| --- | --- | --- |
| `action` | ✔ | Use `upload_and_validate`. |
| `supplier_id` | ✔ | UUID of the supplier profile. |
| `file` | ✔ | `.xlsx`, `.xls`, or `.csv`. |
| `currency` | ✖ | Defaults to supplier currency (ZAR). |

**Response (200)**:
```json
{
  "upload_id": "upl_01hf...b9",
  "validation": {
    "totals": { "rows": 214, "valid": 190, "errors": 4, "warnings": 20 },
    "errors": [
      { "row_num": 32, "field": "supplier_sku", "reason": "missing after join" }
    ]
  }
}
```
Immediately subscribe to the SSE audit stream: `GET /api/spp/events?upload_id=<id>`.

**Sample upload:**
```bash
curl -X POST https://<host>/api/spp/agent \
  -H "Authorization: Bearer <token>" \
  -F action=upload_and_validate \
  -F supplier_id=<uuid> \
  -F file=@Tuerk_Multimedia_July_2025.xlsx
```

---

## 2. Apply supplier rules (async re‑run)
`POST /api/spp/agent` (JSON)

```json
{
  "action": "apply_rules_and_validate",
  "upload_id": "upl_01hf...b9"
}
```

- Triggers `/api/process/rerun` internally with `{ use_rules_engine: true }`.
- Worker replays join/sheet_loop rules on the stored file buffer, revalidates rows, and emits SSE events.

Monitor status via `GET /api/spp/events?upload_id=<id>`; the UI should keep the timeline streaming until a `status=completed` event arrives.

---

## 3. Rule CRUD endpoints

### List existing rules
`GET /api/supplier-rulesets?supplier_id=<uuid>`

Returns the stored JSON configs (transformation, validation, approval, notification).

### Create/update rule
`POST /api/supplier-rulesets`

Body: raw JSON rule as defined in `RULES_DSL.md`. Use the provided templates verbatim and update `supplier_id` plus `rule_name`.

**Decksaver join rule**
```bash
curl -X POST https://<host>/api/supplier-rulesets \
  -H "Content-Type: application/json" \
  -d @RULE_TEMPLATES/DECKSAVER_RULE.json
```

**Sheet loop template**
```bash
curl -X POST https://<host>/api/supplier-rulesets \
  -H "Content-Type: application/json" \
  -d @RULE_TEMPLATES/SHEET_LOOP_TEMPLATE.json
```

**Validation template batch**
```bash
curl -X POST https://<host>/api/supplier-rulesets \
  -H "Content-Type: application/json" \
  -d @RULE_TEMPLATES/VALIDATION_TEMPLATES.json
```

VAT policies are saved the same way using `RULE_TEMPLATES/VAT_POLICY_TEMPLATE.json`.

---

## 4. Monitoring & health

| Endpoint | Purpose |
| --- | --- |
| `GET /api/spp/events?upload_id=<id>` | Server‑sent events sourced from `public.ai_agent_audit`. Shows agent milestones, rule execution, validation summary, and error diagnostics. |
| `GET /api/spp/audit?upload_id=<id>` | Historical audit log (same data as SSE, batch format). |
| `GET /api/ai/status` | Returns the configured AI provider (`openai`, `anthropic`, etc.), model name, and whether fallback is enabled for the AI badge in the wizard. |

---

## 5. Tying calls back to the repo
- **Rules engine & Decksaver join** – `src/lib/supplier-rules-engine.ts` (`createDecksaverJoinRule`, `applyPricelistRulesToExcel`, `getSupplierRules`).
- **Agent (immediate path)** – `src/app/api/spp/agent/route.ts`: handles upload, AI extraction, heuristic mapping, validation, and SSE dispatch.
- **Async re‑run** – `src/app/api/process/rerun/route.ts`: requeues uploads with `use_rules_engine`.
- **Rule CRUD** – `src/app/api/supplier-rulesets/route.ts`.
- **SSE timeline** – `src/app/api/spp/events/route.ts`.

Use this playbook as your quick reference when wiring automations, debugging uploads, or teaching the agent new rule sets.
