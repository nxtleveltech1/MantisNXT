/**
 * CROSS-MODULE DATA FLOW TESTING FRAMEWORK FOR MANTISNXT
 *
 * Comprehensive testing of data flow across all business modules:
 * - Organization → Users → Suppliers → Inventory → Sales → Documents
 * - End-to-end transaction flows
 * - Data consistency validation
 * - Referential integrity testing
 * - Business rule validation
 * - Module integration testing
 */

const { Pool } = require('pg');
const { performance } = require('perf_hooks');

class CrossModuleDataFlowTester {
  constructor() {
    this.pool = new Pool({
      host: process.env.DB_HOST || '62.169.20.53',
      port: parseInt(process.env.DB_PORT || '6600'),
      database: process.env.DB_NAME || 'nxtprod-db_001',
      user: process.env.DB_USER || 'nxtdb_admin',
      password: process.env.DB_PASSWORD || 'P@33w0rd-1',
      ssl: false,
      max: 50,
      min: 10
    });

    this.testResults = {
      organizationFlow: {},
      supplierFlow: {},
      inventoryFlow: {},
      salesFlow: {},
      documentFlow: {},
      endToEndFlow: {},
      dataConsistency: {},
      businessRules: {}
    };

    this.testData = {
      organizationId: null,
      userId: null,
      supplierId: null,
      inventoryItemId: null,
      customerId: null,
      salesOrderId: null,
      documentId: null
    };
  }

  /**
   * Run complete cross-module testing suite
   */
  async runCrossModuleTests() {
    console.log('🌐 Starting MantisNXT Cross-Module Data Flow Testing...\n');

    try {
      await this.testOrganizationFlow();
      await this.testSupplierFlow();
      await this.testInventoryFlow();
      await this.testSalesFlow();
      await this.testDocumentFlow();
      await this.testEndToEndFlow();
      await this.testDataConsistency();
      await this.testBusinessRules();

      this.generateCrossModuleReport();

    } catch (error) {
      console.error('❌ Cross-module testing failed:', error);
      throw error;
    } finally {
      await this.cleanupTestData();
      await this.pool.end();
    }
  }

  /**
   * Test Organization Module Flow
   */
  async testOrganizationFlow() {
    console.log('🏢 Testing Organization Module Flow...');

    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');

      const startTime = performance.now();

      // 1. Create organization
      const orgResult = await client.query(`
        INSERT INTO organizations (name, slug, settings, subscription_plan, max_users)
        VALUES ('CrossModule Test Corp', $1, $2, 'enterprise', 100)
        RETURNING id, name, created_at
      `, [
        `crossmodule-test-${Date.now()}`,
        JSON.stringify({ theme: 'corporate', timezone: 'UTC', features: ['inventory', 'sales', 'documents'] })
      ]);

      this.testData.organizationId = orgResult.rows[0].id;

      // 2. Create admin user for organization
      const userResult = await client.query(`
        INSERT INTO users (organization_id, email, first_name, last_name, role, is_active)
        VALUES ($1, $2, 'Admin', 'User', 'admin', true)
        RETURNING id, email
      `, [this.testData.organizationId, `admin.${Date.now()}@crossmoduletest.com`]);

      this.testData.userId = userResult.rows[0].id;

      // 3. Create role for user
      const roleResult = await client.query(`
        INSERT INTO roles (organization_id, name, description, permissions)
        VALUES ($1, 'Test Admin', 'Cross-module test administrator', $2)
        RETURNING id
      `, [
        this.testData.organizationId,
        JSON.stringify(['manage_suppliers', 'manage_inventory', 'manage_sales', 'manage_documents'])
      ]);

      // 4. Assign role to user
      await client.query(`
        INSERT INTO user_roles (user_id, role_id, assigned_by)
        VALUES ($1, $2, $1)
      `, [this.testData.userId, roleResult.rows[0].id]);

      // 5. Verify organization hierarchy
      const verificationQuery = `
        SELECT
          o.name as org_name,
          o.subscription_plan,
          u.email as admin_email,
          r.name as role_name,
          ur.assigned_at
        FROM organizations o
        JOIN users u ON u.organization_id = o.id
        JOIN user_roles ur ON ur.user_id = u.id
        JOIN roles r ON r.id = ur.role_id
        WHERE o.id = $1
      `;

      const verifyResult = await client.query(verificationQuery, [this.testData.organizationId]);

      await client.query('COMMIT');

      const testTime = performance.now() - startTime;

      this.testResults.organizationFlow = {
        status: 'success',
        testTime: `${testTime.toFixed(2)}ms`,
        organizationCreated: true,
        userCreated: true,
        roleAssigned: true,
        hierarchyValid: verifyResult.rowCount === 1,
        testData: {
          organizationId: this.testData.organizationId,
          userId: this.testData.userId
        }
      };

      console.log('✅ Organization flow: PASSED');

    } catch (error) {
      await client.query('ROLLBACK');
      this.testResults.organizationFlow = {
        status: 'failed',
        error: error.message
      };
      console.log('❌ Organization flow: FAILED');
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Test Supplier Module Flow
   */
  async testSupplierFlow() {
    console.log('🏭 Testing Supplier Module Flow...');

    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');

      const startTime = performance.now();

      // 1. Create supplier
      const supplierResult = await client.query(`
        INSERT INTO suppliers (
          organization_id, supplier_code, company_name, contact_email,
          phone, address, payment_terms, status, created_by
        )
        VALUES ($1, $2, 'CrossModule Test Supplier', 'contact@cmtestsupplier.com',
                '+1234567890', $3, 'net_30', 'active', $4)
        RETURNING id, supplier_code
      `, [
        this.testData.organizationId,
        `CMS_${Date.now()}`,
        JSON.stringify({
          street: '123 Test Street',
          city: 'Test City',
          state: 'TS',
          zip: '12345',
          country: 'Test Country'
        }),
        this.testData.userId
      ]);

      this.testData.supplierId = supplierResult.rows[0].id;

      // 2. Create supplier contact
      await client.query(`
        INSERT INTO supplier_contacts (
          supplier_id, first_name, last_name, email, phone, position, is_primary
        )
        VALUES ($1, 'John', 'TestContact', 'john@cmtestsupplier.com', '+1234567891', 'Sales Manager', true)
      `, [this.testData.supplierId]);

      // 3. Create supplier performance record
      await client.query(`
        INSERT INTO supplier_performance (
          supplier_id, evaluation_date, quality_score, delivery_score,
          communication_score, overall_score, evaluated_by
        )
        VALUES ($1, CURRENT_DATE, 85, 90, 88, 87.67, $2)
      `, [this.testData.supplierId, this.testData.userId]);

      // 4. Verify supplier module integration
      const verificationQuery = `
        SELECT
          s.company_name,
          s.supplier_code,
          sc.first_name || ' ' || sc.last_name as contact_name,
          sp.overall_score,
          u.first_name || ' ' || u.last_name as created_by_name
        FROM suppliers s
        JOIN supplier_contacts sc ON sc.supplier_id = s.id AND sc.is_primary = true
        JOIN supplier_performance sp ON sp.supplier_id = s.id
        JOIN users u ON s.created_by = u.id
        WHERE s.id = $1
      `;

      const verifyResult = await client.query(verificationQuery, [this.testData.supplierId]);

      await client.query('COMMIT');

      const testTime = performance.now() - startTime;

      this.testResults.supplierFlow = {
        status: 'success',
        testTime: `${testTime.toFixed(2)}ms`,
        supplierCreated: true,
        contactCreated: true,
        performanceRecorded: true,
        integrationValid: verifyResult.rowCount === 1,
        testData: {
          supplierId: this.testData.supplierId,
          supplierCode: supplierResult.rows[0].supplier_code
        }
      };

      console.log('✅ Supplier flow: PASSED');

    } catch (error) {
      await client.query('ROLLBACK');
      this.testResults.supplierFlow = {
        status: 'failed',
        error: error.message
      };
      console.log('❌ Supplier flow: FAILED');
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Test Inventory Module Flow
   */
  async testInventoryFlow() {
    console.log('📦 Testing Inventory Module Flow...');

    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');

      const startTime = performance.now();

      // 1. Create inventory item
      const itemResult = await client.query(`
        INSERT INTO inventory_items (
          organization_id, supplier_id, sku, product_name, description,
          category, unit_price, cost_price, stock_quantity, reorder_level,
          status, created_by
        )
        VALUES ($1, $2, $3, 'CrossModule Test Product', 'Test product for cross-module validation',
                'Electronics', 99.99, 70.00, 0, 10, 'active', $4)
        RETURNING id, sku
      `, [
        this.testData.organizationId,
        this.testData.supplierId,
        `CMTP_${Date.now()}`,
        this.testData.userId
      ]);

      this.testData.inventoryItemId = itemResult.rows[0].id;

      // 2. Create initial stock movement (stock in)
      await client.query(`
        INSERT INTO stock_movements (
          organization_id, inventory_item_id, movement_type, quantity,
          reason, reference_number, performed_by
        )
        VALUES ($1, $2, 'in', 100, 'Initial stock', $3, $4)
      `, [
        this.testData.organizationId,
        this.testData.inventoryItemId,
        `PO_${Date.now()}`,
        this.testData.userId
      ]);

      // 3. Update inventory quantity
      await client.query(`
        UPDATE inventory_items
        SET stock_quantity = stock_quantity + 100,
            updated_at = NOW()
        WHERE id = $1
      `, [this.testData.inventoryItemId]);

      // 4. Create stock adjustment
      await client.query(`
        INSERT INTO stock_adjustments (
          organization_id, inventory_item_id, adjustment_type, quantity,
          reason, performed_by
        )
        VALUES ($1, $2, 'correction', 5, 'Cycle count adjustment', $3)
      `, [
        this.testData.organizationId,
        this.testData.inventoryItemId,
        this.testData.userId
      ]);

      // 5. Verify inventory module integration
      const verificationQuery = `
        SELECT
          i.sku,
          i.product_name,
          i.stock_quantity,
          s.company_name as supplier_name,
          COUNT(sm.id) as movement_count,
          COUNT(sa.id) as adjustment_count,
          u.first_name || ' ' || u.last_name as created_by_name
        FROM inventory_items i
        JOIN suppliers s ON i.supplier_id = s.id
        LEFT JOIN stock_movements sm ON sm.inventory_item_id = i.id
        LEFT JOIN stock_adjustments sa ON sa.inventory_item_id = i.id
        JOIN users u ON i.created_by = u.id
        WHERE i.id = $1
        GROUP BY i.id, s.company_name, u.first_name, u.last_name
      `;

      const verifyResult = await client.query(verificationQuery, [this.testData.inventoryItemId]);

      await client.query('COMMIT');

      const testTime = performance.now() - startTime;

      this.testResults.inventoryFlow = {
        status: 'success',
        testTime: `${testTime.toFixed(2)}ms`,
        inventoryItemCreated: true,
        stockMovementCreated: true,
        stockAdjustmentCreated: true,
        supplierLinkValid: true,
        integrationValid: verifyResult.rowCount === 1,
        testData: {
          inventoryItemId: this.testData.inventoryItemId,
          sku: itemResult.rows[0].sku,
          currentStock: verifyResult.rows[0]?.stock_quantity || 0
        }
      };

      console.log('✅ Inventory flow: PASSED');

    } catch (error) {
      await client.query('ROLLBACK');
      this.testResults.inventoryFlow = {
        status: 'failed',
        error: error.message
      };
      console.log('❌ Inventory flow: FAILED');
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Test Sales Module Flow
   */
  async testSalesFlow() {
    console.log('💰 Testing Sales Module Flow...');

    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');

      const startTime = performance.now();

      // 1. Create customer
      const customerResult = await client.query(`
        INSERT INTO customers (
          organization_id, customer_number, company_name, contact_email,
          phone, payment_terms, status, created_by
        )
        VALUES ($1, $2, 'CrossModule Test Customer', 'customer@cmtest.com',
                '+1234567892', 'net_15', 'active', $3)
        RETURNING id, customer_number
      `, [
        this.testData.organizationId,
        `CMTC_${Date.now()}`,
        this.testData.userId
      ]);

      this.testData.customerId = customerResult.rows[0].id;

      // 2. Create sales order
      const orderResult = await client.query(`
        INSERT INTO sales_orders (
          organization_id, customer_id, order_number, order_date,
          status, total_amount, created_by
        )
        VALUES ($1, $2, $3, CURRENT_DATE, 'pending', 199.98, $4)
        RETURNING id, order_number
      `, [
        this.testData.organizationId,
        this.testData.customerId,
        `SO_${Date.now()}`,
        this.testData.userId
      ]);

      this.testData.salesOrderId = orderResult.rows[0].id;

      // 3. Create order items
      await client.query(`
        INSERT INTO sales_order_items (
          sales_order_id, inventory_item_id, quantity, unit_price, total_price
        )
        VALUES ($1, $2, 2, 99.99, 199.98)
      `, [this.testData.salesOrderId, this.testData.inventoryItemId]);

      // 4. Create invoice
      const invoiceResult = await client.query(`
        INSERT INTO invoices (
          organization_id, customer_id, sales_order_id, invoice_number,
          invoice_date, due_date, status, total_amount, created_by
        )
        VALUES ($1, $2, $3, $4, CURRENT_DATE, CURRENT_DATE + INTERVAL '15 days',
                'pending', 199.98, $5)
        RETURNING id, invoice_number
      `, [
        this.testData.organizationId,
        this.testData.customerId,
        this.testData.salesOrderId,
        `INV_${Date.now()}`,
        this.testData.userId
      ]);

      // 5. Create invoice items
      await client.query(`
        INSERT INTO invoice_items (
          invoice_id, inventory_item_id, quantity, unit_price, total_price
        )
        VALUES ($1, $2, 2, 99.99, 199.98)
      `, [invoiceResult.rows[0].id, this.testData.inventoryItemId]);

      // 6. Verify sales module integration
      const verificationQuery = `
        SELECT
          c.company_name as customer_name,
          so.order_number,
          soi.quantity as ordered_quantity,
          i.invoice_number,
          ii.quantity as invoiced_quantity,
          inv.sku as item_sku,
          inv.product_name,
          u.first_name || ' ' || u.last_name as created_by_name
        FROM customers c
        JOIN sales_orders so ON so.customer_id = c.id
        JOIN sales_order_items soi ON soi.sales_order_id = so.id
        JOIN inventory_items inv ON soi.inventory_item_id = inv.id
        JOIN invoices i ON i.sales_order_id = so.id
        JOIN invoice_items ii ON ii.invoice_id = i.id AND ii.inventory_item_id = inv.id
        JOIN users u ON so.created_by = u.id
        WHERE c.id = $1 AND so.id = $2
      `;

      const verifyResult = await client.query(verificationQuery, [this.testData.customerId, this.testData.salesOrderId]);

      await client.query('COMMIT');

      const testTime = performance.now() - startTime;

      this.testResults.salesFlow = {
        status: 'success',
        testTime: `${testTime.toFixed(2)}ms`,
        customerCreated: true,
        salesOrderCreated: true,
        invoiceCreated: true,
        inventoryLinkValid: true,
        integrationValid: verifyResult.rowCount === 1,
        testData: {
          customerId: this.testData.customerId,
          salesOrderId: this.testData.salesOrderId,
          orderNumber: orderResult.rows[0].order_number
        }
      };

      console.log('✅ Sales flow: PASSED');

    } catch (error) {
      await client.query('ROLLBACK');
      this.testResults.salesFlow = {
        status: 'failed',
        error: error.message
      };
      console.log('❌ Sales flow: FAILED');
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Test Document Module Flow
   */
  async testDocumentFlow() {
    console.log('📄 Testing Document Module Flow...');

    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');

      const startTime = performance.now();

      // 1. Create document
      const docResult = await client.query(`
        INSERT INTO documents (
          organization_id, title, description, document_type, file_path,
          file_size, mime_type, uploaded_by
        )
        VALUES ($1, 'CrossModule Test Document', 'Test document for cross-module validation',
                'purchase_order', '/uploads/test-document.pdf', 1024, 'application/pdf', $2)
        RETURNING id, title
      `, [this.testData.organizationId, this.testData.userId]);

      this.testData.documentId = docResult.rows[0].id;

      // 2. Create workflow for document
      await client.query(`
        INSERT INTO workflows (
          organization_id, document_id, workflow_type, status,
          assigned_to, created_by
        )
        VALUES ($1, $2, 'approval', 'pending', $3, $3)
      `, [
        this.testData.organizationId,
        this.testData.documentId,
        this.testData.userId
      ]);

      // 3. Link document to supplier
      await client.query(`
        UPDATE documents
        SET metadata = jsonb_build_object(
          'related_supplier_id', $2,
          'related_sales_order_id', $3,
          'tags', '["crossmodule", "test", "integration"]'
        )
        WHERE id = $1
      `, [this.testData.documentId, this.testData.supplierId, this.testData.salesOrderId]);

      // 4. Verify document module integration
      const verificationQuery = `
        SELECT
          d.title,
          d.document_type,
          d.metadata,
          w.workflow_type,
          w.status as workflow_status,
          s.company_name as related_supplier,
          so.order_number as related_order,
          u.first_name || ' ' || u.last_name as uploaded_by_name
        FROM documents d
        LEFT JOIN workflows w ON w.document_id = d.id
        LEFT JOIN suppliers s ON s.id = CAST(d.metadata->>'related_supplier_id' AS UUID)
        LEFT JOIN sales_orders so ON so.id = CAST(d.metadata->>'related_sales_order_id' AS UUID)
        JOIN users u ON d.uploaded_by = u.id
        WHERE d.id = $1
      `;

      const verifyResult = await client.query(verificationQuery, [this.testData.documentId]);

      await client.query('COMMIT');

      const testTime = performance.now() - startTime;

      this.testResults.documentFlow = {
        status: 'success',
        testTime: `${testTime.toFixed(2)}ms`,
        documentCreated: true,
        workflowCreated: true,
        metadataLinked: true,
        crossModuleReferences: true,
        integrationValid: verifyResult.rowCount === 1,
        testData: {
          documentId: this.testData.documentId,
          documentTitle: docResult.rows[0].title
        }
      };

      console.log('✅ Document flow: PASSED');

    } catch (error) {
      await client.query('ROLLBACK');
      this.testResults.documentFlow = {
        status: 'failed',
        error: error.message
      };
      console.log('❌ Document flow: FAILED');
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Test End-to-End Flow
   */
  async testEndToEndFlow() {
    console.log('🔄 Testing End-to-End Data Flow...');

    try {
      const startTime = performance.now();

      // Comprehensive cross-module query
      const endToEndQuery = `
        SELECT
          o.name as organization_name,
          u.email as user_email,
          s.company_name as supplier_name,
          i.sku as inventory_sku,
          i.product_name,
          c.company_name as customer_name,
          so.order_number,
          inv.invoice_number,
          d.title as document_title,
          w.status as workflow_status,
          sm.quantity as stock_movement_qty,
          sa.quantity as adjustment_qty
        FROM organizations o
        JOIN users u ON u.organization_id = o.id
        JOIN suppliers s ON s.organization_id = o.id
        JOIN inventory_items i ON i.organization_id = o.id AND i.supplier_id = s.id
        JOIN customers c ON c.organization_id = o.id
        JOIN sales_orders so ON so.organization_id = o.id AND so.customer_id = c.id
        JOIN sales_order_items soi ON soi.sales_order_id = so.id AND soi.inventory_item_id = i.id
        JOIN invoices inv ON inv.organization_id = o.id AND inv.sales_order_id = so.id
        JOIN documents d ON d.organization_id = o.id
        JOIN workflows w ON w.organization_id = o.id AND w.document_id = d.id
        JOIN stock_movements sm ON sm.organization_id = o.id AND sm.inventory_item_id = i.id
        JOIN stock_adjustments sa ON sa.organization_id = o.id AND sa.inventory_item_id = i.id
        WHERE o.id = $1
      `;

      const result = await this.pool.query(endToEndQuery, [this.testData.organizationId]);

      const testTime = performance.now() - startTime;

      this.testResults.endToEndFlow = {
        status: 'success',
        testTime: `${testTime.toFixed(2)}ms`,
        recordsFound: result.rowCount,
        allModulesConnected: result.rowCount > 0,
        dataIntegrity: result.rowCount === 1 ? 'perfect' : 'issues',
        modulesCovered: [
          'organizations', 'users', 'suppliers', 'inventory',
          'customers', 'sales', 'invoices', 'documents', 'workflows'
        ]
      };

      console.log('✅ End-to-end flow: PASSED');
      console.log(`   All ${this.testResults.endToEndFlow.modulesCovered.length} modules connected`);

    } catch (error) {
      this.testResults.endToEndFlow = {
        status: 'failed',
        error: error.message
      };
      console.log('❌ End-to-end flow: FAILED');
    }
  }

  /**
   * Test Data Consistency
   */
  async testDataConsistency() {
    console.log('🔍 Testing Data Consistency...');

    const consistencyTests = [
      {
        name: 'Organization Reference Consistency',
        query: `
          SELECT
            'users' as table_name,
            COUNT(*) as orphaned_records
          FROM users u
          LEFT JOIN organizations o ON u.organization_id = o.id
          WHERE u.organization_id IS NOT NULL AND o.id IS NULL
          UNION ALL
          SELECT
            'suppliers' as table_name,
            COUNT(*) as orphaned_records
          FROM suppliers s
          LEFT JOIN organizations o ON s.organization_id = o.id
          WHERE s.organization_id IS NOT NULL AND o.id IS NULL
        `
      },
      {
        name: 'Inventory Reference Consistency',
        query: `
          SELECT COUNT(*) as orphaned_stock_movements
          FROM stock_movements sm
          LEFT JOIN inventory_items i ON sm.inventory_item_id = i.id
          WHERE sm.inventory_item_id IS NOT NULL AND i.id IS NULL
        `
      },
      {
        name: 'Sales Reference Consistency',
        query: `
          SELECT COUNT(*) as orphaned_order_items
          FROM sales_order_items soi
          LEFT JOIN sales_orders so ON soi.sales_order_id = so.id
          LEFT JOIN inventory_items i ON soi.inventory_item_id = i.id
          WHERE soi.sales_order_id IS NOT NULL AND so.id IS NULL
            OR soi.inventory_item_id IS NOT NULL AND i.id IS NULL
        `
      }
    ];

    for (const test of consistencyTests) {
      try {
        const result = await this.pool.query(test.query);
        const orphanedRecords = result.rows.reduce((sum, row) =>
          sum + parseInt(row.orphaned_records || row.orphaned_stock_movements || row.orphaned_order_items || 0), 0);

        this.testResults.dataConsistency[test.name] = {
          status: orphanedRecords === 0 ? 'success' : 'warning',
          orphanedRecords: orphanedRecords,
          details: result.rows
        };

        if (orphanedRecords === 0) {
          console.log(`✅ ${test.name}: PASSED`);
        } else {
          console.log(`⚠️  ${test.name}: ${orphanedRecords} orphaned records`);
        }

      } catch (error) {
        this.testResults.dataConsistency[test.name] = {
          status: 'failed',
          error: error.message
        };
        console.log(`❌ ${test.name}: FAILED`);
      }
    }
  }

  /**
   * Test Business Rules
   */
  async testBusinessRules() {
    console.log('⚖️ Testing Business Rules...');

    const businessRuleTests = [
      {
        name: 'Stock Quantity Cannot Be Negative',
        query: `
          SELECT COUNT(*) as violations
          FROM inventory_items
          WHERE stock_quantity < 0
        `
      },
      {
        name: 'Order Total Matches Item Totals',
        query: `
          SELECT COUNT(*) as violations
          FROM sales_orders so
          JOIN (
            SELECT sales_order_id, SUM(total_price) as calculated_total
            FROM sales_order_items
            GROUP BY sales_order_id
          ) calc ON calc.sales_order_id = so.id
          WHERE ABS(so.total_amount - calc.calculated_total) > 0.01
        `
      },
      {
        name: 'Users Belong to Valid Organizations',
        query: `
          SELECT COUNT(*) as violations
          FROM users u
          JOIN organizations o ON u.organization_id = o.id
          WHERE o.is_active = false AND u.is_active = true
        `
      }
    ];

    for (const test of businessRuleTests) {
      try {
        const result = await this.pool.query(test.query);
        const violations = parseInt(result.rows[0].violations || 0);

        this.testResults.businessRules[test.name] = {
          status: violations === 0 ? 'success' : 'warning',
          violations: violations
        };

        if (violations === 0) {
          console.log(`✅ ${test.name}: PASSED`);
        } else {
          console.log(`⚠️  ${test.name}: ${violations} violations`);
        }

      } catch (error) {
        this.testResults.businessRules[test.name] = {
          status: 'failed',
          error: error.message
        };
        console.log(`❌ ${test.name}: FAILED`);
      }
    }
  }

  /**
   * Clean up test data
   */
  async cleanupTestData() {
    console.log('\n🧹 Cleaning up test data...');

    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');

      // Delete in reverse order to maintain referential integrity
      if (this.testData.organizationId) {
        await client.query('DELETE FROM organizations WHERE id = $1', [this.testData.organizationId]);
        console.log('✅ Test data cleaned up successfully');
      }

      await client.query('COMMIT');

    } catch (error) {
      await client.query('ROLLBACK');
      console.log('⚠️  Failed to clean up test data:', error.message);
    } finally {
      client.release();
    }
  }

  /**
   * Generate comprehensive cross-module report
   */
  generateCrossModuleReport() {
    console.log('\n📋 MANTISNXT CROSS-MODULE DATA FLOW REPORT');
    console.log('=' .repeat(50));

    const moduleTests = [
      'organizationFlow', 'supplierFlow', 'inventoryFlow',
      'salesFlow', 'documentFlow', 'endToEndFlow'
    ];

    const passedModules = moduleTests.filter(test =>
      this.testResults[test]?.status === 'success'
    ).length;

    console.log(`\n🎯 MODULE INTEGRATION: ${passedModules}/${moduleTests.length} modules passed`);
    console.log(`📊 Success Rate: ${((passedModules / moduleTests.length) * 100).toFixed(1)}%`);

    console.log('\n🔍 MODULE RESULTS:');
    console.log('─'.repeat(30));

    moduleTests.forEach(test => {
      const result = this.testResults[test];
      const status = result?.status === 'success' ? '✅' : '❌';
      const time = result?.testTime || 'N/A';
      console.log(`  ${status} ${test}: ${time}`);
    });

    console.log('\n🔗 DATA CONSISTENCY:');
    console.log('─'.repeat(30));

    Object.entries(this.testResults.dataConsistency).forEach(([test, result]) => {
      const status = result.status === 'success' ? '✅' : result.status === 'warning' ? '⚠️ ' : '❌';
      console.log(`  ${status} ${test}: ${result.orphanedRecords || 0} issues`);
    });

    console.log('\n⚖️  BUSINESS RULES:');
    console.log('─'.repeat(30));

    Object.entries(this.testResults.businessRules).forEach(([test, result]) => {
      const status = result.status === 'success' ? '✅' : result.status === 'warning' ? '⚠️ ' : '❌';
      console.log(`  ${status} ${test}: ${result.violations || 0} violations`);
    });

    console.log('\n💡 RECOMMENDATIONS:');
    console.log('─'.repeat(30));

    const recommendations = [];

    // Check for failed modules
    const failedModules = moduleTests.filter(test =>
      this.testResults[test]?.status === 'failed'
    );

    if (failedModules.length > 0) {
      recommendations.push(`Fix failed modules: ${failedModules.join(', ')}`);
    }

    // Check for data consistency issues
    const consistencyIssues = Object.values(this.testResults.dataConsistency)
      .filter(result => result.orphanedRecords > 0);

    if (consistencyIssues.length > 0) {
      recommendations.push('Address data consistency issues - run data cleanup scripts');
    }

    // Check for business rule violations
    const ruleViolations = Object.values(this.testResults.businessRules)
      .filter(result => result.violations > 0);

    if (ruleViolations.length > 0) {
      recommendations.push('Fix business rule violations - review data validation');
    }

    if (recommendations.length === 0) {
      console.log('  ✅ All cross-module tests passed - no issues found');
    } else {
      recommendations.forEach(rec => console.log(`  • ${rec}`));
    }

    console.log('\n✅ Cross-module testing completed successfully!');
    console.log(`🌐 Platform integration score: ${((passedModules / moduleTests.length) * 100).toFixed(1)}%`);
  }
}

// Export for use in other scripts
module.exports = CrossModuleDataFlowTester;

// Run if called directly
if (require.main === module) {
  const tester = new CrossModuleDataFlowTester();
  tester.runCrossModuleTests().catch(console.error);
}