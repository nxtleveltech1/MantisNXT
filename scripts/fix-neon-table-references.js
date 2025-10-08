/**
 * Fix Neon Database Table References
 *
 * Problem: API code uses unqualified table names (FROM products)
 * Solution: Add core schema prefix (FROM core.product)
 *
 * Also fixes: products → product (singular, as per actual schema)
 */

const fs = require('fs');
const path = require('path');
const { glob } = require('glob');

// Table name mappings: Old → New
const TABLE_MAPPINGS = {
  // Plural → Singular with schema
  'products': 'core.product',
  'suppliers': 'core.supplier',

  // Add schema prefix to existing names
  'inventory_items': 'core.stock_on_hand',  // This is the key mapping!
  'stock_on_hand': 'core.stock_on_hand',
  'supplier_product': 'core.supplier_product',
  'stock_location': 'core.stock_location',
  'warehouse': 'core.warehouse',
  'brand': 'core.brand',
  'category': 'core.category',
  'product_category': 'core.product_category',
  'uom': 'core.uom'
};

// Patterns to match SQL clauses
const SQL_PATTERNS = [
  /FROM\s+(\w+)/gi,
  /JOIN\s+(\w+)/gi,
  /INTO\s+(\w+)/gi,
  /UPDATE\s+(\w+)/gi,
  /TABLE\s+(\w+)/gi
];

function shouldSkipFile(filePath) {
  const skipPatterns = [
    /node_modules/,
    /\.next/,
    /\.git/,
    /dist/,
    /build/,
    /-backup\./,
    /\.optimized\./,
    /test-/,
    /neon-query-diagnostics/,
    /critical-query-tests/,
    /fix-neon-table-references/  // Don't modify self!
  ];

  return skipPatterns.some(pattern => pattern.test(filePath));
}

function fixTableReferences(content, filePath) {
  let modified = content;
  let changes = [];

  // For each SQL pattern
  SQL_PATTERNS.forEach(pattern => {
    modified = modified.replace(pattern, (match, tableName) => {
      // Skip if already has schema prefix
      if (tableName.includes('.')) {
        return match;
      }

      // Skip if not in our mapping
      if (!TABLE_MAPPINGS[tableName.toLowerCase()]) {
        return match;
      }

      const newTableName = TABLE_MAPPINGS[tableName.toLowerCase()];
      const clauseType = match.split(/\s+/)[0]; // FROM, JOIN, etc.

      changes.push({
        old: match,
        new: `${clauseType} ${newTableName}`,
        table: tableName
      });

      return `${clauseType} ${newTableName}`;
    });
  });

  // Special case: Handle SELECT COUNT(*) FROM table patterns
  modified = modified.replace(
    /SELECT\s+COUNT\(\*\).*?FROM\s+(\w+)/gi,
    (match, tableName) => {
      if (tableName.includes('.')) return match;
      const newName = TABLE_MAPPINGS[tableName.toLowerCase()];
      if (!newName) return match;

      changes.push({
        old: match,
        new: match.replace(tableName, newName),
        table: tableName
      });

      return match.replace(tableName, newName);
    }
  );

  if (changes.length > 0) {
    console.log(`\n📝 ${filePath}`);
    console.log(`   Changes: ${changes.length}`);
    changes.forEach(c => {
      console.log(`   - ${c.old} → ${c.new}`);
    });
  }

  return { modified, changes };
}

async function processFile(filePath) {
  if (shouldSkipFile(filePath)) {
    return { skipped: true };
  }

  try {
    const content = fs.readFileSync(filePath, 'utf8');
    const { modified, changes } = fixTableReferences(content, filePath);

    if (changes.length > 0) {
      // Create backup
      const backupPath = `${filePath}.backup-${Date.now()}`;
      fs.writeFileSync(backupPath, content);

      // Write fixed content
      fs.writeFileSync(filePath, modified);

      return {
        processed: true,
        changes: changes.length,
        backup: backupPath
      };
    }

    return { processed: false };
  } catch (error) {
    console.error(`❌ Error processing ${filePath}:`, error.message);
    return { error: error.message };
  }
}

async function main() {
  console.log('🔧 Neon Table Reference Fixer');
  console.log('=' .repeat(80));
  console.log('\nSearching for TypeScript/JavaScript files...\n');

  // Find all TS/JS files in src/app/api
  const files = await glob('src/app/api/**/*.{ts,js}', {
    cwd: process.cwd(),
    absolute: true,
    ignore: ['**/*.backup*', '**/*.optimized.*', '**/node_modules/**']
  });

  console.log(`Found ${files.length} files to process\n`);

  const stats = {
    processed: 0,
    skipped: 0,
    changed: 0,
    errors: 0,
    totalChanges: 0
  };

  for (const file of files) {
    const result = await processFile(file);

    if (result.skipped) {
      stats.skipped++;
    } else if (result.error) {
      stats.errors++;
    } else if (result.processed) {
      stats.processed++;
      if (result.changes > 0) {
        stats.changed++;
        stats.totalChanges += result.changes;
      }
    }
  }

  console.log('\n' + '='.repeat(80));
  console.log('📊 Summary');
  console.log('='.repeat(80));
  console.log(`Total files: ${files.length}`);
  console.log(`Processed: ${stats.processed}`);
  console.log(`Modified: ${stats.changed}`);
  console.log(`Skipped: ${stats.skipped}`);
  console.log(`Errors: ${stats.errors}`);
  console.log(`Total changes: ${stats.totalChanges}`);

  if (stats.changed > 0) {
    console.log('\n✅ Files have been modified. Backups created with .backup-* extension');
    console.log('\n⚠️  IMPORTANT: Test your application before committing!');
    console.log('   Run: npm run dev');
    console.log('   Test: All API endpoints');
  } else {
    console.log('\n✅ No changes needed - all references already correct!');
  }
}

main().catch(console.error);
