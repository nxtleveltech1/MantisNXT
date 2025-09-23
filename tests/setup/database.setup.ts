import { Client } from 'pg'
import { readFileSync } from 'fs'
import { join } from 'path'

// Database test configuration
const TEST_DB_CONFIG = {
  host: process.env.TEST_DB_HOST || 'localhost',
  port: parseInt(process.env.TEST_DB_PORT || '5432'),
  database: process.env.TEST_DB_NAME || 'mantis_test',
  user: process.env.TEST_DB_USER || 'postgres',
  password: process.env.TEST_DB_PASSWORD || 'postgres',
}

const ADMIN_DB_CONFIG = {
  ...TEST_DB_CONFIG,
  database: 'postgres', // Connect to default db for creation
}

class DatabaseTestManager {
  private client: Client | null = null
  private adminClient: Client | null = null

  async setupDatabase(): Promise<void> {
    try {
      // Connect to admin database
      this.adminClient = new Client(ADMIN_DB_CONFIG)
      await this.adminClient.connect()

      // Drop test database if exists
      await this.adminClient.query(`DROP DATABASE IF EXISTS "${TEST_DB_CONFIG.database}"`)

      // Create test database
      await this.adminClient.query(`CREATE DATABASE "${TEST_DB_CONFIG.database}"`)

      await this.adminClient.end()

      // Connect to test database
      this.client = new Client(TEST_DB_CONFIG)
      await this.client.connect()

      // Load and execute schema
      const schemaPath = join(process.cwd(), 'database', 'schema', 'final_schema.sql')
      const schema = readFileSync(schemaPath, 'utf8')

      // Execute schema in chunks to handle complex statements
      const statements = schema.split(';').filter(stmt => stmt.trim())

      for (const statement of statements) {
        if (statement.trim()) {
          try {
            await this.client.query(statement)
          } catch (error) {
            console.warn(`Warning: Schema statement failed: ${error}`)
            // Continue with other statements
          }
        }
      }

      console.log('✅ Test database setup complete')
    } catch (error) {
      console.error('❌ Database setup failed:', error)
      throw error
    }
  }

  async seedTestData(): Promise<void> {
    if (!this.client) {
      throw new Error('Database not connected')
    }

    try {
      // Seed organizations
      await this.client.query(`
        INSERT INTO organizations (id, name, slug, domain, status, tier, settings)
        VALUES
          ('test-org-1', 'Test Organization 1', 'test-org-1', 'test1.example.com', 'active', 'enterprise', '{}'),
          ('test-org-2', 'Test Organization 2', 'test-org-2', 'test2.example.com', 'active', 'professional', '{}')
        ON CONFLICT (id) DO NOTHING
      `)

      // Seed users
      await this.client.query(`
        INSERT INTO users (id, email, first_name, last_name, role, organization_id, status)
        VALUES
          ('test-user-1', 'admin@test1.com', 'Test', 'Admin', 'admin', 'test-org-1', 'active'),
          ('test-user-2', 'manager@test1.com', 'Test', 'Manager', 'ops_manager', 'test-org-1', 'active'),
          ('test-user-3', 'user@test2.com', 'Test', 'User', 'ops_manager', 'test-org-2', 'active')
        ON CONFLICT (id) DO NOTHING
      `)

      // Seed warehouses
      await this.client.query(`
        INSERT INTO warehouses (id, name, code, organization_id, address, city, country, status)
        VALUES
          ('test-wh-1', 'Test Warehouse 1', 'TW001', 'test-org-1', '123 Test St', 'Test City', 'US', 'active'),
          ('test-wh-2', 'Test Warehouse 2', 'TW002', 'test-org-1', '456 Test Ave', 'Test City', 'US', 'active')
        ON CONFLICT (id) DO NOTHING
      `)

      // Seed locations
      await this.client.query(`
        INSERT INTO locations (id, warehouse_id, zone, aisle, shelf, bin, code, is_pickable, capacity_weight)
        VALUES
          ('test-loc-1', 'test-wh-1', 'A', '01', '01', '01', 'A-01-01-01', true, 1000.0),
          ('test-loc-2', 'test-wh-1', 'A', '01', '01', '02', 'A-01-01-02', true, 1000.0),
          ('test-loc-3', 'test-wh-2', 'B', '01', '01', '01', 'B-01-01-01', true, 1000.0)
        ON CONFLICT (id) DO NOTHING
      `)

      // Seed suppliers
      await this.client.query(`
        INSERT INTO suppliers (id, name, code, organization_id, contact_email, contact_phone, status, terms)
        VALUES
          ('test-sup-1', 'Test Supplier 1', 'TS001', 'test-org-1', 'contact@supplier1.com', '+1234567890', 'active', '{}'),
          ('test-sup-2', 'Test Supplier 2', 'TS002', 'test-org-1', 'contact@supplier2.com', '+1234567891', 'active', '{}')
        ON CONFLICT (id) DO NOTHING
      `)

      // Seed inventory items
      await this.client.query(`
        INSERT INTO inventory_items (
          id, sku, name, description, category_id, subcategory_id, organization_id,
          current_stock, reserved_stock, available_stock, reorder_point, max_stock, min_stock,
          unit_cost, unit_price, currency, unit, status, supplier_id, primary_location_id
        )
        VALUES
          (
            'test-item-1', 'TEST-001', 'Test Item 1', 'Test item description 1',
            'electronics', 'laptops', 'test-org-1',
            100, 10, 90, 20, 200, 5,
            99.99, 149.99, 'USD', 'pcs', 'active', 'test-sup-1', 'test-loc-1'
          ),
          (
            'test-item-2', 'TEST-002', 'Test Item 2', 'Test item description 2',
            'electronics', 'accessories', 'test-org-1',
            50, 0, 50, 10, 100, 2,
            29.99, 49.99, 'USD', 'pcs', 'active', 'test-sup-2', 'test-loc-2'
          ),
          (
            'test-item-3', 'TEST-003', 'Low Stock Item', 'Item with low stock',
            'electronics', 'accessories', 'test-org-1',
            5, 0, 5, 10, 50, 1,
            19.99, 34.99, 'USD', 'pcs', 'low_stock', 'test-sup-1', 'test-loc-1'
          ),
          (
            'test-item-4', 'TEST-004', 'Out of Stock Item', 'Item out of stock',
            'office', 'supplies', 'test-org-1',
            0, 0, 0, 5, 25, 1,
            9.99, 19.99, 'USD', 'pcs', 'out_of_stock', 'test-sup-2', 'test-loc-2'
          )
        ON CONFLICT (id) DO NOTHING
      `)

      console.log('✅ Test data seeded successfully')
    } catch (error) {
      console.error('❌ Test data seeding failed:', error)
      throw error
    }
  }

  async clearTestData(): Promise<void> {
    if (!this.client) return

    try {
      // Clear in reverse dependency order
      const tables = [
        'audit_logs',
        'stock_movements',
        'inventory_items',
        'locations',
        'warehouses',
        'suppliers',
        'users',
        'organizations'
      ]

      for (const table of tables) {
        await this.client.query(`DELETE FROM ${table} WHERE id LIKE 'test-%'`)
      }

      console.log('✅ Test data cleared')
    } catch (error) {
      console.error('❌ Test data clearing failed:', error)
    }
  }

  async teardownDatabase(): Promise<void> {
    try {
      if (this.client) {
        await this.client.end()
        this.client = null
      }

      // Reconnect to admin database to drop test database
      this.adminClient = new Client(ADMIN_DB_CONFIG)
      await this.adminClient.connect()

      await this.adminClient.query(`DROP DATABASE IF EXISTS "${TEST_DB_CONFIG.database}"`)
      await this.adminClient.end()

      console.log('✅ Test database torn down')
    } catch (error) {
      console.error('❌ Database teardown failed:', error)
    }
  }

  getClient(): Client {
    if (!this.client) {
      throw new Error('Database client not initialized')
    }
    return this.client
  }

  async query(text: string, params?: any[]): Promise<any> {
    if (!this.client) {
      throw new Error('Database client not initialized')
    }
    return this.client.query(text, params)
  }

  // Helper method for transaction testing
  async withTransaction<T>(callback: (client: Client) => Promise<T>): Promise<T> {
    if (!this.client) {
      throw new Error('Database client not initialized')
    }

    await this.client.query('BEGIN')
    try {
      const result = await callback(this.client)
      await this.client.query('COMMIT')
      return result
    } catch (error) {
      await this.client.query('ROLLBACK')
      throw error
    }
  }
}

// Global database manager instance
export const dbManager = new DatabaseTestManager()

// Jest setup functions
export async function setupTestDatabase(): Promise<void> {
  if (process.env.NODE_ENV !== 'test') {
    throw new Error('Database setup should only run in test environment')
  }

  await dbManager.setupDatabase()
  await dbManager.seedTestData()
}

export async function teardownTestDatabase(): Promise<void> {
  await dbManager.teardownDatabase()
}

export async function resetTestData(): Promise<void> {
  await dbManager.clearTestData()
  await dbManager.seedTestData()
}

// Utility function for test isolation
export async function withTestTransaction<T>(
  callback: (client: Client) => Promise<T>
): Promise<T> {
  return dbManager.withTransaction(callback)
}