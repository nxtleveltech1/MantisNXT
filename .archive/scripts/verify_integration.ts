#!/usr/bin/env tsx

/**
 * Integration Verification Script
 *
 * This script verifies the integration was successful by running comprehensive checks
 * on database connectivity, schema existence, data presence, and API endpoints.
 *
 * Usage: npx tsx scripts/verify_integration.ts
 */

import { neonDb } from '../lib/database/neon-connection';

interface VerificationResult {
  check: string;
  status: 'pass' | 'fail' | 'warning';
  message: string;
  details?: any;
}

interface VerificationStats {
  total: number;
  passed: number;
  failed: number;
  warnings: number;
  duration: number;
}

/**
 * Check database connectivity
 */
async function checkDatabaseConnectivity(): Promise<VerificationResult> {
  try {
    const startTime = Date.now();
    const result = await neonDb`SELECT NOW() as current_time`;
    const latency = Date.now() - startTime;

    return {
      check: 'Database Connectivity',
      status: 'pass',
      message: `Connected successfully (${latency}ms)`,
      details: { latency, currentTime: result[0].current_time },
    };
  } catch (error) {
    return {
      check: 'Database Connectivity',
      status: 'fail',
      message: `Connection failed: ${String(error)}`,
      details: { error: error instanceof Error ? error.message : String(error) },
    };
  }
}

/**
 * Check schema existence
 */
async function checkSchemaExistence(): Promise<VerificationResult> {
  try {
    const schemas = await neonDb`
      SELECT schema_name 
      FROM information_schema.schemata 
      WHERE schema_name IN ('spp', 'core', 'serve')
      ORDER BY schema_name
    `;

    const expectedSchemas = ['spp', 'core', 'serve'];
    const foundSchemas = schemas.map(s => s.schema_name);
    const missingSchemas = expectedSchemas.filter(s => !foundSchemas.includes(s));

    if (missingSchemas.length === 0) {
      return {
        check: 'Schema Existence',
        status: 'pass',
        message: `All required schemas exist: ${foundSchemas.join(', ')}`,
        details: { foundSchemas },
      };
    } else {
      return {
        check: 'Schema Existence',
        status: 'fail',
        message: `Missing schemas: ${missingSchemas.join(', ')}`,
        details: { foundSchemas, missingSchemas },
      };
    }
  } catch (error) {
    return {
      check: 'Schema Existence',
      status: 'fail',
      message: `Schema check failed: ${String(error)}`,
      details: { error: error instanceof Error ? error.message : String(error) },
    };
  }
}

/**
 * Check data presence
 */
async function checkDataPresence(): Promise<VerificationResult> {
  try {
    const counts = await neonDb`
      SELECT 
        'suppliers' as table_name, COUNT(*) as count FROM core.supplier
      UNION ALL
      SELECT 'supplier_products', COUNT(*) FROM core.supplier_product
      UNION ALL
      SELECT 'price_history', COUNT(*) FROM core.price_history
      UNION ALL
      SELECT 'inventory_selections', COUNT(*) FROM core.inventory_selection
      UNION ALL
      SELECT 'inventory_selected_items', COUNT(*) FROM core.inventory_selected_item
      UNION ALL
      SELECT 'stock_on_hand', COUNT(*) FROM core.stock_on_hand
      ORDER BY table_name
    `;

    const dataSummary = counts.reduce(
      (acc, row) => {
        acc[row.table_name] = parseInt(row.count);
        return acc;
      },
      {} as Record<string, number>
    );

    const hasData = Object.values(dataSummary).every(count => count > 0);

    if (hasData) {
      return {
        check: 'Data Presence',
        status: 'pass',
        message: 'All tables contain data',
        details: dataSummary,
      };
    } else {
      const emptyTables = Object.entries(dataSummary)
        .filter(([_, count]) => count === 0)
        .map(([table, _]) => table);

      return {
        check: 'Data Presence',
        status: 'warning',
        message: `Empty tables: ${emptyTables.join(', ')}`,
        details: dataSummary,
      };
    }
  } catch (error) {
    return {
      check: 'Data Presence',
      status: 'fail',
      message: `Data check failed: ${String(error)}`,
      details: { error: error instanceof Error ? error.message : String(error) },
    };
  }
}

/**
 * Check active selection
 */
async function checkActiveSelection(): Promise<VerificationResult> {
  try {
    const activeSelections = await neonDb`
      SELECT selection_id, selection_name, created_at, 
             (SELECT COUNT(*) FROM core.inventory_selected_item WHERE selection_id = sel.selection_id AND status = 'selected') as item_count
      FROM core.inventory_selection sel
      WHERE status = 'active'
    `;

    if (activeSelections.length === 0) {
      return {
        check: 'Active Selection',
        status: 'fail',
        message: 'No active selection found',
        details: { count: 0 },
      };
    } else if (activeSelections.length > 1) {
      return {
        check: 'Active Selection',
        status: 'warning',
        message: `Multiple active selections found (${activeSelections.length})`,
        details: { selections: activeSelections },
      };
    } else {
      const selection = activeSelections[0];
      return {
        check: 'Active Selection',
        status: 'pass',
        message: `Active selection: ${selection.selection_name} (${selection.item_count} items)`,
        details: { selection },
      };
    }
  } catch (error) {
    return {
      check: 'Active Selection',
      status: 'fail',
      message: `Active selection check failed: ${String(error)}`,
      details: { error: error instanceof Error ? error.message : String(error) },
    };
  }
}

/**
 * Check data consistency
 */
async function checkDataConsistency(): Promise<VerificationResult> {
  try {
    // Check for products without current prices
    const productsWithoutPrices = await neonDb`
      SELECT COUNT(*) as count
      FROM core.supplier_product sp
      WHERE NOT EXISTS (
        SELECT 1 FROM core.price_history ph
        WHERE ph.supplier_product_id = sp.supplier_product_id AND ph.is_current = true
      )
    `;

    const missingPrices = parseInt(productsWithoutPrices[0].count);

    if (missingPrices === 0) {
      return {
        check: 'Data Consistency',
        status: 'pass',
        message: 'All products have current prices',
        details: { productsWithoutPrices: 0 },
      };
    } else {
      return {
        check: 'Data Consistency',
        status: 'warning',
        message: `${missingPrices} products missing current prices`,
        details: { productsWithoutPrices: missingPrices },
      };
    }
  } catch (error) {
    return {
      check: 'Data Consistency',
      status: 'fail',
      message: `Data consistency check failed: ${String(error)}`,
      details: { error: error instanceof Error ? error.message : String(error) },
    };
  }
}

/**
 * Check stock data
 */
async function checkStockData(): Promise<VerificationResult> {
  try {
    const stockSummary = await neonDb`
      SELECT 
        COUNT(*) as total_records,
        SUM(qty) as total_qty,
        SUM(total_value) as total_value,
        AVG(qty) as avg_qty
      FROM core.stock_on_hand
    `;

    const summary = stockSummary[0];
    const totalRecords = parseInt(summary.total_records);
    const totalQty = parseInt(summary.total_qty) || 0;
    const totalValue = parseFloat(summary.total_value) || 0;
    const avgQty = parseFloat(summary.avg_qty) || 0;

    if (totalRecords > 0) {
      return {
        check: 'Stock Data',
        status: 'pass',
        message: `${totalRecords} stock records, ${totalQty} total qty, ${totalValue.toFixed(
          2
        )} total value`,
        details: { totalRecords, totalQty, totalValue, avgQty },
      };
    } else {
      return {
        check: 'Stock Data',
        status: 'warning',
        message: 'No stock records found',
        details: { totalRecords: 0 },
      };
    }
  } catch (error) {
    return {
      check: 'Stock Data',
      status: 'fail',
      message: `Stock data check failed: ${String(error)}`,
      details: { error: error instanceof Error ? error.message : String(error) },
    };
  }
}

/**
 * Check API endpoints
 */
async function checkApiEndpoints(): Promise<VerificationResult> {
  try {
    const baseUrl = 'http://localhost:3000';
    const endpoints = ['/api/core/selections/active', '/api/serve/nxt-soh'];

    if (process.env.CHECK_SPP_METRICS === '1') {
      endpoints.push('/api/spp/dashboard/metrics');
    }

    const results = [];

    for (const endpoint of endpoints) {
      try {
        const response = await fetch(`${baseUrl}${endpoint}`);
        const status = response.status;
        const isOk = status >= 200 && status < 300;

        results.push({
          endpoint,
          status,
          ok: isOk,
        });
      } catch (error) {
        results.push({
          endpoint,
          status: 'error',
          ok: false,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }

    const allOk = results.every(r => r.ok);
    const failedEndpoints = results.filter(r => !r.ok);

    if (allOk) {
      return {
        check: 'API Endpoints',
        status: 'pass',
        message: 'All API endpoints responding',
        details: { results },
      };
    } else {
      return {
        check: 'API Endpoints',
        status: 'warning',
        message: `${failedEndpoints.length} endpoints not responding`,
        details: { results, failedEndpoints },
      };
    }
  } catch (error) {
    return {
      check: 'API Endpoints',
      status: 'fail',
      message: `API check failed: ${String(error)}`,
      details: { error: error instanceof Error ? error.message : String(error) },
    };
  }
}

/**
 * Main verification function
 */
async function verifyIntegration(): Promise<VerificationStats> {
  const startTime = Date.now();
  const results: VerificationResult[] = [];

  console.log('🔍 Starting integration verification...');
  console.log('=====================================');

  // Run all checks
  const checks = [
    checkDatabaseConnectivity,
    checkSchemaExistence,
    checkDataPresence,
    checkActiveSelection,
    checkDataConsistency,
    checkStockData,
    checkApiEndpoints,
  ];

  for (const check of checks) {
    try {
      const result = await check();
      results.push(result);

      // Display result
      const statusIcon =
        result.status === 'pass' ? '✅' : result.status === 'warning' ? '⚠️' : '❌';
      console.log(`${statusIcon} ${result.check}: ${result.message}`);

      if (result.details && process.env.DEBUG) {
        console.log(`   Details:`, result.details);
      }
    } catch (error) {
      const result: VerificationResult = {
        check: check.name,
        status: 'fail',
        message: `Check failed: ${String(error)}`,
        details: { error: error instanceof Error ? error.message : String(error) },
      };
      results.push(result);
      console.log(`❌ ${result.check}: ${result.message}`);
    }
  }

  // Calculate statistics
  const stats: VerificationStats = {
    total: results.length,
    passed: results.filter(r => r.status === 'pass').length,
    failed: results.filter(r => r.status === 'fail').length,
    warnings: results.filter(r => r.status === 'warning').length,
    duration: Date.now() - startTime,
  };

  // Summary
  console.log('\n📊 Verification Summary');
  console.log('======================');
  console.log(`Total checks: ${stats.total}`);
  console.log(`Passed: ${stats.passed}`);
  console.log(`Failed: ${stats.failed}`);
  console.log(`Warnings: ${stats.warnings}`);
  console.log(`Duration: ${Math.round(stats.duration / 1000)}s`);

  // Detailed results
  if (stats.failed > 0) {
    console.log('\n❌ Failed Checks:');
    results
      .filter(r => r.status === 'fail')
      .forEach(result => {
        console.log(`  • ${result.check}: ${result.message}`);
      });
  }

  if (stats.warnings > 0) {
    console.log('\n⚠️  Warnings:');
    results
      .filter(r => r.status === 'warning')
      .forEach(result => {
        console.log(`  • ${result.check}: ${result.message}`);
      });
  }

  // Final status
  if (stats.failed === 0) {
    console.log('\n🎉 All checks passed! Integration is successful.');
  } else {
    console.log('\n⚠️  Some checks failed. Please review the issues above.');
  }

  return stats;
}

// Command-line execution
if (require.main === module) {
  verifyIntegration()
    .then(stats => {
      if (stats.failed === 0) {
        console.log('\n✅ Integration verification completed successfully!');
        process.exit(0);
      } else {
        console.log('\n❌ Integration verification found issues.');
        process.exit(1);
      }
    })
    .catch(error => {
      console.error('\n❌ Verification failed:', error);
      process.exit(1);
    });
}

export { verifyIntegration };
