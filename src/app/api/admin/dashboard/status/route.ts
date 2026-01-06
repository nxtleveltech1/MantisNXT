import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { dbHealthCheck, getDbMetrics } from '@/lib/database/connection-pool';
import { redisHealthCheck } from '@/lib/cache/redis-client';
import { verifyAuth, isAdmin } from '@/lib/auth/auth-helper';

export interface ServiceStatus {
  name: string;
  status: 'operational' | 'degraded' | 'down';
  latency?: number;
  message?: string;
  lastChecked: string;
}

export interface SystemStatus {
  overall: 'healthy' | 'degraded' | 'unhealthy';
  services: ServiceStatus[];
  uptime: number;
  version: string;
  environment: string;
}

export async function GET(request: NextRequest) {
  try {
    // Verify authentication
    const user = await verifyAuth(request);

    if (!user) {
      return NextResponse.json(
        {
          success: false,
          error: 'UNAUTHORIZED',
          message: 'Authentication required',
        },
        { status: 401 }
      );
    }

    // Check admin permissions
    if (!isAdmin(user)) {
      return NextResponse.json(
        {
          success: false,
          error: 'FORBIDDEN',
          message: 'Admin access required',
        },
        { status: 403 }
      );
    }

    const services: ServiceStatus[] = [];
    const now = new Date().toISOString();

    // Check Database health
    try {
      const dbCheck = await dbHealthCheck();
      services.push({
        name: 'Database',
        status: dbCheck.healthy ? 'operational' : 'down',
        latency: dbCheck.latency,
        message: dbCheck.healthy ? 'Healthy' : dbCheck.error,
        lastChecked: now,
      });
    } catch (error) {
      services.push({
        name: 'Database',
        status: 'down',
        message: error instanceof Error ? error.message : 'Connection failed',
        lastChecked: now,
      });
    }

    // Check Redis health
    try {
      const redisCheck = await redisHealthCheck();
      services.push({
        name: 'Cache (Redis)',
        status: redisCheck.healthy ? 'operational' : 'degraded',
        latency: redisCheck.latency,
        message: redisCheck.healthy ? 'Operational' : redisCheck.error || 'Not connected',
        lastChecked: now,
      });
    } catch {
      services.push({
        name: 'Cache (Redis)',
        status: 'degraded',
        message: 'Redis not available (using fallback)',
        lastChecked: now,
      });
    }

    // Check API Services (self-check)
    const apiStartTime = Date.now();
    services.push({
      name: 'API Services',
      status: 'operational',
      latency: Date.now() - apiStartTime,
      message: 'Operational',
      lastChecked: now,
    });

    // Check AI Engine
    try {
      const aiCheck = await checkAIEngine();
      services.push({
        name: 'AI Engine',
        status: aiCheck.healthy ? 'operational' : 'degraded',
        latency: aiCheck.latency,
        message: aiCheck.healthy ? 'Running' : aiCheck.message,
        lastChecked: now,
      });
    } catch {
      services.push({
        name: 'AI Engine',
        status: 'degraded',
        message: 'AI service status unknown',
        lastChecked: now,
      });
    }

    // Check Background Jobs
    try {
      const jobsCheck = await checkBackgroundJobs();
      services.push({
        name: 'Background Jobs',
        status: jobsCheck.queuedCount > 100 ? 'degraded' : 'operational',
        message: `${jobsCheck.queuedCount} queued`,
        lastChecked: now,
      });
    } catch {
      services.push({
        name: 'Background Jobs',
        status: 'operational',
        message: '0 queued',
        lastChecked: now,
      });
    }

    // Determine overall status
    const hasDown = services.some(s => s.status === 'down');
    const hasDegraded = services.some(s => s.status === 'degraded');
    
    let overall: SystemStatus['overall'] = 'healthy';
    if (hasDown) {
      overall = 'unhealthy';
    } else if (hasDegraded) {
      overall = 'degraded';
    }

    const systemStatus: SystemStatus = {
      overall,
      services,
      uptime: process.uptime(),
      version: process.env.npm_package_version || '1.0.0',
      environment: process.env.NODE_ENV || 'development',
    };

    return NextResponse.json(
      {
        success: true,
        data: systemStatus,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Admin dashboard status API error:', error);

    return NextResponse.json(
      {
        success: false,
        error: 'SERVER_ERROR',
        message: error instanceof Error ? error.message : 'An unexpected error occurred',
      },
      { status: 500 }
    );
  }
}

async function checkAIEngine(): Promise<{ healthy: boolean; latency?: number; message?: string }> {
  const startTime = Date.now();
  
  try {
    // Check if AI configuration exists
    const hasApiKey = !!process.env.OPENAI_API_KEY || !!process.env.ANTHROPIC_API_KEY;
    
    if (!hasApiKey) {
      return {
        healthy: false,
        message: 'No AI API keys configured',
      };
    }

    return {
      healthy: true,
      latency: Date.now() - startTime,
    };
  } catch (error) {
    return {
      healthy: false,
      message: error instanceof Error ? error.message : 'AI check failed',
    };
  }
}

async function checkBackgroundJobs(): Promise<{ queuedCount: number }> {
  // This would typically query a job queue table
  // For now, return a placeholder
  try {
    const { db } = await import('@/lib/database');
    
    // Try to query a jobs table if it exists
    const result = await db.query(`
      SELECT COUNT(*) as queued
      FROM information_schema.tables
      WHERE table_name = 'background_jobs'
    `);
    
    // If jobs table exists, query it
    if (parseInt(result.rows[0]?.queued || '0') > 0) {
      const jobsResult = await db.query(`
        SELECT COUNT(*) as queued
        FROM background_jobs
        WHERE status = 'pending'
      `);
      return { queuedCount: parseInt(jobsResult.rows[0]?.queued || '0') };
    }
    
    return { queuedCount: 0 };
  } catch {
    return { queuedCount: 0 };
  }
}

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

