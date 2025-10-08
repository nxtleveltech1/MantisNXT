/**
 * =====================================================
 * PRICELIST SYSTEM DEPLOYMENT ORCHESTRATOR
 * =====================================================
 *
 * Comprehensive deployment script that safely installs
 * the complete supplier pricelist management system
 * with rollback capabilities and validation checks.
 *
 * Database: nxtprod-db_001
 * Author: Data Oracle
 * =====================================================
 */

const { Pool } = require('pg');
const fs = require('fs').promises;
const path = require('path');

// Database configuration
const dbConfig = {
  user: "nxtdb_admin",
  password: "P@33w0rd-1",
  host: "62.169.20.53",
  port: 6600,
  database: "nxtprod-db_001",
  ssl: false,
  max: 10,
  connectionTimeoutMillis: 15000,
  idleTimeoutMillis: 30000
};

class PricelistSystemDeployer {
  constructor() {
    this.pool = new Pool(dbConfig);
    this.deploymentLog = [];
    this.rollbackStatements = [];
    this.startTime = new Date();
  }

  async deploy() {
    console.log('🚀 STARTING PRICELIST SYSTEM DEPLOYMENT');
    console.log('=====================================');
    console.log(`Start time: ${this.startTime.toISOString()}`);
    console.log(`Database: ${dbConfig.database}@${dbConfig.host}:${dbConfig.port}`);
    console.log('');

    try {
      // Pre-deployment validation
      await this.validateEnvironment();

      // Execute deployment steps
      await this.deployEnhancedSchema();
      await this.deployValidationRules();
      await this.deployBulkUploadProcedures();
      await this.deployDuplicateDetection();
      await this.deployIndexingStrategy();

      // Post-deployment validation
      await this.validateDeployment();

      // Success
      await this.logSuccess();

    } catch (error) {
      console.error('❌ DEPLOYMENT FAILED');
      console.error('Error:', error.message);

      // Attempt rollback
      await this.rollback();
      throw error;
    } finally {
      await this.cleanup();
    }
  }

  async validateEnvironment() {
    console.log('🔍 VALIDATING ENVIRONMENT');
    console.log('========================');

    // Test database connection
    try {
      const client = await this.pool.connect();
      const result = await client.query('SELECT version(), current_database(), current_user');
      console.log('✅ Database connection: OK');
      console.log(`   Version: ${result.rows[0].version.split(' ')[0]} ${result.rows[0].version.split(' ')[1]}`);
      console.log(`   Database: ${result.rows[0].current_database}`);
      console.log(`   User: ${result.rows[0].current_user}`);
      client.release();
    } catch (error) {
      throw new Error(`Database connection failed: ${error.message}`);
    }

    // Check required extensions
    const requiredExtensions = ['uuid-ossp', 'pg_trgm', 'fuzzystrmatch'];
    for (const extension of requiredExtensions) {
      try {
        await this.pool.query(`CREATE EXTENSION IF NOT EXISTS "${extension}"`);
        console.log(`✅ Extension ${extension}: Available`);
      } catch (error) {
        throw new Error(`Required extension ${extension} not available: ${error.message}`);
      }
    }

    // Check existing table structure
    const tableCheck = await this.pool.query(`
      SELECT table_name FROM information_schema.tables
      WHERE table_schema = 'public'
      AND table_name IN ('suppliers', 'products', 'inventory_items')
    `);

    if (tableCheck.rows.length < 3) {
      throw new Error('Required base tables (suppliers, products, inventory_items) not found');
    }
    console.log('✅ Base tables: Present');

    // Check disk space (PostgreSQL specific)
    try {
      const diskSpace = await this.pool.query(`
        SELECT
          pg_size_pretty(pg_database_size(current_database())) as db_size,
          pg_size_pretty(pg_total_relation_size('suppliers')) as suppliers_size
      `);
      console.log(`✅ Database size: ${diskSpace.rows[0].db_size}`);
    } catch (error) {
      console.log('⚠️  Could not check disk space');
    }

    console.log('');
  }

  async deployEnhancedSchema() {
    console.log('📊 DEPLOYING ENHANCED SCHEMA');
    console.log('============================');

    const schemaPath = path.join(__dirname, '..', 'database', 'schemas', 'enhanced_pricelist_schema.sql');
    const schemaSQL = await fs.readFile(schemaPath, 'utf8');

    try {
      const client = await this.pool.connect();

      // Execute in transaction for rollback capability
      await client.query('BEGIN');

      try {
        // Split and execute SQL statements
        const statements = this.splitSQLStatements(schemaSQL);

        for (let i = 0; i < statements.length; i++) {
          const statement = statements[i].trim();
          if (!statement || statement.startsWith('--')) continue;

          console.log(`   Executing statement ${i + 1}/${statements.length}`);
          await client.query(statement);

          // Store rollback information for major objects
          if (statement.includes('CREATE TABLE')) {
            const tableName = this.extractTableName(statement);
            if (tableName) {
              this.rollbackStatements.push(`DROP TABLE IF EXISTS ${tableName} CASCADE`);
            }
          }
        }

        await client.query('COMMIT');
        console.log('✅ Enhanced schema deployed successfully');
        this.deploymentLog.push('enhanced_schema_deployed');

      } catch (error) {
        await client.query('ROLLBACK');
        throw error;
      }

      client.release();

    } catch (error) {
      throw new Error(`Schema deployment failed: ${error.message}`);
    }

    console.log('');
  }

  async deployValidationRules() {
    console.log('🔒 DEPLOYING VALIDATION RULES');
    console.log('=============================');

    const validationPath = path.join(__dirname, '..', 'database', 'validation', 'data_validation_rules.sql');
    const validationSQL = await fs.readFile(validationPath, 'utf8');

    try {
      await this.executeSQL(validationSQL, 'Validation rules');
      console.log('✅ Data validation rules deployed successfully');
      this.deploymentLog.push('validation_rules_deployed');
    } catch (error) {
      throw new Error(`Validation rules deployment failed: ${error.message}`);
    }

    console.log('');
  }

  async deployBulkUploadProcedures() {
    console.log('⚡ DEPLOYING BULK UPLOAD PROCEDURES');
    console.log('==================================');

    const proceduresPath = path.join(__dirname, '..', 'database', 'procedures', 'bulk_upload_procedures.sql');
    const proceduresSQL = await fs.readFile(proceduresPath, 'utf8');

    try {
      await this.executeSQL(proceduresSQL, 'Bulk upload procedures');
      console.log('✅ Bulk upload procedures deployed successfully');
      this.deploymentLog.push('bulk_upload_procedures_deployed');
    } catch (error) {
      throw new Error(`Bulk upload procedures deployment failed: ${error.message}`);
    }

    console.log('');
  }

  async deployDuplicateDetection() {
    console.log('🔍 DEPLOYING DUPLICATE DETECTION SYSTEM');
    console.log('=======================================');

    const duplicationPath = path.join(__dirname, '..', 'database', 'deduplication', 'duplicate_detection_system.sql');
    const duplicationSQL = await fs.readFile(duplicationPath, 'utf8');

    try {
      await this.executeSQL(duplicationSQL, 'Duplicate detection system');
      console.log('✅ Duplicate detection system deployed successfully');
      this.deploymentLog.push('duplicate_detection_deployed');
    } catch (error) {
      throw new Error(`Duplicate detection deployment failed: ${error.message}`);
    }

    console.log('');
  }

  async deployIndexingStrategy() {
    console.log('📈 DEPLOYING INDEXING STRATEGY');
    console.log('==============================');

    const indexingPath = path.join(__dirname, '..', 'database', 'performance', 'comprehensive_indexing_strategy.sql');
    const indexingSQL = await fs.readFile(indexingPath, 'utf8');

    try {
      // Indexes can take time, so execute with longer timeout
      const client = await this.pool.connect();

      try {
        // Set longer statement timeout for index creation
        await client.query('SET statement_timeout = 300000'); // 5 minutes

        const statements = this.splitSQLStatements(indexingSQL);
        let indexCount = 0;

        for (let i = 0; i < statements.length; i++) {
          const statement = statements[i].trim();
          if (!statement || statement.startsWith('--')) continue;

          if (statement.includes('CREATE INDEX')) {
            indexCount++;
            console.log(`   Creating index ${indexCount} (${i + 1}/${statements.length})`);
          }

          await client.query(statement);
        }

        console.log(`✅ Indexing strategy deployed successfully (${indexCount} indexes created)`);
        this.deploymentLog.push('indexing_strategy_deployed');

      } finally {
        client.release();
      }

    } catch (error) {
      throw new Error(`Indexing strategy deployment failed: ${error.message}`);
    }

    console.log('');
  }

  async validateDeployment() {
    console.log('✅ VALIDATING DEPLOYMENT');
    console.log('========================');

    // Check that all expected tables exist
    const expectedTables = [
      'supplier_price_lists_enhanced',
      'supplier_price_list_items_enhanced',
      'product_matches',
      'pricelist_import_logs',
      'price_change_tracking'
    ];

    for (const tableName of expectedTables) {
      const result = await this.pool.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.tables
          WHERE table_schema = 'public' AND table_name = $1
        )
      `, [tableName]);

      if (!result.rows[0].exists) {
        throw new Error(`Expected table ${tableName} was not created`);
      }
      console.log(`✅ Table ${tableName}: Created`);
    }

    // Check that key functions exist
    const expectedFunctions = [
      'initialize_bulk_upload',
      'detect_exact_duplicates',
      'validate_price',
      'analyze_index_performance'
    ];

    for (const functionName of expectedFunctions) {
      const result = await this.pool.query(`
        SELECT EXISTS (
          SELECT FROM pg_proc
          WHERE proname = $1
        )
      `, [functionName]);

      if (!result.rows[0].exists) {
        throw new Error(`Expected function ${functionName} was not created`);
      }
      console.log(`✅ Function ${functionName}: Created`);
    }

    // Check index creation
    const indexCount = await this.pool.query(`
      SELECT COUNT(*) as count
      FROM pg_indexes
      WHERE schemaname = 'public'
      AND tablename LIKE '%price%'
    `);

    if (parseInt(indexCount.rows[0].count) < 10) {
      throw new Error('Expected indexes were not created properly');
    }
    console.log(`✅ Indexes: ${indexCount.rows[0].count} created`);

    // Test basic functionality
    try {
      const testResult = await this.pool.query(`
        SELECT validate_price(100.00, 80.00, 120.00, 'ZAR') as validation_result
      `);
      console.log('✅ Validation functions: Working');
    } catch (error) {
      throw new Error(`Validation functions not working: ${error.message}`);
    }

    console.log('');
  }

  async logSuccess() {
    const endTime = new Date();
    const duration = Math.round((endTime - this.startTime) / 1000);

    console.log('🎉 DEPLOYMENT COMPLETED SUCCESSFULLY');
    console.log('===================================');
    console.log(`Duration: ${duration} seconds`);
    console.log(`Components deployed: ${this.deploymentLog.length}`);

    // Log to database
    try {
      await this.pool.query(`
        INSERT INTO pricelist_import_logs (
          price_list_id,
          process_stage,
          status,
          message,
          details
        ) VALUES (
          '00000000-0000-0000-0000-000000000000',
          'cleanup',
          'completed',
          'Complete pricelist system deployment successful',
          $1
        )
      `, [JSON.stringify({
        deployment_start: this.startTime.toISOString(),
        deployment_end: endTime.toISOString(),
        duration_seconds: duration,
        components: this.deploymentLog
      })]);
    } catch (error) {
      console.log('⚠️  Could not log deployment to database');
    }

    console.log('\n📋 DEPLOYMENT SUMMARY:');
    console.log('=====================');
    this.deploymentLog.forEach((component, index) => {
      console.log(`${index + 1}. ${component.replace(/_/g, ' ').toUpperCase()}`);
    });

    console.log('\n🛠️  NEXT STEPS:');
    console.log('=============');
    console.log('1. Run initial data quality checks');
    console.log('2. Import first supplier pricelist for testing');
    console.log('3. Monitor performance with analyze_index_performance()');
    console.log('4. Set up automated maintenance with maintain_price_list_indexes()');
    console.log('\n✨ System is ready for production use!');
  }

  async rollback() {
    if (this.rollbackStatements.length === 0) {
      console.log('⚠️  No rollback statements to execute');
      return;
    }

    console.log('\n🔄 ATTEMPTING ROLLBACK');
    console.log('=====================');

    try {
      const client = await this.pool.connect();
      await client.query('BEGIN');

      for (const statement of this.rollbackStatements.reverse()) {
        try {
          await client.query(statement);
          console.log(`✅ Rollback: ${statement}`);
        } catch (error) {
          console.log(`⚠️  Rollback warning: ${error.message}`);
        }
      }

      await client.query('COMMIT');
      client.release();
      console.log('✅ Rollback completed');

    } catch (error) {
      console.error('❌ Rollback failed:', error.message);
    }
  }

  async cleanup() {
    await this.pool.end();
  }

  // Utility methods

  async executeSQL(sql, description) {
    const client = await this.pool.connect();

    try {
      await client.query('BEGIN');

      const statements = this.splitSQLStatements(sql);

      for (let i = 0; i < statements.length; i++) {
        const statement = statements[i].trim();
        if (!statement || statement.startsWith('--')) continue;

        await client.query(statement);
      }

      await client.query('COMMIT');

    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  splitSQLStatements(sql) {
    // Simple SQL statement splitter (handles basic cases)
    return sql.split(';').filter(stmt => stmt.trim().length > 0);
  }

  extractTableName(createTableStatement) {
    const match = createTableStatement.match(/CREATE TABLE\s+(?:IF NOT EXISTS\s+)?(\w+)/i);
    return match ? match[1] : null;
  }
}

// Main execution
async function main() {
  const deployer = new PricelistSystemDeployer();

  try {
    await deployer.deploy();
    process.exit(0);
  } catch (error) {
    console.error('\n💥 FATAL ERROR:', error.message);
    process.exit(1);
  }
}

// Handle process signals gracefully
process.on('SIGINT', async () => {
  console.log('\n⏹️  Deployment interrupted by user');
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('💥 Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

// Run deployment
if (require.main === module) {
  main();
}

module.exports = PricelistSystemDeployer;