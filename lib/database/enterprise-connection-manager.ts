import type { PoolClient, PoolConfig, QueryResult, QueryResultRow } from 'pg';
import { Pool } from 'pg';

import { randomUUID } from 'crypto';



interface QueryOptions {

  timeout?: number;

  maxRetries?: number;

}



interface CircuitBreakerState {

  state: 'closed' | 'half-open' | 'open';

  failures: number;

  consecutiveSuccesses: number;

  threshold: number;

  resetTimeout: number;

  lastFailure: number | null;

  openUntil: number;

}



interface PoolStatus {

  total: number;

  idle: number;

  waiting: number;

  active: number;

}



interface ConnectionManagerStatus {

  state: CircuitBreakerState['state'];

  poolStatus: PoolStatus;

  totalConnections: number;

  activeConnections: number;

  idleConnections: number;

  waitingConnections: number;

  failedConnections: number;

  avgResponseTime: number;

  uptime: number;

  lastFailure: number | null;

  circuitBreakerFailures: number;

  circuitBreakerThreshold: number;

  circuitBreakerConsecutiveSuccesses: number;

}



const DEFAULT_MAX_POOL = 10;

const DEFAULT_IDLE_TIMEOUT = 30000;

const DEFAULT_CONNECTION_TIMEOUT = 120000; // EMERGENCY FIX: Increased to 120s for slow DNS resolution

const DEFAULT_QUERY_TIMEOUT = 60000; // Increased to 60s

const DEFAULT_MAX_RETRIES = 3; // Increased retries for intermittent DNS issues

const DEFAULT_RESET_TIMEOUT = 60000;

const CLIENT_ACQUIRE_TIMEOUT = 180000; // EMERGENCY FIX: 3 minutes for DNS + SSL handshake



// Module-level flag to track cleanup handler registration

let cleanupHandlersRegistered = false;



interface QueryLogConfig {

  enabled: boolean;

  logSlowQueries: boolean;

  slowQueryThresholdMs: number;

  logQueryText: boolean;

  logParameters: boolean;

  logExecutionPlan: boolean;

  maxParameterLength: number;

}



interface QueryFingerprintStats {

  count: number;

  totalDuration: number;

  avgDuration: number;

  minDuration: number;

  maxDuration: number;

  lastExecuted: number;

}



class EnterpriseConnectionManager {

  private pool: Pool | null = null;

  private readonly poolConfig: PoolConfig;

  private readonly metrics = {

    startTime: Date.now(),

    successfulQueries: 0,

    totalQueryDuration: 0,

    failedConnections: 0,

    slowQueries: 0,

    queryFingerprints: new Map<string, QueryFingerprintStats>(),

  };

  private readonly circuitBreaker: CircuitBreakerState = {

    state: 'closed',

    failures: 0,

    consecutiveSuccesses: 0,

    threshold: 10, // CRITICAL FIX: Increased from 3 to 10 for bulk operations

    resetTimeout: DEFAULT_RESET_TIMEOUT,

    lastFailure: null,

    openUntil: 0,

  };

  private readonly queryLogConfig: QueryLogConfig;



  constructor(config?: PoolConfig) {
    
    this.poolConfig = config ?? this.buildConfigFromEnv();

    const pc: any = this.poolConfig;
    if (pc.min == null) pc.min = this.parseIntEnv('ENTERPRISE_DB_POOL_MIN', 1);
    if (pc.keepAlive == null) pc.keepAlive = this.parseBoolEnv('ENTERPRISE_DB_KEEPALIVE', true);
    if (pc.keepAliveInitialDelayMillis == null) pc.keepAliveInitialDelayMillis = this.parseIntEnv('ENTERPRISE_DB_KEEPALIVE_DELAY_MS', 30000);
    const maxUses = this.parseIntEnv('ENTERPRISE_DB_MAX_USES', 0);
    if (maxUses > 0 && pc.maxUses == null) pc.maxUses = maxUses;

    this.queryLogConfig = this.buildQueryLogConfig();

    this.setupCleanupHandlers();

  }



  private buildConfigFromEnv(): PoolConfig {

    const connectionString = process.env.ENTERPRISE_DATABASE_URL || process.env.DATABASE_URL;



    if (!connectionString) {

      throw new Error(

        'ENTERPRISE_DATABASE_URL or DATABASE_URL must be set for EnterpriseConnectionManager'

      );

    }



    // Determine if SSL is required from connection string or environment

    const requiresSsl =

      connectionString.includes('sslmode=require') ||

      process.env.DB_SSL === 'true' ||

      process.env.NODE_ENV === 'production';



    return {

      connectionString,

      max: this.parseIntEnv('ENTERPRISE_DB_POOL_MAX', DEFAULT_MAX_POOL),

      idleTimeoutMillis: this.parseIntEnv('ENTERPRISE_DB_IDLE_TIMEOUT', DEFAULT_IDLE_TIMEOUT),

      connectionTimeoutMillis: this.parseIntEnv(

        'ENTERPRISE_DB_CONNECTION_TIMEOUT',

        DEFAULT_CONNECTION_TIMEOUT

      ),

      // SSL configuration for secure connections (required for Neon/AWS RDS, etc.)

      ssl: requiresSsl ? { rejectUnauthorized: false } : undefined,

    };

  }



  private parseIntEnv(key: string, fallback: number): number {

    const value = process.env[key];

    if (!value) {

      return fallback;

    }



    const parsed = parseInt(value, 10);

    return Number.isNaN(parsed) ? fallback : parsed;

  }



  private parseBoolEnv(key: string, fallback: boolean): boolean {

    const value = process.env[key];

    if (!value) {

      return fallback;

    }

    return value.toLowerCase() === 'true' || value === '1';

  }



  private buildQueryLogConfig(): QueryLogConfig {

    const isDevelopment = process.env.NODE_ENV !== 'production';

    return {

      enabled: this.parseBoolEnv('QUERY_LOG_ENABLED', isDevelopment),

      logSlowQueries: this.parseBoolEnv('LOG_SLOW_QUERIES', true),

      slowQueryThresholdMs: this.parseIntEnv('SLOW_QUERY_THRESHOLD_MS', 1000),

      logQueryText: this.parseBoolEnv('LOG_QUERY_TEXT', true),

      logParameters: this.parseBoolEnv('LOG_PARAMETERS', isDevelopment),

      logExecutionPlan: this.parseBoolEnv('LOG_EXECUTION_PLAN', false),

      maxParameterLength: this.parseIntEnv('MAX_PARAMETER_LENGTH', 1000),

    };

  }



  private ensurePool(): Pool {

    if (!this.pool) {

      console.log('🔌 Initializing Enterprise Connection Pool with config:', {

        host: this.poolConfig.connectionString?.substring(0, 50) + '...',

        max: this.poolConfig.max,

        idleTimeoutMillis: this.poolConfig.idleTimeoutMillis,

        connectionTimeoutMillis: this.poolConfig.connectionTimeoutMillis,

        ssl: !!this.poolConfig.ssl,

      });



    this.pool = new Pool(this.poolConfig);



      this.pool.on('error', error => {

        console.error('❌ Unhandled pool error in EnterpriseConnectionManager:', error);

        this.metrics.failedConnections++;

        this.circuitBreaker.failures++;

        this.circuitBreaker.consecutiveSuccesses = 0;

        this.circuitBreaker.lastFailure = Date.now();



        this.logCircuitBreakerState('Pool error occurred');



        if (this.circuitBreaker.failures >= this.circuitBreaker.threshold) {

          console.warn(

            `⚠️ Circuit breaker threshold reached: ${this.circuitBreaker.failures}/${this.circuitBreaker.threshold}`

          );

          this.openCircuitBreaker();

        }

      });



      this.pool.on('connect', client => {
        console.log('✅ New client connected to enterprise pool');
        const stmtTimeout = this.parseIntEnv('ENTERPRISE_DB_STATEMENT_TIMEOUT_MS', 30000);
        const idleTxTimeout = this.parseIntEnv('ENTERPRISE_DB_IDLE_TX_TIMEOUT_MS', 60000);
        void client
          .query(
            'SET search_path TO public, core, "$user"; SET statement_timeout = $1; SET idle_in_transaction_session_timeout = $2;',
            [stmtTimeout, idleTxTimeout]
          )
          .catch(err => console.error('⚠️ Failed to initialize session parameters', err));
      });



      this.setupCleanupHandlers();

    }



    return this.pool;

  }



  private isCircuitOpen(): boolean {

    if (this.circuitBreaker.state === 'open') {

      const now = Date.now();

      if (now >= this.circuitBreaker.openUntil) {

        console.log('🔄 Circuit breaker transitioning from OPEN to HALF-OPEN');

        this.circuitBreaker.state = 'half-open';

        this.logCircuitBreakerState('Transitioned to HALF-OPEN');

        return false;

      }

      const remainingMs = this.circuitBreaker.openUntil - now;

      console.log(`⛔ Circuit breaker is OPEN (reopens in ${remainingMs}ms)`);

      return true;

    }



    return false;

  }



  private openCircuitBreaker(): void {

    const previousState = this.circuitBreaker.state;

    this.circuitBreaker.state = 'open';

    this.circuitBreaker.openUntil = Date.now() + this.circuitBreaker.resetTimeout;



    console.warn('🚨 CIRCUIT BREAKER OPENED:', {

      previousState,

      failures: this.circuitBreaker.failures,

      threshold: this.circuitBreaker.threshold,

      reopensAt: new Date(this.circuitBreaker.openUntil).toISOString(),

      resetTimeoutMs: this.circuitBreaker.resetTimeout,

    });



    this.logCircuitBreakerState('Circuit breaker OPENED');

  }



  private resetCircuitBreaker(): void {

    const previousState = this.circuitBreaker.state;

    const previousFailures = this.circuitBreaker.failures;



    // Only reset if we have enough consecutive successes

    if (this.circuitBreaker.consecutiveSuccesses < this.circuitBreaker.threshold) {

      console.log(

        `⏳ Circuit breaker reset pending: ${this.circuitBreaker.consecutiveSuccesses}/${this.circuitBreaker.threshold} consecutive successes`

      );

      return;

    }



    if (previousState !== 'closed' || previousFailures > 0) {

      console.log('✅ CIRCUIT BREAKER RESET:', {

        previousState,

        previousFailures,

        consecutiveSuccesses: this.circuitBreaker.consecutiveSuccesses,

      });

    }



    this.circuitBreaker.state = 'closed';

    this.circuitBreaker.failures = 0;

    this.circuitBreaker.consecutiveSuccesses = 0;

    this.circuitBreaker.lastFailure = null;

    this.circuitBreaker.openUntil = 0;



    this.logCircuitBreakerState('Circuit breaker RESET');

  }



  private logCircuitBreakerState(event: string, queryId?: string): void {

    const prefix = queryId ? `[Query ${queryId}]` : '[Circuit Breaker]';

    console.log(`🔌 ${prefix} ${event}:`, {

      state: this.circuitBreaker.state,

      failures: this.circuitBreaker.failures,

      consecutiveSuccesses: this.circuitBreaker.consecutiveSuccesses,

      threshold: this.circuitBreaker.threshold,

      lastFailure: this.circuitBreaker.lastFailure

        ? new Date(this.circuitBreaker.lastFailure).toISOString()

        : null,

      openUntil:

        this.circuitBreaker.openUntil > 0

          ? new Date(this.circuitBreaker.openUntil).toISOString()

          : null,

    });

  }



  private generateQueryId(): string {

    try {

      return randomUUID();

    } catch {

      return `${Date.now()}-${Math.floor(Math.random() * 1_000_000)}`;

    }

  }



  private generateQueryFingerprint(text: string): string {

    // Normalize SQL by replacing parameter placeholders with ?

    const normalized = text.replace(/\$\d+/g, '?').replace(/\s+/g, ' ').trim().toLowerCase();



    // Return first 100 characters as fingerprint

    return normalized.substring(0, 100);

  }



  private sanitizeParameters(params: unknown[]): unknown[] {

    if (!params || params.length === 0) return [];



    const sensitivePatterns = [/password/i, /token/i, /secret/i, /api[_-]?key/i, /auth/i];



    return params.map(param => {

      if (typeof param === 'string') {

        const isSensitive = sensitivePatterns.some(pattern => pattern.test(param));

        if (isSensitive) return '[REDACTED]';



        if (param.length > this.queryLogConfig.maxParameterLength) {

          return param.substring(0, this.queryLogConfig.maxParameterLength) + '...';

        }

      }

      return param;

    });

  }



  private logQueryDetails(

    queryId: string,

    text: string,

    params: unknown[],

    duration: number,

    error?: Error

  ): void {

    if (!this.queryLogConfig.enabled) return;



    const isSlow = duration > this.queryLogConfig.slowQueryThresholdMs;



    // Only log if slow query logging is enabled and query is slow

    if (!isSlow && !this.queryLogConfig.logSlowQueries) return;



    const fingerprint = this.generateQueryFingerprint(text);



    // Update query fingerprint statistics

    const stats = this.metrics.queryFingerprints.get(fingerprint) || {

      count: 0,

      totalDuration: 0,

      avgDuration: 0,

      minDuration: Infinity,

      maxDuration: 0,

      lastExecuted: Date.now(),

    };



    stats.count++;

    stats.totalDuration += duration;

    stats.avgDuration = stats.totalDuration / stats.count;

    stats.minDuration = Math.min(stats.minDuration, duration);

    stats.maxDuration = Math.max(stats.maxDuration, duration);

    stats.lastExecuted = Date.now();

    this.metrics.queryFingerprints.set(fingerprint, stats);



    if (isSlow) {

      this.metrics.slowQueries++;



      const logData: unknown = {

        queryId,

        fingerprint,

        duration: `${duration.toFixed(2)}ms`,

      };



      if (this.queryLogConfig.logQueryText) {

        logData.sql = text.substring(0, 500);

      }



      if (this.queryLogConfig.logParameters && params.length > 0) {

        logData.params = this.sanitizeParameters(params);

      }



      if (error) {

        logData.error = error.message;

      }



      console.warn(`🐌 SLOW QUERY [${queryId}] ${duration.toFixed(2)}ms:`, logData);

    }

  }



  private async explainQuery(text: string, params: unknown[]): Promise<unknown> {

    if (!this.pool) return null;



    try {

      const explainQuery = `EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON) ${text}`;

      const result = await this.pool.query(explainQuery, params);

      return result.rows[0]?.['QUERY PLAN'];

    } catch (error) {

      console.error('Failed to execute EXPLAIN ANALYZE:', error);

      return null;

    }

  }



  private logExecutionPlan(queryId: string, plan: unknown): void {

    if (!plan) return;



    const executionTime = plan[0]?.['Execution Time'];

    const planningTime = plan[0]?.['Planning Time'];

    const totalCost = plan[0]?.Plan?.['Total Cost'];

    const actualRows = plan[0]?.Plan?.['Actual Rows'];



    console.log(`📊 EXECUTION PLAN [${queryId}]:`, {

      planningTime: `${planningTime?.toFixed(2)}ms`,

      executionTime: `${executionTime?.toFixed(2)}ms`,

      totalCost: totalCost?.toFixed(2),

      actualRows,

      plan: JSON.stringify(plan, null, 2),

    });

  }



  private computePoolStatus(): PoolStatus {

    if (!this.pool) {

      return { total: 0, idle: 0, waiting: 0, active: 0 };

    }



    return {

      total: this.pool.totalCount,

      idle: this.pool.idleCount,

      waiting: this.pool.waitingCount,

      active: this.pool.totalCount - this.pool.idleCount,

    };

  }



  getPoolStatus(): PoolStatus {

    return this.computePoolStatus();

  }



  async query<T extends QueryResultRow = unknown>(

    text: string,

    params: unknown[] = [],

    options: QueryOptions = {}

  ): Promise<{ rows: T[]; rowCount: number }> {

    if (this.isCircuitOpen()) {

      throw new Error('Enterprise database circuit breaker is open. Please try again later.');

    }



    this.ensurePool();



    const timeout = options.timeout ?? DEFAULT_QUERY_TIMEOUT;

    const maxRetries = options.maxRetries ?? DEFAULT_MAX_RETRIES;

    const queryId = this.generateQueryId();



    // Log circuit breaker state before query

    this.logCircuitBreakerState('Before query execution', queryId);



    let lastError: Error | null = null;

    let client: PoolClient | null = null;

    let clientReleased = false;

    let clientAcquired = false;



    try {

      // Acquire client ONCE before retry loop

      console.log(`🔌 Acquiring client for query ${queryId}...`);

      const acquireStartTime = Date.now();



      const acquirePromise = this.pool!.connect();

      const acquireTimeout = new Promise<never>((_, reject) => {

        setTimeout(() => reject(new Error('Client acquisition timeout')), CLIENT_ACQUIRE_TIMEOUT);

      });



      client = await Promise.race([acquirePromise, acquireTimeout]);

      clientAcquired = true;



      const acquireDuration = Date.now() - acquireStartTime;

      console.log(`✅ Client acquired for query ${queryId} in ${acquireDuration}ms`);



      // Retry loop - reuse the same client

      for (let attempt = 0; attempt <= maxRetries; attempt++) {

        const startTime = Date.now();



        try {

          const attemptLog = attempt > 0 ? ` (retry ${attempt}/${maxRetries})` : '';

          console.log(`🔍 Query ${queryId}${attemptLog}: ${text.substring(0, 80)}...`);



          // Execute query with timeout using the SAME client

          const queryPromise = client.query(text, params);

          const queryTimeout = new Promise<never>((_, reject) => {

            setTimeout(() => reject(new Error('Query execution timeout')), timeout);

          });



          const result = (await Promise.race([queryPromise, queryTimeout])) as QueryResult<T>;



          const duration = Date.now() - startTime;

          console.log(

            `✅ Query ${queryId} completed in ${duration}ms, rows: ${result.rowCount || 0}`

          );



          // Increment consecutive successes

          this.circuitBreaker.consecutiveSuccesses++;

          this.metrics.successfulQueries++;

          this.metrics.totalQueryDuration += duration;



          console.log(

            `📈 Consecutive successes: ${this.circuitBreaker.consecutiveSuccesses}/${this.circuitBreaker.threshold}`

          );



          // Log query details for monitoring

          this.logQueryDetails(queryId, text, params, duration);



          // If slow and execution plan logging is enabled, get execution plan

          if (

            duration > this.queryLogConfig.slowQueryThresholdMs &&

            this.queryLogConfig.logExecutionPlan

          ) {

            const plan = await this.explainQuery(text, params);

            if (plan) {

              this.logExecutionPlan(queryId, plan);

            }

          }



          // Try to reset circuit breaker (will only reset if enough consecutive successes)

          this.resetCircuitBreaker();



          return {

            rows: result.rows as T[],

            rowCount: result.rowCount || 0,

          };

        } catch (error) {

          const duration = Date.now() - startTime;

          lastError = error as Error;



          // Reset consecutive successes on any failure

          this.circuitBreaker.consecutiveSuccesses = 0;



          console.error(

            `❌ Query ${queryId} attempt ${attempt + 1}/${

              maxRetries + 1

            } failed after ${duration}ms:`,

            lastError.message

          );



          // Don't retry on certain types of errors

          if (

            lastError.message.includes('syntax error') ||

            lastError.message.includes('permission denied') ||

            lastError.message.includes('does not exist')

          ) {

            console.log(`🚫 Non-retryable error detected for query ${queryId}, aborting retries`);

            // CRITICAL FIX: Only count as one failure for the entire operation

            this.circuitBreaker.failures++;

            this.circuitBreaker.lastFailure = Date.now();

            break; // Exit retry loop immediately

          }



          // Log query failure details

          this.logQueryDetails(queryId, text, params, duration, lastError);



          this.logCircuitBreakerState(`Query attempt ${attempt + 1} failed`, queryId);



          // CRITICAL FIX: Only increment failure counter on LAST retry attempt

          // This prevents a single failed operation from being counted as multiple failures

          if (attempt === maxRetries) {

            this.circuitBreaker.failures++;

            this.circuitBreaker.lastFailure = Date.now();



            // Check threshold after final failure

            if (this.circuitBreaker.failures >= this.circuitBreaker.threshold) {

              console.warn(

                `🚨 Circuit breaker threshold reached: ${this.circuitBreaker.failures}/${this.circuitBreaker.threshold}`

              );

              this.openCircuitBreaker();

            }

          }



          // Wait before retry with exponential backoff

          if (attempt < maxRetries) {

            const backoffMs = Math.min(1000 * Math.pow(2, attempt), 10000);

            console.log(`⏳ Retrying query ${queryId} in ${backoffMs}ms...`);

            await new Promise(resolve => setTimeout(resolve, backoffMs));

          }

        }

      }



      // If we exit the retry loop without returning, throw the last error

      throw new Error(

        `Query failed after ${maxRetries + 1} attempts: ${lastError?.message || 'Unknown error'}`

      );

    } catch (error) {

      // Handle client acquisition failures or other errors

      if (!clientAcquired) {

        console.error(

          `❌ Failed to acquire client for query ${queryId}:`,

          (error as Error).message

        );

        this.metrics.failedConnections++;

      }

      throw error;

    } finally {

      // Release client EXACTLY ONCE

      if (client && !clientReleased) {

        try {

          const shouldDestroy = lastError !== null; // Destroy on error

          client.release(shouldDestroy);

          clientReleased = true;

          console.log(`🔓 Client released for query ${queryId} (destroyed: ${shouldDestroy})`);

        } catch (releaseError) {

          console.error(`❌ Error releasing client for query ${queryId}:`, releaseError);

        }

      }

    }

  }



  async withTransaction<T>(callback: (client: PoolClient) => Promise<T>): Promise<T> {

    this.ensurePool();



    const client = await this.pool!.connect();

    let hadError = false;



    try {

      await client.query('BEGIN');

      const result = await callback(client);

      await client.query('COMMIT');

      return result;

    } catch (error) {

      hadError = true;

      await client.query('ROLLBACK');

      throw error;

    } finally {

      client.release(hadError);

    }

  }



  async testConnection(): Promise<{ success: boolean; error?: string }> {

    try {

      await this.query('SELECT 1');

      return { success: true };

    } catch (error) {

      return {

        success: false,

        error: error instanceof Error ? error.message : 'Unknown error',

      };

    }

  }



  getStatus(): ConnectionManagerStatus {

    const poolStatus = this.getPoolStatus();

    return {

      state: this.circuitBreaker.state,

      poolStatus,

      totalConnections: poolStatus.total,

      activeConnections: poolStatus.active,

      idleConnections: poolStatus.idle,

      waitingConnections: poolStatus.waiting,

      failedConnections: this.metrics.failedConnections,

      avgResponseTime:

        this.metrics.successfulQueries === 0

          ? 0

          : this.metrics.totalQueryDuration / this.metrics.successfulQueries,

      uptime: Date.now() - this.metrics.startTime,

      lastFailure: this.circuitBreaker.lastFailure,

      circuitBreakerFailures: this.circuitBreaker.failures,

      circuitBreakerThreshold: this.circuitBreaker.threshold,

      circuitBreakerConsecutiveSuccesses: this.circuitBreaker.consecutiveSuccesses,

    };

  }



  // Alert on high waiting connections and provide summarized health

  getPoolHealth(): { status: 'healthy' | 'warning' | 'critical'; message: string } {

    const poolStatus = this.getPoolStatus();

    const utilizationPercent =

      poolStatus.total > 0 ? (poolStatus.active / poolStatus.total) * 100 : 0;



    if (poolStatus.waiting > 10) {

      return { status: 'critical', message: `${poolStatus.waiting} connections waiting` };

    }

    if (poolStatus.waiting > 5 || utilizationPercent > 80) {

      return {

        status: 'warning',

        message: `High pool utilization: ${utilizationPercent.toFixed(1)}%`,

      };

    }

    return { status: 'healthy', message: 'Pool operating normally' };

  }



  getQueryMetrics(): unknown {

    const fingerprints = Array.from(this.metrics.queryFingerprints.entries())

      .map(([fingerprint, stats]) => ({

        fingerprint,

        ...stats,

      }))

      .sort((a, b) => b.avgDuration - a.avgDuration);



    const topSlowQueries = fingerprints.slice(0, 10);



    return {

      totalQueries: this.metrics.successfulQueries + this.metrics.slowQueries,

      successfulQueries: this.metrics.successfulQueries,

      slowQueries: this.metrics.slowQueries,

      avgQueryDuration:

        this.metrics.successfulQueries === 0

          ? 0

          : this.metrics.totalQueryDuration / this.metrics.successfulQueries,

      queryFingerprints: fingerprints,

      topSlowQueries,

    };

  }



  async closePool(): Promise<void> {

    if (this.pool) {

      await this.pool.end();

      this.pool = null;

    }

  }



  private setupCleanupHandlers(): void {

    // Increase max listeners to prevent warnings during legitimate use

    process.setMaxListeners(20);



    // Check if handlers are already registered (module-level flag)

    if (cleanupHandlersRegistered) {

      console.log('🔄 Cleanup handlers already registered, skipping...');

      return;

    }



    console.log('🛡️ Setting up database cleanup handlers...');



    // Remove any existing listeners before adding new ones

    const signals = ['SIGTERM', 'SIGINT', 'exit'] as const;

    signals.forEach(signal => {

      const existingListeners = process.listenerCount(signal);

      if (existingListeners > 0) {

        console.log(`🧹 Removing ${existingListeners} existing ${signal} listeners`);

        process.removeAllListeners(signal);

      }

    });



    // Define cleanup function

    const cleanup = async (signal: string) => {

      console.log(`\n🛑 Received ${signal}, closing database connections...`);

      try {

        await this.closePool();

        console.log('✅ Database connections closed gracefully');

        if (signal !== 'exit') {

          process.exit(0);

        }

      } catch (error) {

        console.error('❌ Error during database cleanup:', error);

        if (signal !== 'exit') {

          process.exit(1);

        }

      }

    };



    // Register cleanup handlers

    process.on('SIGTERM', () => cleanup('SIGTERM'));

    process.on('SIGINT', () => cleanup('SIGINT'));

    process.on('exit', () => {

      // Synchronous cleanup for exit event

      if (this.pool) {

        console.log('🛑 Process exiting, closing pool synchronously...');

        // Note: exit event doesn't support async, so we just end the pool

        this.pool.end().catch(err => console.error('Error ending pool:', err));

      }

    });



    // Mark handlers as registered

    cleanupHandlersRegistered = true;

    console.log('✅ Cleanup handlers registered successfully');

  }

}



export const dbManager = new EnterpriseConnectionManager();



export const query = <T extends QueryResultRow = unknown>(

  text: string,

  params?: unknown[],

  options?: QueryOptions

) => dbManager.query<T>(text, params, options);



export const withTransaction = <T>(callback: (client: PoolClient) => Promise<T>) =>

  dbManager.withTransaction(callback);



export const testConnection = () => dbManager.testConnection();

export const getPoolStatus = () => dbManager.getStatus();

export const closePool = () => dbManager.closePool();



export const enterpriseDb = {

  query,

  transaction: withTransaction,

  testConnection,

  getStatus: () => dbManager.getStatus(),

};



export default dbManager;



