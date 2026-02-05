import fs from "fs";
import pg from "pg";

const BATCHES_PATH =
  process.argv[2] ??
  "C:\\Users\\garet\\.cursor\\projects\\e-00Project-MantisNXT\\agent-tools\\rockit-batches.json";

async function main() {
  const connStr = process.env.DATABASE_URL ?? process.env.NEON_DATABASE_URL;
  if (!connStr) {
    throw new Error("DATABASE_URL or NEON_DATABASE_URL env var required");
  }

  const client = new pg.Client({ connectionString: connStr, ssl: { rejectUnauthorized: false } });
  await client.connect();

  const raw = fs.readFileSync(BATCHES_PATH, "utf8");
  const data = JSON.parse(raw) as {
    totalRows: number;
    batches: { batchIndex: number; rowCount: number; sql: string }[];
  };

  console.log(
    `Executing ${data.batches.length} batches (${data.totalRows} total rows)...`
  );

  let totalInserted = 0;
  for (const batch of data.batches) {
    const start = Date.now();
    try {
      const result = await client.query(batch.sql);
      const elapsed = Date.now() - start;
      totalInserted += batch.rowCount;
      console.log(
        `  Batch ${batch.batchIndex}: ${batch.rowCount} rows OK (${elapsed}ms)`
      );
    } catch (err: any) {
      console.error(
        `  Batch ${batch.batchIndex} FAILED: ${err?.message ?? err}`
      );
      throw err;
    }
  }

  await client.end();
  console.log(`\nDone. Total rows upserted: ${totalInserted}`);
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
