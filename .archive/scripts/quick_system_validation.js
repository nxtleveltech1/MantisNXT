const { Pool } = require('pg');

const pool = new Pool({
    host: process.env.DB_HOST || '62.169.20.53',
    port: parseInt(process.env.DB_PORT || '6600'),
    user: process.env.DB_USER || 'nxtdb_admin',
    password: process.env.DB_PASSWORD || 'P@33w0rd-1',
    database: process.env.DB_NAME || 'nxtprod-db_001',
    ssl: false
});

const ORG_ID = '00000000-0000-0000-0000-000000000001';

async function runValidation() {
    console.log('\n🔍 MANTISNXT SYSTEM VALIDATION REPORT');
    console.log('=====================================');
    console.log(`Timestamp: ${new Date().toISOString()}`);
    console.log(`Organization ID: ${ORG_ID}\n`);

    try {
        // Test 1: Supplier Count
        console.log('📊 ENTITY COUNTS');
        console.log('─'.repeat(50));

        const supplierResult = await pool.query(`
            SELECT COUNT(*) as total FROM supplier WHERE org_id = $1
        `, [ORG_ID]);
        const supplierCount = parseInt(supplierResult.rows[0].total);
        console.log(`Suppliers: ${supplierCount} ${supplierCount === 22 ? '✅' : supplierCount === 21 ? '⚠️ (Expected 22)' : '❌'}`);

        // Test 2: Unique Supplier Names
        const uniqueNamesResult = await pool.query(`
            SELECT COUNT(DISTINCT LOWER(TRIM(name))) as unique FROM supplier WHERE org_id = $1
        `, [ORG_ID]);
        const uniqueNames = parseInt(uniqueNamesResult.rows[0].unique);
        console.log(`Unique Supplier Names: ${uniqueNames} ${uniqueNames === supplierCount ? '✅' : '❌'}`);

        // Test 3: Product Count
        const productResult = await pool.query(`
            SELECT COUNT(*) as total FROM inventory_item WHERE org_id = $1
        `, [ORG_ID]);
        const productCount = parseInt(productResult.rows[0].total);
        console.log(`Products: ${productCount} ${productCount === 22 ? '✅' : productCount === 21 ? '⚠️ (Expected 22)' : '❌'}`);

        // Test 4: Purchase Orders
        const poResult = await pool.query(`
            SELECT COUNT(*) as total FROM purchase_order WHERE org_id = $1
        `, [ORG_ID]);
        const poCount = parseInt(poResult.rows[0].total);
        console.log(`Purchase Orders: ${poCount} ${poCount === 22 ? '✅' : poCount === 21 ? '⚠️ (Expected 22)' : '❌'}`);

        // Test 5: Invoices
        const invoiceResult = await pool.query(`
            SELECT COUNT(*) as total FROM supplier_invoices WHERE org_id = $1
        `, [ORG_ID]);
        const invoiceCount = parseInt(invoiceResult.rows[0].total);
        console.log(`Invoices: ${invoiceCount} ${invoiceCount === 22 ? '✅' : invoiceCount === 21 ? '⚠️ (Expected 22)' : '❌'}`);

        // Test 6: Orphaned Products
        console.log('\n🔗 REFERENTIAL INTEGRITY');
        console.log('─'.repeat(50));

        const orphanResult = await pool.query(`
            SELECT COUNT(*) as orphans
            FROM inventory_item i
            LEFT JOIN supplier s ON i.supplier_id = s.id AND i.org_id = s.org_id
            WHERE i.org_id = $1 AND s.id IS NULL
        `, [ORG_ID]);
        const orphanCount = parseInt(orphanResult.rows[0].orphans);
        console.log(`Orphaned Products: ${orphanCount} ${orphanCount === 0 ? '✅' : '❌'}`);

        // Test 7: Products per Supplier
        const productsPerSupplierResult = await pool.query(`
            SELECT
                COUNT(DISTINCT supplier_id) as suppliers_with_products,
                MIN(product_count) as min_products,
                MAX(product_count) as max_products
            FROM (
                SELECT supplier_id, COUNT(*) as product_count
                FROM inventory_item
                WHERE org_id = $1
                GROUP BY supplier_id
            ) counts
        `,[ORG_ID]);
        const pps = productsPerSupplierResult.rows[0];
        console.log(`Suppliers with Products: ${pps.suppliers_with_products} ${pps.suppliers_with_products === supplierCount ? '✅' : '❌'}`);
        console.log(`Products per Supplier: ${pps.min_products} to ${pps.max_products} ${pps.min_products === 1 && pps.max_products === 1 ? '✅' : '❌'}`);

        // Test 8: PO Line Items
        const poItemsResult = await pool.query(`
            SELECT
                COUNT(DISTINCT po.id) as total_pos,
                COUNT(DISTINCT poi.purchase_order_id) as pos_with_items
            FROM purchase_order po
            LEFT JOIN purchase_order_item poi ON po.id = poi.purchase_order_id
            WHERE po.org_id = $1
        `, [ORG_ID]);
        const poItems = poItemsResult.rows[0];
        console.log(`POs with Line Items: ${poItems.pos_with_items}/${poItems.total_pos} ${poItems.pos_with_items === poItems.total_pos ? '✅' : '❌'}`);

        // Test 9: Invoice-PO Matching
        const invoicePoResult = await pool.query(`
            SELECT
                COUNT(DISTINCT si.id) as total_invoices,
                COUNT(DISTINCT CASE WHEN po.id IS NOT NULL THEN si.id END) as invoices_with_po
            FROM supplier_invoices si
            LEFT JOIN purchase_order po ON si.purchase_order_id = po.id
            WHERE si.org_id = $1
        `, [ORG_ID]);
        const invPo = invoicePoResult.rows[0];
        console.log(`Invoices with Valid PO: ${invPo.invoices_with_po}/${invPo.total_invoices} ${invPo.invoices_with_po === invPo.total_invoices ? '✅' : '❌'}`);

        // Test 10: Data Quality Checks
        console.log('\n📋 DATA QUALITY');
        console.log('─'.repeat(50));

        const qualityResult = await pool.query(`
            SELECT
                COUNT(*) FILTER (WHERE name IS NULL OR name = '') as suppliers_missing_name,
                COUNT(*) FILTER (WHERE contact_email IS NULL OR contact_email = '') as suppliers_missing_email,
                COUNT(*) FILTER (WHERE status IS NULL) as suppliers_missing_status
            FROM supplier
            WHERE org_id = $1
        `, [ORG_ID]);
        const quality = qualityResult.rows[0];
        console.log(`Suppliers Missing Name: ${quality.suppliers_missing_name} ${quality.suppliers_missing_name === 0 ? '✅' : '❌'}`);
        console.log(`Suppliers Missing Email: ${quality.suppliers_missing_email} ${quality.suppliers_missing_email === 0 ? '✅' : '❌'}`);
        console.log(`Suppliers Missing Status: ${quality.suppliers_missing_status} ${quality.suppliers_missing_status === 0 ? '✅' : '❌'}`);

        // Test 11: Duplicate Detection
        console.log('\n🔍 DUPLICATE DETECTION');
        console.log('─'.repeat(50));

        const duplicateResult = await pool.query(`
            SELECT
                LOWER(TRIM(name)) as normalized_name,
                COUNT(*) as count,
                ARRAY_AGG(name ORDER BY created_at) as names
            FROM supplier
            WHERE org_id = $1
            GROUP BY LOWER(TRIM(name))
            HAVING COUNT(*) > 1
        `, [ORG_ID]);

        if (duplicateResult.rows.length === 0) {
            console.log('Duplicate Suppliers: 0 ✅');
        } else {
            console.log(`Duplicate Suppliers: ${duplicateResult.rows.length} ❌`);
            duplicateResult.rows.forEach(dup => {
                console.log(`  - "${dup.normalized_name}": ${dup.count} instances`);
                dup.names.forEach(n => console.log(`    → ${n}`));
            });
        }

        // Summary
        console.log('\n🎯 SUCCESS CRITERIA EVALUATION');
        console.log('─'.repeat(50));

        const criteria = [
            { name: 'Exactly 22 unique suppliers', actual: supplierCount, expected: 22, status: supplierCount === 22 },
            { name: 'No duplicate supplier names', actual: uniqueNames, expected: supplierCount, status: uniqueNames === supplierCount },
            { name: 'Exactly 22 products', actual: productCount, expected: 22, status: productCount === 22 },
            { name: '1 product per supplier', actual: `${pps.min_products}-${pps.max_products}`, expected: '1-1', status: pps.min_products === 1 && pps.max_products === 1 },
            { name: 'Exactly 22 purchase orders', actual: poCount, expected: 22, status: poCount === 22 },
            { name: 'All POs have line items', actual: poItems.pos_with_items, expected: poItems.total_pos, status: poItems.pos_with_items === poItems.total_pos },
            { name: 'Exactly 22 invoices', actual: invoiceCount, expected: 22, status: invoiceCount === 22 },
            { name: 'All invoices match POs', actual: invPo.invoices_with_po, expected: invPo.total_invoices, status: invPo.invoices_with_po === invPo.total_invoices },
            { name: 'Zero orphaned products', actual: orphanCount, expected: 0, status: orphanCount === 0 }
        ];

        let passCount = 0;
        criteria.forEach(c => {
            const status = c.status ? '✅ PASS' : '❌ FAIL';
            console.log(`${status} ${c.name}`);
            console.log(`     Actual: ${c.actual} | Expected: ${c.expected}`);
            if (c.status) passCount++;
        });

        const overallPass = passCount === criteria.length;
        console.log('\n' + '═'.repeat(50));
        console.log(`\n🏁 OVERALL STATUS: ${overallPass ? '✅ ALL CRITERIA MET' : '⚠️ REVIEW REQUIRED'}`);
        console.log(`Pass Rate: ${passCount}/${criteria.length} (${((passCount/criteria.length)*100).toFixed(1)}%)`);

        // Investigation needed
        if (supplierCount === 21 && productCount === 21 && poCount === 21 && invoiceCount === 21) {
            console.log('\n⚠️ INVESTIGATION NEEDED:');
            console.log('   All entities show 21 records instead of expected 22.');
            console.log('   This suggests either:');
            console.log('   1. One supplier/product/PO/invoice was never created');
            console.log('   2. One was deleted or marked inactive');
            console.log('   3. Data generation script created only 21 instances\n');
        }

        return overallPass;

    } catch (error) {
        console.error('\n❌ Validation error:', error.message);
        console.error(error.stack);
        return false;
    }
}

async function main() {
    try {
        const success = await runValidation();
        process.exit(success ? 0 : 1);
    } finally {
        await pool.end();
    }
}

main();