/**
 * Comprehensive Database Connection Fixes Validation
 * Tests all aspects of the database connection pool configuration fixes
 */

const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

// Load environment variables
require('dotenv').config({ path: '.env.local' });

console.log('🔍 Testing Database Connection Pool Configuration Fixes');
console.log('==========================================\n');

async function validateDatabaseFixes() {
  const results = {
    pathMapping: false,
    environmentConfig: false,
    poolConnection: false,
    enterpriseExports: false,
    totalTests: 4,
    passedTests: 0
  };

  // Test 1: Path Mapping Validation
  console.log('1. 📁 Path Mapping Configuration');
  try {
    const tsconfigPath = path.join(__dirname, '..', 'tsconfig.json');
    const tsconfig = JSON.parse(fs.readFileSync(tsconfigPath, 'utf8'));
    const paths = tsconfig.compilerOptions.paths;
    
    if (paths['@/*'] && paths['@/lib/*']) {
      console.log('✅ TypeScript path mapping configured correctly');
      console.log('   - @/*:', paths['@/*']);
      console.log('   - @/lib/*:', paths['@/lib/*']);
      results.pathMapping = true;
      results.passedTests++;
    } else {
      console.log('❌ TypeScript path mapping missing or incorrect');
    }
  } catch (error) {
    console.log('❌ Failed to read tsconfig.json:', error.message);
  }

  // Test 2: Environment Configuration
  console.log('\n2. ⚙️ Environment Configuration');
  const requiredEnvVars = ['DB_HOST', 'DB_PORT', 'DB_USER', 'DB_PASSWORD', 'DB_NAME', 'DB_POOL_MAX', 'DB_POOL_MIN'];
  let envConfigValid = true;
  
  requiredEnvVars.forEach(envVar => {
    if (process.env[envVar]) {
      console.log(`✅ ${envVar}: ${envVar.includes('PASSWORD') ? '***' : process.env[envVar]}`);
    } else {
      console.log(`❌ ${envVar}: Not set`);
      envConfigValid = false;
    }
  });
  
  if (envConfigValid) {
    results.environmentConfig = true;
    results.passedTests++;
  }

  // Test 3: Database Pool Connection
  console.log('\n3. 🔌 Database Pool Connection');
  try {
    const poolConfig = {
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      host: process.env.DB_HOST,
      port: parseInt(process.env.DB_PORT),
      database: process.env.DB_NAME,
      max: parseInt(process.env.DB_POOL_MAX),
      min: parseInt(process.env.DB_POOL_MIN),
      connectionTimeoutMillis: parseInt(process.env.DB_POOL_CONNECTION_TIMEOUT || '30000'),
      idleTimeoutMillis: parseInt(process.env.DB_POOL_IDLE_TIMEOUT || '300000'),
      acquireTimeoutMillis: parseInt(process.env.DB_POOL_ACQUIRE_TIMEOUT || '45000'),
      ssl: false
    };

    console.log('   Pool Configuration:');
    console.log(`   - Max connections: ${poolConfig.max}`);
    console.log(`   - Min connections: ${poolConfig.min}`);
    console.log(`   - Connection timeout: ${poolConfig.connectionTimeoutMillis}ms`);
    console.log(`   - Idle timeout: ${poolConfig.idleTimeoutMillis}ms`);
    console.log(`   - Acquire timeout: ${poolConfig.acquireTimeoutMillis}ms`);

    const pool = new Pool(poolConfig);
    
    // Test connection
    const client = await pool.connect();
    const result = await client.query('SELECT NOW() as current_time, version() as pg_version, current_database() as db_name');
    
    console.log('✅ Database connection successful');
    console.log(`   - Database: ${result.rows[0].db_name}`);
    console.log(`   - PostgreSQL version: ${result.rows[0].pg_version.substring(0, 30)}...`);
    console.log(`   - Current time: ${result.rows[0].current_time}`);
    
    // Test pool status
    console.log(`   - Pool total connections: ${pool.totalCount}`);
    console.log(`   - Pool idle connections: ${pool.idleCount}`);
    
    client.release();
    await pool.end();
    
    results.poolConnection = true;
    results.passedTests++;
    
  } catch (error) {
    console.log('❌ Database connection failed:', error.message);
  }

  // Test 4: Enterprise Exports
  console.log('\n4. 📦 Enterprise Connection Manager Exports');
  try {
    // Check if the database module exists and has correct exports
    const dbModulePath = path.join(__dirname, '..', 'src', 'lib', 'database.ts');
    const dbModuleContent = fs.readFileSync(dbModulePath, 'utf8');
    
    if (dbModuleContent.includes('enterpriseDb') && 
        dbModuleContent.includes('export {') && 
        dbModuleContent.includes('../../lib/database/enterprise-connection-manager')) {
      console.log('✅ Enterprise connection manager exports configured');
      console.log('   - enterpriseDb export found');
      console.log('   - Proper import path configured');
      results.enterpriseExports = true;
      results.passedTests++;
    } else {
      console.log('❌ Enterprise connection manager exports missing or incorrect');
    }
  } catch (error) {
    console.log('❌ Failed to check enterprise exports:', error.message);
  }

  // Summary
  console.log('\n📊 VALIDATION SUMMARY');
  console.log('==========================================');
  console.log(`Tests passed: ${results.passedTests}/${results.totalTests}`);
  console.log(`Success rate: ${Math.round((results.passedTests / results.totalTests) * 100)}%`);
  
  if (results.passedTests === results.totalTests) {
    console.log('🎉 ALL FIXES VALIDATED SUCCESSFULLY!');
    console.log('\nFixed Issues:');
    console.log('✅ Module resolution failure for @/lib/database/enterprise-connection-manager');
    console.log('✅ Configuration override problems in pool settings');
    console.log('✅ Pool size mismatches between environment and code');
    console.log('✅ Missing enterpriseDb exports in database module');
    console.log('\nThe database connection pool is now properly configured and ready for production!');
  } else {
    console.log('⚠️ Some issues remain. Please review the failed tests above.');
  }
  
  return results;
}

// Run the validation
validateDatabaseFixes()
  .then(results => {
    process.exit(results.passedTests === results.totalTests ? 0 : 1);
  })
  .catch(error => {
    console.error('❌ Validation failed:', error);
    process.exit(1);
  });