import { neon } from '@neondatabase/serverless';

// Get connection string from environment - uses POS-specific database
const connectionString = process.env.POS_DATABASE_URL!;

if (!connectionString) {
  throw new Error('POS_DATABASE_URL environment variable is not set');
}

// Create Neon SQL client
const sqlClient = neon(connectionString);

// Type exports for Neon database
export interface Product {
  id: string;
  name: string;
  description: string | null;
  price: number;
  sku: string;
  category: string | null;
  image_url: string | null;
  is_active: boolean;
  created_at: Date | string;
  updated_at: Date | string;
  stock?: number; // Computed from inventory table
}

export interface Inventory {
  id: string;
  product_id: string;
  quantity_available: number;
  minimum_stock: number;
  last_updated: Date | string;
}

export interface Order {
  id: string;
  user_id: string | null;
  total_amount: number;
  status: 'pending' | 'completed' | 'cancelled' | 'refunded';
  payment_method: 'cash' | 'card' | 'digital';
  notes: string | null;
  created_at: Date | string;
}

export interface OrderItem {
  id: string;
  order_id: string;
  product_id: string | null;
  product_name: string;
  quantity: number;
  unit_price: number;
  subtotal: number;
  created_at: Date | string;
}

export interface CartItem {
  product: Product;
  quantity: number;
}

// Helper function to execute raw SQL queries with parameters
export async function query<T = any>(queryText: string, params?: any[]): Promise<T[]> {
  try {
    // Check if query has parameter placeholders ($1, $2, etc.)
    const hasPlaceholders = /\$\d+/.test(queryText);
    
    if (hasPlaceholders && params && params.length > 0) {
      // Use sql.query() for parameterized queries with $1, $2 placeholders
      const result = await sqlClient.query(queryText, params);
      return Array.isArray(result) ? result as T[] : (result.rows || []) as T[];
    } else if (!hasPlaceholders) {
      // For queries without placeholders, use tagged template literal with unsafe()
      const result = await (sqlClient as any)`${(sqlClient as any).unsafe(queryText)}`;
      return Array.isArray(result) ? result as T[] : (result.rows || []) as T[];
    } else {
      // Has placeholders but no params provided - this is an error
      throw new Error('Query contains placeholders but no parameters provided');
    }
  } catch (error) {
    console.error('Query error:', error);
    console.error('Query text:', queryText);
    console.error('Params:', params);
    throw error;
  }
}

// Helper function to get a single row
export async function queryOne<T = any>(queryText: string, params?: any[]): Promise<T | null> {
  const results = await query<T>(queryText, params);
  return results.length > 0 ? results[0] : null;
}

// Export sql for raw template literal usage
export const sql = sqlClient;

