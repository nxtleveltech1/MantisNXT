/**
 * Database Test Endpoint
 *
 * GET /api/xero/test/database?orgId=org_123
 *
 * Tests database connectivity and Xero-related tables/queries
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { query } from '@/lib/database';

export async function GET(request: NextRequest) {
  const results = {
    timestamp: new Date().toISOString(),
    checks: {} as Record<string, any>,
  };

  try {
    // Verify user authentication
    const { userId, orgId } = await auth();

    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized. Please sign in.' },
        { status: 401 }
      );
    }

    if (!orgId) {
      return NextResponse.json(
        { error: 'No organization selected.' },
        { status: 400 }
      );
    }

    console.log('[DB Test] Starting database tests for org:', orgId);

    // Test 1: Basic database connectivity
    try {
      console.log('[DB Test] Testing basic database connectivity');
      const testResult = await query<{ now: Date }>('SELECT NOW()');
      results.checks.basicConnectivity = {
        success: true,
        currentTime: testResult.rows[0]?.now,
        message: 'Database connection successful',
      };
    } catch (error) {
      console.error('[DB Test] Basic connectivity failed:', error);
      results.checks.basicConnectivity = {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        message: 'Database connection failed',
      };
      return NextResponse.json(results, { status: 500 });
    }

    // Test 2: Check if Xero tables exist
    const tablesToCheck = [
      'xero_connections',
      'xero_entity_mappings',
      'xero_account_mappings',
      'xero_sync_log',
      'xero_webhook_events',
      'xero_account_mapping_defaults'
    ];

    results.checks.tableExistence = {};

    for (const tableName of tablesToCheck) {
      try {
        console.log(`[DB Test] Checking if table ${tableName} exists`);
        const tableResult = await query<{ exists: boolean }>(`
          SELECT EXISTS (
            SELECT 1
            FROM information_schema.tables
            WHERE table_schema = 'public'
            AND table_name = $1
          ) as exists
        `, [tableName]);

        const exists = tableResult.rows[0]?.exists;
        results.checks.tableExistence[tableName] = {
          exists,
          message: exists ? 'Table exists' : 'Table does not exist',
        };

        if (!exists) {
          console.warn(`[DB Test] Table ${tableName} does not exist`);
        }
      } catch (error) {
        console.error(`[DB Test] Error checking table ${tableName}:`, error);
        results.checks.tableExistence[tableName] = {
          exists: false,
          error: error instanceof Error ? error.message : 'Unknown error',
          message: 'Error checking table existence',
        };
      }
    }

    // Test 3: Test Xero connection queries for the org
    if (results.checks.tableExistence.xero_connections?.exists) {
      try {
        console.log('[DB Test] Testing xero_connections queries');
        const connectionResult = await query<{ count: string }>(
          'SELECT COUNT(*) as count FROM xero_connections WHERE org_id = $1',
          [orgId]
        );

        const connectionCount = parseInt(connectionResult.rows[0]?.count || '0', 10);
        results.checks.xeroConnections = {
          success: true,
          connectionCount,
          message: `Found ${connectionCount} Xero connection(s) for organization`,
        };
      } catch (error) {
        console.error('[DB Test] xero_connections query failed:', error);
        results.checks.xeroConnections = {
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
          message: 'Failed to query xero_connections table',
        };
      }
    }

    // Test 4: Test entity mappings queries
    if (results.checks.tableExistence.xero_entity_mappings?.exists) {
      try {
        console.log('[DB Test] Testing xero_entity_mappings queries');
        const mappingResult = await query<{ count: string }>(
          'SELECT COUNT(*) as count FROM xero_entity_mappings WHERE org_id = $1',
          [orgId]
        );

        const mappingCount = parseInt(mappingResult.rows[0]?.count || '0', 10);
        results.checks.xeroEntityMappings = {
          success: true,
          mappingCount,
          message: `Found ${mappingCount} entity mapping(s) for organization`,
        };
      } catch (error) {
        console.error('[DB Test] xero_entity_mappings query failed:', error);
        results.checks.xeroEntityMappings = {
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
          message: 'Failed to query xero_entity_mappings table',
        };
      }
    }

    // Test 5: Test account mappings queries
    if (results.checks.tableExistence.xero_account_mappings?.exists) {
      try {
        console.log('[DB Test] Testing xero_account_mappings queries');
        const accountResult = await query<{ count: string }>(
          'SELECT COUNT(*) as count FROM xero_account_mappings WHERE org_id = $1',
          [orgId]
        );

        const accountCount = parseInt(accountResult.rows[0]?.count || '0', 10);
        results.checks.xeroAccountMappings = {
          success: true,
          accountCount,
          message: `Found ${accountCount} account mapping(s) for organization`,
        };
      } catch (error) {
        console.error('[DB Test] xero_account_mappings query failed:', error);
        results.checks.xeroAccountMappings = {
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
          message: 'Failed to query xero_account_mappings table',
        };
      }
    }

    // Overall assessment
    const allTablesExist = Object.values(results.checks.tableExistence).every(check =>
      check.exists === true
    );

    const allQueriesWork = [
      results.checks.xeroConnections?.success !== false,
      results.checks.xeroEntityMappings?.success !== false,
      results.checks.xeroAccountMappings?.success !== false,
    ].every(success => success);

    const databaseReady = allTablesExist && allQueriesWork;

    return NextResponse.json({
      ...results,
      status: databaseReady ? 'DATABASE_READY' : 'DATABASE_ISSUES',
      message: databaseReady
        ? 'Database schema and queries are working correctly'
        : 'Database schema or queries have issues',
    });

  } catch (error) {
    console.error('[DB Test] Unexpected error:', error);
    return NextResponse.json({
      ...results,
      status: 'ERROR',
      error: error instanceof Error ? error.message : 'Unknown error',
      message: 'Database test failed with unexpected error',
    }, { status: 500 });
  }
}