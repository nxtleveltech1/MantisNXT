/**
 * Test script to verify supplier deletion works correctly
 * This tests that:
 * 1. Suppliers can be deleted via API
 * 2. Deleted suppliers are removed from the database
 * 3. Fetching suppliers after deletion doesn't include deleted ones
 */

const BASE_URL = 'http://localhost:3000/api';

// ANSI color codes for console output
const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  reset: '\x1b[0m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

async function fetchSuppliers() {
  try {
    const response = await fetch(`${BASE_URL}/suppliers`);
    const data = await response.json();
    if (data.success && data.data) {
      return data.data;
    }
    throw new Error(data.error || 'Failed to fetch suppliers');
  } catch (error) {
    log(`Error fetching suppliers: ${error.message}`, 'red');
    throw error;
  }
}

async function createTestSupplier() {
  try {
    const response = await fetch(`${BASE_URL}/suppliers`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: `Test Supplier ${Date.now()}`,
        supplier_code: `TEST-${Date.now()}`,
        status: 'active',
        performance_tier: 'tier_3',
        primary_category: 'Test Category',
        email: 'test@example.com',
        phone: '1234567890'
      })
    });

    const data = await response.json();
    if (data.success && data.data) {
      return data.data;
    }
    throw new Error(data.error || 'Failed to create test supplier');
  } catch (error) {
    log(`Error creating test supplier: ${error.message}`, 'red');
    throw error;
  }
}

async function deleteSupplier(id) {
  try {
    const response = await fetch(`${BASE_URL}/suppliers/${id}`, {
      method: 'DELETE'
    });

    const data = await response.json();
    if (!data.success) {
      throw new Error(data.error || 'Failed to delete supplier');
    }
    return data;
  } catch (error) {
    log(`Error deleting supplier: ${error.message}`, 'red');
    throw error;
  }
}

async function testSupplierDeletion() {
  log('\n========================================', 'blue');
  log('Testing Supplier Deletion Flow', 'blue');
  log('========================================\n', 'blue');

  try {
    // Step 1: Get initial supplier count
    log('Step 1: Fetching initial suppliers...', 'yellow');
    const initialSuppliers = await fetchSuppliers();
    const initialCount = initialSuppliers.length;
    log(`Initial supplier count: ${initialCount}`, 'green');

    // Step 2: Create a test supplier
    log('\nStep 2: Creating test supplier...', 'yellow');
    const testSupplier = await createTestSupplier();
    log(`Created test supplier: ${testSupplier.name} (ID: ${testSupplier.id})`, 'green');

    // Step 3: Verify the supplier was added
    log('\nStep 3: Verifying supplier was added...', 'yellow');
    const suppliersAfterCreate = await fetchSuppliers();
    const afterCreateCount = suppliersAfterCreate.length;

    if (afterCreateCount === initialCount + 1) {
      log(`✓ Supplier count increased from ${initialCount} to ${afterCreateCount}`, 'green');
    } else {
      throw new Error(`Expected ${initialCount + 1} suppliers, but got ${afterCreateCount}`);
    }

    // Verify the specific supplier exists
    const foundSupplier = suppliersAfterCreate.find(s => s.id === testSupplier.id);
    if (!foundSupplier) {
      throw new Error('Created supplier not found in list');
    }
    log(`✓ Test supplier found in list`, 'green');

    // Step 4: Delete the test supplier
    log(`\nStep 4: Deleting test supplier (ID: ${testSupplier.id})...`, 'yellow');
    const deleteResult = await deleteSupplier(testSupplier.id);
    log(`Delete result: ${deleteResult.message}`, 'green');

    // Step 5: Verify the supplier was deleted
    log('\nStep 5: Verifying supplier was deleted...', 'yellow');
    const suppliersAfterDelete = await fetchSuppliers();
    const afterDeleteCount = suppliersAfterDelete.length;

    if (afterDeleteCount === initialCount) {
      log(`✓ Supplier count restored to ${initialCount}`, 'green');
    } else {
      log(`✗ Expected ${initialCount} suppliers, but got ${afterDeleteCount}`, 'red');
    }

    // Verify the specific supplier is gone
    const stillExists = suppliersAfterDelete.find(s => s.id === testSupplier.id);
    if (stillExists) {
      throw new Error('Deleted supplier still exists in list!');
    }
    log(`✓ Test supplier successfully removed from list`, 'green');

    // Step 6: Test refresh behavior (simulate browser refresh)
    log('\nStep 6: Testing refresh behavior...', 'yellow');
    await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1 second

    const suppliersAfterRefresh = await fetchSuppliers();
    const afterRefreshCount = suppliersAfterRefresh.length;

    if (afterRefreshCount === initialCount) {
      log(`✓ After simulated refresh, count is still ${initialCount}`, 'green');
    } else {
      log(`✗ After refresh, expected ${initialCount} but got ${afterRefreshCount}`, 'red');
    }

    const stillExistsAfterRefresh = suppliersAfterRefresh.find(s => s.id === testSupplier.id);
    if (stillExistsAfterRefresh) {
      throw new Error('Deleted supplier reappeared after refresh!');
    }
    log(`✓ Deleted supplier remains absent after refresh`, 'green');

    // Success!
    log('\n========================================', 'green');
    log('✓ ALL TESTS PASSED!', 'green');
    log('Supplier deletion is working correctly!', 'green');
    log('========================================\n', 'green');

    process.exit(0);
  } catch (error) {
    log('\n========================================', 'red');
    log('✗ TEST FAILED!', 'red');
    log(`Error: ${error.message}`, 'red');
    log('========================================\n', 'red');
    process.exit(1);
  }
}

// Wait a bit for the server to start, then run the test
setTimeout(() => {
  testSupplierDeletion();
}, 3000);