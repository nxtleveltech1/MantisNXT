/**
 * REALISTIC SAMPLE DATA GENERATOR FOR MANTISNXT
 *
 * Generates comprehensive, realistic test data for all modules:
 * - Organizations with realistic settings
 * - Users with proper roles and permissions
 * - Suppliers with performance data
 * - Inventory items with movement history
 * - Customers with sales history
 * - Orders and invoices
 * - Documents and workflows
 * - Analytics and reporting data
 */

const { Pool } = require('pg');
const { faker } = require('@faker-js/faker');

class SampleDataGenerator {
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

    this.generatedIds = {
      organizations: [],
      users: [],
      roles: [],
      suppliers: [],
      customers: [],
      inventoryItems: [],
      salesOrders: [],
      invoices: [],
      documents: []
    };

    this.categories = [
      'Electronics', 'Office Supplies', 'Furniture', 'Hardware',
      'Software', 'Cleaning Supplies', 'Safety Equipment', 'Tools'
    ];

    this.paymentTerms = ['net_15', 'net_30', 'net_45', 'net_60', 'cod', 'prepaid'];
    this.documentTypes = ['invoice', 'purchase_order', 'contract', 'certificate', 'manual'];
    this.movementTypes = ['in', 'out', 'transfer', 'adjustment'];
  }

  /**
   * Generate complete sample data set
   */
  async generateCompleteSampleData() {
    console.log('🎭 Starting MantisNXT Sample Data Generation...\n');

    try {
      await this.generateOrganizations(3);
      await this.generateUsers(25);
      await this.generateRoles();
      await this.generateSuppliers(15);
      await this.generateCustomers(20);
      await this.generateInventoryItems(100);
      await this.generateStockMovements(300);
      await this.generateSalesOrders(50);
      await this.generateInvoices(45);
      await this.generateDocuments(30);
      await this.generateWorkflows();
      await this.generatePerformanceData();

      this.generateDataSummary();

    } catch (error) {
      console.error('❌ Sample data generation failed:', error);
      throw error;
    } finally {
      await this.pool.end();
    }
  }

  /**
   * Generate Organizations
   */
  async generateOrganizations(count = 3) {
    console.log(`🏢 Generating ${count} organizations...`);

    const client = await this.pool.connect();
    try {
      for (let i = 0; i < count; i++) {
        const companyName = faker.company.name();
        const slug = companyName.toLowerCase()
          .replace(/[^a-z0-9]/g, '-')
          .replace(/-+/g, '-')
          .replace(/^-|-$/g, '');

        const orgData = {
          name: companyName,
          slug: `${slug}-${Date.now()}-${i}`,
          domain: faker.internet.domainName(),
          settings: JSON.stringify({
            theme: faker.helpers.arrayElement(['corporate', 'modern', 'classic']),
            timezone: faker.helpers.arrayElement(['UTC', 'EST', 'PST', 'CST', 'MST']),
            currency: faker.helpers.arrayElement(['USD', 'EUR', 'GBP', 'CAD']),
            features: faker.helpers.arrayElements([
              'inventory', 'sales', 'documents', 'analytics', 'reporting'
            ], { min: 3, max: 5 })
          }),
          subscription_plan: faker.helpers.arrayElement(['basic', 'professional', 'enterprise']),
          max_users: faker.number.int({ min: 10, max: 100 }),
          is_active: true
        };

        const result = await client.query(`
          INSERT INTO organizations (name, slug, domain, settings, subscription_plan, max_users, is_active)
          VALUES ($1, $2, $3, $4, $5, $6, $7)
          RETURNING id, name
        `, [
          orgData.name, orgData.slug, orgData.domain, orgData.settings,
          orgData.subscription_plan, orgData.max_users, orgData.is_active
        ]);

        this.generatedIds.organizations.push(result.rows[0].id);
      }

      console.log(`✅ Generated ${count} organizations`);

    } catch (error) {
      console.log('❌ Failed to generate organizations:', error.message);
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Generate Users
   */
  async generateUsers(count = 25) {
    console.log(`👥 Generating ${count} users...`);

    const client = await this.pool.connect();
    try {
      for (let i = 0; i < count; i++) {
        const orgId = faker.helpers.arrayElement(this.generatedIds.organizations);
        const firstName = faker.person.firstName();
        const lastName = faker.person.lastName();

        const userData = {
          organization_id: orgId,
          email: faker.internet.email({ firstName, lastName }),
          password_hash: '$2b$10$dummy.hash.for.testing.purposes.only',
          first_name: firstName,
          last_name: lastName,
          phone: faker.phone.number(),
          role: faker.helpers.arrayElement(['admin', 'manager', 'user', 'viewer']),
          department: faker.helpers.arrayElement([
            'Sales', 'Operations', 'Finance', 'IT', 'HR', 'Procurement'
          ]),
          is_active: faker.datatype.boolean({ probability: 0.9 }),
          last_login: faker.date.recent({ days: 30 })
        };

        const result = await client.query(`
          INSERT INTO users (
            organization_id, email, password_hash, first_name, last_name,
            phone, role, department, is_active, last_login
          )
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
          RETURNING id, email
        `, [
          userData.organization_id, userData.email, userData.password_hash,
          userData.first_name, userData.last_name, userData.phone,
          userData.role, userData.department, userData.is_active, userData.last_login
        ]);

        this.generatedIds.users.push(result.rows[0].id);
      }

      console.log(`✅ Generated ${count} users`);

    } catch (error) {
      console.log('❌ Failed to generate users:', error.message);
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Generate Roles and Permissions
   */
  async generateRoles() {
    console.log('🔐 Generating roles and permissions...');

    const client = await this.pool.connect();
    try {
      const roles = [
        {
          name: 'Super Admin',
          description: 'Full system access',
          permissions: [
            'manage_organizations', 'manage_users', 'manage_suppliers',
            'manage_inventory', 'manage_sales', 'manage_documents', 'view_analytics'
          ]
        },
        {
          name: 'Inventory Manager',
          description: 'Inventory and supplier management',
          permissions: ['manage_inventory', 'manage_suppliers', 'view_reports']
        },
        {
          name: 'Sales Manager',
          description: 'Sales and customer management',
          permissions: ['manage_sales', 'manage_customers', 'view_reports']
        },
        {
          name: 'Operations Staff',
          description: 'Day-to-day operations',
          permissions: ['view_inventory', 'create_orders', 'update_stock']
        }
      ];

      for (const orgId of this.generatedIds.organizations) {
        for (const roleData of roles) {
          const result = await client.query(`
            INSERT INTO roles (organization_id, name, description, permissions, is_system_role)
            VALUES ($1, $2, $3, $4, false)
            RETURNING id
          `, [
            orgId, roleData.name, roleData.description,
            JSON.stringify(roleData.permissions)
          ]);

          this.generatedIds.roles.push(result.rows[0].id);
        }
      }

      // Assign roles to users
      for (const userId of this.generatedIds.users) {
        const roleId = faker.helpers.arrayElement(this.generatedIds.roles);
        await client.query(`
          INSERT INTO user_roles (user_id, role_id, assigned_by)
          VALUES ($1, $2, $1)
          ON CONFLICT (user_id, role_id) DO NOTHING
        `, [userId, roleId]);
      }

      console.log('✅ Generated roles and assigned to users');

    } catch (error) {
      console.log('❌ Failed to generate roles:', error.message);
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Generate Suppliers
   */
  async generateSuppliers(count = 15) {
    console.log(`🏭 Generating ${count} suppliers...`);

    const client = await this.pool.connect();
    try {
      for (let i = 0; i < count; i++) {
        const orgId = faker.helpers.arrayElement(this.generatedIds.organizations);
        const userId = faker.helpers.arrayElement(
          this.generatedIds.users.filter(id =>
            // Would need to filter by org, but for sample data this is fine
            true
          )
        );

        const companyName = faker.company.name();
        const supplierData = {
          organization_id: orgId,
          supplier_code: `SUP${faker.number.int({ min: 1000, max: 9999 })}`,
          company_name: companyName,
          contact_email: faker.internet.email({ firstName: 'contact', lastName: companyName.split(' ')[0] }),
          phone: faker.phone.number(),
          website: faker.internet.url(),
          address: JSON.stringify({
            street: faker.location.streetAddress(),
            city: faker.location.city(),
            state: faker.location.state(),
            zip: faker.location.zipCode(),
            country: faker.location.country()
          }),
          payment_terms: faker.helpers.arrayElement(this.paymentTerms),
          credit_limit: faker.number.float({ min: 10000, max: 500000, fractionDigits: 2 }),
          tax_id: faker.finance.routingNumber(),
          status: faker.helpers.arrayElement(['active', 'inactive', 'pending']),
          created_by: userId
        };

        const result = await client.query(`
          INSERT INTO suppliers (
            organization_id, supplier_code, company_name, contact_email, phone,
            website, address, payment_terms, credit_limit, tax_id, status, created_by
          )
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
          RETURNING id, supplier_code
        `, [
          supplierData.organization_id, supplierData.supplier_code,
          supplierData.company_name, supplierData.contact_email, supplierData.phone,
          supplierData.website, supplierData.address, supplierData.payment_terms,
          supplierData.credit_limit, supplierData.tax_id, supplierData.status,
          supplierData.created_by
        ]);

        this.generatedIds.suppliers.push(result.rows[0].id);

        // Generate supplier contacts
        const contactCount = faker.number.int({ min: 1, max: 3 });
        for (let j = 0; j < contactCount; j++) {
          await client.query(`
            INSERT INTO supplier_contacts (
              supplier_id, first_name, last_name, email, phone, position, is_primary
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7)
          `, [
            result.rows[0].id,
            faker.person.firstName(),
            faker.person.lastName(),
            faker.internet.email(),
            faker.phone.number(),
            faker.person.jobTitle(),
            j === 0 // First contact is primary
          ]);
        }
      }

      console.log(`✅ Generated ${count} suppliers with contacts`);

    } catch (error) {
      console.log('❌ Failed to generate suppliers:', error.message);
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Generate Customers
   */
  async generateCustomers(count = 20) {
    console.log(`👥 Generating ${count} customers...`);

    const client = await this.pool.connect();
    try {
      for (let i = 0; i < count; i++) {
        const orgId = faker.helpers.arrayElement(this.generatedIds.organizations);
        const userId = faker.helpers.arrayElement(this.generatedIds.users);

        const isCompany = faker.datatype.boolean({ probability: 0.7 });
        const customerData = {
          organization_id: orgId,
          customer_number: `CUST${faker.number.int({ min: 1000, max: 9999 })}`,
          company_name: isCompany ? faker.company.name() : null,
          first_name: faker.person.firstName(),
          last_name: faker.person.lastName(),
          email: faker.internet.email(),
          phone: faker.phone.number(),
          website: isCompany ? faker.internet.url() : null,
          industry: isCompany ? faker.company.buzzNoun() : null,
          billing_address: JSON.stringify({
            street: faker.location.streetAddress(),
            city: faker.location.city(),
            state: faker.location.state(),
            zip: faker.location.zipCode(),
            country: faker.location.country()
          }),
          shipping_address: JSON.stringify({
            street: faker.location.streetAddress(),
            city: faker.location.city(),
            state: faker.location.state(),
            zip: faker.location.zipCode(),
            country: faker.location.country()
          }),
          payment_terms: faker.helpers.arrayElement(this.paymentTerms),
          credit_limit: faker.number.float({ min: 5000, max: 100000, fractionDigits: 2 }),
          customer_type: isCompany ? 'business' : 'individual',
          status: faker.helpers.arrayElement(['active', 'inactive', 'prospect']),
          created_by: userId
        };

        const result = await client.query(`
          INSERT INTO customers (
            organization_id, customer_number, company_name, first_name, last_name,
            email, phone, website, industry, billing_address, shipping_address,
            payment_terms, credit_limit, customer_type, status, created_by
          )
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
          RETURNING id, customer_number
        `, [
          customerData.organization_id, customerData.customer_number,
          customerData.company_name, customerData.first_name, customerData.last_name,
          customerData.email, customerData.phone, customerData.website,
          customerData.industry, customerData.billing_address, customerData.shipping_address,
          customerData.payment_terms, customerData.credit_limit,
          customerData.customer_type, customerData.status, customerData.created_by
        ]);

        this.generatedIds.customers.push(result.rows[0].id);
      }

      console.log(`✅ Generated ${count} customers`);

    } catch (error) {
      console.log('❌ Failed to generate customers:', error.message);
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Generate Inventory Items
   */
  async generateInventoryItems(count = 100) {
    console.log(`📦 Generating ${count} inventory items...`);

    const client = await this.pool.connect();
    try {
      for (let i = 0; i < count; i++) {
        const orgId = faker.helpers.arrayElement(this.generatedIds.organizations);
        const supplierId = faker.helpers.arrayElement(this.generatedIds.suppliers);
        const userId = faker.helpers.arrayElement(this.generatedIds.users);

        const productName = faker.commerce.productName();
        const category = faker.helpers.arrayElement(this.categories);

        const itemData = {
          organization_id: orgId,
          supplier_id: supplierId,
          sku: `${category.substring(0, 3).toUpperCase()}${faker.number.int({ min: 1000, max: 9999 })}`,
          product_name: productName,
          description: faker.commerce.productDescription(),
          category: category,
          unit_price: faker.number.float({ min: 10, max: 1000, fractionDigits: 2 }),
          cost_price: faker.number.float({ min: 5, max: 500, fractionDigits: 2 }),
          stock_quantity: faker.number.int({ min: 0, max: 500 }),
          reorder_level: faker.number.int({ min: 5, max: 50 }),
          max_stock_level: faker.number.int({ min: 100, max: 1000 }),
          unit_of_measure: faker.helpers.arrayElement(['each', 'box', 'case', 'pallet', 'kg', 'lbs']),
          barcode: faker.number.int({ min: 1000000000000, max: 9999999999999 }).toString(),
          status: faker.helpers.arrayElement(['active', 'inactive', 'discontinued']),
          created_by: userId
        };

        const result = await client.query(`
          INSERT INTO inventory_items (
            organization_id, supplier_id, sku, product_name, description, category,
            unit_price, cost_price, stock_quantity, reorder_level, max_stock_level,
            unit_of_measure, barcode, status, created_by
          )
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
          RETURNING id, sku
        `, [
          itemData.organization_id, itemData.supplier_id, itemData.sku,
          itemData.product_name, itemData.description, itemData.category,
          itemData.unit_price, itemData.cost_price, itemData.stock_quantity,
          itemData.reorder_level, itemData.max_stock_level, itemData.unit_of_measure,
          itemData.barcode, itemData.status, itemData.created_by
        ]);

        this.generatedIds.inventoryItems.push(result.rows[0].id);
      }

      console.log(`✅ Generated ${count} inventory items`);

    } catch (error) {
      console.log('❌ Failed to generate inventory items:', error.message);
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Generate Stock Movements
   */
  async generateStockMovements(count = 300) {
    console.log(`📊 Generating ${count} stock movements...`);

    const client = await this.pool.connect();
    try {
      for (let i = 0; i < count; i++) {
        const orgId = faker.helpers.arrayElement(this.generatedIds.organizations);
        const itemId = faker.helpers.arrayElement(this.generatedIds.inventoryItems);
        const userId = faker.helpers.arrayElement(this.generatedIds.users);

        const movementType = faker.helpers.arrayElement(this.movementTypes);
        const quantity = faker.number.int({ min: 1, max: 50 });

        const movementData = {
          organization_id: orgId,
          inventory_item_id: itemId,
          movement_type: movementType,
          quantity: quantity,
          unit_cost: faker.number.float({ min: 5, max: 100, fractionDigits: 2 }),
          reason: faker.helpers.arrayElement([
            'Purchase order receipt', 'Sales order fulfillment', 'Transfer',
            'Cycle count adjustment', 'Damage write-off', 'Return processing'
          ]),
          reference_number: `${movementType.toUpperCase()}${faker.number.int({ min: 1000, max: 9999 })}`,
          performed_by: userId,
          created_at: faker.date.recent({ days: 90 })
        };

        await client.query(`
          INSERT INTO stock_movements (
            organization_id, inventory_item_id, movement_type, quantity, unit_cost,
            reason, reference_number, performed_by, created_at
          )
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        `, [
          movementData.organization_id, movementData.inventory_item_id,
          movementData.movement_type, movementData.quantity, movementData.unit_cost,
          movementData.reason, movementData.reference_number,
          movementData.performed_by, movementData.created_at
        ]);
      }

      console.log(`✅ Generated ${count} stock movements`);

    } catch (error) {
      console.log('❌ Failed to generate stock movements:', error.message);
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Generate Sales Orders
   */
  async generateSalesOrders(count = 50) {
    console.log(`💰 Generating ${count} sales orders...`);

    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');

      for (let i = 0; i < count; i++) {
        const orgId = faker.helpers.arrayElement(this.generatedIds.organizations);
        const customerId = faker.helpers.arrayElement(this.generatedIds.customers);
        const userId = faker.helpers.arrayElement(this.generatedIds.users);

        const orderData = {
          organization_id: orgId,
          customer_id: customerId,
          order_number: `SO${faker.number.int({ min: 10000, max: 99999 })}`,
          order_date: faker.date.recent({ days: 60 }),
          required_date: faker.date.future({ days: 30 }),
          status: faker.helpers.arrayElement(['pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled']),
          notes: faker.lorem.sentence(),
          created_by: userId
        };

        const orderResult = await client.query(`
          INSERT INTO sales_orders (
            organization_id, customer_id, order_number, order_date, required_date,
            status, notes, created_by
          )
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
          RETURNING id, order_number
        `, [
          orderData.organization_id, orderData.customer_id, orderData.order_number,
          orderData.order_date, orderData.required_date, orderData.status,
          orderData.notes, orderData.created_by
        ]);

        const orderId = orderResult.rows[0].id;
        this.generatedIds.salesOrders.push(orderId);

        // Generate order items
        const itemCount = faker.number.int({ min: 1, max: 5 });
        let totalAmount = 0;

        for (let j = 0; j < itemCount; j++) {
          const itemId = faker.helpers.arrayElement(this.generatedIds.inventoryItems);
          const quantity = faker.number.int({ min: 1, max: 10 });
          const unitPrice = faker.number.float({ min: 10, max: 500, fractionDigits: 2 });
          const totalPrice = quantity * unitPrice;
          totalAmount += totalPrice;

          await client.query(`
            INSERT INTO sales_order_items (
              sales_order_id, inventory_item_id, quantity, unit_price, total_price
            )
            VALUES ($1, $2, $3, $4, $5)
          `, [orderId, itemId, quantity, unitPrice, totalPrice]);
        }

        // Update total amount
        await client.query(`
          UPDATE sales_orders SET total_amount = $1 WHERE id = $2
        `, [totalAmount, orderId]);
      }

      await client.query('COMMIT');
      console.log(`✅ Generated ${count} sales orders with items`);

    } catch (error) {
      await client.query('ROLLBACK');
      console.log('❌ Failed to generate sales orders:', error.message);
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Generate Invoices
   */
  async generateInvoices(count = 45) {
    console.log(`📄 Generating ${count} invoices...`);

    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');

      // Get sales orders that can have invoices
      const availableOrders = this.generatedIds.salesOrders.slice(0, count);

      for (let i = 0; i < availableOrders.length; i++) {
        const orderId = availableOrders[i];

        // Get order details
        const orderResult = await client.query(`
          SELECT organization_id, customer_id, total_amount, created_by
          FROM sales_orders WHERE id = $1
        `, [orderId]);

        if (orderResult.rows.length === 0) continue;

        const order = orderResult.rows[0];

        const invoiceData = {
          organization_id: order.organization_id,
          customer_id: order.customer_id,
          sales_order_id: orderId,
          invoice_number: `INV${faker.number.int({ min: 10000, max: 99999 })}`,
          invoice_date: faker.date.recent({ days: 30 }),
          due_date: faker.date.future({ days: 30 }),
          status: faker.helpers.arrayElement(['pending', 'sent', 'paid', 'overdue', 'cancelled']),
          total_amount: order.total_amount,
          created_by: order.created_by
        };

        const invoiceResult = await client.query(`
          INSERT INTO invoices (
            organization_id, customer_id, sales_order_id, invoice_number,
            invoice_date, due_date, status, total_amount, created_by
          )
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
          RETURNING id, invoice_number
        `, [
          invoiceData.organization_id, invoiceData.customer_id, invoiceData.sales_order_id,
          invoiceData.invoice_number, invoiceData.invoice_date, invoiceData.due_date,
          invoiceData.status, invoiceData.total_amount, invoiceData.created_by
        ]);

        const invoiceId = invoiceResult.rows[0].id;
        this.generatedIds.invoices.push(invoiceId);

        // Copy items from sales order
        await client.query(`
          INSERT INTO invoice_items (invoice_id, inventory_item_id, quantity, unit_price, total_price)
          SELECT $1, inventory_item_id, quantity, unit_price, total_price
          FROM sales_order_items
          WHERE sales_order_id = $2
        `, [invoiceId, orderId]);
      }

      await client.query('COMMIT');
      console.log(`✅ Generated ${availableOrders.length} invoices with items`);

    } catch (error) {
      await client.query('ROLLBACK');
      console.log('❌ Failed to generate invoices:', error.message);
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Generate Documents
   */
  async generateDocuments(count = 30) {
    console.log(`📎 Generating ${count} documents...`);

    const client = await this.pool.connect();
    try {
      for (let i = 0; i < count; i++) {
        const orgId = faker.helpers.arrayElement(this.generatedIds.organizations);
        const userId = faker.helpers.arrayElement(this.generatedIds.users);

        const documentType = faker.helpers.arrayElement(this.documentTypes);
        const fileName = `${documentType}_${faker.system.fileName()}`;

        const documentData = {
          organization_id: orgId,
          title: faker.system.commonFileName('pdf'),
          description: faker.lorem.sentence(),
          document_type: documentType,
          file_path: `/uploads/documents/${fileName}`,
          file_size: faker.number.int({ min: 1024, max: 10485760 }),
          mime_type: faker.helpers.arrayElement([
            'application/pdf', 'application/msword', 'image/jpeg', 'text/csv'
          ]),
          metadata: JSON.stringify({
            tags: faker.helpers.arrayElements(['important', 'contract', 'invoice', 'manual'], { min: 1, max: 3 }),
            department: faker.helpers.arrayElement(['Sales', 'Operations', 'Finance', 'HR']),
            confidentiality: faker.helpers.arrayElement(['public', 'internal', 'confidential'])
          }),
          uploaded_by: userId,
          created_at: faker.date.recent({ days: 120 })
        };

        const result = await client.query(`
          INSERT INTO documents (
            organization_id, title, description, document_type, file_path,
            file_size, mime_type, metadata, uploaded_by, created_at
          )
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
          RETURNING id, title
        `, [
          documentData.organization_id, documentData.title, documentData.description,
          documentData.document_type, documentData.file_path, documentData.file_size,
          documentData.mime_type, documentData.metadata, documentData.uploaded_by,
          documentData.created_at
        ]);

        this.generatedIds.documents.push(result.rows[0].id);
      }

      console.log(`✅ Generated ${count} documents`);

    } catch (error) {
      console.log('❌ Failed to generate documents:', error.message);
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Generate Workflows
   */
  async generateWorkflows() {
    console.log('🔄 Generating workflows...');

    const client = await this.pool.connect();
    try {
      for (const docId of this.generatedIds.documents) {
        if (faker.datatype.boolean({ probability: 0.7 })) {
          const orgId = faker.helpers.arrayElement(this.generatedIds.organizations);
          const userId = faker.helpers.arrayElement(this.generatedIds.users);

          await client.query(`
            INSERT INTO workflows (
              organization_id, document_id, workflow_type, status,
              assigned_to, created_by
            )
            VALUES ($1, $2, $3, $4, $5, $6)
          `, [
            orgId, docId,
            faker.helpers.arrayElement(['approval', 'review', 'signature', 'distribution']),
            faker.helpers.arrayElement(['pending', 'in_progress', 'completed', 'rejected']),
            userId, userId
          ]);
        }
      }

      console.log('✅ Generated workflows for documents');

    } catch (error) {
      console.log('❌ Failed to generate workflows:', error.message);
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Generate Performance Data
   */
  async generatePerformanceData() {
    console.log('📈 Generating performance data...');

    const client = await this.pool.connect();
    try {
      // Supplier performance data
      for (const supplierId of this.generatedIds.suppliers) {
        const evaluationCount = faker.number.int({ min: 1, max: 4 });
        for (let i = 0; i < evaluationCount; i++) {
          const userId = faker.helpers.arrayElement(this.generatedIds.users);

          await client.query(`
            INSERT INTO supplier_performance (
              supplier_id, evaluation_date, quality_score, delivery_score,
              communication_score, overall_score, evaluated_by
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7)
          `, [
            supplierId,
            faker.date.recent({ days: 365 }),
            faker.number.int({ min: 70, max: 100 }),
            faker.number.int({ min: 75, max: 100 }),
            faker.number.int({ min: 80, max: 100 }),
            faker.number.float({ min: 75, max: 98, fractionDigits: 2 }),
            userId
          ]);
        }
      }

      console.log('✅ Generated supplier performance data');

    } catch (error) {
      console.log('❌ Failed to generate performance data:', error.message);
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Generate data summary report
   */
  generateDataSummary() {
    console.log('\n📋 SAMPLE DATA GENERATION SUMMARY');
    console.log('=' .repeat(40));

    const summary = {
      'Organizations': this.generatedIds.organizations.length,
      'Users': this.generatedIds.users.length,
      'Roles': this.generatedIds.roles.length,
      'Suppliers': this.generatedIds.suppliers.length,
      'Customers': this.generatedIds.customers.length,
      'Inventory Items': this.generatedIds.inventoryItems.length,
      'Sales Orders': this.generatedIds.salesOrders.length,
      'Invoices': this.generatedIds.invoices.length,
      'Documents': this.generatedIds.documents.length
    };

    Object.entries(summary).forEach(([type, count]) => {
      console.log(`  ${type}: ${count}`);
    });

    console.log('\n✅ Sample data generation completed successfully!');
    console.log('🎯 Database is now populated with realistic test data');
    console.log('💡 Use this data for testing, demonstrations, and development');
  }
}

// Export for use in other scripts
module.exports = SampleDataGenerator;

// Run if called directly
if (require.main === module) {
  const generator = new SampleDataGenerator();
  generator.generateCompleteSampleData().catch(console.error);
}