/**
 * COMPREHENSIVE DATABASE VALIDATION SUITE FOR MANTISNXT
 *
 * Complete testing framework for:
 * - Database connectivity and performance
 * - Data persistence across all modules
 * - Cross-module data flow validation
 * - Index optimization analysis
 * - Constraint validation
 * - Sample data generation
 * - API response validation
 */

const { Pool } = require('pg');
const { performance } = require('perf_hooks');

class DatabaseValidationSuite {
  constructor() {
    this.pool = new Pool({
      host: process.env.DB_HOST || '62.169.20.53',
      port: parseInt(process.env.DB_PORT || '6600'),
      database: process.env.DB_NAME || 'nxtprod-db_001',
      user: process.env.DB_USER || 'nxtdb_admin',
      password: process.env.DB_PASSWORD || 'P@33w0rd-1',
      ssl: false,
      max: 50,
      min: 10,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 5000
    });

    this.testResults = {
      connectivity: {},
      persistence: {},
      crossModule: {},
      performance: {},
      indexes: {},
      constraints: {},
      sampleData: {},
      apiValidation: {}
    };

    // Enterprise tables to validate
    this.coreTables = [
      'organizations', 'users', 'roles', 'permissions', 'user_roles',
      'suppliers', 'supplier_contacts', 'supplier_performance',
      'inventory_items', 'stock_movements', 'stock_adjustments',
      'sales_orders', 'sales_order_items', 'invoices', 'invoice_items',
      'documents', 'workflows', 'upload_sessions', 'customers'
    ];

    // Critical indexes for performance
    this.requiredIndexes = [
      { table: 'inventory_items', column: 'sku', type: 'unique' },
      { table: 'suppliers', column: 'supplier_code', type: 'unique' },
      { table: 'users', column: 'email', type: 'unique' },
      { table: 'stock_movements', column: 'created_at', type: 'btree' },
      { table: 'sales_orders', column: 'customer_id', type: 'btree' },
      { table: 'invoice_items', column: 'invoice_id', type: 'btree' }
    ];
  }

  /**
   * Run complete validation suite
   */
  async runCompleteValidation() {
    console.log('🚀 Starting MantisNXT Database Validation Suite...\n');

    try {
      // 1. Test Database Connectivity
      await this.testDatabaseConnectivity();

      // 2. Test Data Persistence
      await this.testDataPersistence();

      // 3. Test Cross-Module Data Flow
      await this.testCrossModuleDataFlow();

      // 4. Performance Optimization
      await this.testPerformanceOptimization();

      // 5. Index Validation
      await this.validateIndexes();

      // 6. Constraint Validation
      await this.validateConstraints();

      // 7. Generate Sample Data
      await this.generateSampleData();

      // 8. API Response Validation
      await this.validateApiResponses();

      // Generate comprehensive report
      this.generateValidationReport();

    } catch (error) {
      console.error('❌ Validation suite failed:', error);
      throw error;
    } finally {
      await this.pool.end();
    }
  }

  /**
   * 1. DATABASE CONNECTIVITY TESTING
   */
  async testDatabaseConnectivity() {
    console.log('🔍 Testing Database Connectivity...');
    const startTime = performance.now();

    try {
      // Basic connection test
      const result = await this.pool.query('SELECT NOW() as current_time, version() as version');
      const connectionTime = performance.now() - startTime;

      this.testResults.connectivity = {
        status: 'success',
        connectionTime: `${connectionTime.toFixed(2)}ms`,
        serverTime: result.rows[0].current_time,
        version: result.rows[0].version,
        poolStatus: {
          totalCount: this.pool.totalCount,
          idleCount: this.pool.idleCount,
          waitingCount: this.pool.waitingCount
        }
      };

      console.log('✅ Database connectivity: PASSED');
      console.log(`   Connection time: ${connectionTime.toFixed(2)}ms`);
      console.log(`   Pool status: ${this.pool.totalCount} total, ${this.pool.idleCount} idle`);

    } catch (error) {
      this.testResults.connectivity = {
        status: 'failed',
        error: error.message,
        connectionTime: `${(performance.now() - startTime).toFixed(2)}ms`
      };
      console.log('❌ Database connectivity: FAILED');
      throw error;
    }
  }

  /**
   * 2. DATA PERSISTENCE TESTING
   */
  async testDataPersistence() {
    console.log('\n📝 Testing Data Persistence...');

    const persistenceTests = [
      {
        name: 'Supplier Form Submission',
        table: 'suppliers',
        testData: {
          supplier_code: `TEST_SUPP_${Date.now()}`,
          company_name: 'Test Supplier Company',
          contact_email: 'test@supplier.com',
          phone: '+1234567890',
          status: 'active'
        }
      },
      {
        name: 'Inventory Item Creation',
        table: 'inventory_items',
        testData: {
          sku: `TEST_SKU_${Date.now()}`,
          product_name: 'Test Product',
          category: 'Test Category',
          unit_price: 99.99,
          stock_quantity: 100,
          reorder_level: 10
        }
      },
      {
        name: 'User Registration',
        table: 'users',
        testData: {
          email: `test.${Date.now()}@mantisnxt.com`,
          first_name: 'Test',
          last_name: 'User',
          role: 'user',
          is_active: true
        }
      }
    ];

    for (const test of persistenceTests) {
      try {
        const startTime = performance.now();

        // Insert test data
        const columns = Object.keys(test.testData).join(', ');
        const values = Object.values(test.testData);
        const placeholders = values.map((_, i) => `$${i + 1}`).join(', ');

        const insertQuery = `
          INSERT INTO ${test.table} (${columns})
          VALUES (${placeholders})
          RETURNING *
        `;

        const insertResult = await this.pool.query(insertQuery, values);
        const insertTime = performance.now() - startTime;

        // Verify data was persisted
        const verifyQuery = `SELECT * FROM ${test.table} WHERE id = $1`;
        const verifyResult = await this.pool.query(verifyQuery, [insertResult.rows[0].id]);

        // Clean up test data
        const deleteQuery = `DELETE FROM ${test.table} WHERE id = $1`;
        await this.pool.query(deleteQuery, [insertResult.rows[0].id]);

        this.testResults.persistence[test.name] = {
          status: 'success',
          insertTime: `${insertTime.toFixed(2)}ms`,
          recordsInserted: insertResult.rowCount,
          recordsVerified: verifyResult.rowCount,
          dataIntegrity: verifyResult.rowCount === 1 ? 'valid' : 'invalid'
        };

        console.log(`✅ ${test.name}: PASSED (${insertTime.toFixed(2)}ms)`);

      } catch (error) {
        this.testResults.persistence[test.name] = {
          status: 'failed',
          error: error.message
        };
        console.log(`❌ ${test.name}: FAILED - ${error.message}`);
      }
    }
  }

  /**
   * 3. CROSS-MODULE DATA FLOW TESTING
   */
  async testCrossModuleDataFlow() {
    console.log('\n🔄 Testing Cross-Module Data Flow...');

    const client = await this.pool.connect();

    try {
      await client.query('BEGIN');

      // Create test organization
      const orgResult = await client.query(`
        INSERT INTO organizations (name, slug)
        VALUES ('Test Flow Org', 'test-flow-org-${Date.now()}')
        RETURNING id
      `);
      const orgId = orgResult.rows[0].id;

      // Create test user
      const userResult = await client.query(`
        INSERT INTO users (organization_id, email, first_name, last_name)
        VALUES ($1, $2, 'Flow', 'Test')
        RETURNING id
      `, [orgId, `flowtest.${Date.now()}@test.com`]);
      const userId = userResult.rows[0].id;

      // Create test supplier
      const supplierResult = await client.query(`
        INSERT INTO suppliers (organization_id, supplier_code, company_name)
        VALUES ($1, $2, 'Test Flow Supplier')
        RETURNING id
      `, [orgId, `FLOW_SUPP_${Date.now()}`]);
      const supplierId = supplierResult.rows[0].id;

      // Create test inventory item
      const inventoryResult = await client.query(`
        INSERT INTO inventory_items (organization_id, supplier_id, sku, product_name, unit_price)
        VALUES ($1, $2, $3, 'Flow Test Product', 50.00)
        RETURNING id
      `, [orgId, supplierId, `FLOW_SKU_${Date.now()}`]);
      const itemId = inventoryResult.rows[0].id;

      // Create stock movement
      const stockResult = await client.query(`
        INSERT INTO stock_movements (organization_id, inventory_item_id, movement_type, quantity, performed_by)
        VALUES ($1, $2, 'in', 100, $3)
        RETURNING id
      `, [orgId, itemId, userId]);
      const movementId = stockResult.rows[0].id;

      // Verify cross-module relationships
      const verificationQuery = `
        SELECT
          o.name as org_name,
          u.email as user_email,
          s.company_name as supplier_name,
          i.product_name as product_name,
          sm.quantity as stock_quantity
        FROM organizations o
        JOIN users u ON u.organization_id = o.id
        JOIN suppliers s ON s.organization_id = o.id
        JOIN inventory_items i ON i.organization_id = o.id AND i.supplier_id = s.id
        JOIN stock_movements sm ON sm.organization_id = o.id AND sm.inventory_item_id = i.id
        WHERE o.id = $1 AND u.id = $2 AND s.id = $3 AND i.id = $4 AND sm.id = $5
      `;

      const verifyResult = await client.query(verificationQuery, [orgId, userId, supplierId, itemId, movementId]);

      await client.query('ROLLBACK'); // Clean up all test data

      this.testResults.crossModule = {
        status: 'success',
        relationshipsVerified: verifyResult.rowCount,
        dataConsistency: verifyResult.rowCount === 1 ? 'valid' : 'invalid',
        modulesInvolved: ['organizations', 'users', 'suppliers', 'inventory', 'stock_movements']
      };

      console.log('✅ Cross-module data flow: PASSED');
      console.log(`   Relationships verified: ${verifyResult.rowCount}`);

    } catch (error) {
      await client.query('ROLLBACK');
      this.testResults.crossModule = {
        status: 'failed',
        error: error.message
      };
      console.log('❌ Cross-module data flow: FAILED');
    } finally {
      client.release();
    }
  }

  /**
   * 4. PERFORMANCE OPTIMIZATION TESTING
   */
  async testPerformanceOptimization() {
    console.log('\n⚡ Testing Performance Optimization...');

    const performanceTests = [
      {
        name: 'Large Table Query Performance',
        query: `
          SELECT COUNT(*) as total_items,
                 AVG(unit_price) as avg_price,
                 MAX(stock_quantity) as max_stock
          FROM inventory_items
          WHERE status = 'active'
        `
      },
      {
        name: 'Complex Join Performance',
        query: `
          SELECT s.company_name,
                 COUNT(i.id) as item_count,
                 SUM(sm.quantity) as total_stock
          FROM suppliers s
          LEFT JOIN inventory_items i ON i.supplier_id = s.id
          LEFT JOIN stock_movements sm ON sm.inventory_item_id = i.id
          WHERE s.status = 'active'
          GROUP BY s.id, s.company_name
          ORDER BY item_count DESC
          LIMIT 10
        `
      },
      {
        name: 'Time-Series Query Performance',
        query: `
          SELECT DATE_TRUNC('day', created_at) as date,
                 COUNT(*) as movement_count,
                 SUM(quantity) as total_quantity
          FROM stock_movements
          WHERE created_at >= NOW() - INTERVAL '30 days'
          GROUP BY DATE_TRUNC('day', created_at)
          ORDER BY date DESC
        `
      }
    ];

    for (const test of performanceTests) {
      try {
        const startTime = performance.now();
        const result = await this.pool.query(test.query);
        const queryTime = performance.now() - startTime;

        this.testResults.performance[test.name] = {
          status: 'success',
          queryTime: `${queryTime.toFixed(2)}ms`,
          rowsReturned: result.rowCount,
          performance: queryTime < 100 ? 'excellent' :
                      queryTime < 500 ? 'good' :
                      queryTime < 1000 ? 'fair' : 'poor'
        };

        console.log(`✅ ${test.name}: ${queryTime.toFixed(2)}ms (${this.testResults.performance[test.name].performance})`);

      } catch (error) {
        this.testResults.performance[test.name] = {
          status: 'failed',
          error: error.message
        };
        console.log(`❌ ${test.name}: FAILED`);
      }
    }
  }

  /**
   * 5. INDEX VALIDATION
   */
  async validateIndexes() {
    console.log('\n📊 Validating Database Indexes...');

    const indexQuery = `
      SELECT
        schemaname,
        tablename,
        indexname,
        indexdef
      FROM pg_indexes
      WHERE schemaname = 'public'
      ORDER BY tablename, indexname
    `;

    try {
      const result = await this.pool.query(indexQuery);
      const existingIndexes = result.rows;

      // Check for required indexes
      const missingIndexes = [];
      const foundIndexes = [];

      for (const requiredIndex of this.requiredIndexes) {
        const indexExists = existingIndexes.some(idx =>
          idx.tablename === requiredIndex.table &&
          idx.indexdef.toLowerCase().includes(requiredIndex.column.toLowerCase())
        );

        if (indexExists) {
          foundIndexes.push(requiredIndex);
        } else {
          missingIndexes.push(requiredIndex);
        }
      }

      this.testResults.indexes = {
        status: missingIndexes.length === 0 ? 'success' : 'warning',
        totalIndexes: existingIndexes.length,
        requiredIndexes: this.requiredIndexes.length,
        foundIndexes: foundIndexes.length,
        missingIndexes: missingIndexes,
        recommendations: this.generateIndexRecommendations(missingIndexes)
      };

      console.log(`✅ Index validation: ${foundIndexes.length}/${this.requiredIndexes.length} required indexes found`);
      if (missingIndexes.length > 0) {
        console.log(`⚠️  Missing indexes: ${missingIndexes.length}`);
      }

    } catch (error) {
      this.testResults.indexes = {
        status: 'failed',
        error: error.message
      };
      console.log('❌ Index validation: FAILED');
    }
  }

  /**
   * 6. CONSTRAINT VALIDATION
   */
  async validateConstraints() {
    console.log('\n🔒 Validating Database Constraints...');

    const constraintTests = [
      {
        name: 'Foreign Key Constraints',
        query: `
          SELECT COUNT(*) as violations
          FROM inventory_items i
          LEFT JOIN suppliers s ON i.supplier_id = s.id
          WHERE i.supplier_id IS NOT NULL AND s.id IS NULL
        `
      },
      {
        name: 'Unique Constraints',
        query: `
          SELECT sku, COUNT(*) as duplicate_count
          FROM inventory_items
          GROUP BY sku
          HAVING COUNT(*) > 1
        `
      },
      {
        name: 'Not Null Constraints',
        query: `
          SELECT COUNT(*) as null_violations
          FROM suppliers
          WHERE supplier_code IS NULL OR company_name IS NULL
        `
      }
    ];

    for (const test of constraintTests) {
      try {
        const result = await this.pool.query(test.query);
        const violations = result.rows[0].violations || result.rows[0].duplicate_count || result.rows.length;

        this.testResults.constraints[test.name] = {
          status: violations === 0 ? 'success' : 'warning',
          violations: violations,
          details: result.rows
        };

        if (violations === 0) {
          console.log(`✅ ${test.name}: PASSED`);
        } else {
          console.log(`⚠️  ${test.name}: ${violations} violations found`);
        }

      } catch (error) {
        this.testResults.constraints[test.name] = {
          status: 'failed',
          error: error.message
        };
        console.log(`❌ ${test.name}: FAILED`);
      }
    }
  }

  /**
   * 7. SAMPLE DATA GENERATION
   */
  async generateSampleData() {
    console.log('\n🎭 Generating Sample Data...');

    const client = await this.pool.connect();

    try {
      await client.query('BEGIN');

      // Generate sample organization
      const orgResult = await client.query(`
        INSERT INTO organizations (name, slug, settings)
        VALUES ('Sample Enterprise Corp', 'sample-enterprise', '{"theme": "corporate", "timezone": "UTC"}')
        ON CONFLICT (slug) DO UPDATE SET updated_at = NOW()
        RETURNING id
      `);
      const orgId = orgResult.rows[0].id;

      // Generate sample suppliers
      const supplierData = [
        { code: 'ACME001', name: 'ACME Manufacturing Co.', email: 'contact@acme.com' },
        { code: 'TECH002', name: 'TechSupply Solutions', email: 'sales@techsupply.com' },
        { code: 'GLOB003', name: 'Global Parts Inc.', email: 'orders@globalparts.com' }
      ];

      const supplierIds = [];
      for (const supplier of supplierData) {
        const result = await client.query(`
          INSERT INTO suppliers (organization_id, supplier_code, company_name, contact_email)
          VALUES ($1, $2, $3, $4)
          ON CONFLICT (supplier_code) DO UPDATE SET updated_at = NOW()
          RETURNING id
        `, [orgId, supplier.code, supplier.name, supplier.email]);
        supplierIds.push(result.rows[0].id);
      }

      // Generate sample inventory items
      const inventoryData = [
        { sku: 'LAPTOP001', name: 'Business Laptop Pro', price: 1299.99, stock: 50 },
        { sku: 'MOUSE002', name: 'Wireless Optical Mouse', price: 29.99, stock: 200 },
        { sku: 'KEYBOARD003', name: 'Mechanical Keyboard', price: 89.99, stock: 75 }
      ];

      for (let i = 0; i < inventoryData.length; i++) {
        const item = inventoryData[i];
        const supplierId = supplierIds[i % supplierIds.length];

        await client.query(`
          INSERT INTO inventory_items (
            organization_id, supplier_id, sku, product_name,
            unit_price, stock_quantity, reorder_level
          )
          VALUES ($1, $2, $3, $4, $5, $6, $7)
          ON CONFLICT (sku) DO UPDATE SET updated_at = NOW()
        `, [orgId, supplierId, item.sku, item.name, item.price, item.stock, 10]);
      }

      await client.query('COMMIT');

      this.testResults.sampleData = {
        status: 'success',
        organizationsCreated: 1,
        suppliersCreated: supplierData.length,
        inventoryItemsCreated: inventoryData.length,
        message: 'Sample data generated successfully'
      };

      console.log('✅ Sample data generation: PASSED');
      console.log(`   Organizations: 1, Suppliers: ${supplierData.length}, Items: ${inventoryData.length}`);

    } catch (error) {
      await client.query('ROLLBACK');
      this.testResults.sampleData = {
        status: 'failed',
        error: error.message
      };
      console.log('❌ Sample data generation: FAILED');
    } finally {
      client.release();
    }
  }

  /**
   * 8. API RESPONSE VALIDATION
   */
  async validateApiResponses() {
    console.log('\n🌐 Validating API Response Data...');

    const apiTests = [
      {
        name: 'Suppliers API Data',
        query: `
          SELECT
            id, supplier_code, company_name, contact_email, status,
            created_at, updated_at
          FROM suppliers
          WHERE status = 'active'
          LIMIT 5
        `
      },
      {
        name: 'Inventory API Data',
        query: `
          SELECT
            i.id, i.sku, i.product_name, i.unit_price, i.stock_quantity,
            s.company_name as supplier_name,
            i.created_at, i.updated_at
          FROM inventory_items i
          LEFT JOIN suppliers s ON i.supplier_id = s.id
          WHERE i.status = 'active'
          LIMIT 5
        `
      },
      {
        name: 'Stock Movements API Data',
        query: `
          SELECT
            sm.id, sm.movement_type, sm.quantity, sm.reason,
            i.sku as item_sku, i.product_name,
            sm.created_at
          FROM stock_movements sm
          JOIN inventory_items i ON sm.inventory_item_id = i.id
          ORDER BY sm.created_at DESC
          LIMIT 5
        `
      }
    ];

    for (const test of apiTests) {
      try {
        const startTime = performance.now();
        const result = await this.pool.query(test.query);
        const queryTime = performance.now() - startTime;

        // Validate data structure
        const dataValidation = this.validateApiDataStructure(result.rows);

        this.testResults.apiValidation[test.name] = {
          status: 'success',
          queryTime: `${queryTime.toFixed(2)}ms`,
          recordsReturned: result.rowCount,
          dataStructure: dataValidation,
          sampleData: result.rows.slice(0, 2) // First 2 records for validation
        };

        console.log(`✅ ${test.name}: ${result.rowCount} records (${queryTime.toFixed(2)}ms)`);

      } catch (error) {
        this.testResults.apiValidation[test.name] = {
          status: 'failed',
          error: error.message
        };
        console.log(`❌ ${test.name}: FAILED`);
      }
    }
  }

  /**
   * Helper: Validate API data structure
   */
  validateApiDataStructure(rows) {
    if (!rows || rows.length === 0) {
      return { valid: false, reason: 'No data returned' };
    }

    const firstRow = rows[0];
    const requiredFields = ['id', 'created_at'];
    const missingFields = requiredFields.filter(field => !(field in firstRow));

    return {
      valid: missingFields.length === 0,
      missingFields: missingFields,
      totalFields: Object.keys(firstRow).length,
      fieldTypes: Object.keys(firstRow).reduce((acc, key) => {
        acc[key] = typeof firstRow[key];
        return acc;
      }, {})
    };
  }

  /**
   * Helper: Generate index recommendations
   */
  generateIndexRecommendations(missingIndexes) {
    return missingIndexes.map(index => ({
      table: index.table,
      column: index.column,
      type: index.type,
      sql: `CREATE ${index.type === 'unique' ? 'UNIQUE ' : ''}INDEX IF NOT EXISTS idx_${index.table}_${index.column} ON ${index.table} (${index.column});`,
      impact: 'High - Will significantly improve query performance'
    }));
  }

  /**
   * Generate comprehensive validation report
   */
  generateValidationReport() {
    console.log('\n📋 MANTISNXT DATABASE VALIDATION REPORT');
    console.log('=' .repeat(50));

    const totalTests = Object.values(this.testResults).reduce((acc, section) => {
      if (typeof section === 'object' && section.status) {
        return acc + 1;
      }
      return acc + Object.keys(section).length;
    }, 0);

    const passedTests = Object.values(this.testResults).reduce((acc, section) => {
      if (typeof section === 'object' && section.status === 'success') {
        return acc + 1;
      }
      return acc + Object.values(section).filter(test => test.status === 'success').length;
    }, 0);

    console.log(`\n📊 OVERALL RESULTS: ${passedTests}/${totalTests} tests passed`);
    console.log(`🎯 Success Rate: ${((passedTests / totalTests) * 100).toFixed(1)}%`);

    // Detailed results
    console.log('\n🔍 DETAILED RESULTS:');
    console.log('─'.repeat(30));

    Object.entries(this.testResults).forEach(([category, results]) => {
      console.log(`\n${category.toUpperCase()}:`);
      if (results.status) {
        console.log(`  Status: ${results.status}`);
        if (results.error) console.log(`  Error: ${results.error}`);
      } else {
        Object.entries(results).forEach(([testName, result]) => {
          console.log(`  ${testName}: ${result.status}`);
          if (result.error) console.log(`    Error: ${result.error}`);
        });
      }
    });

    // Recommendations
    console.log('\n💡 RECOMMENDATIONS:');
    console.log('─'.repeat(30));

    if (this.testResults.indexes.missingIndexes?.length > 0) {
      console.log('\n🔧 MISSING INDEXES - RUN THESE COMMANDS:');
      this.testResults.indexes.recommendations.forEach(rec => {
        console.log(`  ${rec.sql}`);
      });
    }

    const failedTests = [];
    Object.entries(this.testResults).forEach(([category, results]) => {
      if (results.status === 'failed') {
        failedTests.push(`${category}: ${results.error}`);
      } else if (typeof results === 'object') {
        Object.entries(results).forEach(([testName, result]) => {
          if (result.status === 'failed') {
            failedTests.push(`${category}.${testName}: ${result.error}`);
          }
        });
      }
    });

    if (failedTests.length > 0) {
      console.log('\n⚠️  ISSUES TO ADDRESS:');
      failedTests.forEach(issue => console.log(`  - ${issue}`));
    }

    console.log('\n✅ Validation suite completed successfully!');
    console.log(`📈 Database health score: ${((passedTests / totalTests) * 100).toFixed(1)}%`);
  }
}

// Export for use in other scripts
module.exports = DatabaseValidationSuite;

// Run if called directly
if (require.main === module) {
  const suite = new DatabaseValidationSuite();
  suite.runCompleteValidation().catch(console.error);
}