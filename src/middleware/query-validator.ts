/**
 * Query Schema Validation Middleware
 *
 * Purpose: Enforce schema contract on all database queries
 * ADR Reference: ADR-2 (API Schema Contract Enforcement)
 * Author: Aster (Full-Stack Architect)
 * Date: 2025-10-09
 *
 * This middleware wraps database query execution to validate that all
 * queries use schema-qualified table names (e.g., core.supplier instead of supplier)
 */

import { SchemaContractValidator } from '@/lib/db/schema-contract';

export interface QueryValidationOptions {
  /**
   * Whether to enforce strict validation (throw on violation)
   * Default: true in development, false in production
   */
  strict?: boolean;

  /**
   * Whether to log validation warnings
   * Default: true
   */
  logWarnings?: boolean;

  /**
   * Whether to log all queries (for debugging)
   * Default: false
   */
  logAllQueries?: boolean;

  /**
   * Custom error handler for validation failures
   */
  onValidationError?: (error: QueryValidationError) => void;
}

export class QueryValidationError extends Error {
  constructor(
    message: string,
    public readonly query: string,
    public readonly unqualifiedTables: string[]
  ) {
    super(message);
    this.name = 'QueryValidationError';
  }
}

/**
 * Default validation options based on environment
 */
const DEFAULT_OPTIONS: QueryValidationOptions = {
  strict: process.env.NODE_ENV === 'development',
  logWarnings: true,
  logAllQueries: process.env.QUERY_LOG_ENABLED === 'true',
};

/**
 * Validates a SQL query for schema qualification
 *
 * @param sql - SQL query string to validate
 * @param options - Validation options
 * @returns True if query is valid
 * @throws QueryValidationError if query is invalid and strict mode is enabled
 */
export function validateQuery(
  sql: string,
  options: QueryValidationOptions = {}
): boolean {
  const opts = { ...DEFAULT_OPTIONS, ...options };

  // Skip validation for certain query types
  if (shouldSkipValidation(sql)) {
    return true;
  }

  // Check if query uses schema-qualified table names
  const isValid = SchemaContractValidator.isQuerySchemaQualified(sql);

  // Log query if enabled
  if (opts.logAllQueries) {
    console.log('🔍 Validating query:', {
      sql: sql.substring(0, 100) + (sql.length > 100 ? '...' : ''),
      isValid,
    });
  }

  if (!isValid) {
    const unqualifiedTables = extractUnqualifiedTables(sql);
    const error = new QueryValidationError(
      `Query contains unqualified table names: ${unqualifiedTables.join(', ')}`,
      sql,
      unqualifiedTables
    );

    // Log warning
    if (opts.logWarnings) {
      console.warn('⚠️ Schema Contract Violation:', {
        message: error.message,
        unqualifiedTables,
        query: sql.substring(0, 200) + (sql.length > 200 ? '...' : ''),
      });
    }

    // Call custom error handler if provided
    if (opts.onValidationError) {
      opts.onValidationError(error);
    }

    // Throw error in strict mode
    if (opts.strict) {
      throw error;
    }
  }

  return isValid;
}

/**
 * Determines if query validation should be skipped
 *
 * @param sql - SQL query string
 * @returns True if validation should be skipped
 */
function shouldSkipValidation(sql: string): boolean {
  const upperSql = sql.trim().toUpperCase();

  // Skip validation for:
  // 1. Utility queries (SELECT NOW(), SELECT 1, etc.)
  // 2. PostgreSQL system queries
  // 3. Information schema queries
  // 4. pg_catalog queries

  const skipPatterns = [
    /^SELECT\s+NOW\(\)/i,
    /^SELECT\s+\d+$/i,
    /^SELECT\s+CURRENT_/i,
    /FROM\s+pg_/i,
    /FROM\s+information_schema\./i,
    /^BEGIN\s*;?$/i,
    /^COMMIT\s*;?$/i,
    /^ROLLBACK\s*;?$/i,
    /^SET\s+/i,
  ];

  return skipPatterns.some((pattern) => pattern.test(sql));
}

/**
 * Extracts unqualified table names from a SQL query
 *
 * @param sql - SQL query string
 * @returns Array of unqualified table names
 */
function extractUnqualifiedTables(sql: string): string[] {
  const unqualified: string[] = [];

  // Match FROM and JOIN clauses
  const fromMatches = sql.match(/FROM\s+([^\s,;()]+)/gi);
  const joinMatches = sql.match(/JOIN\s+([^\s,;()]+)/gi);

  const allMatches = [...(fromMatches || []), ...(joinMatches || [])];

  for (const match of allMatches) {
    const tableName = match
      .replace(/FROM\s+/i, '')
      .replace(/JOIN\s+/i, '')
      .trim();

    // Check if table name is schema-qualified
    if (!tableName.includes('.') && !tableName.includes('(')) {
      unqualified.push(tableName);
    }
  }

  return [...new Set(unqualified)]; // Remove duplicates
}

/**
 * Wraps a query function with schema validation
 *
 * Example usage:
 * ```typescript
 * const validatedQuery = withQueryValidation(pool.query, {
 *   strict: true,
 *   logWarnings: true
 * });
 *
 * const result = await validatedQuery('SELECT * FROM core.supplier');
 * ```
 */
export function withQueryValidation<T extends (...args: any[]) => any>(
  queryFn: T,
  options: QueryValidationOptions = {}
): T {
  return ((...args: any[]) => {
    const [sql] = args;

    // Validate query before execution
    if (typeof sql === 'string') {
      validateQuery(sql, options);
    }

    // Execute original query
    return queryFn(...args);
  }) as T;
}

/**
 * Query validation middleware for Express/Next.js
 *
 * Usage in Next.js API route:
 * ```typescript
 * import { QueryValidationMiddleware } from '@/middleware/query-validator';
 *
 * export async function GET(request: NextRequest) {
 *   // Validation is automatically applied via unified connection
 * }
 * ```
 */
export class QueryValidationMiddleware {
  private static instance: QueryValidationMiddleware;
  private options: QueryValidationOptions;

  private constructor(options: QueryValidationOptions = {}) {
    this.options = { ...DEFAULT_OPTIONS, ...options };
  }

  static getInstance(
    options: QueryValidationOptions = {}
  ): QueryValidationMiddleware {
    if (!QueryValidationMiddleware.instance) {
      QueryValidationMiddleware.instance = new QueryValidationMiddleware(
        options
      );
    }
    return QueryValidationMiddleware.instance;
  }

  /**
   * Validates a query and returns the result
   */
  validate(sql: string): boolean {
    return validateQuery(sql, this.options);
  }

  /**
   * Updates validation options
   */
  setOptions(options: QueryValidationOptions): void {
    this.options = { ...this.options, ...options };
  }

  /**
   * Gets current validation options
   */
  getOptions(): QueryValidationOptions {
    return { ...this.options };
  }
}

// Export singleton instance
export const queryValidator = QueryValidationMiddleware.getInstance();

/**
 * Example Integration with Database Connection:
 *
 * ```typescript
 * // In lib/database/unified-connection.ts
 * import { validateQuery } from '@/middleware/query-validator';
 *
 * export async function query<T>(
 *   text: string,
 *   params?: any[]
 * ): Promise<{ rows: T[]; rowCount: number }> {
 *   // Validate query before execution
 *   validateQuery(text);
 *
 *   // Execute query
 *   return pool.query(text, params);
 * }
 * ```
 */
