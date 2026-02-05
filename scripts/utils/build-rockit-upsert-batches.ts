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
  "C:\\\\Users\\\\garet\\\\Downloads\\\\Rock It - extracted data ready.xlsx";
const DEFAULT_OUT =
  "C:\\\\Users\\\\garet\\\\.cursor\\\\projects\\\\e-00Project-MantisNXT\\\\agent-tools\\\\rockit-batches.json";

const BRAND_MAP: Record<string, string> = {
  "FOCUSRITE": "Focusrite",
  "FOCUSRITE PRO": "Focusrite Pro",
  "GRETSCH DRUMS": "Gretsch",
  "MEINL": "Meinl Byzance Cymbals",
  "D'ADDARIO": "D'Addario XS & XT Strings",
  "D'ADDARIO WOODWIND": "D'Addario XS & XT Strings",
  "LR BAGGS": "LR Baggs",
  "ADAM AUDIO": "Adam Audio",
  "AUSTRIAN AUDIO": "Austrian Audio",
  "CF MARTIN": "CF Martin",
  "PRS": "PRS",
  "NOVATION": "Novation",
};

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

function findHeaderRow(rows: unknown[][]): number {
  for (let i = 0; i < rows.length; i += 1) {
    const row = rows[i]?.map(cell =>
      typeof cell === "string" ? cell.trim().toLowerCase() : cell
    );
    if (!row) continue;
    const hasBrand = row.includes("brand");
    const hasCode = row.includes("code");
    const hasDescription = row.includes("description");
    const hasCost = row.some(
      cell =>
        typeof cell === "string" &&
        cell.toLowerCase().includes("inc vat")
    );
    if (hasBrand && hasCode && hasDescription && hasCost) return i;
  }
  return -1;
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

  const headerRowIndex = findHeaderRow(rows);
  if (headerRowIndex === -1) {
    throw new Error("Could not find product header row.");
  }
  const headerRow = rows[headerRowIndex] ?? [];
  const brandIndex = headerRow.findIndex(
    cell => typeof cell === "string" && cell.trim().toLowerCase() === "brand"
  );
  const codeIndex = headerRow.findIndex(
    cell => typeof cell === "string" && cell.trim().toLowerCase() === "code"
  );
  const descriptionIndex = headerRow.findIndex(
    cell => typeof cell === "string" && cell.trim().toLowerCase() === "description"
  );
  const costIndex = headerRow.findIndex(
    cell =>
      typeof cell === "string" && cell.trim().toLowerCase().includes("inc vat")
  );

  if (brandIndex === -1 || codeIndex === -1 || descriptionIndex === -1 || costIndex === -1) {
    throw new Error("Missing one or more product column headers.");
  }

  const products: ProductRow[] = [];
  for (let i = headerRowIndex + 1; i < rows.length; i += 1) {
    const row = rows[i] ?? [];
    const sku = normalizeText(row[codeIndex]);
    const brand = normalizeText(row[brandIndex]);
    const description = normalizeText(row[descriptionIndex]);
    const costIncVat = parseNumber(row[costIndex]);
    if (!sku || !description || costIncVat == null) continue;
    products.push({ brand, sku, description, costIncVat });
  }
  return products;
}

function normalizeBrand(rawBrand: string): string {
  const upper = rawBrand.toUpperCase().trim();
  return BRAND_MAP[upper] ?? rawBrand.trim();
}

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

function buildBatchSql(
  supplierId: string,
  rows: ProductRow[],
  batchIndex: number
): BatchOutput {
  const records = rows.map(row => {
    const brand = normalizeBrand(row.brand);
    const costEx = round2(row.costIncVat / 1.15);
    return {
      sku: row.sku,
      brand,
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
    throw new Error("Usage: build-rockit-upsert-batches.ts <supplierId> [filePath] [batchSize] [outPath]");
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
    new Set(products.map(row => normalizeBrand(row.brand)).filter(Boolean))
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
  console.log(`Wrote ${batches.length} batches to ${outPath}`);
}

main();
