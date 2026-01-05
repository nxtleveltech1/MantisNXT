/**
 * User Migration Script: PostgreSQL to Clerk
 * 
 * This script migrates existing users from the auth.users_extended table to Clerk.
 * Based on: https://clerk.com/docs/guides/development/migrating/overview
 * 
 * Usage:
 *   bun scripts/migrate-users-to-clerk.ts [--dry-run] [--limit=N]
 * 
 * Options:
 *   --dry-run    Preview migration without making changes
 *   --limit=N    Only migrate N users (for testing)
 */

import { db } from '../src/lib/database';

// Clerk API configuration
const CLERK_SECRET_KEY = process.env.CLERK_SECRET_KEY;
const CLERK_API_URL = 'https://api.clerk.com/v1';

if (!CLERK_SECRET_KEY) {
  console.error('❌ CLERK_SECRET_KEY environment variable is required');
  process.exit(1);
}

// Parse command line arguments
const args = process.argv.slice(2);
const isDryRun = args.includes('--dry-run');
const limitArg = args.find(a => a.startsWith('--limit='));
const limit = limitArg ? parseInt(limitArg.split('=')[1]) : null;

interface DbUser {
  id: string;
  email: string;
  email_verified: boolean;
  first_name: string | null;
  last_name: string | null;
  display_name: string;
  phone: string | null;
  mobile: string | null;
  org_id: string;
  department: string | null;
  job_title: string | null;
  id_number: string | null;
  employment_equity: string | null;
  bee_status: string | null;
  password_hash: string | null;
  two_factor_enabled: boolean;
  two_factor_secret: string | null;
  is_active: boolean;
  created_at: Date;
  last_login_at: Date | null;
  clerk_id: string | null;
}

interface ClerkCreateUserPayload {
  email_address: string[];
  first_name?: string;
  last_name?: string;
  password?: string;
  password_digest?: string;
  password_hasher?: string;
  skip_password_requirement?: boolean;
  skip_password_checks?: boolean;
  public_metadata?: Record<string, unknown>;
  private_metadata?: Record<string, unknown>;
  external_id?: string;
}

interface MigrationResult {
  userId: string;
  email: string;
  clerkId?: string;
  success: boolean;
  error?: string;
}

// Rate limiting: Clerk has 20 requests/10 seconds for Backend API
const RATE_LIMIT_DELAY_MS = 600; // ~1.6 requests/second to be safe

async function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function createClerkUser(user: DbUser): Promise<{ clerkId: string } | { error: string }> {
  const payload: ClerkCreateUserPayload = {
    email_address: [user.email],
    first_name: user.first_name || undefined,
    last_name: user.last_name || undefined,
    external_id: user.id, // Store original DB ID for reference
    public_metadata: {
      org_id: user.org_id,
      department: user.department,
      job_title: user.job_title,
      role: 'user', // Default role, can be updated later
      migrated_from: 'mantis_db',
      migrated_at: new Date().toISOString(),
    },
    private_metadata: {
      original_db_id: user.id,
      id_number: user.id_number,
      employment_equity: user.employment_equity,
      bee_status: user.bee_status,
    },
  };

  // Handle password migration
  if (user.password_hash && user.password_hash.startsWith('$2')) {
    // BCrypt hash - Clerk supports this natively
    payload.password_digest = user.password_hash;
    payload.password_hasher = 'bcrypt';
  } else if (user.password_hash) {
    // Unknown hash format - skip password, user will need to reset
    payload.skip_password_requirement = true;
    console.log(`  ⚠️  Unknown password hash format for ${user.email}, skipping password`);
  } else {
    // No password - user might use OAuth
    payload.skip_password_requirement = true;
  }

  try {
    const response = await fetch(`${CLERK_API_URL}/users`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${CLERK_SECRET_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    const data = await response.json();

    if (!response.ok) {
      // Handle specific error cases
      if (data.errors?.[0]?.code === 'form_identifier_exists') {
        return { error: 'User already exists in Clerk' };
      }
      return { error: data.errors?.[0]?.message || `HTTP ${response.status}` };
    }

    return { clerkId: data.id };
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

async function updateDbWithClerkId(userId: string, clerkId: string): Promise<void> {
  await db.query(
    `UPDATE auth.users_extended SET clerk_id = $1, updated_at = NOW() WHERE id = $2`,
    [clerkId, userId]
  );
}

async function getExistingClerkUser(email: string): Promise<string | null> {
  try {
    const response = await fetch(
      `${CLERK_API_URL}/users?email_address=${encodeURIComponent(email)}`,
      {
        headers: {
          'Authorization': `Bearer ${CLERK_SECRET_KEY}`,
        },
      }
    );

    if (!response.ok) return null;

    const data = await response.json();
    if (data.length > 0) {
      return data[0].id;
    }
    return null;
  } catch {
    return null;
  }
}

async function migrateUsers(): Promise<void> {
  console.log('🚀 Starting User Migration to Clerk');
  console.log('=' .repeat(50));
  
  if (isDryRun) {
    console.log('📋 DRY RUN MODE - No changes will be made\n');
  }

  // Fetch users to migrate (excluding already migrated ones)
  let query = `
    SELECT 
      id, email, email_verified, first_name, last_name, display_name,
      phone, mobile, org_id, department, job_title, id_number,
      employment_equity, bee_status, password_hash, two_factor_enabled,
      two_factor_secret, is_active, created_at, last_login_at, clerk_id
    FROM auth.users_extended
    WHERE clerk_id IS NULL
      AND is_active = true
      AND deleted_at IS NULL
    ORDER BY created_at ASC
  `;

  if (limit) {
    query += ` LIMIT ${limit}`;
  }

  const result = await db.query<DbUser>(query);
  const users = result.rows;

  console.log(`📊 Found ${users.length} users to migrate\n`);

  if (users.length === 0) {
    console.log('✅ No users to migrate. All users already have Clerk IDs.');
    return;
  }

  const results: MigrationResult[] = [];
  let successCount = 0;
  let errorCount = 0;
  let skippedCount = 0;

  for (let i = 0; i < users.length; i++) {
    const user = users[i];
    console.log(`[${i + 1}/${users.length}] Migrating: ${user.email}`);

    // Check if user already exists in Clerk (by email)
    const existingClerkId = await getExistingClerkUser(user.email);
    
    if (existingClerkId) {
      console.log(`  ⏭️  User already exists in Clerk (${existingClerkId})`);
      
      if (!isDryRun) {
        await updateDbWithClerkId(user.id, existingClerkId);
        console.log(`  ✅ Updated database with existing Clerk ID`);
      }
      
      results.push({
        userId: user.id,
        email: user.email,
        clerkId: existingClerkId,
        success: true,
      });
      skippedCount++;
      await sleep(RATE_LIMIT_DELAY_MS);
      continue;
    }

    if (isDryRun) {
      console.log(`  📋 Would create user in Clerk`);
      results.push({
        userId: user.id,
        email: user.email,
        success: true,
      });
      successCount++;
      continue;
    }

    // Create user in Clerk
    const createResult = await createClerkUser(user);

    if ('error' in createResult) {
      console.log(`  ❌ Error: ${createResult.error}`);
      results.push({
        userId: user.id,
        email: user.email,
        success: false,
        error: createResult.error,
      });
      errorCount++;
    } else {
      console.log(`  ✅ Created in Clerk: ${createResult.clerkId}`);
      
      // Update database with Clerk ID
      await updateDbWithClerkId(user.id, createResult.clerkId);
      
      results.push({
        userId: user.id,
        email: user.email,
        clerkId: createResult.clerkId,
        success: true,
      });
      successCount++;
    }

    // Rate limiting
    await sleep(RATE_LIMIT_DELAY_MS);
  }

  // Summary
  console.log('\n' + '=' .repeat(50));
  console.log('📊 Migration Summary');
  console.log('=' .repeat(50));
  console.log(`Total users processed: ${users.length}`);
  console.log(`✅ Successfully migrated: ${successCount}`);
  console.log(`⏭️  Already existed (linked): ${skippedCount}`);
  console.log(`❌ Errors: ${errorCount}`);

  if (errorCount > 0) {
    console.log('\n❌ Failed migrations:');
    results
      .filter(r => !r.success)
      .forEach(r => console.log(`  - ${r.email}: ${r.error}`));
  }

  if (isDryRun) {
    console.log('\n📋 This was a dry run. Run without --dry-run to perform actual migration.');
  }
}

// Run migration
migrateUsers()
  .then(() => {
    console.log('\n✅ Migration complete');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Migration failed:', error);
    process.exit(1);
  });

