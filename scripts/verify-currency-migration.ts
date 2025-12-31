import { query } from '../src/lib/database';

async function verifyMigration() {
  try {
    const result = await query(`
      SELECT 
        table_name,
        column_name,
        data_type,
        column_default,
        is_nullable
      FROM information_schema.columns 
      WHERE table_schema = 'public' 
        AND table_name IN ('pricing_optimization', 'pricing_recommendation', 'pricing_rule')
        AND column_name = 'currency'
      ORDER BY table_name, column_name
    `);

    console.log('\n✅ Currency columns verification:');
    console.log('=====================================');
    
    if (result.rows.length === 0) {
      console.log('❌ No currency columns found!');
      return;
    }

    for (const row of result.rows) {
      console.log(`\nTable: ${row.table_name}`);
      console.log(`  Column: ${row.column_name}`);
      console.log(`  Type: ${row.data_type}`);
      console.log(`  Default: ${row.column_default}`);
      console.log(`  Nullable: ${row.is_nullable}`);
    }

    // Also check core.price_history
    const coreResult = await query(`
      SELECT 
        table_name,
        column_name,
        data_type,
        column_default
      FROM information_schema.columns 
      WHERE table_schema = 'core' 
        AND table_name = 'price_history'
        AND column_name = 'currency'
    `);

    if (coreResult.rows.length > 0) {
      console.log(`\n✅ core.price_history.currency exists`);
    } else {
      console.log(`\n⚠️  core.price_history.currency not found (may already exist from previous migration)`);
    }

    console.log('\n✅ Migration verification complete!');
  } catch (error: any) {
    console.error('❌ Verification failed:', error.message);
    process.exit(1);
  }
}

verifyMigration();

