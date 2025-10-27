// Fix UUID casting issues in analytics queries
const fs = require('fs');
const path = require('path');

function createUUIDSafeQuery(columnName, parameterValue) {
  // Check if the column is known to be UUID type
  const uuidColumns = new Set([
    'suppliers.id',
    'suppliers.organization_id',
    'inventory_items.id',
    'inventory_items.organization_id',
    'inventory_items.supplier_id',
    'stock_movements.organization_id',
    'purchase_orders.organization_id'
  ]);

  const isUUIDColumn = uuidColumns.has(columnName);

  if (isUUIDColumn) {
    return `${columnName}::text = $1 OR ${columnName} = CAST($1 AS UUID)`;
  } else {
    // For varchar/integer organization_id columns, just use direct comparison
    return `${columnName}::text = $1`;
  }
}

// Replacement patterns for common problematic queries
const queryFixes = {
  // Organization ID filtering
  "WHERE organization_id = $1": "WHERE organization_id::text = $1",
  "WHERE ii.organization_id = $1": "WHERE ii.organization_id::text = $1",
  "WHERE s.organization_id = $1": "WHERE s.organization_id::text = $1",
  "WHERE sm.organization_id = $1": "WHERE sm.organization_id::text = $1",

  // Supplier ID filtering
  "WHERE supplier_id = $1": "WHERE (supplier_id::text = $1 OR supplier_id = CAST($1 AS UUID))",
  "WHERE s.id = $1": "WHERE (s.id::text = $1 OR s.id = CAST($1 AS UUID))",
  "WHERE ii.supplier_id = $1": "WHERE (ii.supplier_id::text = $1 OR ii.supplier_id = CAST($1 AS UUID))",

  // Item ID filtering
  "WHERE item_id = $1": "WHERE (item_id::text = $1 OR item_id = CAST($1 AS UUID))",
  "WHERE ii.id = $1": "WHERE (ii.id::text = $1 OR ii.id = CAST($1 AS UUID))",
};

function fixAnalyticsFile(filePath) {
  try {
    let content = fs.readFileSync(filePath, 'utf8');
    let modified = false;

    // Apply each fix
    Object.entries(queryFixes).forEach(([pattern, replacement]) => {
      if (content.includes(pattern)) {
        content = content.replaceAll(pattern, replacement);
        modified = true;
        console.log(`✅ Fixed "${pattern}" in ${path.basename(filePath)}`);
      }
    });

    // Save if modified
    if (modified) {
      fs.writeFileSync(filePath, content, 'utf8');
      console.log(`💾 Saved ${path.basename(filePath)}`);
    }

    return modified;
  } catch (error) {
    console.error(`❌ Error processing ${filePath}:`, error.message);
    return false;
  }
}

// Fix all analytics routes
const analyticsFiles = [
  'src/app/api/analytics/dashboard/route.ts',
  'src/app/api/analytics/anomalies/route.ts',
  'src/app/api/analytics/predictions/route.ts',
  'src/app/api/inventory/analytics/route.ts',
  'src/app/api/suppliers/metrics/route.ts'
];

console.log('🔧 Starting UUID casting fixes for analytics routes...');

let totalFixed = 0;
analyticsFiles.forEach(file => {
  const fullPath = path.join(process.cwd(), file);
  if (fs.existsSync(fullPath)) {
    if (fixAnalyticsFile(fullPath)) {
      totalFixed++;
    }
  } else {
    console.log(`⚠️  File not found: ${file}`);
  }
});

console.log(`🎉 UUID casting fixes complete! Fixed ${totalFixed} files.`);

// Create a helper function file for future use
const helperContent = `// UUID-safe query helpers for analytics
export function createSafeWhereClause(tableName: string, columnName: string, paramIndex: number = 1): string {
  const uuidColumns = new Map([
    ['suppliers', new Set(['id', 'organization_id'])],
    ['inventory_items', new Set(['id', 'organization_id', 'supplier_id'])],
    ['stock_movements', new Set(['organization_id', 'item_id'])],
    ['purchase_orders', new Set(['organization_id', 'supplier_id'])]
  ]);

  const isUUIDColumn = uuidColumns.get(tableName)?.has(columnName) || false;
  const fullColumn = tableName ? \`\${tableName}.\${columnName}\` : columnName;

  if (isUUIDColumn) {
    return \`(\${fullColumn}::text = $\${paramIndex} OR \${fullColumn} = CAST($\${paramIndex} AS UUID))\`;
  } else {
    return \`\${fullColumn}::text = $\${paramIndex}\`;
  }
}

export function createSafeOrganizationFilter(organizationId: string): { where: string; params: [string] } {
  return {
    where: "organization_id::text = $1",
    params: [organizationId]
  };
}

export function createSafeSupplierFilter(supplierId: string): { where: string; params: [string] } {
  return {
    where: "(supplier_id::text = $1 OR supplier_id = CAST($1 AS UUID))",
    params: [supplierId]
  };
}
`;

const helperPath = path.join(process.cwd(), 'src/lib/analytics/uuid-safe-queries.ts');
fs.writeFileSync(helperPath, helperContent, 'utf8');
console.log('📝 Created UUID-safe query helpers at src/lib/analytics/uuid-safe-queries.ts');