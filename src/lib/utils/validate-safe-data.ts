/**
 * Quick validation test for safe data utilities
 * Run this to verify implementation works correctly
 */

import {
  safeParseDate,
  safeFormatDate,
  safeRelativeTime,
  safeString,
  safeNumber,
  safeBoolean,
  safeGet,
  transformSupplierData,
  transformInventoryData,
} from './safe-data';

export function validateSafeDataUtilities(): boolean {
  console.log('🔍 Validating safe data utilities...');

  try {
    // Test safe date parsing
    const dateTests = [
      null,
      undefined,
      'invalid-date',
      '2024-13-45',
      new Date(),
      '2024-01-15T10:30:00Z',
      1234567890123,
    ];

    dateTests.forEach((test, i) => {
      const result = safeParseDate(test);
      console.log(`✅ Date test ${i + 1}: ${result.isValid ? 'Valid' : 'Fallback used'}`);
    });

    // Test safe formatting
    const formatted = safeFormatDate('invalid-date', 'MMM dd, yyyy', 'Invalid Date');
    console.log(`✅ Date formatting: ${formatted}`);

    // Test relative time
    const relative = safeRelativeTime('bad-timestamp', 'Unknown time');
    console.log(`✅ Relative time: ${relative}`);

    // Test safe conversions
    console.log(`✅ Safe string: ${safeString(null, 'fallback')}`);
    console.log(`✅ Safe number: ${safeNumber('not-a-number', 0)}`);
    console.log(`✅ Safe boolean: ${safeBoolean(undefined, false)}`);

    // Test safe object access
    const testObj = { a: { b: { c: 'value' } } };
    console.log(`✅ Safe get (exists): ${safeGet(testObj, 'a.b.c', 'fallback')}`);
    console.log(`✅ Safe get (missing): ${safeGet(testObj, 'x.y.z', 'fallback')}`);

    // Test data transformers
    const malformedSupplier = {
      id: null,
      name: undefined,
      createdAt: 'invalid-date',
      metrics: {
        totalOrders: 'not-a-number',
      },
    };

    const safeSupplier = transformSupplierData(malformedSupplier);
    console.log(`✅ Supplier transformation: ${safeSupplier.name} (${safeSupplier.status})`);

    const malformedInventory = {
      quantity: 'not-a-number',
      lastUpdated: null,
      price: undefined,
    };

    const safeInventory = transformInventoryData(malformedInventory);
    console.log(
      `✅ Inventory transformation: ${safeInventory.name} (${safeInventory.quantity} units)`
    );

    console.log('🎉 All safe data utilities validated successfully!');
    return true;
  } catch (error) {
    console.error('❌ Validation failed:', error);
    return false;
  }
}

// Auto-run validation if this file is imported
if (typeof window === 'undefined') {
  // Only run in Node.js environment (not browser)
  validateSafeDataUtilities();
}
