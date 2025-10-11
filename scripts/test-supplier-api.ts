/**
 * Supplier API Endpoint Test Script
 * Tests both simple and enhanced supplier creation schemas
 */

import { query } from '../src/lib/database/unified-connection';

interface SupplierTestResult {
  test: string;
  success: boolean;
  supplierId?: string;
  error?: string;
  data?: any;
}

const results: SupplierTestResult[] = [];

async function testSimpleSupplierCreation() {
  console.log('\n🧪 TEST 1: Simple Supplier Schema');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  const testData = {
    name: "Test Simple Supplier",
    email: "test@simple.com",
    phone: "+27 11 111 1111",
    address: "123 Test Street",
    contact_person: "Test Person",
    payment_terms: "30 days",
  };

  try {
    const contactInfo = {
      email: testData.email || "",
      phone: testData.phone || "",
      address: testData.address,
      contact_person: testData.contact_person || "",
    };

    const code = testData.name
      .substring(0, 10)
      .toUpperCase()
      .replace(/[^A-Z0-9]/g, "");

    const insertQuery = `
      INSERT INTO core.supplier (
        name,
        code,
        contact_info,
        active,
        default_currency,
        payment_terms,
        created_at,
        updated_at
      ) VALUES (
        $1, $2, $3::jsonb, true, 'USD', $4, NOW(), NOW()
      ) RETURNING supplier_id as id, *
    `;

    const result = await query(insertQuery, [
      testData.name,
      code,
      JSON.stringify(contactInfo),
      testData.payment_terms || "30 days",
    ]);

    console.log('✅ Simple supplier created successfully');
    console.log('   Supplier ID:', result.rows[0].id);
    console.log('   Name:', result.rows[0].name);
    console.log('   Code:', result.rows[0].code);

    results.push({
      test: 'Simple Supplier Creation',
      success: true,
      supplierId: result.rows[0].id,
      data: result.rows[0],
    });
  } catch (error) {
    console.error('❌ Simple supplier creation failed:', error);
    results.push({
      test: 'Simple Supplier Creation',
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}

async function testEnhancedSupplierCreation() {
  console.log('\n🧪 TEST 2: Enhanced Supplier Schema');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  const testData = {
    name: "Test Enhanced Supplier Corp",
    code: "TESTENHANCED",
    website: "https://testenhanced.com",
    currency: "ZAR",
    primaryContact: {
      name: "Jane Doe",
      email: "jane@testenhanced.com",
      phone: "+27 11 222 2222",
      title: "Sales Manager",
    },
    address: {
      street: "456 Business Avenue",
      city: "Cape Town",
      state: "Western Cape",
      postalCode: "8001",
      country: "South Africa",
    },
    paymentTerms: "Net 30",
  };

  try {
    const contactInfo = {
      email: testData.primaryContact?.email || "",
      phone: testData.primaryContact?.phone || "",
      website: testData.website || "",
      contact_person: testData.primaryContact?.name || "",
      job_title: testData.primaryContact?.title || "",
      address: testData.address
        ? {
            street: testData.address.street,
            city: testData.address.city,
            state: testData.address.state,
            postalCode: testData.address.postalCode,
            country: testData.address.country,
          }
        : null,
    };

    const insertQuery = `
      INSERT INTO core.supplier (
        name,
        code,
        contact_info,
        active,
        default_currency,
        payment_terms,
        created_at,
        updated_at
      ) VALUES (
        $1, $2, $3::jsonb, true, $4, $5, NOW(), NOW()
      ) RETURNING supplier_id as id, *
    `;

    const result = await query(insertQuery, [
      testData.name,
      testData.code,
      JSON.stringify(contactInfo),
      testData.currency || "USD",
      testData.paymentTerms || "30 days",
    ]);

    console.log('✅ Enhanced supplier created successfully');
    console.log('   Supplier ID:', result.rows[0].id);
    console.log('   Name:', result.rows[0].name);
    console.log('   Code:', result.rows[0].code);
    console.log('   Currency:', result.rows[0].default_currency);

    results.push({
      test: 'Enhanced Supplier Creation',
      success: true,
      supplierId: result.rows[0].id,
      data: result.rows[0],
    });
  } catch (error) {
    console.error('❌ Enhanced supplier creation failed:', error);
    results.push({
      test: 'Enhanced Supplier Creation',
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}

async function testActiveMusicDistributionData() {
  console.log('\n🧪 TEST 3: Active Music Distribution (Real Data)');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  try {
    const result = await query(
      `SELECT
        supplier_id as id,
        name,
        code,
        active,
        default_currency,
        payment_terms,
        contact_info,
        created_at
      FROM core.supplier
      WHERE name = $1`,
      ['Active Music Distribution']
    );

    if (result.rows.length > 0) {
      console.log('✅ Active Music Distribution found in database');
      console.log('   Supplier ID:', result.rows[0].id);
      console.log('   Name:', result.rows[0].name);
      console.log('   Code:', result.rows[0].code);
      console.log('   Currency:', result.rows[0].default_currency);
      console.log('   Payment Terms:', result.rows[0].payment_terms);
      console.log('   Contact:', result.rows[0].contact_info);

      results.push({
        test: 'Active Music Distribution Verification',
        success: true,
        supplierId: result.rows[0].id,
        data: result.rows[0],
      });
    } else {
      console.log('⚠️  Active Music Distribution not found');
      results.push({
        test: 'Active Music Distribution Verification',
        success: false,
        error: 'Supplier not found in database',
      });
    }
  } catch (error) {
    console.error('❌ Verification failed:', error);
    results.push({
      test: 'Active Music Distribution Verification',
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}

async function runTests() {
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║     SUPPLIER API ENDPOINT TESTING SUITE                   ║');
  console.log('╚════════════════════════════════════════════════════════════╝');

  await testActiveMusicDistributionData();
  await testSimpleSupplierCreation();
  await testEnhancedSupplierCreation();

  console.log('\n╔════════════════════════════════════════════════════════════╗');
  console.log('║     TEST RESULTS SUMMARY                                   ║');
  console.log('╚════════════════════════════════════════════════════════════╝\n');

  const totalTests = results.length;
  const passedTests = results.filter(r => r.success).length;
  const failedTests = totalTests - passedTests;

  results.forEach((result, index) => {
    const icon = result.success ? '✅' : '❌';
    console.log(`${icon} Test ${index + 1}: ${result.test}`);
    if (result.supplierId) {
      console.log(`   Supplier ID: ${result.supplierId}`);
    }
    if (result.error) {
      console.log(`   Error: ${result.error}`);
    }
  });

  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`Total: ${totalTests} | Passed: ${passedTests} | Failed: ${failedTests}`);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  if (failedTests === 0) {
    console.log('🎉 ALL TESTS PASSED! Supplier creation is fully operational.');
  } else {
    console.log('⚠️  SOME TESTS FAILED. Review the errors above.');
    process.exit(1);
  }
}

runTests().catch(error => {
  console.error('Fatal error running tests:', error);
  process.exit(1);
});
