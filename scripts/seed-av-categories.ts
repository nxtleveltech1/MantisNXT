/**
 * Seed Audio Visual retail categories into the platform
 * 
 * Usage:
 *   npx ts-node scripts/seed-av-categories.ts
 * 
 * Or via API:
 *   POST /api/catalog/categories
 *   Body: { "action": "seed_av_categories" }
 */

import { query as dbQuery, withTransaction } from '../lib/database/unified-connection'

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

async function seedCategories() {
  try {
    console.log(`🌱 Seeding ${avCategories.length} Audio Visual retail categories...`)
    
    const result = await withTransaction(async (client) => {
      const inserted: Array<{ category_id: string; name: string }> = []
      const skipped: string[] = []
      
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
          inserted.push({ category_id: insert.rows[0].category_id, name: categoryName })
          console.log(`  ✅ Inserted: ${categoryName}`)
        } else {
          skipped.push(categoryName)
          console.log(`  ⏭️  Skipped (exists): ${categoryName}`)
        }
      }
      
      return { inserted, skipped }
    })
    
    console.log(`\n✨ Seeding complete!`)
    console.log(`   Inserted: ${result.inserted.length} new categories`)
    console.log(`   Skipped: ${result.skipped.length} existing categories`)
    console.log(`   Total: ${avCategories.length} categories processed\n`)
    
    if (result.inserted.length > 0) {
      console.log('New categories:')
      result.inserted.forEach(cat => console.log(`  - ${cat.name}`))
    }
    
    process.exit(0)
  } catch (error) {
    console.error('❌ Error seeding categories:', error)
    process.exit(1)
  }
}

// Run if executed directly
if (require.main === module) {
  seedCategories()
}

export { seedCategories, avCategories }

