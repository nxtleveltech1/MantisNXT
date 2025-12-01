import type { QueryResultRow } from 'pg';

import {
  query as coreQuery,
  withTransaction as coreTransaction,
} from '@/lib/database/unified-connection';
import { sppDb, sppQuery, sppWithTransaction } from '@/lib/database/spp-connection-manager';

export type DatabaseTenant = 'core' | 'spp';

export const coreDb = {
  query: coreQuery,
  transaction: coreTransaction,
};

export { sppDb };

export function getDbClient(tenant: DatabaseTenant) {
  return tenant === 'core' ? coreDb : sppDb;
}

export async function runOnCore<T extends QueryResultRow = QueryResultRow>(
  sql: string,
  params?: unknown[]
) {
  return coreQuery<T>(sql, params);
}

export async function runOnSpp<T extends QueryResultRow = QueryResultRow>(
  sql: string,
  params?: unknown[]
) {
  return sppQuery<T>(sql, params);
}

export const transactions = {
  core: coreTransaction,
  spp: sppWithTransaction,
};

export function resolveTenantForSchema(schema: string): DatabaseTenant {
  return schema === 'spp' ? 'spp' : 'core';
}
