const fs = require("fs");
const path = require("path");
const parse = require("csv-parse");
const { Pool } = require("pg");
require("dotenv").config({ path: ".env.local" });

const CSV_PATH = process.argv[2] ? path.resolve(process.argv[2]) : path.join(__dirname, '..', 'database', 'FULL FINAL.csv');
const EXPECTED_HEADERS = [
  "Supplier Name",
  "Supplier Code",
  "Produt Category",
  "BRAND",
  "Brand Sub Tag",
  "SKU / MODEL",
  "PRODUCT DESCRIPTION",
  "SUPPLIER SOH",
  "COST  EX VAT",
  "QTY ON ORDER",
  "NEXT SHIPMENT",
  "Tags",
  "LINKS"
];
const MAX_SKU_LENGTH = 96;
const MAX_NAME_LENGTH = 255;
const MAX_BRAND_LENGTH = 100;
const MAX_CATEGORY_LENGTH = 100;
const MAX_SUPPLIER_SKU_LENGTH = 100;
const MAX_NOTES_LENGTH = 255;
const MAX_TAG_LENGTH = 100;

const OVERRIDE_NAME_MAP = new Map([
  ["active music distrabutors", "active music distribution"],
  ["rockit", "rockit distribution"],
  ["sennheiser", "sennheiser south africa"],
  ["sonic informed", "sonicinformed"],
  ["yamaha", "yamaha music south africa"],
]);

function normalizeName(value) {
  if (!value) return "";
  return value.trim().toLowerCase().replace(/\s+/g, " ");
}

function sanitizeSegment(value) {
  if (!value) return "";
  return value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .toUpperCase();
}

function parseNumber(value) {
  if (!value) return null;
  const cleaned = value
    .toString()
    .trim()
    .replace(/[RrZARzar]/g, "")
    .replace(/\s+/g, "");
  if (!cleaned) return null;
  let adjusted = cleaned;
  if (cleaned.includes(",") && cleaned.includes(".")) {
    adjusted = cleaned.replace(/,/g, "");
  } else if (cleaned.includes(",")) {
    adjusted = cleaned.replace(/,/g, ".");
  }
  const parsed = parseFloat(adjusted);
  return Number.isFinite(parsed) ? parsed : null;
}

function parseInteger(value) {
  const number = parseNumber(value);
  return number === null ? null : Math.round(number);
}

function parseTags(value) {
  if (!value) return [];
  return value
    .split(/[,;]+/)
    .map((tag) => tag.trim())
    .filter(Boolean)
    .map((tag) => truncate(tag, MAX_TAG_LENGTH));
}

function buildCustomFields(record, qtyOnOrder) {
  const customFields = {};
  const supplierCode = (record["Supplier Code"] || "").trim();
  const brandSubTag = (record["Brand Sub Tag"] || "").trim();
  const nextShipment = (record["NEXT SHIPMENT"] || "").trim();
  const linksRaw = (record["LINKS"] || "").trim();

  if (supplierCode) customFields.csvSupplierCode = supplierCode;
  if (brandSubTag) customFields.brandSubTag = brandSubTag;
  if (qtyOnOrder !== null && qtyOnOrder !== undefined) customFields.qtyOnOrder = qtyOnOrder;
  if (nextShipment) customFields.nextShipment = nextShipment;
  if (linksRaw) {
    customFields.links = linksRaw.split(/\s+/).filter(Boolean).map((link) => truncate(link, 200));
  }

  return Object.keys(customFields).length > 0 ? customFields : null;
}

function createName({ description, rawSku, brand, supplierName }) {
  if (description) return truncate(description, MAX_NAME_LENGTH);
  if (rawSku) return truncate(rawSku, MAX_NAME_LENGTH);
  if (brand && rawSku) return truncate(`${brand} ${rawSku}`, MAX_NAME_LENGTH);
  return truncate(`${supplierName} Item`, MAX_NAME_LENGTH);
}

function truncate(value, maxLength) {
  if (value === null || value === undefined) return value;
  const stringValue = value.toString();
  return stringValue.length <= maxLength ? stringValue : stringValue.slice(0, maxLength);
}

function buildUniqueSku(base, seen, autoCounter) {
  let attempt = base;
  while (true) {
    const candidate = truncate(attempt, MAX_SKU_LENGTH);
    if (!seen.has(candidate)) {
      seen.add(candidate);
      return candidate;
    }
    autoCounter.value += 1;
    attempt = `${base}-${autoCounter.value}`;
  }
}

async function loadSuppliers(client) {
  const { rows } = await client.query(`
    SELECT id, supplier_code, name, supplier_name, company_name
    FROM suppliers
  `);

  const map = new Map();

  for (const row of rows) {
    const names = new Set([
      row.name,
      row.supplier_name,
      row.company_name,
      row.supplier_code,
    ].filter(Boolean));

    for (const name of names) {
      map.set(normalizeName(name), row);
    }
  }

  return map;
}

async function parseCsv(supplierMap) {
  const parser = fs
    .createReadStream(CSV_PATH)
    .pipe(parse.parse({
      delimiter: ";",
      columns: (header) => header.map((h) => h.trim()),
      skip_empty_lines: true,
      relax_column_count: true,
      relax_quotes: true,
      trim: true,
    }));

  const items = [];
  const seenSkus = new Set();
  const counters = {
    total: 0,
    inserted: 0,
    skippedBlankSku: 0,
    skippedUnknownSupplier: 0,
    skippedHeaderRow: 0,
  };
  const autoCounter = { value: 0 };
  let headers = null;

  for await (const record of parser) {
    counters.total += 1;

    if (!headers) {
      headers = Object.keys(record);
      const headerMismatch = headers.length !== EXPECTED_HEADERS.length || headers.some((header, index) => header !== EXPECTED_HEADERS[index]);
      if (headerMismatch) {
        throw new Error(`CSV header mismatch. Expected ${EXPECTED_HEADERS.join(" | ")}, got ${headers.join(" | ")}`);
      }
    }

    const rawSupplierName = (record["Supplier Name"] || "").trim();
    const normalizedSupplierName = normalizeName(rawSupplierName);
    let lookupName = normalizedSupplierName;
    if (OVERRIDE_NAME_MAP.has(normalizedSupplierName)) {
      lookupName = OVERRIDE_NAME_MAP.get(normalizedSupplierName);
    }

    const supplierRow = supplierMap.get(lookupName);
    if (!supplierRow) {
      counters.skippedUnknownSupplier += 1;
      continue;
    }

    const rawSku = (record["SKU / MODEL"] || "").trim();
    if (!rawSku) {
      counters.skippedBlankSku += 1;
      continue;
    }

    const description = (record["PRODUCT DESCRIPTION"] || "").trim();
    if (/^item (no\.|description)$/i.test(description)) {
      counters.skippedHeaderRow += 1;
      continue;
    }

    const supplierCodeCsv = (record["Supplier Code"] || "").trim();
    const codeSegment = sanitizeSegment(supplierCodeCsv || supplierRow.supplier_code || rawSupplierName || "SUPPLIER") || "SUPPLIER";
    const skuSegmentRaw = sanitizeSegment(rawSku) || `SKU${++autoCounter.value}`;
    const baseSku = `${codeSegment}-${skuSegmentRaw}`;
    const uniqueSku = buildUniqueSku(baseSku, seenSkus, autoCounter);

    const costPrice = parseNumber(record["COST  EX VAT"]) ?? 0;
    const stockQty = parseInteger(record["SUPPLIER SOH"]) ?? 0;
    const qtyOnOrder = parseInteger(record["QTY ON ORDER"]);
    const tags = parseTags(record["Tags"]);
    const customFields = buildCustomFields(record, qtyOnOrder);
    const linksRaw = (record["LINKS"] || "").trim();
    const notes = linksRaw ? truncate(`Links: ${linksRaw}`, MAX_NOTES_LENGTH) : null;

    const itemName = createName({
      description,
      rawSku,
      brand: (record["BRAND"] || "").trim(),
      supplierName: rawSupplierName,
    });

    items.push({
      sku: uniqueSku,
      name: itemName,
      description: description || null,
      category: truncate((record["Produt Category"] || "").trim(), MAX_CATEGORY_LENGTH) || null,
      brand: truncate((record["BRAND"] || "").trim(), MAX_BRAND_LENGTH) || null,
      supplier_id: supplierRow.id,
      supplier_sku: truncate(rawSku, MAX_SUPPLIER_SKU_LENGTH) || null,
      cost_price: costPrice,
      sale_price: costPrice,
      currency: "ZAR",
      stock_qty: stockQty,
      reserved_qty: 0,
      reorder_point: 0,
      max_stock: null,
      unit: "each",
      tags: tags.length ? tags : null,
      status: "active",
      tax_rate: 0.15,
      custom_fields: customFields,
      notes,
      product_name: itemName,
      unit_price: costPrice,
      current_stock: stockQty,
      unit_cost: costPrice,
      reorder_level: 0,
      ai_risk_score: 0,
      selling_price: costPrice,
    });
    counters.inserted += 1;
  }

  return { items, counters };
}

async function insertItems(client, items) {
  if (!items.length) return;

  const columns = [
    "sku",
    "name",
    "description",
    "category",
    "brand",
    "supplier_id",
    "supplier_sku",
    "cost_price",
    "sale_price",
    "currency",
    "stock_qty",
    "reserved_qty",
    "reorder_point",
    "max_stock",
    "unit",
    "tags",
    "status",
    "tax_rate",
    "custom_fields",
    "notes",
    "product_name",
    "unit_price",
    "current_stock",
    "unit_cost",
    "reorder_level",
    "ai_risk_score",
    "selling_price",
  ];

  const batchSize = 1000;
  for (let i = 0; i < items.length; i += batchSize) {
    const batch = items.slice(i, i + batchSize);
    const values = [];
    const placeholders = batch.map((item, batchIndex) => {
      columns.forEach((column) => {
        const value = item[column];
        if (column === "custom_fields" && value) {
          values.push(JSON.stringify(value));
        } else {
          values.push(value);
        }
      });
      const offset = batchIndex * columns.length;
      const placeholder = columns.map((_, colIndex) => `$${offset + colIndex + 1}`);
      return `(${placeholder.join(", ")})`;
    });

    const sql = `
      INSERT INTO inventory_items (${columns.join(", ")})
      VALUES ${placeholders.join(", ")}
    `;
    await client.query(sql, values);
  }
}

async function main() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    max: 5,
    idleTimeoutMillis: 30000,
  });

  const client = await pool.connect();

  try {
    console.log("Loading supplier mappings...");
    const supplierMap = await loadSuppliers(client);

    console.log("Parsing CSV and preparing records...");
    const { items, counters } = await parseCsv(supplierMap);
    console.log("CSV parsing summary:", counters);
    console.log(`Prepared ${items.length} inventory items for insertion.`);

    if (items.length === 0) {
      console.log("No items to insert.");
      return;
    }

    await client.query("BEGIN");
    await insertItems(client, items);
    await client.query("ANALYZE inventory_items;");
    await client.query("COMMIT");

    console.log("Inventory import completed successfully.");
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("Inventory import failed:", error.message);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

if (require.main === module) {
  main().catch((error) => {
    console.error(error);
    process.exit(1);
  });
}

module.exports = { main };
