/**
 * Live API Test Endpoint
 * Comprehensive test of all backend functionality
 */

import { NextRequest, NextResponse } from 'next/server'
import { pool } from '@/lib/database'

export async function GET(request: NextRequest) {
  const results = {
    timestamp: new Date().toISOString(),
    tests: [] as any[],
    summary: {
      passed: 0,
      failed: 0,
      total: 0
    }
  }

  // Helper function to add test result
  function addTest(name: string, success: boolean, details?: any, error?: string) {
    results.tests.push({
      name,
      success,
      details,
      error,
      timestamp: new Date().toISOString()
    })

    if (success) {
      results.summary.passed++
    } else {
      results.summary.failed++
    }
    results.summary.total++
  }

  try {
    // Test 1: Database Connection
    try {
      const connectionResult = await pool.query('SELECT NOW() as current_time, version() as pg_version')
      addTest('Database Connection', true, {
        time: connectionResult.rows[0].current_time,
        version: connectionResult.rows[0].pg_version.split(' ')[0]
      })
    } catch (error) {
      addTest('Database Connection', false, null, error instanceof Error ? error.message : 'Unknown error')
    }

    // Test 2: Table Existence Check
    try {
      const tables = ['organizations', 'suppliers', 'inventory_items', 'stock_movements']
      const tableResults = []

      for (const table of tables) {
        try {
          const result = await pool.query(`SELECT COUNT(*) as count FROM ${table}`)
          tableResults.push({ table, count: result.rows[0].count, status: 'exists' })
        } catch (error) {
          tableResults.push({ table, count: 0, status: 'missing' })
        }
      }

      const missingTables = tableResults.filter(t => t.status === 'missing')
      addTest('Table Existence', missingTables.length === 0, tableResults,
              missingTables.length > 0 ? `Missing tables: ${missingTables.map(t => t.table).join(', ')}` : undefined)
    } catch (error) {
      addTest('Table Existence', false, null, error instanceof Error ? error.message : 'Unknown error')
    }

    // Test 3: Suppliers CRUD Operations
    try {
      // Create test supplier
      const createResult = await pool.query(`
        INSERT INTO suppliers (name, email, contact_person, primary_category, status)
        VALUES ('API Test Supplier', 'apitest@supplier.com', 'Test Contact', 'Testing', 'active')
        RETURNING id, name
      `)

      const supplierId = createResult.rows[0].id

      // Read supplier
      const readResult = await pool.query('SELECT * FROM suppliers WHERE id = $1', [supplierId])

      // Update supplier
      await pool.query('UPDATE suppliers SET phone = $1 WHERE id = $2', ['+27123456789', supplierId])

      // Clean up
      await pool.query('DELETE FROM suppliers WHERE id = $1', [supplierId])

      addTest('Suppliers CRUD', true, {
        created: createResult.rows[0].name,
        read: readResult.rows.length > 0,
        updated: true,
        deleted: true
      })
    } catch (error) {
      addTest('Suppliers CRUD', false, null, error instanceof Error ? error.message : 'Unknown error')
    }

    // Test 4: Inventory Operations
    try {
      // Check inventory table structure
      const inventorySchema = await pool.query(`
        SELECT column_name, data_type, is_nullable
        FROM information_schema.columns
        WHERE table_name = 'inventory_items'
        ORDER BY ordinal_position
      `)

      // Test insert with sample data
      const testSKU = `TEST-${Date.now()}`
      const inventoryResult = await pool.query(`
        INSERT INTO inventory_items (sku, name, category, cost_price, stock_qty, status)
        VALUES ($1, 'Test Product', 'Test Category', 100.00, 10, 'active')
        RETURNING id, sku, name
      `, [testSKU])

      const inventoryId = inventoryResult.rows[0].id

      // Test stock movement
      await pool.query(`
        INSERT INTO stock_movements (item_id, movement_type, quantity, reason)
        VALUES ($1, 'in', 5, 'API Test Movement')
      `, [inventoryId])

      // Clean up
      await pool.query('DELETE FROM stock_movements WHERE item_id = $1', [inventoryId])
      await pool.query('DELETE FROM inventory_items WHERE id = $1', [inventoryId])

      addTest('Inventory Operations', true, {
        schemaColumns: inventorySchema.rows.length,
        itemCreated: inventoryResult.rows[0].name,
        movementRecorded: true
      })
    } catch (error) {
      addTest('Inventory Operations', false, null, error instanceof Error ? error.message : 'Unknown error')
    }

    // Test 5: Upload Sessions
    try {
      const uploadResult = await pool.query(`SELECT COUNT(*) as count FROM upload_sessions`)

      addTest('Upload Sessions', true, {
        count: parseInt(uploadResult.rows[0].count),
        status: 'ready'
      })
    } catch (error) {
      addTest('Upload Sessions', false, null, error instanceof Error ? error.message : 'Unknown error')
    }

    // Test 6: Upload Session Tables
    try {
      const uploadTables = ['upload_sessions', 'upload_temp_data', 'upload_backups']
      const uploadResults = []

      for (const table of uploadTables) {
        try {
          const result = await pool.query(`SELECT COUNT(*) as count FROM ${table}`)
          uploadResults.push({ table, count: parseInt(result.rows[0].count), status: 'ready' })
        } catch (error) {
          uploadResults.push({ table, count: 0, status: 'error' })
        }
      }

      addTest('Upload Infrastructure', uploadResults.every(r => r.status === 'ready'), uploadResults)
    } catch (error) {
      addTest('Upload Infrastructure', false, null, error instanceof Error ? error.message : 'Unknown error')
    }

    // Test 7: Performance Check
    try {
      const startTime = Date.now()

      // Run a complex query to test performance
      const perfResult = await pool.query(`
        SELECT
          (SELECT COUNT(*) FROM suppliers) as supplier_count,
          (SELECT COUNT(*) FROM inventory_items) as inventory_count,
          (SELECT COUNT(*) FROM stock_movements) as movement_count,
          (SELECT COUNT(*) FROM upload_sessions) as upload_count
      `)

      const queryTime = Date.now() - startTime

      addTest('Database Performance', queryTime < 1000, {
        queryTime: `${queryTime}ms`,
        counts: perfResult.rows[0]
      }, queryTime >= 1000 ? 'Query took longer than 1 second' : undefined)
    } catch (error) {
      addTest('Database Performance', false, null, error instanceof Error ? error.message : 'Unknown error')
    }

    // Calculate overall health score
    const healthScore = results.summary.total > 0 ?
      Math.round((results.summary.passed / results.summary.total) * 100) : 0

    return NextResponse.json({
      success: true,
      healthScore,
      status: healthScore === 100 ? 'excellent' :
              healthScore >= 80 ? 'good' :
              healthScore >= 60 ? 'fair' : 'poor',
      database: {
        host: process.env.DB_HOST || '62.169.20.53',
        port: process.env.DB_PORT || '6600',
        database: process.env.DB_NAME || 'nxtprod-db_001'
      },
      ...results,
      recommendations: generateRecommendations(results.tests)
    })

  } catch (error) {
    console.error('API test failed:', error)
    return NextResponse.json({
      success: false,
      error: 'API test execution failed',
      details: error instanceof Error ? error.message : 'Unknown error',
      ...results
    }, { status: 500 })
  }
}

function generateRecommendations(tests: any[]): string[] {
  const recommendations: string[] = []

  const failedTests = tests.filter(t => !t.success)

  if (failedTests.length === 0) {
    recommendations.push('All systems operational - backend is ready for production use')
  } else {
    recommendations.push(`${failedTests.length} tests failed - review and fix issues`)

    failedTests.forEach(test => {
      switch (test.name) {
        case 'Database Connection':
          recommendations.push('Check database server status and connection credentials')
          break
        case 'Table Existence':
          recommendations.push('Run database migration script to create missing tables')
          break
        case 'Suppliers CRUD':
          recommendations.push('Check suppliers table permissions and structure')
          break
        case 'Inventory Operations':
          recommendations.push('Verify inventory and stock_movements table configuration')
          break
        case 'Authentication Schema':
          recommendations.push('Set up authentication tables and default admin user')
          break
        case 'Upload Infrastructure':
          recommendations.push('Create upload session tables for file processing')
          break
        case 'Database Performance':
          recommendations.push('Optimize database queries and check server resources')
          break
      }
    })
  }

  return recommendations
}