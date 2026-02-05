import fs from "fs";
import xlsx from "xlsx";

type ProductRow = {
  brand: string;
  sku: string;
  description: string;
  costIncVat: number;
};

type BatchOutput = {
  batchIndex: number;
  rowCount: number;
  sql: string;
};

const DEFAULT_FILE =
  "C:\\Users\\garet\\Downloads\\MD - Data Ready.xlsx";
const DEFAULT_OUT =
  "C:\\Users\\garet\\.cursor\\projects\\e-00Project-MantisNXT\\agent-tools\\md-batches.json";

function normalizeText(value: unknown): string {
  if (value == null) return "";
  return String(value).trim();
}

function parseNumber(value: unknown): number | null {
  if (typeof value === "number") return value;
  if (typeof value !== "string") return null;
  const cleaned = value.replace(/[, ]/g, "").trim();
  if (!cleaned) return null;
  const parsed = Number(cleaned);
  return Number.isFinite(parsed) ? parsed : null;
}

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

function parseProducts(filePath: string): ProductRow[] {
  const workbook = xlsx.readFile(filePath, { cellDates: true });
  const sheetName = workbook.SheetNames[0];
  if (!sheetName) throw new Error("No sheets found in workbook.");
  const sheet = workbook.Sheets[sheetName];
  const rows = xlsx.utils.sheet_to_json(sheet, {
    header: 1,
    raw: true,
    defval: null,
  }) as unknown[][];

  // MD file: header at row 0 [BRAND, SKU, DESCRIPTION, Cost INC VAT, Base Discount]
  // Find header row dynamically
  let headerRowIndex = -1;
  for (let i = 0; i < Math.min(10, rows.length); i++) {
    const row = rows[i]?.map((c) =>
      typeof c === "string" ? c.trim().toUpperCase() : c
    );
    if (!row) continue;
    if (row.includes("BRAND") && row.includes("SKU")) {
      headerRowIndex = i;
      break;
    }
  }
  if (headerRowIndex === -1) {
    throw new Error("Could not find header row with BRAND and SKU.");
  }

  const headerRow = (rows[headerRowIndex] ?? []).map((c) =>
    typeof c === "string" ? c.trim().toUpperCase() : ""
  );
  const brandIdx = headerRow.indexOf("BRAND");
  const skuIdx = headerRow.indexOf("SKU");
  const descIdx = headerRow.indexOf("DESCRIPTION");
  const costIdx = headerRow.findIndex((c) =>
    typeof c === "string" && c.includes("COST") && c.includes("VAT")
  );

  if (brandIdx === -1 || skuIdx === -1 || descIdx === -1 || costIdx === -1) {
    throw new Error(
      `Missing columns. Found: brand=${brandIdx} sku=${skuIdx} desc=${descIdx} cost=${costIdx}`
    );
  }

  const products: ProductRow[] = [];
  for (let i = headerRowIndex + 1; i < rows.length; i++) {
    const row = rows[i] ?? [];
    const brand = normalizeText(row[brandIdx]);
    const sku = normalizeText(row[skuIdx]);
    const description = normalizeText(row[descIdx]);
    const costIncVat = parseNumber(row[costIdx]);

    // Skip Grand Total or empty rows
    if (brand === "Grand Total" || !sku || !description || costIncVat == null)
      continue;

    products.push({ brand, sku, description, costIncVat });
  }
  return products;
}

function buildBatchSql(
  supplierId: string,
  rows: ProductRow[],
  batchIndex: number
): BatchOutput {
  const records = rows.map((row) => {
    const costEx = round2(row.costIncVat / 1.15);
    return {
      sku: row.sku,
      brand: row.brand,
      description: row.description,
      cost_inc: round2(row.costIncVat),
      cost_ex: costEx,
    };
  });

  const json = JSON.stringify(records).replace(/'/g, "''");
  const sql = `
WITH data AS (
  SELECT * FROM jsonb_to_recordset('${json}'::jsonb) AS t(
    sku text,
    brand text,
    description text,
    cost_inc numeric,
    cost_ex numeric
  )
)
INSERT INTO core.supplier_product (
  supplier_id,
  supplier_sku,
  name_from_supplier,
  uom,
  attrs_json,
  last_seen_at,
  is_active,
  updated_at
)
SELECT
  '${supplierId}'::uuid,
  t.sku,
  t.description,
  'EA',
  jsonb_build_object(
    'brand', t.brand,
    'description', t.description,
    'cost_excluding', t.cost_ex,
    'cost_including', t.cost_inc
  ),
  NOW(),
  true,
  NOW()
FROM data t
ON CONFLICT (supplier_id, supplier_sku) DO UPDATE
SET
  name_from_supplier = EXCLUDED.name_from_supplier,
  attrs_json = COALESCE(core.supplier_product.attrs_json, '{}'::jsonb) || EXCLUDED.attrs_json,
  last_seen_at = NOW(),
  is_active = true,
  updated_at = NOW();
`.trim();

  return { batchIndex, rowCount: records.length, sql };
}

function main() {
  const supplierId = process.argv[2];
  if (!supplierId) {
    throw new Error(
      "Usage: build-md-upsert-batches.ts <supplierId> [filePath] [batchSize] [outPath]"
    );
  }
  const filePath = process.argv[3] ?? DEFAULT_FILE;
  const batchSize = Number(process.argv[4] ?? 200);
  const outPath = process.argv[5] ?? DEFAULT_OUT;

  const products = parseProducts(filePath);
  const batches: BatchOutput[] = [];
  for (let i = 0; i < products.length; i += batchSize) {
    const chunk = products.slice(i, i + batchSize);
    batches.push(buildBatchSql(supplierId, chunk, batches.length + 1));
  }

  const uniqueBrands = Array.from(
    new Set(products.map((row) => row.brand).filter(Boolean))
  ).sort();

  const output = {
    supplierId,
    filePath,
    batchSize,
    totalRows: products.length,
    uniqueBrands,
    batches,
  };

  fs.writeFileSync(outPath, JSON.stringify(output, null, 2));
  console.log(
    `Wrote ${batches.length} batches (${products.length} products, ${uniqueBrands.length} brands) to ${outPath}`
  );
}

main();
