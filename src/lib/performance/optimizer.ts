/**
 * Performance Optimizer
 *
 * Provides various performance optimization utilities for the application
 */

import type { Pool } from 'pg';

export interface PerformanceMetrics {
  queryTime: number;
  memoryUsage: number;
  cpuUsage: number;
  connectionCount: number;
  cacheHitRatio: number;
}

export interface OptimizationResult {
  success: boolean;
  message: string;
  metrics?: PerformanceMetrics;
  recommendations?: string[];
}

export class PerformanceOptimizer {
  private pool: Pool;

  constructor(pool: Pool) {
    this.pool = pool;
  }

  /**
   * Analyze database performance
   */
  async analyzeDatabasePerformance(): Promise<PerformanceMetrics> {
    const startTime = Date.now();

    // Get database statistics
    const stats = await this.pool.query(`
      SELECT 
        schemaname,
        tablename,
        n_tup_ins as inserts,
        n_tup_upd as updates,
        n_tup_del as deletes,
        n_live_tup as live_tuples,
        n_dead_tup as dead_tuples,
        last_vacuum,
        last_autovacuum,
        last_analyze,
        last_autoanalyze
      FROM pg_stat_user_tables
      ORDER BY n_live_tup DESC
      LIMIT 20
    `);

    // Get index usage statistics
    const indexStats = await this.pool.query(`
      SELECT 
        schemaname,
        tablename,
        indexname,
        idx_tup_read,
        idx_tup_fetch,
        idx_scan
      FROM pg_stat_user_indexes
      WHERE idx_scan > 0
      ORDER BY idx_scan DESC
      LIMIT 20
    `);

    // Get connection count
    const connectionCount = await this.pool.query(`
      SELECT count(*) as connection_count
      FROM pg_stat_activity
      WHERE state = 'active'
    `);

    const queryTime = Date.now() - startTime;

    return {
      queryTime,
      memoryUsage: 0, // Would need system metrics
      cpuUsage: 0, // Would need system metrics
      connectionCount: parseInt(connectionCount.rows[0].connection_count),
      cacheHitRatio: 0, // Would need cache metrics
    };
  }

  /**
   * Optimize database indexes
   */
  async optimizeIndexes(): Promise<OptimizationResult> {
    try {
      // Analyze tables for better query planning
      await this.pool.query('ANALYZE');

      // Get tables that need vacuuming
      const vacuumCandidates = await this.pool.query(`
        SELECT schemaname, tablename, n_dead_tup, n_live_tup
        FROM pg_stat_user_tables
        WHERE n_dead_tup > n_live_tup * 0.1
        ORDER BY n_dead_tup DESC
      `);

      // Vacuum tables that need it
      for (const table of vacuumCandidates.rows) {
        await this.pool.query(`VACUUM ANALYZE ${table.schemaname}.${table.tablename}`);
      }

      // Get unused indexes
      const unusedIndexes = await this.pool.query(`
        SELECT schemaname, tablename, indexname
        FROM pg_stat_user_indexes
        WHERE idx_scan = 0
        AND indexname NOT LIKE '%_pkey'
      `);

      const recommendations = [];

      if (unusedIndexes.rows.length > 0) {
        recommendations.push(`Consider dropping ${unusedIndexes.rows.length} unused indexes`);
      }

      if (vacuumCandidates.rows.length > 0) {
        recommendations.push(`Vacuumed ${vacuumCandidates.rows.length} tables`);
      }

      return {
        success: true,
        message: 'Database optimization completed',
        recommendations,
      };
    } catch (error) {
      return {
        success: false,
        message: `Database optimization failed: ${error}`,
        recommendations: ['Check database connection and permissions'],
      };
    }
  }

  /**
   * Optimize query performance
   */
  async optimizeQueries(): Promise<OptimizationResult> {
    try {
      // Get slow queries
      const slowQueries = await this.pool.query(`
        SELECT 
          query,
          calls,
          total_time,
          mean_time,
          rows
        FROM pg_stat_statements
        WHERE mean_time > 1000
        ORDER BY mean_time DESC
        LIMIT 10
      `);

      const recommendations = [];

      if (slowQueries.rows.length > 0) {
        recommendations.push(
          `Found ${slowQueries.rows.length} slow queries that may need optimization`
        );

        // Analyze each slow query
        for (const query of slowQueries.rows) {
          if (query.query.includes('SELECT *')) {
            recommendations.push('Avoid SELECT * queries - specify only needed columns');
          }

          if (query.query.includes('ORDER BY') && !query.query.includes('LIMIT')) {
            recommendations.push('Consider adding LIMIT to ORDER BY queries');
          }
        }
      }

      return {
        success: true,
        message: 'Query optimization analysis completed',
        recommendations,
      };
    } catch (error) {
      return {
        success: false,
        message: `Query optimization failed: ${error}`,
        recommendations: ['Enable pg_stat_statements extension for query analysis'],
      };
    }
  }

  /**
   * Optimize connection pooling
   */
  async optimizeConnections(): Promise<OptimizationResult> {
    try {
      // Get current connection statistics
      const connectionStats = await this.pool.query(`
        SELECT 
          state,
          count(*) as count
        FROM pg_stat_activity
        GROUP BY state
      `);

      const activeConnections = connectionStats.rows.find(r => r.state === 'active')?.count || 0;
      const idleConnections = connectionStats.rows.find(r => r.state === 'idle')?.count || 0;

      const recommendations = [];

      if (idleConnections > activeConnections * 2) {
        recommendations.push('Consider reducing connection pool size - too many idle connections');
      }

      if (activeConnections > 10) {
        recommendations.push(
          'High number of active connections - consider connection pooling optimization'
        );
      }

      return {
        success: true,
        message: 'Connection optimization analysis completed',
        recommendations,
      };
    } catch (error) {
      return {
        success: false,
        message: `Connection optimization failed: ${error}`,
        recommendations: ['Check database connection configuration'],
      };
    }
  }

  /**
   * Run comprehensive performance optimization
   */
  async optimize(): Promise<OptimizationResult> {
    try {
      const results = await Promise.all([
        this.optimizeIndexes(),
        this.optimizeQueries(),
        this.optimizeConnections(),
      ]);

      const allRecommendations = results.flatMap(r => r.recommendations || []);
      const failedOptimizations = results.filter(r => !r.success);

      if (failedOptimizations.length > 0) {
        return {
          success: false,
          message: `${failedOptimizations.length} optimization steps failed`,
          recommendations: allRecommendations,
        };
      }

      return {
        success: true,
        message: 'Performance optimization completed successfully',
        recommendations: allRecommendations,
      };
    } catch (error) {
      return {
        success: false,
        message: `Performance optimization failed: ${error}`,
        recommendations: ['Check system resources and database configuration'],
      };
    }
  }

  /**
   * Get performance recommendations
   */
  async getRecommendations(): Promise<string[]> {
    const recommendations = [];

    try {
      // Check for missing indexes
      const missingIndexes = await this.pool.query(`
        SELECT 
          schemaname,
          tablename,
          attname,
          n_distinct,
          correlation
        FROM pg_stats
        WHERE schemaname NOT IN ('information_schema', 'pg_catalog')
        AND n_distinct > 100
        AND correlation < 0.1
      `);

      if (missingIndexes.rows.length > 0) {
        recommendations.push(
          'Consider adding indexes on high-cardinality columns with low correlation'
        );
      }

      // Check for large tables without partitioning
      const largeTables = await this.pool.query(`
        SELECT 
          schemaname,
          tablename,
          pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as size
        FROM pg_tables
        WHERE schemaname NOT IN ('information_schema', 'pg_catalog')
        AND pg_total_relation_size(schemaname||'.'||tablename) > 1000000000
      `);

      if (largeTables.rows.length > 0) {
        recommendations.push('Consider partitioning large tables for better performance');
      }

      // Check for unused tables
      const unusedTables = await this.pool.query(`
        SELECT schemaname, tablename
        FROM pg_stat_user_tables
        WHERE seq_scan = 0 AND idx_scan = 0
      `);

      if (unusedTables.rows.length > 0) {
        recommendations.push('Consider removing unused tables to reduce maintenance overhead');
      }
    } catch (error) {
      recommendations.push('Unable to analyze database for recommendations');
    }

    return recommendations;
  }
}

export default PerformanceOptimizer;


