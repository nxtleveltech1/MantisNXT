/**
 * Test script to validate alert validation fixes
 */

import {
  validateAlertItems,
  debugAlertStructure,
  transformAlertItem,
  isValidAlertItem,
} from './dataValidation';

// Test cases that simulate the problematic alerts from the API
const testAlerts = [
  // Valid alert (should pass)
  {
    id: 'low_stock_123',
    type: 'low_stock',
    severity: 'high',
    title: 'Low Stock Alert',
    message: 'Product running low',
    itemId: '123',
    itemName: 'Test Product',
    itemSku: 'TEST-001',
    currentValue: 5,
    threshold: 10,
    supplierName: 'Test Supplier',
    status: 'active',
    isRead: false,
    isActive: true,
    priority: 75,
    createdAt: new Date(),
    updatedAt: new Date(),
  },

  // Alert with string isRead (common API issue)
  {
    id: 'alert_456',
    type: 'out_of_stock',
    severity: 'critical',
    title: 'Out of Stock',
    message: 'Item completely out of stock',
    isRead: 'false', // String instead of boolean
    createdAt: new Date().toISOString(), // String date instead of Date object
  },

  // Minimal alert (should trigger fallback)
  {
    id: 'minimal_alert',
    title: 'Minimal Alert',
    message: 'Basic alert',
    // Missing type and severity - should use defaults
    createdAt: Date.now(), // Number timestamp instead of Date
  },

  // Broken alert (object-like but invalid)
  {
    id: 'broken_alert',
    // Missing most required fields
    someField: 'value',
    anotherField: 123,
  },

  // Numeric severity (should be mapped)
  {
    id: 'numeric_severity',
    type: 'quality_issue',
    severity: 3, // Numeric severity
    title: 'Quality Issue',
    message: 'Quality problem detected',
    isRead: 1, // Numeric boolean
    createdAt: '2024-01-01T10:00:00Z',
  },

  // Alert with alternative field names (should be handled by transform)
  {
    id: 'alternative_fields',
    type: 'performance_issue',
    severity: 'warn', // Should map to "warning"
    name: 'Performance Alert', // Should use as title fallback
    description: 'Performance degraded', // Should use as message fallback
    is_read: true, // Alternative field name
    created_at: '2024-01-01T10:00:00Z', // Alternative field name
    timestamp: '2024-01-01T11:00:00Z', // Alternative fallback
  },
];

function runTests() {
  console.log('🧪 Running Alert Validation Tests');
  console.log('='.repeat(50));

  // Test 1: Debug structure of test alerts
  console.log('\n📊 Test 1: Alert Structure Analysis');
  console.log('-'.repeat(30));
  debugAlertStructure(testAlerts, testAlerts.length);

  // Test 2: Individual transformation tests
  console.log('\n🔄 Test 2: Individual Transformation Tests');
  console.log('-'.repeat(30));
  testAlerts.forEach((alert, index) => {
    console.log(`\nTesting alert ${index} (${alert.id}):`);
    try {
      const transformed = transformAlertItem(alert);
      const isValid = isValidAlertItem(transformed);
      console.log(`  Transformation: ${isValid ? '✅ Success' : '❌ Failed'}`);
      if (!isValid) {
        console.log(`  Transformed result:`, transformed);
      }
    } catch (error) {
      console.log(
        `  Transformation: ❌ Error - ${error instanceof Error ? error.message : 'Unknown'}`
      );
    }
  });

  // Test 3: Full validation pipeline
  console.log('\n✅ Test 3: Full Validation Pipeline');
  console.log('-'.repeat(30));
  const transformedAlerts = testAlerts.map(transformAlertItem);
  const validatedAlerts = validateAlertItems(transformedAlerts);

  console.log(`\nResults:`);
  console.log(`  Input alerts: ${testAlerts.length}`);
  console.log(`  Validated alerts: ${validatedAlerts.length}`);
  console.log(
    `  Success rate: ${((validatedAlerts.length / testAlerts.length) * 100).toFixed(1)}%`
  );

  // Test 4: Edge cases
  console.log('\n🔧 Test 4: Edge Cases');
  console.log('-'.repeat(30));

  const edgeCases = [
    null,
    undefined,
    {},
    [],
    'string',
    123,
    { id: '', type: '', severity: '', title: '', message: '', createdAt: null },
  ];

  edgeCases.forEach((edgeCase, index) => {
    console.log(`Edge case ${index}:`, typeof edgeCase, edgeCase);
    try {
      const result = validateAlertItems([edgeCase]);
      console.log(`  Result: ${result.length} valid alerts`);
    } catch (error) {
      console.log(`  Error: ${error instanceof Error ? error.message : 'Unknown'}`);
    }
  });

  console.log('\n🏁 Tests Complete');
  return { total: testAlerts.length, validated: validatedAlerts.length };
}

// Export for use in other modules
export { runTests, testAlerts };

// Run tests if executed directly
if (typeof require !== 'undefined' && require.main === module) {
  runTests();
}
