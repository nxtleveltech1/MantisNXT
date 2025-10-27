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

async function addMissing22ndSupplier() {
    const client = await pool.connect();

    try {
        console.log('\n🔧 ADDING MISSING 22ND SUPPLIER');
        console.log('================================\n');

        await client.query('BEGIN');

        // Step 1: Insert Supplier #22 - Office Depot SA
        console.log('Step 1: Creating Supplier - Office Depot SA...');

        const supplierInsert = await client.query(`
            INSERT INTO supplier (
                org_id,
                name,
                contact_email,
                contact_phone,
                address,
                status,
                risk_score,
                payment_terms,
                lead_time_days,
                notes,
                created_at,
                updated_at
            ) VALUES (
                $1,
                'Office Depot SA',
                'sales@officedepotsa.co.za',
                '+27 11 555 2200',
                jsonb_build_object(
                    'street', '88 Office Park Drive',
                    'city', 'Johannesburg',
                    'province', 'Gauteng',
                    'postal_code', '2001',
                    'country', 'South Africa'
                ),
                'active',
                25,
                'Net 30',
                3,
                'Office supplies and furniture supplier. Fast delivery for business essentials.',
                NOW(),
                NOW()
            )
            RETURNING id, name
        `, [ORG_ID]);

        const supplierId = supplierInsert.rows[0].id;
        console.log(`   ✅ Created: ${supplierInsert.rows[0].name}`);
        console.log(`   ID: ${supplierId}`);

        // Step 2: Insert Product for this supplier
        console.log('\nStep 2: Creating Product - Ergonomic Office Chair...');

        const productInsert = await client.query(`
            INSERT INTO inventory_item (
                org_id,
                name,
                description,
                sku,
                barcode,
                category,
                unit_price,
                quantity_on_hand,
                reorder_point,
                supplier_id,
                is_active,
                created_at,
                updated_at
            ) VALUES (
                $1,
                'Ergonomic Office Chair',
                'High-back ergonomic office chair with lumbar support, adjustable armrests, and breathable mesh back. Weight capacity 120kg.',
                'OFC-CHAIR-ERG-001',
                '6009880112200',
                'finished_goods',
                1850.00,
                45,
                10,
                $2,
                true,
                NOW(),
                NOW()
            )
            RETURNING id, name, sku, unit_price
        `, [ORG_ID, supplierId]);

        const productId = productInsert.rows[0].id;
        console.log(`   ✅ Created: ${productInsert.rows[0].name}`);
        console.log(`   SKU: ${productInsert.rows[0].sku}`);
        console.log(`   Price: R${parseFloat(productInsert.rows[0].unit_price).toLocaleString('en-ZA')}`);

        // Step 3: Create Purchase Order
        console.log('\nStep 3: Creating Purchase Order...');

        const poNumber = `PO-2025-022`;
        const poTotal = 92500.00; // 50 chairs @ R1,850 each

        const poInsert = await client.query(`
            INSERT INTO purchase_order (
                org_id,
                po_number,
                supplier_id,
                order_date,
                expected_delivery_date,
                status,
                total_amount,
                notes,
                created_at,
                updated_at
            ) VALUES (
                $1,
                $2,
                $3,
                CURRENT_DATE - INTERVAL '30 days',
                CURRENT_DATE - INTERVAL '23 days',
                'completed',
                $4,
                'Office furniture order for new branch office setup',
                NOW() - INTERVAL '30 days',
                NOW() - INTERVAL '23 days'
            )
            RETURNING id, po_number, total_amount
        `, [ORG_ID, poNumber, supplierId, poTotal]);

        const poId = poInsert.rows[0].id;
        console.log(`   ✅ Created: ${poInsert.rows[0].po_number}`);
        console.log(`   Total: R${parseFloat(poInsert.rows[0].total_amount).toLocaleString('en-ZA')}`);

        // Step 4: Create PO Line Items
        console.log('\nStep 4: Creating PO Line Items...');

        const poItemInsert = await client.query(`
            INSERT INTO purchase_order_item (
                purchase_order_id,
                inventory_item_id,
                quantity,
                unit_price,
                created_at,
                updated_at
            ) VALUES (
                $1,
                $2,
                50,
                1850.00,
                NOW() - INTERVAL '30 days',
                NOW() - INTERVAL '30 days'
            )
            RETURNING id, quantity, unit_price
        `, [poId, productId]);

        console.log(`   ✅ Created: ${poItemInsert.rows[0].quantity} items @ R${parseFloat(poItemInsert.rows[0].unit_price).toLocaleString('en-ZA')}`);

        // Step 5: Create Invoice
        console.log('\nStep 5: Creating Invoice...');

        const invoiceNumber = `INV-2025-022`;
        const supplierInvoiceNumber = `ODS-INV-2025-022`;
        const subtotal = 92500.00;
        const taxAmount = subtotal * 0.15; // 15% VAT
        const shippingAmount = 450.00;
        const totalAmount = subtotal + taxAmount + shippingAmount;

        const invoiceInsert = await client.query(`
            INSERT INTO supplier_invoices (
                org_id,
                supplier_id,
                purchase_order_id,
                invoice_number,
                supplier_invoice_number,
                invoice_date,
                due_date,
                subtotal,
                tax_amount,
                shipping_amount,
                total_amount,
                paid_amount,
                payment_terms,
                status,
                payment_status,
                notes,
                created_at,
                updated_at
            ) VALUES (
                $1,
                $2,
                $3,
                $4,
                $5,
                CURRENT_DATE - INTERVAL '23 days',
                CURRENT_DATE + INTERVAL '7 days',
                $6,
                $7,
                $8,
                $9,
                $9,
                'Net 30',
                'paid',
                'paid',
                'Payment completed via EFT - Office furniture delivery',
                NOW() - INTERVAL '23 days',
                NOW() - INTERVAL '5 days'
            )
            RETURNING id, invoice_number, total_amount, status
        `, [ORG_ID, supplierId, poId, invoiceNumber, supplierInvoiceNumber, subtotal, taxAmount, shippingAmount, totalAmount]);

        const invoiceId = invoiceInsert.rows[0].id;
        console.log(`   ✅ Created: ${invoiceInsert.rows[0].invoice_number}`);
        console.log(`   Total: R${parseFloat(invoiceInsert.rows[0].total_amount).toLocaleString('en-ZA')}`);
        console.log(`   Status: ${invoiceInsert.rows[0].status}`);

        // Step 6: Create Invoice Line Items
        console.log('\nStep 6: Creating Invoice Line Items...');

        const invoiceItemInsert = await client.query(`
            INSERT INTO supplier_invoice_items (
                invoice_id,
                purchase_order_item_id,
                inventory_item_id,
                description,
                quantity,
                unit_price,
                created_at
            ) VALUES (
                $1,
                (SELECT id FROM purchase_order_item WHERE purchase_order_id = $2 LIMIT 1),
                $3,
                'Ergonomic Office Chair - High-back with lumbar support',
                50,
                1850.00,
                NOW() - INTERVAL '23 days'
            )
            RETURNING id, description, quantity, line_total
        `, [invoiceId, poId, productId]);

        console.log(`   ✅ Created: ${invoiceItemInsert.rows[0].quantity} x ${invoiceItemInsert.rows[0].description.substring(0, 40)}...`);
        console.log(`   Line Total: R${parseFloat(invoiceItemInsert.rows[0].line_total).toLocaleString('en-ZA')}`);

        // Commit transaction
        await client.query('COMMIT');

        console.log('\n' + '='.repeat(50));
        console.log('✅ SUCCESS: 22nd Supplier Data Set Complete!');
        console.log('='.repeat(50));

        // Verify final counts
        console.log('\n📊 VERIFICATION: Final Entity Counts');
        console.log('─'.repeat(50));

        const finalCounts = await client.query(`
            SELECT
                (SELECT COUNT(*) FROM supplier WHERE org_id = $1) as suppliers,
                (SELECT COUNT(*) FROM inventory_item WHERE org_id = $1) as products,
                (SELECT COUNT(*) FROM purchase_order WHERE org_id = $1) as purchase_orders,
                (SELECT COUNT(*) FROM supplier_invoices WHERE org_id = $1) as invoices
        `, [ORG_ID]);

        const counts = finalCounts.rows[0];
        console.log(`Suppliers: ${counts.suppliers} ${counts.suppliers == 22 ? '✅' : '❌'}`);
        console.log(`Products: ${counts.products} ${counts.products == 22 ? '✅' : '❌'}`);
        console.log(`Purchase Orders: ${counts.purchase_orders} ${counts.purchase_orders == 22 ? '✅' : '❌'}`);
        console.log(`Invoices: ${counts.invoices} ${counts.invoices == 22 ? '✅' : '❌'}`);

        const allCorrect = counts.suppliers == 22 && counts.products == 22 && counts.purchase_orders == 22 && counts.invoices == 22;

        console.log('\n🎯 FINAL STATUS: ' + (allCorrect ? '✅ ALL TARGETS MET (22/22)' : '⚠️ VERIFICATION NEEDED'));

        return allCorrect;

    } catch (error) {
        await client.query('ROLLBACK');
        console.error('\n❌ ERROR:', error.message);
        console.error('Transaction rolled back. No changes made.');
        throw error;
    } finally {
        client.release();
        await pool.end();
    }
}

async function main() {
    try {
        console.log('\n🚀 MantisNXT - Add Missing 22nd Supplier');
        console.log('Timestamp:', new Date().toISOString());

        const success = await addMissing22ndSupplier();

        if (success) {
            console.log('\n✅ MISSION ACCOMPLISHED: System now has complete 22/22 data sets');
            console.log('   Recommend: Re-run comprehensive validation to confirm 100% success\n');
        }

        process.exit(success ? 0 : 1);
    } catch (error) {
        console.error('\n❌ CRITICAL ERROR:', error.message);
        process.exit(1);
    }
}

main();