import xlsx from "xlsx";

type DiscountRow = {
  brand: string;
  discountPercent: number;
};

type ProductRow = {
  brand: string;
  sku: string;
  description: string;
  costIncVat: number;
};

function parsePercent(value: unknown): number | null {
  if (typeof value === "number") {
    return value <= 1 ? value * 100 : value;
  }
  if (typeof value !== "string") return null;
  const cleaned = value.replace("%", "").trim();
  if (!cleaned) return null;
  const parsed = Number(cleaned);
  if (!Number.isFinite(parsed)) return null;
  return parsed <= 1 ? parsed * 100 : parsed;
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

function findDiscountHeaderRow(rows: unknown[][], limit: number): number {
  for (let i = 0; i < Math.min(limit, rows.length); i += 1) {
    const row = rows[i]?.map(cell =>
      typeof cell === "string" ? cell.trim().toLowerCase() : cell
    );
    if (!row) continue;
    const hasCategory = row.some(
      cell => typeof cell === "string" && cell.includes("product category")
    );
    const hasDiscount = row.some(
      cell => typeof cell === "string" && cell.includes("discount")
    );
    if (hasCategory && hasDiscount) return i;
  }
  return -1;
}

function normalizeText(value: unknown): string {
  if (value == null) return "";
  return String(value).trim();
}

function main() {
  const filePath =
    process.argv[2] ?? "C:\\\\Users\\\\garet\\\\Downloads\\\\Rock It - extracted data ready.xlsx";
  const workbook = xlsx.readFile(filePath, { cellDates: true });
  const sheetName = workbook.SheetNames[0];
  if (!sheetName) {
    throw new Error("No sheets found in workbook.");
  }
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

  const discountHeaderRowIndex = findDiscountHeaderRow(rows, headerRowIndex);
  const discounts: DiscountRow[] = [];
  if (discountHeaderRowIndex !== -1) {
    const headerRow = rows[discountHeaderRowIndex] ?? [];
    const categoryIndex = headerRow.findIndex(
      cell =>
        typeof cell === "string" &&
        cell.trim().toLowerCase().includes("product category")
    );
    const discountIndex = headerRow.findIndex(
      cell =>
        typeof cell === "string" && cell.trim().toLowerCase().includes("discount")
    );
    if (categoryIndex !== -1 && discountIndex !== -1) {
      for (let i = discountHeaderRowIndex + 1; i < headerRowIndex; i += 1) {
        const row = rows[i] ?? [];
        const brand = normalizeText(row[categoryIndex]);
        const discountPercent = parsePercent(row[discountIndex]);
        if (!brand || discountPercent == null) continue;
        discounts.push({ brand, discountPercent });
      }
    }
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

  const result = {
    filePath,
    sheetName,
    headerRowIndex,
    discountHeaderRowIndex,
    discounts,
    products,
  };

  console.log(JSON.stringify(result, null, 2));
}

main();
