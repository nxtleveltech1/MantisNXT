#!/usr/bin/env bun
/**
 * Run a generated SOH import SQL file against the Neon DB in a single session.
 * Splits statements (respecting strings) and runs in order so temp tables persist.
 *
 * Usage: bun scripts/imports/run-soh-import-sql.ts <path-to-generated.sql>
 * Requires: DATABASE_URL or NEON_SPP_DATABASE_URL
 */

import { readFileSync } from 'fs';
import { resolve } from 'path';
import { Client } from 'pg';

function splitSqlStatements(sql: string): string[] {
  const statements: string[] = [];
  let current = '';
  let inSingle = false;
  let inDouble = false;
  let inLineComment = false;
  let inBlockComment = false;
  let dollarTag: string | null = null;

  for (let i = 0; i < sql.length; i++) {
    const ch = sql[i];
    const next = sql[i + 1];

    if (inLineComment) {
      current += ch;
      if (ch === '\n') inLineComment = false;
      continue;
    }
    if (inBlockComment) {
      current += ch;
      if (ch === '*' && next === '/') {
        current += next;
        i++;
        inBlockComment = false;
      }
      continue;
    }
    if (!dollarTag && !inSingle && !inDouble) {
      if (ch === '-' && next === '-') {
        inLineComment = true;
        current += ch + next;
        i++;
        continue;
      }
      if (ch === '/' && next === '*') {
        inBlockComment = true;
        current += ch + next;
        i++;
        continue;
      }
      const dollarMatch = sql.slice(i).match(/^\$[A-Za-z0-9_]*\$/);
      if (dollarMatch) {
        dollarTag = dollarMatch[0];
        current += dollarTag;
        i += dollarTag.length - 1;
        continue;
      }
    } else if (dollarTag && sql.startsWith(dollarTag, i)) {
      current += dollarTag;
      i += dollarTag.length - 1;
      dollarTag = null;
      continue;
    }
    if (!dollarTag) {
      if (ch === "'" && !inDouble) inSingle = !inSingle;
      if (ch === '"' && !inSingle) inDouble = !inDouble;
    }
    if (!inSingle && !inDouble && !dollarTag && ch === ';') {
      current += ch;
      if (current.trim()) statements.push(current.trim());
      current = '';
      continue;
    }
    current += ch;
  }
  if (current.trim()) statements.push(current.trim());
  return statements;
}

function main() {
  const file = process.argv[2];
  if (!file) {
    console.error('Usage: bun scripts/imports/run-soh-import-sql.ts <path-to-generated.sql>');
    process.exit(1);
  }

  const databaseUrl =
    process.env.DATABASE_URL || process.env.NEON_SPP_DATABASE_URL;
  if (!databaseUrl) {
    console.error('DATABASE_URL or NEON_SPP_DATABASE_URL is required');
    process.exit(1);
  }

  const abs = resolve(process.cwd(), file);
  const sql = readFileSync(abs, 'utf8');
  const statements = splitSqlStatements(sql);

  const client = new Client({ connectionString: databaseUrl });

  async function run() {
    await client.connect();
    try {
      await client.query('BEGIN');
      for (let i = 0; i < statements.length; i++) {
        const stmt = statements[i];
        const result = await client.query(stmt);
        if (result.rows?.[0] && i === statements.length - 1) {
          console.log('Final result:', result.rows[0]);
        }
      }
      await client.query('COMMIT');
      console.log(`SOH import completed (${statements.length} statements).`);
    } catch (e) {
      await client.query('ROLLBACK').catch(() => {});
      throw e;
    } finally {
      await client.end();
    }
  }

  run().catch((err) => {
    console.error('run-soh-import-sql failed:', err.message);
    process.exit(1);
  });
}

main();
