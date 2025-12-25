#!/usr/bin/env bun

/**
 * Seed AV Equipment Database
 * Creates sample AV equipment items with pricing structure
 */

import { neon } from '@neondatabase/serverless';

const sql = neon(process.env.DATABASE_URL!);

const equipmentList = [
  // Cameras
  { sku: 'CAM-001', name: 'Canon EOS R5', equipment_type: 'camera', brand: 'Canon', model: 'EOS R5', rental_rate_daily: 850, rental_rate_weekly: 5000, rental_rate_monthly: 18000, security_deposit: 15000, replacement_value: 45000 },
  { sku: 'CAM-002', name: 'Sony FX3 Cinema Camera', equipment_type: 'camera', brand: 'Sony', model: 'FX3', rental_rate_daily: 1200, rental_rate_weekly: 7000, rental_rate_monthly: 25000, security_deposit: 20000, replacement_value: 55000 },
  { sku: 'CAM-003', name: 'Panasonic Lumix GH6', equipment_type: 'camera', brand: 'Panasonic', model: 'GH6', rental_rate_daily: 600, rental_rate_weekly: 3500, rental_rate_monthly: 12000, security_deposit: 8000, replacement_value: 28000 },
  { sku: 'CAM-004', name: 'Blackmagic Pocket Cinema Camera 6K', equipment_type: 'camera', brand: 'Blackmagic', model: 'Pocket 6K', rental_rate_daily: 750, rental_rate_weekly: 4200, rental_rate_monthly: 15000, security_deposit: 10000, replacement_value: 32000 },
  
  // Microphones
  { sku: 'MIC-001', name: 'Shure SM58 Dynamic Microphone', equipment_type: 'microphone', brand: 'Shure', model: 'SM58', rental_rate_daily: 50, rental_rate_weekly: 250, rental_rate_monthly: 800, security_deposit: 500, replacement_value: 1200 },
  { sku: 'MIC-002', name: 'Audio-Technica AT4053B Condenser Mic', equipment_type: 'microphone', brand: 'Audio-Technica', model: 'AT4053B', rental_rate_daily: 120, rental_rate_weekly: 600, rental_rate_monthly: 2000, security_deposit: 1500, replacement_value: 3500 },
  { sku: 'MIC-003', name: 'Sennheiser MKH 416 Shotgun Mic', equipment_type: 'microphone', brand: 'Sennheiser', model: 'MKH 416', rental_rate_daily: 150, rental_rate_weekly: 800, rental_rate_monthly: 2800, security_deposit: 2000, replacement_value: 4500 },
  { sku: 'MIC-004', name: 'Rode Wireless GO II System', equipment_type: 'microphone', brand: 'Rode', model: 'Wireless GO II', rental_rate_daily: 200, rental_rate_weekly: 1100, rental_rate_monthly: 3800, security_deposit: 2500, replacement_value: 6000 },
  
  // Speakers & PA
  { sku: 'SPK-001', name: 'QSC K12.2 Active Speaker', equipment_type: 'speaker', brand: 'QSC', model: 'K12.2', rental_rate_daily: 300, rental_rate_weekly: 1600, rental_rate_monthly: 5500, security_deposit: 4000, replacement_value: 12000 },
  { sku: 'SPK-002', name: 'JBL PRX815W Powered Speaker', equipment_type: 'speaker', brand: 'JBL', model: 'PRX815W', rental_rate_daily: 350, rental_rate_weekly: 1900, rental_rate_monthly: 6500, security_deposit: 5000, replacement_value: 15000 },
  { sku: 'SPK-003', name: 'Yamaha DXR15 Active Speaker', equipment_type: 'speaker', brand: 'Yamaha', model: 'DXR15', rental_rate_daily: 320, rental_rate_weekly: 1700, rental_rate_monthly: 5800, security_deposit: 4500, replacement_value: 13000 },
  { sku: 'SPK-004', name: 'Bose L1 Pro32 Portable PA System', equipment_type: 'speaker', brand: 'Bose', model: 'L1 Pro32', rental_rate_daily: 500, rental_rate_weekly: 2800, rental_rate_monthly: 9500, security_deposit: 8000, replacement_value: 22000 },
  
  // Mixing Consoles
  { sku: 'MIX-001', name: 'Yamaha MG16XU Analog Mixer', equipment_type: 'mixing_console', brand: 'Yamaha', model: 'MG16XU', rental_rate_daily: 250, rental_rate_weekly: 1300, rental_rate_monthly: 4500, security_deposit: 3000, replacement_value: 8500 },
  { sku: 'MIX-002', name: 'Soundcraft Signature 22 MTK', equipment_type: 'mixing_console', brand: 'Soundcraft', model: 'Signature 22 MTK', rental_rate_daily: 300, rental_rate_weekly: 1600, rental_rate_monthly: 5500, security_deposit: 4000, replacement_value: 12000 },
  { sku: 'MIX-003', name: 'Behringer X32 Digital Mixer', equipment_type: 'mixing_console', brand: 'Behringer', model: 'X32', rental_rate_daily: 600, rental_rate_weekly: 3300, rental_rate_monthly: 11500, security_deposit: 8000, replacement_value: 25000 },
  { sku: 'MIX-004', name: 'Allen & Heath SQ-5 Digital Mixer', equipment_type: 'mixing_console', brand: 'Allen & Heath', model: 'SQ-5', rental_rate_daily: 800, rental_rate_weekly: 4500, rental_rate_monthly: 16000, security_deposit: 12000, replacement_value: 35000 },
  
  // Lighting
  { sku: 'LGT-001', name: 'Chauvet DJ Intimidator Spot 350', equipment_type: 'lighting', brand: 'Chauvet', model: 'Intimidator Spot 350', rental_rate_daily: 150, rental_rate_weekly: 800, rental_rate_monthly: 2800, security_deposit: 2000, replacement_value: 5500 },
  { sku: 'LGT-002', name: 'ADJ Vizi Beam 5R Moving Head', equipment_type: 'lighting', brand: 'ADJ', model: 'Vizi Beam 5R', rental_rate_daily: 200, rental_rate_weekly: 1100, rental_rate_monthly: 3800, security_deposit: 3000, replacement_value: 7500 },
  { sku: 'LGT-003', name: 'Elation Rayzor 360Z Moving Head', equipment_type: 'lighting', brand: 'Elation', model: 'Rayzor 360Z', rental_rate_daily: 250, rental_rate_weekly: 1400, rental_rate_monthly: 4800, security_deposit: 3500, replacement_value: 9000 },
  { sku: 'LGT-004', name: 'Chauvet DJ COLORdash Par-Hex 12', equipment_type: 'lighting', brand: 'Chauvet', model: 'COLORdash Par-Hex 12', rental_rate_daily: 80, rental_rate_weekly: 400, rental_rate_monthly: 1400, security_deposit: 1000, replacement_value: 2500 },
  
  // Projectors
  { sku: 'PROJ-001', name: 'Epson PowerLite X41+ Projector', equipment_type: 'projector', brand: 'Epson', model: 'PowerLite X41+', rental_rate_daily: 400, rental_rate_weekly: 2200, rental_rate_monthly: 7500, security_deposit: 6000, replacement_value: 18000 },
  { sku: 'PROJ-002', name: 'BenQ MX550 Business Projector', equipment_type: 'projector', brand: 'BenQ', model: 'MX550', rental_rate_daily: 350, rental_rate_weekly: 1900, rental_rate_monthly: 6500, security_deposit: 5000, replacement_value: 15000 },
  { sku: 'PROJ-003', name: 'Sony VPL-FHZ75 Laser Projector', equipment_type: 'projector', brand: 'Sony', model: 'VPL-FHZ75', rental_rate_daily: 1200, rental_rate_weekly: 7000, rental_rate_monthly: 25000, security_deposit: 20000, replacement_value: 60000 },
  
  // Monitors & Displays
  { sku: 'MON-001', name: 'LG 55" 4K Professional Display', equipment_type: 'display', brand: 'LG', model: '55UN7300', rental_rate_daily: 300, rental_rate_weekly: 1600, rental_rate_monthly: 5500, security_deposit: 5000, replacement_value: 15000 },
  { sku: 'MON-002', name: 'Samsung 65" QLED Commercial Display', equipment_type: 'display', brand: 'Samsung', model: 'QN65Q80A', rental_rate_daily: 500, rental_rate_weekly: 2800, rental_rate_monthly: 9500, security_deposit: 8000, replacement_value: 25000 },
  
  // Cables & Accessories
  { sku: 'CAB-001', name: 'XLR Cable 10m (Professional)', equipment_type: 'cable', brand: 'ProCo', model: 'XLR-10M', rental_rate_daily: 20, rental_rate_weekly: 100, rental_rate_monthly: 300, security_deposit: 150, replacement_value: 400 },
  { sku: 'CAB-002', name: 'HDMI Cable 15m (4K)', equipment_type: 'cable', brand: 'Monoprice', model: 'HDMI-15M-4K', rental_rate_daily: 30, rental_rate_weekly: 150, rental_rate_monthly: 500, security_deposit: 200, replacement_value: 600 },
  { sku: 'CAB-003', name: 'DMX Cable 20m', equipment_type: 'cable', brand: 'ProCo', model: 'DMX-20M', rental_rate_daily: 25, rental_rate_weekly: 120, rental_rate_monthly: 400, security_deposit: 180, replacement_value: 500 },
  
  // Stands & Support
  { sku: 'STD-001', name: 'Manfrotto 1005BAC Tripod', equipment_type: 'stand', brand: 'Manfrotto', model: '1005BAC', rental_rate_daily: 80, rental_rate_weekly: 400, rental_rate_monthly: 1400, security_deposit: 1000, replacement_value: 2800 },
  { sku: 'STD-002', name: 'K&M 210/9 Speaker Stand', equipment_type: 'stand', brand: 'K&M', model: '210/9', rental_rate_daily: 40, rental_rate_weekly: 200, rental_rate_monthly: 700, security_deposit: 400, replacement_value: 1200 },
  { sku: 'STD-003', name: 'K&M 259/1 Microphone Stand', equipment_type: 'stand', brand: 'K&M', model: '259/1', rental_rate_daily: 25, rental_rate_weekly: 120, rental_rate_monthly: 400, security_deposit: 200, replacement_value: 600 },
];

async function seedEquipment() {
  console.log('Starting equipment seed...');
  
  for (const eq of equipmentList) {
    try {
      await sql`
        INSERT INTO rentals.equipment (
          sku, name, equipment_type, brand, model,
          rental_rate_daily, rental_rate_weekly, rental_rate_monthly,
          security_deposit, replacement_value,
          condition_status, availability_status, is_active
        )
        VALUES (
          ${eq.sku}, ${eq.name}, ${eq.equipment_type}, ${eq.brand}, ${eq.model},
          ${eq.rental_rate_daily}, ${eq.rental_rate_weekly}, ${eq.rental_rate_monthly},
          ${eq.security_deposit}, ${eq.replacement_value},
          'excellent', 'available', true
        )
        ON CONFLICT (sku) DO UPDATE SET
          name = EXCLUDED.name,
          equipment_type = EXCLUDED.equipment_type,
          brand = EXCLUDED.brand,
          model = EXCLUDED.model,
          rental_rate_daily = EXCLUDED.rental_rate_daily,
          rental_rate_weekly = EXCLUDED.rental_rate_weekly,
          rental_rate_monthly = EXCLUDED.rental_rate_monthly,
          security_deposit = EXCLUDED.security_deposit,
          replacement_value = EXCLUDED.replacement_value,
          updated_at = NOW()
      `;
      console.log(`✓ Added/Updated: ${eq.sku} - ${eq.name}`);
    } catch (error) {
      console.error(`✗ Failed: ${eq.sku} - ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
  
  console.log(`\n✅ Seeded ${equipmentList.length} equipment items`);
}

seedEquipment().catch(console.error);

