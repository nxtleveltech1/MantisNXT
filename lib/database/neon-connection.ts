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
    
    // Check if query contains parameter placeholders ($1, $2, etc.)
    const placeholderRegex = /\$(\d+)/g;
    const hasPlaceholders = placeholderRegex.test(queryText);
    
    // Reset regex for later use
    placeholderRegex.lastIndex = 0;
    
    // If query has placeholders but no params provided, that's an error
    if (hasPlaceholders && processedParams.length === 0) {
      throw new Error(
        `Query contains parameter placeholders ($1, $2, etc.) but no parameters provided. ` +
        `Query: ${queryText.substring(0, 200)}`
      );
    }
    
    // Convert parameterized query to template literal format
    if (hasPlaceholders && processedParams.length > 0) {
      // Fallback: Convert parameterized query to template literal
      // Split by $N placeholders and rebuild as template literal parts
      const parts: string[] = [];
      const values: any[] = [];
      
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
      // No placeholders - use template literal for simple queries
      // Use template literal syntax: sql`query text`
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
    // Always check if params are provided - if they are, treat as parameterized query
    // This handles both explicit params and queries with $1, $2 placeholders
    // CRITICAL: Empty array [] means no params, but undefined/null also means no params
    const hasParams = params !== undefined && params !== null && Array.isArray(params) && params.length > 0;
    
    // CRITICAL: Log ALL queries to understand what's happening
    console.log('🚀 [withTransaction.executeQuery] ENTRY:', {
      queryPreview: queryText.substring(0, 200),
      hasParams,
      paramsType: typeof params,
      paramsIsArray: Array.isArray(params),
      paramsIsNull: params === null,
      paramsIsUndefined: params === undefined,
      paramsLength: params?.length,
      paramsPreview: params?.slice(0, 3),
      queryContainsDollar: queryText.includes('$'),
      firstChars: queryText.substring(0, 50),
      fullQueryFirst300: queryText.substring(0, 300)
    });
    
    // CRITICAL SAFEGUARD: If query contains $ and we have params, MUST convert
    // This is the ultimate check - if query has $1, $2 and params are provided, convert!
    if (queryText.includes('$') && params && Array.isArray(params) && params.length > 0) {
      console.log('🔴 FORCING CONVERSION: Query has $ and params provided!', {
        queryPreview: queryText.substring(0, 150),
        paramsCount: params.length
      });
    }
    
    // Check if query contains placeholders - use a fresh regex each time
    // Test for $1, $2, etc. placeholders (must match $ followed by digits)
    // Create a new regex instance to avoid state issues
    const placeholderTestRegex = new RegExp('\\$\\d+');
    const hasPlaceholderPattern = placeholderTestRegex.test(queryText);
    
    // More robust placeholder detection - check if query contains $ followed by digits
    // Also check if params are provided and query contains dollar signs
    const queryContainsDollar = queryText.includes('$');
    
    // CRITICAL: If params are provided, we MUST convert - params always mean parameterized query
    // Only skip conversion if query is a simple transaction command (BEGIN, COMMIT, ROLLBACK)
    const isTransactionCommand = /^\s*(BEGIN|COMMIT|ROLLBACK|START\s+TRANSACTION)\s*;?\s*$/i.test(queryText.trim());
    
    // CRITICAL: If params are provided AND query contains $, ALWAYS treat as having placeholders
    // This is the most important check - params + $ means parameterized query
    // ONLY skip if it's a transaction command (BEGIN/COMMIT/ROLLBACK)
    const hasPlaceholdersByParams = hasParams && queryContainsDollar && !isTransactionCommand;
    
    // If params are provided and query contains $, MUST have placeholders (unless transaction command)
    // This is the critical fallback - if params exist and $ exists, it MUST be parameterized
    const hasPlaceholders = hasPlaceholdersByParams || (!isTransactionCommand && hasPlaceholderPattern);
    
    // CRITICAL: If params provided but no placeholders found, that's a programming error
    // Params ALWAYS mean the query should have $1, $2 placeholders
    if (hasParams && !isTransactionCommand && !queryContainsDollar) {
      console.error('🚨 PROGRAMMING ERROR: Params provided but query has no $ placeholders!', {
        query: queryText.substring(0, 200),
        paramsCount: params?.length,
        params: params?.slice(0, 5) // First 5 params for debugging
      });
      throw new Error(
        `Params provided (${params?.length}) but query has no $1, $2 placeholders. ` +
        `This is a programming error. Query: ${queryText.substring(0, 150)}`
      );
    }
    
    // Debug logging for ALL queries to diagnose issues
    if (hasParams || queryContainsDollar || hasPlaceholderPattern) {
      console.log('🔍 [withTransaction.executeQuery]', {
        query: queryText.substring(0, 200),
        hasParams,
        paramsCount: params?.length,
        hasPlaceholderPattern,
        queryContainsDollar,
        isTransactionCommand,
        hasPlaceholdersByParams,
        hasPlaceholders,
        willConvert: hasPlaceholders && hasParams,
        firstChars: queryText.substring(0, 100)
      });
    }
    
    // CRITICAL SAFEGUARD: If params are provided and query contains $, we MUST convert
    // hasPlaceholdersByParams is the ultimate check - if params + $ exist, MUST convert
    // This prevents queries with placeholders from falling through to the else branch
    if (hasPlaceholders || hasPlaceholdersByParams) {
      if (!hasParams) {
        console.error('❌ Query has placeholders but no params:', {
          query: queryText.substring(0, 200),
          params: params,
          paramsType: typeof params,
          paramsLength: params?.length,
          hasPlaceholderPattern,
          queryContainsDollar
        });
        throw new Error(`Query contains placeholders ($1, $2, etc.) but no parameters provided: ${queryText.substring(0, 100)}`);
      }
      
      // Convert $1, $2 placeholders to template literal format
      const parts: string[] = [];
      const values: any[] = [];
      
      // Find all $N placeholders in the query
      // Pattern: $ followed by one or more digits
      const placeholderPattern = /\$(\d+)/g;
      const matches: Array<{ index: number; length: number; paramNum: number }> = [];
      
      // Reset regex and find all matches
      placeholderPattern.lastIndex = 0;
      let match;
      while ((match = placeholderPattern.exec(queryText)) !== null) {
        matches.push({
          index: match.index,
          length: match[0].length,
          paramNum: parseInt(match[1], 10)
        });
      }
      
      if (matches.length === 0) {
        // No placeholders found but we expected them - this is an error
        throw new Error(`Query contains $ but no $1, $2 placeholders found. Query: ${queryText.substring(0, 100)}`);
      }
      
      // Sort matches by index to process in order
      matches.sort((a, b) => a.index - b.index);
      
      // Build parts array and extract values
      let currentIndex = 0;
      for (const match of matches) {
        // Add SQL text before this placeholder
        if (match.index > currentIndex) {
          parts.push(queryText.substring(currentIndex, match.index));
        } else if (parts.length === 0) {
          // First placeholder at start
          parts.push('');
        }
        
        // Get parameter value (convert 1-based $1, $2 to 0-based array index)
        const paramIndex = match.paramNum - 1;
        if (paramIndex < 0 || paramIndex >= params.length) {
          throw new Error(
            `Invalid parameter index $${match.paramNum}: only ${params.length} params provided (need param ${match.paramNum}). ` +
            `Query: ${queryText.substring(0, 150)}`
          );
        }
        values.push(params[paramIndex]);
        
        // Move past this placeholder
        currentIndex = match.index + match.length;
      }
      
      // Add remaining SQL after last placeholder
      if (currentIndex < queryText.length) {
        parts.push(queryText.substring(currentIndex));
      } else if (parts.length <= values.length) {
        // Last placeholder at end - add empty string
        parts.push('');
      }
      
      // Validate: parts should equal values.length + 1
      if (parts.length !== values.length + 1) {
        throw new Error(
          `Template literal construction failed: ${parts.length} parts but ${values.length} values. ` +
          `Expected ${values.length + 1} parts. Query: ${queryText.substring(0, 150)}`
        );
      }
      
      // Create template literal call using Function constructor
      const valueNames = values.map((_, i) => `v${i}`);
      const escapedParts = parts.map(part => {
        // Escape backticks and template literal syntax in SQL parts
        return part
          .replace(/\\/g, '\\\\')  // Escape backslashes first
          .replace(/`/g, '\\`')     // Escape backticks
          .replace(/\$\{/g, '\\${'); // Escape ${ template literal syntax
      });
      
      // Build the template literal string
      let templateCall = 'sql`';
      for (let i = 0; i < escapedParts.length; i++) {
        templateCall += escapedParts[i];
        if (i < values.length) {
          templateCall += '${' + valueNames[i] + '}';
        }
      }
      templateCall += '`';
      
      // Debug: Log the conversion
      console.log('✅ [withTransaction] Converting query with placeholders:', {
        originalQuery: queryText.substring(0, 150),
        matchesFound: matches.length,
        valuesCount: values.length,
        partsCount: parts.length,
        templateCallPreview: templateCall.substring(0, 200)
      });
      
      try {
        const executeQueryFn = new Function('sql', ...valueNames, `return ${templateCall};`);
        const result = await executeQueryFn(sql, ...values);
        
        // Debug: Log successful conversion
        console.log('✅ [withTransaction] Query converted and executed successfully');
        
        return result;
      } catch (convError) {
        console.error('❌ [withTransaction] Template literal execution failed:', {
          error: convError,
          templateCall: templateCall.substring(0, 300),
          query: queryText.substring(0, 200),
          valuesCount: values.length
        });
        throw new Error(
          `Failed to execute converted query: ${convError instanceof Error ? convError.message : 'Unknown error'}. ` +
          `Original query: ${queryText.substring(0, 100)}`
        );
      }
    } else if (hasParams && queryContainsDollar) {
      // SAFEGUARD: Params provided and query contains $ - must have placeholders even if detection failed
      // This is a critical fallback to prevent queries with $1 from being executed without conversion
      console.error('🚨 CRITICAL: Params provided and query contains $, but placeholder detection failed!', {
        query: queryText.substring(0, 200),
        hasParams,
        queryContainsDollar,
        hasPlaceholderPattern,
        isTransactionCommand
      });
      throw new Error(`Query has params and contains $ but placeholder detection failed. Query: ${queryText.substring(0, 100)}`);
    } else if (hasParams) {
      // Params provided but query doesn't contain $ - this is unusual
      console.warn('⚠️ Parameters provided but query has no $1, $2 placeholders. Query:', queryText.substring(0, 100));
      return await sql`${queryText}`;
    } else {
      // No placeholders and no params - use template literal directly (for BEGIN, COMMIT, etc.)
      // BUT: If query contains $ followed by digits, this is an error - it needs params!
      if (queryText.includes('$') && /\$\d+/.test(queryText)) {
        console.error('🚨 CRITICAL ERROR: Query contains $1, $2 placeholders but no params provided!', {
          query: queryText.substring(0, 300),
          paramsProvided: params !== undefined,
          paramsIsArray: Array.isArray(params),
          paramsLength: params?.length,
          queryHasDollarSign: queryText.includes('$')
        });
        throw new Error(
          `Query contains $1, $2 placeholders but no parameters provided. ` +
          `This should never happen. Query: ${queryText.substring(0, 200)}`
        );
      }
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
