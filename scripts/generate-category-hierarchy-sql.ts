/**
 * Generate SQL migration for comprehensive category hierarchy
 * Parses Categories_Hierachy.md and generates INSERT statements
 */

import { readFileSync, writeFileSync } from 'fs';
import { join } from 'path';

interface CategoryNode {
  name: string;
  level: number;
  parentPath?: string;
  path: string;
  slug: string;
}

function normalizeCategoryLabel(label: string): string {
  return label
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .replace(/[^\w\s-]/g, '')
    .replace(/\s/g, '-');
}

function cleanCategoryName(text: string): string {
  // Remove numbering (1.1.1.1.1), bullet points, and special markdown chars
  return text
    .replace(/^[•o▪]\s*/, '') // Remove bullet points at start
    .replace(/^\d+\.(\d+\.)*\s*/, '') // Remove numbering
    .replace(/\\&/g, '&') // Unescape &
    .replace(/\\/g, '') // Remove other escapes
    .trim();
}

function parseHierarchy(content: string): CategoryNode[] {
  const lines = content.split('\n');
  const categories: CategoryNode[] = [];
  const hierarchy: { [level: number]: { name: string; slug: string; path: string } } = {
    1: { name: '', slug: '', path: '' },
    2: { name: '', slug: '', path: '' },
    3: { name: '', slug: '', path: '' },
    4: { name: '', slug: '', path: '' },
    5: { name: '', slug: '', path: '' },
  };

  for (let i = 0; i < lines.length; i++) {
    const rawLine = lines[i];
    const line = rawLine.trim();
    
    // Skip empty lines, separators, and instructions
    if (!line || line.startsWith('___') || line.startsWith('How to use') || line.startsWith('L1 →')) {
      continue;
    }

    let level = 0;
    let name = '';
    
    // L1: "1\. Musical Instruments" or "10\. Spares" - single number (1-10), escaped dot
    // Key: Must be single number (not "1.1" or "1.1.1"), no tab, no bullet at start
    const l1Match = line.match(/^(\d+)\\?\.\s+(.+)$/);
    if (l1Match) {
      const num = parseInt(l1Match[1]);
      const rest = l1Match[2];
      // L1: number is 1-10, line doesn't start with tab/bullet, and rest doesn't start with number (to exclude "1.1 Guitars")
      // We check for tab/bullet on rawLine to catch indentation
      const startsWithTabOrBullet = rawLine.match(/^[\t\s]*[•o▪●○]/);
      if (num >= 1 && num <= 10 && 
          !startsWithTabOrBullet && 
          !rawLine.startsWith('\t') && 
          !rest.match(/^\d+\./)) {
        level = 1;
        name = cleanCategoryName(rest);
      }
    }
    // L2: "1.1 Guitars \& Basses" - two numbers, no bullet, no tab, not three+ numbers
    else {
      const l2Match = line.match(/^(\d+)\.(\d+)\s+(.+)$/);
      // Check for bullet at start, not anywhere in line
      const startsWithBullet = rawLine.match(/^[\t\s]*[•o▪●○]/);
      if (l2Match && !startsWithBullet && !rawLine.startsWith('\t') && !line.match(/^\d+\.\d+\.\d+/)) {
        level = 2;
        name = cleanCategoryName(l2Match[3]);
      }
      // L3: "•	1.1.1 Electric Guitars" - bullet, three numbers
      else {
        const l3Match = line.match(/^[•]\s*(\d+)\.(\d+)\.(\d+)\s+(.+)$/);
        if (l3Match && !line.match(/^\d+\.\d+\.\d+\.\d+/)) {
          level = 3;
          name = cleanCategoryName(l3Match[4]);
        }
        // L4: "o	1.1.1.1 Solid-Body" - letter o, four numbers
        else {
          const l4Match = line.match(/^o\s+(\d+)\.(\d+)\.(\d+)\.(\d+)\s+(.+)$/);
          if (l4Match && !line.match(/^\d+\.\d+\.\d+\.\d+\.\d+/)) {
            level = 4;
            name = cleanCategoryName(l4Match[5]);
          }
          // L5: "•	1.1.1.1.1 Standard" - any bullet char (including Unicode), five numbers
          else {
            // Try with any non-digit character at start (bullet, space, tab) followed by 5 numbers
            const l5Match = line.match(/^[^\d]*(\d+)\.(\d+)\.(\d+)\.(\d+)\.(\d+)\s+(.+)$/);
            if (l5Match) {
              level = 5;
              name = cleanCategoryName(l5Match[6]);
            }
          }
        }
      }
    }

    if (!name || level === 0) continue;

    const slug = normalizeCategoryLabel(name);
    
    // Build parent path from hierarchy stack
    const parentParts: string[] = [];
    for (let l = 1; l < level; l++) {
      if (hierarchy[l].slug) {
        parentParts.push(hierarchy[l].slug);
      }
    }
    const parentPath = parentParts.length > 0 ? `/${parentParts.join('/')}` : null;
    const fullPath = parentPath ? `${parentPath}/${slug}` : `/${slug}`;

    // Update hierarchy stack
    hierarchy[level] = { name, slug, path: fullPath };
    // Clear deeper levels
    for (let l = level + 1; l <= 5; l++) {
      hierarchy[l] = { name: '', slug: '', path: '' };
    }

    categories.push({
      name,
      level,
      parentPath: parentPath || undefined,
      path: fullPath,
      slug,
    });
  }

  return categories;
}

function generateSQL(categories: CategoryNode[]): string {
  const sql: string[] = [];
  
  sql.push('-- Migration: Seed Comprehensive Category Hierarchy');
  sql.push('-- Description: Seeds 5-level category hierarchy from Categories_Hierachy.md');
  sql.push('-- Generated: ' + new Date().toISOString());
  sql.push('');
  sql.push('BEGIN;');
  sql.push('');
  sql.push('-- Helper function to get category ID by path');
  sql.push('CREATE OR REPLACE FUNCTION get_category_id_by_path(category_path TEXT)');
  sql.push('RETURNS UUID AS $$');
  sql.push('DECLARE');
  sql.push('  cat_id UUID;');
  sql.push('BEGIN');
  sql.push('  SELECT category_id INTO cat_id');
  sql.push('  FROM core.category');
  sql.push('  WHERE path = category_path');
  sql.push('  LIMIT 1;');
  sql.push('  RETURN cat_id;');
  sql.push('END;');
  sql.push('$$ LANGUAGE plpgsql;');
  sql.push('');

  // Group by level and insert level by level
  for (let level = 1; level <= 5; level++) {
    const levelCategories = categories.filter(c => c.level === level);
    
    if (levelCategories.length === 0) continue;

    sql.push(`-- Level ${level} Categories (${levelCategories.length} categories)`);
    
    for (const cat of levelCategories) {
      const parentIdExpr = cat.parentPath
        ? `get_category_id_by_path('${cat.parentPath}')`
        : 'NULL';
      
      sql.push(`INSERT INTO core.category (name, parent_id, level, path, is_active, created_at, updated_at)`);
      sql.push(`VALUES (`);
      sql.push(`  '${cat.name.replace(/'/g, "''")}',`);
      sql.push(`  ${parentIdExpr}::uuid,`);
      sql.push(`  ${cat.level},`);
      sql.push(`  '${cat.path}',`);
      sql.push(`  true,`);
      sql.push(`  NOW(),`);
      sql.push(`  NOW()`);
      sql.push(`)`);
      sql.push(`ON CONFLICT DO NOTHING;`);
      sql.push('');
    }
  }

  sql.push('-- Cleanup helper function');
  sql.push('DROP FUNCTION IF EXISTS get_category_id_by_path(TEXT);');
  sql.push('');
  sql.push('COMMIT;');
  sql.push('');
  sql.push('-- Verification queries');
  sql.push('-- SELECT level, COUNT(*) FROM core.category GROUP BY level ORDER BY level;');
  sql.push('-- SELECT name, path, level FROM core.category WHERE level = 1 ORDER BY name;');

  return sql.join('\n');
}

// Main execution
const hierarchyFile = join(process.cwd(), 'Platform Modules', 'Categories', 'Categories_Hierachy.md');
const outputFile = join(process.cwd(), 'migrations', '0034_seed_comprehensive_category_hierarchy.sql');

console.log('Reading hierarchy file...');
const content = readFileSync(hierarchyFile, 'utf-8');

console.log('Parsing hierarchy...');
const categories = parseHierarchy(content);

console.log(`Parsed ${categories.length} categories`);
console.log(`Level breakdown:`);
for (let level = 1; level <= 5; level++) {
  const count = categories.filter(c => c.level === level).length;
  console.log(`  Level ${level}: ${count} categories`);
}

// Show first few categories for debugging
if (categories.length > 0) {
  console.log('\nFirst 10 categories:');
  categories.slice(0, 10).forEach(c => {
    console.log(`  L${c.level}: ${c.name} -> ${c.path}`);
  });
}

console.log('Generating SQL...');
const sql = generateSQL(categories);

console.log('Writing migration file...');
writeFileSync(outputFile, sql, 'utf-8');

console.log(`✅ Migration file created: ${outputFile}`);
console.log(`Total categories: ${categories.length}`);
