#!/usr/bin/env bun

/**
 * Seed ALL 143 Rental Equipment Items
 * Imports the complete list from add-rental-stock.ts into rentals.equipment table
 */

import { neon } from '@neondatabase/serverless';

const sql = neon(process.env.DATABASE_URL!);

// Full list of 143 rental items with pricing
const rentalItems = [
  { name: 'AKG WMS40mini dual Handheld Rental', sku: 'AKG-WMS40MINI-RENTAL', equipment_type: 'microphone', brand: 'AKG', model: 'WMS40mini', rental_rate_daily: 0, security_deposit: 2000, replacement_value: 5000 },
  { name: 'ANTARI M7-RGBA Jet Fog Machine Rental', sku: 'ANTARI-M7-RGBA-RENTAL', equipment_type: 'lighting', brand: 'Antari', model: 'M7-RGBA', rental_rate_daily: 800, security_deposit: 3000, replacement_value: 8000 },
  { name: 'Allen & Heath Qu32 + Case Rental', sku: 'ALLEN-HEATH-QU32-RENTAL', equipment_type: 'mixing_console', brand: 'Allen & Heath', model: 'Qu32', rental_rate_daily: 1500, security_deposit: 15000, replacement_value: 40000 },
  { name: 'Allen & heath ZEDi10FX', sku: 'ALLEN-HEATH-ZEDI10FX-RENTAL', equipment_type: 'mixing_console', brand: 'Allen & Heath', model: 'ZEDi10FX', rental_rate_daily: 350, security_deposit: 2000, replacement_value: 5000 },
  { name: 'Antari HZ350 Hazer Rental', sku: 'ANTARI-HZ350-RENTAL', equipment_type: 'lighting', brand: 'Antari', model: 'HZ350', rental_rate_daily: 900, security_deposit: 4000, replacement_value: 10000 },
  { name: 'Antari Z1000 Rental', sku: 'ANTARI-Z1000-RENTAL', equipment_type: 'lighting', brand: 'Antari', model: 'Z1000', rental_rate_daily: 0, security_deposit: 3000, replacement_value: 8000 },
  { name: 'Ashdown Mag 300 + 2x MAG 210T Deep Rental', sku: 'ASHDOWN-MAG300-RENTAL', equipment_type: 'amplifier', brand: 'Ashdown', model: 'Mag 300 + 2x MAG 210T', rental_rate_daily: 1500, security_deposit: 8000, replacement_value: 20000 },
  { name: 'Audio-Technica AT2020V Limited Edition VISION Rental', sku: 'AUDIOTECHNICA-AT2020V-RENTAL', equipment_type: 'microphone', brand: 'Audio-Technica', model: 'AT2020V', rental_rate_daily: 2503.31, security_deposit: 5000, replacement_value: 12000 },
  { name: 'Audio-Technica ATM350 Rental', sku: 'AUDIOTECHNICA-ATM350-RENTAL', equipment_type: 'microphone', brand: 'Audio-Technica', model: 'ATM350', rental_rate_daily: 400, security_deposit: 2000, replacement_value: 5000 },
  { name: 'Audiocenter KLA218DSP Rental', sku: 'AUDIOCENTER-KLA218DSP-RENTAL', equipment_type: 'speaker', brand: 'Audiocenter', model: 'KLA218DSP', rental_rate_daily: 2000, security_deposit: 15000, replacement_value: 40000 },
  { name: 'Audiocenter MA118 Rental Sub', sku: 'AUDIOCENTER-MA118-RENTAL', equipment_type: 'speaker', brand: 'Audiocenter', model: 'MA118', rental_rate_daily: 800, security_deposit: 6000, replacement_value: 15000 },
  { name: 'Audiocenter XLA102-DSP Line Array Rental', sku: 'AUDIOCENTER-XLA102-DSP-RENTAL', equipment_type: 'speaker', brand: 'Audiocenter', model: 'XLA102-DSP', rental_rate_daily: 1500, security_deposit: 12000, replacement_value: 30000 },
  { name: 'Avolites T1 Dongle USB DMX Interface', sku: 'AVOLITES-T1-RENTAL', equipment_type: 'lighting', brand: 'Avolites', model: 'T1 Dongle', rental_rate_daily: 5158.80, security_deposit: 8000, replacement_value: 20000 },
  { name: 'BEAMZ PRO BTK200C FRESNEL 200W LED CW/WW Rental', sku: 'BEAMZ-BTK200C-RENTAL', equipment_type: 'lighting', brand: 'Beamz', model: 'BTK200C', rental_rate_daily: 0, security_deposit: 3000, replacement_value: 8000 },
  { name: 'BEAMZ PRO IGNITE300A LED MOVING HEAD Rental', sku: 'BEAMZ-IGNITE300A-RENTAL', equipment_type: 'lighting', brand: 'Beamz', model: 'IGNITE300A', rental_rate_daily: 1500, security_deposit: 8000, replacement_value: 20000 },
  { name: 'BK Boom Table Top Microphone Stand - Black Finish', sku: 'BK-BOOM-STAND-RENTAL', equipment_type: 'stand', brand: 'BK', model: 'Boom Table Top', rental_rate_daily: 100, security_deposit: 500, replacement_value: 1200 },
  { name: 'Beamz Fuse 75W Wash 75W LED Moving Head', sku: 'BEAMZ-FUSE75W-RENTAL', equipment_type: 'lighting', brand: 'Beamz', model: 'Fuse 75W', rental_rate_daily: 400, security_deposit: 2000, replacement_value: 5000 },
  { name: 'Beamz B2500 Bubble Machine Rental', sku: 'BEAMZ-B2500-RENTAL', equipment_type: 'lighting', brand: 'Beamz', model: 'B2500', rental_rate_daily: 500, security_deposit: 2000, replacement_value: 5000 },
  { name: 'Beamz Ignite 60 Spot Rental', sku: 'BEAMZ-IGNITE60-RENTAL', equipment_type: 'lighting', brand: 'Beamz', model: 'Ignite 60', rental_rate_daily: 450, security_deposit: 2000, replacement_value: 5000 },
  { name: 'Beamz LCB-155 LED BAR 12x12W Rental', sku: 'BEAMZ-LCB155-RENTAL', equipment_type: 'lighting', brand: 'Beamz', model: 'LCB-155', rental_rate_daily: 0, security_deposit: 2000, replacement_value: 5000 },
  { name: 'Beamz LED MULTI ACIS IV RGBWAUV Rental', sku: 'BEAMZ-MULTIACIS-RENTAL', equipment_type: 'lighting', brand: 'Beamz', model: 'MULTI ACIS IV', rental_rate_daily: 450, security_deposit: 2000, replacement_value: 5000 },
  { name: 'Beamz Radical II FX Light Rental', sku: 'BEAMZ-RADICAL2-RENTAL', equipment_type: 'lighting', brand: 'Beamz', model: 'Radical II FX', rental_rate_daily: 350, security_deposit: 1500, replacement_value: 4000 },
  { name: 'Behringer EP1500 2 x 700 Watt Power Amplifier Rental', sku: 'BEHRINGER-EP1500-RENTAL', equipment_type: 'amplifier', brand: 'Behringer', model: 'EP1500', rental_rate_daily: 0, security_deposit: 3000, replacement_value: 8000 },
  { name: 'Behringer EP2500 rental', sku: 'BEHRINGER-EP2500-RENTAL', equipment_type: 'amplifier', brand: 'Behringer', model: 'EP2500', rental_rate_daily: 1, security_deposit: 3000, replacement_value: 8000 },
  { name: 'Boss Katana 100 MKII Rental', sku: 'BOSS-KATANA100-RENTAL', equipment_type: 'amplifier', brand: 'Boss', model: 'Katana 100 MKII', rental_rate_daily: 1000, security_deposit: 5000, replacement_value: 12000 },
  { name: 'Bubble Machine Rental', sku: 'BUBBLE-MACHINE-RENTAL', equipment_type: 'lighting', brand: 'Generic', model: 'Bubble Machine', rental_rate_daily: 0, security_deposit: 1000, replacement_value: 2500 },
  { name: 'Celto Custom Sub', sku: 'CELTO-CUSTOM-SUB-RENTAL', equipment_type: 'speaker', brand: 'Celto', model: 'Custom Sub', rental_rate_daily: 600, security_deposit: 5000, replacement_value: 12000 },
  { name: 'Celto VT15 2-way full range, 1000W, 8 ohms, 15" LF + 1.5" exit Hi', sku: 'CELTO-VT15-RENTAL', equipment_type: 'speaker', brand: 'Celto', model: 'VT15', rental_rate_daily: 800, security_deposit: 6000, replacement_value: 15000 },
  { name: 'Chauvet Follow Spot Rental', sku: 'CHAUVET-FOLLOWSPOT-RENTAL', equipment_type: 'lighting', brand: 'Chauvet', model: 'Follow Spot', rental_rate_daily: 800, security_deposit: 5000, replacement_value: 12000 },
  { name: 'Chauvet GigBAR 2 4-in-1 lighting System Rental', sku: 'CHAUVET-GIGBAR2-RENTAL', equipment_type: 'lighting', brand: 'Chauvet', model: 'GigBAR 2', rental_rate_daily: 1, security_deposit: 3000, replacement_value: 8000 },
  { name: 'Chauvet Intimidator 260X Rental', sku: 'CHAUVET-INTIMIDATOR260X-RENTAL', equipment_type: 'lighting', brand: 'Chauvet', model: 'Intimidator 260X', rental_rate_daily: 350, security_deposit: 2000, replacement_value: 5000 },
  { name: 'Chauvet SlimPAR T12 USB Rental', sku: 'CHAUVET-SLIMPART12-RENTAL', equipment_type: 'lighting', brand: 'Chauvet', model: 'SlimPAR T12 USB', rental_rate_daily: 250, security_deposit: 1500, replacement_value: 4000 },
  { name: 'Collection/Delivery', sku: 'COLLECTION-DELIVERY-RENTAL', equipment_type: 'service', brand: 'Service', model: 'Collection/Delivery', rental_rate_daily: 1, security_deposit: 0, replacement_value: 0 },
  { name: 'DBX DB10 Passive Direct Box', sku: 'DBX-DB10-RENTAL', equipment_type: 'audio_processor', brand: 'DBX', model: 'DB10', rental_rate_daily: 1, security_deposit: 500, replacement_value: 1200 },
  { name: 'DBX DB1 Active Direct Box Rental', sku: 'DBX-DB1-RENTAL', equipment_type: 'audio_processor', brand: 'DBX', model: 'DB1', rental_rate_daily: 0, security_deposit: 500, replacement_value: 1200 },
  { name: 'DJI Power V-3 SPARK MACHINE (RENTAL)', sku: 'DJI-V3-SPARK-RENTAL', equipment_type: 'lighting', brand: 'DJI Power', model: 'V-3 SPARK', rental_rate_daily: 2000, security_deposit: 10000, replacement_value: 25000 },
  { name: 'DJI Power X1 Dry Ice Machine Rental', sku: 'DJI-X1-DRYICE-RENTAL', equipment_type: 'lighting', brand: 'DJI Power', model: 'X1 Dry Ice', rental_rate_daily: 2000, security_deposit: 10000, replacement_value: 25000 },
  { name: 'DJ Service', sku: 'DJ-SERVICE-RENTAL', equipment_type: 'service', brand: 'Service', model: 'DJ Service', rental_rate_daily: 0, security_deposit: 0, replacement_value: 0 },
  { name: 'DJ Table Stage Rental 1m x 0.5m 1m Legs', sku: 'DJ-TABLE-STAGE-RENTAL', equipment_type: 'stand', brand: 'Generic', model: 'DJ Table Stage', rental_rate_daily: 400, security_deposit: 2000, replacement_value: 5000 },
  { name: 'Dell Laptop Rental', sku: 'DELL-LAPTOP-RENTAL', equipment_type: 'computer', brand: 'Dell', model: 'Laptop', rental_rate_daily: 500, security_deposit: 5000, replacement_value: 12000 },
  { name: 'Drone rental', sku: 'DRONE-RENTAL', equipment_type: 'camera', brand: 'Generic', model: 'Drone', rental_rate_daily: 1, security_deposit: 5000, replacement_value: 15000 },
  { name: 'EWI Snake 16in 4 return Rental', sku: 'EWI-SNAKE-16IN-RENTAL', equipment_type: 'cable', brand: 'EWI', model: 'Snake 16in 4 return', rental_rate_daily: 0, security_deposit: 2000, replacement_value: 5000 },
  { name: 'Fairy Morning Setup', sku: 'FAIRY-MORNING-SETUP-RENTAL', equipment_type: 'service', brand: 'Service', model: 'Fairy Morning Setup', rental_rate_daily: 2, security_deposit: 0, replacement_value: 0 },
  { name: 'Focusrite ISA One Desktop Microphone Preamp', sku: 'FOCUSRITE-ISAONE-RENTAL', equipment_type: 'audio_processor', brand: 'Focusrite', model: 'ISA One', rental_rate_daily: 12996.75, security_deposit: 15000, replacement_value: 35000 },
  { name: 'Follow Spot Rental Lamp based', sku: 'FOLLOWSPOT-LAMP-RENTAL', equipment_type: 'lighting', brand: 'Generic', model: 'Follow Spot Lamp', rental_rate_daily: 0, security_deposit: 5000, replacement_value: 12000 },
  { name: 'Funky DJ table Rental', sku: 'FUNKY-DJ-TABLE-RENTAL', equipment_type: 'stand', brand: 'Funky', model: 'DJ Table', rental_rate_daily: 600, security_deposit: 3000, replacement_value: 8000 },
  { name: 'Fuse 610Z 75W RGBW Moving Head RENTAL', sku: 'FUSE-610Z-RENTAL', equipment_type: 'lighting', brand: 'Fuse', model: '610Z', rental_rate_daily: 0, security_deposit: 3000, replacement_value: 8000 },
  { name: 'Gantry Truss System Rental', sku: 'GANTRY-TRUSS-RENTAL', equipment_type: 'rigging', brand: 'Generic', model: 'Gantry Truss System', rental_rate_daily: 8000, security_deposit: 50000, replacement_value: 120000 },
  { name: 'GrandView PT-1100-CHARMING 4:3 Tripod Portable Series Screen 100"', sku: 'GRANDVIEW-PT1100-RENTAL', equipment_type: 'display', brand: 'GrandView', model: 'PT-1100', rental_rate_daily: 0, security_deposit: 5000, replacement_value: 12000 },
  { name: 'GrandView Super Mobile Fastfold 16x9 Screen Rental', sku: 'GRANDVIEW-FASTFOLD-RENTAL', equipment_type: 'display', brand: 'GrandView', model: 'Fastfold 16x9', rental_rate_daily: 1250, security_deposit: 8000, replacement_value: 20000 },
  { name: 'Hisense 65" UHD SMART LED TV Rental', sku: 'HISENSE-65H8K-RENTAL', equipment_type: 'display', brand: 'Hisense', model: '65" UHD SMART', rental_rate_daily: 1000, security_deposit: 15000, replacement_value: 40000 },
  { name: 'Hercules Speaker Stand Rental', sku: 'HERCULES-SPK-STAND-RENTAL', equipment_type: 'stand', brand: 'Hercules', model: 'Speaker Stand', rental_rate_daily: 250, security_deposit: 1000, replacement_value: 2500 },
  { name: 'Hercules double Keyboard stand Rental', sku: 'HERCULES-KEY-STAND-RENTAL', equipment_type: 'stand', brand: 'Hercules', model: 'Double Keyboard Stand', rental_rate_daily: 400, security_deposit: 2000, replacement_value: 5000 },
  { name: 'Hisense 40" LED TV Comfort Monitor Rental', sku: 'HISENSE-40-RENTAL', equipment_type: 'display', brand: 'Hisense', model: '40" LED TV', rental_rate_daily: 600, security_deposit: 8000, replacement_value: 20000 },
  { name: 'Hybrid B8000 Amplifier Rental', sku: 'HYBRID-B8000-RENTAL', equipment_type: 'amplifier', brand: 'Hybrid', model: 'B8000', rental_rate_daily: 1000, security_deposit: 8000, replacement_value: 20000 },
  { name: 'Hybrid Dual Wireless Mic System Rental', sku: 'HYBRID-DUAL-WIRELESS-RENTAL', equipment_type: 'microphone', brand: 'Hybrid', model: 'Dual Wireless', rental_rate_daily: 0, security_deposit: 3000, replacement_value: 8000 },
  { name: 'Hybrid HZ30000 Rental', sku: 'HYBRID-HZ30000-RENTAL', equipment_type: 'lighting', brand: 'Hybrid', model: 'HZ30000', rental_rate_daily: 600, security_deposit: 4000, replacement_value: 10000 },
  { name: 'Hybrid HSS 12.4 Rental', sku: 'HYBRID-HSS124-RENTAL', equipment_type: 'speaker', brand: 'Hybrid', model: 'HSS 12.4', rental_rate_daily: 300, security_deposit: 2000, replacement_value: 5000 },
  { name: 'Hybrid HSS 12.6 Rental', sku: 'HYBRID-HSS126-RENTAL', equipment_type: 'speaker', brand: 'Hybrid', model: 'HSS 12.6', rental_rate_daily: 350, security_deposit: 2500, replacement_value: 6000 },
  { name: 'Hybrid HSS-CD1000 Rental', sku: 'HYBRID-HSS-CD1000-RENTAL', equipment_type: 'speaker', brand: 'Hybrid', model: 'HSS-CD1000', rental_rate_daily: 0, security_deposit: 3000, replacement_value: 8000 },
  { name: 'Hybrid HU 15 Rental', sku: 'HYBRID-HU15-RENTAL', equipment_type: 'speaker', brand: 'Hybrid', model: 'HU 15', rental_rate_daily: 0, security_deposit: 4000, replacement_value: 10000 },
  { name: 'Hybrid H15000 Hazer Rental', sku: 'HYBRID-H15000-RENTAL', equipment_type: 'lighting', brand: 'Hybrid', model: 'H15000 Hazer', rental_rate_daily: 350, security_deposit: 3000, replacement_value: 8000 },
  { name: 'Hybrid L2-2000RGBH/1 Laser, Beam & Animated Graphics Rental', sku: 'HYBRID-L2-2000-RENTAL', equipment_type: 'lighting', brand: 'Hybrid', model: 'L2-2000RGBH/1', rental_rate_daily: 0, security_deposit: 15000, replacement_value: 40000 },
  { name: 'Hybrid P815N Rental', sku: 'HYBRID-P815N-RENTAL', equipment_type: 'speaker', brand: 'Hybrid', model: 'P815N', rental_rate_daily: 0, security_deposit: 3000, replacement_value: 8000 },
  { name: 'Hybrid P815N Rental Passive Speaker', sku: 'HYBRID-P815N-PASSIVE-RENTAL', equipment_type: 'speaker', brand: 'Hybrid', model: 'P815N Passive', rental_rate_daily: 200, security_deposit: 2000, replacement_value: 5000 },
  { name: 'Hybrid Portable DJ Screen Rental', sku: 'HYBRID-DJ-SCREEN-RENTAL', equipment_type: 'display', brand: 'Hybrid', model: 'Portable DJ Screen', rental_rate_daily: 300, security_deposit: 2000, replacement_value: 5000 },
  { name: 'Hybrid Spider Light Rental', sku: 'HYBRID-SPIDER-LIGHT-RENTAL', equipment_type: 'lighting', brand: 'Hybrid', model: 'Spider Light', rental_rate_daily: 500, security_deposit: 3000, replacement_value: 8000 },
  { name: 'Hybrid U1-104 System with 4x Racks + 1 Headsets Rental', sku: 'HYBRID-U1-104-RENTAL', equipment_type: 'microphone', brand: 'Hybrid', model: 'U1-104 System', rental_rate_daily: 0, security_deposit: 10000, replacement_value: 25000 },
  { name: 'Hybrid U1-10N/1S Rental', sku: 'HYBRID-U1-10N-RENTAL', equipment_type: 'microphone', brand: 'Hybrid', model: 'U1-10N/1S', rental_rate_daily: 500, security_deposit: 3000, replacement_value: 8000 },
  { name: 'K&M Kick drum Mic Stand Rental', sku: 'KM-KICK-STAND-RENTAL', equipment_type: 'stand', brand: 'K&M', model: 'Kick Drum Stand', rental_rate_daily: 250, security_deposit: 1000, replacement_value: 2500 },
  { name: 'K&M Lighting Stand Rental', sku: 'KM-LIGHTING-STAND-RENTAL', equipment_type: 'stand', brand: 'K&M', model: 'Lighting Stand', rental_rate_daily: 100, security_deposit: 500, replacement_value: 1200 },
  { name: 'K&M Microphone Stand Rental', sku: 'KM-MIC-STAND-RENTAL', equipment_type: 'stand', brand: 'K&M', model: 'Microphone Stand', rental_rate_daily: 100, security_deposit: 500, replacement_value: 1200 },
  { name: 'K&M Omega 18810 Keyboard Stand Rental', sku: 'KM-OMEGA18810-RENTAL', equipment_type: 'stand', brand: 'K&M', model: 'Omega 18810', rental_rate_daily: 1, security_deposit: 1000, replacement_value: 2500 },
  { name: 'K&M Speaker Pole Rental', sku: 'KM-SPK-POLE-RENTAL', equipment_type: 'stand', brand: 'K&M', model: 'Speaker Pole', rental_rate_daily: 150, security_deposit: 800, replacement_value: 2000 },
  { name: 'KORG KROME EX 61 Key Synthesizer Workstation Rental', sku: 'KORG-KROME-EX61-RENTAL', equipment_type: 'keyboard', brand: 'KORG', model: 'KROME EX 61', rental_rate_daily: 12798.57, security_deposit: 20000, replacement_value: 50000 },
  { name: 'LD Systems Dave 12 G3 Rental', sku: 'LD-DAVE12G3-RENTAL', equipment_type: 'speaker', brand: 'LD Systems', model: 'Dave 12 G3', rental_rate_daily: 1, security_deposit: 3000, replacement_value: 8000 },
  { name: 'Logitech R800 Presenter Rental', sku: 'LOGITECH-R800-RENTAL', equipment_type: 'accessory', brand: 'Logitech', model: 'R800 Presenter', rental_rate_daily: 1, security_deposit: 500, replacement_value: 1200 },
  { name: 'Mirror Ball 50cm Rental', sku: 'MIRROR-BALL-50CM-RENTAL', equipment_type: 'lighting', brand: 'Generic', model: 'Mirror Ball 50cm', rental_rate_daily: 1, security_deposit: 1000, replacement_value: 2500 },
  { name: 'Numark Platinum Rental', sku: 'NUMARK-PLATINUM-RENTAL', equipment_type: 'dj_equipment', brand: 'Numark', model: 'Platinum', rental_rate_daily: 1, security_deposit: 2000, replacement_value: 5000 },
  { name: 'PHASELENS PENDULUM CURVED ANGLED TOP Rental', sku: 'PHASELENS-P1012-RENTAL', equipment_type: 'lighting', brand: 'Phaselens', model: 'PENDULUM P1012', rental_rate_daily: 100, security_deposit: 1000, replacement_value: 2500 },
  { name: 'Peavey CS800 Power Amplifier Rental', sku: 'PEAVEY-CS800-RENTAL', equipment_type: 'amplifier', brand: 'Peavey', model: 'CS800', rental_rate_daily: 1, security_deposit: 3000, replacement_value: 8000 },
  { name: 'Pioneer CDJ-2000NXS2 Rental', sku: 'PIONEER-CDJ2000NXS2-RENTAL', equipment_type: 'dj_equipment', brand: 'Pioneer', model: 'CDJ-2000NXS2', rental_rate_daily: 1000, security_deposit: 15000, replacement_value: 40000 },
  { name: 'Pioneer CDJ-2000NXS Rental', sku: 'PIONEER-CDJ2000NXS-RENTAL', equipment_type: 'dj_equipment', brand: 'Pioneer', model: 'CDJ-2000NXS', rental_rate_daily: 1000, security_deposit: 15000, replacement_value: 40000 },
  { name: 'Pioneer CDJ-3000 Rental', sku: 'PIONEER-CDJ3000-RENTAL', equipment_type: 'dj_equipment', brand: 'Pioneer', model: 'CDJ-3000', rental_rate_daily: 1850, security_deposit: 20000, replacement_value: 55000 },
  { name: 'Pioneer DJM-700NXS2 Rental', sku: 'PIONEER-DJM700NXS2-RENTAL', equipment_type: 'dj_equipment', brand: 'Pioneer', model: 'DJM-700NXS2', rental_rate_daily: 1000, security_deposit: 12000, replacement_value: 30000 },
  { name: 'Pioneer XDJ-A/ Rental', sku: 'PIONEER-XDJ-A-RENTAL', equipment_type: 'dj_equipment', brand: 'Pioneer', model: 'XDJ-A/', rental_rate_daily: 1, security_deposit: 8000, replacement_value: 20000 },
  { name: 'Pioneer XDJ-RR Rental', sku: 'PIONEER-XDJ-RR-RENTAL', equipment_type: 'dj_equipment', brand: 'Pioneer', model: 'XDJ-RR', rental_rate_daily: 900, security_deposit: 10000, replacement_value: 25000 },
  { name: 'Pioneer XDJ-RX3 Rental', sku: 'PIONEER-XDJ-RX3-RENTAL', equipment_type: 'dj_equipment', brand: 'Pioneer', model: 'XDJ-RX3', rental_rate_daily: 1500, security_deposit: 15000, replacement_value: 40000 },
  { name: 'Pioneer XDJ-XZ Professional all-in-one DJ system Rental', sku: 'PIONEER-XDJ-XZ-RENTAL', equipment_type: 'dj_equipment', brand: 'Pioneer', model: 'XDJ-XZ', rental_rate_daily: 1500, security_deposit: 20000, replacement_value: 55000 },
  { name: 'Portable Inverter System Bubble Batteries and Kodak Inverter', sku: 'PORTABLE-INVERTER-RENTAL', equipment_type: 'power', brand: 'Generic', model: 'Portable Inverter', rental_rate_daily: 1500, security_deposit: 8000, replacement_value: 20000 },
  { name: 'Prodipe 111 Dynamic Microphone Rental', sku: 'PRODIPE-111-RENTAL', equipment_type: 'microphone', brand: 'Prodipe', model: '111', rental_rate_daily: 616.77, security_deposit: 1500, replacement_value: 4000 },
  { name: 'Redbe Powerstation 614W RENTAL', sku: 'REDBE-614W-RENTAL', equipment_type: 'power', brand: 'Redbe', model: 'Powerstation 614W', rental_rate_daily: 0, security_deposit: 5000, replacement_value: 12000 },
  { name: 'RentalX', sku: 'RENTALX-RENTAL', equipment_type: 'service', brand: 'Service', model: 'RentalX', rental_rate_daily: 0, security_deposit: 0, replacement_value: 0 },
  { name: 'Rode M5 Small-diaphragm Condenser Mic Rental', sku: 'RODE-M5-RENTAL', equipment_type: 'microphone', brand: 'Rode', model: 'M5', rental_rate_daily: 250, security_deposit: 1500, replacement_value: 4000 },
  { name: 'Rode NT1 1" Cardioid Condenser Microphone Rental', sku: 'RODE-NT1-RENTAL', equipment_type: 'microphone', brand: 'Rode', model: 'NT1', rental_rate_daily: 1, security_deposit: 2000, replacement_value: 5000 },
  { name: 'Samson S2NX Rental', sku: 'SAMSON-S2NX-RENTAL', equipment_type: 'microphone', brand: 'Samson', model: 'S2NX', rental_rate_daily: 0, security_deposit: 2000, replacement_value: 5000 },
  { name: 'Samsung Tablet Rental', sku: 'SAMSUNG-TABLET-RENTAL', equipment_type: 'computer', brand: 'Samsung', model: 'Tablet', rental_rate_daily: 250, security_deposit: 3000, replacement_value: 8000 },
  { name: 'Setups/Breakdown', sku: 'SETUPS-BREAKDOWN-RENTAL', equipment_type: 'service', brand: 'Service', model: 'Setups/Breakdown', rental_rate_daily: 0, security_deposit: 0, replacement_value: 0 },
  { name: 'Shure BETA 52A Kick Drum Microphone Rental', sku: 'SHURE-BETA52A-RENTAL', equipment_type: 'microphone', brand: 'Shure', model: 'BETA 52A', rental_rate_daily: 3595.35, security_deposit: 5000, replacement_value: 12000 },
  { name: 'Shure BETA 58A SLX20 Rental', sku: 'SHURE-BETA58A-SLX20-RENTAL', equipment_type: 'microphone', brand: 'Shure', model: 'BETA 58A SLX20', rental_rate_daily: 1, security_deposit: 5000, replacement_value: 12000 },
  { name: 'Shure BETA 91A - Kick Drum Microphone Rental', sku: 'SHURE-BETA91A-RENTAL', equipment_type: 'microphone', brand: 'Shure', model: 'BETA 91A', rental_rate_daily: 5833.45, security_deposit: 8000, replacement_value: 20000 },
  { name: 'Shure BLX14 System Rental', sku: 'SHURE-BLX14-RENTAL', equipment_type: 'microphone', brand: 'Shure', model: 'BLX14 System', rental_rate_daily: 0, security_deposit: 5000, replacement_value: 12000 },
  { name: 'Shure BLX24/SM58 Wireless Vocal System (Rental)', sku: 'SHURE-BLX24-SM58-RENTAL', equipment_type: 'microphone', brand: 'Shure', model: 'BLX24/SM58', rental_rate_daily: 450, security_deposit: 4000, replacement_value: 10000 },
  { name: 'Shure PGA31 Headset Rental', sku: 'SHURE-PGA31-RENTAL', equipment_type: 'microphone', brand: 'Shure', model: 'PGA31 Headset', rental_rate_daily: 100, security_deposit: 1000, replacement_value: 2500 },
  { name: 'Shure PSM300 IEM System Rental', sku: 'SHURE-PSM300-RENTAL', equipment_type: 'microphone', brand: 'Shure', model: 'PSM300 IEM', rental_rate_daily: 1000, security_deposit: 10000, replacement_value: 25000 },
  { name: 'Shure SLX201 Belt pack RENTAL', sku: 'SHURE-SLX201-RENTAL', equipment_type: 'microphone', brand: 'Shure', model: 'SLX201', rental_rate_daily: 500, security_deposit: 3000, replacement_value: 8000 },
  { name: 'Shure SLX202/SM58 Rental', sku: 'SHURE-SLX202-SM58-RENTAL', equipment_type: 'microphone', brand: 'Shure', model: 'SLX202/SM58', rental_rate_daily: 500, security_deposit: 3000, replacement_value: 8000 },
  { name: 'Shure SLX204D Receiver Rental', sku: 'SHURE-SLX204D-RENTAL', equipment_type: 'microphone', brand: 'Shure', model: 'SLX204D', rental_rate_daily: 800, security_deposit: 5000, replacement_value: 12000 },
  { name: 'Shure SM57 Rental', sku: 'SHURE-SM57-RENTAL', equipment_type: 'microphone', brand: 'Shure', model: 'SM57', rental_rate_daily: 0, security_deposit: 1000, replacement_value: 2500 },
  { name: 'Shure SM58 Rental', sku: 'SHURE-SM58-RENTAL', equipment_type: 'microphone', brand: 'Shure', model: 'SM58', rental_rate_daily: 0, security_deposit: 1000, replacement_value: 2500 },
  { name: 'Shure SM94 Instrument Microphone Rental', sku: 'SHURE-SM94-RENTAL', equipment_type: 'microphone', brand: 'Shure', model: 'SM94', rental_rate_daily: 2178.70, security_deposit: 3000, replacement_value: 8000 },
  { name: 'Shure SRH240A Professional Quality Headphones Rental', sku: 'SHURE-SRH240A-RENTAL', equipment_type: 'headphones', brand: 'Shure', model: 'SRH240A', rental_rate_daily: 1055.94, security_deposit: 2000, replacement_value: 5000 },
  { name: 'Shure SRH440 Professional Studio Headphones Rental', sku: 'SHURE-SRH440-RENTAL', equipment_type: 'headphones', brand: 'Shure', model: 'SRH440', rental_rate_daily: 1309.41, security_deposit: 2500, replacement_value: 6000 },
  { name: 'Shure WL184 Microphone Supercardioid Lavalier RENTAL', sku: 'SHURE-WL184-RENTAL', equipment_type: 'microphone', brand: 'Shure', model: 'WL184', rental_rate_daily: 1, security_deposit: 2000, replacement_value: 5000 },
  { name: 'SoundCraft UI24R 24-Ch Digital Mixer Rental', sku: 'SOUNDCRAFT-UI24R-RENTAL', equipment_type: 'mixing_console', brand: 'SoundCraft', model: 'UI24R', rental_rate_daily: 800, security_deposit: 10000, replacement_value: 25000 },
  { name: 'Stage Panel Rental 2m x 1m', sku: 'STAGE-PANEL-RENTAL', equipment_type: 'rigging', brand: 'Generic', model: 'Stage Panel 2m x 1m', rental_rate_daily: 250, security_deposit: 2000, replacement_value: 5000 },
  { name: 'Stage Stairs Rental', sku: 'STAGE-STAIRS-RENTAL', equipment_type: 'rigging', brand: 'Generic', model: 'Stage Stairs', rental_rate_daily: 500, security_deposit: 3000, replacement_value: 8000 },
  { name: 'Studio Session', sku: 'STUDIO-SESSION-RENTAL', equipment_type: 'service', brand: 'Service', model: 'Studio Session', rental_rate_daily: 2000, security_deposit: 0, replacement_value: 0 },
  { name: 'Tama Superstar Classic 5 Piece Drum Kit (Midnight Gold Sparkle) Rental', sku: 'TAMA-SUPERSTAR-RENTAL', equipment_type: 'drum_kit', brand: 'Tama', model: 'Superstar Classic 5 Piece', rental_rate_daily: 1500, security_deposit: 15000, replacement_value: 40000 },
  { name: 'Technics SL1210 MK2', sku: 'TECHNICS-SL1210-RENTAL', equipment_type: 'dj_equipment', brand: 'Technics', model: 'SL1210 MK2', rental_rate_daily: 0, security_deposit: 8000, replacement_value: 20000 },
  { name: 'Truss Goal Post Rental', sku: 'TRUSS-GOALPOST-RENTAL', equipment_type: 'rigging', brand: 'Generic', model: 'Truss Goal Post', rental_rate_daily: 0, security_deposit: 10000, replacement_value: 25000 },
  { name: 'Truss Totem 2m Rental', sku: 'TRUSS-TOTEM-2M-RENTAL', equipment_type: 'rigging', brand: 'Generic', model: 'Truss Totem 2m', rental_rate_daily: 0, security_deposit: 5000, replacement_value: 12000 },
  { name: 'Truss Totems 2m 290x290mm Rental', sku: 'TRUSS-TOTEMS-290-RENTAL', equipment_type: 'rigging', brand: 'Generic', model: 'Truss Totems 2m 290x290mm', rental_rate_daily: 600, security_deposit: 5000, replacement_value: 12000 },
  { name: 'Trusst QT Arch Rental', sku: 'TRUSS-QT-ARCH-RENTAL', equipment_type: 'rigging', brand: 'Generic', model: 'Trusst QT Arch', rental_rate_daily: 0, security_deposit: 8000, replacement_value: 20000 },
  { name: 'Turbosound Berlin Subs Rental', sku: 'TURBOSOUND-BERLIN-RENTAL', equipment_type: 'speaker', brand: 'Turbosound', model: 'Berlin Subs', rental_rate_daily: 2000, security_deposit: 20000, replacement_value: 50000 },
  { name: 'Turbosound IQ12 12" Powered Speaker Rental', sku: 'TURBOSOUND-IQ12-RENTAL', equipment_type: 'speaker', brand: 'Turbosound', model: 'IQ12', rental_rate_daily: 400, security_deposit: 3000, replacement_value: 8000 },
  { name: 'Turbosound IQ15 15" Powered Speaker Rental', sku: 'TURBOSOUND-IQ15-RENTAL', equipment_type: 'speaker', brand: 'Turbosound', model: 'IQ15', rental_rate_daily: 1000, security_deposit: 6000, replacement_value: 15000 },
  { name: 'VERSALIGHT UHP 18W X 18 RGBWAUV INDOOR LED CAN RENTAL', sku: 'VERSALIGHT-CAN-RENTAL', equipment_type: 'lighting', brand: 'Versalight', model: 'UHP 18W X 18', rental_rate_daily: 500, security_deposit: 3000, replacement_value: 8000 },
  { name: 'Vivitek DW855 - Multimedia Projector Rental', sku: 'VIVITEK-DW855-RENTAL', equipment_type: 'projector', brand: 'Vivitek', model: 'DW855', rental_rate_daily: 1000, security_deposit: 12000, replacement_value: 30000 },
  { name: 'Wharfedale Titan 12D Rental', sku: 'WHARFEDALE-TITAN12D-RENTAL', equipment_type: 'speaker', brand: 'Wharfedale', model: 'Titan 12D', rental_rate_daily: 350, security_deposit: 2500, replacement_value: 6000 },
  { name: 'Wharfedale Titan 15D Rental', sku: 'WHARFEDALE-TITAN15D-RENTAL', equipment_type: 'speaker', brand: 'Wharfedale', model: 'Titan 15D', rental_rate_daily: 600, security_deposit: 4000, replacement_value: 10000 },
  { name: 'Yamaha DSR115 1300W 15" Powered Speaker Rental', sku: 'YAMAHA-DSR115-RENTAL', equipment_type: 'speaker', brand: 'Yamaha', model: 'DSR115', rental_rate_daily: 800, security_deposit: 6000, replacement_value: 15000 },
  { name: 'Yamaha DXR12 MKII Powered 12" Loudspeaker Rental', sku: 'YAMAHA-DXR12-RENTAL', equipment_type: 'speaker', brand: 'Yamaha', model: 'DXR12 MKII', rental_rate_daily: 500, security_deposit: 4000, replacement_value: 10000 },
  { name: 'Yamaha DXS15MKII Powered Subwoofer Rental', sku: 'YAMAHA-DXS15-RENTAL', equipment_type: 'speaker', brand: 'Yamaha', model: 'DXS15MKII', rental_rate_daily: 1200, security_deposit: 8000, replacement_value: 20000 },
  { name: 'Yamaha DXS18 Powered Subwoofer Rental', sku: 'YAMAHA-DXS18-RENTAL', equipment_type: 'speaker', brand: 'Yamaha', model: 'DXS18', rental_rate_daily: 2000, security_deposit: 12000, replacement_value: 30000 },
  { name: 'Yamaha MG10XU Mixer Rental', sku: 'YAMAHA-MG10XU-RENTAL', equipment_type: 'mixing_console', brand: 'Yamaha', model: 'MG10XU', rental_rate_daily: 500, security_deposit: 3000, replacement_value: 8000 },
  { name: 'Yamaha MG124CX Mixer Rental', sku: 'YAMAHA-MG124CX-RENTAL', equipment_type: 'mixing_console', brand: 'Yamaha', model: 'MG124CX', rental_rate_daily: 1, security_deposit: 4000, replacement_value: 10000 },
  { name: 'Yamaha MG16XU Mixer Rental', sku: 'YAMAHA-MG16XU-RENTAL', equipment_type: 'mixing_console', brand: 'Yamaha', model: 'MG16XU', rental_rate_daily: 600, security_deposit: 5000, replacement_value: 12000 },
  { name: 'Yamaha MOXF8 88-key Synthesizer Workstation Rental', sku: 'YAMAHA-MOXF8-RENTAL', equipment_type: 'keyboard', brand: 'Yamaha', model: 'MOXF8', rental_rate_daily: 1800, security_deposit: 15000, replacement_value: 40000 },
  { name: 'Yamaha MS100DR Electronic Drum Personal Monitor System Rental', sku: 'YAMAHA-MS100DR-RENTAL', equipment_type: 'monitor', brand: 'Yamaha', model: 'MS100DR', rental_rate_daily: 11478.25, security_deposit: 20000, replacement_value: 50000 },
  { name: 'DBX DB10 Passive Direct Box Rental', sku: 'DBX-DB10-PASSIVE-RENTAL', equipment_type: 'audio_processor', brand: 'DBX', model: 'DB10 Passive', rental_rate_daily: 1, security_deposit: 500, replacement_value: 1200 },
  { name: 'sE V7 Gold 25th Anniversary Edition Rental', sku: 'SE-V7-GOLD-RENTAL', equipment_type: 'microphone', brand: 'sE', model: 'V7 Gold', rental_rate_daily: 500, security_deposit: 3000, replacement_value: 8000 },
];

async function seedAllEquipment() {
  console.log(`Starting seed of ${rentalItems.length} equipment items...`);
  
  let successCount = 0;
  let errorCount = 0;
  
  for (const eq of rentalItems) {
    try {
      // Calculate weekly and monthly rates (5x daily for weekly, 20x daily for monthly)
      const weeklyRate = eq.rental_rate_daily > 0 ? eq.rental_rate_daily * 5 : 0;
      const monthlyRate = eq.rental_rate_daily > 0 ? eq.rental_rate_daily * 20 : 0;
      
      await sql`
        INSERT INTO rentals.equipment (
          sku, name, equipment_type, brand, model,
          rental_rate_daily, rental_rate_weekly, rental_rate_monthly,
          security_deposit, replacement_value,
          condition_status, availability_status, is_active
        )
        VALUES (
          ${eq.sku}, ${eq.name}, ${eq.equipment_type}, ${eq.brand}, ${eq.model},
          ${eq.rental_rate_daily}, ${weeklyRate}, ${monthlyRate},
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
      successCount++;
      console.log(`✓ ${eq.sku} - ${eq.name.substring(0, 50)}...`);
    } catch (error) {
      errorCount++;
      console.error(`✗ ${eq.sku}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
  
  console.log(`\n✅ Successfully seeded: ${successCount}`);
  console.log(`❌ Errors: ${errorCount}`);
  console.log(`📊 Total: ${rentalItems.length} items`);
}

seedAllEquipment().catch(console.error);

