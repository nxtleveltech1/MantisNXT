const fs = require("fs");
const path = require("path");
const { Pool } = require("pg");

// Use the same connection details as lib/database/connection.ts
const dbConfig = {
  user: "nxtdb_admin",
  password: "P@33w0rd-1",
  host: "62.169.20.53",
  port: 6600,
  database: "nxtprod-db_001",
  ssl: false,
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
};

async function applySchema() {
  const pool = new Pool(dbConfig);
  const client = await pool.connect();
  try {
    const schemaPath = path.resolve(
      __dirname,
      "..",
      "database",
      "schema",
      "final_schema.sql"
    );
    const sql = fs.readFileSync(schemaPath, "utf8");

    console.log(`Applying schema from: ${schemaPath}`);
    const start = Date.now();
    // Split SQL into executable statements while respecting $$ function bodies and single quotes
    function splitSqlStatements(input) {
      const stmts = [];
      let current = "";
      let inSingle = false;
      let inDollar = false;
      let dollarTag = "";
      for (let i = 0; i < input.length; i++) {
        const ch = input[i];
        const next2 = input.slice(i, i + 2);
        if (!inSingle && !inDollar && next2 === "--") {
          // line comment
          const nl = input.indexOf("\n", i + 2);
          current += input.slice(i, nl === -1 ? input.length : nl + 1);
          i = (nl === -1 ? input.length : nl) - 1;
          continue;
        }
        if (!inSingle && ch === "$") {
          // Possible start of dollar-quote
          const match = input.slice(i).match(/^\$[A-Za-z0-9_]*\$/);
          if (match) {
            inDollar = true;
            dollarTag = match[0];
            current += match[0];
            i += match[0].length - 1;
            continue;
          }
        }
        if (inDollar) {
          // Look for closing tag
          if (input.slice(i, i + dollarTag.length) === dollarTag) {
            inDollar = false;
            current += dollarTag;
            i += dollarTag.length - 1;
            continue;
          } else {
            current += ch;
            continue;
          }
        }
        if (ch === "'") {
          inSingle = !inSingle;
          current += ch;
          continue;
        }
        if (ch === ";" && !inSingle) {
          const trimmed = current.trim();
          if (trimmed.length > 0) stmts.push(trimmed);
          current = "";
        } else {
          current += ch;
        }
      }
      const trimmed = current.trim();
      if (trimmed.length > 0) stmts.push(trimmed);
      return stmts;
    }

    // Separate core schema from CREATE INDEX statements to avoid immutability errors blocking the run
    const indexRegex = /CREATE\s+(?:UNIQUE\s+)?INDEX[\s\S]*?;/gi;
    const indexStatements = (sql.match(indexRegex) || []).map((s) => s.trim());
    const coreSql = sql.replace(
      indexRegex,
      "\n-- [INDEX REMOVED FOR SEPARATE APPLY]\n"
    );

    // Apply core SQL in a single transaction
    await client.query("BEGIN");
    await client.query("SET search_path TO public, auth");
    try {
      await client.query(coreSql);
    } catch (err) {
      console.error("\n❌ Error applying core schema");
      if (err && err.position) {
        const pos = Number(err.position);
        const start = Math.max(0, pos - 200);
        const end = Math.min(coreSql.length, pos + 200);
        const snippet = coreSql.substring(start, end);
        console.error(
          "\n--- Error context (around position " + pos + ") ---\n"
        );
        console.error(snippet);
        console.error("\n--- End context ---\n");
      }
      throw err;
    }
    await client.query("COMMIT");

    console.log(
      `Core schema applied. Now applying ${indexStatements.length} indexes...`
    );

    let created = 0;
    let skipped = 0;
    for (const idxStmt of indexStatements) {
      try {
        await client.query(idxStmt);
        created++;
      } catch (err) {
        skipped++;
        console.warn("\n⚠️  Skipping index due to error:");
        console.warn(idxStmt.substring(0, 800));
        console.warn("Reason:", err.message);
      }
    }
    console.log(`Indexes created: ${created}, skipped: ${skipped}`);
    const ms = Date.now() - start;
    console.log(`✅ Schema applied successfully in ${ms} ms`);

    // Verify a few core objects exist
    const checks = [
      "SELECT to_regclass('public.organization') AS exists",
      "SELECT to_regclass('public.inventory_item') AS exists",
      "SELECT to_regclass('public.supplier') AS exists",
      "SELECT to_regclass('public.ai_conversation') AS exists",
      "SELECT to_regclass('public.customer') AS exists",
      "SELECT to_regclass('public.dashboard') AS exists",
      "SELECT to_regclass('auth.users') AS exists",
    ];
    for (const q of checks) {
      const res = await client.query(q);
      console.log(q, "->", res.rows[0].exists);
    }
  } catch (err) {
    try {
      await client.query("ROLLBACK");
    } catch (_) {}
    console.error("❌ Failed to apply schema:", err.message);
    process.exitCode = 1;
  } finally {
    client.release();
    await pool.end();
  }
}

applySchema();
