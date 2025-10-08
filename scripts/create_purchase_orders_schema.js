const { Client } = require('pg')

// Database connection configuration
const client = new Client({
  host: '62.169.20.53',
  port: 6600,
  database: 'nxtprod-db_001',
  user: 'nxtdb_admin',
  password: 'P@33w0rd-1',
})

async function createPurchaseOrdersSchema() {
  try {
    await client.connect()
    console.log('Connected to PostgreSQL database')

    // Create purchase_orders table
    const createPurchaseOrdersTable = `
      CREATE TABLE IF NOT EXISTS purchase_orders (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        supplier_id UUID NOT NULL REFERENCES suppliers(id),
        po_number VARCHAR(100) UNIQUE NOT NULL,
        title VARCHAR(255) NOT NULL,
        description TEXT,
        category VARCHAR(100) NOT NULL,
        priority VARCHAR(20) DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),

        -- Requester Information
        requested_by VARCHAR(255) NOT NULL,
        department VARCHAR(100) NOT NULL,
        budget_code VARCHAR(100),

        -- Financial Information
        subtotal DECIMAL(15,2) NOT NULL DEFAULT 0,
        tax_amount DECIMAL(15,2) NOT NULL DEFAULT 0,
        shipping_amount DECIMAL(15,2) NOT NULL DEFAULT 0,
        discount_amount DECIMAL(15,2) NOT NULL DEFAULT 0,
        total_amount DECIMAL(15,2) NOT NULL DEFAULT 0,
        currency VARCHAR(3) DEFAULT 'ZAR',

        -- Dates
        requested_delivery_date TIMESTAMP NOT NULL,
        confirmed_delivery_date TIMESTAMP,
        actual_delivery_date TIMESTAMP,

        -- Delivery Information
        delivery_location TEXT NOT NULL,
        payment_terms VARCHAR(100) NOT NULL,

        -- Status Information
        status VARCHAR(50) DEFAULT 'draft' CHECK (status IN (
          'draft', 'pending_approval', 'approved', 'sent', 'acknowledged',
          'in_progress', 'shipped', 'received', 'completed', 'cancelled'
        )),
        workflow_status VARCHAR(50) DEFAULT 'pending_approval',

        -- Approval Information
        approved_by VARCHAR(255),
        approved_at TIMESTAMP,
        sent_at TIMESTAMP,
        acknowledged_at TIMESTAMP,

        -- Additional Information
        notes TEXT,
        internal_notes TEXT,
        tracking_number VARCHAR(255),
        carrier VARCHAR(255),

        -- Risk and Compliance
        risk_score INTEGER DEFAULT 0,
        three_way_match_status VARCHAR(50) DEFAULT 'pending' CHECK (three_way_match_status IN (
          'pending', 'matched', 'exceptions', 'manual_review'
        )),

        -- Metadata
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW(),
        created_by VARCHAR(255),
        version INTEGER DEFAULT 1
      );
    `

    // Create purchase_order_items table
    const createPurchaseOrderItemsTable = `
      CREATE TABLE IF NOT EXISTS purchase_order_items (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        purchase_order_id UUID NOT NULL REFERENCES purchase_orders(id) ON DELETE CASCADE,
        line_number INTEGER NOT NULL,
        product_code VARCHAR(100) NOT NULL,
        description TEXT NOT NULL,
        specifications TEXT,
        category VARCHAR(100),
        subcategory VARCHAR(100),

        -- Quantities
        quantity DECIMAL(12,3) NOT NULL,
        received_quantity DECIMAL(12,3) DEFAULT 0,
        remaining_quantity DECIMAL(12,3),
        unit VARCHAR(20) NOT NULL,

        -- Pricing
        unit_price DECIMAL(15,2) NOT NULL,
        total_price DECIMAL(15,2) NOT NULL,
        discount_percentage DECIMAL(5,2) DEFAULT 0,
        tax_percentage DECIMAL(5,2) DEFAULT 15,

        -- Delivery
        requested_date TIMESTAMP NOT NULL,
        confirmed_date TIMESTAMP,
        actual_delivery_date TIMESTAMP,

        -- Status
        status VARCHAR(50) DEFAULT 'pending' CHECK (status IN (
          'pending', 'confirmed', 'shipped', 'partially_received', 'received', 'cancelled'
        )),

        -- Quality Requirements
        quality_requirements JSONB,
        inspection_required BOOLEAN DEFAULT FALSE,
        reorder_point_triggered BOOLEAN DEFAULT FALSE,

        -- Additional Information
        notes TEXT,

        -- Metadata
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW(),

        UNIQUE(purchase_order_id, line_number)
      );
    `

    // Create purchase_order_receipts table
    const createReceiptsTable = `
      CREATE TABLE IF NOT EXISTS purchase_order_receipts (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        purchase_order_id UUID NOT NULL REFERENCES purchase_orders(id) ON DELETE CASCADE,
        receipt_number VARCHAR(100) UNIQUE NOT NULL,
        received_date TIMESTAMP NOT NULL,
        received_by VARCHAR(255) NOT NULL,
        status VARCHAR(50) DEFAULT 'completed' CHECK (status IN ('draft', 'completed', 'disputed')),

        -- Quality Inspection
        quality_inspection_status VARCHAR(50) DEFAULT 'pending' CHECK (quality_inspection_status IN (
          'pending', 'passed', 'failed', 'conditional'
        )),
        inspector_name VARCHAR(255),
        inspection_date TIMESTAMP,
        overall_score INTEGER,
        certificate_number VARCHAR(100),

        -- Additional Information
        notes TEXT,

        -- Metadata
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );
    `

    // Create purchase_order_receipt_items table
    const createReceiptItemsTable = `
      CREATE TABLE IF NOT EXISTS purchase_order_receipt_items (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        receipt_id UUID NOT NULL REFERENCES purchase_order_receipts(id) ON DELETE CASCADE,
        po_item_id UUID NOT NULL REFERENCES purchase_order_items(id),
        received_quantity DECIMAL(12,3) NOT NULL,
        accepted_quantity DECIMAL(12,3) NOT NULL,
        rejected_quantity DECIMAL(12,3) DEFAULT 0,
        damaged_quantity DECIMAL(12,3) DEFAULT 0,
        location VARCHAR(255),
        batch_number VARCHAR(100),
        quality_grade VARCHAR(10),
        notes TEXT,

        -- Metadata
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );
    `

    // Create purchase_order_approvals table
    const createApprovalsTable = `
      CREATE TABLE IF NOT EXISTS purchase_order_approvals (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        purchase_order_id UUID NOT NULL REFERENCES purchase_orders(id) ON DELETE CASCADE,
        step_number INTEGER NOT NULL,
        approver_role VARCHAR(100) NOT NULL,
        approver_name VARCHAR(255) NOT NULL,
        approver_email VARCHAR(255),
        status VARCHAR(50) DEFAULT 'pending' CHECK (status IN (
          'pending', 'approved', 'rejected', 'delegated', 'skipped'
        )),
        approval_threshold DECIMAL(15,2),
        required BOOLEAN DEFAULT TRUE,
        approved_at TIMESTAMP,
        comments TEXT,
        escalation_date TIMESTAMP,
        escalated_to VARCHAR(255),
        delegated_to VARCHAR(255),
        delegated_at TIMESTAMP,

        -- Metadata
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW(),

        UNIQUE(purchase_order_id, step_number)
      );
    `

    // Create purchase_order_audit_trail table
    const createAuditTrailTable = `
      CREATE TABLE IF NOT EXISTS purchase_order_audit_trail (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        purchase_order_id UUID NOT NULL REFERENCES purchase_orders(id) ON DELETE CASCADE,
        timestamp TIMESTAMP DEFAULT NOW(),
        user_id VARCHAR(255) NOT NULL,
        user_name VARCHAR(255) NOT NULL,
        action VARCHAR(100) NOT NULL,
        details TEXT,
        old_value JSONB,
        new_value JSONB,
        ip_address VARCHAR(45),

        -- Metadata
        created_at TIMESTAMP DEFAULT NOW()
      );
    `

    // Create indexes for better performance
    const createIndexes = `
      CREATE INDEX IF NOT EXISTS idx_purchase_orders_supplier_id ON purchase_orders(supplier_id);
      CREATE INDEX IF NOT EXISTS idx_purchase_orders_status ON purchase_orders(status);
      CREATE INDEX IF NOT EXISTS idx_purchase_orders_department ON purchase_orders(department);
      CREATE INDEX IF NOT EXISTS idx_purchase_orders_created_at ON purchase_orders(created_at);
      CREATE INDEX IF NOT EXISTS idx_purchase_orders_requested_delivery_date ON purchase_orders(requested_delivery_date);
      CREATE INDEX IF NOT EXISTS idx_purchase_orders_total_amount ON purchase_orders(total_amount);

      CREATE INDEX IF NOT EXISTS idx_purchase_order_items_po_id ON purchase_order_items(purchase_order_id);
      CREATE INDEX IF NOT EXISTS idx_purchase_order_items_product_code ON purchase_order_items(product_code);
      CREATE INDEX IF NOT EXISTS idx_purchase_order_items_status ON purchase_order_items(status);

      CREATE INDEX IF NOT EXISTS idx_purchase_order_receipts_po_id ON purchase_order_receipts(purchase_order_id);
      CREATE INDEX IF NOT EXISTS idx_purchase_order_receipts_received_date ON purchase_order_receipts(received_date);

      CREATE INDEX IF NOT EXISTS idx_purchase_order_approvals_po_id ON purchase_order_approvals(purchase_order_id);
      CREATE INDEX IF NOT EXISTS idx_purchase_order_approvals_status ON purchase_order_approvals(status);

      CREATE INDEX IF NOT EXISTS idx_purchase_order_audit_trail_po_id ON purchase_order_audit_trail(purchase_order_id);
      CREATE INDEX IF NOT EXISTS idx_purchase_order_audit_trail_timestamp ON purchase_order_audit_trail(timestamp);
    `

    // Create trigger to update updated_at timestamp
    const createTrigger = `
      CREATE OR REPLACE FUNCTION update_updated_at_column()
      RETURNS TRIGGER AS $$
      BEGIN
        NEW.updated_at = NOW();
        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql;

      DROP TRIGGER IF EXISTS update_purchase_orders_updated_at ON purchase_orders;
      CREATE TRIGGER update_purchase_orders_updated_at
        BEFORE UPDATE ON purchase_orders
        FOR EACH ROW
        EXECUTE FUNCTION update_updated_at_column();

      DROP TRIGGER IF EXISTS update_purchase_order_items_updated_at ON purchase_order_items;
      CREATE TRIGGER update_purchase_order_items_updated_at
        BEFORE UPDATE ON purchase_order_items
        FOR EACH ROW
        EXECUTE FUNCTION update_updated_at_column();
    `

    // Execute all table creation commands
    console.log('Creating purchase_orders table...')
    await client.query(createPurchaseOrdersTable)

    console.log('Creating purchase_order_items table...')
    await client.query(createPurchaseOrderItemsTable)

    console.log('Creating purchase_order_receipts table...')
    await client.query(createReceiptsTable)

    console.log('Creating purchase_order_receipt_items table...')
    await client.query(createReceiptItemsTable)

    console.log('Creating purchase_order_approvals table...')
    await client.query(createApprovalsTable)

    console.log('Creating purchase_order_audit_trail table...')
    await client.query(createAuditTrailTable)

    console.log('Creating indexes...')
    await client.query(createIndexes)

    console.log('Creating triggers...')
    await client.query(createTrigger)

    console.log('✅ Purchase orders database schema created successfully!')

  } catch (error) {
    console.error('❌ Error creating purchase orders schema:', error)
    process.exit(1)
  } finally {
    await client.end()
  }
}

// Run the schema creation
if (require.main === module) {
  createPurchaseOrdersSchema()
}

module.exports = { createPurchaseOrdersSchema }