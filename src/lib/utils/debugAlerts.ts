/**
 * Debug script to identify and fix alert validation issues
 */

import { validateAlertItems, debugAlertStructure, transformAlertItem } from './dataValidation';

// Sample alert data structure based on the API
const sampleApiAlerts = [
  {
    id: 'low_stock_1',
    type: 'low_stock',
    severity: 'high',
    title: 'Low Stock Alert',
    message: 'Test Item is running low (5 remaining)',
    itemId: '1',
    itemName: 'Test Item',
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
    warehouseId: null,
    warehouseName: null,
    assignedTo: null,
    assignedToName: null,
    acknowledgedBy: null,
    acknowledgedAt: null,
    resolvedBy: null,
    resolvedAt: null,
    snoozedUntil: null,
    escalationLevel: 0,
  },
  {
    // Problematic alert - missing type field
    id: 'broken_alert_1',
    // type missing!
    severity: 'info', // not in validation enum
    title: 'Broken Alert',
    message: 'This alert should fail validation',
    isRead: 'false', // string instead of boolean
    createdAt: '2024-01-01T00:00:00.000Z', // string instead of date
  },
];

export function debugAlertValidation() {
  console.log('🔍 Debug: Starting alert validation test');

  console.log('\n📊 Original alert structure:');
  debugAlertStructure(sampleApiAlerts, 2);

  console.log('\n🔄 Transforming alerts:');
  const transformedAlerts = sampleApiAlerts.map(transformAlertItem);
  debugAlertStructure(transformedAlerts, 2);

  console.log('\n✅ Validating transformed alerts:');
  const validatedAlerts = validateAlertItems(transformedAlerts);

  console.log(
    `\n📈 Results: ${validatedAlerts.length}/${sampleApiAlerts.length} alerts validated successfully`
  );

  return validatedAlerts;
}

// Run if called directly
if (require.main === module) {
  debugAlertValidation();
}
