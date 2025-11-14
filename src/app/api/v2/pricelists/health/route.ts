import { NextResponse } from 'next/server';
import { query } from '@/lib/database';
import { extractionQueue } from '@/lib/services/ExtractionJobQueue';

export async function GET() {
  const checks = {
    queue: { healthy: true, queue_size: extractionQueue.getQueueSize(), active_jobs: extractionQueue.getActiveCount() },
    database: { healthy: false, error: '' },
    storage: { healthy: true }
  };

  try {
    await query('SELECT 1');
    checks.database.healthy = true;
  } catch (error: any) {
    checks.database.healthy = false;
    checks.database.error = error.message;
  }

  const allHealthy = Object.values(checks).every((c: any) => c.healthy);

  return NextResponse.json(
    {
      status: allHealthy ? 'healthy' : 'degraded',
      checks,
      timestamp: new Date().toISOString()
    },
    { status: allHealthy ? 200 : 503 }
  );
}
