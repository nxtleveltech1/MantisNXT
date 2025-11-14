# Neon MCP (Managed Connection Pooler) — Database Setup

## Overview
- Primary DB is Neon with Managed Connection Pooler (MCP).
- Connection string must use the Neon pooler endpoint and `sslmode=require`.
- The app uses a production-grade Pg pool with circuit breaker, slow-query logging, and transaction helpers.

## Environment Variables
- `DATABASE_URL` or `ENTERPRISE_DATABASE_URL`: `postgresql://<user>:<password>@<neon-host>-pooler.<region>.neon.tech/<db>?sslmode=require`
- `DB_POOL_MIN`/`DB_POOL_MAX`: base pool sizing (default `5`/`20`).
- `DB_POOL_IDLE_TIMEOUT`/`DB_POOL_CONNECTION_TIMEOUT`: ms (defaults `30000`/`120000`).
- Optional enterprise overrides (preferred for MCP tuning):
  - `ENTERPRISE_DB_POOL_MIN` / `ENTERPRISE_DB_POOL_MAX`
  - `ENTERPRISE_DB_IDLE_TIMEOUT` / `ENTERPRISE_DB_CONNECTION_TIMEOUT`
  - `ENTERPRISE_DB_STATEMENT_TIMEOUT_MS` (default `30000`)
  - `ENTERPRISE_DB_IDLE_TX_TIMEOUT_MS` (default `60000`)
  - `ENTERPRISE_DB_KEEPALIVE` (default `true`)
  - `ENTERPRISE_DB_KEEPALIVE_DELAY_MS` (default `30000`)
  - `ENTERPRISE_DB_MAX_USES` (optional, recommended ~`7500`)

## Pool Configuration
- Driver: `pg` (`Pool`), created in `lib/database/enterprise-connection-manager.ts`.
- SSL: enabled when `sslmode=require` or `NODE_ENV=production`.
- Session parameters on connect:
  - `SET search_path TO public, core, "$user"`
  - `SET statement_timeout = <ENTERPRISE_DB_STATEMENT_TIMEOUT_MS>`
  - `SET idle_in_transaction_session_timeout = <ENTERPRISE_DB_IDLE_TX_TIMEOUT_MS>`

## Usage
- Import from `@/lib/database`:
  - `query(text, params?)` for single statements
  - `withTransaction(async client => { ... })` for transactional work
  - `testConnection()` for health checks
  - `getPoolStatus()` for live metrics

## Error Handling & Logging
- Centralized in `enterprise-connection-manager`:
  - Circuit breaker (open/half-open/closed) with thresholds and backoff
  - Slow-query logging (fingerprints, duration stats)
  - Structured error logs for acquire/query/release phases
- API routes should use `src/lib/utils/neon-error-handler.ts` to map errors to user-friendly responses.

## Neon-Specific Notes
- Use the pooler endpoint for connection reuse and lower latency.
- Always enforce TLS: `sslmode=require`.
- Recommended `statement_timeout` 30–60s, adjust per workload.
- For sustained high throughput, set `ENTERPRISE_DB_MAX_USES` to recycle clients periodically.

## Health & Diagnostics
- Use `testConnection()` and `getPoolStatus()` to monitor connectivity and pool metrics.
- Query metrics available via `dbManager.getQueryMetrics()` for slow query analysis.

## Transactions
- Wrap multi-statement operations in `withTransaction()` to ensure atomicity with automatic rollback on errors.

## Examples
```ts
import { query, withTransaction, testConnection } from '@/lib/database';

// Read
const { rows } = await query('SELECT * FROM customer WHERE org_id = $1 LIMIT $2', [orgId, 50]);

// Write in transaction
await withTransaction(async (client) => {
  await client.query('INSERT INTO audit_log (org_id, action) VALUES ($1, $2)', [orgId, 'sync_start']);
  await client.query('UPDATE integration_connector SET last_sync_at = NOW() WHERE id = $1', [connectorId]);
});

// Health
const health = await testConnection();
```

