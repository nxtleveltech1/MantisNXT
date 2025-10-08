const fs = require("fs");
const path = require("path");
const parse = require("csv-parse");

const csvPath = path.join(__dirname, "..", "database", "FULL FINAL.csv");

(async () => {
  const parser = fs
    .createReadStream(csvPath)
    .pipe(parse.parse({
      delimiter: ";",
      columns: (header) => header.map((h) => h.trim()),
      skip_empty_lines: true,
      relax_column_count: true,
      relax_quotes: true,
      trim: true
    }));

  const counts = new Map();

  for await (const record of parser) {
    const sku = (record['SKU / MODEL'] || '').trim();
    if (!sku) continue;
    counts.set(sku, (counts.get(sku) || 0) + 1);
  }

  const duplicates = Array.from(counts.entries()).filter(([_, count]) => count > 1);
  console.log(`Total duplicate skus overall: ${duplicates.length}`);
  console.log(duplicates.slice(0, 20));
})();
