#!/usr/bin/env tsx
/**
 * Redis Connection Validator
 *
 * Tests Redis connectivity and validates functionality
 *
 * @module scripts/validate-redis-connection
 * @author AS Team - Cloud Architect
 */

import { createClient, RedisClientType } from 'redis';

// ============================================================================
// CONFIGURATION
// ============================================================================

interface TestResult {
  name: string;
  status: 'passed' | 'failed' | 'warning';
  duration: number;
  message: string;
  details?: any;
}

// ============================================================================
// TEST FUNCTIONS
// ============================================================================

/**
 * Test basic Redis connectivity
 */
async function testConnection(client: RedisClientType): Promise<TestResult> {
  const start = Date.now();
  try {
    await client.connect();
    const pong = await client.ping();

    if (pong !== 'PONG') {
      throw new Error(`Unexpected ping response: ${pong}`);
    }

    return {
      name: 'Basic Connectivity',
      status: 'passed',
      duration: Date.now() - start,
      message: 'Successfully connected to Redis and received PONG response',
    };
  } catch (error) {
    return {
      name: 'Basic Connectivity',
      status: 'failed',
      duration: Date.now() - start,
      message: `Failed to connect: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
}

/**
 * Test basic key-value operations
 */
async function testBasicOperations(client: RedisClientType): Promise<TestResult> {
  const start = Date.now();
  const testKey = 'test:validation:' + Date.now();
  const testValue = 'Hello Redis!';

  try {
    // SET
    await client.set(testKey, testValue, { EX: 60 }); // 60 second TTL

    // GET
    const retrieved = await client.get(testKey);
    if (retrieved !== testValue) {
      throw new Error(`Value mismatch: expected "${testValue}", got "${retrieved}"`);
    }

    // DEL
    await client.del(testKey);

    // Verify deletion
    const afterDelete = await client.get(testKey);
    if (afterDelete !== null) {
      throw new Error('Key was not deleted');
    }

    return {
      name: 'Basic Operations (SET/GET/DEL)',
      status: 'passed',
      duration: Date.now() - start,
      message: 'Successfully tested SET, GET, and DEL operations',
    };
  } catch (error) {
    return {
      name: 'Basic Operations (SET/GET/DEL)',
      status: 'failed',
      duration: Date.now() - start,
      message: `Failed: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
}

/**
 * Test session storage functionality
 */
async function testSessionStorage(client: RedisClientType): Promise<TestResult> {
  const start = Date.now();
  const sessionKey = 'session:test:' + Date.now();
  const sessionData = {
    userId: 'test-user-123',
    email: 'test@example.com',
    roles: ['user', 'admin'],
    createdAt: new Date().toISOString(),
  };

  try {
    // Store session as JSON string
    await client.setEx(sessionKey, 3600, JSON.stringify(sessionData));

    // Retrieve and parse
    const retrieved = await client.get(sessionKey);
    if (!retrieved) {
      throw new Error('Session not found');
    }

    const parsed = JSON.parse(retrieved);
    if (parsed.userId !== sessionData.userId) {
      throw new Error('Session data mismatch');
    }

    // Check TTL
    const ttl = await client.ttl(sessionKey);
    if (ttl <= 0) {
      throw new Error('TTL not set correctly');
    }

    // Cleanup
    await client.del(sessionKey);

    return {
      name: 'Session Storage',
      status: 'passed',
      duration: Date.now() - start,
      message: `Successfully stored and retrieved session with TTL (${ttl}s remaining)`,
      details: { ttl },
    };
  } catch (error) {
    return {
      name: 'Session Storage',
      status: 'failed',
      duration: Date.now() - start,
      message: `Failed: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
}

/**
 * Test rate limiting functionality
 */
async function testRateLimiting(client: RedisClientType): Promise<TestResult> {
  const start = Date.now();
  const rateLimitKey = 'ratelimit:test:' + Date.now();
  const maxRequests = 5;
  const window = 60; // seconds

  try {
    // Simulate rate limit checking
    for (let i = 0; i < maxRequests + 2; i++) {
      await client.incr(rateLimitKey);
    }

    await client.expire(rateLimitKey, window);

    // Check count
    const count = await client.get(rateLimitKey);
    const countNum = parseInt(count || '0', 10);

    if (countNum !== maxRequests + 2) {
      throw new Error(`Expected ${maxRequests + 2} requests, got ${countNum}`);
    }

    // Cleanup
    await client.del(rateLimitKey);

    return {
      name: 'Rate Limiting',
      status: 'passed',
      duration: Date.now() - start,
      message: `Successfully tested rate limiting (${countNum} requests tracked)`,
      details: { requests: countNum, window },
    };
  } catch (error) {
    return {
      name: 'Rate Limiting',
      status: 'failed',
      duration: Date.now() - start,
      message: `Failed: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
}

/**
 * Test caching functionality
 */
async function testCaching(client: RedisClientType): Promise<TestResult> {
  const start = Date.now();
  const cacheKey = 'cache:test:api:response:' + Date.now();
  const cacheData = {
    status: 200,
    data: {
      users: [
        { id: 1, name: 'John' },
        { id: 2, name: 'Jane' },
      ],
    },
    timestamp: Date.now(),
  };

  try {
    // Cache API response
    await client.setEx(cacheKey, 300, JSON.stringify(cacheData)); // 5 min TTL

    // Retrieve from cache
    const cached = await client.get(cacheKey);
    if (!cached) {
      throw new Error('Cache miss');
    }

    const parsed = JSON.parse(cached);
    if (parsed.status !== cacheData.status) {
      throw new Error('Cached data mismatch');
    }

    // Test cache invalidation
    await client.del(cacheKey);
    const afterDelete = await client.get(cacheKey);
    if (afterDelete !== null) {
      throw new Error('Cache not invalidated');
    }

    return {
      name: 'Caching',
      status: 'passed',
      duration: Date.now() - start,
      message: 'Successfully tested cache storage and invalidation',
    };
  } catch (error) {
    return {
      name: 'Caching',
      status: 'failed',
      duration: Date.now() - start,
      message: `Failed: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
}

/**
 * Test performance benchmarks
 */
async function testPerformance(client: RedisClientType): Promise<TestResult> {
  const start = Date.now();
  const iterations = 100;
  const testKey = 'perf:test:' + Date.now();

  try {
    // Benchmark SET operations
    const setStart = Date.now();
    for (let i = 0; i < iterations; i++) {
      await client.set(`${testKey}:${i}`, `value-${i}`);
    }
    const setDuration = Date.now() - setStart;

    // Benchmark GET operations
    const getStart = Date.now();
    for (let i = 0; i < iterations; i++) {
      await client.get(`${testKey}:${i}`);
    }
    const getDuration = Date.now() - getStart;

    // Cleanup
    for (let i = 0; i < iterations; i++) {
      await client.del(`${testKey}:${i}`);
    }

    const avgSet = (setDuration / iterations).toFixed(2);
    const avgGet = (getDuration / iterations).toFixed(2);

    // Performance thresholds
    const setThreshold = 10; // ms
    const getThreshold = 5; // ms

    const status =
      parseFloat(avgSet) < setThreshold && parseFloat(avgGet) < getThreshold ? 'passed' : 'warning';

    return {
      name: 'Performance Benchmark',
      status,
      duration: Date.now() - start,
      message: `Avg SET: ${avgSet}ms, Avg GET: ${avgGet}ms (${iterations} iterations)`,
      details: {
        iterations,
        avgSetMs: parseFloat(avgSet),
        avgGetMs: parseFloat(avgGet),
        setThreshold,
        getThreshold,
      },
    };
  } catch (error) {
    return {
      name: 'Performance Benchmark',
      status: 'failed',
      duration: Date.now() - start,
      message: `Failed: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
}

/**
 * Get Redis server info
 */
async function getServerInfo(client: RedisClientType): Promise<TestResult> {
  const start = Date.now();

  try {
    const info = await client.info();
    const lines = info.split('\r\n');
    const serverInfo: { [key: string]: string } = {};

    for (const line of lines) {
      if (line && !line.startsWith('#')) {
        const [key, value] = line.split(':');
        if (key && value) {
          serverInfo[key] = value;
        }
      }
    }

    const version = serverInfo['redis_version'] || 'unknown';
    const uptime = parseInt(serverInfo['uptime_in_seconds'] || '0', 10);
    const connectedClients = parseInt(serverInfo['connected_clients'] || '0', 10);
    const usedMemory = serverInfo['used_memory_human'] || 'unknown';

    return {
      name: 'Server Info',
      status: 'passed',
      duration: Date.now() - start,
      message: `Redis ${version}, Uptime: ${Math.floor(uptime / 3600)}h, Memory: ${usedMemory}`,
      details: {
        version,
        uptimeHours: Math.floor(uptime / 3600),
        connectedClients,
        usedMemory,
      },
    };
  } catch (error) {
    return {
      name: 'Server Info',
      status: 'warning',
      duration: Date.now() - start,
      message: `Could not retrieve server info: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
}

// ============================================================================
// MAIN EXECUTION
// ============================================================================

async function main() {
  console.log('\n🚀 Redis Connection Validation');
  console.log('==============================\n');

  // Check environment
  const redisUrl = process.env.REDIS_URL;
  if (!redisUrl) {
    console.error('❌ REDIS_URL environment variable not set');
    console.error('   Please set REDIS_URL in your environment\n');
    process.exit(1);
  }

  console.log(`📡 Connecting to Redis...`);
  console.log(`   URL: ${redisUrl.replace(/:[^:@]+@/, ':****@')}\n`);

  // Create client
  const client = createClient({
    url: redisUrl,
    socket: {
      connectTimeout: 10000,
      reconnectStrategy: false, // Don't retry on test failures
    },
  });

  // Handle errors
  client.on('error', err => {
    console.error('Redis Client Error:', err);
  });

  const results: TestResult[] = [];

  try {
    // Run tests
    console.log('⏳ Running tests...\n');

    results.push(await testConnection(client));
    if (results[0].status === 'failed') {
      throw new Error('Connection failed, skipping remaining tests');
    }

    results.push(await testBasicOperations(client));
    results.push(await testSessionStorage(client));
    results.push(await testRateLimiting(client));
    results.push(await testCaching(client));
    results.push(await testPerformance(client));
    results.push(await getServerInfo(client));
  } catch (error) {
    console.error(`\n❌ Fatal error: ${error instanceof Error ? error.message : String(error)}`);
  } finally {
    // Cleanup
    if (client.isOpen) {
      await client.quit();
    }
  }

  // Display results
  console.log('═'.repeat(80));
  console.log('TEST RESULTS');
  console.log('═'.repeat(80) + '\n');

  let passed = 0;
  let failed = 0;
  let warnings = 0;

  for (const result of results) {
    const icon = result.status === 'passed' ? '✅' : result.status === 'warning' ? '⚠️ ' : '❌';
    console.log(`${icon} ${result.name}`);
    console.log(`   ${result.message}`);
    console.log(`   Duration: ${result.duration}ms`);

    if (result.details) {
      console.log(`   Details: ${JSON.stringify(result.details)}`);
    }

    console.log();

    if (result.status === 'passed') passed++;
    else if (result.status === 'warning') warnings++;
    else failed++;
  }

  // Summary
  console.log('═'.repeat(80));
  console.log('SUMMARY');
  console.log('═'.repeat(80) + '\n');
  console.log(`✅ Passed:   ${passed}`);
  console.log(`⚠️  Warnings: ${warnings}`);
  console.log(`❌ Failed:   ${failed}`);
  console.log(`📊 Total:    ${results.length}\n`);

  if (failed > 0) {
    console.log('❌ REDIS VALIDATION: FAILED\n');
    console.log('Please fix the failed tests before proceeding to production.\n');
    process.exit(1);
  } else if (warnings > 0) {
    console.log('⚠️  REDIS VALIDATION: PASSED WITH WARNINGS\n');
    console.log('Review warnings before proceeding to production.\n');
  } else {
    console.log('✅ REDIS VALIDATION: PASSED\n');
    console.log('Redis is ready for production use.\n');
  }

  console.log('Next steps:');
  console.log('1. Configure monitoring alerts');
  console.log('2. Set up backup retention');
  console.log('3. Document connection details in secrets manager\n');
}

// Run if executed directly
if (require.main === module) {
  main().catch(error => {
    console.error('Unhandled error:', error);
    process.exit(1);
  });
}

export { testConnection, testBasicOperations, testSessionStorage, testRateLimiting };
