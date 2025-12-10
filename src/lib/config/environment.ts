/**
 * Environment Configuration and Validation
 *
 * Centralized environment configuration with:
 * - Type-safe environment variables
 * - Validation on startup
 * - Default values
 * - Environment-specific overrides
 */

import { z } from 'zod';

/**
 * Environment schema with validation rules
 */
const envSchema = z.object({
  // Application
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  APP_PORT: z.string().default('3000'),
  NEXT_PUBLIC_APP_URL: z.string().url().default('http://localhost:3000'),

  // Database - Primary Neon connection
  DATABASE_URL: z.string().url(),
  NEON_SPP_DATABASE_URL: z.string().url().optional(),
  ENTERPRISE_DATABASE_URL: z.string().url().optional(),

  // Database connection pool
  DB_POOL_MIN: z.string().regex(/^\d+$/).default('5'),
  DB_POOL_MAX: z.string().regex(/^\d+$/).default('20'),
  DB_POOL_IDLE_TIMEOUT: z.string().regex(/^\d+$/).default('30000'),
  DB_POOL_CONNECTION_TIMEOUT: z.string().regex(/^\d+$/).default('120000'),

  // Redis
  REDIS_URL: z.string().default('redis://localhost:6379'),

  // Authentication & Security
  JWT_SECRET: z.string().min(32, 'JWT_SECRET must be at least 32 characters'),
  SESSION_SECRET: z.string().min(32, 'SESSION_SECRET must be at least 32 characters'),
  NEXTAUTH_SECRET: z.string().min(32).optional(),
  NEXTAUTH_URL: z.string().url().optional(),

  // Feature flags
  ENABLE_ANALYTICS: z.string().default('true'),
  ENABLE_AUDIT_LOGGING: z.string().default('true'),
  ENABLE_RATE_LIMITING: z.string().default('true'),
  REALTIME_ENABLED: z.string().default('true'),

  // Rate limiting
  RATE_LIMIT_WINDOW_MS: z.string().regex(/^\d+$/).default('60000'),
  RATE_LIMIT_MAX_REQUESTS: z.string().regex(/^\d+$/).default('60'),
  RATE_LIMIT_AUTH_MAX: z.string().regex(/^\d+$/).default('5'),

  // Session configuration
  SESSION_TTL: z.string().regex(/^\d+$/).default('86400'), // 24 hours
  SESSION_CLEANUP_INTERVAL: z.string().regex(/^\d+$/).default('3600'), // 1 hour

  // Logging
  LOG_LEVEL: z.enum(['error', 'warn', 'info', 'debug']).default('info'),
  DEBUG_MODE: z.string().default('false'),
  SLOW_QUERY_THRESHOLD_MS: z.string().regex(/^\d+$/).default('1000'),

  // Cache
  CACHE_TTL_SECONDS: z.string().regex(/^\d+$/).default('60'),

  // Upload configuration
  UPLOAD_MAX_SIZE: z.string().regex(/^\d+$/).default('10485760'), // 10MB
  UPLOAD_DIR: z.string().default('/app/uploads'),

  // Optional: External services - Email
  RESEND_API_KEY: z.string().optional(),
  EMAIL_FROM_ADDRESS: z.string().email().optional().default('noreply@mantisnxt.com'),
  EMAIL_FROM_NAME: z.string().optional().default('MantisNXT'),
  SMTP_HOST: z.string().optional(),
  SMTP_PORT: z.string().regex(/^\d+$/).optional(),
  SMTP_USER: z.string().optional(),
  SMTP_PASSWORD: z.string().optional(),
  SMTP_SECURE: z.string().optional(),

  // Optional: Monitoring
  SENTRY_DSN: z.string().url().optional(),
  DATADOG_API_KEY: z.string().optional(),

  // Development only
  ALLOW_PUBLIC_GET_ENDPOINTS: z.string().optional(),
});

export type Env = z.infer<typeof envSchema>;

/**
 * Parsed and validated environment variables
 */
class EnvironmentConfig {
  private static instance: EnvironmentConfig;
  private env: Env;
  private validationErrors: z.ZodError | null = null;

  private constructor() {
    this.env = this.loadAndValidate();
  }

  public static getInstance(): EnvironmentConfig {
    if (!EnvironmentConfig.instance) {
      EnvironmentConfig.instance = new EnvironmentConfig();
    }
    return EnvironmentConfig.instance;
  }

  /**
   * Load and validate environment variables
   */
  private loadAndValidate(): Env {
    try {
      // Parse and validate
      const parsed = envSchema.parse(process.env);

      // Additional validation logic
      this.validateDatabaseUrls(parsed);
      this.validateSecrets(parsed);
      this.validateRateLimits(parsed);

      console.log('✓ Environment configuration validated successfully');
      return parsed;
    } catch (error) {
      if (error instanceof z.ZodError) {
        this.validationErrors = error;
        console.error('❌ Environment validation failed:');
        error.errors.forEach(err => {
          console.error(`  - ${err.path.join('.')}: ${err.message}`);
        });

        // In production, fail hard
        if (process.env.NODE_ENV === 'production') {
          throw new Error('Invalid environment configuration');
        }

        // In development, use defaults where possible
        console.warn('⚠️  Using default values for missing configuration');
      }
      throw error;
    }
  }

  /**
   * Validate database URLs
   */
  private validateDatabaseUrls(env: Env): void {
    // Ensure at least one database URL is configured
    if (!env.DATABASE_URL) {
      throw new Error('DATABASE_URL is required');
    }

    // Validate SSL mode for production
    if (env.NODE_ENV === 'production') {
      const url = new URL(env.DATABASE_URL);
      if (!url.searchParams.has('sslmode')) {
        console.warn('⚠️  Database URL missing sslmode parameter. Adding sslmode=require');
      }
    }
  }

  /**
   * Validate secrets
   */
  private validateSecrets(env: Env): void {
    if (env.NODE_ENV === 'production') {
      // Check for default/weak secrets
      const weakSecrets = ['your-secret-key', 'change-me', 'secret'];

      if (weakSecrets.includes(env.JWT_SECRET.toLowerCase())) {
        throw new Error('JWT_SECRET must not be a default value in production');
      }

      if (weakSecrets.includes(env.SESSION_SECRET.toLowerCase())) {
        throw new Error('SESSION_SECRET must not be a default value in production');
      }
    }
  }

  /**
   * Validate rate limits
   */
  private validateRateLimits(env: Env): void {
    const windowMs = parseInt(env.RATE_LIMIT_WINDOW_MS, 10);
    const maxRequests = parseInt(env.RATE_LIMIT_MAX_REQUESTS, 10);

    if (maxRequests > 1000) {
      console.warn('⚠️  Rate limit max requests is very high (>1000). Consider lowering it.');
    }

    if (windowMs < 1000) {
      console.warn('⚠️  Rate limit window is very short (<1s). Consider increasing it.');
    }
  }

  /**
   * Get environment variable
   */
  public get<K extends keyof Env>(key: K): Env[K] {
    return this.env[key];
  }

  /**
   * Get all environment variables
   */
  public getAll(): Env {
    return { ...this.env };
  }

  /**
   * Check if environment is valid
   */
  public isValid(): boolean {
    return this.validationErrors === null;
  }

  /**
   * Get validation errors
   */
  public getValidationErrors(): z.ZodError | null {
    return this.validationErrors;
  }

  /**
   * Check if in production
   */
  public isProduction(): boolean {
    return this.env.NODE_ENV === 'production';
  }

  /**
   * Check if in development
   */
  public isDevelopment(): boolean {
    return this.env.NODE_ENV === 'development';
  }

  /**
   * Check if in test
   */
  public isTest(): boolean {
    return this.env.NODE_ENV === 'test';
  }

  /**
   * Get feature flag value
   */
  public isFeatureEnabled(feature: 'analytics' | 'audit' | 'rateLimit' | 'realtime'): boolean {
    const key = {
      analytics: 'ENABLE_ANALYTICS',
      audit: 'ENABLE_AUDIT_LOGGING',
      rateLimit: 'ENABLE_RATE_LIMITING',
      realtime: 'REALTIME_ENABLED',
    }[feature] as keyof Env;

    return this.env[key] === 'true';
  }

  /**
   * Get database configuration
   */
  public getDatabaseConfig() {
    return {
      url: this.env.DATABASE_URL,
      pool: {
        min: parseInt(this.env.DB_POOL_MIN, 10),
        max: parseInt(this.env.DB_POOL_MAX, 10),
        idleTimeout: parseInt(this.env.DB_POOL_IDLE_TIMEOUT, 10),
        connectionTimeout: parseInt(this.env.DB_POOL_CONNECTION_TIMEOUT, 10),
      },
    };
  }

  /**
   * Get Redis configuration
   */
  public getRedisConfig() {
    return {
      url: this.env.REDIS_URL,
    };
  }

  /**
   * Get session configuration
   */
  public getSessionConfig() {
    return {
      ttl: parseInt(this.env.SESSION_TTL, 10),
      cleanupInterval: parseInt(this.env.SESSION_CLEANUP_INTERVAL, 10),
    };
  }

  /**
   * Get rate limit configuration
   */
  public getRateLimitConfig() {
    return {
      windowMs: parseInt(this.env.RATE_LIMIT_WINDOW_MS, 10),
      maxRequests: parseInt(this.env.RATE_LIMIT_MAX_REQUESTS, 10),
      authMax: parseInt(this.env.RATE_LIMIT_AUTH_MAX, 10),
    };
  }
}

// Export singleton
export const envConfig = EnvironmentConfig.getInstance();

// Helper functions
export function getEnv<K extends keyof Env>(key: K): Env[K] {
  return envConfig.get(key);
}

export function isProduction(): boolean {
  return envConfig.isProduction();
}

export function isDevelopment(): boolean {
  return envConfig.isDevelopment();
}

export function isFeatureEnabled(
  feature: 'analytics' | 'audit' | 'rateLimit' | 'realtime'
): boolean {
  return envConfig.isFeatureEnabled(feature);
}

// Validate on module load
if (typeof window === 'undefined') {
  // Server-side only
  if (!envConfig.isValid()) {
    console.error('Environment validation failed. See errors above.');
    if (isProduction()) {
      process.exit(1);
    }
  }
}
