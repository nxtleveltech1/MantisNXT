#!/usr/bin/env tsx
/**
 * Production Secrets Generator
 *
 * Generates cryptographically secure secrets for production environment
 *
 * CRITICAL: Store generated secrets in a secure secrets manager
 * DO NOT commit these secrets to version control
 *
 * @module scripts/generate-production-secrets
 * @author AS Team - Security Compliance
 */

import crypto from 'crypto';
import fs from 'fs';
import path from 'path';

// ============================================================================
// CONFIGURATION
// ============================================================================

interface Secret {
  name: string;
  description: string;
  bytesLength: number;
  minEntropy: number; // bits
  purpose: string;
}

const SECRETS_CONFIG: Secret[] = [
  {
    name: 'PII_ENCRYPTION_KEY',
    description: 'AES-256-GCM encryption key for PII (POPIA compliant)',
    bytesLength: 32, // 256 bits
    minEntropy: 256,
    purpose: 'Encrypts sensitive personal information (SA ID numbers, etc.)',
  },
  {
    name: 'PII_ENCRYPTION_SALT',
    description: 'PBKDF2 salt for PII encryption key derivation',
    bytesLength: 64, // 512 bits
    minEntropy: 512,
    purpose: 'Salt for PBKDF2 key derivation (100,000 iterations)',
  },
  {
    name: 'JWT_SECRET',
    description: 'Secret for JWT token signing',
    bytesLength: 64, // 512 bits
    minEntropy: 512,
    purpose: 'Signs and verifies JWT authentication tokens',
  },
  {
    name: 'NEXTAUTH_SECRET',
    description: 'NextAuth.js secret for session encryption',
    bytesLength: 64, // 512 bits
    minEntropy: 512,
    purpose: 'Encrypts NextAuth.js session cookies',
  },
  {
    name: 'SESSION_SECRET',
    description: 'Secret for session cookie encryption',
    bytesLength: 32, // 256 bits
    minEntropy: 256,
    purpose: 'Encrypts session cookies (HTTP-only)',
  },
  {
    name: 'TOTP_ENCRYPTION_KEY',
    description: 'Secret for encrypting 2FA TOTP secrets in database',
    bytesLength: 32, // 256 bits
    minEntropy: 256,
    purpose: 'Encrypts user 2FA secrets stored in database',
  },
  {
    name: 'WEBHOOK_SIGNING_SECRET',
    description: 'Secret for signing webhook payloads',
    bytesLength: 32, // 256 bits
    minEntropy: 256,
    purpose: 'Signs webhook payloads to prevent tampering',
  },
  {
    name: 'API_ENCRYPTION_KEY',
    description: 'Secret for encrypting API keys in database',
    bytesLength: 32, // 256 bits
    minEntropy: 256,
    purpose: 'Encrypts third-party API keys stored in database',
  },
];

// ============================================================================
// SECRET GENERATION
// ============================================================================

/**
 * Generate cryptographically secure random bytes
 */
function generateSecureSecret(bytesLength: number): string {
  return crypto.randomBytes(bytesLength).toString('hex');
}

/**
 * Calculate Shannon entropy of a string (bits)
 */
function calculateEntropy(str: string): number {
  const len = str.length;
  const frequencies: { [key: string]: number } = {};

  // Count character frequencies
  for (const char of str) {
    frequencies[char] = (frequencies[char] || 0) + 1;
  }

  // Calculate entropy
  let entropy = 0;
  for (const char in frequencies) {
    const probability = frequencies[char] / len;
    entropy -= probability * Math.log2(probability);
  }

  return entropy * len;
}

/**
 * Validate secret strength
 */
function validateSecretStrength(
  secret: string,
  minEntropy: number
): {
  valid: boolean;
  entropy: number;
  message: string;
} {
  const entropy = calculateEntropy(secret);

  if (entropy < minEntropy) {
    return {
      valid: false,
      entropy,
      message: `Insufficient entropy: ${entropy.toFixed(2)} bits (minimum: ${minEntropy} bits)`,
    };
  }

  return {
    valid: true,
    entropy,
    message: `Strong secret: ${entropy.toFixed(2)} bits entropy`,
  };
}

// ============================================================================
// OUTPUT FORMATTING
// ============================================================================

interface GeneratedSecret {
  name: string;
  value: string;
  entropy: number;
  purpose: string;
}

/**
 * Generate all secrets with validation
 */
function generateAllSecrets(): GeneratedSecret[] {
  const secrets: GeneratedSecret[] = [];

  for (const config of SECRETS_CONFIG) {
    const value = generateSecureSecret(config.bytesLength);
    const validation = validateSecretStrength(value, config.minEntropy);

    if (!validation.valid) {
      throw new Error(`Failed to generate ${config.name}: ${validation.message}`);
    }

    secrets.push({
      name: config.name,
      value,
      entropy: validation.entropy,
      purpose: config.purpose,
    });
  }

  return secrets;
}

/**
 * Format secrets as .env file
 */
function formatAsEnvFile(secrets: GeneratedSecret[]): string {
  let output = '# ============================================================================\n';
  output += '# PRODUCTION SECRETS - GENERATED ' + new Date().toISOString() + '\n';
  output += '# ============================================================================\n';
  output += '#\n';
  output += '# ⚠️  CRITICAL SECURITY WARNING:\n';
  output += '#\n';
  output += '# 1. DO NOT commit this file to version control\n';
  output += '# 2. Store in secure secrets manager (AWS Secrets Manager, Vercel, etc.)\n';
  output += '# 3. Use environment-specific secrets (dev/staging/production)\n';
  output += '# 4. Rotate secrets every 90 days\n';
  output += '# 5. Never share secrets via email/Slack/unencrypted channels\n';
  output += '#\n';
  output += '# ============================================================================\n\n';

  for (const secret of secrets) {
    output += `# ${secret.purpose}\n`;
    output += `# Entropy: ${secret.entropy.toFixed(2)} bits\n`;
    output += `${secret.name}=${secret.value}\n\n`;
  }

  return output;
}

/**
 * Format secrets as JSON (for secrets managers)
 */
function formatAsJSON(secrets: GeneratedSecret[]): string {
  const obj: { [key: string]: string } = {};
  for (const secret of secrets) {
    obj[secret.name] = secret.value;
  }
  return JSON.stringify(obj, null, 2);
}

/**
 * Display secrets in terminal (masked)
 */
function displaySecrets(secrets: GeneratedSecret[]): void {
  console.log('\n' + '═'.repeat(80));
  console.log('🔐 PRODUCTION SECRETS GENERATED');
  console.log('═'.repeat(80) + '\n');

  for (const secret of secrets) {
    const maskedValue =
      secret.value.substring(0, 8) + '...' + secret.value.substring(secret.value.length - 8);
    console.log(`✅ ${secret.name}`);
    console.log(`   ${maskedValue}`);
    console.log(`   Entropy: ${secret.entropy.toFixed(2)} bits`);
    console.log(`   Purpose: ${secret.purpose}`);
    console.log();
  }
}

// ============================================================================
// MAIN EXECUTION
// ============================================================================

async function main() {
  console.log('\n🚀 Production Secrets Generator');
  console.log('================================\n');

  try {
    // Generate all secrets
    console.log('⏳ Generating cryptographically secure secrets...\n');
    const secrets = generateAllSecrets();

    // Display masked secrets
    displaySecrets(secrets);

    // Create output directory
    const outputDir = path.join(process.cwd(), 'secrets');
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    // Write .env format
    const envPath = path.join(outputDir, '.env.production.secrets');
    fs.writeFileSync(envPath, formatAsEnvFile(secrets), 'utf8');
    console.log(`✅ Secrets saved to: ${envPath}`);

    // Write JSON format
    const jsonPath = path.join(outputDir, 'production-secrets.json');
    fs.writeFileSync(jsonPath, formatAsJSON(secrets), 'utf8');
    console.log(`✅ JSON format saved to: ${jsonPath}`);

    // Security instructions
    console.log('\n' + '═'.repeat(80));
    console.log('⚠️  NEXT STEPS - CRITICAL');
    console.log('═'.repeat(80) + '\n');
    console.log('1. Copy secrets to your production secrets manager:');
    console.log('   - Vercel: Project Settings → Environment Variables');
    console.log('   - AWS: AWS Secrets Manager or Parameter Store');
    console.log('   - Azure: Azure Key Vault');
    console.log('   - GCP: Google Secret Manager');
    console.log();
    console.log('2. Set environment to "Production" (not Development/Preview)');
    console.log();
    console.log('3. Delete local secret files after upload:');
    console.log(`   rm -rf ${outputDir}`);
    console.log();
    console.log('4. Verify secrets are loaded in production environment');
    console.log('   npm run deploy:checklist:production');
    console.log();
    console.log('5. NEVER commit secrets to version control!');
    console.log('   (secrets/ directory is in .gitignore)');
    console.log();
    console.log('═'.repeat(80) + '\n');

    // Add to .gitignore if not already there
    const gitignorePath = path.join(process.cwd(), '.gitignore');
    let gitignoreContent = '';
    if (fs.existsSync(gitignorePath)) {
      gitignoreContent = fs.readFileSync(gitignorePath, 'utf8');
    }

    if (!gitignoreContent.includes('secrets/')) {
      fs.appendFileSync(
        gitignorePath,
        '\n# Production secrets (DO NOT COMMIT)\nsecrets/\n*.secrets\n',
        'utf8'
      );
      console.log('✅ Added secrets/ to .gitignore');
    }
  } catch (error) {
    console.error('\n❌ Error generating secrets:', error);
    process.exit(1);
  }
}

// Run if executed directly
if (require.main === module) {
  main();
}

export { generateSecureSecret, validateSecretStrength, calculateEntropy };
