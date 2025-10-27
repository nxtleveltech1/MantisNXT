const fs = require("fs");
const path = require("path");
const parse = require("csv-parse");

const csvPath = path.join(__dirname, "..", "database", "FULL FINAL.csv");

async function analyze() {
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

  const codeToNames = new Map();
  const nameCounts = new Map();
  const uniqueNames = new Set();
  let rowCount = 0;
  let headers = null;

  for await (const record of parser) {
    if (!headers) {
      headers = Object.keys(record);
    }
    rowCount += 1;
    const supplierName = record["Supplier Name"] || "";
    const supplierCode = record["Supplier Code"] || "";

    uniqueNames.add(supplierName);

    if (!codeToNames.has(supplierCode)) {
      codeToNames.set(supplierCode, new Set());
    }
    codeToNames.get(supplierCode).add(supplierName);
    nameCounts.set(supplierName, (nameCounts.get(supplierName) || 0) + 1);
  }

  console.log("Headers:", headers);
  console.log("Row count:", rowCount);
  console.log(`Unique supplier codes: ${codeToNames.size}`);
  console.log(`Unique supplier names: ${uniqueNames.size}`);
  console.log("Supplier code list:", Array.from(codeToNames.keys()).sort());
  console.log("Supplier name list:", Array.from(uniqueNames).sort());

  const topNames = Array.from(nameCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10);
  console.log("Top supplier name frequencies:");
  for (const [name, count] of topNames) {
    console.log(`- ${name}: ${count}`);
  }
}

analyze().catch((err) => {
  console.error(err);
  process.exit(1);
});
