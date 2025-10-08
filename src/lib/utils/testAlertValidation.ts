/**
 * Test utility to verify alert validation fixes
 * Run this to test the alert validation improvements
 */

import { validateAlertItems, debugAlertStructure, transformAlertItem } from './dataValidation';

// Sample alert data that mimics the API structure
const sampleApiAlerts = [
  // Valid alert (should pass)
  {
    id: 'low_stock_123',
    type: 'low_stock',
    severity: 'high',
    title: 'Low Stock Alert',
    message: 'Product ABC is running low (5 remaining)',
    itemId: '123',
    itemName: 'Product ABC',
    itemSku: 'ABC-001',
    currentValue: 5,
    threshold: 10,
    supplierName: 'Supplier XYZ',
    status: 'active',
    isRead: false,
    isActive: true,
    priority: 75,
    createdAt: new Date('2024-01-15T10:00:00Z'),
    updatedAt: new Date('2024-01-15T10:00:00Z'),
    warehouseId: 'wh_001',
    warehouseName: 'Main Warehouse',
    assignedTo: null,
    assignedToName: null,
    acknowledgedBy: null,
    acknowledgedAt: null,
    resolvedBy: null,
    resolvedAt: null,
    snoozedUntil: null,
    escalationLevel: 0
  },

  // Alert with missing optional fields (should pass after transformation)
  {
    id: 'out_of_stock_456',
    type: 'out_of_stock',
    severity: 'critical',
    title: 'Out of Stock Alert',
    message: 'Product DEF is completely out of stock',
    createdAt: '2024-01-15T11:00:00Z',
    isRead: false
  },

  // Alert with wrong severity name (should be fixed by mapping)
  {
    id: 'alert_789',
    type: 'quality_issue',
    severity: 'warn', // Should be mapped to 'warning'
    title: 'Quality Issue',
    message: 'Quality issue detected',
    createdAt: new Date('2024-01-15T12:00:00Z'),
    isRead: true
  },

  // Invalid alert - missing required fields (should fail or use fallback)
  {
    id: 'invalid_alert',
    type: 'unknown_type', // Invalid type
    severity: 'invalid_severity', // Invalid severity
    // Missing title and message
    createdAt: '2024-01-15T13:00:00Z'
  },

  // Completely invalid object
  {
    notAnAlert: true,
    randomField: 'value'
  }
];

export function testAlertValidation() {
  console.log('🧪 Testing Alert Validation');
  console.log('================================');

  // Debug the structure of sample alerts
  console.log('\n1. Raw Alert Structure Analysis:');
  debugAlertStructure(sampleApiAlerts);

  // Transform alerts
  console.log('\n2. Transforming Alerts:');
  const transformedAlerts = sampleApiAlerts.map((alert, index) => {
    console.log(`Transforming alert ${index}:`, { before: alert.severity, after: transformAlertItem(alert).severity });
    return transformAlertItem(alert);
  });

  // Validate alerts
  console.log('\n3. Validating Alerts:');
  const validatedAlerts = validateAlertItems(transformedAlerts);

  console.log('\n4. Validation Results:');
  console.log(`Original count: ${sampleApiAlerts.length}`);
  console.log(`Validated count: ${validatedAlerts.length}`);
  console.log(`Success rate: ${((validatedAlerts.length / sampleApiAlerts.length) * 100).toFixed(1)}%`);

  console.log('\n5. Validated Alert Summary:');
  validatedAlerts.forEach((alert, index) => {
    console.log(`Alert ${index}:`, {
      id: alert.id,
      type: alert.type,
      severity: alert.severity,
      title: alert.title,
      isRead: alert.isRead,
      hasOptionalFields: !!(alert.status || alert.priority || alert.itemId)
    });
  });

  return {
    original: sampleApiAlerts.length,
    validated: validatedAlerts.length,
    successRate: (validatedAlerts.length / sampleApiAlerts.length) * 100,
    alerts: validatedAlerts
  };
}

// Export for testing in browser console
if (typeof window !== 'undefined') {
  (window as any).testAlertValidation = testAlertValidation;
}