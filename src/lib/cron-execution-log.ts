/**
 * Shared helpers for core.cron_execution_log
 */
import { query } from '@/lib/database';

export type JsonFeedCronLastRun = {
  startedAt: string;
  completedAt: string | null;
  status: string;
  processedCount: number;
  errorMessage: string | null;
  details?: Record<string, unknown> | null;
} | null;

export type PlusPortalCronLastRun = {
  startedAt: string;
  completedAt: string | null;
  status: string;
  processedCount: number;
  errorMessage: string | null;
} | null;

export async function getLastCronRuns(): Promise<{
  jsonFeedCronLastRun: JsonFeedCronLastRun;
  plusPortalCronLastRun: PlusPortalCronLastRun;
}> {
  try {
    const [jsonRes, ppRes] = await Promise.all([
      query<{
        started_at: Date;
        completed_at: Date | null;
        status: string;
        processed_count: number;
        error_message: string | null;
        details: Record<string, unknown> | null;
      }>(
        `SELECT started_at, completed_at, status, processed_count, error_message, details
         FROM core.cron_execution_log
         WHERE cron_type = 'json-feed-sync'
         ORDER BY started_at DESC
         LIMIT 1`
      ),
      query<{
        started_at: Date;
        completed_at: Date | null;
        status: string;
        processed_count: number;
        error_message: string | null;
      }>(
        `SELECT started_at, completed_at, status, processed_count, error_message
         FROM core.cron_execution_log
         WHERE cron_type = 'plusportal-sync'
         ORDER BY started_at DESC
         LIMIT 1`
      ),
    ]);

    return {
      jsonFeedCronLastRun: jsonRes.rows[0]
        ? {
            startedAt: jsonRes.rows[0].started_at.toISOString(),
            completedAt: jsonRes.rows[0].completed_at?.toISOString() ?? null,
            status: jsonRes.rows[0].status,
            processedCount: jsonRes.rows[0].processed_count,
            errorMessage: jsonRes.rows[0].error_message,
            details: jsonRes.rows[0].details ?? null,
          }
        : null,
      plusPortalCronLastRun: ppRes.rows[0]
        ? {
            startedAt: ppRes.rows[0].started_at.toISOString(),
            completedAt: ppRes.rows[0].completed_at?.toISOString() ?? null,
            status: ppRes.rows[0].status,
            processedCount: ppRes.rows[0].processed_count,
            errorMessage: ppRes.rows[0].error_message,
          }
        : null,
    };
  } catch {
    return { jsonFeedCronLastRun: null, plusPortalCronLastRun: null };
  }
}
