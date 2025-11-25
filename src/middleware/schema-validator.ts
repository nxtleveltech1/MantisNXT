/**
 * API Schema Validation Middleware
 *
 * Purpose: Runtime validation of database queries for schema qualification
 * ADR Reference: ADR-2 (API Schema Contract Enforcement)
 * Author: Aster (Full-Stack Architect)
 * Date: 2025-10-09
 */

import type { NextRequest} from 'next/server';
import { NextResponse } from 'next/server';
import { SchemaContractValidator } from '@/lib/db/schema-contract';

/**
 * Schema violation error
 */
export class SchemaViolationError extends Error {
  constructor(
    message: string,
    public readonly query: string,
    public readonly violations: string[]
  ) {
    super(message);
    this.name = 'SchemaViolationError';
  }
}

/**
 * Query interceptor for schema validation
 *
 * Wraps database query functions to validate schema qualification
 */
export function createSchemaValidator<T extends (...args: unknown[]) => unknown>(
  queryFn: T,
  options: {
    strict?: boolean; // Throw error on violation (default: false in dev, true in prod)
    logViolations?: boolean; // Log violations (default: true)
  } = {}
): T {
  const {
    strict = process.env.NODE_ENV === 'production',
    logViolations = true,
  } = options;

  return ((...args: Parameters<T>): ReturnType<T> => {
    // Extract SQL query from arguments (first string argument)
    const sql = args.find(arg => typeof arg === 'string');

    if (sql && typeof sql === 'string') {
      const isValid = SchemaContractValidator.isQuerySchemaQualified(sql);

      if (!isValid) {
        const tableRefs = extractUnqualifiedTables(sql);
        const violation = {
          query: sql,
          unqualifiedTables: tableRefs,
          timestamp: new Date().toISOString(),
          stack: new Error().stack,
        };

        if (logViolations) {
          console.warn('⚠️  Schema Qualification Violation:', violation);
        }

        if (strict) {
          throw new SchemaViolationError(
            'Query contains unqualified table names',
            sql,
            tableRefs
          );
        }
      }
    }

    // Execute original query function
    return queryFn(...args);
  }) as T;
}

/**
 * Extract unqualified table names from SQL
 */
function extractUnqualifiedTables(sql: string): string[] {
  const tableRefs: string[] = [];

  // Match FROM clause
  const fromMatch = sql.match(/FROM\s+([^\s,;()]+)/gi);
  if (fromMatch) {
    tableRefs.push(...fromMatch.map(m => m.replace(/FROM\s+/i, '').trim()));
  }

  // Match JOIN clauses
  const joinMatch = sql.match(/JOIN\s+([^\s,;()]+)/gi);
  if (joinMatch) {
    tableRefs.push(...joinMatch.map(m => m.replace(/JOIN\s+/i, '').trim()));
  }

  // Filter to only unqualified names (no schema prefix)
  return tableRefs.filter(ref => !ref.includes('.'));
}

/**
 * API route middleware for schema validation
 *
 * Usage in API routes:
 * ```typescript
 * export async function GET(request: NextRequest) {
 *   return withSchemaValidation(request, async () => {
 *     const result = await pool.query('SELECT * FROM core.product');
 *     return NextResponse.json(result.rows);
 *   });
 * }
 * ```
 */
export async function withSchemaValidation<T>(
  request: NextRequest,
  handler: (req: NextRequest) => Promise<T>
): Promise<T | NextResponse> {
  try {
    return await handler(request);
  } catch (error) {
    if (error instanceof SchemaViolationError) {
      console.error('Schema Violation in API Route:', {
        path: request.nextUrl.pathname,
        query: error.query,
        violations: error.violations,
      });

      return NextResponse.json(
        {
          error: 'Schema Violation',
          message: 'Query must use schema-qualified table names (e.g., core.product)',
          violations: error.violations,
        },
        { status: 500 }
      );
    }

    // Re-throw other errors
    throw error;
  }
}

/**
 * Development-mode schema violation reporter
 *
 * Logs all schema violations to help identify issues during development
 */
export class SchemaViolationReporter {
  private static violations: Array<{
    timestamp: string;
    query: string;
    tables: string[];
    route?: string;
  }> = [];

  static report(query: string, unqualifiedTables: string[], route?: string): void {
    this.violations.push({
      timestamp: new Date().toISOString(),
      query,
      tables: unqualifiedTables,
      route,
    });

    // Log immediately in development
    if (process.env.NODE_ENV === 'development') {
      console.warn('⚠️  Schema Violation Detected:', {
        route,
        tables: unqualifiedTables,
        query: query.substring(0, 100) + (query.length > 100 ? '...' : ''),
      });
    }
  }

  static getViolations(): typeof SchemaViolationReporter.violations {
    return this.violations;
  }

  static clear(): void {
    this.violations = [];
  }

  static getSummary(): {
    total: number;
    byRoute: Record<string, number>;
    byTable: Record<string, number>;
  } {
    const summary = {
      total: this.violations.length,
      byRoute: {} as Record<string, number>,
      byTable: {} as Record<string, number>,
    };

    for (const violation of this.violations) {
      // Count by route
      const route = violation.route || 'unknown';
      summary.byRoute[route] = (summary.byRoute[route] || 0) + 1;

      // Count by table
      for (const table of violation.tables) {
        summary.byTable[table] = (summary.byTable[table] || 0) + 1;
      }
    }

    return summary;
  }
}

/**
 * TypeScript type guard for schema-qualified queries
 */
export type SchemaQualifiedQuery<T extends string> = T extends `${string}.${string}` ? T : never;

/**
 * Example Usage:
 *
 * ```typescript
 * // In database wrapper
 * import { createSchemaValidator } from '@/middleware/schema-validator';
 * import { pool } from './connection';
 *
 * const originalQuery = pool.query.bind(pool);
 * pool.query = createSchemaValidator(originalQuery, { strict: true });
 *
 * // In API route
 * import { withSchemaValidation } from '@/middleware/schema-validator';
 *
 * export async function GET(request: NextRequest) {
 *   return withSchemaValidation(request, async () => {
 *     // ✅ CORRECT: Schema-qualified
 *     const result = await pool.query('SELECT * FROM core.product');
 *
 *     // ❌ INCORRECT: Will throw SchemaViolationError in production
 *     // const result = await pool.query('SELECT * FROM product');
 *
 *     return NextResponse.json(result.rows);
 *   });
 * }
 * ```
 */
