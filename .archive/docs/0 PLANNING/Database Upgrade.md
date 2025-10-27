1\) Target-state architecture (conceptual)



Separation of concerns



SPP (Supplier Portfolio / “staging”) – a quarantined database or schema used only for full price‑list uploads and validation. Keep files and raw rows here. Nothing else writes back to suppliers.



CORE (canonical) – normalized product, supplier, mapping, price history, and inventory selection. This is your single source of truth.



SERVE (views \& materialized views) – read-optimized objects powering the “product table by supplier”, the selection UI, and the IS‑SOH “what we stock” \& “actual by supplier” views.



High-level flow



Upload full supplier price list to SPP (all products \& prices).



Validate \& merge into CORE:



Existing items → update price history (keep prior versions).



New items → create supplier\_product rows with a is\_new flag.



Enforce category mapping and required fields.



Selection (ISI) – business users mark which supplier SKUs we actually sell (per supplier). This produces inventory\_selected rows.



IS‑SOH – aggregate selected items into a stock-on-hand layer, with the ability to report by supplier and rolled up across suppliers.



2\) Logical data model (tables you can create)



Naming assumes Postgres; adjust for your RDBMS. Prefer three schemas: spp, core, serve.



SPP (staging / isolated)



spp.pricelist\_upload



upload\_id (PK), supplier\_id (FK core.supplier), received\_at, filename, currency, valid\_from, valid\_to, row\_count, status, errors\_json



spp.pricelist\_row



upload\_id (FK), row\_num, supplier\_sku, name, brand, uom, pack\_size, price, currency, category\_raw, vat\_code, barcode, attrs\_json



Use only for validation \& diffing; never queried by apps.



CORE (canonical)



core.supplier



supplier\_id (PK), name, active, default\_currency, terms



core.product (your internal master catalog item)



product\_id (PK), name, brand\_id (FK), uom, pack\_size, barcode, category\_id (FK core.category), attrs\_json



core.category / core.category\_map



taxonomy tables; category\_map maps supplier raw categories to internal category\_id.



core.supplier\_product



Mapping of a supplier’s SKU to your internal product (may be 1‑to‑1 or many‑to‑1 if bundles).



supplier\_product\_id (PK), supplier\_id (FK), supplier\_sku, product\_id (FK) NULLABLE (allow unmapped), name\_from\_supplier, uom, pack\_size, barcode, first\_seen\_at, last\_seen\_at, is\_active, is\_new



Unique: (supplier\_id, supplier\_sku)



core.price\_history (SCD Type‑2 for supplier cost/list price)



price\_history\_id (PK), supplier\_product\_id (FK), price, currency, valid\_from, valid\_to NULL, is\_current



Constraint: no overlapping \[valid\_from, valid\_to) per supplier\_product\_id.



core.current\_price (optional materialized view)



One current row per supplier\_product\_id. Refresh after each upload.



core.inventory\_selection (ISI “what we chose to stock”)



selection\_id (PK), selection\_name, created\_by, created\_at, status (draft|active|archived)



core.inventory\_selected\_item



selection\_item\_id (PK), selection\_id (FK), supplier\_product\_id (FK), status (selected|deselected), notes, selected\_at, selected\_by



Unique: (selection\_id, supplier\_product\_id)



core.stock\_location



location\_id (PK), name (e.g., “Main DC”), supplier\_id NULL (for consignment/vendor‑held stock), type (internal|supplier).



core.stock\_on\_hand (snapshot fact of quantities)



soh\_id (PK), location\_id (FK), supplier\_product\_id (FK), qty, as\_of\_ts



Latest SoH per (location\_id, supplier\_product\_id) served through a view.



If you need movement history, add core.stock\_movement too.



SERVE (views \& reporting)



serve.v\_product\_table\_by\_supplier



Joins core.supplier\_product + core.current\_price + category mapping + price deltas vs previous version; used for the selection UI. Mirrors your “VIEW product table by supplier”.



serve.v\_selected\_catalog



All currently selected items across active selections.



serve.v\_soh\_by\_supplier



Current on‑hand by supplier \& product; supports “show actual holding by supplier”.



serve.v\_soh\_rolled\_up



Aggregates across suppliers for the same internal product\_id.



This gives you the behavior shown in your image while avoiding per‑supplier physical tables. If you must appear to have “one table per supplier”, create views filtered by supplier\_id (e.g., serve.v\_supplier\_123\_products) or use table partitioning by supplier\_id.



3\) Key behaviors (mapped to your bullets)



Upload full price list → land into spp.pricelist\_row linked to spp.pricelist\_upload.



Each supplier has their own inventory table → model this as logical isolation (views or partitions) on the single core.supplier\_product set; don’t create N tables.



Existing items only price update + history kept → write new core.price\_history row and close the prior one (valid\_to = new.valid\_from) without modifying older rows.



New products flagged New + full details captured → new core.supplier\_product with is\_new = true, first\_seen\_at = now(). Optionally auto‑create an unmapped core.product placeholder if you want immediate roll‑up.



Mandatory fields captured → enforce NOT NULL constraints and a validations step that rejects the upload if required columns fail (brand, uom, pack, currency, etc.).



SPP isolated → use a separate DB or at least a separate schema \& restricted roles.



Categorized on upload → run a mapping step that resolves category\_raw to internal category\_id. Flag unmapped rows for manual classification.



4\) Implementation plan (phased, no big‑bang)

Phase 0 – Foundations



Create schemas: spp, core, serve. Define roles: etl, app\_read, app\_write.



Create core.supplier, core.category / core.category\_map.



Phase 1 – Ingestion \& diffing



Build a single stored procedure spp.merge\_pricelist(upload\_id) that:



Validates file \& required columns (reject \& log in spp.pricelist\_upload.errors\_json on failure).



Upserts into core.supplier\_product:



Match on (supplier\_id, supplier\_sku).



If not found → insert with is\_new = true.



If found → set last\_seen\_at = now(), keep is\_new if within N days.



SCD‑2 into core.price\_history:



If price/currency changed or no current row → close prior (valid\_to = new.valid\_from) and insert new (is\_current = true).



Apply category mapping; put unmapped into a work queue table for manual fix.



Create core.current\_price as a materialized view (WITH NO DATA then REFRESH) or a view using DISTINCT ON/window functions.



Pseudo‑merge (Postgres):



-- 1) Supplier products

INSERT INTO core.supplier\_product (...)

SELECT DISTINCT ...

FROM spp.pricelist\_row r

JOIN spp.pricelist\_upload u USING (upload\_id)

ON CONFLICT (supplier\_id, supplier\_sku) DO UPDATE

&nbsp; SET last\_seen\_at = now();



-- 2) Price history

WITH rows AS (

&nbsp; SELECT sp.supplier\_product\_id, r.price, r.currency, u.valid\_from

&nbsp; FROM spp.pricelist\_row r

&nbsp; JOIN spp.pricelist\_upload u USING (upload\_id)

&nbsp; JOIN core.supplier\_product sp

&nbsp;   ON sp.supplier\_id = u.supplier\_id AND sp.supplier\_sku = r.supplier\_sku

)

-- close current where price changed

UPDATE core.price\_history ph

SET valid\_to = rows.valid\_from, is\_current = false

FROM rows

WHERE ph.supplier\_product\_id = rows.supplier\_product\_id

&nbsp; AND ph.is\_current = true

&nbsp; AND (ph.price, ph.currency) IS DISTINCT FROM (rows.price, rows.currency);



-- insert new current rows as needed

INSERT INTO core.price\_history (supplier\_product\_id, price, currency, valid\_from, is\_current)

SELECT r.supplier\_product\_id, r.price, r.currency, r.valid\_from, true

FROM rows r

LEFT JOIN core.price\_history ph

&nbsp; ON ph.supplier\_product\_id = r.supplier\_product\_id AND ph.is\_current = true

WHERE ph.price IS NULL

&nbsp;  OR (ph.price, ph.currency) IS DISTINCT FROM (r.price, r.currency);



Phase 2 – Serving layer \& selection (ISI)



Build serve.v\_product\_table\_by\_supplier to power your “VIEW product table by supplier”:



Include: current price, previous price, % change, is\_new, category, pack, brand.



Implement the selection UI/service writing to core.inventory\_selection and core.inventory\_selected\_item.



An Active selection represents what is currently ranged.



If you want seasonal/alternate ranges, use multiple selections; serve.v\_selected\_catalog unions only the active selection(s).



Phase 3 – IS‑SOH (stock on hand)



If stock is imported from suppliers: ingest into core.stock\_on\_hand keyed by (location\_id for the supplier, supplier\_product\_id, as\_of\_ts). Maintain a view for latest snapshot per pair.



If stock is internal: also record core.stock\_movement (receipts, sales, returns) and derive SoH.



Create serve.v\_soh\_by\_supplier and serve.v\_soh\_rolled\_up:



By supplier: join latest SoH to core.inventory\_selected\_item (only selected items).



Rolled up: join through core.product to aggregate across suppliers.



Phase 4 – Governance \& automation



Nightly REFRESH MATERIALIZED VIEW CONCURRENTLY core.current\_price.



Upload pipeline: mark upload status (received → validated → merged → served).



Row‑level auditing: who uploaded, who approved category fixes, who selected items.



Indexes \& partitioning (see below).



5\) Indexing \& performance checklist



core.supplier\_product



UNIQUE (supplier\_id, supplier\_sku)



Index (product\_id) for roll‑ups.



core.price\_history



Index (supplier\_product\_id, is\_current) and (supplier\_product\_id, valid\_from)



Optional: range partition by valid\_from (month/quarter) for large volumes.



core.inventory\_selected\_item



UNIQUE (selection\_id, supplier\_product\_id); index on (supplier\_product\_id) for joins.



core.stock\_on\_hand



Composite index (location\_id, supplier\_product\_id, as\_of\_ts DESC); partial view for latest rows.



If certain suppliers are huge, partition large fact tables by supplier\_id and expose per‑supplier views (satisfies your “each supplier has their own table” requirement without schema sprawl).



6\) What your two key views should return

serve.v\_product\_table\_by\_supplier (selection UI)



Supplier, Supplier SKU, Supplier Name, Brand, Pack/UOM, Category



Current price, Previous price, Δ%, Currency



Flags: is\_new, is\_mapped\_to\_product, validation\_status



Computed fields: first\_seen\_at, last\_seen\_at



serve.v\_soh\_by\_supplier (IS‑SOH)



Supplier, Supplier SKU, Product (internal if mapped), Location



Qty on hand (latest), As‑of timestamp



Cost (join to core.current\_price) → Inventory value by supplier



Only show selected items (join through core.inventory\_selected\_item \& active selections)



7\) Data quality rules to implement in SPP → CORE merge



Reject rows missing: supplier\_sku, price, currency, uom, pack\_size.



Currency must equal supplier default or be whitelisted; convert if you maintain a FX table.



Price must be non‑negative; use decimal(18,4).



Detect discontinued items: any supplier\_product not seen in N consecutive uploads → is\_active = false.



Category mapping coverage ≥ X%; provide a worklist for unmapped categories.



8\) Migration from your current design (safe path)



Backfill suppliers \& categories.



Load current price lists into SPP and run merge\_pricelist() to populate CORE.



Cut the “VIEW product table by supplier” to serve.v\_product\_table\_by\_supplier.



Recreate your current selection as one core.inventory\_selection with status=active.



Point IS‑SOH screens to serve.v\_soh\_by\_supplier.



Decommission per‑supplier physical tables (replace with per‑supplier views if teams rely on them).



9\) Risks \& mitigations



Per‑supplier physical tables → schema sprawl, hard migrations.

Mitigation: single canonical tables + partitions + per‑supplier views.



Price history accuracy → overlaps \& gaps.

Mitigation: tight SCD‑2 constraints; close prior row inside a transaction.



Category drift → inconsistent reporting.

Mitigation: enforce mapping at merge; block activation of a selection with unmapped items.



Large uploads (100k+ rows).

Mitigation: bulk load to spp.pricelist\_row (COPY), then set‑based MERGE with indexes disabled/enabled as needed.



10\) Example DDL (trimmed)

-- CORE

create table core.supplier (

&nbsp; supplier\_id bigserial primary key,

&nbsp; name text not null unique,

&nbsp; active boolean not null default true,

&nbsp; default\_currency char(3) not null

);



create table core.product (

&nbsp; product\_id bigserial primary key,

&nbsp; name text not null,

&nbsp; barcode text,

&nbsp; uom text not null,

&nbsp; pack\_size text,

&nbsp; category\_id bigint references core.category(category\_id),

&nbsp; attrs\_json jsonb default '{}'::jsonb

);



create table core.supplier\_product (

&nbsp; supplier\_product\_id bigserial primary key,

&nbsp; supplier\_id bigint not null references core.supplier(supplier\_id),

&nbsp; supplier\_sku text not null,

&nbsp; product\_id bigint references core.product(product\_id),

&nbsp; name\_from\_supplier text not null,

&nbsp; uom text not null,

&nbsp; pack\_size text,

&nbsp; barcode text,

&nbsp; first\_seen\_at timestamptz not null default now(),

&nbsp; last\_seen\_at timestamptz,

&nbsp; is\_active boolean not null default true,

&nbsp; is\_new boolean not null default true,

&nbsp; unique (supplier\_id, supplier\_sku)

);



create table core.price\_history (

&nbsp; price\_history\_id bigserial primary key,

&nbsp; supplier\_product\_id bigint not null references core.supplier\_product(supplier\_product\_id),

&nbsp; price numeric(18,4) not null,

&nbsp; currency char(3) not null,

&nbsp; valid\_from date not null,

&nbsp; valid\_to date,

&nbsp; is\_current boolean not null default true

);

create index on core.price\_history (supplier\_product\_id, is\_current);



11\) What this gives you (mapped to your diagram)



SPP stays an isolated database for ingest \& validation.



VIEW (product table by supplier) becomes serve.v\_product\_table\_by\_supplier over the canonical model.



ISI is embodied by core.inventory\_selection + core.inventory\_selected\_item.



IS‑SOH is served by serve.v\_soh\_by\_supplier (and a rolled‑up view across suppliers), showing actual holdings by supplier and your combined stock view.

