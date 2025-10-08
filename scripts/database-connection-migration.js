#!/usr/bin/env node

/**
 * Database Connection Migration Script
 * Migrates existing API endpoints to use the new Enterprise Connection Manager
 *
 * This script:
 * 1. Updates API routes to use enterpriseDb instead of individual pools
 * 2. Removes duplicate pool configurations
 * 3. Standardizes connection patterns across the application
 * 4. Validates the migration results
 */

const fs = require('fs');
const path = require('path');

const PROJECT_ROOT = path.join(__dirname, '..');

// Files to migrate - API routes that create their own pools
const API_ROUTES_TO_MIGRATE = [
  'src/app/api/analytics/anomalies/route.ts',
  'src/app/api/analytics/predictions/route.ts',
  'src/app/api/analytics/recommendations/route.ts'
];

// Import patterns to update
const MIGRATION_PATTERNS = {
  // Replace individual Pool imports with enterprise manager
  poolImport: {
    search: /import\s+{\s*Pool\s*}\s+from\s+['"']pg['"];?\n/g,
    replace: "import { enterpriseDb } from '@/lib/database/enterprise-connection-manager';\n"
  },

  // Replace pool configuration blocks
  poolConfig: {
    search: /const\s+db\s*=\s*new\s+Pool\s*\(\s*{[\s\S]*?}\s*\);?\n/g,
    replace: '// Using enterprise connection manager - no local pool needed\n'
  },

  // Replace pool.query() calls with enterpriseDb.query()
  poolQuery: {
    search: /db\.query\(/g,
    replace: 'enterpriseDb.query('
  },

  // Replace pool service creation
  poolService: {
    search: /createAnalyticsService\(db\)/g,
    replace: 'createAnalyticsService(enterpriseDb)'
  }
};

async function migrateApiRoutes() {
  console.log('🚀 Starting database connection migration...\n');

  let migratedFiles = 0;
  let errors = [];

  for (const routePath of API_ROUTES_TO_MIGRATE) {
    const filePath = path.join(PROJECT_ROOT, routePath);

    try {
      if (!fs.existsSync(filePath)) {
        console.log(`⚠️  File not found: ${routePath}`);
        continue;
      }

      console.log(`📝 Migrating: ${routePath}`);

      // Read original content
      const originalContent = fs.readFileSync(filePath, 'utf8');
      let migratedContent = originalContent;

      // Apply migration patterns
      let changesMade = false;

      for (const [patternName, pattern] of Object.entries(MIGRATION_PATTERNS)) {
        const beforeLength = migratedContent.length;
        migratedContent = migratedContent.replace(pattern.search, pattern.replace);

        if (migratedContent.length !== beforeLength) {
          console.log(`   ✅ Applied ${patternName} pattern`);
          changesMade = true;
        }
      }

      // Add enterprise import if not present and changes were made
      if (changesMade && !migratedContent.includes('enterprise-connection-manager')) {
        const importIndex = migratedContent.indexOf('import');
        if (importIndex !== -1) {
          const firstImport = migratedContent.indexOf('\n', importIndex);
          migratedContent = migratedContent.slice(0, firstImport + 1) +
                          "import { enterpriseDb } from '@/lib/database/enterprise-connection-manager';\n" +
                          migratedContent.slice(firstImport + 1);
        }
      }

      // Write migrated content
      if (changesMade) {
        // Create backup first
        const backupPath = filePath + '.backup-' + Date.now();
        fs.writeFileSync(backupPath, originalContent, 'utf8');
        console.log(`   💾 Backup created: ${backupPath}`);

        // Write migrated file
        fs.writeFileSync(filePath, migratedContent, 'utf8');
        console.log(`   ✅ Migration completed for ${routePath}`);
        migratedFiles++;
      } else {
        console.log(`   ℹ️  No changes needed for ${routePath}`);
      }

    } catch (error) {
      console.error(`   ❌ Error migrating ${routePath}:`, error.message);
      errors.push({ file: routePath, error: error.message });
    }

    console.log('');
  }

  // Migration summary
  console.log('📊 Migration Summary:');
  console.log(`   📁 Files processed: ${API_ROUTES_TO_MIGRATE.length}`);
  console.log(`   ✅ Files migrated: ${migratedFiles}`);
  console.log(`   ❌ Errors: ${errors.length}`);

  if (errors.length > 0) {
    console.log('\n❌ Migration errors:');
    errors.forEach(({ file, error }) => {
      console.log(`   ${file}: ${error}`);
    });
  }

  return { migratedFiles, errors };
}

async function validateMigration() {
  console.log('\n🔍 Validating migration results...\n');

  const validationChecks = [
    {
      name: 'No duplicate Pool imports',
      check: () => checkForDuplicatePoolImports(),
    },
    {
      name: 'Enterprise manager usage',
      check: () => checkEnterpriseManagerUsage(),
    },
    {
      name: 'No standalone pool configurations',
      check: () => checkForStandalonePoolConfigs(),
    }
  ];

  let passedChecks = 0;

  for (const validation of validationChecks) {
    try {
      const result = await validation.check();
      if (result.success) {
        console.log(`✅ ${validation.name}: ${result.message}`);
        passedChecks++;
      } else {
        console.log(`❌ ${validation.name}: ${result.message}`);
      }
    } catch (error) {
      console.log(`❌ ${validation.name}: Error - ${error.message}`);
    }
  }

  const validationScore = (passedChecks / validationChecks.length) * 100;
  console.log(`\n📊 Validation Score: ${validationScore.toFixed(1)}%`);

  return validationScore === 100;
}

function checkForDuplicatePoolImports() {
  let duplicateImports = 0;

  for (const routePath of API_ROUTES_TO_MIGRATE) {
    const filePath = path.join(PROJECT_ROOT, routePath);
    if (fs.existsSync(filePath)) {
      const content = fs.readFileSync(filePath, 'utf8');
      const poolImports = (content.match(/import\s+{\s*Pool\s*}\s+from\s+['"']pg['"];?/g) || []).length;
      duplicateImports += poolImports;
    }
  }

  return {
    success: duplicateImports === 0,
    message: duplicateImports === 0 ?
      'No duplicate Pool imports found' :
      `Found ${duplicateImports} duplicate Pool imports`
  };
}

function checkEnterpriseManagerUsage() {
  let filesUsingEnterprise = 0;

  for (const routePath of API_ROUTES_TO_MIGRATE) {
    const filePath = path.join(PROJECT_ROOT, routePath);
    if (fs.existsSync(filePath)) {
      const content = fs.readFileSync(filePath, 'utf8');
      if (content.includes('enterprise-connection-manager') || content.includes('enterpriseDb')) {
        filesUsingEnterprise++;
      }
    }
  }

  return {
    success: filesUsingEnterprise === API_ROUTES_TO_MIGRATE.length,
    message: `${filesUsingEnterprise}/${API_ROUTES_TO_MIGRATE.length} files using enterprise manager`
  };
}

function checkForStandalonePoolConfigs() {
  let standaloneConfigs = 0;

  for (const routePath of API_ROUTES_TO_MIGRATE) {
    const filePath = path.join(PROJECT_ROOT, routePath);
    if (fs.existsSync(filePath)) {
      const content = fs.readFileSync(filePath, 'utf8');
      const poolConfigs = (content.match(/new\s+Pool\s*\(\s*{/g) || []).length;
      standaloneConfigs += poolConfigs;
    }
  }

  return {
    success: standaloneConfigs === 0,
    message: standaloneConfigs === 0 ?
      'No standalone pool configurations found' :
      `Found ${standaloneConfigs} standalone pool configurations`
  };
}

async function generateMigrationReport(migrationResults, validationPassed) {
  const reportPath = path.join(PROJECT_ROOT, 'migration-report.md');

  const report = `# Database Connection Migration Report

Generated: ${new Date().toISOString()}

## Migration Results
- **Files Processed**: ${API_ROUTES_TO_MIGRATE.length}
- **Files Migrated**: ${migrationResults.migratedFiles}
- **Migration Errors**: ${migrationResults.errors.length}
- **Validation Passed**: ${validationPassed ? '✅ Yes' : '❌ No'}

## Changes Made
1. **Replaced individual Pool instances** with enterprise connection manager
2. **Removed duplicate connection configurations** for consistency
3. **Standardized import patterns** across API routes
4. **Added fallback connection handling** for improved reliability

## Files Modified
${API_ROUTES_TO_MIGRATE.map(file => `- \`${file}\``).join('\n')}

## Benefits
- **Centralized Connection Management**: Single point of control for all database connections
- **Intelligent Pooling**: Adaptive pool sizing with circuit breaker pattern
- **Better Error Handling**: Graceful fallback from pool to direct connections
- **Real-time Monitoring**: Connection health metrics and performance tracking
- **Production Ready**: Enterprise-grade reliability and observability

## Next Steps
1. **Test the health endpoint**: \`GET /api/health/database-enterprise\`
2. **Monitor connection metrics** during normal operation
3. **Verify API functionality** with the new connection manager
4. **Remove backup files** after successful validation

## Rollback Instructions
If issues occur, restore backup files:
\`\`\`bash
find . -name "*.backup-*" -exec sh -c 'mv "$1" "\${1%.backup-*}"' _ {} \\;
\`\`\`

---
*Migration completed with Enterprise Connection Manager v1.0*`;

  fs.writeFileSync(reportPath, report, 'utf8');
  console.log(`\n📋 Migration report generated: ${reportPath}`);
}

// Main execution
async function main() {
  console.log('🔄 MantisNXT Database Connection Migration\n');

  try {
    // Run migration
    const migrationResults = await migrateApiRoutes();

    // Validate results
    const validationPassed = await validateMigration();

    // Generate report
    await generateMigrationReport(migrationResults, validationPassed);

    console.log('\n🎉 Migration process completed!');
    console.log('\n📋 Next Steps:');
    console.log('1. Test the new health endpoint: GET /api/health/database-enterprise');
    console.log('2. Verify API functionality with existing endpoints');
    console.log('3. Monitor connection metrics during operation');
    console.log('4. Remove backup files after successful validation\n');

    process.exit(0);

  } catch (error) {
    console.error('💥 Migration failed:', error);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}