# Odoo–Xero Automation Flows (Power Automate / n8n)

This document describes how to replicate Odoo-style scheduling and recurring journal behaviour using Power Automate or n8n, with MantisNXT and Xero as the backbone. See also **XERO_AUTOMATION_ARCHITECTURE.md** in the Odoo extraction repo (ODOO-ADMIN/ODD ACCOUNTING/docs).

---

## 1. Platform endpoints usable by flows

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `POST /api/v1/financial/odoo-ingest` | POST | Ingest Odoo extraction JSON (accounts, taxes, payment terms, journals, fiscal positions). |
| `POST /api/v1/financial/odoo-ingest/sync-coa` | POST | Push `odoo_accounts` without `xero_account_id` to Xero Chart of Accounts. |
| `GET /api/v1/financial/reconciliation/exceptions` | GET | List entity mappings with sync errors or state drift. Requires auth + org. |
| `POST /api/cron/xero-reconcile` | POST | Cron: count sync exceptions per org; log to `core.cron_execution_log`. Secure with `CRON_SECRET` or `x-vercel-cron`. |

---

## 2. Recurring journal (Odoo transfer model → Xero)

**Goal:** Run the equivalent of Odoo `account.transfer.model` on a schedule (e.g. monthly) and create a manual journal in Xero.

### Option A: Power Automate

1. **Trigger:** Recurrence (e.g. 1st of month, 00:00).
2. **Step – Get journal definition:**  
   Call your backend or read from a store (e.g. SharePoint/list) that holds the recurring journal template (account codes, amounts, narration). Alternatively, call MantisNXT if you expose a “recurring journal template” API that returns lines from `gl_recurring_entries` / `gl_recurring_entry_lines`.
3. **Step – Create journal in Xero:**  
   HTTP action to Xero API:  
   `POST https://api.xero.com/api.xro/2.0/Journals`  
   Body: manual journal with `Date`, `Narration`, `JournalLines[]` (LineAmount, AccountCode, Description).  
   Use OAuth2 (Azure AD / Xero connector) to obtain a valid token.
4. **On failure:** Send email or Teams alert.

### Option B: n8n

1. **Trigger:** Cron (e.g. `0 0 1 * *` for 1st of month).
2. **Node – Get template:**  
   HTTP Request to MantisNXT (e.g. `GET /api/v1/financial/gl/recurring-entries` with auth) or read from DB/JSON.
3. **Node – Transform:**  
   Map template lines to Xero journal line shape: `{ LineAmount, AccountCode, Description }`.
4. **Node – Xero:**  
   Use n8n Xero node “Create Manual Journal” or HTTP Request to `POST .../Journals` with OAuth2.
5. **Error handling:** Retry + notify on failure.

### Data shape (Xero manual journal)

Use the same structure as produced by `scripts/financial/odoo-opening-balances.ts`:

- `Date`: journal date (e.g. first day of month).
- `Narration`: e.g. “Monthly recurring from Odoo transfer model”.
- `JournalLines`: array of `{ LineAmount, AccountCode, Description }` (debits positive, credits negative).

---

## 3. Xero reconciliation check (daily)

**Goal:** Run a daily check for sync exceptions and optionally alert.

### Power Automate

1. **Trigger:** Recurrence (e.g. daily 06:00).
2. **Step:** HTTP GET to MantisNXT:  
   `GET /api/cron/xero-reconcile`  
   Or call the exceptions API per org:  
   `GET /api/v1/financial/reconciliation/exceptions?limit=100`  
   (requires auth and org context).
3. **Condition:** If `totalExceptions` > 0 (from cron response) or `count` > 0 (from exceptions API), send notification (email/Teams).

### n8n

1. **Trigger:** Cron (e.g. `0 6 * * *`).
2. **HTTP Request:** POST to `https://<your-app>/api/cron/xero-reconcile` with header `x-cron-secret: {{ $env.CRON_SECRET }}`.
3. **IF** `totalExceptions > 0` → send alert (Slack/email/n8n notify).

---

## 4. Invoice creation with fiscal position (already in platform)

Fiscal position resolution is implemented in MantisNXT: when syncing a sales or supplier invoice to Xero, pass `contactFiscal: { countryId, stateId }` into `syncSalesInvoiceToXero` or `syncSupplierInvoiceToXero`. The platform then resolves `odoo_fiscal_positions` and applies tax/account overrides before calling the Xero API. No separate Power Automate/n8n flow is required for this unless the trigger is “invoice created in another system”; in that case, the flow would call MantisNXT to create/sync the invoice (with contact country/state) rather than calling Xero directly.

---

## 5. Security and maintenance

- **CRON_SECRET:** Set in MantisNXT env and pass as `x-cron-secret` or `Authorization: Bearer <CRON_SECRET>` when invoking `/api/cron/xero-reconcile`.
- **Xero OAuth:** Use Azure Key Vault (Power Automate) or n8n credentials store for Xero tokens; never hardcode.
- **MantisNXT auth:** For flows that call `/api/v1/financial/*`, use a service account or the same auth mechanism as your app (e.g. API key header or session).
- **Monitor:** Review `core.cron_execution_log` for `xero-reconcile` runs and set alerts on `status = 'failed'` or high `processed_count` (exceptions).

---

## 6. References

- **XERO_AUTOMATION_ARCHITECTURE.md** (Odoo extraction docs) — Where Xero ends and what to replicate.
- **XERO_GAP_ANALYSIS.md** (Odoo extraction docs) — Functional gaps.
- Xero API: [developer.xero.com](https://developer.xero.com).
- MantisNXT opening balance script: `scripts/financial/odoo-opening-balances.ts`.
