#!/usr/bin/env tsx
/**
 * Environment Configuration Validator
 *
 * Validates production environment configuration:
 * - All required variables are set
 * - Secrets meet minimum strength requirements
 * - Connection strings are properly formatted
 * - External services are reachable (optional)
 *
 * @module scripts/validate-env-config
 * @author AS Team - Deployment Engineer
 */

import crypto from 'crypto';
import { createClient } from 'redis';
import { Client } from 'pg';

// ============================================================================
// CONFIGURATION
// ============================================================================

interface EnvVariable {
  name: string;
  required: boolean;
  type: 'string' | 'url' | 'secret' | 'number' | 'boolean';
  minLength?: number;
  minEntropy?: number; // bits
  pattern?: RegExp;
  description: string;
  example?: string;
}

const ENV_VARIABLES: EnvVariable[] = [
  // Database
  {
    name: 'DATABASE_URL',
    required: true,
    type: 'url',
    pattern: /^postgresql:\/\/.+/,
    description: 'Neon PostgreSQL connection string',
    example: 'postgresql://user:pass@host/db?sslmode=require',
  },

  // Authentication - Stack Auth
  {
    name: 'STACK_AUTH_PROJECT_ID',
    required: true,
    type: 'string',
    minLength: 10,
    description: 'Stack Auth project identifier',
  },
  {
    name: 'STACK_AUTH_API_KEY',
    required: true,
    type: 'secret',
    minLength: 32,
    minEntropy: 128,
    description: 'Stack Auth API key',
  },

  // NextAuth
  {
    name: 'NEXTAUTH_URL',
    required: true,
    type: 'url',
    pattern: /^https?:\/\/.+/,
    description: 'Application base URL',
    example: 'https://your-domain.com',
  },
  {
    name: 'NEXTAUTH_SECRET',
    required: true,
    type: 'secret',
    minLength: 64,
    minEntropy: 512,
    description: 'NextAuth.js session encryption secret',
  },

  // JWT
  {
    name: 'JWT_SECRET',
    required: true,
    type: 'secret',
    minLength: 64,
    minEntropy: 512,
    description: 'JWT signing secret',
  },

  // Session
  {
    name: 'SESSION_SECRET',
    required: true,
    type: 'secret',
    minLength: 32,
    minEntropy: 256,
    description: 'Session cookie encryption secret',
  },

  // PII Encryption (POPIA Compliance)
  {
    name: 'PII_ENCRYPTION_KEY',
    required: true,
    type: 'secret',
    minLength: 32,
    minEntropy: 256,
    description: 'AES-256-GCM key for PII encryption',
  },
  {
    name: 'PII_ENCRYPTION_SALT',
    required: true,
    type: 'secret',
    minLength: 64,
    minEntropy: 512,
    description: 'PBKDF2 salt for PII encryption',
  },

  // 2FA / TOTP
  {
    name: 'TOTP_ENCRYPTION_KEY',
    required: true,
    type: 'secret',
    minLength: 32,
    minEntropy: 256,
    description: 'Encryption key for 2FA TOTP secrets',
  },

  // Redis
  {
    name: 'REDIS_URL',
    required: true,
    type: 'url',
    pattern: /^redis(s)?:\/\/.+/,
    description: 'Redis connection URL',
    example: 'redis://default:password@hostname:6379',
  },

  // Application
  {
    name: 'NODE_ENV',
    required: true,
    type: 'string',
    pattern: /^(production|staging|development)$/,
    description: 'Node environment',
  },
  {
    name: 'NEXT_PUBLIC_APP_URL',
    required: true,
    type: 'url',
    pattern: /^https?:\/\/.+/,
    description: 'Public application URL',
  },

  // Optional but recommended
  {
    name: 'WEBHOOK_SIGNING_SECRET',
    required: false,
    type: 'secret',
    minLength: 32,
    minEntropy: 256,
    description: 'Webhook payload signing secret',
  },
  {
    name: 'SLACK_WEBHOOK_URL',
    required: false,
    type: 'url',
    pattern: /^https:\/\/hooks\.slack\.com\/.+/,
    description: 'Slack webhook for production alerts',
  },
];

// ============================================================================
// VALIDATION FUNCTIONS
// ============================================================================

/**
 * Calculate Shannon entropy
 */
function calculateEntropy(str: string): number {
  const len = str.length;
  const frequencies: { [key: string]: number } = {};

  for (const char of str) {
    frequencies[char] = (frequencies[char] || 0) + 1;
  }

  let entropy = 0;
  for (const char in frequencies) {
    const probability = frequencies[char] / len;
    entropy -= probability * Math.log2(probability);
  }

  return entropy * len;
}

/**
 * Validate single environment variable
 */
function validateEnvVariable(config: EnvVariable): {
  valid: boolean;
  warning: boolean;
  message: string;
  details?: any;
} {
  const value = process.env[config.name];

  // Check if required
  if (config.required && !value) {
    return {
      valid: false,
      warning: false,
      message: `Required variable not set: ${config.name}`,
      details: {
        description: config.description,
        example: config.example,
      },
    };
  }

  // Skip if optional and not set
  if (!config.required && !value) {
    return {
      valid: true,
      warning: true,
      message: `Optional variable not set: ${config.name}`,
    };
  }

  if (!value) {
    return {
      valid: true,
      warning: false,
      message: 'Variable not set (optional)',
    };
  }

  // Type-specific validation
  switch (config.type) {
    case 'url':
      try {
        new URL(value);
        if (config.pattern && !config.pattern.test(value)) {
          return {
            valid: false,
            warning: false,
            message: `Invalid URL format for ${config.name}`,
            details: { expected: config.pattern.toString() },
          };
        }
      } catch {
        return {
          valid: false,
          warning: false,
          message: `Invalid URL: ${config.name}`,
        };
      }
      break;

    case 'secret':
      // Check minimum length
      if (config.minLength && value.length < config.minLength) {
        return {
          valid: false,
          warning: false,
          message: `${config.name} too short (${value.length} < ${config.minLength} characters)`,
        };
      }

      // Check entropy
      if (config.minEntropy) {
        const entropy = calculateEntropy(value);
        if (entropy < config.minEntropy) {
          return {
            valid: false,
            warning: false,
            message: `${config.name} has insufficient entropy (${entropy.toFixed(2)} < ${config.minEntropy} bits)`,
            details: {
              entropy: entropy.toFixed(2),
              minimum: config.minEntropy,
            },
          };
        }
      }
      break;

    case 'string':
      if (config.minLength && value.length < config.minLength) {
        return {
          valid: false,
          warning: false,
          message: `${config.name} too short`,
        };
      }
      if (config.pattern && !config.pattern.test(value)) {
        return {
          valid: false,
          warning: false,
          message: `${config.name} doesn't match required pattern`,
        };
      }
      break;

    case 'number':
      if (isNaN(Number(value))) {
        return {
          valid: false,
          warning: false,
          message: `${config.name} is not a valid number`,
        };
      }
      break;

    case 'boolean':
      if (!['true', 'false', '1', '0'].includes(value.toLowerCase())) {
        return {
          valid: false,
          warning: false,
          message: `${config.name} is not a valid boolean`,
        };
      }
      break;
  }

  return {
    valid: true,
    warning: false,
    message: 'Valid',
  };
}

/**
 * Test database connection
 */
async function testDatabaseConnection(): Promise<{
  valid: boolean;
  message: string;
  details?: any;
}> {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    return {
      valid: false,
      message: 'DATABASE_URL not set',
    };
  }

  const client = new Client({ connectionString: databaseUrl });

  try {
    await client.connect();
    const result = await client.query('SELECT version()');
    const version = result.rows[0].version;

    await client.end();

    return {
      valid: true,
      message: 'Database connection successful',
      details: {
        version: version.split(' ').slice(0, 2).join(' '),
      },
    };
  } catch (error) {
    return {
      valid: false,
      message: `Database connection failed: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
}

/**
 * Test Redis connection
 */
async function testRedisConnection(): Promise<{
  valid: boolean;
  message: string;
  details?: any;
}> {
  const redisUrl = process.env.REDIS_URL;
  if (!redisUrl) {
    return {
      valid: false,
      message: 'REDIS_URL not set',
    };
  }

  const client = createClient({
    url: redisUrl,
    socket: {
      connectTimeout: 5000,
      reconnectStrategy: false,
    },
  });

  try {
    await client.connect();
    const pong = await client.ping();

    if (pong !== 'PONG') {
      throw new Error(`Unexpected ping response: ${pong}`);
    }

    const info = await client.info();
    const version = info.match(/redis_version:([^\r\n]+)/)?.[1] || 'unknown';

    await client.quit();

    return {
      valid: true,
      message: 'Redis connection successful',
      details: { version },
    };
  } catch (error) {
    return {
      valid: false,
      message: `Redis connection failed: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
}

// ============================================================================
// MAIN EXECUTION
// ============================================================================

async function main() {
  console.log('\n🚀 Environment Configuration Validation');
  console.log('======================================\n');

  const results: Array<{
    category: string;
    name: string;
    status: 'passed' | 'failed' | 'warning';
    message: string;
    details?: any;
  }> = [];

  // Validate environment variables
  console.log('⏳ Validating environment variables...\n');

  for (const config of ENV_VARIABLES) {
    const result = validateEnvVariable(config);

    results.push({
      category: 'Environment Variables',
      name: config.name,
      status: !result.valid ? 'failed' : result.warning ? 'warning' : 'passed',
      message: result.message,
      details: result.details,
    });
  }

  // Test database connection
  console.log('⏳ Testing database connection...\n');
  const dbResult = await testDatabaseConnection();
  results.push({
    category: 'Database',
    name: 'Database Connection',
    status: dbResult.valid ? 'passed' : 'failed',
    message: dbResult.message,
    details: dbResult.details,
  });

  // Test Redis connection
  console.log('⏳ Testing Redis connection...\n');
  const redisResult = await testRedisConnection();
  results.push({
    category: 'Redis',
    name: 'Redis Connection',
    status: redisResult.valid ? 'passed' : 'failed',
    message: redisResult.message,
    details: redisResult.details,
  });

  // Display results
  console.log('═'.repeat(80));
  console.log('VALIDATION RESULTS');
  console.log('═'.repeat(80) + '\n');

  // Group by category
  const categories = [...new Set(results.map(r => r.category))];

  for (const category of categories) {
    console.log(`📋 ${category}`);
    console.log('─'.repeat(80));

    const categoryResults = results.filter(r => r.category === category);

    for (const result of categoryResults) {
      const icon = result.status === 'passed' ? '✅' : result.status === 'warning' ? '⚠️ ' : '❌';
      console.log(`${icon} ${result.name}`);
      console.log(`   ${result.message}`);

      if (result.details) {
        console.log(`   Details: ${JSON.stringify(result.details)}`);
      }

      console.log();
    }
  }

  // Summary
  const passed = results.filter(r => r.status === 'passed').length;
  const warnings = results.filter(r => r.status === 'warning').length;
  const failed = results.filter(r => r.status === 'failed').length;

  console.log('═'.repeat(80));
  console.log('SUMMARY');
  console.log('═'.repeat(80) + '\n');
  console.log(`✅ Passed:   ${passed}`);
  console.log(`⚠️  Warnings: ${warnings}`);
  console.log(`❌ Failed:   ${failed}`);
  console.log(`📊 Total:    ${results.length}\n`);

  // Exit status
  if (failed > 0) {
    console.log('❌ ENVIRONMENT VALIDATION: FAILED\n');
    console.log('Please fix the failed checks before deploying to production.\n');
    console.log('Common issues:');
    console.log('1. Missing required environment variables');
    console.log('2. Weak secrets (use: npm run secrets:generate)');
    console.log('3. Invalid connection strings');
    console.log('4. Unreachable external services\n');
    process.exit(1);
  } else if (warnings > 0) {
    console.log('⚠️  ENVIRONMENT VALIDATION: PASSED WITH WARNINGS\n');
    console.log('Review warnings before deploying to production.\n');
  } else {
    console.log('✅ ENVIRONMENT VALIDATION: PASSED\n');
    console.log('All checks passed! Environment is ready for production.\n');
  }

  console.log('Next steps:');
  console.log('1. Run database migrations: npm run db:migrate:production');
  console.log('2. Run pre-deployment checklist: npm run deploy:checklist');
  console.log('3. Deploy to production\n');
}

// Run if executed directly
if (require.main === module) {
  main().catch(error => {
    console.error('Unhandled error:', error);
    process.exit(1);
  });
}

export { validateEnvVariable, testDatabaseConnection, testRedisConnection };
