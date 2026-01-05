#!/usr/bin/env bun

/**
 * Analyze category mapping between old and new categories
 * Performs fuzzy matching and generates mapping reports
 */

import { query as dbQuery } from '@/lib/database/unified-connection';
import { writeFileSync } from 'fs';
import { join } from 'path';

interface Category {
  category_id: string;
  name: string;
  path: string;
  level: number;
  product_count?: number;
}

interface CategoryMapping {
  old_category_id: string;
  old_category_name: string;
  new_category_id: string;
  new_category_name: string;
  confidence: 'high' | 'low' | 'manual';
  similarity_score: number;
  mapping_method: string;
}

/**
 * Calculate Levenshtein distance between two strings
 */
function levenshteinDistance(s1: string, s2: string): number {
  const len1 = s1.length;
  const len2 = s2.length;

  if (len1 === 0) return len2;
  if (len2 === 0) return len1;

  const matrix: number[][] = Array(len1 + 1)
    .fill(null)
    .map(() => Array(len2 + 1).fill(0));

  for (let i = 0; i <= len1; i++) {
    matrix[i][0] = i;
  }
  for (let j = 0; j <= len2; j++) {
    matrix[0][j] = j;
  }

  for (let i = 1; i <= len1; i++) {
    for (let j = 1; j <= len2; j++) {
      const cost = s1[i - 1] === s2[j - 1] ? 0 : 1;
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1, // deletion
        matrix[i][j - 1] + 1, // insertion
        matrix[i - 1][j - 1] + cost // substitution
      );
    }
  }

  return matrix[len1][len2];
}

/**
 * Calculate fuzzy match similarity (0-1) using Levenshtein distance
 */
function fuzzyMatch(str1: string, str2: string): number {
  if (!str1 || !str2) return 0;

  const s1 = str1.toLowerCase().trim();
  const s2 = str2.toLowerCase().trim();

  // Exact match
  if (s1 === s2) return 1.0;

  // Check if one contains the other (case-insensitive)
  if (s1.includes(s2) || s2.includes(s1)) {
    const shorter = Math.min(s1.length, s2.length);
    const longer = Math.max(s1.length, s2.length);
    return shorter / longer;
  }

  // Calculate Levenshtein distance
  const distance = levenshteinDistance(s1, s2);
  const maxLength = Math.max(s1.length, s2.length);

  if (maxLength === 0) return 0;

  // Convert distance to similarity score (0-1)
  return 1 - distance / maxLength;
}

/**
 * Normalize category name for comparison
 */
function normalizeCategoryName(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^\w\s]/g, ' ') // Replace special chars with space
    .replace(/\s+/g, ' ') // Normalize whitespace
    .trim();
}

/**
 * Find best matching new category for an old category
 */
function findBestMatch(
  oldCategory: Category,
  newCategories: Category[]
): { category: Category; score: number; method: string } | null {
  const normalizedOld = normalizeCategoryName(oldCategory.name);
  let bestMatch: Category | null = null;
  let bestScore = 0;
  let bestMethod = '';

  for (const newCat of newCategories) {
    const normalizedNew = normalizeCategoryName(newCat.name);
    let score = 0;
    let method = '';

    // Exact match (case-insensitive)
    if (normalizedOld === normalizedNew) {
      score = 1.0;
      method = 'exact_match';
    }
    // One contains the other
    else if (normalizedOld.includes(normalizedNew) || normalizedNew.includes(normalizedOld)) {
      const shorter = Math.min(normalizedOld.length, normalizedNew.length);
      const longer = Math.max(normalizedOld.length, normalizedNew.length);
      score = shorter / longer;
      method = 'contains_match';
    }
    // Fuzzy match
    else {
      score = fuzzyMatch(normalizedOld, normalizedNew);
      method = 'fuzzy_match';
    }

    // Also check if old category path contains new category name or vice versa
    const oldPathLower = oldCategory.path.toLowerCase();
    const newPathLower = newCat.path.toLowerCase();
    if (oldPathLower.includes(normalizedNew) || newPathLower.includes(normalizedOld)) {
      const pathScore = Math.max(score, 0.7); // Boost score if path matches
      if (pathScore > score) {
        score = pathScore;
        method = 'path_match';
      }
    }

    if (score > bestScore) {
      bestScore = score;
      bestMatch = newCat;
      bestMethod = method;
    }
  }

  if (bestMatch && bestScore > 0.3) {
    // Minimum threshold for matching
    return { category: bestMatch, score: bestScore, method: bestMethod };
  }

  return null;
}

/**
 * Generate CSV content from mappings
 */
function generateCSV(mappings: CategoryMapping[], headers: string[]): string {
  const rows = mappings.map(m => [
    m.old_category_id,
    m.old_category_name,
    m.new_category_id,
    m.new_category_name,
    m.confidence,
    m.similarity_score.toFixed(4),
    m.mapping_method,
  ]);

  return [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
}

async function analyzeCategoryMapping() {
  console.log('🔍 Analyzing category mapping...\n');

  try {
    // Get all old categories (excluding new ones - we'll identify them by creation date or a flag)
    // For now, we'll get all categories and filter later, or use a timestamp
    console.log('📊 Fetching old categories...');
    const oldCategoriesResult = await dbQuery<Category>(`
      SELECT 
        category_id,
        name,
        path,
        level,
        (SELECT COUNT(*) FROM core.product WHERE category_id = c.category_id) +
        (SELECT COUNT(*) FROM core.supplier_product WHERE category_id = c.category_id) as product_count
      FROM core.category c
      WHERE is_active = true
      ORDER BY name
    `);

    const oldCategories = oldCategoriesResult.rows;
    console.log(`   Found ${oldCategories.length} old categories`);

    // Get all new categories (from the new hierarchy - we'll identify by checking if they match the new structure)
    // For simplicity, we'll fetch all categories and the script will need to be run AFTER new categories are created
    // Then we can identify new vs old by checking the path format or a timestamp
    console.log('📊 Fetching new categories...');
    const newCategoriesResult = await dbQuery<Category>(`
      SELECT 
        category_id,
        name,
        path,
        level
      FROM core.category c
      WHERE is_active = true
      ORDER BY level, path
    `);

    const allCategories = newCategoriesResult.rows;

    // Identify new categories by checking if they match the new hierarchy structure
    // New categories should have paths like /guitars-basses--amps, /drums--percussion, etc.
    // We can also check by level 1 category names
    const newCategoryNames = [
      'Guitars, Basses & Amps',
      'Drums & Percussion',
      'Keyboards, Pianos & Synths',
      'Orchestral, Band & Folk',
      'Studio, Recording & Production',
      'Microphones & Wireless',
      'Live Sound & PA',
      'DJ & Electronic Music',
      'Lighting, Stage & Effects',
      'Software & Plugins',
      'Installed AV, Conferencing & Video',
      'Consumer Audio, Hi-Fi & Portable',
      'Cables, Connectors & Power',
      'Accessories, Cases, Racks & Stands',
      'Spares, Components & Consumables',
    ];

    const newCategoryIds = new Set<string>();
    for (const cat of allCategories) {
      if (newCategoryNames.includes(cat.name) || cat.level === 1) {
        // Get all descendants
        const descendants = allCategories.filter(
          c => c.path.startsWith(cat.path + '/') || c.path === cat.path
        );
        descendants.forEach(d => newCategoryIds.add(d.category_id));
      }
    }

    const newCategories = allCategories.filter(c => newCategoryIds.has(c.category_id));
    const actualOldCategories = oldCategories.filter(c => !newCategoryIds.has(c.category_id));

    console.log(`   Found ${newCategories.length} new categories`);
    console.log(`   Found ${actualOldCategories.length} old categories to map\n`);

    if (actualOldCategories.length === 0) {
      console.log('⚠️  No old categories found. Make sure new categories have been created first.');
      return;
    }

    // Perform mapping
    console.log('🔗 Performing category mapping...');
    const mappings: CategoryMapping[] = [];
    const unmappable: Category[] = [];

    for (const oldCat of actualOldCategories) {
      const match = findBestMatch(oldCat, newCategories);

      if (match && match.score >= 0.7) {
        mappings.push({
          old_category_id: oldCat.category_id,
          old_category_name: oldCat.name,
          new_category_id: match.category.category_id,
          new_category_name: match.category.name,
          confidence: match.score >= 0.85 ? 'high' : 'low',
          similarity_score: match.score,
          mapping_method: match.method,
        });
      } else if (match && match.score >= 0.5) {
        // Low confidence - needs review
        mappings.push({
          old_category_id: oldCat.category_id,
          old_category_name: oldCat.name,
          new_category_id: match.category.category_id,
          new_category_name: match.category.name,
          confidence: 'low',
          similarity_score: match.score,
          mapping_method: match.method,
        });
      } else {
        unmappable.push(oldCat);
      }
    }

    // Separate high and low confidence mappings
    const highConfidence = mappings.filter(m => m.confidence === 'high');
    const lowConfidence = mappings.filter(m => m.confidence === 'low');

    console.log(`\n✅ Mapping complete:`);
    console.log(`   High confidence: ${highConfidence.length}`);
    console.log(`   Low confidence (needs review): ${lowConfidence.length}`);
    console.log(`   Unmappable: ${unmappable.length}`);

    // Generate CSV reports
    const outputDir = join(process.cwd(), 'scripts', 'category-migration-reports');
    // Create directory if it doesn't exist (simplified - in production use fs.mkdirSync with recursive)
    
    const highConfidenceCSV = generateCSV(highConfidence, [
      'old_category_id',
      'old_category_name',
      'new_category_id',
      'new_category_name',
      'confidence',
      'similarity_score',
      'mapping_method',
    ]);

    const lowConfidenceCSV = generateCSV(lowConfidence, [
      'old_category_id',
      'old_category_name',
      'new_category_id',
      'new_category_name',
      'confidence',
      'similarity_score',
      'mapping_method',
    ]);

    const unmappableCSV = [
      'category_id,name,path,level,product_count',
      ...unmappable.map(
        c =>
          `${c.category_id},"${c.name.replace(/"/g, '""')}",${c.path},${c.level},${c.product_count || 0}`
      ),
    ].join('\n');

    // Write CSV files
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
    writeFileSync(
      join(process.cwd(), `high_confidence_mappings_${timestamp}.csv`),
      highConfidenceCSV,
      'utf-8'
    );
    writeFileSync(
      join(process.cwd(), `low_confidence_mappings_${timestamp}.csv`),
      lowConfidenceCSV,
      'utf-8'
    );
    writeFileSync(
      join(process.cwd(), `unmappable_categories_${timestamp}.csv`),
      unmappableCSV,
      'utf-8'
    );

    console.log(`\n📄 Reports generated:`);
    console.log(`   high_confidence_mappings_${timestamp}.csv`);
    console.log(`   low_confidence_mappings_${timestamp}.csv`);
    console.log(`   unmappable_categories_${timestamp}.csv`);

    // Store mappings in database for later use
    console.log('\n💾 Storing mappings in database...');
    for (const mapping of mappings) {
      await dbQuery(
        `
        INSERT INTO core.category_mapping (
          old_category_id, old_category_name,
          new_category_id, new_category_name,
          confidence, mapping_method, similarity_score, approved
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        ON CONFLICT (old_category_id, new_category_id) 
        DO UPDATE SET
          confidence = EXCLUDED.confidence,
          mapping_method = EXCLUDED.mapping_method,
          similarity_score = EXCLUDED.similarity_score,
          updated_at = NOW()
        `,
        [
          mapping.old_category_id,
          mapping.old_category_name,
          mapping.new_category_id,
          mapping.new_category_name,
          mapping.confidence,
          mapping.mapping_method,
          mapping.similarity_score,
          mapping.confidence === 'high', // Auto-approve high confidence
        ]
      );
    }

    console.log('✅ Analysis complete!');
  } catch (error) {
    console.error('❌ Error analyzing category mapping:', error);
    process.exit(1);
  }
}

// Run if executed directly
if (import.meta.main) {
  analyzeCategoryMapping();
}

export { analyzeCategoryMapping, findBestMatch, fuzzyMatch };

