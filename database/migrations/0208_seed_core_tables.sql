BEGIN;

-- Seed core.supplier
WITH payload AS (
  SELECT jsonb_array_elements($$[
    {
      "supplier_id": "146836e6-706a-4cda-b415-8da00b138c96",
      "name": "Active Music Distribution",
      "code": "ACTIVE",
      "active": true,
      "default_currency": "ZAR",
      "payment_terms": "Cash on Delivery",
      "contact_info": {
        "email": "info@activemusicdistribution.com",
        "phone": "+27 11 123 4567",
        "mobile": "",
        "website": "https://www.activemusicdistribution.com",
        "job_title": "Sales Manager",
        "department": "",
        "contact_person": "John Smith"
      },
      "tax_number": "00000",
      "created_at": "2025-10-11T02:27:53.085596+00:00",
      "updated_at": "2025-10-11T02:27:53.085596+00:00"
    },
    {
      "supplier_id": "61ed8943-fa17-4721-959f-62e722a8b982",
      "name": "Test Enhanced Supplier Corp",
      "code": "TESTENHANCED",
      "active": true,
      "default_currency": "ZAR",
      "payment_terms": "Net 30",
      "contact_info": {
        "email": "jane@testenhanced.com",
        "phone": "+27 11 222 2222",
        "address": {
          "city": "Cape Town",
          "state": "Western Cape",
          "street": "456 Business Avenue",
          "country": "South Africa",
          "postalCode": "8001"
        },
        "website": "https://testenhanced.com",
        "job_title": "Sales Manager",
        "contact_person": "Jane Doe"
      },
      "tax_number": null,
      "created_at": "2025-10-11T10:36:25.766881+00:00",
      "updated_at": "2025-10-11T10:36:25.766881+00:00"
    },
    {
      "supplier_id": "67f24d12-28f1-4553-98d4-303f9a795275",
      "name": "Test Simple Supplier",
      "code": "TESTSIMPL",
      "active": true,
      "default_currency": "USD",
      "payment_terms": "30 days",
      "contact_info": {
        "email": "test@simple.com",
        "phone": "+27 11 111 1111",
        "address": "123 Test Street",
        "contact_person": "Test Person"
      },
      "tax_number": null,
      "created_at": "2025-10-11T10:36:25.592121+00:00",
      "updated_at": "2025-10-11T10:36:25.592121+00:00"
    }
  ]$$::jsonb) AS row
)
INSERT INTO core.supplier (
  supplier_id,
  name,
  code,
  active,
  default_currency,
  payment_terms,
  contact_info,
  tax_number,
  created_at,
  updated_at
)
SELECT
  (row->>'supplier_id')::uuid,
  row->>'name',
  row->>'code',
  (row->>'active')::boolean,
  row->>'default_currency',
  row->>'payment_terms',
  row->'contact_info',
  NULLIF(row->>'tax_number', ''),
  (row->>'created_at')::timestamptz,
  (row->>'updated_at')::timestamptz
FROM payload
ON CONFLICT (supplier_id) DO NOTHING;

-- Seed core.stock_location
WITH payload AS (
  SELECT jsonb_array_elements($$[
    {
      "location_id": "1c53259f-70ef-4e25-8b99-5ecbe4b82eeb",
      "name": "Main Warehouse",
      "type": "internal",
      "supplier_id": null,
      "address": null,
      "metadata": {},
      "is_active": true,
      "created_at": "2025-10-11T02:32:14.602358+00:00",
      "updated_at": "2025-11-11T16:45:33.865969+00:00"
    }
  ]$$::jsonb) AS row
)
INSERT INTO core.stock_location (
  location_id,
  name,
  type,
  supplier_id,
  address,
  metadata,
  is_active,
  created_at,
  updated_at
)
SELECT
  (row->>'location_id')::uuid,
  row->>'name',
  row->>'type',
  NULLIF(row->>'supplier_id', '')::uuid,
  row->>'address',
  COALESCE(row->'metadata', '{}'::jsonb),
  (row->>'is_active')::boolean,
  (row->>'created_at')::timestamptz,
  (row->>'updated_at')::timestamptz
FROM payload
ON CONFLICT (location_id) DO NOTHING;

-- Seed core.supplier_product
WITH payload AS (
  SELECT jsonb_array_elements($$[
    {
      "supplier_product_id": "0075c8d9-4686-4021-b3e0-8b8af71edf9b",
      "supplier_id": "146836e6-706a-4cda-b415-8da00b138c96",
      "supplier_sku": "ADA-K3YWCC0100",
      "product_id": null,
      "name_from_supplier": "Adam Hall Cables K3 YWCC 0100 - Audio Cable 3.5mm Jack stereo to 2 x RCA male 1m",
      "uom": "each",
      "pack_size": "1",
      "barcode": null,
      "first_seen_at": "2025-10-11T02:34:29.59484+00:00",
      "last_seen_at": "2025-10-11T02:42:19.712744+00:00",
      "is_active": true,
      "is_new": true,
      "category_id": null,
      "attrs_json": {
        "link": "3 STAR YWCC 0100 | Y-Cables | Ready Made Cables | Cables & Connectors | Adam Hall Shop",
        "brand": "ADAM HALL",
        "category": "Cables & Connectors"
      },
      "created_at": "2025-10-11T02:34:29.59484+00:00",
      "updated_at": "2025-10-11T02:42:19.712744+00:00"
    },
    {
      "supplier_product_id": "01a9b309-db3c-43c9-a71e-de474ae2c70a",
      "supplier_id": "146836e6-706a-4cda-b415-8da00b138c96",
      "supplier_sku": "RAD-R800102600",
      "product_id": null,
      "name_from_supplier": "Radial JPC Active DI, stereo inputs for laptops & CD players, phantom powered",
      "uom": "each",
      "pack_size": "1",
      "barcode": null,
      "first_seen_at": "2025-10-11T02:36:40.665148+00:00",
      "last_seen_at": "2025-10-11T02:45:13.372162+00:00",
      "is_active": true,
      "is_new": true,
      "category_id": null,
      "attrs_json": {
        "link": "https://www.radialeng.com/product/jpc",
        "brand": "RADIAL",
        "category": "General Electronics & Hardware"
      },
      "created_at": "2025-10-11T02:36:40.665148+00:00",
      "updated_at": "2025-10-11T02:45:13.372162+00:00"
    },
    {
      "supplier_product_id": "02534e5e-54a3-42db-bc08-4457018c9937",
      "supplier_id": "146836e6-706a-4cda-b415-8da00b138c96",
      "supplier_sku": "ELI-16102",
      "product_id": null,
      "name_from_supplier": "Elixir 16102 Acoustic Phosphor Bronze with NANOWEB Coating Medium (.013-.056",
      "uom": "each",
      "pack_size": "1",
      "barcode": null,
      "first_seen_at": "2025-10-11T02:35:19.62553+00:00",
      "last_seen_at": "2025-10-11T02:43:25.712243+00:00",
      "is_active": true,
      "is_new": true,
      "category_id": null,
      "attrs_json": {
        "link": "https://global.elixirstrings.com/guitar-strings/acoustic-phosphor-bronze-nanoweb-coating",
        "brand": "ELIXIR STRINGS",
        "category": "General Electronics & Hardware"
      },
      "created_at": "2025-10-11T02:35:19.62553+00:00",
      "updated_at": "2025-10-11T02:43:25.712243+00:00"
    },
    {
      "supplier_product_id": "025bf8a5-f37c-46c1-b117-bc1a21324f50",
      "supplier_id": "146836e6-706a-4cda-b415-8da00b138c96",
      "supplier_sku": "ADA-K3BVV0600",
      "product_id": null,
      "name_from_supplier": "Adam Hall Cables K3 BVV 0600 - Audio Cable 6.3mm Jack stereo to 6.3mm Jack stereo 6m",
      "uom": "each",
      "pack_size": "1",
      "barcode": null,
      "first_seen_at": "2025-10-11T02:32:30.194609+00:00",
      "last_seen_at": "2025-10-11T02:42:04.402471+00:00",
      "is_active": true,
      "is_new": true,
      "category_id": null,
      "attrs_json": {
        "link": "3 STAR BVV 0600 | Balanced Cables | Ready Made Cables | Cables & Connectors | Adam Hall Shop",
        "brand": "ADAM HALL",
        "category": "Cables & Connectors"
      },
      "created_at": "2025-10-11T02:32:30.194609+00:00",
      "updated_at": "2025-10-11T02:42:04.402471+00:00"
    },
    {
      "supplier_product_id": "0372c911-b03c-43d5-9a25-6b0fbee88b01",
      "supplier_id": "146836e6-706a-4cda-b415-8da00b138c96",
      "supplier_sku": "PLU-HMS1-BE",
      "product_id": null,
      "name_from_supplier": "Plus Audio Headband microphone system - single ear (Beige",
      "uom": "each",
      "pack_size": "1",
      "barcode": null,
      "first_seen_at": "2025-10-11T02:36:34.43551+00:00",
      "last_seen_at": "2025-10-11T02:45:04.917223+00:00",
      "is_active": true,
      "is_new": true,
      "category_id": null,
      "attrs_json": {
        "link": "https://www.plus.audio/product/hms1/",
        "brand": "PLUS AUDIO",
        "category": "Microphones & Wireless Systems"
      },
      "created_at": "2025-10-11T02:36:34.43551+00:00",
      "updated_at": "2025-10-11T02:45:04.917223+00:00"
    },
    {
      "supplier_product_id": "06b11c7e-dc4b-4e19-8c5d-713e47210197",
      "supplier_id": "146836e6-706a-4cda-b415-8da00b138c96",
      "supplier_sku": "ADA-7546",
      "product_id": null,
      "name_from_supplier": "Adam Hall Connectors 7546 - Y-Adapter 2 x 6.3mm stereo Jack female to 6.3mm stereo",
      "uom": "each",
      "pack_size": "1",
      "barcode": null,
      "first_seen_at": "2025-10-11T02:32:19.334543+00:00",
      "last_seen_at": "2025-10-11T02:41:50.473019+00:00",
      "is_active": true,
      "is_new": true,
      "category_id": null,
      "attrs_json": {
        "link": "7546 | Archiv | Adam Hall Shop",
        "brand": "ADAM HALL",
        "category": "Cables & Connectors"
      },
      "created_at": "2025-10-11T02:32:19.334543+00:00",
      "updated_at": "2025-10-11T02:41:50.473019+00:00"
    },
    {
      "supplier_product_id": "79c6ce79-7c94-4355-ba58-7e3badc3c1ce",
      "supplier_id": "146836e6-706a-4cda-b415-8da00b138c96",
      "supplier_sku": "ADA-7511",
      "product_id": null,
      "name_from_supplier": "Adam Hall Connectors 7511 - 6.3mm Jack Plug stereo gold",
      "uom": "each",
      "pack_size": "1",
      "barcode": null,
      "first_seen_at": "2025-10-11T02:32:16.694957+00:00",
      "last_seen_at": "2025-10-11T02:41:47.012628+00:00",
      "is_active": true,
      "is_new": true,
      "category_id": null,
      "attrs_json": {
        "link": "https://www.adamhall.com/shop/en/jack-connectors/7511",
        "brand": "ADAM HALL",
        "category": "Cables & Connectors"
      },
      "created_at": "2025-10-11T02:32:16.694957+00:00",
      "updated_at": "2025-10-11T02:41:47.012628+00:00"
    },
    {
      "supplier_product_id": "8c46cfe5-5abb-4e23-8466-9ba9e7920912",
      "supplier_id": "146836e6-706a-4cda-b415-8da00b138c96",
      "supplier_sku": "ADA-7514",
      "product_id": null,
      "name_from_supplier": "Adam Hall Connectors 7514 - 6.3mm Jack Plug mono",
      "uom": "each",
      "pack_size": "1",
      "barcode": null,
      "first_seen_at": "2025-10-11T02:32:17.244176+00:00",
      "last_seen_at": "2025-10-11T02:41:47.702594+00:00",
      "is_active": true,
      "is_new": true,
      "category_id": null,
      "attrs_json": {
        "link": "https://www.adamhall.com/shop/en/jack-connectors/7514",
        "brand": "ADAM HALL",
        "category": "Cables & Connectors"
      },
      "created_at": "2025-10-11T02:32:17.244176+00:00",
      "updated_at": "2025-10-11T02:41:47.702594+00:00"
    },
    {
      "supplier_product_id": "cd9f982b-bbd7-47d5-b0ee-9a133ed50afc",
      "supplier_id": "146836e6-706a-4cda-b415-8da00b138c96",
      "supplier_sku": "ADA-7541",
      "product_id": null,
      "name_from_supplier": "Adam Hall Connectors 7541 - Adapter 6.3mm mono Jack female to mono RCA male",
      "uom": "each",
      "pack_size": "1",
      "barcode": null,
      "first_seen_at": "2025-10-11T02:32:18.294795+00:00",
      "last_seen_at": "2025-10-11T02:41:49.082232+00:00",
      "is_active": true,
      "is_new": true,
      "category_id": null,
      "attrs_json": {
        "link": "https://www.adamhall.com/shop/en/adapters/7541",
        "brand": "ADAM HALL",
        "category": "Cables & Connectors"
      },
      "created_at": "2025-10-11T02:32:18.294795+00:00",
      "updated_at": "2025-10-11T02:41:49.082232+00:00"
    },
    {
      "supplier_product_id": "d385fb3d-f740-409a-9fd1-643fda12e018",
      "supplier_id": "146836e6-706a-4cda-b415-8da00b138c96",
      "supplier_sku": "ADA-7540",
      "product_id": null,
      "name_from_supplier": "Adam Hall Connectors 7540 - Adapter mono RCA female to 6.3mm mono Jack male",
      "uom": "each",
      "pack_size": "1",
      "barcode": null,
      "first_seen_at": "2025-10-11T02:32:17.776118+00:00",
      "last_seen_at": "2025-10-11T02:41:48.402364+00:00",
      "is_active": true,
      "is_new": true,
      "category_id": null,
      "attrs_json": {
        "link": "7540 | Archiv | Adam Hall Shop",
        "brand": "ADAM HALL",
        "category": "Cables & Connectors"
      },
      "created_at": "2025-10-11T02:32:17.776118+00:00",
      "updated_at": "2025-10-11T02:41:48.402364+00:00"
    }
  ]$$::jsonb) AS row
)
INSERT INTO core.supplier_product (
  supplier_product_id,
  supplier_id,
  supplier_sku,
  product_id,
  name_from_supplier,
  uom,
  pack_size,
  barcode,
  first_seen_at,
  last_seen_at,
  is_active,
  is_new,
  category_id,
  attrs_json,
  created_at,
  updated_at
)
SELECT
  (row->>'supplier_product_id')::uuid,
  (row->>'supplier_id')::uuid,
  row->>'supplier_sku',
  NULLIF(row->>'product_id', '')::uuid,
  row->>'name_from_supplier',
  row->>'uom',
  NULLIF(row->>'pack_size', '')::text,
  NULLIF(row->>'barcode', ''),
  (row->>'first_seen_at')::timestamptz,
  (row->>'last_seen_at')::timestamptz,
  (row->>'is_active')::boolean,
  (row->>'is_new')::boolean,
  NULLIF(row->>'category_id', '')::uuid,
  row->'attrs_json',
  (row->>'created_at')::timestamptz,
  (row->>'updated_at')::timestamptz
FROM payload
ON CONFLICT (supplier_product_id) DO NOTHING;

-- Seed core.price_history
WITH payload AS (
  SELECT jsonb_array_elements($$[
    {
      "price_history_id": "8ae61652-f635-4e9f-9d4f-2c6694252052",
      "supplier_product_id": "0075c8d9-4686-4021-b3e0-8b8af71edf9b",
      "price": "189.00",
      "currency": "ZAR",
      "valid_from": "2025-10-11T10:00:00+00:00",
      "valid_to": null,
      "is_current": true,
      "change_reason": "Seed import",
      "created_at": "2025-10-11T10:00:00+00:00"
    },
    {
      "price_history_id": "8d81f53b-2a3e-4f3c-9670-9fad05a6618c",
      "supplier_product_id": "01a9b309-db3c-43c9-a71e-de474ae2c70a",
      "price": "6250.00",
      "currency": "ZAR",
      "valid_from": "2025-10-11T10:05:00+00:00",
      "valid_to": null,
      "is_current": true,
      "change_reason": "Seed import",
      "created_at": "2025-10-11T10:05:00+00:00"
    },
    {
      "price_history_id": "01f91a4c-6ca1-4c19-9ed9-2f1e04226673",
      "supplier_product_id": "02534e5e-54a3-42db-bc08-4457018c9937",
      "price": "420.00",
      "currency": "ZAR",
      "valid_from": "2025-10-11T10:10:00+00:00",
      "valid_to": null,
      "is_current": true,
      "change_reason": "Seed import",
      "created_at": "2025-10-11T10:10:00+00:00"
    },
    {
      "price_history_id": "0bf980d2-4d0a-40b5-bcd0-8a8939f94362",
      "supplier_product_id": "025bf8a5-f37c-46c1-b117-bc1a21324f50",
      "price": "349.00",
      "currency": "ZAR",
      "valid_from": "2025-10-11T10:15:00+00:00",
      "valid_to": null,
      "is_current": true,
      "change_reason": "Seed import",
      "created_at": "2025-10-11T10:15:00+00:00"
    },
    {
      "price_history_id": "8027ce24-8f18-4266-86a6-3b301ee0a08c",
      "supplier_product_id": "0372c911-b03c-43d5-9a25-6b0fbee88b01",
      "price": "3899.00",
      "currency": "ZAR",
      "valid_from": "2025-10-11T10:20:00+00:00",
      "valid_to": null,
      "is_current": true,
      "change_reason": "Seed import",
      "created_at": "2025-10-11T10:20:00+00:00"
    }
  ]$$::jsonb) AS row
)
INSERT INTO core.price_history (
  price_history_id,
  supplier_product_id,
  price,
  currency,
  valid_from,
  valid_to,
  is_current,
  change_reason,
  created_at
)
SELECT
  (row->>'price_history_id')::uuid,
  (row->>'supplier_product_id')::uuid,
  (row->>'price')::numeric,
  row->>'currency',
  (row->>'valid_from')::timestamptz,
  NULLIF(row->>'valid_to', '')::timestamptz,
  (row->>'is_current')::boolean,
  row->>'change_reason',
  (row->>'created_at')::timestamptz
FROM payload
ON CONFLICT (price_history_id) DO NOTHING;

-- Seed core.stock_on_hand
WITH payload AS (
  SELECT jsonb_array_elements($$[
    {
      "soh_id": "abd56170-3787-4a11-984c-b3562fe9254f",
      "location_id": "1c53259f-70ef-4e25-8b99-5ecbe4b82eeb",
      "supplier_product_id": "0075c8d9-4686-4021-b3e0-8b8af71edf9b",
      "qty": 3,
      "unit_cost": "119.00",
      "as_of_ts": "2025-10-11T02:42:20.047603+00:00",
      "source": "import",
      "created_at": "2025-10-11T02:42:20.047603+00:00"
    },
    {
      "soh_id": "8b518f73-f401-44b8-830e-94758bf6aed6",
      "location_id": "1c53259f-70ef-4e25-8b99-5ecbe4b82eeb",
      "supplier_product_id": "01a9b309-db3c-43c9-a71e-de474ae2c70a",
      "qty": 2,
      "unit_cost": "5331.00",
      "as_of_ts": "2025-10-11T02:45:13.712301+00:00",
      "source": "import",
      "created_at": "2025-10-11T02:45:13.712301+00:00"
    },
    {
      "soh_id": "ef33a651-fa4d-4513-81aa-6a18feb61577",
      "location_id": "1c53259f-70ef-4e25-8b99-5ecbe4b82eeb",
      "supplier_product_id": "02534e5e-54a3-42db-bc08-4457018c9937",
      "qty": 1,
      "unit_cost": "383.00",
      "as_of_ts": "2025-10-11T02:43:26.047306+00:00",
      "source": "import",
      "created_at": "2025-10-11T02:43:26.047306+00:00"
    },
    {
      "soh_id": "3f855e2d-1597-41f3-8984-cac8ad8fcb16",
      "location_id": "1c53259f-70ef-4e25-8b99-5ecbe4b82eeb",
      "supplier_product_id": "025bf8a5-f37c-46c1-b117-bc1a21324f50",
      "qty": 2,
      "unit_cost": "314.00",
      "as_of_ts": "2025-10-11T02:42:04.775231+00:00",
      "source": "import",
      "created_at": "2025-10-11T02:42:04.775231+00:00"
    },
    {
      "soh_id": "6f42113e-c00a-4b60-a682-88c74d5b4ae6",
      "location_id": "1c53259f-70ef-4e25-8b99-5ecbe4b82eeb",
      "supplier_product_id": "0372c911-b03c-43d5-9a25-6b0fbee88b01",
      "qty": 3,
      "unit_cost": "3528.00",
      "as_of_ts": "2025-10-11T02:45:05.257471+00:00",
      "source": "import",
      "created_at": "2025-10-11T02:45:05.257471+00:00"
    },
    {
      "soh_id": "5a451c5e-d1cb-4f61-9764-e2282d7d0e71",
      "location_id": "1c53259f-70ef-4e25-8b99-5ecbe4b82eeb",
      "supplier_product_id": "06b11c7e-dc4b-4e19-8c5d-713e47210197",
      "qty": 2,
      "unit_cost": "50.00",
      "as_of_ts": "2025-10-11T02:41:50.817256+00:00",
      "source": "import",
      "created_at": "2025-10-11T02:41:50.817256+00:00"
    },
    {
      "soh_id": "473bf328-c26b-4043-8ca0-4706bece53bb",
      "location_id": "1c53259f-70ef-4e25-8b99-5ecbe4b82eeb",
      "supplier_product_id": "79c6ce79-7c94-4355-ba58-7e3badc3c1ce",
      "qty": 4,
      "unit_cost": "52.00",
      "as_of_ts": "2025-10-11T02:41:47.352257+00:00",
      "source": "import",
      "created_at": "2025-10-11T02:41:47.352257+00:00"
    },
    {
      "soh_id": "8fb13a9c-4028-4067-8a2b-27da3d883ddd",
      "location_id": "1c53259f-70ef-4e25-8b99-5ecbe4b82eeb",
      "supplier_product_id": "8c46cfe5-5abb-4e23-8466-9ba9e7920912",
      "qty": 1,
      "unit_cost": "11.00",
      "as_of_ts": "2025-10-11T02:41:48.057585+00:00",
      "source": "import",
      "created_at": "2025-10-11T02:41:48.057585+00:00"
    },
    {
      "soh_id": "806d74e0-5b4b-4736-ad7b-3339fac49157",
      "location_id": "1c53259f-70ef-4e25-8b99-5ecbe4b82eeb",
      "supplier_product_id": "cd9f982b-bbd7-47d5-b0ee-9a133ed50afc",
      "qty": 4,
      "unit_cost": "48.00",
      "as_of_ts": "2025-10-11T02:41:49.432666+00:00",
      "source": "import",
      "created_at": "2025-10-11T02:41:49.432666+00:00"
    },
    {
      "soh_id": "3bfaf770-2462-4f97-8bd6-af8ec5e9a7dd",
      "location_id": "1c53259f-70ef-4e25-8b99-5ecbe4b82eeb",
      "supplier_product_id": "d385fb3d-f740-409a-9fd1-643fda12e018",
      "qty": 2,
      "unit_cost": "13.00",
      "as_of_ts": "2025-10-11T02:41:48.73805+00:00",
      "source": "import",
      "created_at": "2025-10-11T02:41:48.73805+00:00"
    }
  ]$$::jsonb) AS row
)
INSERT INTO core.stock_on_hand (
  soh_id,
  location_id,
  supplier_product_id,
  qty,
  unit_cost,
  as_of_ts,
  source,
  created_at
)
SELECT
  (row->>'soh_id')::uuid,
  (row->>'location_id')::uuid,
  (row->>'supplier_product_id')::uuid,
  (row->>'qty')::integer,
  (row->>'unit_cost')::numeric,
  (row->>'as_of_ts')::timestamptz,
  row->>'source',
  (row->>'created_at')::timestamptz
FROM payload
ON CONFLICT (soh_id) DO NOTHING;

-- Seed core.inventory_selection
WITH payload AS (
  SELECT jsonb_array_elements($$[
    {
      "selection_id": "193e6e68-991a-42a1-bbbb-fed1004a7a84",
      "selection_name": "E2E Test Selection - 20251011_123540",
      "description": "End-to-end test of ISI workflow for P1 incident verification",
      "created_by": "00000000-0000-0000-0000-000000000000",
      "created_at": "2025-10-11T10:35:43.736967+00:00",
      "status": "active",
      "valid_from": null,
      "valid_to": null,
      "updated_at": "2025-10-11T10:39:06.757287+00:00"
    },
    {
      "selection_id": "cea2be6f-de9a-4d8b-ba60-a6967002d15d",
      "selection_name": "aug25",
      "description": "Created via ISI Wizard",
      "created_by": "00000000-0000-0000-0000-000000000000",
      "created_at": "2025-10-11T03:24:36.89015+00:00",
      "status": "draft",
      "valid_from": null,
      "valid_to": null,
      "updated_at": "2025-10-11T03:24:36.89015+00:00"
    }
  ]$$::jsonb) AS row
)
INSERT INTO core.inventory_selection (
  selection_id,
  selection_name,
  description,
  created_by,
  created_at,
  status,
  valid_from,
  valid_to,
  updated_at
)
SELECT
  (row->>'selection_id')::uuid,
  row->>'selection_name',
  row->>'description',
  (row->>'created_by')::uuid,
  (row->>'created_at')::timestamptz,
  row->>'status',
  NULLIF(row->>'valid_from', '')::timestamptz,
  NULLIF(row->>'valid_to', '')::timestamptz,
  (row->>'updated_at')::timestamptz
FROM payload
ON CONFLICT (selection_id) DO NOTHING;

-- Seed core.inventory_selected_item
WITH payload AS (
  SELECT jsonb_array_elements($$[
    {
      "selection_item_id": "0f16278c-b64e-4517-a05c-5e81e0a1e6f4",
      "selection_id": "193e6e68-991a-42a1-bbbb-fed1004a7a84",
      "supplier_product_id": "06b11c7e-dc4b-4e19-8c5d-713e47210197",
      "status": "selected",
      "notes": "Test selection for E2E workflow verification",
      "selected_at": "2025-10-11T10:36:35.687208+00:00",
      "selected_by": "00000000-0000-0000-0000-000000000000",
      "quantity_min": null,
      "quantity_max": null,
      "reorder_point": null,
      "updated_at": "2025-10-11T10:36:35.687208+00:00"
    },
    {
      "selection_item_id": "25beb48f-5945-415f-b1d9-11da8505ff24",
      "selection_id": "193e6e68-991a-42a1-bbbb-fed1004a7a84",
      "supplier_product_id": "8c46cfe5-5abb-4e23-8466-9ba9e7920912",
      "status": "selected",
      "notes": "Test selection for E2E workflow verification",
      "selected_at": "2025-10-11T10:36:35.687208+00:00",
      "selected_by": "00000000-0000-0000-0000-000000000000",
      "quantity_min": null,
      "quantity_max": null,
      "reorder_point": null,
      "updated_at": "2025-10-11T10:36:35.687208+00:00"
    },
    {
      "selection_item_id": "840cd8da-2c06-4119-81e3-47932fb72595",
      "selection_id": "193e6e68-991a-42a1-bbbb-fed1004a7a84",
      "supplier_product_id": "cd9f982b-bbd7-47d5-b0ee-9a133ed50afc",
      "status": "selected",
      "notes": "Test selection for E2E workflow verification",
      "selected_at": "2025-10-11T10:36:35.687208+00:00",
      "selected_by": "00000000-0000-0000-0000-000000000000",
      "quantity_min": null,
      "quantity_max": null,
      "reorder_point": null,
      "updated_at": "2025-10-11T10:36:35.687208+00:00"
    },
    {
      "selection_item_id": "b6c4c50a-c2a3-4af6-b0ba-7f0d94d2966e",
      "selection_id": "193e6e68-991a-42a1-bbbb-fed1004a7a84",
      "supplier_product_id": "79c6ce79-7c94-4355-ba58-7e3badc3c1ce",
      "status": "selected",
      "notes": "Test selection for E2E workflow verification",
      "selected_at": "2025-10-11T10:36:35.687208+00:00",
      "selected_by": "00000000-0000-0000-0000-000000000000",
      "quantity_min": null,
      "quantity_max": null,
      "reorder_point": null,
      "updated_at": "2025-10-11T10:36:35.687208+00:00"
    },
    {
      "selection_item_id": "bb358bae-8525-4a47-b5e1-7b2c1e35d875",
      "selection_id": "193e6e68-991a-42a1-bbbb-fed1004a7a84",
      "supplier_product_id": "d385fb3d-f740-409a-9fd1-643fda12e018",
      "status": "selected",
      "notes": "Test selection for E2E workflow verification",
      "selected_at": "2025-10-11T10:36:35.687208+00:00",
      "selected_by": "00000000-0000-0000-0000-000000000000",
      "quantity_min": null,
      "quantity_max": null,
      "reorder_point": null,
      "updated_at": "2025-10-11T10:36:35.687208+00:00"
    }
  ]$$::jsonb) AS row
)
INSERT INTO core.inventory_selected_item (
  selection_item_id,
  selection_id,
  supplier_product_id,
  status,
  notes,
  selected_at,
  selected_by,
  quantity_min,
  quantity_max,
  reorder_point,
  updated_at
)
SELECT
  (row->>'selection_item_id')::uuid,
  (row->>'selection_id')::uuid,
  (row->>'supplier_product_id')::uuid,
  row->>'status',
  row->>'notes',
  (row->>'selected_at')::timestamptz,
  (row->>'selected_by')::uuid,
  NULLIF(row->>'quantity_min', '')::integer,
  NULLIF(row->>'quantity_max', '')::integer,
  NULLIF(row->>'reorder_point', '')::integer,
  (row->>'updated_at')::timestamptz
FROM payload
ON CONFLICT (selection_item_id) DO NOTHING;

COMMIT;

INSERT INTO schema_migrations (migration_name)
VALUES ('0208_seed_core_tables')
ON CONFLICT (migration_name) DO NOTHING;
