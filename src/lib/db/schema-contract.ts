/**
 * Database Schema Contract Definitions
 *
 * Purpose: Enforce core.* schema qualification across all API queries
 * ADR Reference: ADR-2 (API Schema Contract Enforcement)
 * Author: Aster (Full-Stack Architect)
 * Date: 2025-10-09
 */

/**
 * Core Schema Tables
 *
 * All production tables live in the `core` schema. This enforces explicit
 * schema qualification to prevent cross-schema issues.
 */
export const SCHEMA = {
  CORE: 'core',
  PUBLIC: 'public',
  SPP: 'spp',
  SERVE: 'serve',
} as const;

/**
 * Core Schema Table Names
 *
 * Production table names (singular form matching actual database)
 */
export const CORE_TABLES = {
  PRODUCT: 'core.product',
  SUPPLIER: 'core.supplier',
  SUPPLIER_PRODUCT: 'core.supplier_product',
  STOCK_LOCATION: 'core.stock_location',
  STOCK_ON_HAND: 'core.stock_on_hand',
  STOCK_MOVEMENT: 'core.stock_movement',
  BRAND: 'core.brand',
  CATEGORY: 'core.category',
  CATEGORY_MAP: 'core.category_map',
  INVENTORY_SELECTION: 'core.inventory_selection',
  INVENTORY_SELECTED_ITEM: 'core.inventory_selected_item',
  PRICE_HISTORY: 'core.price_history',

  // Pricelist tables (from migration 001)
  SUPPLIER_PRICELISTS: 'core.supplier_pricelists',
  PRICELIST_ITEMS: 'core.pricelist_items',

  // Analytics tables (from migration 002)
  SUPPLIER_PERFORMANCE: 'core.supplier_performance',
  ANALYTICS_ANOMALIES: 'core.analytics_anomalies',
  ANALYTICS_PREDICTIONS: 'core.analytics_predictions',
  ANALYTICS_DASHBOARD_CONFIG: 'core.analytics_dashboard_config',
  PURCHASE_ORDERS: 'core.purchase_orders',
  PURCHASE_ORDER_ITEMS: 'core.purchase_order_items',
} as const;

/**
 * Public Schema Views
 *
 * Compatibility views for legacy code
 */
export const PUBLIC_VIEWS = {
  INVENTORY_ITEMS: 'public.inventory_items',
  PRODUCTS: 'public.products',
  SUPPLIERS: 'public.suppliers',
  STOCK_MOVEMENTS: 'public.stock_movements',
} as const;

/**
 * SPP Schema Tables
 *
 * Supplier Product Portfolio tables
 */
export const SPP_TABLES = {
  PRICELIST_UPLOAD: 'spp.pricelist_upload',
  PRICELIST_ROW: 'spp.pricelist_row',
} as const;

/**
 * Serve Schema Views
 *
 * Read-only views for serving data
 */
export const SERVE_VIEWS = {
  NXT_SOH: 'serve.v_nxt_soh',
  SOH_BY_SUPPLIER: 'serve.v_soh_by_supplier',
  SOH_ROLLED_UP: 'serve.v_soh_rolled_up',
  SELECTED_CATALOG: 'serve.v_selected_catalog',
  PRODUCT_TABLE_BY_SUPPLIER: 'serve.v_product_table_by_supplier',
} as const;

/**
 * Type-safe table name union
 */
export type CoreTableName = typeof CORE_TABLES[keyof typeof CORE_TABLES];
export type PublicViewName = typeof PUBLIC_VIEWS[keyof typeof PUBLIC_VIEWS];
export type SppTableName = typeof SPP_TABLES[keyof typeof SPP_TABLES];
export type ServeViewName = typeof SERVE_VIEWS[keyof typeof SERVE_VIEWS];

export type QualifiedTableName =
  | CoreTableName
  | PublicViewName
  | SppTableName
  | ServeViewName;

/**
 * Schema Contract Validator
 *
 * Validates that queries use fully-qualified table names (schema.table)
 */
export class SchemaContractValidator {
  private static readonly SCHEMA_PATTERN = /^(core|public|spp|serve)\./;

  /**
   * Validates a SQL query for schema qualification
   *
   * @param sql - SQL query string
   * @returns True if query uses schema-qualified table names
   */
  static isQuerySchemaQualified(sql: string): boolean {
    // Extract table names from FROM and JOIN clauses
    const tableReferences = this.extractTableReferences(sql);

    if (tableReferences.length === 0) {
      return true; // No table references (e.g., SELECT NOW())
    }

    // All table references must be schema-qualified
    return tableReferences.every(ref => this.SCHEMA_PATTERN.test(ref));
  }

  /**
   * Extracts table references from SQL query
   *
   * @param sql - SQL query string
   * @returns Array of table references
   */
  private static extractTableReferences(sql: string): string[] {
    const references: string[] = [];

    // Match FROM clause
    const fromMatch = sql.match(/FROM\s+([^\s,;()]+)/gi);
    if (fromMatch) {
      references.push(...fromMatch.map(m => m.replace(/FROM\s+/i, '').trim()));
    }

    // Match JOIN clauses
    const joinMatch = sql.match(/JOIN\s+([^\s,;()]+)/gi);
    if (joinMatch) {
      references.push(...joinMatch.map(m => m.replace(/JOIN\s+/i, '').trim()));
    }

    return references;
  }

  /**
   * Validates a table name is in the contract
   *
   * @param tableName - Table name to validate
   * @returns True if table name is in the schema contract
   */
  static isValidTableName(tableName: string): tableName is QualifiedTableName {
    const allTables = [
      ...Object.values(CORE_TABLES),
      ...Object.values(PUBLIC_VIEWS),
      ...Object.values(SPP_TABLES),
      ...Object.values(SERVE_VIEWS),
    ];

    return allTables.includes(tableName as QualifiedTableName);
  }

  /**
   * Extracts schema from qualified table name
   *
   * @param tableName - Qualified table name (e.g., 'core.product')
   * @returns Schema name
   */
  static getSchema(tableName: QualifiedTableName): string {
    return tableName.split('.')[0];
  }

  /**
   * Extracts table name without schema
   *
   * @param tableName - Qualified table name (e.g., 'core.product')
   * @returns Table name without schema
   */
  static getTableName(tableName: QualifiedTableName): string {
    return tableName.split('.')[1];
  }
}

/**
 * Query Builder Helpers
 *
 * Type-safe query building with schema qualification
 */
export const QueryBuilder = {
  /**
   * Builds a SELECT query with schema-qualified table name
   */
  select(tableName: QualifiedTableName, columns: string[] = ['*']): string {
    if (!SchemaContractValidator.isValidTableName(tableName)) {
      throw new Error(`Invalid table name: ${tableName}`);
    }
    return `SELECT ${columns.join(', ')} FROM ${tableName}`;
  },

  /**
   * Builds an INSERT query with schema-qualified table name
   */
  insert(tableName: QualifiedTableName, columns: string[]): string {
    if (!SchemaContractValidator.isValidTableName(tableName)) {
      throw new Error(`Invalid table name: ${tableName}`);
    }
    const placeholders = columns.map((_, i) => `$${i + 1}`).join(', ');
    return `INSERT INTO ${tableName} (${columns.join(', ')}) VALUES (${placeholders})`;
  },

  /**
   * Builds an UPDATE query with schema-qualified table name
   */
  update(tableName: QualifiedTableName, columns: string[], whereClause: string): string {
    if (!SchemaContractValidator.isValidTableName(tableName)) {
      throw new Error(`Invalid table name: ${tableName}`);
    }
    const setClauses = columns.map((col, i) => `${col} = $${i + 1}`).join(', ');
    return `UPDATE ${tableName} SET ${setClauses} WHERE ${whereClause}`;
  },

  /**
   * Builds a DELETE query with schema-qualified table name
   */
  delete(tableName: QualifiedTableName, whereClause: string): string {
    if (!SchemaContractValidator.isValidTableName(tableName)) {
      throw new Error(`Invalid table name: ${tableName}`);
    }
    return `DELETE FROM ${tableName} WHERE ${whereClause}`;
  },
};

/**
 * Example Usage:
 *
 * ```typescript
 * import { CORE_TABLES, QueryBuilder } from '@/lib/db/schema-contract';
 *
 * // ✅ CORRECT: Schema-qualified
 * const query = QueryBuilder.select(CORE_TABLES.PRODUCT, ['product_id', 'name']);
 * // Generates: SELECT product_id, name FROM core.product
 *
 * // ❌ INCORRECT: Not schema-qualified (will throw error)
 * const query = QueryBuilder.select('product', ['product_id', 'name']);
 * ```
 */
