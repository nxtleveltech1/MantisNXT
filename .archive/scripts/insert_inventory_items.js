const { Pool } = require('pg')

// Database connection
const pool = new Pool({
  host: '62.169.20.53',
  port: 6600,
  user: 'nxtdb_admin',
  password: 'P@33w0rd-1',
  database: 'nxtprod-db_001'
})

// Comprehensive inventory dataset - South African music/audio business context
const inventoryItems = [
  // Yamaha Music South Africa products
  {
    sku: 'YAM-P45-BK',
    name: 'Yamaha P-45 Digital Piano',
    description: '88-key weighted action digital piano with 10 voices, Perfect for beginners and advanced players',
    category: 'Keyboards & Pianos',
    brand: 'Yamaha',
    supplier_id: '88888888-8888-8888-8888-888888888888',
    supplier_sku: 'P45BK',
    cost_price: 8500.00,
    sale_price: 10200.00,
    stock_qty: 15,
    reorder_point: 5,
    max_stock: 30,
    unit: 'each',
    location: 'A1-01-A',
    tags: ['piano', 'digital', 'yamaha', 'beginner'],
    status: 'active',
    notes: 'Popular entry-level digital piano'
  },
  {
    sku: 'YAM-FG830-NT',
    name: 'Yamaha FG830 Acoustic Guitar',
    description: 'Solid spruce top dreadnought acoustic guitar with rosewood back and sides',
    category: 'Guitars',
    brand: 'Yamaha',
    supplier_id: '88888888-8888-8888-8888-888888888888',
    supplier_sku: 'FG830NT',
    cost_price: 4200.00,
    sale_price: 5400.00,
    stock_qty: 22,
    reorder_point: 8,
    max_stock: 40,
    unit: 'each',
    location: 'B2-03-C',
    tags: ['guitar', 'acoustic', 'yamaha', 'solid-top'],
    status: 'active',
    notes: 'Best selling acoustic guitar model'
  },

  // Sennheiser South Africa products
  {
    sku: 'SEN-HD660S2',
    name: 'Sennheiser HD660S2 Headphones',
    description: 'Open-back audiophile headphones with precision transducers',
    category: 'Audio Equipment',
    brand: 'Sennheiser',
    supplier_id: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    supplier_sku: 'HD660S2',
    cost_price: 6800.00,
    sale_price: 8200.00,
    stock_qty: 8,
    reorder_point: 3,
    max_stock: 20,
    unit: 'each',
    location: 'C3-05-B',
    tags: ['headphones', 'sennheiser', 'audiophile', 'open-back'],
    status: 'active',
    notes: 'High-end audiophile headphones'
  },
  {
    sku: 'SEN-MKE600',
    name: 'Sennheiser MKE 600 Shotgun Microphone',
    description: 'Professional shotgun microphone for camera and boom pole mounting',
    category: 'Microphones',
    brand: 'Sennheiser',
    supplier_id: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    supplier_sku: 'MKE600',
    cost_price: 4500.00,
    sale_price: 5800.00,
    stock_qty: 6,
    reorder_point: 2,
    max_stock: 15,
    unit: 'each',
    location: 'C3-08-A',
    tags: ['microphone', 'shotgun', 'sennheiser', 'professional'],
    status: 'active',
    notes: 'Professional broadcast microphone'
  },

  // BK Percussion products
  {
    sku: 'BKP-REMO-A',
    name: 'BK Remo Ambassador 14" Snare Head',
    description: 'Professional quality snare drum head, medium-weight single-ply',
    category: 'Drums & Percussion',
    brand: 'Remo',
    supplier_id: 'cd8fa19a-2749-47ed-b932-d6b28fe9e149',
    supplier_sku: 'BA0114-00',
    cost_price: 280.00,
    sale_price: 380.00,
    stock_qty: 45,
    reorder_point: 15,
    max_stock: 80,
    unit: 'each',
    location: 'D1-02-C',
    tags: ['drums', 'drumhead', 'remo', 'snare'],
    status: 'active',
    notes: 'Popular replacement drumhead'
  },
  {
    sku: 'BKP-STICK-5A',
    name: 'Vic Firth American Classic 5A Drumsticks',
    description: 'Most popular stick model - medium weight and tear drop tip',
    category: 'Drums & Percussion',
    brand: 'Vic Firth',
    supplier_id: 'cd8fa19a-2749-47ed-b932-d6b28fe9e149',
    supplier_sku: 'VF5A',
    cost_price: 145.00,
    sale_price: 220.00,
    stock_qty: 96,
    reorder_point: 30,
    max_stock: 150,
    unit: 'pair',
    location: 'D1-05-A',
    tags: ['drumsticks', 'vic-firth', '5a', 'accessories'],
    status: 'active',
    notes: 'Fast moving consumable item'
  },

  // Alpha Technologies products
  {
    sku: 'ALP-MIX16USB',
    name: 'Alpha MixLine 16 USB Mixing Desk',
    description: '16-channel analog mixer with USB recording interface',
    category: 'Audio Equipment',
    brand: 'Alpha',
    supplier_id: 'fc6cb400-493c-400d-a534-4f10dcf66f07',
    supplier_sku: 'ML16USB',
    cost_price: 3200.00,
    sale_price: 4100.00,
    stock_qty: 12,
    reorder_point: 4,
    max_stock: 25,
    unit: 'each',
    location: 'E2-04-B',
    tags: ['mixer', 'usb', 'recording', 'alpha'],
    status: 'active',
    notes: 'Popular small venue mixer'
  },

  // BC Electronics products
  {
    sku: 'BCE-AMP-100W',
    name: 'BC Power 100W Guitar Amplifier',
    description: 'Solid state guitar amplifier with 3-band EQ and reverb',
    category: 'Amplifiers',
    brand: 'BC Electronics',
    supplier_id: '06de9fb9-252b-4273-97eb-00140f03af55',
    supplier_sku: 'PWR100G',
    cost_price: 2800.00,
    sale_price: 3600.00,
    stock_qty: 18,
    reorder_point: 6,
    max_stock: 35,
    unit: 'each',
    location: 'F3-01-A',
    tags: ['amplifier', 'guitar', 'solid-state', 'bc-electronics'],
    status: 'active',
    notes: 'Reliable practice and small gig amp'
  },

  // Stage Audio Works products
  {
    sku: 'SAW-SPEAK-15',
    name: 'Stage Audio 15" PA Speaker',
    description: '400W RMS professional PA speaker with horn tweeter',
    category: 'PA Systems',
    brand: 'Stage Audio',
    supplier_id: '66666666-6666-6666-6666-666666666666',
    supplier_sku: 'SA15-400',
    cost_price: 4200.00,
    sale_price: 5400.00,
    stock_qty: 16,
    reorder_point: 6,
    max_stock: 30,
    unit: 'each',
    location: 'G1-08-B',
    tags: ['speaker', 'pa', 'professional', 'stage-audio'],
    status: 'active',
    notes: 'Popular PA speaker for venues'
  },

  // Legacy Brands products
  {
    sku: 'LEG-CABLE-XLR5',
    name: 'Legacy Pro XLR Cable 5m',
    description: 'Professional balanced XLR microphone cable, 5 meter length',
    category: 'Cables & Accessories',
    brand: 'Legacy',
    supplier_id: '48328342-709d-42f0-82aa-85395022e8f7',
    supplier_sku: 'XLR-5M-PRO',
    cost_price: 180.00,
    sale_price: 280.00,
    stock_qty: 75,
    reorder_point: 25,
    max_stock: 120,
    unit: 'each',
    location: 'H2-03-C',
    tags: ['cable', 'xlr', 'microphone', 'legacy'],
    status: 'active',
    notes: 'High quality professional cable'
  },

  // Music Power products
  {
    sku: 'MPS-PERC-CABA',
    name: 'Music Power Cabasas',
    description: 'Professional cabasa shaker with steel beads',
    category: 'Drums & Percussion',
    brand: 'Music Power',
    supplier_id: 'ecc30b28-10eb-4719-9bce-8d7267c7d37d',
    supplier_sku: 'CABASA-STD',
    cost_price: 320.00,
    sale_price: 420.00,
    stock_qty: 24,
    reorder_point: 8,
    max_stock: 45,
    unit: 'each',
    location: 'D2-06-A',
    tags: ['percussion', 'cabasa', 'shaker', 'music-power'],
    status: 'active',
    notes: 'Popular percussion instrument'
  },

  // Tuerk Multimedia products
  {
    sku: 'TUE-PROJ-HD',
    name: 'Tuerk HD Video Projector',
    description: '3000 lumen HD projector for presentations and events',
    category: 'AV Equipment',
    brand: 'Tuerk',
    supplier_id: '33333333-3333-3333-3333-333333333333',
    supplier_sku: 'HD-PROJ-3K',
    cost_price: 8500.00,
    sale_price: 11200.00,
    stock_qty: 7,
    reorder_point: 2,
    max_stock: 15,
    unit: 'each',
    location: 'I1-04-A',
    tags: ['projector', 'hd', 'presentation', 'tuerk'],
    status: 'active',
    notes: 'Professional presentation projector'
  },

  // Audiolite products
  {
    sku: 'AUD-LIGHT-LED',
    name: 'Audiolite LED Par Can 64',
    description: 'RGB LED par can with DMX control for stage lighting',
    category: 'Lighting',
    brand: 'Audiolite',
    supplier_id: '22222222-2222-2222-2222-222222222222',
    supplier_sku: 'LED-PAR64-RGB',
    cost_price: 1800.00,
    sale_price: 2400.00,
    stock_qty: 32,
    reorder_point: 10,
    max_stock: 60,
    unit: 'each',
    location: 'J3-02-B',
    tags: ['lighting', 'led', 'par-can', 'dmx'],
    status: 'active',
    notes: 'Popular stage lighting fixture'
  },

  // Low stock and out of stock items for testing
  {
    sku: 'YAM-CP88-BK',
    name: 'Yamaha CP88 Stage Piano',
    description: '88-key wooden key stage piano with vintage electric piano sounds',
    category: 'Keyboards & Pianos',
    brand: 'Yamaha',
    supplier_id: '88888888-8888-8888-8888-888888888888',
    supplier_sku: 'CP88BK',
    cost_price: 18500.00,
    sale_price: 22800.00,
    stock_qty: 2, // Low stock
    reorder_point: 3,
    max_stock: 12,
    unit: 'each',
    location: 'A1-05-B',
    tags: ['piano', 'stage', 'yamaha', 'professional'],
    status: 'active',
    notes: 'Professional stage piano - LOW STOCK'
  },
  {
    sku: 'SEN-E835-MIC',
    name: 'Sennheiser e835 Dynamic Microphone',
    description: 'Cardioid dynamic vocal microphone with excellent feedback rejection',
    category: 'Microphones',
    brand: 'Sennheiser',
    supplier_id: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    supplier_sku: 'E835',
    cost_price: 1200.00,
    sale_price: 1580.00,
    stock_qty: 0, // Out of stock
    reorder_point: 5,
    max_stock: 25,
    unit: 'each',
    location: 'C3-07-A',
    tags: ['microphone', 'dynamic', 'vocal', 'sennheiser'],
    status: 'out_of_stock',
    notes: 'OUT OF STOCK - Reorder urgently'
  },

  // Additional items for variety
  {
    sku: 'ROL-THUNDER-SUB',
    name: 'Rolling Thunder 18" Subwoofer',
    description: '1000W powered subwoofer for professional sound reinforcement',
    category: 'PA Systems',
    brand: 'Rolling Thunder',
    supplier_id: 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee',
    supplier_sku: 'RT-SUB18-1K',
    cost_price: 7200.00,
    sale_price: 9400.00,
    stock_qty: 9,
    reorder_point: 3,
    max_stock: 20,
    unit: 'each',
    location: 'G2-01-A',
    tags: ['subwoofer', 'powered', 'professional', 'rolling-thunder'],
    status: 'active',
    notes: 'High-powered subwoofer system'
  }
]

async function insertInventoryItems() {
  const client = await pool.connect()

  try {
    console.log('🚀 Starting inventory items insertion...')

    // Start transaction
    await client.query('BEGIN')

    let successCount = 0
    let errorCount = 0

    for (const item of inventoryItems) {
      try {
        const query = `
          INSERT INTO inventory_items (
            sku, name, description, category, brand, supplier_id, supplier_sku,
            cost_price, sale_price, currency, stock_qty, reserved_qty,
            reorder_point, max_stock, unit, location, tags, status, notes
          ) VALUES (
            $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19
          )`

        const values = [
          item.sku,
          item.name,
          item.description,
          item.category,
          item.brand,
          item.supplier_id,
          item.supplier_sku,
          item.cost_price,
          item.sale_price,
          'ZAR',
          item.stock_qty,
          0, // reserved_qty
          item.reorder_point,
          item.max_stock,
          item.unit,
          item.location,
          item.tags,
          item.status,
          item.notes
        ]

        await client.query(query, values)
        successCount++
        console.log(`✅ Inserted: ${item.sku} - ${item.name}`)

      } catch (error) {
        errorCount++
        console.error(`❌ Error inserting ${item.sku}:`, error.message)
      }
    }

    // Commit transaction
    await client.query('COMMIT')

    // Get final statistics
    const totalResult = await client.query('SELECT COUNT(*) FROM inventory_items')
    const lowStockResult = await client.query('SELECT COUNT(*) FROM inventory_items WHERE stock_qty <= reorder_point AND stock_qty > 0')
    const outOfStockResult = await client.query('SELECT COUNT(*) FROM inventory_items WHERE stock_qty = 0')
    const totalValueResult = await client.query('SELECT SUM(stock_qty * cost_price) FROM inventory_items WHERE status = $1', ['active'])

    console.log('\n📊 INVENTORY INSERTION SUMMARY:')
    console.log('=====================================')
    console.log(`✅ Successfully inserted: ${successCount} items`)
    console.log(`❌ Errors: ${errorCount} items`)
    console.log(`📦 Total inventory items: ${totalResult.rows[0].count}`)
    console.log(`⚠️  Low stock items: ${lowStockResult.rows[0].count}`)
    console.log(`🚫 Out of stock items: ${outOfStockResult.rows[0].count}`)
    console.log(`💰 Total inventory value: R${parseFloat(totalValueResult.rows[0].sum || 0).toLocaleString('en-ZA', { minimumFractionDigits: 2 })}`)

    console.log('\n🎉 Inventory items insertion completed successfully!')

  } catch (error) {
    // Rollback transaction on error
    await client.query('ROLLBACK')
    console.error('💥 Fatal error during inventory insertion:', error)
    throw error
  } finally {
    client.release()
  }
}

// Execute the script
if (require.main === module) {
  insertInventoryItems()
    .then(() => {
      console.log('🏁 Script completed successfully')
      process.exit(0)
    })
    .catch((error) => {
      console.error('💥 Script failed:', error)
      process.exit(1)
    })
}

module.exports = { insertInventoryItems }