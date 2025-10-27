/**
 * Quality Assurance Validator
 *
 * Provides comprehensive validation and quality checks for the application
 */

import { Pool } from 'pg';
import fs from 'fs';
import path from 'path';

export interface ValidationResult {
  success: boolean;
  message: string;
  details?: any;
  recommendations?: string[];
}

export interface QualityReport {
  overall: ValidationResult;
  database: ValidationResult;
  api: ValidationResult;
  security: ValidationResult;
  performance: ValidationResult;
  code: ValidationResult;
}

export class QAValidator {
  private pool: Pool;

  constructor(pool: Pool) {
    this.pool = pool;
  }

  /**
   * Validate database schema and data integrity
   */
  async validateDatabase(): Promise<ValidationResult> {
    try {
      const issues = [];
      const recommendations = [];

      // Check for required tables
      const requiredTables = [
        'suppliers',
        'products',
        'inventory_items',
        'pricelists',
        'pricelist_items',
        'categories',
        'organizations',
        'users',
      ];

      for (const table of requiredTables) {
        const result = await this.pool.query(
          `SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_name = $1)`,
          [table]
        );

        if (!result.rows[0].exists) {
          issues.push(`Missing required table: ${table}`);
        }
      }

      // Check for required indexes
      const requiredIndexes = [
        'suppliers_pkey',
        'products_pkey',
        'inventory_items_pkey',
        'pricelists_pkey',
      ];

      for (const index of requiredIndexes) {
        const result = await this.pool.query(
          `SELECT EXISTS (SELECT FROM pg_indexes WHERE indexname = $1)`,
          [index]
        );

        if (!result.rows[0].exists) {
          issues.push(`Missing required index: ${index}`);
        }
      }

      // Check for data integrity
      const integrityChecks = [
        {
          name: 'Orphaned pricelist items',
          query: `
            SELECT COUNT(*) as count
            FROM pricelist_items pi
            LEFT JOIN pricelists p ON pi.pricelist_id = p.id
            WHERE p.id IS NULL
          `,
        },
        {
          name: 'Invalid supplier references',
          query: `
            SELECT COUNT(*) as count
            FROM pricelists pl
            LEFT JOIN suppliers s ON pl.supplier_id = s.id
            WHERE s.id IS NULL
          `,
        },
      ];

      for (const check of integrityChecks) {
        const result = await this.pool.query(check.query);
        const count = parseInt(result.rows[0].count);

        if (count > 0) {
          issues.push(`${check.name}: ${count} records found`);
        }
      }

      // Check for performance issues
      const performanceChecks = [
        {
          name: 'Large tables without indexes',
          query: `
            SELECT t.table_name, pg_size_pretty(pg_total_relation_size(t.table_name)) as size
            FROM information_schema.tables t
            WHERE t.table_schema = 'public'
            AND pg_total_relation_size(t.table_name) > 100000000
            AND NOT EXISTS (
              SELECT 1 FROM pg_indexes i 
              WHERE i.tablename = t.table_name
            )
          `,
        },
      ];

      for (const check of performanceChecks) {
        const result = await this.pool.query(check.query);
        if (result.rows.length > 0) {
          recommendations.push(`${check.name}: Consider adding indexes`);
        }
      }

      return {
        success: issues.length === 0,
        message:
          issues.length === 0
            ? 'Database validation passed'
            : `${issues.length} database issues found`,
        details: { issues, checks: integrityChecks.length },
        recommendations,
      };
    } catch (error) {
      return {
        success: false,
        message: `Database validation failed: ${error}`,
        recommendations: ['Check database connection and permissions'],
      };
    }
  }

  /**
   * Validate API endpoints
   */
  async validateAPI(): Promise<ValidationResult> {
    try {
      const issues = [];
      const recommendations = [];

      // Check for required API endpoints
      const requiredEndpoints = [
        '/api/auth/login',
        '/api/suppliers',
        '/api/products',
        '/api/inventory',
        '/api/pricelists',
        '/api/upload',
      ];

      // This would typically involve making HTTP requests to test endpoints
      // For now, we'll check if the route files exist
      for (const endpoint of requiredEndpoints) {
        const routePath = path.join('src/app', endpoint, 'route.ts');
        if (!fs.existsSync(routePath)) {
          issues.push(`Missing API endpoint: ${endpoint}`);
        }
      }

      // Check for proper error handling
      const apiFiles = this.findAPIFiles();
      for (const file of apiFiles) {
        const content = fs.readFileSync(file, 'utf8');

        if (!content.includes('try') || !content.includes('catch')) {
          recommendations.push(`Consider adding error handling to ${file}`);
        }

        if (!content.includes('NextResponse.json')) {
          recommendations.push(`Consider standardizing response format in ${file}`);
        }
      }

      return {
        success: issues.length === 0,
        message:
          issues.length === 0 ? 'API validation passed' : `${issues.length} API issues found`,
        details: { issues, endpoints: requiredEndpoints.length },
        recommendations,
      };
    } catch (error) {
      return {
        success: false,
        message: `API validation failed: ${error}`,
        recommendations: ['Check API route files and structure'],
      };
    }
  }

  /**
   * Validate security configuration
   */
  async validateSecurity(): Promise<ValidationResult> {
    try {
      const issues = [];
      const recommendations = [];

      // Check for security headers
      const securityFiles = [
        'src/lib/config/security.ts',
        'src/lib/security/middleware.ts',
        'src/middleware/auth.ts',
      ];

      for (const file of securityFiles) {
        if (!fs.existsSync(file)) {
          issues.push(`Missing security file: ${file}`);
        }
      }

      // Check for authentication middleware usage
      const apiFiles = this.findAPIFiles();
      let protectedEndpoints = 0;
      let unprotectedEndpoints = 0;

      for (const file of apiFiles) {
        const content = fs.readFileSync(file, 'utf8');

        if (content.includes('withAuth') || content.includes('withPermission')) {
          protectedEndpoints++;
        } else if (
          content.includes('export const') &&
          (content.includes('POST') || content.includes('PUT') || content.includes('DELETE'))
        ) {
          unprotectedEndpoints++;
        }
      }

      if (unprotectedEndpoints > 0) {
        recommendations.push(
          `Consider adding authentication to ${unprotectedEndpoints} unprotected endpoints`
        );
      }

      // Check for environment variables
      const requiredEnvVars = ['JWT_SECRET', 'DATABASE_URL'];

      for (const envVar of requiredEnvVars) {
        if (!process.env[envVar]) {
          issues.push(`Missing required environment variable: ${envVar}`);
        }
      }

      return {
        success: issues.length === 0,
        message:
          issues.length === 0
            ? 'Security validation passed'
            : `${issues.length} security issues found`,
        details: {
          issues,
          protectedEndpoints,
          unprotectedEndpoints,
          requiredEnvVars: requiredEnvVars.length,
        },
        recommendations,
      };
    } catch (error) {
      return {
        success: false,
        message: `Security validation failed: ${error}`,
        recommendations: ['Check security configuration files'],
      };
    }
  }

  /**
   * Validate performance configuration
   */
  async validatePerformance(): Promise<ValidationResult> {
    try {
      const issues = [];
      const recommendations = [];

      // Check for performance optimization files
      const performanceFiles = [
        'src/lib/performance/optimizer.ts',
        'src/lib/performance/api-monitor.ts',
      ];

      for (const file of performanceFiles) {
        if (!fs.existsSync(file)) {
          issues.push(`Missing performance file: ${file}`);
        }
      }

      // Check for database indexes
      const indexResult = await this.pool.query(`
        SELECT COUNT(*) as count
        FROM pg_indexes
        WHERE schemaname = 'public'
      `);

      const indexCount = parseInt(indexResult.rows[0].count);
      if (indexCount < 10) {
        recommendations.push('Consider adding more database indexes for better performance');
      }

      // Check for connection pooling
      const poolResult = await this.pool.query(`
        SELECT setting
        FROM pg_settings
        WHERE name = 'max_connections'
      `);

      const maxConnections = parseInt(poolResult.rows[0].setting);
      if (maxConnections < 100) {
        recommendations.push('Consider increasing max_connections for better scalability');
      }

      return {
        success: issues.length === 0,
        message:
          issues.length === 0
            ? 'Performance validation passed'
            : `${issues.length} performance issues found`,
        details: { issues, indexCount, maxConnections },
        recommendations,
      };
    } catch (error) {
      return {
        success: false,
        message: `Performance validation failed: ${error}`,
        recommendations: ['Check performance configuration and database settings'],
      };
    }
  }

  /**
   * Validate code quality
   */
  async validateCode(): Promise<ValidationResult> {
    try {
      const issues = [];
      const recommendations = [];

      // Check for TypeScript configuration
      if (!fs.existsSync('tsconfig.json')) {
        issues.push('Missing TypeScript configuration file');
      }

      // Check for ESLint configuration
      if (!fs.existsSync('.eslintrc.json') && !fs.existsSync('.eslintrc.js')) {
        recommendations.push('Consider adding ESLint configuration for code quality');
      }

      // Check for test files
      const testFiles = this.findTestFiles();
      if (testFiles.length === 0) {
        recommendations.push('Consider adding unit tests for better code quality');
      }

      // Check for documentation
      if (!fs.existsSync('README.md')) {
        recommendations.push('Consider adding README.md for project documentation');
      }

      return {
        success: issues.length === 0,
        message:
          issues.length === 0
            ? 'Code quality validation passed'
            : `${issues.length} code quality issues found`,
        details: { issues, testFiles: testFiles.length },
        recommendations,
      };
    } catch (error) {
      return {
        success: false,
        message: `Code quality validation failed: ${error}`,
        recommendations: ['Check project structure and configuration files'],
      };
    }
  }

  /**
   * Run comprehensive quality assurance validation
   */
  async validate(): Promise<QualityReport> {
    const [database, api, security, performance, code] = await Promise.all([
      this.validateDatabase(),
      this.validateAPI(),
      this.validateSecurity(),
      this.validatePerformance(),
      this.validateCode(),
    ]);

    const overallSuccess = [database, api, security, performance, code].every(v => v.success);
    const overallMessage = overallSuccess
      ? 'All quality assurance checks passed'
      : 'Some quality assurance checks failed';

    return {
      overall: {
        success: overallSuccess,
        message: overallMessage,
        recommendations: [
          ...(database.recommendations || []),
          ...(api.recommendations || []),
          ...(security.recommendations || []),
          ...(performance.recommendations || []),
          ...(code.recommendations || []),
        ],
      },
      database,
      api,
      security,
      performance,
      code,
    };
  }

  /**
   * Find API files
   */
  private findAPIFiles(): string[] {
    const apiDir = 'src/app/api';
    if (!fs.existsSync(apiDir)) {
      return [];
    }

    const files: string[] = [];

    function findFiles(dir: string) {
      const items = fs.readdirSync(dir);

      for (const item of items) {
        const fullPath = path.join(dir, item);
        const stat = fs.statSync(fullPath);

        if (stat.isDirectory()) {
          findFiles(fullPath);
        } else if (item === 'route.ts') {
          files.push(fullPath);
        }
      }
    }

    findFiles(apiDir);
    return files;
  }

  /**
   * Find test files
   */
  private findTestFiles(): string[] {
    const files: string[] = [];

    function findFiles(dir: string) {
      if (!fs.existsSync(dir)) return;

      const items = fs.readdirSync(dir);

      for (const item of items) {
        const fullPath = path.join(dir, item);
        const stat = fs.statSync(fullPath);

        if (stat.isDirectory()) {
          findFiles(fullPath);
        } else if (item.endsWith('.test.ts') || item.endsWith('.spec.ts')) {
          files.push(fullPath);
        }
      }
    }

    findFiles('src');
    findFiles('tests');
    findFiles('__tests__');

    return files;
  }
}

export default QAValidator;


