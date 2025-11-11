import type { NextRequest} from 'next/server';
import { NextResponse } from 'next/server';

// Prometheus metrics format
function formatPrometheusMetric(
  name: string,
  value: number,
  labels: Record<string, string> = {},
  help?: string,
  type?: string
): string {
  let metric = '';

  if (help) {
    metric += `# HELP ${name} ${help}\n`;
  }

  if (type) {
    metric += `# TYPE ${name} ${type}\n`;
  }

  const labelStr = Object.entries(labels)
    .map(([key, value]) => `${key}="${value}"`)
    .join(',');

  metric += `${name}${labelStr ? `{${labelStr}}` : ''} ${value}\n`;

  return metric;
}

// Get Node.js process metrics
function getProcessMetrics(): string {
  const memUsage = process.memoryUsage();
  const cpuUsage = process.cpuUsage();

  let metrics = '';

  // Memory metrics
  metrics += formatPrometheusMetric(
    'nodejs_heap_size_used_bytes',
    memUsage.heapUsed,
    {},
    'Process heap space used in bytes',
    'gauge'
  );

  metrics += formatPrometheusMetric(
    'nodejs_heap_size_total_bytes',
    memUsage.heapTotal,
    {},
    'Process heap space total in bytes',
    'gauge'
  );

  metrics += formatPrometheusMetric(
    'nodejs_external_memory_bytes',
    memUsage.external,
    {},
    'Node.js external memory size in bytes',
    'gauge'
  );

  metrics += formatPrometheusMetric(
    'nodejs_resident_set_size_bytes',
    memUsage.rss,
    {},
    'Resident set size in bytes',
    'gauge'
  );

  // Process metrics
  metrics += formatPrometheusMetric(
    'nodejs_process_start_time_seconds',
    Date.now() / 1000 - process.uptime(),
    {},
    'Start time of the process since unix epoch in seconds',
    'gauge'
  );

  metrics += formatPrometheusMetric(
    'nodejs_process_uptime_seconds',
    process.uptime(),
    {},
    'Node.js process uptime in seconds',
    'gauge'
  );

  // CPU metrics (in microseconds)
  metrics += formatPrometheusMetric(
    'nodejs_process_cpu_user_seconds_total',
    cpuUsage.user / 1000000,
    {},
    'Total user CPU time spent in seconds',
    'counter'
  );

  metrics += formatPrometheusMetric(
    'nodejs_process_cpu_system_seconds_total',
    cpuUsage.system / 1000000,
    {},
    'Total system CPU time spent in seconds',
    'counter'
  );

  return metrics;
}

// Get application-specific metrics
function getApplicationMetrics(): string {
  let metrics = '';

  // Environment info
  metrics += formatPrometheusMetric(
    'mantisnxt_info',
    1,
    {
      version: process.env.npm_package_version || '1.0.0',
      environment: process.env.NODE_ENV || 'development',
      node_version: process.version,
    },
    'MantisNXT application info',
    'gauge'
  );

  // Configuration status
  const dbConfigured = process.env.DATABASE_URL ? 1 : 0;
  const redisConfigured = process.env.REDIS_URL ? 1 : 0;
  const supabaseConfigured =
    process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? 1 : 0;

  metrics += formatPrometheusMetric(
    'mantisnxt_config_database_configured',
    dbConfigured,
    {},
    'Database configuration status',
    'gauge'
  );

  metrics += formatPrometheusMetric(
    'mantisnxt_config_redis_configured',
    redisConfigured,
    {},
    'Redis configuration status',
    'gauge'
  );

  metrics += formatPrometheusMetric(
    'mantisnxt_config_supabase_configured',
    supabaseConfigured,
    {},
    'Supabase configuration status',
    'gauge'
  );

  // Feature flags
  const analyticsEnabled = process.env.ENABLE_ANALYTICS === 'true' ? 1 : 0;
  const auditLoggingEnabled = process.env.ENABLE_AUDIT_LOGGING === 'true' ? 1 : 0;
  const rateLimitingEnabled = process.env.ENABLE_RATE_LIMITING === 'true' ? 1 : 0;
  const cachingEnabled = process.env.ENABLE_CACHING === 'true' ? 1 : 0;

  metrics += formatPrometheusMetric(
    'mantisnxt_feature_analytics_enabled',
    analyticsEnabled,
    {},
    'Analytics feature status',
    'gauge'
  );

  metrics += formatPrometheusMetric(
    'mantisnxt_feature_audit_logging_enabled',
    auditLoggingEnabled,
    {},
    'Audit logging feature status',
    'gauge'
  );

  metrics += formatPrometheusMetric(
    'mantisnxt_feature_rate_limiting_enabled',
    rateLimitingEnabled,
    {},
    'Rate limiting feature status',
    'gauge'
  );

  metrics += formatPrometheusMetric(
    'mantisnxt_feature_caching_enabled',
    cachingEnabled,
    {},
    'Caching feature status',
    'gauge'
  );

  return metrics;
}

// Get system metrics (if available)
async function getSystemMetrics(): Promise<string> {
  let metrics = '';

  try {
    // Get filesystem metrics for upload directory
    const fs = await import('fs/promises');
    const uploadDir = process.env.UPLOAD_DIR || '/app/uploads';

    try {
      await fs.access(uploadDir);
      metrics += formatPrometheusMetric(
        'mantisnxt_filesystem_upload_dir_accessible',
        1,
        { path: uploadDir },
        'Upload directory accessibility',
        'gauge'
      );
    } catch {
      metrics += formatPrometheusMetric(
        'mantisnxt_filesystem_upload_dir_accessible',
        0,
        { path: uploadDir },
        'Upload directory accessibility',
        'gauge'
      );
    }

    // Get upload directory size if possible
    try {
      const stats = await fs.stat(uploadDir);
      if (stats.isDirectory()) {
        // Note: This is a simplified size check
        // In production, you might want to use a more efficient method
        metrics += formatPrometheusMetric(
          'mantisnxt_filesystem_upload_dir_exists',
          1,
          { path: uploadDir },
          'Upload directory exists',
          'gauge'
        );
      }
    } catch {
      metrics += formatPrometheusMetric(
        'mantisnxt_filesystem_upload_dir_exists',
        0,
        { path: uploadDir },
        'Upload directory exists',
        'gauge'
      );
    }
  } catch (error) {
    // File system access not available
    metrics += formatPrometheusMetric(
      'mantisnxt_filesystem_error',
      1,
      { error: error instanceof Error ? error.message : 'Unknown error' },
      'Filesystem access errors',
      'gauge'
    );
  }

  return metrics;
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    // Collect all metrics
    const processMetrics = getProcessMetrics();
    const applicationMetrics = getApplicationMetrics();
    const systemMetrics = await getSystemMetrics();

    // Combine all metrics
    let allMetrics = '';
    allMetrics += '# MantisNXT Application Metrics\n';
    allMetrics += `# Generated at ${new Date().toISOString()}\n\n`;
    allMetrics += processMetrics;
    allMetrics += '\n';
    allMetrics += applicationMetrics;
    allMetrics += '\n';
    allMetrics += systemMetrics;

    return new NextResponse(allMetrics, {
      status: 200,
      headers: {
        'Content-Type': 'text/plain; version=0.0.4; charset=utf-8',
        'Cache-Control': 'no-cache, no-store, must-revalidate',
      },
    });

  } catch (error) {
    const errorMetric = formatPrometheusMetric(
      'mantisnxt_metrics_error',
      1,
      { error: error instanceof Error ? error.message : 'Unknown error' },
      'Metrics collection errors',
      'gauge'
    );

    return new NextResponse(errorMetric, {
      status: 500,
      headers: {
        'Content-Type': 'text/plain; version=0.0.4; charset=utf-8',
        'Cache-Control': 'no-cache, no-store, must-revalidate',
      },
    });
  }
}