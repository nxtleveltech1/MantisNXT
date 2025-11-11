import { NextRequest, NextResponse } from 'next/server'
import { pool } from '@/lib/database'

/**
 * Frontend Health Check API
 * Provides comprehensive system health information for frontend troubleshooting
 */
export async function GET(request: NextRequest) {
  const startTime = Date.now()
  const timestamp = new Date().toISOString()

  try {
    const healthChecks: {
      timestamp: string;
      status: string;
      services: {
        database: { status: string; responseTime: number; error: string | null; version?: string; currentTime?: any };
        apis: {
          suppliers: { status: string; responseTime: number; error: string | null };
          inventory: { status: string; responseTime: number; error: string | null };
          analytics: { status: string; responseTime: number; error: string | null };
          alerts: { status: string; responseTime: number; error: string | null };
          [key: string]: { status: string; responseTime: number; error: string | null; dataCount?: any };
        };
      };
      system: {
        nodeVersion: string;
        platform: string;
        uptime: number;
        memoryUsage: NodeJS.MemoryUsage;
        totalResponseTime: number;
      };
    } = {
      timestamp,
      status: 'healthy',
      services: {
        database: { status: 'unknown', responseTime: 0, error: null },
        apis: {
          suppliers: { status: 'unknown', responseTime: 0, error: null },
          inventory: { status: 'unknown', responseTime: 0, error: null },
          analytics: { status: 'unknown', responseTime: 0, error: null },
          alerts: { status: 'unknown', responseTime: 0, error: null }
        }
      },
      system: {
        nodeVersion: process.version,
        platform: process.platform,
        uptime: process.uptime(),
        memoryUsage: process.memoryUsage(),
        totalResponseTime: 0
      }
    }

    // Test database connection
    try {
      const dbStart = Date.now()
      const dbResult = await pool.query('SELECT NOW() as current_time, version() as db_version')
      healthChecks.services.database = {
        status: 'healthy',
        responseTime: Date.now() - dbStart,
        error: null,
        version: dbResult.rows[0]?.db_version?.split(' ')[0] || 'unknown',
        currentTime: dbResult.rows[0]?.current_time
      }
    } catch (error) {
      healthChecks.services.database = {
        status: 'unhealthy',
        responseTime: 0,
        error: error instanceof Error ? error.message : String(error)
      }
      healthChecks.status = 'degraded'
    }

    // Test API endpoints
    const apiTests = [
      { name: 'suppliers', path: '/api/suppliers?limit=1' },
      { name: 'inventory', path: '/api/inventory?limit=1' },
      { name: 'analytics', path: '/api/analytics/dashboard' },
      { name: 'alerts', path: '/api/alerts?limit=1' }
    ]

    for (const apiTest of apiTests) {
      try {
        const apiStart = Date.now()
        const baseUrl = request.nextUrl.origin

        const response = await fetch(`${baseUrl}${apiTest.path}`, {
          headers: {
            'Content-Type': 'application/json',
          },
          signal: AbortSignal.timeout(10000) // 10 second timeout
        })

        const responseTime = Date.now() - apiStart

        if (response.ok) {
          const data = await response.json()
          healthChecks.services.apis[apiTest.name] = {
            status: data.success ? 'healthy' : 'degraded',
            responseTime,
            error: data.success ? null : data.error || 'Unknown API error',
            dataCount: Array.isArray(data.data) ? data.data.length : 'N/A'
          }
        } else {
          healthChecks.services.apis[apiTest.name] = {
            status: 'unhealthy',
            responseTime,
            error: `HTTP ${response.status}: ${response.statusText}`
          }
          healthChecks.status = 'degraded'
        }
      } catch (error) {
        healthChecks.services.apis[apiTest.name] = {
          status: 'unhealthy',
          responseTime: 0,
          error: error instanceof Error ? error.message : String(error)
        }
        healthChecks.status = 'degraded'
      }
    }

    // Calculate total response time
    healthChecks.system.totalResponseTime = Date.now() - startTime

    // Determine overall status
    const unhealthyServices = Object.values(healthChecks.services.database.status === 'unhealthy' ? [healthChecks.services.database] : [])
      .concat(Object.values(healthChecks.services.apis).filter(api => api.status === 'unhealthy'))

    if (unhealthyServices.length > 0) {
      healthChecks.status = unhealthyServices.length > 2 ? 'unhealthy' : 'degraded'
    }

    // Add recommendations based on health status
    const recommendations = []

    if (healthChecks.services.database.status === 'unhealthy') {
      recommendations.push('Database connection failed - check database server status and connection settings')
    }

    const slowApis = Object.entries(healthChecks.services.apis)
      .filter(([_, api]) => api.responseTime > 5000)
      .map(([name, _]) => name)

    if (slowApis.length > 0) {
      recommendations.push(`Slow API responses detected in: ${slowApis.join(', ')} - consider optimizing queries or increasing server resources`)
    }

    if (healthChecks.system.memoryUsage.heapUsed / healthChecks.system.memoryUsage.heapTotal > 0.9) {
      recommendations.push('High memory usage detected - consider restarting the application')
    }

    return NextResponse.json({
      success: true,
      data: {
        ...healthChecks,
        recommendations
      }
    })

  } catch (error) {
    console.error('Health check failed:', error)

    return NextResponse.json({
      success: false,
      data: {
        timestamp,
        status: 'unhealthy',
        error: error instanceof Error ? error.message : String(error),
        system: {
          nodeVersion: process.version,
          platform: process.platform,
          uptime: process.uptime(),
          memoryUsage: process.memoryUsage(),
          totalResponseTime: Date.now() - startTime
        },
        recommendations: [
          'System health check failed - contact system administrator',
          'Check server logs for detailed error information'
        ]
      }
    }, { status: 500 })
  }
}
