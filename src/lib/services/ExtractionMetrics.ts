import { query } from '@/lib/database';

/**
 * Production metrics for extraction pipeline
 */
export class ExtractionMetrics {
  async recordJobCompletion(
    job_id: string,
    status: 'completed' | 'failed' | 'cancelled',
    duration_ms: number,
    rows_processed: number,
    error?: { code: string; message: string }
  ): Promise<void> {
    await query(
      `INSERT INTO spp.extraction_metrics (
        job_id, status, duration_ms, rows_processed, error_code, error_message, created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, NOW())`,
      [job_id, status, duration_ms, rows_processed, error?.code || null, error?.message || null]
    );
  }

  async getDashboardMetrics(): Promise<{
    jobs_last_hour: number;
    jobs_last_24h: number;
    success_rate_24h: number;
    avg_duration_ms: number;
    rows_processed_24h: number;
    top_errors: Array<{ code: string; count: number }>;
  }> {
    const results = await Promise.all([
      query(`
        SELECT COUNT(*) as count
        FROM spp.extraction_metrics
        WHERE created_at > NOW() - INTERVAL '1 hour'
      `),
      query(`
        SELECT COUNT(*) as count
        FROM spp.extraction_metrics
        WHERE created_at > NOW() - INTERVAL '24 hours'
      `),
      query(`
        SELECT 
          ROUND(100.0 * SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) / COUNT(*), 2) as rate
        FROM spp.extraction_metrics
        WHERE created_at > NOW() - INTERVAL '24 hours'
      `),
      query(`
        SELECT AVG(duration_ms) as avg
        FROM spp.extraction_metrics
        WHERE status = 'completed'
        AND created_at > NOW() - INTERVAL '24 hours'
      `),
      query(`
        SELECT SUM(rows_processed) as total
        FROM spp.extraction_metrics
        WHERE created_at > NOW() - INTERVAL '24 hours'
      `),
      query(`
        SELECT error_code as code, COUNT(*) as count
        FROM spp.extraction_metrics
        WHERE status = 'failed'
        AND created_at > NOW() - INTERVAL '24 hours'
        AND error_code IS NOT NULL
        GROUP BY error_code
        ORDER BY count DESC
        LIMIT 5
      `),
    ]);

    return {
      jobs_last_hour: parseInt(results[0].rows[0]?.count || '0'),
      jobs_last_24h: parseInt(results[1].rows[0]?.count || '0'),
      success_rate_24h: parseFloat(results[2].rows[0]?.rate || '0'),
      avg_duration_ms: Math.round(parseFloat(results[3].rows[0]?.avg || '0')),
      rows_processed_24h: parseInt(results[4].rows[0]?.total || '0'),
      top_errors: results[5].rows.map(row => ({
        code: row.code,
        count: parseInt(row.count),
      })),
    };
  }
}

export const extractionMetrics = new ExtractionMetrics();
