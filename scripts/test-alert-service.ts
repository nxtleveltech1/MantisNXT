/**
 * Test script for AI Alert Service
 * Run with: npx tsx scripts/test-alert-service.ts
 */

import { alertService } from '../src/lib/ai/services/alert-service';

const TEST_ORG_ID = process.env.DEFAULT_ORG_ID || '00000000-0000-0000-0000-000000000000';
const TEST_USER_ID = 'dev-user-123';

async function testAlertService() {
  console.log('🧪 Testing AI Alert Service\n');

  try {
    // Test 1: Create a test alert
    console.log('📝 Test 1: Creating test alert...');
    const newAlert = await alertService.createAlert(TEST_ORG_ID, {
      serviceType: 'anomaly_detection',
      severity: 'high',
      title: 'Test Alert - High Stock Variance',
      message: 'Detected unusual stock movement in warehouse A',
      entityType: 'product',
      entityId: '11111111-1111-1111-1111-111111111111',
      metadata: {
        warehouse: 'A',
        variance: 45.2,
        threshold: 30,
      },
      recommendations: [
        {
          action: 'verify_stock_count',
          priority: 'high',
          description: 'Perform physical stock count for verification',
        },
      ],
    });
    console.log('✅ Alert created:', {
      id: newAlert.id,
      title: newAlert.title,
      severity: newAlert.severity,
      service_type: newAlert.service_type,
    });
    console.log('');

    // Test 2: List all alerts
    console.log('📋 Test 2: Listing all alerts...');
    const listResult = await alertService.listAlerts(TEST_ORG_ID, {
      limit: 10,
      offset: 0,
    });
    console.log(`✅ Found ${listResult.total} alerts (showing ${listResult.alerts.length})`);
    console.log('');

    // Test 3: Get alert by ID
    console.log('🔍 Test 3: Fetching alert by ID...');
    const fetchedAlert = await alertService.getAlertById(newAlert.id, TEST_ORG_ID);
    console.log('✅ Alert fetched:', {
      id: fetchedAlert.id,
      title: fetchedAlert.title,
      is_acknowledged: fetchedAlert.is_acknowledged,
      is_resolved: fetchedAlert.is_resolved,
    });
    console.log('');

    // Test 4: Acknowledge alert
    console.log('👍 Test 4: Acknowledging alert...');
    const acknowledgedAlert = await alertService.acknowledgeAlert(
      newAlert.id,
      TEST_USER_ID,
      TEST_ORG_ID
    );
    console.log('✅ Alert acknowledged:', {
      is_acknowledged: acknowledgedAlert.is_acknowledged,
      acknowledged_by: acknowledgedAlert.acknowledged_by,
      acknowledged_at: acknowledgedAlert.acknowledged_at,
    });
    console.log('');

    // Test 5: List alerts with filters
    console.log('🔎 Test 5: Listing alerts with filters (severity: high)...');
    const filteredResult = await alertService.listAlerts(TEST_ORG_ID, {
      severity: 'high',
      limit: 10,
    });
    console.log(`✅ Found ${filteredResult.total} high-severity alerts`);
    console.log('');

    // Test 6: Get alert statistics
    console.log('📊 Test 6: Getting alert statistics...');
    const stats = await alertService.getAlertStats(TEST_ORG_ID);
    console.log('✅ Alert statistics:', {
      total: stats.total,
      unresolved_count: stats.unresolved_count,
      acknowledged_count: stats.acknowledged_count,
      by_severity: stats.by_severity,
      by_status: stats.by_status,
    });
    console.log('');

    // Test 7: Resolve alert
    console.log('✔️ Test 7: Resolving alert...');
    const resolvedAlert = await alertService.resolveAlert(newAlert.id, TEST_ORG_ID);
    console.log('✅ Alert resolved:', {
      is_resolved: resolvedAlert.is_resolved,
      resolved_at: resolvedAlert.resolved_at,
    });
    console.log('');

    // Test 8: Try to acknowledge already resolved alert (should fail)
    console.log('❌ Test 8: Testing error handling (acknowledge resolved alert)...');
    try {
      await alertService.acknowledgeAlert(newAlert.id, TEST_USER_ID, TEST_ORG_ID);
      console.log('⚠️  Should have thrown an error');
    } catch (error) {
      console.log('✅ Correctly threw error:', (error as Error).message);
    }
    console.log('');

    // Test 9: Delete test alert (cleanup)
    console.log('🗑️  Test 9: Cleaning up - deleting test alert...');
    await alertService.deleteAlert(newAlert.id, TEST_ORG_ID);
    console.log('✅ Alert deleted');
    console.log('');

    console.log('🎉 All tests passed!\n');
  } catch (error) {
    console.error('❌ Test failed:', error);
    process.exit(1);
  }
}

// Run tests
testAlertService()
  .then(() => {
    console.log('✅ Test script completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Test script failed:', error);
    process.exit(1);
  });
