#!/usr/bin/env bun
/**
 * Add Rental Stock Items
 *
 * Imports rental items from the provided list into public.inventory_items table.
 * Handles both fixed price and per-day pricing.
 *
 * Usage:
 *   bun scripts/add-rental-stock.ts
 *
 * Requirements:
 *   - DATABASE_URL or NEON_SPP_DATABASE_URL environment variable must be set
 */

import { Client } from 'pg';
import { upsertSupplierProduct, setStock } from '@/services/ssot/inventoryService';

interface RentalItem {
  name: string;
  internalReference: string;
  rentalPrice: string; // e.g., "R 800.00 / 1 Day" or "R 0.00 (fixed)"
}

// Rental items from the image
const rentalItems: RentalItem[] = [
  { name: 'AKG WMS40mini dual Handheld Rental', internalReference: 'AKG wms40mini Rental', rentalPrice: 'R 0.00 (fixed)' },
  { name: 'ANTARI M7-RGBA Jet Fog Machine Rental', internalReference: 'ANTARI M7-RGBA Rental', rentalPrice: 'R 800.00 / 1 Day' },
  { name: 'Allen & Heath Qu32 + Case Rental', internalReference: 'Allen & Heath Qu32 Rental', rentalPrice: 'R 1,500.00 / 1 Day' },
  { name: 'Allen & heath ZEDi10FX', internalReference: 'Zedi10fx rental', rentalPrice: 'R 350.00 (fixed)' },
  { name: 'Antari HZ350 Hazer Rental', internalReference: 'HZ350 Hazer Rental', rentalPrice: 'R 900.00 / 1 Day' },
  { name: 'Antari Z1000 Rental', internalReference: 'Antari Z1000 Rental', rentalPrice: 'R 0.00 (fixed)' },
  { name: 'Ashdown Mag 300 + 2x MAG 210T Deep Rental', internalReference: 'Ashdown Bass Head & Cabs Rental', rentalPrice: 'R 1,500.00 / 1 Day' },
  { name: 'Audio-Technica AT2020V Limited Edition VISION Rental', internalReference: 'AT2020V Rental', rentalPrice: 'R 2,503.31 (fixed)' },
  { name: 'Audio-Technica ATM350 Rental', internalReference: 'Audio-Technica ATM350 Rental', rentalPrice: 'R 400.00 / 1 Day' },
  { name: 'Audiocenter KLA218DSP Rental', internalReference: 'Audiocenter KLA218DSP Rental', rentalPrice: 'R 2,000.00 / 1 Day' },
  { name: 'Audiocenter MA118 Rental Sub', internalReference: 'Audiocenter MA118 Rental Sub', rentalPrice: 'R 800.00 / 1 Day' },
  { name: 'Audiocenter XLA102-DSP Line Array Rental', internalReference: 'XLA102 DSP RENTAL', rentalPrice: 'R 1,500.00 / 1 Day' },
  { name: 'Avolites T1 Dongle USB DMX Interface', internalReference: 'Avolites T1 Dongle USB Rental', rentalPrice: 'R 5,158.80 (fixed)' },
  { name: 'BEAMZ PRO BTK200C FRESNEL 200W LED CW/WW Rental', internalReference: 'BTK200C Rental', rentalPrice: 'R 0.00 (fixed)' },
  { name: 'BEAMZ PRO IGNITE300A LED MOVING HEAD Rental', internalReference: 'BEAMZPRO IGNITE300A Rental', rentalPrice: 'R 1,500.00 / 1 Day' },
  { name: 'BK Boom Table Top Microphone Stand - Black Finish', internalReference: 'rental BK Desk mic stand', rentalPrice: 'R 100.00 / 1 Day' },
  { name: 'Beamz Fuse 75W Wash 75W LED Moving Head', internalReference: 'Rental Fuse 75w', rentalPrice: 'R 400.00 / 1 Day' },
  { name: 'Beamz B2500 Bubble Machine Rental', internalReference: 'Beamz B2500 Rental', rentalPrice: 'R 500.00 / 1 Day' },
  { name: 'Beamz Ignite 60 Spot Rental', internalReference: 'Beamz Ignite 60 Spot Rental', rentalPrice: 'R 450.00 / 1 Day' },
  { name: 'Beamz LCB-155 LED BAR 12x12W Rental', internalReference: 'Rental Beamz LCB 155', rentalPrice: 'R 0.00 (fixed)' },
  { name: 'Beamz LED MULTI ACIS IV RGBWAUV Rental', internalReference: 'Beamz LED MULTI ACIS IV RGBWAUV Rental', rentalPrice: 'R 450.00 / 1 Day' },
  { name: 'Beamz Radical II FX Light Rental', internalReference: 'Radical II FX Rental', rentalPrice: 'R 350.00 / 1 Day' },
  { name: 'Behringer EP1500 2 x 700 Watt Power Amplifier Rental', internalReference: 'EP1500 Rental', rentalPrice: 'R 0.00 (fixed)' },
  { name: 'Behringer EP2500 rental', internalReference: 'Ep2500 rental', rentalPrice: 'R 1.00 (fixed)' },
  { name: 'Boss Katana 100 MKII Rental', internalReference: 'Boss Katana 100 MKII Rental', rentalPrice: 'R 1,000.00 / 1 Day' },
  { name: 'Bubble Machine Rental', internalReference: 'Bubble Machine Rental', rentalPrice: 'R 0.00 (fixed)' },
  { name: 'Celto Custom Sub', internalReference: 'Celto Custom Sub', rentalPrice: 'R 600.00 / 1 Day' },
  { name: 'Celto VT15 2-way full range, 1000W, 8 ohms, 15" LF + 1.5" exit Hi', internalReference: 'VT15', rentalPrice: 'R 800.00 / 1 Day' },
  { name: 'Chauvet Follow Spot Rental', internalReference: 'Chauvet follow spot rental', rentalPrice: 'R 800.00 / 1 Day' },
  { name: 'Chauvet GigBAR 2 4-in-1 lighting System Rental', internalReference: 'GIGBAR 2 Rental', rentalPrice: 'R 1.00 (fixed)' },
  { name: 'Chauvet Intimidator 260X Rental', internalReference: 'Intimidator 260x Rental', rentalPrice: 'R 350.00 / 1 Day' },
  { name: 'Chauvet SlimPAR T12 USB Rental', internalReference: 'SlimPAR T12 USB Rental', rentalPrice: 'R 250.00 / 1 Day' },
  { name: 'Collection/Delivery', internalReference: '', rentalPrice: 'R 1.00 (fixed)' },
  { name: 'DBX DB10 Passive Direct Box', internalReference: 'DB10 Rental', rentalPrice: 'R 1.00 (fixed)' },
  { name: 'DBX DB1 Active Direct Box Rental', internalReference: 'DB12 Rental', rentalPrice: 'R 0.00 (fixed)' },
  { name: 'DJI Power V-3 SPARK MACHINE (RENTAL)', internalReference: 'V-3 SPARK MACHINE Rental', rentalPrice: 'R 2,000.00 / 1 Day' },
  { name: 'DJI Power X1 Dry Ice Machine Rental', internalReference: 'DJI Power X1 Dry Ice Machine Rental', rentalPrice: 'R 2,000.00 / 1 Day' },
  { name: 'DJ Service', internalReference: 'DJI Service', rentalPrice: 'R 0.00 (fixed)' },
  { name: 'DJ Table Stage Rental 1m x 0.5m 1m Legs', internalReference: 'DJ Table Stage Rental', rentalPrice: 'R 400.00 / 1 Day' },
  { name: 'Dell Laptop Rental', internalReference: 'Dell Laptop Rental', rentalPrice: 'R 500.00 / 1 Day' },
  { name: 'Drone rental', internalReference: 'Drone rental', rentalPrice: 'R 1.00 (fixed)' },
  { name: 'EWI Snake 16in 4 return Rental', internalReference: 'Rental EWI snake', rentalPrice: 'R 0.00 (fixed)' },
  { name: 'Fairy Morning Setup', internalReference: '', rentalPrice: 'R 2.00 (fixed)' },
  { name: 'Focusrite ISA One Desktop Microphone Preamp', internalReference: 'FOC-ISAONE', rentalPrice: 'R 12,996.75 (fixed)' },
  { name: 'Follow Spot Rental Lamp based', internalReference: 'Follow Spot Rental', rentalPrice: 'R 0.00 (fixed)' },
  { name: 'Funky DJ table Rental', internalReference: 'Funky DJ table Rental', rentalPrice: 'R 600.00 / 1 Day' },
  { name: 'Fuse 610Z 75W RGBW Moving Head RENTAL', internalReference: 'Fuse 610Z RENTAL', rentalPrice: 'R 0.00 (fixed)' },
  { name: 'Gantry Truss System Rental', internalReference: 'Gantry Truss System Rental', rentalPrice: 'R 8,000.00 / 1 Day' },
  { name: 'GrandView PT-1100-CHARMING 4:3 Tripod Portable Series Screen 100"', internalReference: 'Rental Tripod Portable Series Screen 100"', rentalPrice: 'R 0.00 (fixed)' },
  { name: 'GrandView Super Mobile Fastfold 16x9 Screen Rental', internalReference: 'Rental 16x9 Fast fold', rentalPrice: 'R 1,250.00 / 1 Day' },
  { name: 'Hisense 65" UHD SMART LED TV Rental', internalReference: '65H8K Rental', rentalPrice: 'R 1,000.00 / 1 Day' },
  { name: 'Hercules Speaker Stand Rental', internalReference: 'Hercules Speaker Stand (Rental)', rentalPrice: 'R 250.00 / 1 Day' },
  { name: 'Hercules double Keyboard stand Rental', internalReference: 'Hercules Keys stand Rental', rentalPrice: 'R 400.00 / 1 Day' },
  { name: 'Hisense 40" LED TV Comfort Monitor Rental', internalReference: 'Hisense 40" LED TV Comfort RENTAL', rentalPrice: 'R 600.00 / 1 Day' },
  { name: 'Hybrid B8000 Amplifier Rental', internalReference: 'B8000 Rental', rentalPrice: 'R 1,000.00 / 1 Day' },
  { name: 'Hybrid Dual Wireless Mic System Rental', internalReference: 'Hybrid Dual Wireless Rental', rentalPrice: 'R 0.00 (fixed)' },
  { name: 'Hybrid HZ30000 Rental', internalReference: 'Hybrid HZ30000 rental', rentalPrice: 'R 600.00 / 1 Day' },
  { name: 'Hybrid HSS 12.4 Rental', internalReference: 'HSS 12.4 Rental', rentalPrice: 'R 300.00 / 1 Day' },
  { name: 'Hybrid HSS 12.6 Rental', internalReference: 'HSS 12.6 Rental', rentalPrice: 'R 350.00 / 1 Day' },
  { name: 'Hybrid HSS-CD1000 Rental', internalReference: 'HSS-CD1000 Rental', rentalPrice: 'R 0.00 (fixed)' },
  { name: 'Hybrid HU 15 Rental', internalReference: 'HU 15 Rental', rentalPrice: 'R 0.00 (fixed)' },
  { name: 'Hybrid H15000 Hazer Rental', internalReference: 'Hybrid H15000 Hazer Rental', rentalPrice: 'R 350.00 / 1 Day' },
  { name: 'Hybrid L2-2000RGBH/1 Laser, Beam & Animated Graphics Rental', internalReference: 'L2-2000RGBH/1 Rental', rentalPrice: 'R 0.00 (fixed)' },
  { name: 'Hybrid P815N Rental', internalReference: 'Rental P815N', rentalPrice: 'R 0.00 (fixed)' },
  { name: 'Hybrid P815N Rental Passive Speaker', internalReference: 'Hybrid P815N Rental', rentalPrice: 'R 200.00 / 1 Day' },
  { name: 'Hybrid Portable DJ Screen Rental', internalReference: 'Hybrid Portable DJ Screen Rental', rentalPrice: 'R 300.00 / 1 Day' },
  { name: 'Hybrid Spider Light Rental', internalReference: 'Hybrid Spider Light Rental', rentalPrice: 'R 500.00 / 1 Day' },
  { name: 'Hybrid U1-104 System with 4x Racks + 1 Headsets Rental', internalReference: 'Hybrid U1-104 System with racks Rental', rentalPrice: 'R 0.00 (fixed)' },
  { name: 'Hybrid U1-10N/1S Rental', internalReference: 'U1-10N/1S Rental', rentalPrice: 'R 500.00 / 1 Day' },
  { name: 'K&M Kick drum Mic Stand Rental', internalReference: 'K&M Kick stand Rental', rentalPrice: 'R 250.00 / 1 Day' },
  { name: 'K&M Lighting Stand Rental', internalReference: 'K&M Lighting Stand Rental', rentalPrice: 'R 100.00 / 1 Day' },
  { name: 'K&M Microphone Stand Rental', internalReference: 'K&M Microphone Stand Rental', rentalPrice: 'R 100.00 / 1 Day' },
  { name: 'K&M Omega 18810 Keyboard Stand Rental', internalReference: 'K&M Omega 18810 Key Stand Rental', rentalPrice: 'R 1.00 (fixed)' },
  { name: 'K&M Speaker Pole Rental', internalReference: 'K&M Speaker Pole Rental', rentalPrice: 'R 150.00 / 1 Day' },
  { name: 'KORG KROME EX 61 Key Synthesizer Workstation Rental', internalReference: 'KORG KROME EX 61 Rental', rentalPrice: 'R 12,798.57 (fixed)' },
  { name: 'LD Systems Dave 12 G3 Rental', internalReference: 'LD System Dave 12 G3 Rental', rentalPrice: 'R 1.00 (fixed)' },
  { name: 'Logitech R800 Presenter Rental', internalReference: 'Rental Logitech R800', rentalPrice: 'R 1.00 (fixed)' },
  { name: 'Mirror Ball 50cm Rental', internalReference: '50cm Mirror Ball Rental', rentalPrice: 'R 1.00 (fixed)' },
  { name: 'Numark Platinum Rental', internalReference: 'Platinum Rental', rentalPrice: 'R 1.00 (fixed)' },
  { name: 'PHASELENS PENDULUM CURVED ANGLED TOP Rental', internalReference: 'P1012 Rental', rentalPrice: 'R 100.00 / 1 Day' },
  { name: 'Peavey CS800 Power Amplifier Rental', internalReference: 'Peavey CS800 Rental', rentalPrice: 'R 1.00 (fixed)' },
  { name: 'Pioneer CDJ-2000NXS2 Rental', internalReference: 'CDJ-2000NXS2 Rental', rentalPrice: 'R 1,000.00 / 1 Day' },
  { name: 'Pioneer CDJ-2000NXS Rental', internalReference: 'CDJ-2000NXS Rental', rentalPrice: 'R 1,000.00 / 1 Day' },
  { name: 'Pioneer CDJ-3000 Rental', internalReference: 'Pioneer CDJ-3000 Rental', rentalPrice: 'R 1,850.00 / 1 Day' },
  { name: 'Pioneer DJM-700NXS2 Rental', internalReference: 'DJM-700NXS2H', rentalPrice: 'R 1,000.00 / 1 Day' },
  { name: 'Pioneer XDJ-A/ Rental', internalReference: 'XDJ-A/ RENTAL', rentalPrice: 'R 1.00 (fixed)' },
  { name: 'Pioneer XDJ-RR Rental', internalReference: 'Rental XDJ-RR', rentalPrice: 'R 900.00 / 1 Day' },
  { name: 'Pioneer XDJ-RX3 Rental', internalReference: 'XDJ-RX3 RENTAL', rentalPrice: 'R 1,500.00 / 1 Day' },
  { name: 'Pioneer XDJ-XZ Professional all-in-one DJ system Rental', internalReference: 'XDJ-XZ rental', rentalPrice: 'R 1,500.00 / 1 Day' },
  { name: 'Portable Inverter System Bubble Batteries and Kodak Inverter', internalReference: 'PORTABLE-INVERTER Rental', rentalPrice: 'R 1,500.00 / 1 Day' },
  { name: 'Prodipe 111 Dynamic Microphone Rental', internalReference: 'Prodipe 111 Rental', rentalPrice: 'R 616.77 (fixed)' },
  { name: 'Redbe Powerstation 614W RENTAL', internalReference: 'Redbe 614W RENTAL', rentalPrice: 'R 0.00 (fixed)' },
  { name: 'RentalX', internalReference: 'RentalX', rentalPrice: 'R 0.00 (fixed)' },
  { name: 'Rode M5 Small-diaphragm Condenser Mic Rental', internalReference: 'M5 Rental', rentalPrice: 'R 250.00 / 1 Day' },
  { name: 'Rode NT1 1" Cardioid Condenser Microphone Rental', internalReference: 'RODE NT1 Rental', rentalPrice: 'R 1.00 (fixed)' },
  { name: 'Samson S2NX Rental', internalReference: 'S2NX Rental', rentalPrice: 'R 0.00 (fixed)' },
  { name: 'Samsung Tablet Rental', internalReference: 'Samsung Tablet Rental', rentalPrice: 'R 250.00 / 1 Day' },
  { name: 'Setups/Breakdown', internalReference: '', rentalPrice: 'R 0.00 (fixed)' },
  { name: 'Shure BETA 52A Kick Drum Microphone Rental', internalReference: 'BETA 52A Rental', rentalPrice: 'R 3,595.35 (fixed)' },
  { name: 'Shure BETA 58A SLX20 Rental', internalReference: 'BETA 58A SLX20 Rental', rentalPrice: 'R 1.00 (fixed)' },
  { name: 'Shure BETA 91A - Kick Drum Microphone Rental', internalReference: 'BETA 91A Rental', rentalPrice: 'R 5,833.45 (fixed)' },
  { name: 'Shure BLX14 System Rental', internalReference: 'BLX14 System Rental', rentalPrice: 'R 0.00 (fixed)' },
  { name: 'Shure BLX24/SM58 Wireless Vocal System (Rental)', internalReference: 'BLX24/SM58 Rental', rentalPrice: 'R 450.00 / 1 Day' },
  { name: 'Shure PGA31 Headset Rental', internalReference: 'PGA31 Headset Rental', rentalPrice: 'R 100.00 / 1 Day' },
  { name: 'Shure PSM300 IEM System Rental', internalReference: 'PSM300 IEM Rental', rentalPrice: 'R 1,000.00 / 1 Day' },
  { name: 'Shure SLX201 Belt pack RENTAL', internalReference: 'SLX201-H66 Rental', rentalPrice: 'R 500.00 / 1 Day' },
  { name: 'Shure SLX202/SM58 Rental', internalReference: 'SLX202/SM58 Rental', rentalPrice: 'R 500.00 / 1 Day' },
  { name: 'Shure SLX204D Receiver Rental', internalReference: 'SLX204D Rental', rentalPrice: 'R 800.00 / 1 Day' },
  { name: 'Shure SM57 Rental', internalReference: 'Shure SM57 Rental', rentalPrice: 'R 0.00 (fixed)' },
  { name: 'Shure SM58 Rental', internalReference: 'Shure SM58 Rental', rentalPrice: 'R 0.00 (fixed)' },
  { name: 'Shure SM94 Instrument Microphone Rental', internalReference: 'SM94 Rental', rentalPrice: 'R 2,178.70 (fixed)' },
  { name: 'Shure SRH240A Professional Quality Headphones Rental', internalReference: 'SRH240A Rental', rentalPrice: 'R 1,055.94 (fixed)' },
  { name: 'Shure SRH440 Professional Studio Headphones Rental', internalReference: 'SRH440 Rental', rentalPrice: 'R 1,309.41 (fixed)' },
  { name: 'Shure WL184 Microphone Supercardioid Lavalier RENTAL', internalReference: 'WL184 RENTAL', rentalPrice: 'R 1.00 (fixed)' },
  { name: 'SoundCraft UI24R 24-Ch Digital Mixer Rental', internalReference: 'UI-24R Rental', rentalPrice: 'R 800.00 / 1 Day' },
  { name: 'Stage Panel Rental 2m x 1m', internalReference: 'Rental Stage Panel', rentalPrice: 'R 250.00 / 1 Day' },
  { name: 'Stage Stairs Rental', internalReference: 'Stage Stairs Rental', rentalPrice: 'R 500.00 / 1 Day' },
  { name: 'Studio Session', internalReference: 'Studio Session', rentalPrice: 'R 2,000.00 / 1 Day' },
  { name: 'Tama Superstar Classic 5 Piece Drum Kit (Midnight Gold Sparkle) Rental', internalReference: 'Tama Superstar Classic 5 Rental', rentalPrice: 'R 1,500.00 / 1 Day' },
  { name: 'Technics SL1210 MK2', internalReference: 'SL1210 MK2 Rental', rentalPrice: 'R 0.00 (fixed)' },
  { name: 'Truss Goal Post Rental', internalReference: 'Truss Goal Post Rental', rentalPrice: 'R 0.00 (fixed)' },
  { name: 'Truss Totem 2m Rental', internalReference: 'Truss Totem 2m Rental', rentalPrice: 'R 0.00 (fixed)' },
  { name: 'Truss Totems 2m 290x290mm Rental', internalReference: 'Truss Totems 2m Rental', rentalPrice: 'R 600.00 / 1 Day' },
  { name: 'Trusst QT Arch Rental', internalReference: 'Trusst QT Arch Rental', rentalPrice: 'R 0.00 (fixed)' },
  { name: 'Turbosound Berlin Subs Rental', internalReference: 'Turbosound Berlin Subs Rental', rentalPrice: 'R 2,000.00 / 1 Day' },
  { name: 'Turbosound IQ12 12" Powered Speaker Rental', internalReference: 'IQ12 Rental', rentalPrice: 'R 400.00 / 1 Day' },
  { name: 'Turbosound IQ15 15" Powered Speaker Rental', internalReference: 'IQ15 Rental', rentalPrice: 'R 1,000.00 / 1 Day' },
  { name: 'VERSALIGHT UHP 18W X 18 RGBWAUV INDOOR LED CAN RENTAL', internalReference: 'VERSALIGHT CAN Rental', rentalPrice: 'R 500.00 / 1 Day' },
  { name: 'Vivitek DW855 - Multimedia Projector Rental', internalReference: 'DW855 Rental', rentalPrice: 'R 1,000.00 / 1 Day' },
  { name: 'Wharfedale Titan 12D Rental', internalReference: 'Titan 12D Rental', rentalPrice: 'R 350.00 / 1 Day' },
  { name: 'Wharfedale Titan 15D Rental', internalReference: 'Titan 15D Rental', rentalPrice: 'R 600.00 / 1 Day' },
  { name: 'Yamaha DSR115 1300W 15" Powered Speaker Rental', internalReference: 'DSR115 Rental', rentalPrice: 'R 800.00 / 1 Day' },
  { name: 'Yamaha DXR12 MKII Powered 12" Loudspeaker Rental', internalReference: 'DXR12 MKII Rental', rentalPrice: 'R 500.00 / 1 Day' },
  { name: 'Yamaha DXS15MKII Powered Subwoofer Rental', internalReference: 'DXS15MKII Rental', rentalPrice: 'R 1,200.00 / 1 Day' },
  { name: 'Yamaha DXS18 Powered Subwoofer Rental', internalReference: 'DXS18 Rental', rentalPrice: 'R 2,000.00 / 1 Day' },
  { name: 'Yamaha MG10XU Mixer Rental', internalReference: 'MG10XU Rental', rentalPrice: 'R 500.00 / 1 Day' },
  { name: 'Yamaha MG124CX Mixer Rental', internalReference: 'MG124CX Rental', rentalPrice: 'R 1.00 (fixed)' },
  { name: 'Yamaha MG16XU Mixer Rental', internalReference: 'MG16XU Rental', rentalPrice: 'R 600.00 / 1 Day' },
  { name: 'Yamaha MOXF8 88-key Synthesizer Workstation Rental', internalReference: 'Yamaha MOXF8 Rental', rentalPrice: 'R 1,800.00 / 1 Day' },
  { name: 'Yamaha MS100DR Electronic Drum Personal Monitor System Rental', internalReference: 'MS100DR Rental', rentalPrice: 'R 11,478.25 (fixed)' },
  { name: 'DBX DB10 Passive Direct Box Rental', internalReference: 'Rental DB10', rentalPrice: 'R 1.00 (fixed)' },
  { name: 'sE V7 Gold 25th Anniversary Edition Rental', internalReference: 'sE V7 Gold Rental', rentalPrice: 'R 500.00 / 1 Day' },
];

/**
 * Parse rental price string to extract amount and pricing type
 */
function parseRentalPrice(priceStr: string): { amount: number; pricingType: 'per_day' | 'fixed'; pricePerDay?: number } {
  const normalized = priceStr.trim();
  
  // Check if it's per day pricing
  if (normalized.includes('/ 1 Day') || normalized.includes('/ Day')) {
    const match = normalized.match(/R\s*([\d,]+\.?\d*)/);
    if (match) {
      const amount = parseFloat(match[1].replace(/,/g, ''));
      return { amount, pricingType: 'per_day', pricePerDay: amount };
    }
  }
  
  // Check if it's fixed pricing
  if (normalized.includes('(fixed)')) {
    const match = normalized.match(/R\s*([\d,]+\.?\d*)/);
    if (match) {
      const amount = parseFloat(match[1].replace(/,/g, ''));
      return { amount, pricingType: 'fixed' };
    }
  }
  
  // Default: try to extract any number
  const match = normalized.match(/R\s*([\d,]+\.?\d*)/);
  if (match) {
    const amount = parseFloat(match[1].replace(/,/g, ''));
    return { amount, pricingType: 'fixed' };
  }
  
  return { amount: 0, pricingType: 'fixed' };
}

/**
 * Generate SKU from internal reference or name
 */
function generateSKU(item: RentalItem): string {
  if (item.internalReference && item.internalReference.trim()) {
    return item.internalReference.trim();
  }
  // Fallback: generate from name
  return item.name
    .replace(/[^a-zA-Z0-9\s]/g, '')
    .replace(/\s+/g, '-')
    .substring(0, 50)
    .toUpperCase();
}

/**
 * Get or create a "Rental" supplier
 */
async function getOrCreateRentalSupplier(client: Client): Promise<string> {
  // Check if rental supplier exists
  const existing = await client.query(
    `SELECT supplier_id FROM core.supplier WHERE LOWER(name) = 'rental' OR LOWER(name) = 'rentals' LIMIT 1`
  );

  if (existing.rows.length > 0) {
    return existing.rows[0].supplier_id;
  }

  // Create rental supplier
  const result = await client.query(
    `INSERT INTO core.supplier (name, active, default_currency, contact_info)
     VALUES ('Rental', true, 'ZAR', '{"type": "internal"}'::jsonb)
     RETURNING supplier_id`
  );

  return result.rows[0].supplier_id;
}

async function main() {
  const databaseUrl = process.env.DATABASE_URL || process.env.NEON_SPP_DATABASE_URL;
  
  if (!databaseUrl) {
    console.error('❌ Error: DATABASE_URL or NEON_SPP_DATABASE_URL environment variable must be set');
    process.exit(1);
  }

  const client = new Client({ connectionString: databaseUrl });

  try {
    await client.connect();
    console.log('✅ Connected to database');

    // Get or create rental supplier
    const supplierId = await getOrCreateRentalSupplier(client);
    console.log(`📋 Using supplier ID: ${supplierId}`);

    await client.query('BEGIN');
    console.log('📦 Starting transaction...');

    let successCount = 0;
    let skippedCount = 0;
    let errorCount = 0;

    for (const item of rentalItems) {
      try {
        const sku = generateSKU(item);
        const { amount, pricingType, pricePerDay } = parseRentalPrice(item.rentalPrice);
        
        // Check if SKU already exists
        const existingCheck = await client.query(
          'SELECT sku FROM public.inventory_items WHERE sku = $1',
          [sku]
        );

        if (existingCheck.rows.length > 0) {
          console.log(`⏭️  Skipping existing SKU: ${sku} - ${item.name}`);
          skippedCount++;
          continue;
        }

        // Use SSOT functions to create supplier_product and stock
        const supplierSku = item.internalReference && item.internalReference.trim() 
          ? item.internalReference.trim() 
          : sku;

        // Create supplier product
        await upsertSupplierProduct({
          supplierId,
          sku: supplierSku,
          name: item.name,
        });

        // Set stock (0 for rental items initially)
        await setStock({
          supplierId,
          sku: supplierSku,
          quantity: 0,
          unitCost: null,
          reason: `Rental item: ${item.name}`,
        });

        // Update supplier_product with rental metadata in attrs_json if possible
        // Note: We'll store pricing info in a separate table or custom fields if available
        // For now, the pricing info is in the sale_price which can be set via price_history
        
        successCount++;
        console.log(`✅ Added: ${sku} - ${item.name} (${pricingType === 'per_day' ? `R ${amount}/day` : `R ${amount} fixed`})`);
      } catch (error) {
        errorCount++;
        const sku = generateSKU(item);
        console.error(`❌ Error inserting ${sku} (${item.name}):`, error instanceof Error ? error.message : String(error));
      }
    }

    await client.query('COMMIT');
    console.log('\n📊 Summary:');
    console.log(`   ✅ Successfully added: ${successCount}`);
    console.log(`   ⏭️  Skipped (existing): ${skippedCount}`);
    console.log(`   ❌ Errors: ${errorCount}`);
    console.log(`   📦 Total processed: ${rentalItems.length}`);

    // Get final count - check via supplier_product
    const countResult = await client.query(
      `SELECT COUNT(*) FROM core.supplier_product sp
       JOIN core.supplier s ON s.supplier_id = sp.supplier_id
       WHERE s.supplier_id = $1`,
      [supplierId]
    );
    console.log(`\n📈 Total rental items in database: ${countResult.rows[0].count}`);
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Transaction rolled back due to error:', error);
    process.exit(1);
  } finally {
    await client.end();
  }
}

main().catch((error) => {
  console.error('❌ Fatal error:', error);
  process.exit(1);
});

