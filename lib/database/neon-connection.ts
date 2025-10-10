/**
 * Neon Database Connection for NXT-SPP-Supplier Inventory Portfolio
 *
 * This module manages the connection to the new Neon PostgreSQL database
 * using the Neon serverless client with proper error handling and performance monitoring.
 */

import { neon, neonConfig } from "@neondatabase/serverless";

// Validate Neon connection URL
function validateNeonConnectionString(connectionString: string | undefined) {
  if (!connectionString) {
    throw new Error("NEON_SPP_DATABASE_URL environment variable is not set");
  }

  try {
    new URL(connectionString);
    return connectionString;
  } catch (error) {
    throw new Error(
      `Invalid Neon connection string: ${
        error instanceof Error ? error.message : "Unknown error"
      }`
    );
  }
}

// Get validated connection string
const connectionString = validateNeonConnectionString(
  process.env.NEON_SPP_DATABASE_URL
);

/**
 * Neon serverless SQL client
 */
const sql = neon(connectionString);

/**
 * Neon database wrapper that supports both template literals and .query() method
 */
class NeonDbWrapper {
  /**
   * Execute a query using template literal syntax
   * Usage: neonDb`SELECT * FROM table WHERE id = ${id}`
   */
  async __call__(strings: TemplateStringsArray, ...values: any[]) {
    return sql(strings, ...values);
  }

  /**
   * Execute a query using .query() method for compatibility
   * Usage: neonDb.query('SELECT * FROM table WHERE id = $1', [id])
   */
  async query<T = any>(
    queryText: string,
    params?: any[]
  ): Promise<{ rows: T[]; rowCount: number }> {
    const start = Date.now();

    try {
      // Use neon's parameterized query support
      let result: any;
      if (params && params.length > 0) {
        // Replace $1, $2, etc. with actual values for template literal
        let processedQuery = queryText;
        const values: any[] = [];

        // Build the query string with placeholders
        for (let i = 0; i < params.length; i++) {
          const placeholder = `$${i + 1}`;
          const regex = new RegExp(`\\$${i + 1}\\b`, "g");
          processedQuery = processedQuery.replace(regex, `{${i}}`);
          values.push(params[i]);
        }

        // Create template literal
        const parts = processedQuery.split(/\{(\d+)\}/);
        const strings: string[] = [];
        const templateValues: any[] = [];

        for (let i = 0; i < parts.length; i++) {
          if (i % 2 === 0) {
            strings.push(parts[i]);
          } else {
            const index = parseInt(parts[i]);
            templateValues.push(values[index]);
          }
        }

        // Ensure we have the final string
        if (strings.length === templateValues.length) {
          strings.push("");
        }

        const templateStrings = strings as any;
        templateStrings.raw = strings;

        result = await sql(templateStrings, ...templateValues);
      } else {
        const templateStrings = [queryText] as any;
        templateStrings.raw = [queryText];
        result = await sql(templateStrings);
      }

      const duration = Date.now() - start;

      // Log slow queries
      if (duration > 1000) {
        console.warn(
          `⚠️ Slow query (${duration}ms):`,
          queryText.substring(0, 100)
        );
      }

      return {
        rows: Array.isArray(result) ? result : [result],
        rowCount: Array.isArray(result) ? result.length : 1,
      };
    } catch (error) {
      console.error("🔴 Neon query error:", error);
      throw error;
    }
  }
}

// Create a proxy to support both template literal and method calls
const dbWrapper = new NeonDbWrapper();

export const neonDb = new Proxy(
  function (...args: any[]) {
    return sql(...args);
  },
  {
    get(target, prop) {
      if (prop === "query") {
        return dbWrapper.query.bind(dbWrapper);
      }
      return (target as any)[prop];
    },
    apply(target, thisArg, args) {
      return sql(...args);
    },
  }
) as typeof sql & { query: typeof dbWrapper.query };

/**
 * Test the database connection
 */
export async function testConnection(): Promise<{
  success: boolean;
  latency: number;
  error?: string;
}> {
  const start = Date.now();

  try {
    await neonDb`SELECT NOW()`;
    const latency = Date.now() - start;

    return {
      success: true,
      latency,
    };
  } catch (error) {
    return {
      success: false,
      latency: Date.now() - start,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

console.log("🚀 Neon serverless database connection module initialized");
