import { Client } from 'pg';

async function main() {
  const databaseUrl = process.env.DATABASE_URL || process.env.NEON_DATABASE_URL;
  if (!databaseUrl) {
    throw new Error('DATABASE_URL (or NEON_DATABASE_URL) is required');
  }

  const client = new Client({ connectionString: databaseUrl, ssl: { rejectUnauthorized: false } });
  await client.connect();
  try {
    const tables = await client.query(
      "SELECT COUNT(*) AS count FROM information_schema.tables WHERE table_schema = 'core'"
    );
    const indexes = await client.query(
      "SELECT COUNT(*) AS count FROM pg_indexes WHERE schemaname = 'core'"
    );
    const contactPerson = await client.query(
      "SELECT column_name FROM information_schema.columns WHERE table_schema = 'core' AND table_name = 'supplier' AND column_name = 'contact_person'"
    );

    console.log('core.tables:', tables.rows[0]?.count ?? '0');
    console.log('core.indexes:', indexes.rows[0]?.count ?? '0');
    console.log('supplier.contact_person exists:', contactPerson.rowCount > 0);
  } finally {
    await client.end();
  }
}

main().catch((err) => {
  console.error('Database validation failed:', err);
  process.exit(1);
});


