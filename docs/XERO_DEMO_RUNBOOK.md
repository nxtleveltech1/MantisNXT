# Xero Demo Runbook

End-to-end steps to demonstrate NXT DOTX data syncing to Xero, with data visible in both the app and Xero.

## Prerequisites

- Database URL configured (`DATABASE_URL` or `NEON_SPP_DATABASE_URL`)
- Xero app configured (see [XERO_INTEGRATION_GUIDE.md](integrations/XERO_INTEGRATION_GUIDE.md)): `XERO_CLIENT_ID`, `XERO_CLIENT_SECRET`, `XERO_WEBHOOK_KEY`, `NEXT_PUBLIC_APP_URL`, `PII_ENCRYPTION_KEY`
- User can sign in and switch organizations

## Steps

### 1. Seed NXT DOTX data

Load demo entities for the NXT DOTX org (customers, suppliers, products, AR/AP invoices with line items).

**Option A – psql (recommended)**

```bash
psql "$DATABASE_URL" -f database/scripts/seed_xero_demo_dotx.sql
```

Or with explicit URL:

```bash
psql "postgresql://user:pass@host/db?sslmode=require" -f database/scripts/seed_xero_demo_dotx.sql
```

**Option B – Neon MCP**

Use the Neon MCP server’s `run_sql_transaction` tool against the **Neon project that has the MantisNXT schema** (tables: `organization`, `supplier`, `customer`, `ar_customer_invoices`, `ap_vendor_invoices`). Get your project ID from the [Neon console](https://console.neon.tech) (project settings → copy project ID, e.g. `dry-snow-96214771`).

1. In Cursor, ensure the Neon MCP server is enabled (`user-neon`).
2. Call `run_sql_transaction` with:
   - **projectId**: your Neon project ID (the project whose database has the MantisNXT migrations applied).
   - **sqlStatements**: the array of SQL statements from `database/scripts/seed_xero_demo_dotx.sql` (omit the `\set` and `BEGIN`/`COMMIT` lines; use each INSERT and the `DO $$ ... $$` block as separate statements).

If you use a project that does not have the MantisNXT schema (e.g. NXT_STOCKTAKE), you will get `relation "organization" does not exist`. Use the project that your app’s `DATABASE_URL` or `NEON_SPP_DATABASE_URL` points to.

**Option C – Bun script (uses env DATABASE_URL)**

```bash
bun run scripts/seed-xero-demo-dotx.ts
```

Requires `DATABASE_URL` or `NEON_SPP_DATABASE_URL` in `.env.local` or the environment.

This step inserts/updates:

- Organization: NXT DOTX (`bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb`)
- 2 suppliers, 3 customers
- 3 products (if `inventory_item` has `org_id`)
- 2 AR invoices and 1 AP invoice with line items

### 2. Switch org to NXT DOTX

In the app header, select **NXT DOTX** from the organization switcher so all subsequent actions run in that org.

### 3. Connect Xero

1. Go to **Integrations → Xero Accounting**.
2. Click **Connect to Xero** and complete the OAuth flow in Xero.
3. Confirm the connection card shows the connected tenant and no errors.

### 4. Configure account mappings

1. Open the **Account Mappings** tab (enabled once connected).
2. Map required NXT transaction types to your Xero chart of accounts, e.g.:
   - Sales Revenue → your Xero revenue account (e.g. 200)
   - Cost of Goods Sold → your Xero COGS account (e.g. 300)
   - Accounts Receivable / Accounts Payable / Bank as needed

Save mappings. Invoices and items sync will use these codes.

### 5. Push NXT to Xero

1. Go to the **Sync Operations** tab.
2. Click **Push NXT to Xero** (top card).
3. Wait for the request to finish. A toast will show a summary (e.g. contacts, items, AR/AP invoices synced/failed).
4. Open the **Activity Log** tab to see per-entity sync entries.

### 6. Verify in Xero

In your Xero organization:

- **Contacts**: New contacts for the 2 suppliers and 3 customers.
- **Items** (if products were seeded): New items for the 3 products.
- **Sales** (Invoices): 2 sales invoices (DOTX-AR-001, DOTX-AR-002).
- **Bills**: 1 bill (DOTX-AP-001 / OG-V-2025-001).

### 7. Optional: Fetch from Xero

To confirm bidirectional sync:

- In **Sync Operations**, use **Sync Contacts**, **Fetch Invoices**, etc. to pull data from Xero.
- Activity log will show direction (To Xero / From Xero).

## Troubleshooting

| Issue | Action |
|-------|--------|
| "Not connected to Xero" | Complete step 3 (Connect Xero) for the NXT DOTX org. |
| Push fails for invoices | Ensure account mappings (step 4) are saved; required keys include `sales_revenue`, `cost_of_goods_sold`. |
| No products synced | Seed only inserts into `inventory_item` when it has an `org_id` column; some schemas use a view without `org_id`. |
| Org not in switcher | Run the seed (step 1) or `bun scripts/database/add-nxt-dotx-org.ts` so NXT DOTX exists. |

## Related

- [XERO_INTEGRATION_GUIDE.md](integrations/XERO_INTEGRATION_GUIDE.md) – Setup and env vars
- [XERO_MCP_SETUP.md](integrations/XERO_MCP_SETUP.md) – MCP access from the IDE
