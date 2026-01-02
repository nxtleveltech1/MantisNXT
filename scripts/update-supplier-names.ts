/**
 * Supplier Name Cleanup Script
 * 
 * Purpose:
 * 1. Update supplier names to match the canonical list (64 suppliers)
 * 2. All names converted to UPPERCASE
 * 3. Remove/deactivate suppliers NOT on the list
 * 4. NO CHANGES to products, inventory, or stock
 * 
 * This is a NAME-ONLY update operation.
 */

import { query, withTransaction } from '../lib/database/unified-connection';

// ============================================================================
// CANONICAL SUPPLIER LIST (64 names - all UPPERCASE)
// ============================================================================
const CANONICAL_SUPPLIERS: string[] = [
  'A1 SOUND CC',
  'APEXPRO (PTY) LTD',
  'AV DISTRIBUTION',
  'ACTIVE MUSIC DISTRIBUTION',
  'ALPHA DISTRIBUTION TECHNOLOGIES',
  'ARIDIAN CONSULTING',
  'ATOMIC ONE',
  'AUDIOLITE',
  'AUDIOSURE',
  'B PROMOTION',
  'BC ELECTRONICS',
  'BRIGHTS HARDWARE',
  'BALANCED AUDIO',
  'BERT KOSTER',
  'BOLT N ALL',
  'BOUDIOR LOUNGE',
  'BRAND EXPOSED',
  'CITY OF CAPE TOWN',
  'COREX',
  'CASIO SOUTH AFRICA',
  'COMMUNICA',
  'CONNOISSEUR ELECTRONICS',
  'CYBERDYNE SYSTEMS SA',
  'DWR DISTRIBUTION',
  'DESIGN BY MAX',
  'DUXBURY NETWORKING',
  'EASTERN ACOUSTICS',
  'ELECTROCOMP',
  'ELECTROSONIC SA',
  'EVEREADY',
  'FOAMRITE',
  'GIPPS',
  'GLOBAL MUSIC YAMAHA',
  'IMIX SOLUTIONS',
  'JJ BRAVO ELECTRICAL (PTY)LTD',
  'LEGACY BRANDS',
  'LINKQAGE',
  'MCRAE PROPERTY RENOVATIONS',
  'MANTECH',
  'MARSHALL MUSIC SA',
  'MUSIC POWER',
  'MUSICAL DISTRIBUTORS',
  'NDOX ENT (PTY) LTD',
  'PHASE',
  'PLANETWORLD SA',
  'PLANET WORLD MI',
  'PRO AUDIO AFRICA',
  'ROCKIT DISTRIBUTION',
  'ROLLING THUNDER',
  'SC AUDIO / AGENT GROUP',
  'SOUNDRITE AUDIOCC',
  'SCOOP DISTRIBUTION',
  'SENNHEISER ELECTRONICS (SA) (PTY) LTD',
  'SMOKE GRENADE',
  'SONIC INFORMED',
  'SPEAKER REPAIR SA',
  'STAGE AUDIO WORKS',
  'STAGE ONE',
  'SURGESOUND PTY LTD',
  'TOA ELECTRONICS SOUTHERN AFRICA (PTY) LTD',
  'TOPLINE DISTRIBUTORS (PTY) LTD',
  'TUERK MUSIC TECHNOLOGIES (PTY) LTD',
  'VIVA AFRIKA CAR AUDIO',
  'VIVA AFRIKA JHB & CPT',
];

// ============================================================================
// MATCHING RULES
// Normalized versions for fuzzy matching existing supplier names
// ============================================================================
function normalizeForMatching(name: string): string {
  return name
    .toUpperCase()
    .replace(/\s+/g, ' ')
    .replace(/[^\w\s]/g, '') // Remove special chars for matching
    .trim();
}

// Create normalized lookup map
const NORMALIZED_CANONICAL = new Map<string, string>();
for (const name of CANONICAL_SUPPLIERS) {
  NORMALIZED_CANONICAL.set(normalizeForMatching(name), name);
}

// Known alternative spellings/variations to match
const KNOWN_ALIASES: Record<string, string> = {
  // Common variations that should match
  'AV DISTRIBUTION': 'AV DISTRIBUTION',
  'AVDISTRIBUTION': 'AV DISTRIBUTION',
  'A.V. DISTRIBUTION': 'AV DISTRIBUTION',
  'DECKSAVER AV DISTRIBUTION': 'AV DISTRIBUTION',
  'PRO AUDIO IMPORTS': 'PRO AUDIO AFRICA',
  'PROAUDIO': 'PRO AUDIO AFRICA',
  'PRO AUDIO': 'PRO AUDIO AFRICA',
  'PLANETWORLD': 'PLANETWORLD SA',
  'PLANET WORLD SA': 'PLANETWORLD SA',
  'PLANET WORLD': 'PLANET WORLD MI',
  'PLANETWORLDMI': 'PLANET WORLD MI',
  'STAGEONE': 'STAGE ONE',
  'STAGE 1': 'STAGE ONE',
  'STAGE1': 'STAGE ONE',
  'STAGE AUDIO': 'STAGE AUDIO WORKS',
  'STAGEAUDIOWORKS': 'STAGE AUDIO WORKS',
  'SENNHEISER': 'SENNHEISER ELECTRONICS (SA) (PTY) LTD',
  'SENNHEISER SA': 'SENNHEISER ELECTRONICS (SA) (PTY) LTD',
  'SENNHEISER ELECTRONICS': 'SENNHEISER ELECTRONICS (SA) (PTY) LTD',
  'DWR': 'DWR DISTRIBUTION',
  'DWRDISTRIBUTION': 'DWR DISTRIBUTION',
  'TOA': 'TOA ELECTRONICS SOUTHERN AFRICA (PTY) LTD',
  'TOA ELECTRONICS': 'TOA ELECTRONICS SOUTHERN AFRICA (PTY) LTD',
  'TOA SA': 'TOA ELECTRONICS SOUTHERN AFRICA (PTY) LTD',
  'TOPLINE': 'TOPLINE DISTRIBUTORS (PTY) LTD',
  'TOPLINE DISTRIBUTORS': 'TOPLINE DISTRIBUTORS (PTY) LTD',
  'TUERK': 'TUERK MUSIC TECHNOLOGIES (PTY) LTD',
  'TUERK MUSIC': 'TUERK MUSIC TECHNOLOGIES (PTY) LTD',
  'MARSHALL MUSIC': 'MARSHALL MUSIC SA',
  'MARSHALL': 'MARSHALL MUSIC SA',
  'GLOBAL YAMAHA': 'GLOBAL MUSIC YAMAHA',
  'YAMAHA': 'GLOBAL MUSIC YAMAHA',
  'GLOBAL MUSIC': 'GLOBAL MUSIC YAMAHA',
  'CASIO': 'CASIO SOUTH AFRICA',
  'CASIO SA': 'CASIO SOUTH AFRICA',
  'SURGESOUND': 'SURGESOUND PTY LTD',
  'SURGE SOUND': 'SURGESOUND PTY LTD',
  'NDOX': 'NDOX ENT (PTY) LTD',
  'NDOX ENT': 'NDOX ENT (PTY) LTD',
  'SCAUDIO': 'SC AUDIO / AGENT GROUP',
  'SC AUDIO': 'SC AUDIO / AGENT GROUP',
  'AGENT GROUP': 'SC AUDIO / AGENT GROUP',
  'SOUNDRITE': 'SOUNDRITE AUDIOCC',
  'SOUNDRITE AUDIO': 'SOUNDRITE AUDIOCC',
  'VIVA AFRIKA': 'VIVA AFRIKA CAR AUDIO',
  'VIVAAFRIKA': 'VIVA AFRIKA CAR AUDIO',
  'VIVA AFRICA': 'VIVA AFRIKA CAR AUDIO',
  'JJ BRAVO': 'JJ BRAVO ELECTRICAL (PTY)LTD',
  'JJ BRAVO ELECTRICAL': 'JJ BRAVO ELECTRICAL (PTY)LTD',
  'BRAVO ELECTRICAL': 'JJ BRAVO ELECTRICAL (PTY)LTD',
  'APEXPRO': 'APEXPRO (PTY) LTD',
  'APEX PRO': 'APEXPRO (PTY) LTD',
  'MCRAE': 'MCRAE PROPERTY RENOVATIONS',
  'MCRAE PROPERTY': 'MCRAE PROPERTY RENOVATIONS',
  'ALPHA DISTRIBUTION': 'ALPHA DISTRIBUTION TECHNOLOGIES',
  'BOUDOIR LOUNGE': 'BOUDIOR LOUNGE', // Common misspelling
  'BOUDOIRLOUNGE': 'BOUDIOR LOUNGE',
  'A1 SOUND': 'A1 SOUND CC',
  'A1SOUND': 'A1 SOUND CC',
  'BC ELECTRONICS CC': 'BC ELECTRONICS',
  'CITY CAPE TOWN': 'CITY OF CAPE TOWN',
  'CAPE TOWN CITY': 'CITY OF CAPE TOWN',
  'DUXBURY': 'DUXBURY NETWORKING',
  'ELECTROSONIC': 'ELECTROSONIC SA',
  'EASTERN': 'EASTERN ACOUSTICS',
  'ACTIVE MUSIC': 'ACTIVE MUSIC DISTRIBUTION',
  'BALANCED': 'BALANCED AUDIO',
  'ROCKIT': 'ROCKIT DISTRIBUTION',
  'SCOOP': 'SCOOP DISTRIBUTION',
  'SMOKE': 'SMOKE GRENADE',
  'SPEAKER REPAIR': 'SPEAKER REPAIR SA',
  'SONIC': 'SONIC INFORMED',
  'ROLLING': 'ROLLING THUNDER',
  'LEGACY': 'LEGACY BRANDS',
  'IMIX': 'IMIX SOLUTIONS',
  'CONNOISSEUR': 'CONNOISSEUR ELECTRONICS',
  'CYBERDYNE': 'CYBERDYNE SYSTEMS SA',
  'DESIGN MAX': 'DESIGN BY MAX',
  'ARIDIAN': 'ARIDIAN CONSULTING',
  'ATOMIC': 'ATOMIC ONE',
  'BRAND': 'BRAND EXPOSED',
  'BOLT': 'BOLT N ALL',
  'MUSICAL': 'MUSICAL DISTRIBUTORS',
  'MUSIC DISTRIBUTORS': 'MUSICAL DISTRIBUTORS',
};

/**
 * Match an existing supplier name to the canonical list
 */
function matchToCanonical(existingName: string): string | null {
  const normalized = normalizeForMatching(existingName);
  const upper = existingName.toUpperCase().trim();
  
  // Direct match
  if (CANONICAL_SUPPLIERS.includes(upper)) {
    return upper;
  }
  
  // Normalized match
  const directMatch = NORMALIZED_CANONICAL.get(normalized);
  if (directMatch) {
    return directMatch;
  }
  
  // Check known aliases
  if (KNOWN_ALIASES[normalized]) {
    return KNOWN_ALIASES[normalized];
  }
  if (KNOWN_ALIASES[upper]) {
    return KNOWN_ALIASES[upper];
  }
  
  // Partial matching - check if canonical name starts with/contains existing
  for (const canonical of CANONICAL_SUPPLIERS) {
    const canonicalNorm = normalizeForMatching(canonical);
    if (canonicalNorm.includes(normalized) || normalized.includes(canonicalNorm)) {
      return canonical;
    }
  }
  
  return null;
}

interface ExistingSupplier {
  supplier_id: string;
  name: string;
  code: string | null;
  active: boolean;
}

interface SupplierUpdate {
  supplier_id: string;
  old_name: string;
  new_name: string;
  action: 'update' | 'keep' | 'remove';
}

async function analyzeSuppliers(): Promise<{
  updates: SupplierUpdate[];
  toRemove: ExistingSupplier[];
  unmatched: ExistingSupplier[];
}> {
  console.log('\n📊 Analyzing current suppliers...\n');
  
  // Get all current suppliers
  const result = await query<ExistingSupplier>(`
    SELECT 
      supplier_id::text as supplier_id,
      name,
      code,
      active
    FROM core.supplier
    ORDER BY name
  `);
  
  const existingSuppliers = result.rows;
  console.log(`Found ${existingSuppliers.length} existing suppliers\n`);
  
  const updates: SupplierUpdate[] = [];
  const toRemove: ExistingSupplier[] = [];
  const unmatched: ExistingSupplier[] = [];
  const matchedCanonical = new Set<string>();
  
  for (const supplier of existingSuppliers) {
    const match = matchToCanonical(supplier.name);
    
    if (match) {
      matchedCanonical.add(match);
      
      if (supplier.name !== match) {
        updates.push({
          supplier_id: supplier.supplier_id,
          old_name: supplier.name,
          new_name: match,
          action: 'update',
        });
      } else {
        updates.push({
          supplier_id: supplier.supplier_id,
          old_name: supplier.name,
          new_name: match,
          action: 'keep',
        });
      }
    } else {
      toRemove.push(supplier);
      unmatched.push(supplier);
    }
  }
  
  // Check for missing canonical suppliers (not matched to any existing)
  const missingCanonical = CANONICAL_SUPPLIERS.filter(c => !matchedCanonical.has(c));
  if (missingCanonical.length > 0) {
    console.log('⚠️  The following canonical suppliers have NO match in the database:');
    for (const missing of missingCanonical) {
      console.log(`   - ${missing}`);
    }
    console.log('');
  }
  
  return { updates, toRemove, unmatched };
}

async function executeUpdates(
  updates: SupplierUpdate[],
  toRemove: ExistingSupplier[],
  dryRun: boolean = true
): Promise<void> {
  console.log('\n' + '='.repeat(80));
  console.log(dryRun ? '🔍 DRY RUN - No changes will be made' : '🚀 EXECUTING CHANGES');
  console.log('='.repeat(80) + '\n');
  
  // Report what will happen
  const nameUpdates = updates.filter(u => u.action === 'update');
  const kept = updates.filter(u => u.action === 'keep');
  
  console.log(`📝 Suppliers to UPDATE (name change): ${nameUpdates.length}`);
  for (const u of nameUpdates) {
    console.log(`   "${u.old_name}" → "${u.new_name}"`);
  }
  
  console.log(`\n✅ Suppliers already correct (no change): ${kept.length}`);
  
  console.log(`\n🗑️  Suppliers to REMOVE (not on list): ${toRemove.length}`);
  for (const s of toRemove) {
    console.log(`   - ${s.name} (ID: ${s.supplier_id})`);
  }
  
  if (dryRun) {
    console.log('\n⚡ Run with --execute to apply these changes');
    return;
  }
  
  // Execute changes in a transaction
  await withTransaction(async (client) => {
    // 1. Update names to uppercase canonical versions
    for (const update of nameUpdates) {
      console.log(`Updating: "${update.old_name}" → "${update.new_name}"`);
      await client.query(
        `UPDATE core.supplier 
         SET name = $1, updated_at = NOW() 
         WHERE supplier_id = $2`,
        [update.new_name, update.supplier_id]
      );
    }
    
    // 2. Deactivate and remove suppliers not on the list
    // First, deactivate them
    for (const supplier of toRemove) {
      console.log(`Deactivating: "${supplier.name}"`);
      await client.query(
        `UPDATE core.supplier 
         SET active = false, updated_at = NOW() 
         WHERE supplier_id = $1`,
        [supplier.supplier_id]
      );
    }
    
    // Delete the deactivated suppliers (if they have no products linked)
    // Note: We ONLY delete if there are NO products linked to preserve inventory integrity
    for (const supplier of toRemove) {
      // Check if supplier has any products
      const productCheck = await client.query(
        `SELECT COUNT(*) as count FROM core.supplier_product WHERE supplier_id = $1`,
        [supplier.supplier_id]
      );
      
      const productCount = parseInt(productCheck.rows[0]?.count ?? '0', 10);
      
      if (productCount === 0) {
        console.log(`Deleting (no products): "${supplier.name}"`);
        await client.query(
          `DELETE FROM core.supplier WHERE supplier_id = $1`,
          [supplier.supplier_id]
        );
      } else {
        console.log(`Keeping deactivated (has ${productCount} products): "${supplier.name}"`);
      }
    }
  });
  
  console.log('\n✅ All changes applied successfully!');
}

async function main() {
  const args = process.argv.slice(2);
  const dryRun = !args.includes('--execute');
  
  console.log('='.repeat(80));
  console.log('🔧 SUPPLIER NAME CLEANUP SCRIPT');
  console.log('='.repeat(80));
  console.log(`\nCanonical supplier count: ${CANONICAL_SUPPLIERS.length}`);
  
  // Verify canonical list count
  if (CANONICAL_SUPPLIERS.length !== 64) {
    console.error(`\n❌ ERROR: Expected 64 suppliers, but found ${CANONICAL_SUPPLIERS.length}`);
    process.exit(1);
  }
  
  try {
    const { updates, toRemove, unmatched } = await analyzeSuppliers();
    
    console.log('\n' + '='.repeat(80));
    console.log('📊 SUMMARY');
    console.log('='.repeat(80));
    console.log(`Total canonical suppliers: ${CANONICAL_SUPPLIERS.length}`);
    console.log(`Matched (will update or keep): ${updates.length}`);
    console.log(`To remove (not on list): ${toRemove.length}`);
    console.log(`Final supplier count after cleanup: ${updates.length}`);
    
    await executeUpdates(updates, toRemove, dryRun);
    
  } catch (error) {
    console.error('\n❌ Error:', error);
    process.exit(1);
  }
}

// Run if executed directly
if (require.main === module) {
  main()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error('Fatal error:', error);
      process.exit(1);
    });
}

export { CANONICAL_SUPPLIERS, matchToCanonical, analyzeSuppliers };

