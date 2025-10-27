const { Client } = require('pg')

// Database connection configuration
const client = new Client({
  host: '62.169.20.53',
  port: 6600,
  database: 'nxtprod-db_001',
  user: 'nxtdb_admin',
  password: 'P@33w0rd-1',
})

// Sample purchase orders data based on the 22 suppliers
const purchaseOrdersData = [
  {
    supplier_name: 'BK Percussion',
    po_number: 'PO-2024-001',
    title: 'Drum Kit Components and Accessories',
    description: 'Professional drum components for studio recording setup',
    category: 'Musical Instruments',
    priority: 'high',
    requested_by: 'John Smith',
    department: 'Production',
    budget_code: 'PROD-2024-Q1',
    subtotal: 45000.00,
    tax_amount: 6750.00,
    shipping_amount: 2500.00,
    discount_amount: 2250.00,
    total_amount: 52000.00,
    requested_delivery_date: '2024-03-15',
    delivery_location: 'Main Studio, Johannesburg',
    payment_terms: 'Net 30',
    status: 'approved',
    workflow_status: 'processing',
    approved_by: 'Production Manager',
    approved_at: '2024-01-20T10:30:00Z',
    sent_at: '2024-01-22T09:00:00Z',
    notes: 'High-priority order for upcoming recording sessions',
    risk_score: 25,
    three_way_match_status: 'pending'
  },
  {
    supplier_name: 'BC Electronics',
    po_number: 'PO-2024-002',
    title: 'Audio Interface and Recording Equipment',
    description: 'Professional audio interfaces and monitoring equipment',
    category: 'Electronics',
    priority: 'medium',
    requested_by: 'Maria Nkomo',
    department: 'Technical',
    budget_code: 'TECH-2024-Q1',
    subtotal: 65000.00,
    tax_amount: 9750.00,
    shipping_amount: 3200.00,
    discount_amount: 3250.00,
    total_amount: 74700.00,
    requested_delivery_date: '2024-03-20',
    delivery_location: 'Technical Department, Cape Town',
    payment_terms: 'Net 45',
    status: 'in_progress',
    workflow_status: 'shipping',
    approved_by: 'Technical Director',
    approved_at: '2024-01-18T14:15:00Z',
    sent_at: '2024-01-20T11:30:00Z',
    acknowledged_at: '2024-01-21T08:45:00Z',
    notes: 'Equipment for studio upgrade project',
    risk_score: 15,
    three_way_match_status: 'pending'
  },
  {
    supplier_name: 'Legacy Brands',
    po_number: 'PO-2024-003',
    title: 'Vintage Instrument Restoration Parts',
    description: 'Rare components for vintage instrument restoration',
    category: 'Musical Instruments',
    priority: 'urgent',
    requested_by: 'David Wilson',
    department: 'Restoration',
    budget_code: 'REST-2024-SPEC',
    subtotal: 125000.00,
    tax_amount: 18750.00,
    shipping_amount: 8500.00,
    discount_amount: 6250.00,
    total_amount: 146000.00,
    requested_delivery_date: '2024-02-28',
    delivery_location: 'Restoration Workshop, Durban',
    payment_terms: 'Net 60',
    status: 'shipped',
    workflow_status: 'shipping',
    approved_by: 'Workshop Manager',
    approved_at: '2024-01-15T16:20:00Z',
    sent_at: '2024-01-17T10:00:00Z',
    acknowledged_at: '2024-01-18T09:15:00Z',
    tracking_number: 'LB-2024-789456',
    carrier: 'DHL Express',
    notes: 'Critical components for client restoration project',
    risk_score: 45,
    three_way_match_status: 'pending'
  },
  {
    supplier_name: 'Alpha Technologies',
    po_number: 'PO-2024-004',
    title: 'Digital Mixing Console and Controllers',
    description: 'Professional digital mixing console and MIDI controllers',
    category: 'Technology',
    priority: 'high',
    requested_by: 'Sarah Johnson',
    department: 'Production',
    budget_code: 'PROD-2024-TECH',
    subtotal: 95000.00,
    tax_amount: 14250.00,
    shipping_amount: 4500.00,
    discount_amount: 4750.00,
    total_amount: 109000.00,
    requested_delivery_date: '2024-03-10',
    delivery_location: 'Studio Complex, Pretoria',
    payment_terms: 'Net 30',
    status: 'pending_approval',
    workflow_status: 'pending_approval',
    notes: 'Upgrade for main production console',
    risk_score: 20,
    three_way_match_status: 'pending'
  },
  {
    supplier_name: 'Dynamic Sound Solutions',
    po_number: 'PO-2024-005',
    title: 'Live Sound Equipment Package',
    description: 'Complete live sound system for venue installations',
    category: 'Sound Systems',
    priority: 'medium',
    requested_by: 'Michael Brown',
    department: 'Live Events',
    budget_code: 'EVENTS-2024-Q1',
    subtotal: 185000.00,
    tax_amount: 27750.00,
    shipping_amount: 12000.00,
    discount_amount: 9250.00,
    total_amount: 215500.00,
    requested_delivery_date: '2024-04-05',
    delivery_location: 'Event Warehouse, Johannesburg',
    payment_terms: 'Net 45',
    status: 'draft',
    workflow_status: 'draft',
    notes: 'Package for multiple venue installations',
    risk_score: 10,
    three_way_match_status: 'pending'
  },
  {
    supplier_name: 'Future Music Tech',
    po_number: 'PO-2024-006',
    title: 'Software Licenses and Digital Tools',
    description: 'Professional audio software licenses and digital production tools',
    category: 'Software',
    priority: 'low',
    requested_by: 'Emily Davis',
    department: 'Digital Production',
    budget_code: 'DIGITAL-2024-Q1',
    subtotal: 35000.00,
    tax_amount: 5250.00,
    shipping_amount: 500.00,
    discount_amount: 1750.00,
    total_amount: 39000.00,
    requested_delivery_date: '2024-03-25',
    delivery_location: 'Digital Delivery',
    payment_terms: 'Net 15',
    status: 'completed',
    workflow_status: 'completed',
    approved_by: 'Digital Manager',
    approved_at: '2024-01-10T11:00:00Z',
    sent_at: '2024-01-12T10:00:00Z',
    acknowledged_at: '2024-01-12T14:30:00Z',
    actual_delivery_date: '2024-01-15T09:00:00Z',
    notes: 'Annual software license renewals',
    risk_score: 5,
    three_way_match_status: 'matched'
  },
  {
    supplier_name: 'Global Audio Distributors',
    po_number: 'PO-2024-007',
    title: 'Microphone Collection and Accessories',
    description: 'Professional microphones and recording accessories',
    category: 'Recording Equipment',
    priority: 'medium',
    requested_by: 'James Wilson',
    department: 'Recording',
    budget_code: 'RECORD-2024-Q1',
    subtotal: 75000.00,
    tax_amount: 11250.00,
    shipping_amount: 3500.00,
    discount_amount: 3750.00,
    total_amount: 86000.00,
    requested_delivery_date: '2024-03-18',
    delivery_location: 'Recording Studio, Cape Town',
    payment_terms: 'Net 30',
    status: 'received',
    workflow_status: 'completed',
    approved_by: 'Recording Manager',
    approved_at: '2024-01-08T15:45:00Z',
    sent_at: '2024-01-10T09:30:00Z',
    acknowledged_at: '2024-01-11T10:15:00Z',
    actual_delivery_date: '2024-01-25T11:30:00Z',
    notes: 'New microphone collection for studio expansion',
    risk_score: 12,
    three_way_match_status: 'matched'
  },
  {
    supplier_name: 'Innovation Audio Works',
    po_number: 'PO-2024-008',
    title: 'Custom Audio Processing Units',
    description: 'Bespoke audio processing equipment and custom electronics',
    category: 'Custom Equipment',
    priority: 'urgent',
    requested_by: 'Lisa Chen',
    department: 'Custom Solutions',
    budget_code: 'CUSTOM-2024-SPEC',
    subtotal: 220000.00,
    tax_amount: 33000.00,
    shipping_amount: 15000.00,
    discount_amount: 11000.00,
    total_amount: 257000.00,
    requested_delivery_date: '2024-04-15',
    delivery_location: 'Custom Workshop, Durban',
    payment_terms: 'Net 60',
    status: 'approved',
    workflow_status: 'manufacturing',
    approved_by: 'Technical Director',
    approved_at: '2024-01-25T13:20:00Z',
    sent_at: '2024-01-27T08:00:00Z',
    acknowledged_at: '2024-01-28T09:45:00Z',
    notes: 'Custom equipment for specialized client project',
    risk_score: 35,
    three_way_match_status: 'pending'
  }
]

async function insertPurchaseOrdersData() {
  try {
    await client.connect()
    console.log('Connected to PostgreSQL database')

    // Get supplier IDs for the purchase orders
    console.log('Fetching supplier information...')
    const suppliersResult = await client.query(`
      SELECT id, name, supplier_code
      FROM suppliers
      WHERE name IN (${purchaseOrdersData.map((_, i) => `$${i + 1}`).join(',')})
    `, purchaseOrdersData.map(po => po.supplier_name))

    const supplierMap = new Map()
    suppliersResult.rows.forEach(supplier => {
      supplierMap.set(supplier.name, {
        id: supplier.id,
        code: supplier.supplier_code
      })
    })

    console.log(`Found ${supplierMap.size} suppliers in database`)

    // Insert purchase orders
    let insertedCount = 0
    for (const poData of purchaseOrdersData) {
      const supplier = supplierMap.get(poData.supplier_name)

      if (!supplier) {
        console.log(`⚠️  Skipping PO ${poData.po_number} - supplier ${poData.supplier_name} not found`)
        continue
      }

      try {
        const insertQuery = `
          INSERT INTO purchase_orders (
            supplier_id, po_number, title, description, category, priority,
            requested_by, department, budget_code, subtotal, tax_amount,
            shipping_amount, discount_amount, total_amount, requested_delivery_date,
            delivery_location, payment_terms, status, workflow_status,
            approved_by, approved_at, sent_at, acknowledged_at, actual_delivery_date,
            notes, risk_score, three_way_match_status, tracking_number, carrier,
            created_by, created_at
          ) VALUES (
            $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15,
            $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26, $27, $28, $29,
            $30, $31
          ) ON CONFLICT (po_number) DO NOTHING
        `

        await client.query(insertQuery, [
          supplier.id,
          poData.po_number,
          poData.title,
          poData.description,
          poData.category,
          poData.priority,
          poData.requested_by,
          poData.department,
          poData.budget_code,
          poData.subtotal,
          poData.tax_amount,
          poData.shipping_amount,
          poData.discount_amount,
          poData.total_amount,
          poData.requested_delivery_date,
          poData.delivery_location,
          poData.payment_terms,
          poData.status,
          poData.workflow_status,
          poData.approved_by,
          poData.approved_at,
          poData.sent_at,
          poData.acknowledged_at,
          poData.actual_delivery_date,
          poData.notes,
          poData.risk_score,
          poData.three_way_match_status,
          poData.tracking_number,
          poData.carrier,
          'system',
          new Date().toISOString()
        ])

        console.log(`✅ Inserted PO ${poData.po_number} from ${poData.supplier_name}`)
        insertedCount++

        // Add purchase order items for each PO
        const poResult = await client.query(
          'SELECT id FROM purchase_orders WHERE po_number = $1',
          [poData.po_number]
        )

        if (poResult.rows.length > 0) {
          const poId = poResult.rows[0].id

          // Create sample line items based on category
          let lineItems = []

          switch (poData.category) {
            case 'Musical Instruments':
              lineItems = [
                {
                  line_number: 1,
                  product_code: 'DRUM-001',
                  description: 'Professional Snare Drum',
                  quantity: 2,
                  unit: 'EA',
                  unit_price: 12500.00,
                  total_price: 25000.00
                },
                {
                  line_number: 2,
                  product_code: 'CYMB-001',
                  description: 'Crash Cymbal Set',
                  quantity: 1,
                  unit: 'SET',
                  unit_price: 20000.00,
                  total_price: 20000.00
                }
              ]
              break
            case 'Electronics':
              lineItems = [
                {
                  line_number: 1,
                  product_code: 'AUDIO-INT-001',
                  description: 'Professional Audio Interface',
                  quantity: 3,
                  unit: 'EA',
                  unit_price: 18000.00,
                  total_price: 54000.00
                },
                {
                  line_number: 2,
                  product_code: 'MON-001',
                  description: 'Studio Monitor Speakers',
                  quantity: 2,
                  unit: 'PAIR',
                  unit_price: 5500.00,
                  total_price: 11000.00
                }
              ]
              break
            default:
              lineItems = [
                {
                  line_number: 1,
                  product_code: 'MISC-001',
                  description: 'General Equipment',
                  quantity: 1,
                  unit: 'LOT',
                  unit_price: poData.subtotal,
                  total_price: poData.subtotal
                }
              ]
          }

          // Insert line items
          for (const item of lineItems) {
            await client.query(`
              INSERT INTO purchase_order_items (
                purchase_order_id, line_number, product_code, description,
                category, quantity, remaining_quantity, unit, unit_price,
                total_price, discount_percentage, tax_percentage,
                requested_date, status, inspection_required
              ) VALUES (
                $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15
              )
            `, [
              poId,
              item.line_number,
              item.product_code,
              item.description,
              poData.category,
              item.quantity,
              item.quantity,
              item.unit,
              item.unit_price,
              item.total_price,
              0, // discount_percentage
              15, // tax_percentage
              poData.requested_delivery_date,
              poData.status === 'completed' ? 'received' : 'pending',
              true // inspection_required
            ])
          }

          console.log(`   📦 Added ${lineItems.length} line items to PO ${poData.po_number}`)

          // Add approval workflow for each PO
          await client.query(`
            INSERT INTO purchase_order_approvals (
              purchase_order_id, step_number, approver_role, approver_name,
              approver_email, status, approval_threshold, required, approved_at
            ) VALUES
            ($1, 1, 'Department Manager', $2, $3, $4, 50000, true, $5),
            ($1, 2, 'Finance Director', 'Finance Director', 'finance@company.co.za', $6, 100000, true, $7)
          `, [
            poId,
            poData.approved_by || 'Department Manager',
            `${poData.requested_by.toLowerCase().replace(' ', '.')}@company.co.za`,
            poData.status === 'draft' ? 'pending' : 'approved',
            poData.approved_at,
            poData.status === 'draft' || poData.status === 'pending_approval' ? 'pending' : 'approved',
            poData.status === 'draft' || poData.status === 'pending_approval' ? null : poData.approved_at
          ])

          // Add audit trail entry
          await client.query(`
            INSERT INTO purchase_order_audit_trail (
              purchase_order_id, user_id, user_name, action, details
            ) VALUES (
              $1, 'system', 'System Admin', 'created', 'Purchase order created during data migration'
            )
          `, [poId])
        }

      } catch (itemError) {
        console.error(`❌ Error inserting PO ${poData.po_number}:`, itemError.message)
      }
    }

    // Calculate and display summary
    const totalResult = await client.query(`
      SELECT
        COUNT(*) as total_pos,
        SUM(total_amount) as total_value,
        COUNT(*) FILTER (WHERE status = 'approved') as approved_count,
        COUNT(*) FILTER (WHERE status = 'completed') as completed_count,
        COUNT(*) FILTER (WHERE priority = 'urgent') as urgent_count
      FROM purchase_orders
    `)

    const summary = totalResult.rows[0]

    console.log('\n📊 PURCHASE ORDERS DATABASE SUMMARY:')
    console.log(`✅ Successfully inserted ${insertedCount} purchase orders`)
    console.log(`📋 Total Purchase Orders: ${summary.total_pos}`)
    console.log(`💰 Total Value: R ${parseFloat(summary.total_value || '0').toLocaleString('en-ZA', { minimumFractionDigits: 2 })}`)
    console.log(`✅ Approved Orders: ${summary.approved_count}`)
    console.log(`🏁 Completed Orders: ${summary.completed_count}`)
    console.log(`🚨 Urgent Orders: ${summary.urgent_count}`)

    // Get line items count
    const itemsResult = await client.query('SELECT COUNT(*) as total_items FROM purchase_order_items')
    console.log(`📦 Total Line Items: ${itemsResult.rows[0].total_items}`)

    console.log('\n🎉 Purchase orders data insertion completed successfully!')

  } catch (error) {
    console.error('❌ Error inserting purchase orders data:', error)
    process.exit(1)
  } finally {
    await client.end()
  }
}

// Run the data insertion
if (require.main === module) {
  insertPurchaseOrdersData()
}

module.exports = { insertPurchaseOrdersData }