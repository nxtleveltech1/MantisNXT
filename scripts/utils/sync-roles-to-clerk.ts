/**
 * Role Sync Script: Sync user roles from DB to Clerk metadata
 * 
 * This script updates Clerk user metadata with roles and permissions
 * from the database after the initial user migration.
 * 
 * Usage:
 *   bun scripts/sync-roles-to-clerk.ts [--dry-run] [--limit=N]
 */

import { db } from '../src/lib/database';

const CLERK_SECRET_KEY = process.env.CLERK_SECRET_KEY;
const CLERK_API_URL = 'https://api.clerk.com/v1';

if (!CLERK_SECRET_KEY) {
  console.error('❌ CLERK_SECRET_KEY environment variable is required');
  process.exit(1);
}

const args = process.argv.slice(2);
const isDryRun = args.includes('--dry-run');
const limitArg = args.find(a => a.startsWith('--limit='));
const limit = limitArg ? parseInt(limitArg.split('=')[1]) : null;

interface UserWithRoles {
  id: string;
  clerk_id: string;
  email: string;
  org_id: string;
  department: string | null;
  roles: Array<{ slug: string; name: string; level: number }>;
  permissions: string[];
}

const RATE_LIMIT_DELAY_MS = 600;

async function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function updateClerkUserMetadata(
  clerkId: string,
  publicMetadata: Record<string, unknown>,
  privateMetadata: Record<string, unknown>
): Promise<{ success: boolean; error?: string }> {
  try {
    const response = await fetch(`${CLERK_API_URL}/users/${clerkId}/metadata`, {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${CLERK_SECRET_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        public_metadata: publicMetadata,
        private_metadata: privateMetadata,
      }),
    });

    if (!response.ok) {
      const data = await response.json();
      return { success: false, error: data.errors?.[0]?.message || `HTTP ${response.status}` };
    }

    return { success: true };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

async function syncRoles(): Promise<void> {
  console.log('🔄 Starting Role Sync to Clerk Metadata');
  console.log('=' .repeat(50));
  
  if (isDryRun) {
    console.log('📋 DRY RUN MODE - No changes will be made\n');
  }

  // Fetch users with their roles and permissions
  let query = `
    SELECT 
      u.id,
      u.clerk_id,
      u.email,
      u.org_id,
      u.department,
      COALESCE(
        json_agg(
          DISTINCT jsonb_build_object(
            'slug', r.slug,
            'name', r.name,
            'level', COALESCE(r.role_level, 0)
          )
        ) FILTER (WHERE r.id IS NOT NULL),
        '[]'::json
      ) as roles,
      COALESCE(
        array_agg(DISTINCT p.name) FILTER (WHERE p.name IS NOT NULL),
        ARRAY[]::text[]
      ) as permissions
    FROM auth.users_extended u
    LEFT JOIN auth.user_roles ur ON u.id = ur.user_id
    LEFT JOIN auth.roles r ON ur.role_id = r.id AND r.is_active = true
    LEFT JOIN auth.role_permissions rp ON r.id = rp.role_id
    LEFT JOIN auth.permissions p ON rp.permission_id = p.id
    WHERE u.clerk_id IS NOT NULL
      AND u.is_active = true
    GROUP BY u.id, u.clerk_id, u.email, u.org_id, u.department
    ORDER BY u.created_at ASC
  `;

  if (limit) {
    query += ` LIMIT ${limit}`;
  }

  const result = await db.query<UserWithRoles>(query);
  const users = result.rows;

  console.log(`📊 Found ${users.length} users to sync\n`);

  if (users.length === 0) {
    console.log('✅ No users to sync.');
    return;
  }

  let successCount = 0;
  let errorCount = 0;

  for (let i = 0; i < users.length; i++) {
    const user = users[i];
    console.log(`[${i + 1}/${users.length}] Syncing: ${user.email}`);

    // Determine primary role (highest level)
    const roles = user.roles || [];
    const primaryRole = roles.length > 0 
      ? roles.reduce((prev, curr) => (curr.level > prev.level ? curr : prev))
      : { slug: 'user', name: 'User', level: 50 };

    const publicMetadata = {
      org_id: user.org_id,
      department: user.department,
      role: primaryRole.slug,
      role_name: primaryRole.name,
      role_level: primaryRole.level,
      all_roles: roles.map(r => r.slug),
    };

    const privateMetadata = {
      permissions: user.permissions,
      roles_full: roles,
    };

    if (isDryRun) {
      console.log(`  📋 Would update metadata:`);
      console.log(`      Role: ${primaryRole.slug} (level ${primaryRole.level})`);
      console.log(`      Permissions: ${user.permissions.length}`);
      successCount++;
      continue;
    }

    const updateResult = await updateClerkUserMetadata(
      user.clerk_id,
      publicMetadata,
      privateMetadata
    );

    if (updateResult.success) {
      console.log(`  ✅ Updated - Role: ${primaryRole.slug}`);
      successCount++;
    } else {
      console.log(`  ❌ Error: ${updateResult.error}`);
      errorCount++;
    }

    await sleep(RATE_LIMIT_DELAY_MS);
  }

  // Summary
  console.log('\n' + '=' .repeat(50));
  console.log('📊 Sync Summary');
  console.log('=' .repeat(50));
  console.log(`Total users processed: ${users.length}`);
  console.log(`✅ Successfully synced: ${successCount}`);
  console.log(`❌ Errors: ${errorCount}`);

  if (isDryRun) {
    console.log('\n📋 This was a dry run. Run without --dry-run to perform actual sync.');
  }
}

syncRoles()
  .then(() => {
    console.log('\n✅ Role sync complete');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Role sync failed:', error);
    process.exit(1);
  });

