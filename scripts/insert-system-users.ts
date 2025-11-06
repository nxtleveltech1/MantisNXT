/**
 * Insert system users required for authentication
 * Run with: tsx scripts/insert-system-users.ts
 */

import { config } from 'dotenv';
import { resolve } from 'path';

// Load .env.local
config({ path: resolve(__dirname, '../.env.local') });

import { query } from '../src/lib/database';

async function insertSystemUsers() {
  try {
    console.log('🔄 Inserting system users...');

    const result = await query(
      `
      INSERT INTO users (id, email, created_at)
      VALUES
        ('11111111-1111-1111-1111-111111111111', 'dev@mantisnxt.com', NOW()),
        ('22222222-2222-2222-2222-222222222222', 'user@example.com', NOW())
      ON CONFLICT (id) DO NOTHING
      RETURNING id, email, created_at;
      `
    );

    console.log('✅ System users inserted successfully:');
    result.rows.forEach((user: any) => {
      console.log(`  - ${user.email} (${user.id})`);
    });

    if (result.rows.length === 0) {
      console.log('ℹ️  Users already exist in the database');
    }

    process.exit(0);
  } catch (error) {
    console.error('❌ Error inserting system users:', error);
    process.exit(1);
  }
}

insertSystemUsers();
