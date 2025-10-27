const { Client } = require('pg')

// Database connection configuration
const client = new Client({
  host: '62.169.20.53',
  port: 6600,
  database: 'nxtprod-db_001',
  user: 'nxtdb_admin',
  password: 'P@33w0rd-1',
})

// Sample purchase orders data adapted for existing schema
const purchaseOrdersData = [
  {
    supplier_name: 'BK Percussion',
    po_number: 'PO-2024-001',
    status: 'approved',
    order_date: '2024-01-15',
    required_date: '2024-03-15',
    subtotal: 45000.00,
    tax_amount: 6750.00,
    total_amount: 52000.00,
    currency: 'ZAR',
    notes: 'Drum Kit Components and Accessories - Professional drum components for studio recording setup'
  },
  {
    supplier_name: 'BC Electronics',
    po_number: 'PO-2024-002',
    status: 'in_progress',
    order_date: '2024-01-18',
    required_date: '2024-03-20',
    subtotal: 65000.00,
    tax_amount: 9750.00,
    total_amount: 74700.00,
    currency: 'ZAR',
    notes: 'Audio Interface and Recording Equipment - Professional audio interfaces and monitoring equipment'
  },
  {
    supplier_name: 'Legacy Brands',
    po_number: 'PO-2024-003',
    status: 'shipped',
    order_date: '2024-01-12',
    required_date: '2024-02-28',
    subtotal: 125000.00,
    tax_amount: 18750.00,
    total_amount: 146000.00,
    currency: 'ZAR',
    notes: 'Vintage Instrument Restoration Parts - Rare components for vintage instrument restoration'
  },
  {
    supplier_name: 'Alpha Technologies',
    po_number: 'PO-2024-004',
    status: 'pending_approval',
    order_date: '2024-01-20',
    required_date: '2024-03-10',
    subtotal: 95000.00,
    tax_amount: 14250.00,
    total_amount: 109000.00,
    currency: 'ZAR',
    notes: 'Digital Mixing Console and Controllers - Professional digital mixing console and MIDI controllers'
  },
  {
    supplier_name: 'Dynamic Sound Solutions',
    po_number: 'PO-2024-005',
    status: 'draft',
    order_date: '2024-01-22',
    required_date: '2024-04-05',
    subtotal: 185000.00,
    tax_amount: 27750.00,
    total_amount: 215500.00,
    currency: 'ZAR',
    notes: 'Live Sound Equipment Package - Complete live sound system for venue installations'
  },
  {
    supplier_name: 'Future Music Tech',
    po_number: 'PO-2024-006',
    status: 'completed',
    order_date: '2024-01-08',
    required_date: '2024-03-25',
    subtotal: 35000.00,
    tax_amount: 5250.00,
    total_amount: 39000.00,
    currency: 'ZAR',
    notes: 'Software Licenses and Digital Tools - Professional audio software licenses and digital production tools'
  },
  {
    supplier_name: 'Global Audio Distributors',
    po_number: 'PO-2024-007',
    status: 'received',
    order_date: '2024-01-05',
    required_date: '2024-03-18',
    subtotal: 75000.00,
    tax_amount: 11250.00,
    total_amount: 86000.00,
    currency: 'ZAR',
    notes: 'Microphone Collection and Accessories - Professional microphones and recording accessories'
  },
  {
    supplier_name: 'Innovation Audio Works',
    po_number: 'PO-2024-008',
    status: 'approved',
    order_date: '2024-01-25',
    required_date: '2024-04-15',
    subtotal: 220000.00,
    tax_amount: 33000.00,
    total_amount: 257000.00,
    currency: 'ZAR',
    notes: 'Custom Audio Processing Units - Bespoke audio processing equipment and custom electronics'
  },
  {
    supplier_name: 'Yamaha Music South Africa',
    po_number: 'PO-2024-009',
    status: 'approved',
    order_date: '2024-01-28',
    required_date: '2024-03-30',
    subtotal: 145000.00,
    tax_amount: 21750.00,
    total_amount: 166750.00,
    currency: 'ZAR',
    notes: 'Professional Keyboards and Synthesizers - High-end keyboard instruments for studio'
  },
  {
    supplier_name: 'Sennheiser South Africa',
    po_number: 'PO-2024-010',
    status: 'in_progress',
    order_date: '2024-01-30',
    required_date: '2024-04-01',
    subtotal: 89000.00,
    tax_amount: 13350.00,
    total_amount: 102350.00,
    currency: 'ZAR',
    notes: 'Professional Headphones and Microphones - Premium audio equipment for recording'
  },
  {
    supplier_name: 'JBL Professional',
    po_number: 'PO-2024-011',
    status: 'draft',
    order_date: '2024-02-01',
    required_date: '2024-04-20',
    subtotal: 320000.00,
    tax_amount: 48000.00,
    total_amount: 368000.00,
    currency: 'ZAR',
    notes: 'Professional Speaker Systems - Large venue sound reinforcement systems'
  },
  {
    supplier_name: 'Shure Distribution',
    po_number: 'PO-2024-012',
    status: 'received',
    order_date: '2024-01-02',
    required_date: '2024-03-05',
    subtotal: 67500.00,
    tax_amount: 10125.00,
    total_amount: 77625.00,
    currency: 'ZAR',
    notes: 'Wireless Microphone Systems - Professional wireless microphone solutions'
  },
  {
    supplier_name: 'Marshall Music',
    po_number: 'PO-2024-013',
    status: 'shipped',
    order_date: '2024-01-15',
    required_date: '2024-03-12',
    subtotal: 156000.00,
    tax_amount: 23400.00,
    total_amount: 179400.00,
    currency: 'ZAR',
    notes: 'Guitar Amplifiers and Effects - Professional guitar amplification equipment'
  },
  {
    supplier_name: 'Fender Musical Instruments',
    po_number: 'PO-2024-014',
    status: 'pending_approval',
    order_date: '2024-02-02',
    required_date: '2024-04-10',
    subtotal: 230000.00,
    tax_amount: 34500.00,
    total_amount: 264500.00,
    currency: 'ZAR',
    notes: 'Electric Guitars and Basses - Premium string instruments for recording studio'
  },
  {
    supplier_name: 'Audio-Technica',
    po_number: 'PO-2024-015',
    status: 'completed',
    order_date: '2024-01-18',
    required_date: '2024-03-20',
    subtotal: 78000.00,
    tax_amount: 11700.00,
    total_amount: 89700.00,
    currency: 'ZAR',
    notes: 'Professional Turntables and Cartridges - DJ and audiophile equipment'
  }
]

async function insertSimplePurchaseOrders() {
  try {
    await client.connect()
    console.log('Connected to PostgreSQL database')

    // Get all suppliers
    console.log('Fetching supplier information...')
    const suppliersResult = await client.query('SELECT id, name FROM suppliers')

    const supplierMap = new Map()
    suppliersResult.rows.forEach(supplier => {
      supplierMap.set(supplier.name, supplier.id)
    })

    console.log(`Found ${supplierMap.size} suppliers in database`)

    // Insert purchase orders
    let insertedCount = 0
    let skippedCount = 0

    for (const poData of purchaseOrdersData) {
      const supplierId = supplierMap.get(poData.supplier_name)

      if (!supplierId) {
        console.log(`⚠️  Skipping PO ${poData.po_number} - supplier ${poData.supplier_name} not found`)
        skippedCount++
        continue
      }

      try {
        const insertQuery = `
          INSERT INTO purchase_orders (
            po_number, supplier_id, status, order_date, required_date,
            subtotal, tax_amount, total_amount, currency, notes
          ) VALUES (
            $1, $2, $3, $4, $5, $6, $7, $8, $9, $10
          ) ON CONFLICT (po_number) DO NOTHING
        `

        const result = await client.query(insertQuery, [
          poData.po_number,
          supplierId,
          poData.status,
          poData.order_date,
          poData.required_date,
          poData.subtotal,
          poData.tax_amount,
          poData.total_amount,
          poData.currency,
          poData.notes
        ])

        console.log(`✅ Inserted PO ${poData.po_number} from ${poData.supplier_name}`)
        insertedCount++

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
        COUNT(*) FILTER (WHERE status = 'draft') as draft_count,
        COUNT(*) FILTER (WHERE status = 'pending_approval') as pending_count
      FROM purchase_orders
    `)

    const summary = totalResult.rows[0]

    console.log('\n📊 PURCHASE ORDERS DATABASE SUMMARY:')
    console.log(`✅ Successfully inserted ${insertedCount} purchase orders`)
    console.log(`⚠️  Skipped ${skippedCount} purchase orders (supplier not found)`)
    console.log(`📋 Total Purchase Orders: ${summary.total_pos}`)
    console.log(`💰 Total Value: R ${parseFloat(summary.total_value || '0').toLocaleString('en-ZA', { minimumFractionDigits: 2 })}`)
    console.log(`✅ Approved Orders: ${summary.approved_count}`)
    console.log(`🏁 Completed Orders: ${summary.completed_count}`)
    console.log(`📝 Draft Orders: ${summary.draft_count}`)
    console.log(`⏳ Pending Approval: ${summary.pending_count}`)

    // Show status breakdown
    const statusResult = await client.query(`
      SELECT status, COUNT(*) as count, SUM(total_amount) as value
      FROM purchase_orders
      GROUP BY status
      ORDER BY count DESC
    `)

    console.log('\n📈 STATUS BREAKDOWN:')
    statusResult.rows.forEach(row => {
      console.log(`   ${row.status.padEnd(20)}: ${row.count.toString().padStart(3)} orders (R ${parseFloat(row.value || '0').toLocaleString('en-ZA')})`)
    })

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
  insertSimplePurchaseOrders()
}

module.exports = { insertSimplePurchaseOrders }