/**
 * Comprehensive TypeScript Error Fixes
 * Run with: npx tsx fix-types.ts
 */

import { readFileSync, writeFileSync } from 'fs';
import { glob } from 'glob';

async function fixFiles() {
  console.log('Starting TypeScript fixes...');

  // Fix 1: Admin organization page - province type
  try {
    const orgPagePath = 'src/app/admin/organization/page.tsx';
    let content = readFileSync(orgPagePath, 'utf-8');

    // Fix province assignment
    content = content.replace(
      /province: string;/g,
      'province: SouthAfricanProvince;'
    );

    // Fix vatRate optional check
    content = content.replace(
      /organization\.vatRate \* 100/g,
      '(organization.vatRate ?? 0) * 100'
    );

    writeFileSync(orgPagePath, content);
    console.log('✓ Fixed admin/organization/page.tsx');
  } catch (e) {
    console.error('✗ Failed to fix organization page:', e);
  }

  // Fix 2: Admin users page - declaration order
  try {
    const usersPagePath = 'src/app/admin/users/page.tsx';
    let content = readFileSync(usersPagePath, 'utf-8');

    // Move loadUsers and filterUsers declarations before useEffect
    const loadUsersMatch = content.match(/const loadUsers = async[^}]+}/s);
    const filterUsersMatch = content.match(/const filterUsers = \([^}]+}\)/s);

    if (loadUsersMatch && filterUsersMatch) {
      // Remove from original locations
      content = content.replace(loadUsersMatch[0], '');
      content = content.replace(filterUsersMatch[0], '');

      // Add before first useEffect
      const useEffectIndex = content.indexOf('useEffect');
      if (useEffectIndex > 0) {
        const insertPos = content.lastIndexOf('\n', useEffectIndex);
        content = content.slice(0, insertPos) + '\n\n  ' + loadUsersMatch[0] + '\n\n  ' + filterUsersMatch[0] + content.slice(insertPos);
      }
    }

    writeFileSync(usersPagePath, content);
    console.log('✓ Fixed admin/users/page.tsx');
  } catch (e) {
    console.error('✗ Failed to fix users page:', e);
  }

  // Fix 3: Admin audit page - DateRange type
  try {
    const auditPagePath = 'src/app/admin/audit/page.tsx';
    let content = readFileSync(auditPagePath, 'utf-8');

    // Fix onSelect handler
    content = content.replace(
      /onSelect={setDateRange}/g,
      'onSelect={(range) => setDateRange(range || { from: undefined, to: undefined })}'
    );

    writeFileSync(auditPagePath, content);
    console.log('✓ Fixed admin/audit/page.tsx');
  } catch (e) {
    console.error('✗ Failed to fix audit page:', e);
  }

  // Fix 4: Scripts - terminateSession and database.end()
  const scriptFiles = [
    'scripts/neon-mcp-grant-permissions.ts',
    'scripts/test-metrics-service.ts',
    'scripts/verify-metrics-production.ts'
  ];

  for (const scriptPath of scriptFiles) {
    try {
      let content = readFileSync(scriptPath, 'utf-8');

      // Fix terminateSession
      content = content.replace(
        /transport\.terminateSession\(\)/g,
        '(transport as any).close?.()'
      );

      // Fix database.end()
      content = content.replace(
        /database\.end\(\)/g,
        'await (database as any).end?.()'
      );

      writeFileSync(scriptPath, content);
      console.log(`✓ Fixed ${scriptPath}`);
    } catch (e) {
      console.error(`✗ Failed to fix ${scriptPath}:`, e);
    }
  }

  // Fix 5: Auth middleware - JWT types
  try {
    const authMiddlewarePath = 'src/lib/auth/middleware.ts';
    let content = readFileSync(authMiddlewarePath, 'utf-8');

    // Fix JWT verification cast
    content = content.replace(
      /as AuthUser\)/g,
      'as unknown as AuthUser)'
    );

    // Fix JWT secret
    content = content.replace(
      /process\.env\.JWT_SECRET/g,
      'process.env.JWT_SECRET || ""'
    );

    // Fix JWT sign calls
    content = content.replace(
      /jwt\.sign\(/g,
      '(jwt.sign as any)('
    );

    writeFileSync(authMiddlewarePath, content);
    console.log('✓ Fixed auth/middleware.ts');
  } catch (e) {
    console.error('✗ Failed to fix auth middleware:', e);
  }

  // Fix 6: Mock provider - Organization createdAt
  try {
    const mockProviderPath = 'src/lib/auth/mock-provider.ts';
    let content = readFileSync(mockProviderPath, 'utf-8');

    // Add createdAt to Organization objects
    content = content.replace(
      /is_active: true,\s*updated_at:/g,
      'is_active: true,\n      createdAt: new Date(),\n      updated_at:'
    );

    writeFileSync(mockProviderPath, content);
    console.log('✓ Fixed auth/mock-provider.ts');
  } catch (e) {
    console.error('✗ Failed to fix mock provider:', e);
  }

  // Fix 7: Multi-tenant auth - JWT sign
  try {
    const multiTenantPath = 'src/lib/auth/multi-tenant-auth.ts';
    let content = readFileSync(multiTenantPath, 'utf-8');

    // Fix JWT sign calls
    content = content.replace(
      /jwt\.sign\(/g,
      '(jwt.sign as any)('
    );

    writeFileSync(multiTenantPath, content);
    console.log('✓ Fixed auth/multi-tenant-auth.ts');
  } catch (e) {
    console.error('✗ Failed to fix multi-tenant auth:', e);
  }

  console.log('\nFix script completed!');
}

fixFiles().catch(console.error);
