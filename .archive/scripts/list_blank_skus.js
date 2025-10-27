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

  let printed = 0;
  for await (const record of parser) {
    const sku = (record['SKU / MODEL'] || '').trim();
    if (!sku) {
      console.log(record);
      printed += 1;
      if (printed >= 5) break;
    }
  }
})();
