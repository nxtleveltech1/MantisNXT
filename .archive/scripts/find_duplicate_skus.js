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

  const recordsByKey = new Map();

  for await (const record of parser) {
    const supplier = (record['Supplier Name'] || '').trim();
    const sku = (record['SKU / MODEL'] || '').trim();
    if (!sku) continue;
    const key = `${supplier}|${sku}`;
    if (!recordsByKey.has(key)) {
      recordsByKey.set(key, []);
    }
    recordsByKey.get(key).push(record);
  }

  const duplicates = Array.from(recordsByKey.entries()).filter(([, records]) => records.length > 1);
  console.log(`Total duplicate (supplier, sku) combos: ${duplicates.length}`);
  for (const [key, records] of duplicates) {
    console.log(`\nDuplicate for ${key}:`);
    records.forEach((record, index) => {
      console.log(`  Record ${index + 1}:`, record);
    });
  }
})();
