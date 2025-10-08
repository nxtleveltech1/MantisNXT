/**
 * Database Health Check API
 * Test live database connectivity and table status
 */

import { NextRequest, NextResponse } from 'next/server'
import { pool } from '@/lib/database'

export async function GET(request: NextRequest) {
  try {
    console.log('🔍 Testing database connection...')

    // Test basic connectivity
    const connectionTest = await pool.query('SELECT NOW() as current_time, version() as pg_version')

    if (!connectionTest.rows || connectionTest.rows.length === 0) {
      throw new Error('No response from database')
    }

    const dbInfo = connectionTest.rows[0]
    console.log('✅ Database connected:', dbInfo)

    // Test table existence
    const tablesQuery = `
      SELECT table_name, table_type
      FROM information_schema.tables
      WHERE table_schema = 'public'
      ORDER BY table_name
    `

    const tablesResult = await pool.query(tablesQuery)
    const tables = tablesResult.rows

    // Check for key enterprise tables
    const requiredTables = [
      'organizations',
      'users',
      'roles',
      'permissions',
      'suppliers',
      'inventory_items',
      'stock_movements',
      'upload_sessions'
    ]

    const existingTables = tables.map(t => t.table_name)
    const missingTables = requiredTables.filter(table => !existingTables.includes(table))

    // Get table row counts for existing tables
    const tableCounts = {}
    for (const table of existingTables) {
      try {
        const countResult = await pool.query(`SELECT COUNT(*) as count FROM "${table}"`)
        tableCounts[table] = parseInt(countResult.rows[0].count)
      } catch (error) {
        tableCounts[table] = 'Error accessing table'
      }
    }

    // Test specific queries for key functionality
    const functionalityTests = []

    // Test suppliers table
    try {
      const suppliersTest = await pool.query('SELECT COUNT(*) as count FROM suppliers')
      functionalityTests.push({
        test: 'Suppliers Table Access',
        status: 'success',
        details: `${suppliersTest.rows[0].count} suppliers found`
      })
    } catch (error) {
      functionalityTests.push({
        test: 'Suppliers Table Access',
        status: 'error',
        details: error instanceof Error ? error.message : 'Unknown error'
      })
    }

    // Test inventory table
    try {
      const inventoryTest = await pool.query('SELECT COUNT(*) as count FROM inventory_items')
      functionalityTests.push({
        test: 'Inventory Table Access',
        status: 'success',
        details: `${inventoryTest.rows[0].count} inventory items found`
      })
    } catch (error) {
      functionalityTests.push({
        test: 'Inventory Table Access',
        status: 'error',
        details: error instanceof Error ? error.message : 'Unknown error'
      })
    }

    // Test users/auth tables
    try {
      const usersTest = await pool.query('SELECT COUNT(*) as count FROM users')
      functionalityTests.push({
        test: 'Users Table Access',
        status: 'success',
        details: `${usersTest.rows[0].count} users found`
      })
    } catch (error) {
      functionalityTests.push({
        test: 'Users Table Access',
        status: 'error',
        details: error instanceof Error ? error.message : 'Unknown error'
      })
    }

    // Calculate overall health score
    const successfulTests = functionalityTests.filter(t => t.status === 'success').length
    const totalTests = functionalityTests.length
    const healthScore = totalTests > 0 ? (successfulTests / totalTests) * 100 : 0

    const healthStatus = healthScore === 100 ? 'excellent' :
                        healthScore >= 80 ? 'good' :
                        healthScore >= 60 ? 'fair' : 'poor'

    return NextResponse.json({
      success: true,
      database: {
        status: 'connected',
        healthScore: Math.round(healthScore),
        healthStatus,
        connection: {
          timestamp: dbInfo.current_time,
          version: dbInfo.pg_version,
          host: process.env.DB_HOST || '62.169.20.53',
          port: process.env.DB_PORT || '6600',
          database: process.env.DB_NAME || 'nxtprod-db_001'
        },
        tables: {
          total: tables.length,
          existing: existingTables,
          missing: missingTables,
          counts: tableCounts
        },
        functionality: {
          tests: functionalityTests,
          summary: `${successfulTests}/${totalTests} tests passed`
        }
      },
      recommendations: generateRecommendations(missingTables, functionalityTests)
    })

  } catch (error) {
    console.error('❌ Database health check failed:', error)

    return NextResponse.json({
      success: false,
      database: {
        status: 'failed',
        healthScore: 0,
        healthStatus: 'critical',
        error: error instanceof Error ? error.message : 'Unknown database error',
        connection: {
          host: process.env.DB_HOST || '62.169.20.53',
          port: process.env.DB_PORT || '6600',
          database: process.env.DB_NAME || 'nxtprod-db_001'
        }
      },
      recommendations: [
        'Check database server availability',
        'Verify connection credentials',
        'Ensure database exists and is accessible',
        'Check network connectivity to database server'
      ]
    }, { status: 500 })
  }
}

function generateRecommendations(missingTables: string[], functionalityTests: any[]): string[] {
  const recommendations: string[] = []

  if (missingTables.length > 0) {
    recommendations.push(`Missing tables detected: ${missingTables.join(', ')}. Run database migrations.`)
  }

  const failedTests = functionalityTests.filter(t => t.status === 'error')
  if (failedTests.length > 0) {
    recommendations.push(`${failedTests.length} functionality tests failed. Check table permissions and structure.`)
  }

  if (missingTables.includes('suppliers')) {
    recommendations.push('Suppliers table is missing - supplier management will not work')
  }

  if (missingTables.includes('inventory_items')) {
    recommendations.push('Inventory items table is missing - inventory management will not work')
  }

  if (missingTables.includes('users') || missingTables.includes('roles')) {
    recommendations.push('Authentication tables are missing - user login will not work')
  }

  if (recommendations.length === 0) {
    recommendations.push('Database is fully operational and ready for production use')
  }

  return recommendations
}