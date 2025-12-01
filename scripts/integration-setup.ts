#!/usr/bin/env tsx

/**
 * Comprehensive Integration Setup Script
 *
 * This script handles the complete setup of the MantisNXT application including:
 * - Database initialization and schema setup
 * - Environment configuration
 * - Service validation
 * - Performance optimization
 *
 * Usage:
 *   npx tsx scripts/integration-setup.ts
 */

import fs from 'fs';
import path from 'path';
import { Pool } from 'pg';
import { spawn } from 'child_process';
import { promisify } from 'util';

// Load environment variables
function loadEnv() {
  try {
    require('dotenv').config({ path: path.resolve(process.cwd(), '.env.local') });
  } catch (error) {
    console.warn('No .env.local file found, using system environment variables');
  }
}

// Utility functions
function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

function parsePgUrl(dsn: string) {
  const url = new URL(dsn);
  return {
    host: url.hostname,
    port: url.port || '5432',
    database: (url.pathname || '/').replace(/^\//, '') || 'postgres',
    user: decodeURIComponent(url.username || ''),
    password: decodeURIComponent(url.password || ''),
  };
}

async function runSqlFile(pool: Pool, filePath: string): Promise<void> {
  const fullPath = path.resolve(process.cwd(), filePath);
  if (!fs.existsSync(fullPath)) {
    throw new Error(`SQL file not found: ${fullPath}`);
  }

  const sql = fs.readFileSync(fullPath, 'utf8');
  console.log(`Executing SQL file: ${filePath}`);
  await pool.query(sql);
}

async function runCommand(command: string, args: string[] = [], options: any = {}): Promise<void> {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      stdio: 'inherit',
      shell: true,
      ...options,
    });

    child.on('close', code => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`Command failed with exit code ${code}`));
      }
    });

    child.on('error', error => {
      reject(error);
    });
  });
}

// Database setup functions
async function setupDatabase(): Promise<void> {
  console.log('🗄️  Setting up database...');

  const databaseUrl = process.env.DATABASE_URL || process.env.NEON_DATABASE_URL;
  if (!databaseUrl) {
    throw new Error(
      'No database URL provided. Set DATABASE_URL or NEON_DATABASE_URL environment variable.'
    );
  }

  const pool = new Pool({
    connectionString: databaseUrl,
    ssl: { rejectUnauthorized: false },
  });

  try {
    // Run core schema migrations
    console.log('📋 Running core schema migrations...');
    await runSqlFile(pool, 'migrations/0001_init_core_corrected.sql');

    console.log('📋 Running supply chain migrations...');
    await runSqlFile(pool, 'migrations/0002_supply_chain_corrected.sql');

    console.log('📋 Running AI workspace migrations...');
    await runSqlFile(pool, 'migrations/0003_ai_workspace.sql');

    console.log('📋 Running customer operations migrations...');
    await runSqlFile(pool, 'migrations/0004_customer_ops.sql');

    console.log('📋 Running integrations migrations...');
    await runSqlFile(pool, 'migrations/0005_integrations.sql');

    console.log('📋 Running dashboards migrations...');
    await runSqlFile(pool, 'migrations/0006_dashboards.sql');

    console.log('📋 Running RLS policies migrations...');
    await runSqlFile(pool, 'migrations/0007_rls_policies.sql');

    console.log('📋 Running views and RPC migrations...');
    await runSqlFile(pool, 'migrations/0008_views_rpc.sql');

    console.log('📋 Running performance indexes migrations...');
    await runSqlFile(pool, 'migrations/0009_indexes_perf.sql');

    console.log('📋 Running seed data migrations...');
    await runSqlFile(pool, 'migrations/0010_seed.sql');

    console.log('📋 Running enhanced inventory system migrations...');
    await runSqlFile(pool, 'migrations/0011_enhanced_inventory_system.sql');

    console.log('📋 Running inventory performance indexes migrations...');
    await runSqlFile(pool, 'migrations/0012_inventory_performance_indexes.sql');

    // Run unified inventory schema migrations
    console.log('📋 Running unified inventory schema migrations...');
    await runSqlFile(pool, 'migrations/0200_unify_inventory_schema.sql');
    await runSqlFile(pool, 'migrations/0201_adjust_inventory_indexes.sql');
    await runSqlFile(pool, 'migrations/0202_inventory_allocations.sql');
    await runSqlFile(pool, 'migrations/0204_inventory_constraints.sql');
    await runSqlFile(pool, 'migrations/0205_phase5_inventory.sql');

    console.log('✅ Database setup completed successfully');
  } catch (error) {
    console.error('❌ Database setup failed:', error);
    throw error;
  } finally {
    await pool.end();
  }
}

// Environment setup
async function setupEnvironment(): Promise<void> {
  console.log('🔧 Setting up environment configuration...');

  const envPath = path.resolve(process.cwd(), '.env.local');
  const envContent = `
# Database Configuration
DATABASE_URL=${process.env.DATABASE_URL || ''}
NEON_DATABASE_URL=${process.env.NEON_DATABASE_URL || ''}

# Authentication
JWT_SECRET=${process.env.JWT_SECRET || 'your-super-secret-jwt-key-here'}
JWT_EXPIRES_IN=${process.env.JWT_EXPIRES_IN || '24h'}

# API Configuration
API_BASE_URL=${process.env.API_BASE_URL || 'http://localhost:3000/api'}

# Security
ENABLE_RATE_LIMITING=${process.env.ENABLE_RATE_LIMITING || 'true'}
RATE_LIMIT_REQUESTS=${process.env.RATE_LIMIT_REQUESTS || '100'}
RATE_LIMIT_WINDOW=${process.env.RATE_LIMIT_WINDOW || '60000'}

# File Upload
UPLOAD_DIR=${process.env.UPLOAD_DIR || '/app/uploads'}
UPLOAD_MAX_SIZE=${process.env.UPLOAD_MAX_SIZE || '10485760'}
UPLOAD_ALLOWED_TYPES=${process.env.UPLOAD_ALLOWED_TYPES || 'image/jpeg,image/png,image/gif,application/pdf,text/csv,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'}

# Development
NODE_ENV=${process.env.NODE_ENV || 'development'}
NEXT_PUBLIC_APP_URL=${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}

# Audit Logging
AUDIT_LOG_ENDPOINT=${process.env.AUDIT_LOG_ENDPOINT || ''}
AUDIT_LOG_TOKEN=${process.env.AUDIT_LOG_TOKEN || ''}
`;

  fs.writeFileSync(envPath, envContent.trim());
  console.log('✅ Environment configuration created');
}

// Service validation
async function validateServices(): Promise<void> {
  console.log('🔍 Validating services...');

  // Check if database is accessible
  const databaseUrl = process.env.DATABASE_URL || process.env.NEON_DATABASE_URL;
  if (databaseUrl) {
    const pool = new Pool({
      connectionString: databaseUrl,
      ssl: { rejectUnauthorized: false },
    });

    try {
      await pool.query('SELECT 1');
      console.log('✅ Database connection validated');
    } catch (error) {
      console.error('❌ Database connection failed:', error);
      throw error;
    } finally {
      await pool.end();
    }
  }

  // Check if required files exist
  const requiredFiles = [
    'package.json',
    'next.config.js',
    'src/app/layout.tsx',
    'src/app/page.tsx',
  ];

  for (const file of requiredFiles) {
    const filePath = path.resolve(process.cwd(), file);
    if (!fs.existsSync(filePath)) {
      throw new Error(`Required file not found: ${file}`);
    }
  }

  console.log('✅ All required files validated');
}

// Performance optimization
async function optimizePerformance(): Promise<void> {
  console.log('⚡ Optimizing performance...');

  try {
    // Install dependencies if needed
    if (!fs.existsSync('node_modules')) {
      console.log('📦 Installing dependencies...');
      await runCommand('npm', ['install']);
    }

    // Build the application
    console.log('🏗️  Building application...');
    await runCommand('npm', ['run', 'build']);

    console.log('✅ Performance optimization completed');
  } catch (error) {
    console.error('❌ Performance optimization failed:', error);
    throw error;
  }
}

// Main execution
async function main(): Promise<void> {
  console.log('🚀 Starting MantisNXT Integration Setup...');

  try {
    // Load environment variables
    loadEnv();

    // Validate services
    await validateServices();

    // Setup environment
    await setupEnvironment();

    // Setup database
    await setupDatabase();

    // Optimize performance
    await optimizePerformance();

    console.log('🎉 Integration setup completed successfully!');
    console.log('');
    console.log('Next steps:');
    console.log('1. Start the development server: npm run dev');
    console.log('2. Open http://localhost:3000 in your browser');
    console.log('3. Test the application functionality');
  } catch (error) {
    console.error('💥 Integration setup failed:', error);
    process.exit(1);
  }
}

// Run the setup
if (require.main === module) {
  main();
}

export { main as setupIntegration };
