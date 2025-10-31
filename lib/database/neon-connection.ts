/**
 * Neon Database Connection for NXT-SPP-Supplier Inventory Portfolio
 *
 * This module manages the connection to the new Neon PostgreSQL database
 * using the Neon serverless client with proper error handling and performance monitoring.
 */

import { neon } from '@neondatabase/serverless';

// Validate Neon connection URL
function validateNeonConnectionString(connectionString: string | undefined) {
  if (!connectionString) {
    throw new Error('NEON_SPP_DATABASE_URL environment variable is not set');
  }

  try {
    new URL(connectionString);
    return connectionString;
  } catch (error) {
    throw new Error(
      `Invalid Neon connection string: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

// Get validated connection string
const connectionString = validateNeonConnectionString(process.env.NEON_SPP_DATABASE_URL);

/**
 * Neon serverless SQL client
 * Configured to support both template literals and .query() method
 */
const sql = neon(connectionString);

/**
 * Augmented Neon client that also provides a simple `.query()` helper
 * for parameterized queries returning `{ rows, rowCount }`.
 */
type NeonDb = typeof sql & {
  query: <T = any>(queryText: string, params?: any[]) => Promise<{ rows: T[]; rowCount: number }>;
  withTransaction: <T>(
    fn: (client: {
      query: <U = any>(
        queryText: string,
        params?: any[]
      ) => Promise<{ rows: U[]; rowCount: number }>;
    }) => Promise<T>
  ) => Promise<T>;
};

// Create a proxy wrapper to avoid modifying the original sql object
// This prevents infinite recursion when we add our own .query() method
const neonDbInternal = Object.create(sql) as NeonDb;
Object.setPrototypeOf(neonDbInternal, sql);

neonDbInternal.query = async function <T = any>(
  queryText: string,
  params?: any[]
): Promise<{ rows: T[]; rowCount: number }> {
  const start = Date.now();
  try {
    const processedParams: any[] = params || [];
    
    // Convert parameterized query to template literal format
    if (processedParams.length > 0) {
      
      // Fallback: Convert parameterized query to template literal
      // Split by $N placeholders and rebuild as template literal parts
      const parts: string[] = [];
      const values: any[] = [];
      
      // Find all $N placeholders
      const placeholderRegex = /\$(\d+)/g;
      let lastIndex = 0;
      let match;
      
      while ((match = placeholderRegex.exec(queryText)) !== null) {
        // Add text before placeholder
        if (match.index > lastIndex) {
          parts.push(queryText.substring(lastIndex, match.index));
        } else if (parts.length === 0) {
          // First placeholder at start
          parts.push('');
        }
        
        // Get parameter value (convert 1-based index to 0-based)
        const paramIndex = parseInt(match[1], 10) - 1;
        if (paramIndex >= 0 && paramIndex < processedParams.length) {
          values.push(processedParams[paramIndex]);
        } else {
          throw new Error(`Invalid parameter index $${match[1]} - only ${processedParams.length} parameters provided`);
        }
        
        lastIndex = match.index + match[0].length;
      }
      
      // Add remaining text after last placeholder
      if (lastIndex < queryText.length) {
        parts.push(queryText.substring(lastIndex));
      } else if (parts.length <= values.length) {
        // Last placeholder at end - add empty string
        parts.push('');
      }
      
      // Call as template literal: sql`text ${value1} text ${value2}`
      // Ensure parts.length === values.length + 1
      if (parts.length !== values.length + 1) {
        throw new Error(`Template literal mismatch: ${parts.length} parts for ${values.length} values`);
      }
      
      // Construct the tagged template call properly using eval
      // This is the only way to dynamically construct a tagged template in JavaScript
      // We'll build: sql`part0 ${v0} part1 ${v1} part2`
      const valueNames = values.map((_, i) => `v${i}`);
      
      // Build the template literal string by escaping parts and interpolating values
      // Each part needs to be escaped for template literals (backticks, ${, etc.)
      const escapedParts = parts.map(part => {
        // Escape backticks and ${ in the SQL query parts
        return part.replace(/`/g, '\\`').replace(/\$\{/g, '\\${');
      });
      
      // Construct the actual tagged template call as a string
      // Format: sql`part0 ${v0} part1 ${v1} part2`
      let templateCall = 'sql`';
      for (let i = 0; i < escapedParts.length; i++) {
        templateCall += escapedParts[i];
        if (i < values.length) {
          templateCall += '${' + valueNames[i] + '}';
        }
      }
      templateCall += '`';
      
      // Build function that executes the template literal
      const executeQuery = new Function('sql', ...valueNames, `return ${templateCall};`);
      const result = await executeQuery(sql, ...values);
      
      const duration = Date.now() - start;
      if (duration > 1000) {
        console.warn(`⚠️ Slow query (${duration}ms):`, queryText.substring(0, 100));
      }

      const rows = Array.isArray(result) ? result : [result];
      return { 
        rows: rows.filter(Boolean) as T[], 
        rowCount: rows.length
      };
    } else {
      // No parameters - use template literal for simple queries
      const result = await sql`${queryText}`;
      const duration = Date.now() - start;
      
      if (duration > 1000) {
        console.warn(`⚠️ Slow query (${duration}ms):`, queryText.substring(0, 100));
      }

      const rows = Array.isArray(result) ? result : [result];
      return { 
        rows: rows.filter(Boolean) as T[], 
        rowCount: rows.length
      };
    }
  } catch (error) {
    console.error('🔴 Neon query error:', error);
    console.error('Query:', queryText.substring(0, 200));
    console.error('Params:', params);
    throw error;
  }
};

export const neonDb = neonDbInternal;

neonDbInternal.withTransaction = async function <T>(
  fn: (client: {
    query: <U = any>(queryText: string, params?: any[]) => Promise<{ rows: U[]; rowCount: number }>;
  }) => Promise<T>
): Promise<T> {
  // Neon's transaction API doesn't support callback-style transactions like pg
  // We'll use manual BEGIN/COMMIT/ROLLBACK with a helper function to execute queries
  // This allows us to execute queries and get results during the callback
  
  // Helper function to convert parameterized query to template literal
  const executeQuery = async (queryText: string, params?: any[]): Promise<any> => {
    if (params && params.length > 0) {
      // Convert $1, $2 placeholders to template literal format
      const parts: string[] = [];
      const values: any[] = [];
      const placeholderRegex = /\$(\d+)/g;
      let lastIndex = 0;
      let match;
      
      while ((match = placeholderRegex.exec(queryText)) !== null) {
        if (match.index > lastIndex) {
          parts.push(queryText.substring(lastIndex, match.index));
        } else if (parts.length === 0) {
          parts.push('');
        }
        
        const paramIndex = parseInt(match[1], 10) - 1;
        if (paramIndex >= 0 && paramIndex < params.length) {
          values.push(params[paramIndex]);
        }
        
        lastIndex = match.index + match[0].length;
      }
      
      if (lastIndex < queryText.length) {
        parts.push(queryText.substring(lastIndex));
      } else if (parts.length <= values.length) {
        parts.push('');
      }
      
      if (parts.length !== values.length + 1) {
        throw new Error(`Template literal mismatch: ${parts.length} parts for ${values.length} values`);
      }
      
      // Create template literal call using Function constructor
      const valueNames = values.map((_, i) => `v${i}`);
      const escapedParts = parts.map(part => part.replace(/`/g, '\\`').replace(/\$\{/g, '\\${'));
      
      let templateCall = 'sql`';
      for (let i = 0; i < escapedParts.length; i++) {
        templateCall += escapedParts[i];
        if (i < values.length) {
          templateCall += '${' + valueNames[i] + '}';
        }
      }
      templateCall += '`';
      
      const executeQueryFn = new Function('sql', ...valueNames, `return ${templateCall};`);
      return await executeQueryFn(sql, ...values);
    } else {
      return await sql`${queryText}`;
    }
  };

  // Start transaction
  try {
    await executeQuery('BEGIN');
    
    // Create client object that executes queries directly
    const client = {
      query: async <U = any>(
        queryText: string,
        params?: any[]
      ): Promise<{ rows: U[]; rowCount: number }> => {
        const result = await executeQuery(queryText, params);
        const rows = Array.isArray(result) ? result : [result];
        return {
          rows: rows.filter(Boolean) as U[],
          rowCount: rows.length,
        };
      },
    };

    // Execute callback
    try {
      const result = await fn(client);
      await executeQuery('COMMIT');
      return result;
    } catch (error) {
      await executeQuery('ROLLBACK');
      throw error;
    }
  } catch (error) {
    // Try to rollback if transaction was started
    try {
      await executeQuery('ROLLBACK');
    } catch (rollbackError) {
      // Ignore rollback errors
    }
    throw error;
  }
};

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
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

console.log('🚀 Neon serverless database connection module initialized');
