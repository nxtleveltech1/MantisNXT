const { Pool } = require('pg');

const pool = new Pool({
    host: '62.169.20.53',
    port: 6600,
    user: 'nxtdb_admin',
    password: 'P@33w0rd-1',
    database: 'nxtprod-db_001',
    ssl: false
});

const EXPECTED_SUPPLIERS = [
    "Alpha Technologies (Pty) Ltd",
    "BK Electronics & Computing",
    "Sonic Pro Audio Solutions",
    "TechVision Systems",
    "DataFlow Networks",
    "Precision Manufacturing Works",
    "Industrial Components & Supplies",
    "PowerTech Engineering",
    "MetalWorks Fabrication",
    "BuildMaster Construction Supplies",
    "RoofTech Solutions",
    "Concrete Solutions SA",
    "AutoParts Direct SA",
    "Fleet Solutions & Logistics",
    "TruckParts Warehouse",
    "MediSupply Healthcare Solutions",
    "PharmaLogistics (Pty) Ltd",
    "FreshProduce Distributors",
    "Beverage Solutions SA",
    "Solar Power Solutions",
    "Electrical Contractors Supply",
    "Office Depot SA"
];

async function checkMissingSupplier() {
    try {
        const result = await pool.query(`
            SELECT name FROM supplier
            WHERE org_id = '00000000-0000-0000-0000-000000000001'
            ORDER BY name
        `);

        const actualSuppliers = result.rows.map(r => r.name);

        console.log(`\n📊 SUPPLIER COMPARISON\n`);
        console.log(`Expected: ${EXPECTED_SUPPLIERS.length} suppliers`);
        console.log(`Actual: ${actualSuppliers.length} suppliers\n`);

        console.log(`MISSING SUPPLIERS:`);
        const missing = EXPECTED_SUPPLIERS.filter(s => !actualSuppliers.includes(s));
        if (missing.length === 0) {
            console.log(`  ✅ None - All expected suppliers present`);
        } else {
            missing.forEach(m => console.log(`  ❌ ${m}`));
        }

        console.log(`\nEXTRA SUPPLIERS (not in expected list):`);
        const extra = actualSuppliers.filter(s => !EXPECTED_SUPPLIERS.includes(s));
        if (extra.length === 0) {
            console.log(`  ✅ None`);
        } else {
            extra.forEach(e => console.log(`  ⚠️ ${e}`));
        }

        console.log(`\n✅ PRESENT SUPPLIERS (${actualSuppliers.length}):`);
        actualSuppliers.forEach(s => console.log(`  ✓ ${s}`));

    } catch (error) {
        console.error('Error:', error.message);
    } finally {
        await pool.end();
    }
}

checkMissingSupplier();