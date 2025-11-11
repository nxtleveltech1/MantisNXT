import type { NextRequest} from 'next/server';
import { NextResponse } from 'next/server'
import { query as dbQuery, withTransaction } from '@/lib/database/unified-connection'

export async function GET() {
  try {
    // Core categories
    const coreRes = await dbQuery<{ category_id: string; name: string }>(
      'SELECT category_id, name FROM core.category ORDER BY name'
    )

    // Raw categories from uploads (distinct non-empty)
    const rawRes = await dbQuery<{ id: string; name: string }>(
      `SELECT DISTINCT 'raw:' || r.category_raw AS id, r.category_raw AS name
       FROM spp.pricelist_row r
       WHERE r.category_raw IS NOT NULL AND r.category_raw <> ''
       ORDER BY r.category_raw`
    )

    // Combine and de-duplicate by id
    const coreList = coreRes.rows.map(r => ({ id: r.category_id, category_id: r.category_id, name: r.name, source: 'core' as const }))
    const rawList = rawRes.rows.map(r => ({ id: r.id, category_id: null as unknown, name: r.name, source: 'raw' as const }))

    // De-duplicate by name (case-insensitive), preferring core entries over raw
    const seenByName = new Map<string, unknown>()
    for (const item of coreList) {
      const key = item.name?.toLowerCase().trim() || ''
      if (key && !seenByName.has(key)) seenByName.set(key, item)
    }
    for (const item of rawList) {
      const key = item.name?.toLowerCase().trim() || ''
      if (key && !seenByName.has(key)) seenByName.set(key, item)
    }
    const all = Array.from(seenByName.values())

    return NextResponse.json({ success: true, data: all })
  } catch (error) {
    console.error('[API] /api/catalog/categories error:', error)
    return NextResponse.json({ success: false, error: 'Failed to fetch categories' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { action, categories } = body

    if (action === 'seed_av_categories') {
      // Audio Visual retail categories
      const avCategories = [
        // Displays & Monitors
        'Displays',
        'LED Displays',
        'LCD Displays',
        'OLED Displays',
        'Projection Displays',
        'Interactive Displays',
        'Touchscreen Displays',
        'Computer Monitors',
        'Professional Monitors',
        'Gaming Monitors',
        
        // Projectors
        'Projectors',
        'Home Theater Projectors',
        'Business Projectors',
        'Short Throw Projectors',
        'Ultra Short Throw Projectors',
        'Laser Projectors',
        '4K Projectors',
        'Portable Projectors',
        
        // Audio Systems
        'Audio Systems',
        'Soundbars',
        'Home Theater Systems',
        'Surround Sound Systems',
        'Wireless Audio Systems',
        'Multi-Room Audio',
        'PA Systems',
        'Portable PA Systems',
        'Conferencing Audio',
        
        // Speakers
        'Speakers',
        'Bookshelf Speakers',
        'Floor Standing Speakers',
        'In-Wall Speakers',
        'In-Ceiling Speakers',
        'Outdoor Speakers',
        'Portable Speakers',
        'Bluetooth Speakers',
        'Studio Monitors',
        'Commercial Speakers',
        
        // Amplifiers & Receivers
        'Amplifiers',
        'AV Receivers',
        'Stereo Amplifiers',
        'Multi-Channel Amplifiers',
        'Power Amplifiers',
        'Integrated Amplifiers',
        'Preamplifiers',
        'Commercial Amplifiers',
        
        // Microphones
        'Microphones',
        'Wireless Microphones',
        'Wired Microphones',
        'Lavalier Microphones',
        'Headset Microphones',
        'USB Microphones',
        'Professional Microphones',
        'Conference Microphones',
        
        // Headphones & Headsets
        'Headphones',
        'Over-Ear Headphones',
        'On-Ear Headphones',
        'In-Ear Headphones',
        'Wireless Headphones',
        'Noise Cancelling Headphones',
        'Gaming Headsets',
        'Professional Headsets',
        'Conference Headsets',
        
        // Cameras
        'Cameras',
        'PTZ Cameras',
        'Fixed Cameras',
        'Conference Cameras',
        'Streaming Cameras',
        'Security Cameras',
        'IP Cameras',
        'Webcams',
        'Action Cameras',
        
        // Video Equipment
        'Video Switchers',
        'Video Processors',
        'Video Scalers',
        'Video Distribution',
        'Video Walls',
        'LED Video Walls',
        'Video Matrix Switchers',
        'HDMI Switchers',
        'HDMI Splitters',
        'HDMI Extenders',
        'Video Converters',
        'Streaming Equipment',
        
        // Control Systems
        'Control Systems',
        'Control Processors',
        'Touch Panels',
        'Control Remotes',
        'IR Control',
        'Control Software',
        'Automation Systems',
        
        // Cables & Connectivity
        'Cables',
        'HDMI Cables',
        'DisplayPort Cables',
        'Audio Cables',
        'XLR Cables',
        'RCA Cables',
        'Ethernet Cables',
        'Fiber Optic Cables',
        'USB Cables',
        'Power Cables',
        'Cable Management',
        'Connectors',
        'Adapters',
        'Converters',
        
        // Mounts & Installation
        'Mounts',
        'TV Mounts',
        'Projector Mounts',
        'Speaker Mounts',
        'Camera Mounts',
        'Wall Mounts',
        'Ceiling Mounts',
        'Stand Mounts',
        'Installation Hardware',
        'Racks & Enclosures',
        'Rack Accessories',
        
        // Accessories
        'Remote Controls',
        'Universal Remotes',
        'Batteries',
        'Screen Cleaners',
        'Lens Cleaners',
        'Cable Ties',
        'Labels',
        'Cases & Bags',
        'Surge Protectors',
        'Power Strips',
        'UPS Systems',
        
        // Lighting
        'Lighting',
        'LED Lighting',
        'Stage Lighting',
        'Ambient Lighting',
        'Smart Lighting',
        'Lighting Control',
        
        // Network & Streaming
        'Network Equipment',
        'Media Players',
        'Streaming Devices',
        'Set-Top Boxes',
        'Digital Signage Players',
        'Content Management Systems',
        
        // Tools & Equipment
        'Tools',
        'Crimping Tools',
        'Testing Equipment',
        'Signal Testers',
        'Calibration Tools',
        
        // Software & Services
        'Software',
        'Control Software',
        'Configuration Software',
        'Monitoring Software',
      ]

      const inserted = await withTransaction(async (client) => {
        const results: Array<{ category_id: string; name: string }> = []
        
        for (const categoryName of avCategories) {
          // Check if category already exists
          const existing = await client.query<{ category_id: string }>(
            'SELECT category_id FROM core.category WHERE LOWER(name) = LOWER($1)',
            [categoryName]
          )
          
          if (existing.rows.length === 0) {
            // Insert new category
            const insert = await client.query<{ category_id: string }>(
              'INSERT INTO core.category (name, created_at, updated_at) VALUES ($1, NOW(), NOW()) RETURNING category_id',
              [categoryName]
            )
            results.push({ category_id: insert.rows[0].category_id, name: categoryName })
          }
        }
        
        return results
      })

      return NextResponse.json({
        success: true,
        message: `Processed ${avCategories.length} categories`,
        inserted: inserted.length,
        skipped: avCategories.length - inserted.length,
        categories: inserted
      })
    }

    // Handle individual category creation
    if (categories && Array.isArray(categories)) {
      const inserted = await withTransaction(async (client) => {
        const results: Array<{ category_id: string; name: string }> = []
        
        for (const categoryName of categories) {
          if (!categoryName || typeof categoryName !== 'string') continue
          
          // Check if category already exists
          const existing = await client.query<{ category_id: string }>(
            'SELECT category_id FROM core.category WHERE LOWER(name) = LOWER($1)',
            [categoryName]
          )
          
          if (existing.rows.length === 0) {
            // Insert new category
            const insert = await client.query<{ category_id: string }>(
              'INSERT INTO core.category (name, created_at, updated_at) VALUES ($1, NOW(), NOW()) RETURNING category_id',
              [categoryName]
            )
            results.push({ category_id: insert.rows[0].category_id, name: categoryName })
          }
        }
        
        return results
      })

      return NextResponse.json({
        success: true,
        inserted: inserted.length,
        categories: inserted
      })
    }

    return NextResponse.json(
      { success: false, error: 'Invalid request. Provide action="seed_av_categories" or categories array' },
      { status: 400 }
    )
  } catch (error) {
    console.error('[API] /api/catalog/categories POST error:', error)
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Failed to create categories' },
      { status: 500 }
    )
  }
}
