// @ts-nocheck

/**
 * Database Migration Runner
 *
 * Handles the execution of database migrations in the correct order
 * and provides rollback capabilities.
 */

import fs from 'fs';
import path from 'path';
import type { Pool } from 'pg';

export interface Migration {
  id: string;
  name: string;
  filename: string;
  executed: boolean;
  executedAt?: Date;
  rollback?: string;
}

export class MigrationRunner {
  private pool: Pool;
  private migrationsPath: string;

  constructor(pool: Pool, migrationsPath: string = 'migrations') {
    this.pool = pool;
    this.migrationsPath = path.resolve(process.cwd(), migrationsPath);
  }

  /**
   * Initialize the migrations table
   */
  async initialize(): Promise<void> {
    const createTableSql = `
      CREATE TABLE IF NOT EXISTS schema_migrations (
        id VARCHAR(255) PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        filename VARCHAR(255) NOT NULL,
        executed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        rollback_sql TEXT
      );
    `;

    await this.pool.query(createTableSql);
  }

  /**
   * Get all available migration files
   */
  getAvailableMigrations(): Migration[] {
    if (!fs.existsSync(this.migrationsPath)) {
      return [];
    }

    const files = fs
      .readdirSync(this.migrationsPath)
      .filter(file => file.endsWith('.sql'))
      .sort();

    return files.map(file => {
      const id = file.split('_')[0];
      const name = file.replace('.sql', '').replace(`${id}_`, '');

      return {
        id,
        name,
        filename: file,
        executed: false,
      };
    });
  }

  /**
   * Get executed migrations from database
   */
  async getExecutedMigrations(): Promise<Migration[]> {
    const result = await this.pool.query(
      'SELECT id, name, filename, executed_at FROM schema_migrations ORDER BY id'
    );

    return result.rows.map(row => ({
      id: row.id,
      name: row.name,
      filename: row.filename,
      executed: true,
      executedAt: row.executed_at,
    }));
  }

  /**
   * Get pending migrations
   */
  async getPendingMigrations(): Promise<Migration[]> {
    const available = this.getAvailableMigrations();
    const executed = await this.getExecutedMigrations();

    const executedIds = new Set(executed.map(m => m.id));

    return available.filter(migration => !executedIds.has(migration.id));
  }

  /**
   * Execute a single migration
   */
  async executeMigration(migration: Migration): Promise<void> {
    const filePath = path.join(this.migrationsPath, migration.filename);

    if (!fs.existsSync(filePath)) {
      throw new Error(`Migration file not found: ${filePath}`);
    }

    const sql = fs.readFileSync(filePath, 'utf8');

    // Check if migration has rollback section
    const rollbackMatch = sql.match(/-- ROLLBACK START([\s\S]*?)-- ROLLBACK END/);
    const rollbackSql = rollbackMatch ? rollbackMatch[1].trim() : null;

    try {
      // Execute the migration
      await this.pool.query(sql);

      // Record the migration
      await this.pool.query(
        'INSERT INTO schema_migrations (id, name, filename, rollback_sql) VALUES ($1, $2, $3, $4)',
        [migration.id, migration.name, migration.filename, rollbackSql]
      );

      console.log(`✅ Migration ${migration.id} (${migration.name}) executed successfully`);
    } catch (error) {
      console.error(`❌ Migration ${migration.id} (${migration.name}) failed:`, error);
      throw error;
    }
  }

  /**
   * Execute all pending migrations
   */
  async migrate(): Promise<void> {
    await this.initialize();

    const pending = await this.getPendingMigrations();

    if (pending.length === 0) {
      console.log('✅ No pending migrations');
      return;
    }

    console.log(`🔄 Executing ${pending.length} pending migrations...`);

    for (const migration of pending) {
      await this.executeMigration(migration);
    }

    console.log('✅ All migrations completed successfully');
  }

  /**
   * Rollback a specific migration
   */
  async rollbackMigration(migrationId: string): Promise<void> {
    const result = await this.pool.query('SELECT * FROM schema_migrations WHERE id = $1', [
      migrationId,
    ]);

    if (result.rows.length === 0) {
      throw new Error(`Migration ${migrationId} not found`);
    }

    const migration = result.rows[0];

    if (!migration.rollback_sql) {
      throw new Error(`No rollback SQL found for migration ${migrationId}`);
    }

    try {
      await this.pool.query(migration.rollback_sql);

      await this.pool.query('DELETE FROM schema_migrations WHERE id = $1', [migrationId]);

      console.log(`✅ Migration ${migrationId} (${migration.name}) rolled back successfully`);
    } catch (error) {
      console.error(`❌ Rollback of migration ${migrationId} failed:`, error);
      throw error;
    }
  }

  /**
   * Get migration status
   */
  async getStatus(): Promise<{
    total: number;
    executed: number;
    pending: number;
    migrations: Migration[];
  }> {
    await this.initialize();

    const available = this.getAvailableMigrations();
    const executed = await this.getExecutedMigrations();
    const pending = await this.getPendingMigrations();

    const executedIds = new Set(executed.map(m => m.id));

    const migrations = available.map(migration => ({
      ...migration,
      executed: executedIds.has(migration.id),
      executedAt: executed.find(e => e.id === migration.id)?.executedAt,
    }));

    return {
      total: available.length,
      executed: executed.length,
      pending: pending.length,
      migrations,
    };
  }

  /**
   * Reset all migrations (DANGEROUS - use with caution)
   */
  async reset(): Promise<void> {
    await this.pool.query('DROP TABLE IF EXISTS schema_migrations');
    await this.initialize();
    console.log('✅ Migration history reset');
  }
}

export default MigrationRunner;


