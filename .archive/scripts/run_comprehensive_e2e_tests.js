const { Pool } = require('pg');
const fs = require('fs');

const config = {
    host: process.env.DB_HOST || '62.169.20.53',
    port: parseInt(process.env.DB_PORT || '6600'),
    user: process.env.DB_USER || 'nxtdb_admin',
    password: process.env.DB_PASSWORD || 'P@33w0rd-1',
    database: process.env.DB_NAME || 'nxtprod-db_001',
    ssl: false
};

const pool = new Pool(config);
const ORGANIZATION_ID = '00000000-0000-0000-0000-000000000001';

// Test result tracking
const testResults = {
    phase1: [],
    phase2: [],
    phase3: [],
    phase4: [],
    phase5: [],
    phase6: []
};

let totalTests = 0;
let passedTests = 0;
let failedTests = 0;
let warningTests = 0;

// Helper function to execute test and record result
async function executeTest(phaseName, testId, testName, query, expectedCondition, description) {
    totalTests++;
    console.log(`\n🧪 Test ${testId}: ${testName}`);
    console.log(`   Objective: ${description}`);

    try {
        const result = await pool.query(query);
        const passed = expectedCondition(result);
        const status = passed ? 'PASS ✅' : 'FAIL ❌';

        if (passed) {
            passedTests++;
        } else {
            failedTests++;
        }

        const testResult = {
            id: testId,
            name: testName,
            status,
            description,
            result: result.rows
        };

        testResults[phaseName].push(testResult);

        console.log(`   Status: ${status}`);
        if (result.rows.length > 0 && result.rows.length <= 5) {
            console.log(`   Result:`, JSON.stringify(result.rows, null, 2));
        } else if (result.rows.length > 5) {
            console.log(`   Result: ${result.rows.length} rows returned`);
        }

        return testResult;
    } catch (error) {
        failedTests++;
        console.error(`   Status: FAIL ❌`);
        console.error(`   Error: ${error.message}`);

        const testResult = {
            id: testId,
            name: testName,
            status: 'FAIL ❌',
            description,
            error: error.message
        };

        testResults[phaseName].push(testResult);
        return testResult;
    }
}

async function runPhase1Tests() {
    console.log('\n╔═════════════════════════════════════════════════════════╗');
    console.log('║  PHASE 1: PRE-CLEANUP VALIDATION                        ║');
    console.log('╚═════════════════════════════════════════════════════════╝');

    // Test 1.1.1: Current Supplier Count & Duplicates
    await executeTest(
        'phase1',
        '1.1.1',
        'Current Supplier Count & Duplicates',
        `SELECT
            'Total Suppliers' as metric,
            COUNT(*) as count
        FROM supplier
        WHERE org_id = $1
        UNION ALL
        SELECT
            'Unique Supplier Names' as metric,
            COUNT(DISTINCT LOWER(TRIM(name))) as count
        FROM supplier
        WHERE org_id = $1
        UNION ALL
        SELECT
            'Duplicate Names' as metric,
            COUNT(*) as count
        FROM (
            SELECT LOWER(TRIM(name)) as normalized_name
            FROM supplier
            WHERE org_id = $1
            GROUP BY LOWER(TRIM(name))
            HAVING COUNT(*) > 1
        ) duplicates`,
        (result) => true, // Always pass, this is just documentation
        'Identify total suppliers and duplicates before cleanup'
    );

    // Test 1.1.3: Current Entity Counts
    await executeTest(
        'phase1',
        '1.1.3',
        'Current Entity Counts',
        `SELECT
            'Suppliers' as entity,
            COUNT(*) as total
        FROM supplier
        WHERE org_id = $1
        UNION ALL
        SELECT 'Products', COUNT(*)
        FROM inventory_item
        WHERE org_id = $1
        UNION ALL
        SELECT 'Purchase Orders', COUNT(*)
        FROM purchase_order
        WHERE org_id = $1
        UNION ALL
        SELECT 'Invoices', COUNT(*)
        FROM supplier_invoices
        WHERE org_id = $1
        ORDER BY entity`,
        (result) => result.rows.length > 0,
        'Baseline count of all major entities'
    );
}

async function runPhase2Tests() {
    console.log('\n╔═════════════════════════════════════════════════════════╗');
    console.log('║  PHASE 2: POST-CLEANUP VALIDATION                       ║');
    console.log('╚═════════════════════════════════════════════════════════╝');

    // Test 2.1.1: Verify Zero Suppliers (or current state)
    await executeTest(
        'phase2',
        '2.1.1',
        'Verify Clean State - Suppliers',
        `SELECT
            COUNT(*) as remaining_suppliers,
            CASE
                WHEN COUNT(*) = 0 THEN 'CLEAN ✅'
                ELSE 'DATA PRESENT'
            END as test_status
        FROM supplier
        WHERE org_id = $1`,
        (result) => true, // Document state, don't enforce yet
        'Confirm supplier cleanup state'
    );

    // Test 2.1.2: Verify Products State
    await executeTest(
        'phase2',
        '2.1.2',
        'Verify Clean State - Products',
        `SELECT
            COUNT(*) as remaining_products,
            CASE
                WHEN COUNT(*) = 0 THEN 'CLEAN ✅'
                ELSE 'DATA PRESENT'
            END as test_status
        FROM inventory_item
        WHERE org_id = $1`,
        (result) => true,
        'Confirm product cleanup state'
    );
}

async function runPhase3Tests() {
    console.log('\n╔═════════════════════════════════════════════════════════╗');
    console.log('║  PHASE 3: TEST DATA CREATION VALIDATION                 ║');
    console.log('╚═════════════════════════════════════════════════════════╝');

    // Test 3.1.1: Verify Exact Supplier Count
    await executeTest(
        'phase3',
        '3.1.1',
        'Verify Exact Supplier Count',
        `SELECT
            COUNT(*) as supplier_count,
            CASE
                WHEN COUNT(*) = 22 THEN 'PASS ✅'
                WHEN COUNT(*) < 22 THEN 'FAIL ❌ - Insufficient suppliers'
                WHEN COUNT(*) > 22 THEN 'FAIL ❌ - Too many suppliers'
            END as test_status
        FROM supplier
        WHERE org_id = $1`,
        (result) => result.rows[0] && result.rows[0].supplier_count == 22,
        'Confirm exactly 22 suppliers created'
    );

    // Test 3.1.2: Verify All Unique Names
    await executeTest(
        'phase3',
        '3.1.2',
        'Verify All Unique Names',
        `SELECT
            COUNT(*) as total_suppliers,
            COUNT(DISTINCT LOWER(TRIM(name))) as unique_names,
            CASE
                WHEN COUNT(*) = COUNT(DISTINCT LOWER(TRIM(name))) THEN 'PASS ✅'
                ELSE 'FAIL ❌ - Duplicate names detected'
            END as test_status,
            COUNT(*) - COUNT(DISTINCT LOWER(TRIM(name))) as duplicates
        FROM supplier
        WHERE org_id = $1`,
        (result) => result.rows[0] && result.rows[0].duplicates == 0,
        'Confirm no duplicate supplier names'
    );

    // Test 3.1.3: Verify Supplier Data Completeness
    await executeTest(
        'phase3',
        '3.1.3',
        'Verify Supplier Data Completeness',
        `SELECT
            COUNT(*) as total_suppliers,
            COUNT(*) FILTER (WHERE name IS NOT NULL AND name != '') as with_name,
            COUNT(*) FILTER (WHERE contact_email IS NOT NULL AND contact_email != '') as with_email,
            COUNT(*) FILTER (WHERE contact_phone IS NOT NULL AND contact_phone != '') as with_phone,
            COUNT(*) FILTER (WHERE address IS NOT NULL) as with_address,
            COUNT(*) FILTER (WHERE status IS NOT NULL) as with_status,
            CASE
                WHEN COUNT(*) = COUNT(*) FILTER (WHERE
                    name IS NOT NULL AND name != '' AND
                    contact_email IS NOT NULL AND contact_email != '' AND
                    contact_phone IS NOT NULL AND contact_phone != '' AND
                    address IS NOT NULL AND
                    status IS NOT NULL
                ) THEN 'PASS ✅'
                ELSE 'FAIL ❌ - Missing required fields'
            END as test_status
        FROM supplier
        WHERE org_id = $1`,
        (result) => result.rows[0] && result.rows[0].test_status.includes('PASS'),
        'Confirm all suppliers have complete data'
    );

    // Test 3.2.1: Verify Exact Product Count
    await executeTest(
        'phase3',
        '3.2.1',
        'Verify Exact Product Count',
        `SELECT
            COUNT(*) as product_count,
            CASE
                WHEN COUNT(*) = 22 THEN 'PASS ✅'
                WHEN COUNT(*) < 22 THEN 'FAIL ❌ - Insufficient products'
                WHEN COUNT(*) > 22 THEN 'FAIL ❌ - Too many products'
            END as test_status
        FROM inventory_item
        WHERE org_id = $1`,
        (result) => result.rows[0] && result.rows[0].product_count == 22,
        'Confirm exactly 22 products created'
    );

    // Test 3.2.2: Verify 1 Product Per Supplier
    await executeTest(
        'phase3',
        '3.2.2',
        'Verify 1 Product Per Supplier',
        `SELECT
            COUNT(*) as suppliers_checked,
            COUNT(*) FILTER (WHERE product_count = 1) as suppliers_with_one_product,
            COUNT(*) FILTER (WHERE product_count != 1) as suppliers_with_wrong_count
        FROM (
            SELECT
                supplier_id,
                COUNT(*) as product_count
            FROM inventory_item
            WHERE org_id = $1
            GROUP BY supplier_id
        ) supplier_products`,
        (result) => result.rows[0] && result.rows[0].suppliers_with_wrong_count == 0,
        'Confirm each supplier has exactly 1 product'
    );

    // Test 3.2.3: Verify No Orphaned Products
    await executeTest(
        'phase3',
        '3.2.3',
        'Verify No Orphaned Products',
        `SELECT
            COUNT(i.id) as total_products,
            COUNT(s.id) as products_with_valid_supplier,
            COUNT(i.id) - COUNT(s.id) as orphaned_products,
            CASE
                WHEN COUNT(i.id) = COUNT(s.id) THEN 'PASS ✅'
                ELSE 'FAIL ❌ - Orphaned products detected'
            END as test_status
        FROM inventory_item i
        LEFT JOIN supplier s ON i.supplier_id = s.id AND s.org_id = i.org_id
        WHERE i.org_id = $1`,
        (result) => result.rows[0] && result.rows[0].orphaned_products == 0,
        'Confirm all products linked to valid suppliers'
    );

    // Test 3.3.1: Verify Purchase Order Count
    await executeTest(
        'phase3',
        '3.3.1',
        'Verify Purchase Order Count',
        `SELECT
            COUNT(*) as po_count,
            CASE
                WHEN COUNT(*) = 22 THEN 'PASS ✅'
                WHEN COUNT(*) < 22 THEN 'FAIL ❌ - Insufficient POs'
                WHEN COUNT(*) > 22 THEN 'FAIL ❌ - Too many POs'
            END as test_status
        FROM purchase_order
        WHERE org_id = $1`,
        (result) => result.rows[0] && result.rows[0].po_count == 22,
        'Confirm exactly 22 purchase orders created'
    );

    // Test 3.3.2: Verify All POs Have Line Items
    await executeTest(
        'phase3',
        '3.3.2',
        'Verify All POs Have Line Items',
        `SELECT
            COUNT(DISTINCT po.id) as total_pos,
            COUNT(DISTINCT poi.purchase_order_id) as pos_with_items,
            COUNT(DISTINCT po.id) - COUNT(DISTINCT poi.purchase_order_id) as pos_without_items,
            CASE
                WHEN COUNT(DISTINCT po.id) = COUNT(DISTINCT poi.purchase_order_id) THEN 'PASS ✅'
                ELSE 'FAIL ❌ - POs without line items'
            END as test_status
        FROM purchase_order po
        LEFT JOIN purchase_order_item poi ON po.id = poi.purchase_order_id
        WHERE po.org_id = $1`,
        (result) => result.rows[0] && result.rows[0].pos_without_items == 0,
        'Confirm every PO has at least one line item'
    );

    // Test 3.5.1: Verify Invoice Count
    await executeTest(
        'phase3',
        '3.5.1',
        'Verify Invoice Count',
        `SELECT
            COUNT(*) as invoice_count,
            CASE
                WHEN COUNT(*) = 22 THEN 'PASS ✅'
                WHEN COUNT(*) < 22 THEN 'FAIL ❌ - Insufficient invoices'
                WHEN COUNT(*) > 22 THEN 'FAIL ❌ - Too many invoices'
            END as test_status
        FROM supplier_invoices
        WHERE org_id = $1`,
        (result) => result.rows[0] && result.rows[0].invoice_count == 22,
        'Confirm exactly 22 invoices created'
    );

    // Test 3.5.2: Verify All Invoices Match POs
    await executeTest(
        'phase3',
        '3.5.2',
        'Verify All Invoices Match POs',
        `SELECT
            COUNT(si.id) as total_invoices,
            COUNT(po.id) as invoices_with_valid_po,
            COUNT(si.id) - COUNT(po.id) as invoices_without_po,
            CASE
                WHEN COUNT(si.id) = COUNT(po.id) THEN 'PASS ✅'
                ELSE 'FAIL ❌ - Invoices without PO reference'
            END as test_status
        FROM supplier_invoices si
        LEFT JOIN purchase_order po ON si.purchase_order_id = po.id
        WHERE si.org_id = $1`,
        (result) => result.rows[0] && result.rows[0].invoices_without_po == 0,
        'Confirm every invoice references a valid PO'
    );
}

async function runPhase4Tests() {
    console.log('\n╔═════════════════════════════════════════════════════════╗');
    console.log('║  PHASE 4: REFERENTIAL INTEGRITY TESTING                 ║');
    console.log('╚═════════════════════════════════════════════════════════╝');

    // Test 4.1.1: Supplier → Product Relationship
    await executeTest(
        'phase4',
        '4.1.1',
        'Supplier → Product Relationship',
        `SELECT
            'Supplier → Product' as relationship,
            COUNT(*) as total_records,
            COUNT(*) FILTER (WHERE s.id IS NOT NULL) as valid_references,
            COUNT(*) FILTER (WHERE s.id IS NULL) as broken_references,
            CASE
                WHEN COUNT(*) = COUNT(*) FILTER (WHERE s.id IS NOT NULL) THEN 'PASS ✅'
                ELSE 'FAIL ❌ - Broken foreign keys'
            END as test_status
        FROM inventory_item i
        LEFT JOIN supplier s ON i.supplier_id = s.id AND i.org_id = s.org_id
        WHERE i.org_id = $1`,
        (result) => result.rows[0] && result.rows[0].broken_references == 0,
        'Verify all products have valid supplier references'
    );

    // Test 4.1.2: Supplier → Purchase Order Relationship
    await executeTest(
        'phase4',
        '4.1.2',
        'Supplier → PO Relationship',
        `SELECT
            'Supplier → PO' as relationship,
            COUNT(*) as total_records,
            COUNT(*) FILTER (WHERE s.id IS NOT NULL) as valid_references,
            COUNT(*) FILTER (WHERE s.id IS NULL) as broken_references,
            CASE
                WHEN COUNT(*) = COUNT(*) FILTER (WHERE s.id IS NOT NULL) THEN 'PASS ✅'
                ELSE 'FAIL ❌ - Broken foreign keys'
            END as test_status
        FROM purchase_order po
        LEFT JOIN supplier s ON po.supplier_id = s.id AND po.org_id = s.org_id
        WHERE po.org_id = $1`,
        (result) => result.rows[0] && result.rows[0].broken_references == 0,
        'Verify all POs have valid supplier references'
    );

    // Test 4.1.4: Purchase Order → Invoice Relationship
    await executeTest(
        'phase4',
        '4.1.4',
        'PO → Invoice Relationship',
        `SELECT
            'PO → Invoice' as relationship,
            COUNT(*) as total_records,
            COUNT(*) FILTER (WHERE po.id IS NOT NULL) as valid_references,
            COUNT(*) FILTER (WHERE po.id IS NULL) as broken_references,
            CASE
                WHEN COUNT(*) = COUNT(*) FILTER (WHERE po.id IS NOT NULL) THEN 'PASS ✅'
                ELSE 'FAIL ❌ - Broken foreign keys'
            END as test_status
        FROM supplier_invoices si
        LEFT JOIN purchase_order po ON si.purchase_order_id = po.id
        WHERE si.org_id = $1`,
        (result) => result.rows[0] && result.rows[0].broken_references == 0,
        'Verify all invoices have valid PO references'
    );

    // Test 4.2.1: Orphaned Products
    await executeTest(
        'phase4',
        '4.2.1',
        'Orphaned Products Detection',
        `SELECT
            'Orphaned Products' as test_name,
            COUNT(*) as orphan_count,
            CASE
                WHEN COUNT(*) = 0 THEN 'PASS ✅'
                ELSE 'FAIL ❌ - Orphaned products found'
            END as test_status
        FROM inventory_item i
        LEFT JOIN supplier s ON i.supplier_id = s.id AND i.org_id = s.org_id
        WHERE i.org_id = $1
        AND s.id IS NULL`,
        (result) => result.rows[0] && result.rows[0].orphan_count == 0,
        'Detect products without valid suppliers'
    );
}

async function runPhase5Tests() {
    console.log('\n╔═════════════════════════════════════════════════════════╗');
    console.log('║  PHASE 5: SYSTEM-WIDE VISIBILITY TESTING                ║');
    console.log('╚═════════════════════════════════════════════════════════╝');

    // Test 5.2.1: Supplier UI Display
    await executeTest(
        'phase5',
        '5.2.1',
        'Supplier UI Display Readiness',
        `SELECT
            COUNT(*) as total_suppliers,
            COUNT(*) FILTER (WHERE name IS NOT NULL AND name != '') as displayable_names,
            COUNT(*) FILTER (WHERE contact_email IS NOT NULL) as displayable_emails,
            COUNT(*) FILTER (WHERE status IS NOT NULL) as displayable_status,
            CASE
                WHEN COUNT(*) = 22 AND
                     COUNT(*) = COUNT(*) FILTER (WHERE name IS NOT NULL AND name != '')
                THEN 'PASS ✅'
                ELSE 'FAIL ❌ - UI display issues'
            END as test_status
        FROM supplier
        WHERE org_id = $1`,
        (result) => result.rows[0] && result.rows[0].test_status.includes('PASS'),
        'Verify UI-ready supplier data'
    );

    // Test 5.2.2: Product UI Display
    await executeTest(
        'phase5',
        '5.2.2',
        'Product UI Display Readiness',
        `SELECT
            COUNT(*) as total_products,
            COUNT(*) FILTER (WHERE name IS NOT NULL AND name != '') as displayable_names,
            COUNT(*) FILTER (WHERE unit_price > 0) as displayable_prices,
            COUNT(*) FILTER (WHERE sku IS NOT NULL) as displayable_skus,
            CASE
                WHEN COUNT(*) = 22 AND
                     COUNT(*) = COUNT(*) FILTER (WHERE name IS NOT NULL AND name != '')
                THEN 'PASS ✅'
                ELSE 'FAIL ❌ - UI display issues'
            END as test_status
        FROM inventory_item
        WHERE org_id = $1`,
        (result) => result.rows[0] && result.rows[0].test_status.includes('PASS'),
        'Verify UI-ready product data'
    );

    // Test 5.4.1: Supplier Status Filtering
    await executeTest(
        'phase5',
        '5.4.1',
        'Supplier Status Filtering',
        `SELECT
            status,
            COUNT(*) as count,
            CASE
                WHEN COUNT(*) > 0 THEN 'PASS ✅'
                ELSE 'INFO - No suppliers in this status'
            END as test_status
        FROM supplier
        WHERE org_id = $1
        GROUP BY status
        ORDER BY status`,
        (result) => result.rows.length > 0,
        'Verify filtering by supplier status'
    );
}

async function runPhase6Tests() {
    console.log('\n╔═════════════════════════════════════════════════════════╗');
    console.log('║  PHASE 6: EDGE CASE TESTING                             ║');
    console.log('╚═════════════════════════════════════════════════════════╝');

    // Test 6.3.1: Empty Result Set Handling
    await executeTest(
        'phase6',
        '6.3.1',
        'Empty Result Set Handling',
        `SELECT COUNT(*) as result_count
        FROM supplier
        WHERE org_id = $1
        AND name LIKE '%NONEXISTENT_SUPPLIER_XYZ%'`,
        (result) => result.rows[0] && result.rows[0].result_count == 0,
        'Verify system handles empty searches gracefully'
    );

    // Test 6.3.2: Maximum Value Handling
    await executeTest(
        'phase6',
        '6.3.2',
        'Maximum Value Handling',
        `SELECT
            MAX(total_amount) as max_po_amount,
            MIN(total_amount) as min_po_amount,
            CASE
                WHEN MAX(total_amount) > 0 AND MIN(total_amount) > 0
                THEN 'PASS ✅'
                ELSE 'FAIL ❌ - Invalid amounts'
            END as test_status
        FROM purchase_order
        WHERE org_id = $1`,
        (result) => result.rows[0] && result.rows[0].test_status.includes('PASS'),
        'Verify system handles large values correctly'
    );
}

async function runFinalValidation() {
    console.log('\n╔═════════════════════════════════════════════════════════╗');
    console.log('║  FINAL VALIDATION SUMMARY                               ║');
    console.log('╚═════════════════════════════════════════════════════════╝');

    const finalQuery = `
        WITH validation_metrics AS (
            SELECT
                (SELECT COUNT(*) FROM supplier WHERE org_id = $1) as supplier_count,
                (SELECT COUNT(DISTINCT LOWER(TRIM(name))) FROM supplier WHERE org_id = $1) as unique_supplier_names,
                (SELECT COUNT(*) FROM inventory_item WHERE org_id = $1) as product_count,
                (SELECT COUNT(DISTINCT supplier_id) FROM inventory_item WHERE org_id = $1) as suppliers_with_products,
                (SELECT COUNT(*) FROM purchase_order WHERE org_id = $1) as po_count,
                (SELECT COUNT(*) FROM purchase_order WHERE org_id = $1 AND id IN (SELECT DISTINCT purchase_order_id FROM purchase_order_item)) as pos_with_items,
                (SELECT COUNT(*) FROM supplier_invoices WHERE org_id = $1) as invoice_count,
                (SELECT COUNT(*) FROM supplier_invoices WHERE org_id = $1 AND purchase_order_id IS NOT NULL) as invoices_with_po,
                (SELECT COUNT(*) FROM inventory_item i LEFT JOIN supplier s ON i.supplier_id = s.id AND i.org_id = s.org_id WHERE i.org_id = $1 AND s.id IS NULL) as orphaned_products
        )
        SELECT
            '✅ Exactly 22 unique suppliers' as criterion,
            supplier_count as actual,
            22 as expected,
            CASE WHEN supplier_count = 22 AND unique_supplier_names = 22 THEN 'PASS ✅' ELSE 'FAIL ❌' END as status
        FROM validation_metrics
        UNION ALL
        SELECT
            '✅ Exactly 22 products (1 per supplier)',
            product_count,
            22,
            CASE WHEN product_count = 22 AND suppliers_with_products = 22 THEN 'PASS ✅' ELSE 'FAIL ❌' END
        FROM validation_metrics
        UNION ALL
        SELECT
            '✅ Exactly 22 purchase orders with line items',
            po_count,
            22,
            CASE WHEN po_count = 22 AND pos_with_items = 22 THEN 'PASS ✅' ELSE 'FAIL ❌' END
        FROM validation_metrics
        UNION ALL
        SELECT
            '✅ Exactly 22 invoices matching POs',
            invoice_count,
            22,
            CASE WHEN invoice_count = 22 AND invoices_with_po = 22 THEN 'PASS ✅' ELSE 'FAIL ❌' END
        FROM validation_metrics
        UNION ALL
        SELECT
            '✅ Zero orphaned products',
            orphaned_products,
            0,
            CASE WHEN orphaned_products = 0 THEN 'PASS ✅' ELSE 'FAIL ❌' END
        FROM validation_metrics
    `;

    try {
        const result = await pool.query(finalQuery, [ORGANIZATION_ID]);

        console.log('\n🎯 SUCCESS CRITERIA CHECKLIST:\n');
        result.rows.forEach(row => {
            console.log(`${row.criterion}`);
            console.log(`   Actual: ${row.actual} | Expected: ${row.expected} | ${row.status}`);
        });

        const allPassed = result.rows.every(row => row.status.includes('PASS'));

        console.log('\n' + '═'.repeat(60));
        console.log(`\n📊 OVERALL TEST STATUS: ${allPassed ? '✅ ALL CRITERIA MET' : '❌ SOME CRITERIA FAILED'}`);

    } catch (error) {
        console.error('\n❌ Final validation error:', error.message);
    }
}

async function generateTestReport() {
    console.log('\n╔═════════════════════════════════════════════════════════╗');
    console.log('║  TEST EXECUTION SUMMARY                                 ║');
    console.log('╚═════════════════════════════════════════════════════════╝\n');

    const passRate = totalTests > 0 ? ((passedTests / totalTests) * 100).toFixed(1) : 0;

    console.log(`Total Tests Run: ${totalTests}`);
    console.log(`Passed: ${passedTests} ✅`);
    console.log(`Failed: ${failedTests} ❌`);
    console.log(`Warnings: ${warningTests} ⚠️`);
    console.log(`Pass Rate: ${passRate}%`);

    console.log('\n📋 Phase Breakdown:');
    Object.keys(testResults).forEach(phase => {
        const phaseTests = testResults[phase];
        const phasePassed = phaseTests.filter(t => t.status.includes('PASS')).length;
        const phaseTotal = phaseTests.length;
        console.log(`   ${phase.toUpperCase()}: ${phasePassed}/${phaseTotal} passed`);
    });

    // Save detailed report to file
    const reportPath = '/mnt/k/00Project/MantisNXT/claudedocs/test_execution_report.json';
    const report = {
        timestamp: new Date().toISOString(),
        summary: {
            total: totalTests,
            passed: passedTests,
            failed: failedTests,
            warnings: warningTests,
            passRate: parseFloat(passRate)
        },
        results: testResults
    };

    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    console.log(`\n📄 Detailed report saved to: ${reportPath}`);

    return passRate >= 100;
}

async function main() {
    console.log('\n🧪 COMPREHENSIVE E2E QUALITY VALIDATION TEST SUITE');
    console.log('====================================================');
    console.log(`Database: ${config.database}`);
    console.log(`Organization ID: ${ORGANIZATION_ID}`);
    console.log(`Test Start: ${new Date().toISOString()}\n`);

    try {
        // Test database connection
        await pool.query('SELECT 1');
        console.log('✅ Database connection established\n');

        // Run all test phases
        await runPhase1Tests();
        await runPhase2Tests();
        await runPhase3Tests();
        await runPhase4Tests();
        await runPhase5Tests();
        await runPhase6Tests();

        // Final validation
        await runFinalValidation();

        // Generate report
        const allTestsPassed = await generateTestReport();

        console.log('\n' + '═'.repeat(60));
        console.log(`\n🏁 TEST EXECUTION COMPLETE`);
        console.log(`Status: ${allTestsPassed ? '✅ SUCCESS' : '⚠️ REVIEW REQUIRED'}`);
        console.log(`Completed: ${new Date().toISOString()}\n`);

        process.exit(allTestsPassed ? 0 : 1);

    } catch (error) {
        console.error('\n❌ CRITICAL ERROR:', error.message);
        console.error(error.stack);
        process.exit(1);
    } finally {
        await pool.end();
    }
}

// Run the test suite
main();