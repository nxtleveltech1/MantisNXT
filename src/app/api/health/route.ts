import { NextRequest, NextResponse } from 'next/server';
import getDatabaseMetadata from '@/lib/database-info';

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

// Check database connectivity using our enterprise connection manager
async function checkDatabase(): Promise<HealthCheck> {
  const start = Date.now();
  const metadata = getDatabaseMetadata();

  try {
    // Use our new enterprise database connection manager
    const { testConnection } = await import('../../../../lib/database/enterprise-connection-manager');

    const result = await testConnection();

    if (result.success) {
      return {
        service: 'database',
        status: 'healthy',
        responseTime: result.details.responseTime || (Date.now() - start),
        details: {
          pool: result.details.pool,
          circuitBreaker: result.details.circuitBreaker,
          database: result.details.database || metadata.database,
          host: metadata.host,
          port: metadata.port,
        },
      };
    } else {
      return {
        service: 'database',
        status: 'unhealthy',
        error: result.error || 'Database connection failed',
        responseTime: Date.now() - start,
        details: {
          pool: result.details?.pool,
          circuitBreaker: result.details?.circuitBreaker,
          database: metadata.database,
          host: metadata.host,
          port: metadata.port,
        },
      };
    }
  } catch (error) {
    return {
      service: 'database',
      status: 'unhealthy',
      error: error instanceof Error ? error.message : 'Database connection error',
      responseTime: Date.now() - start,
      details: {
        database: metadata.database,
        host: metadata.host,
        port: metadata.port,
      },
    };
  }
}

// Check system resources
async function checkSystemResources(): Promise<HealthCheck> {
  const start = Date.now();

  try {
    // Basic system resource check
    const memUsage = process.memoryUsage();
    const memoryMB = Math.round(memUsage.heapUsed / 1024 / 1024);
    const memoryPercentage = Math.round((memUsage.heapUsed / memUsage.heapTotal) * 100);

    // Check if memory usage is excessive
    const memoryThreshold = 500; // 500MB threshold for health check
    const isMemoryHealthy = memoryMB < memoryThreshold;

    return {
      service: 'system',
      status: isMemoryHealthy ? 'healthy' : 'warning',
      responseTime: Date.now() - start,
      details: {
        memory: {
          usedMB: memoryMB,
          percentage: memoryPercentage,
          threshold: memoryThreshold,
        },
        pid: process.pid,
        uptime: Math.round(process.uptime()),
        nodeVersion: process.version,
      },
    };
  } catch (error) {
    return {
      service: 'system',
      status: 'unhealthy',
      error: error instanceof Error ? error.message : 'System check error',
      responseTime: Date.now() - start,
    };
  }
}

// Check file system basics
async function checkFileSystem(): Promise<HealthCheck> {
  const start = Date.now();

  try {
    const fs = await import('fs/promises');
    const path = await import('path');

    // Check if .next directory exists (build output)
    const nextDir = path.join(process.cwd(), '.next');
    await fs.access(nextDir, fs.constants.F_OK);

    return {
      service: 'filesystem',
      status: 'healthy',
      responseTime: Date.now() - start,
      details: {
        buildDir: '.next',
        writable: true,
      },
    };
  } catch (error) {
    return {
      service: 'filesystem',
      status: 'warning',
      error: error instanceof Error ? error.message : 'Filesystem check error',
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
    const [databaseCheck, systemCheck, filesystemCheck] = await Promise.all([
      checkDatabase(),
      checkSystemResources(),
      checkFileSystem(),
    ]);

    const checks = [databaseCheck, systemCheck, filesystemCheck];

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
      version: '1.0.0',
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
      version: '1.0.0',
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
