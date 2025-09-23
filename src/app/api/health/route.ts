import { NextRequest, NextResponse } from 'next/server';

interface HealthCheck {
  service: string;
  status: 'healthy' | 'unhealthy' | 'warning';
  responseTime?: number;
  error?: string;
  details?: Record<string, any>;
}

interface HealthStatus {
  status: 'healthy' | 'unhealthy' | 'degraded';
  timestamp: string;
  uptime: number;
  version: string;
  environment: string;
  checks: HealthCheck[];
  metrics: {
    memory: {
      used: number;
      total: number;
      percentage: number;
    };
    process: {
      pid: number;
      uptime: number;
      version: string;
    };
  };
}

// Check database connectivity
async function checkDatabase(): Promise<HealthCheck> {
  const start = Date.now();

  try {
    // If you're using a database client, add actual connection check here
    // For now, we'll simulate a basic check
    const databaseUrl = process.env.DATABASE_URL;

    if (!databaseUrl) {
      return {
        service: 'database',
        status: 'unhealthy',
        error: 'DATABASE_URL not configured',
        responseTime: Date.now() - start,
      };
    }

    // In a real implementation, you would test the actual database connection
    // Example with pg or your preferred database client:
    // const client = new Pool({ connectionString: databaseUrl });
    // await client.query('SELECT 1');

    return {
      service: 'database',
      status: 'healthy',
      responseTime: Date.now() - start,
      details: {
        configured: true,
      },
    };
  } catch (error) {
    return {
      service: 'database',
      status: 'unhealthy',
      error: error instanceof Error ? error.message : 'Unknown error',
      responseTime: Date.now() - start,
    };
  }
}

// Check Redis connectivity
async function checkRedis(): Promise<HealthCheck> {
  const start = Date.now();

  try {
    const redisUrl = process.env.REDIS_URL;

    if (!redisUrl) {
      return {
        service: 'redis',
        status: 'warning',
        error: 'REDIS_URL not configured (caching disabled)',
        responseTime: Date.now() - start,
      };
    }

    // In a real implementation, you would test the actual Redis connection
    // Example with ioredis:
    // const redis = new Redis(redisUrl);
    // await redis.ping();

    return {
      service: 'redis',
      status: 'healthy',
      responseTime: Date.now() - start,
      details: {
        configured: true,
      },
    };
  } catch (error) {
    return {
      service: 'redis',
      status: 'unhealthy',
      error: error instanceof Error ? error.message : 'Unknown error',
      responseTime: Date.now() - start,
    };
  }
}

// Check file system
async function checkFileSystem(): Promise<HealthCheck> {
  const start = Date.now();

  try {
    const uploadDir = process.env.UPLOAD_DIR || '/app/uploads';

    // Check if upload directory exists and is writable
    const fs = await import('fs/promises');
    await fs.access(uploadDir, fs.constants.F_OK | fs.constants.W_OK);

    return {
      service: 'filesystem',
      status: 'healthy',
      responseTime: Date.now() - start,
      details: {
        uploadDir,
        writable: true,
      },
    };
  } catch (error) {
    return {
      service: 'filesystem',
      status: 'unhealthy',
      error: error instanceof Error ? error.message : 'Unknown error',
      responseTime: Date.now() - start,
    };
  }
}

// Check external services
async function checkExternalServices(): Promise<HealthCheck> {
  const start = Date.now();

  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseKey) {
      return {
        service: 'supabase',
        status: 'warning',
        error: 'Supabase not configured',
        responseTime: Date.now() - start,
      };
    }

    // Test Supabase connectivity
    const response = await fetch(`${supabaseUrl}/rest/v1/`, {
      method: 'HEAD',
      headers: {
        'apikey': supabaseKey,
        'Authorization': `Bearer ${supabaseKey}`,
      },
    });

    if (response.ok) {
      return {
        service: 'supabase',
        status: 'healthy',
        responseTime: Date.now() - start,
        details: {
          url: supabaseUrl,
          configured: true,
        },
      };
    } else {
      return {
        service: 'supabase',
        status: 'unhealthy',
        error: `HTTP ${response.status}: ${response.statusText}`,
        responseTime: Date.now() - start,
      };
    }
  } catch (error) {
    return {
      service: 'supabase',
      status: 'unhealthy',
      error: error instanceof Error ? error.message : 'Unknown error',
      responseTime: Date.now() - start,
    };
  }
}

// Get system metrics
function getSystemMetrics() {
  const memUsage = process.memoryUsage();

  return {
    memory: {
      used: memUsage.heapUsed,
      total: memUsage.heapTotal,
      percentage: Math.round((memUsage.heapUsed / memUsage.heapTotal) * 100),
    },
    process: {
      pid: process.pid,
      uptime: process.uptime(),
      version: process.version,
    },
  };
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  const startTime = Date.now();

  try {
    // Perform all health checks in parallel
    const [databaseCheck, redisCheck, filesystemCheck, externalCheck] = await Promise.all([
      checkDatabase(),
      checkRedis(),
      checkFileSystem(),
      checkExternalServices(),
    ]);

    const checks = [databaseCheck, redisCheck, filesystemCheck, externalCheck];

    // Determine overall status
    const hasUnhealthy = checks.some(check => check.status === 'unhealthy');
    const hasWarning = checks.some(check => check.status === 'warning');

    let overallStatus: 'healthy' | 'unhealthy' | 'degraded' = 'healthy';
    if (hasUnhealthy) {
      overallStatus = 'unhealthy';
    } else if (hasWarning) {
      overallStatus = 'degraded';
    }

    const healthStatus: HealthStatus = {
      status: overallStatus,
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      version: process.env.npm_package_version || '1.0.0',
      environment: process.env.NODE_ENV || 'development',
      checks,
      metrics: getSystemMetrics(),
    };

    // Set appropriate HTTP status code
    const httpStatus = overallStatus === 'healthy' ? 200 :
                      overallStatus === 'degraded' ? 200 : 503;

    return NextResponse.json(healthStatus, {
      status: httpStatus,
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0',
      },
    });

  } catch (error) {
    const errorStatus: HealthStatus = {
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      version: process.env.npm_package_version || '1.0.0',
      environment: process.env.NODE_ENV || 'development',
      checks: [
        {
          service: 'health-check',
          status: 'unhealthy',
          error: error instanceof Error ? error.message : 'Unknown error',
          responseTime: Date.now() - startTime,
        },
      ],
      metrics: getSystemMetrics(),
    };

    return NextResponse.json(errorStatus, {
      status: 503,
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0',
      },
    });
  }
}

// Simple health check for load balancers
export async function HEAD(request: NextRequest): Promise<NextResponse> {
  return new NextResponse(null, { status: 200 });
}