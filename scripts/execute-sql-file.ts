#!/usr/bin/env bun

/**
 * Execute SQL file via Neon MCP by reading it and executing in batches
 * This is a helper script - actual execution will be done via MCP tools
 */

import { readFileSync } from 'fs';
import { join } from 'path';

const sqlFile = join(process.cwd(), 'migrations', 'levels_2_5_only.sql');
const sql = readFileSync(sqlFile, 'utf-8');

console.log(`SQL file loaded: ${sql.length} characters`);
console.log(`\nFirst 500 characters:`);
console.log(sql.substring(0, 500));
console.log(`\nLast 200 characters:`);
console.log(sql.substring(sql.length - 200));

// Export for execution
export { sql };

