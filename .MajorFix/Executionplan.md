Perfect, this is a great moment to lock in a **clear build plan** you can just hand to your agent.

I’ll structure this as **epics → concrete tasks → acceptance criteria**, covering:

* Everything from the **previous two answers**
* Your request for a **Woo “staging/explorer” view** (like Supplier Products / SPP)
* The **initial full pull** from Woo as the foundation

---

## EPIC A — Fix & Harden the WooCommerce Integration Backbone

### A1. Schema drift & compat views

**Goal:** Compat views unblock current sync, but are treated as temporary shims.

**Tasks**

1. In the migration `0213_sync_view_compat` (or equivalent):

   * Add comments/TODOs that these views (`customers`, `products`, `orders`, etc.) are temporary compatibility layers over singular tables.
2. Add a tiny DB regression test or script (dev-only):

   * Asserts that where both exist, `SELECT COUNT(*) FROM customers` ≈ `COUNT(*) FROM customer` (same for products/orders), or logs the difference.
3. Only add **new views** (e.g. `inventory_adjustments`) **when code actually needs them**.

**Acceptance Criteria**

* Compat views exist and are documented as temporary.
* No queries crash because of plural vs singular.
* A dev can run a script to see if plural/singular tables diverge.

---

### A2. Canonical Woo config normalization

You currently normalize camelCase/snake_case in `WooCommerceService` so old and new configs work. 

**Tasks**

1. Create a shared type, e.g. `WooConfig`:

   ```ts
   export interface WooConfig {
     storeUrl: string;
     consumerKey: string;
     consumerSecret: string;
   }
   ```

2. In `WooCommerceService` constructor, normalize raw DB config into this shape:

   ```ts
   constructor(rawConfig: any) {
     this.config = {
       storeUrl:
         rawConfig.storeUrl ||
         rawConfig.store_url ||
         rawConfig.url,
       consumerKey:
         rawConfig.consumerKey ||
         rawConfig.consumer_key,
       consumerSecret:
         rawConfig.consumerSecret ||
         rawConfig.consumer_secret,
     };
   }
   ```

3. Optional but recommended: write a one-off migration/script to rewrite existing integration rows into the canonical columns so over time you can drop legacy keys.

**Acceptance Criteria**

* All Woo-related code uses `WooConfig` internally.
* A single `storeUrl/consumerKey/consumerSecret` source of truth is used everywhere.
* Old integrations (with snake_case) still work.

---

### A3. `fetchAllPages` safety & delta usage

You already added `maxPages` to prevent infinite paging/timeouts. 

**Tasks**

1. Update `fetchAllPages` signature to accept a config object:

   ```ts
   fetchAllPages<T>(
     fetchPage: (params: Record<string, any>) => Promise<T[]>,
     baseParams: Record<string, any> = {},
     options?: { maxPages?: number }
   )
   ```

2. For **preview** calls (UX “show sample” / test connection):

   * Use a low cap (e.g. `maxPages: 10`) so previews never go crazy.

3. For **real sync flows**:

   * Prefer **delta queries**, e.g. include `?after=last_sync_at` or `modified_after` where Woo supports it, instead of scanning the entire history on each run.

**Acceptance Criteria**

* Previews never exceed ~1k records (or agreed limit).
* Long-running syncs use `last_sync_at` and do not re-fetch entire history.

---

### A4. Activity log shape & typing

You fixed the backend to return `{ data: rows, rowCount }` so the UI doesn’t crash. 

**Tasks**

1. Define a shared TS type:

   ```ts
   export interface SyncActivityResponse {
     data: SyncActivityEntry[];
     rowCount: number;
   }
   ```

2. Update the API handler for `/api/v1/integrations/sync/activity`:

   * Return exactly that shape.

3. Update the frontend:

   * Type the fetch as `SyncActivityResponse`.
   * Remove defensive `(json.data || [])` hacks.

4. (Optional) Add a simple Zod schema on the server to validate the response shape before sending. 

**Acceptance Criteria**

* Activity log page loads without runtime errors.
* TypeScript enforces backend/frontend consistency for this endpoint.

---

### A5. Empty-state handling & dev seeds

**Tasks**

1. On Woo preview and new Woo Data tables:

   * If local count = 0 and remote > 0, show a message like:

     > “No local records found. This looks like an initial import – all X records will be created from WooCommerce.”

2. Add dev-only seed scripts/migrations:

   * Insert a few `customer`, `product`, maybe `order` rows in **dev/test** so delta logic can be exercised without real Woo.

**Acceptance Criteria**

* UX clearly indicates “initial import” instead of looking broken.
* Dev/test environments have sample data available for delta testing.

---

## EPIC B — Capture *All* Valuable Woo Data (Foundational Full Pull)

This is where we ensure **every useful Woo datapoint** is in Mantis, starting from Woo as source-of-truth.

### B1. Customers — run full sync (already designed)

Your Customer Sync pipeline already:

* Pulls Woo customers (and relevant order history). 
* Writes full data to `woocommerce_sync.sync_data`. 
* Derives lifetime value, order counts, recency, segments. 

**Tasks**

1. Confirm customer sync endpoint and queue are wired (per existing docs).
2. Run a **one-off full customer sync** for the target org(s).
3. Verify:

   * `customer` table has records.
   * `woocommerce_sync` rows exist for `entity_type = 'customer'` with full Woo JSON in `sync_data`.

**Acceptance Criteria**

* Every Woo customer appears in `customer` & `woocommerce_sync`.
* Derived metrics (LTV, order count) are populated where designed.

---

### B2. Orders — finish inbound `syncOrdersFromWooCommerce`

You already fetch orders in `IntegrationSyncService.syncOrdersFromWooCommerce`. 

Woo orders include header, addresses, line_items, shipping_lines, fees, and meta_data. 

**Tasks**

1. In `syncOrdersFromWooCommerce`:

   * Use `fetchAllPages(wooService.getOrders, { order: 'desc', orderby: 'date' })` for full pull.

2. For each `wooOrder`:

   * Look up existing mapping by external_id:

     ```ts
     const mapping = await mappingService.getMappingByExternalId('order', wooOrder.id!.toString());
     ```
   * If mapping exists:

     * Call `updateSyncStatus` (or equivalent) with `syncData: wooOrder` to refresh `woocommerce_sync.sync_data`.
   * If mapping does **not** exist:

     * (Phase 1) Create a minimal local “order stub” (or just generate a UUID if you don’t have normalized order tables yet).
     * Create a mapping with `entity_type: 'order'`, `internal_id: stubId`, `external_id: wooOrder.id`, `sync_data: wooOrder`. 

3. Expose a **one-off full sync endpoint**:

   * `POST /api/v1/integrations/woocommerce/sync/orders/full`
   * This loads the integration config, builds `WooCommerceService`, and calls `syncOrdersFromWooCommerce`.

**Phase 2 (later)**

* Design and create normalized tables, e.g. `sales_orders`, `sales_order_items`.
* Add a transformation step to populate them from `sync_data`.

**Acceptance Criteria**

* `woocommerce_sync` has a row for every Woo order (`entity_type = 'order'`).
* `sync_data` contains full order payload including line_items, shipping_lines, fees, billing/shipping, meta_data.
* Sync is re-runnable without duplicates (idempotent mapping logic).

---

### B3. Products — inbound sync mirroring outbound

Currently you push **from Mantis → Woo** and store Woo product snapshots. 

Now we add inbound **Woo → Mantis**.

**Tasks**

1. Implement `syncProductsFromWooCommerce` in `IntegrationSyncService`:

   ```ts
   const products = await wooService.fetchAllPages(params => wooService.getProducts(params));
   ```

2. For each `wooProduct` (which includes all attributes, categories, stock, images, meta_data ):

   * Try to find an existing mapping by `external_id`.
   * If none, attempt to find a local product by `sku`.
   * Upsert into `products` table:

     * name, sku, description, short_description
     * price mapping (regular/sale → your price fields)
     * active flag from Woo `status`
   * Upsert into `inventory_items`:

     * stock_quantity, manage_stock, stock_status.
   * Create/update mapping with full Woo JSON in `sync_data`.

3. Expose an endpoint:

   * `POST /api/v1/integrations/woocommerce/sync/products/full`

**Acceptance Criteria**

* Every Woo product has corresponding `products` and `inventory_items` rows (where meaningful).
* `woocommerce_sync` rows exist for `entity_type = 'product'` with full Woo JSON.
* Re-running the sync updates existing records instead of duplicating them.

---

### B4. Categories — sync taxonomy

Woo categories include id, name, slug, parent, description, image. 

**Tasks**

1. Implement `syncCategoriesFromWooCommerce`:

   * Use `fetchAllPages` with `wooService.getCategories`.
2. Upsert categories into your category table:

   * name, slug, description.
   * parent mapping based on Woo `parent` field.
   * Store `woo_category_id` and `image` in a `metadata` jsonb column.
3. Create `woocommerce_sync` entries for `entity_type = 'category'` with full Woo payload.

**Acceptance Criteria**

* Category tree in Mantis matches Woo category structure.
* Each category has a `woo_category_id` so it can be used in future syncs.

---

### B5. Other high-value reference data (Phase 2)

**Tasks**

* Extend `WooCommerceService` with endpoints for:

  * Coupons, taxes, shipping zones/methods, payment gateways, refunds.
* Add a generic `integration_reference` or reuse `woocommerce_sync` with suitable `entity_type` values (`payment`, `shipment`, `invoice`, etc.). 
* Store full JSON in `sync_data`.

**Acceptance Criteria**

* All “knobs and levers” that affect pricing, checkout, and fulfillment are captured somewhere in Mantis.

---

## EPIC C — Woo Data “Staging/Explorer” UI (like Supplier Products / SPP)

### C1. New tabs under Woo integration

**Tasks**

1. Under **Integrations → WooCommerce** page:

   * Add a **“Woo Data”** tab alongside:

     * Sync & Operations
     * Configuration
     * Settings / Sync History
2. Inside **Woo Data**, add sub-tabs:

   * Products
   * Orders
   * Customers

These mirror the Supplier Products / Pricelist views you already have in SPP. 

**Acceptance Criteria**

* User can open Woo integration and see a “Woo Data” tab with Products / Orders / Customers subtabs.

---

### C2. Backend table endpoints

Each tab should be a “table-style” endpoint similar to your supplier product tables. 

**Tasks**

Add these endpoints (or one generic with `entity` param):

* `GET /api/v1/integrations/woocommerce/table?entity=products`
* `GET /api/v1/integrations/woocommerce/table?entity=customers`
* `GET /api/v1/integrations/woocommerce/table?entity=orders`

Each should:

* Read `org_id` from auth.
* Use `sync_preview_cache` + `woocommerce_sync` to fetch rows:

  * `status: 'new' | 'updated' | 'deleted' | 'in_sync'` from preview. 
  * `sync_data` JSON from `woocommerce_sync` for display fields.
* Support:

  * Pagination (`page`, `pageSize`).
  * Filters (search by SKU/name/email/order number, status).

**Response shape:**

```json
{
  "data": [
    {
      "external_id": "123",
      "status": "new",
      "display": {
        "name": "Product Name",
        "sku": "ABC123",
        "email": "person@example.com",
        "order_number": "10001"
      },
      "raw": { /* full Woo JSON from sync_data */ }
    }
  ],
  "rowCount": 1234,
  "page": 1,
  "pageSize": 50
}
```

**Acceptance Criteria**

* Each Woo Data tab loads a paginated table.
* Status and key fields are rendered correctly.
* Columns differ per entity (Products vs Orders vs Customers) but share the same backend contract.

---

### C3. Hook tables into preview / DeltaDetectionService

**Tasks**

1. On tab load or when user hits “Refresh from Woo”:

   * Call `POST /api/v1/integrations/sync/preview?action=fetch&sync_type=woocommerce&entity_type=products|customers|orders`. 
   * This populates/refreshes `sync_preview_cache`.
2. Then call your new `/table` endpoint to read the cached preview + `sync_data`.

**Acceptance Criteria**

* When new changes appear in Woo, hitting “Refresh” updates the status flags in the Woo Data tables.
* Preview and table views stay in sync.

---

### C4. Row actions & selection

**Tasks**

For each row or bulk selection:

* Add controls for:

  * **Include in sync** / **Ignore**
  * Bulk: “Select all new products” etc.
* Once the user confirms:

  * Send selection info into your existing `sync_selective_config` via:

    * `POST /api/v1/integrations/sync/preview?action=select` with entity_type and selected external IDs. 

**Acceptance Criteria**

* User can choose which Woo Products / Orders / Customers should sync into core.
* Those choices are persisted and used when running the actual sync.

---

## EPIC D — Sync From Woo Staging → Core NXT Data

### D1. Customers → core

Already mostly covered by your Customer Sync pipeline.

**Tasks**

* Ensure Woo Data → selection feeds into the existing Customer Sync queues / orchestrator.
* Ensure mapping is maintained:

  * Woo `customer.id` ↔ core `customer.id` via `integration_mapping` / `woocommerce_sync`. 

**Acceptance Criteria**

* Selected Woo customers appear in core `customer` table with correct mappings and metadata.

---

### D2. Products → core product & stock

**Tasks**

1. From `syncProductsFromWooCommerce`, ensure:

   * A stable internal `product_id` is created/found for each Woo product.
   * `inventory_items` rows reflect stock from Woo (if Woo is stock source-of-truth).

2. Optionally, mirror SPP behavior:

   * Treat Woo like a supplier from a stock/pricing perspective:

     * Ability to mark selected Woo products as part of NXT Stock / Inventory.
     * Use similar flows to “add to portfolio” as SPP does for supplier pricelists. 

**Acceptance Criteria**

* Products from Woo visible as first-class items in core product/stock UIs (once selected).
* SKU conflicts are handled deterministically (document the rule: Woo wins vs local wins).

---

### D3. Orders → core order history (Phase 2)

**Tasks (Phase 2)**

1. Design normalized order tables:

   * `sales_orders`, `sales_order_items`, etc.
2. Add transformation logic:

   * Flatten Woo `line_items`, `shipping_lines`, `fee_lines` into explicit rows.
3. Wire a job that:

   * Scans `woocommerce_sync` where `entity_type = 'order'` AND no `sales_order_id` yet.
   * Creates normalized order records.

**Acceptance Criteria**

* Core can query orders without digging into raw JSON.
* Reports and analytics can be built off normalized order data.

---

## EPIC E — Security & Ops

You already have notes on security and RLS for integrations. 

**Tasks**

1. **Auth & scoping**

   * Ensure all Woo endpoints (sync, table, preview, config) use secure routes with org scoping (no cross-org leakage).

2. **Credential storage**

   * Make sure Woo credentials live only in:

     * `integration_connector` / integration config tables.
     * Encrypted at rest if not already.
   * Never send `consumer_secret` to the frontend.

3. **Rate limiting & timeouts**

   * Limit how often sync endpoints can run per integration.
   * Log slow Woo API calls and errors clearly.

4. **Monitoring**

   * Add basic logging/metrics around:

     * Full sync duration.
     * # of records pulled.
     * # of mapped/created/updated entities.

**Acceptance Criteria**

* No sensitive tokens in logs or frontend.
* Each org only sees its own Woo data.
* Sync operations are observable and debuggable.

---

## How to hand this to your agent

You can literally say:

> “Implement EPIC A–E from this spec.
> Start with:
>
> * A: backbone fixes (config, fetchAllPages, activity log, empty states)
> * B: full Woo data capture (customers, orders, products, categories)
> * C: Woo Data staging UI under Woo integration
> * Then wire selective sync → core (D) and tighten security/ops (E).”

If you want, next step I can do is generate:

* Exact endpoint signatures (TS interfaces)
* Example SQL queries for the table endpoints
* Or a file-by-file “touch list” for the codebase (what files to modify/create).

## Constraint–Conflict Decision Gate

- Trigger: A project rule conflicts with system constraints.
- Action: Stop execution immediately and request an explicit decision.
- Documentation: Record constraint, impacted rule(s), options, risks, and the safest compliant recommendation.
- Decision Request: Send a concise summary with choices; proceed only after explicit approval.
- Verification: After approval, implement, validate outcomes, and log the decision and result.

### Documentation Fields
- Constraint summary
- Impacted project rule(s)
- Options considered
- Risk assessment
- Recommended safest compliant path
- Decision owner and timestamp

## Delivery Summary

- A2: Unified Woo config validated; connection check enforced before sync.
- B1: Customers inbound queue executed; core upsert, mappings, logs complete.
- C4: Selection flags persisted; orchestrate consumes targeted IDs from preview.
- D1/D2: Core ingestion delivered; products mirrored to inventory; deterministic SKU rule applied.
- E-series: Org scoping and rate limits enforced; activity typing strict; materialize guarded by org header.

## Verification Summary
- Endpoints verified: schema-compat, activity, preview+table, sync, materialize.
- UI verified: Woo Data tabs, refresh, selection, sync-selected.
- Data verified: customer/product rows, integration mappings, inventory mirroring, order normalization.

