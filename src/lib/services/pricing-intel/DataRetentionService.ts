import { query } from '@/lib/database';
import { PRICING_TABLES } from '@/lib/db/pricing-schema';

const POLICY_TABLE = PRICING_TABLES.MARKET_INTEL_DATA_POLICY;

export interface DataRetentionPolicy {
  org_id: string;
  retention_days_snapshots: number;
  retention_days_alerts: number;
  retention_days_jobs: number;
  archival_strategy: string;
  last_archive_run_at?: Date;
  updated_at: Date;
}

export class DataRetentionService {
  async getPolicy(orgId: string): Promise<DataRetentionPolicy | null> {
    const result = await query<DataRetentionPolicy>(
      `SELECT * FROM ${POLICY_TABLE} WHERE org_id = $1`,
      [orgId]
    );
    return result.rows[0] ?? null;
  }

  async updatePolicy(
    orgId: string,
    policy: Partial<DataRetentionPolicy>
  ): Promise<DataRetentionPolicy> {
    const existing = await this.getPolicy(orgId);

    if (!existing) {
      // Create new policy
      const result = await query<DataRetentionPolicy>(
        `
          INSERT INTO ${POLICY_TABLE} (
            org_id,
            retention_days_snapshots,
            retention_days_alerts,
            retention_days_jobs,
            archival_strategy
          ) VALUES (
            $1, $2, $3, $4, $5
          )
          RETURNING *
        `,
        [
          orgId,
          policy.retention_days_snapshots ?? 365,
          policy.retention_days_alerts ?? 180,
          policy.retention_days_jobs ?? 90,
          policy.archival_strategy ?? 'delete',
        ]
      );
      return result.rows[0];
    }

    // Update existing policy
    const result = await query<DataRetentionPolicy>(
      `
        UPDATE ${POLICY_TABLE}
        SET
          retention_days_snapshots = COALESCE($2, retention_days_snapshots),
          retention_days_alerts = COALESCE($3, retention_days_alerts),
          retention_days_jobs = COALESCE($4, retention_days_jobs),
          archival_strategy = COALESCE($5, archival_strategy),
          updated_at = NOW()
        WHERE org_id = $1
        RETURNING *
      `,
      [
        orgId,
        policy.retention_days_snapshots ?? null,
        policy.retention_days_alerts ?? null,
        policy.retention_days_jobs ?? null,
        policy.archival_strategy ?? null,
      ]
    );
    return result.rows[0];
  }

  async executeRetentionPolicy(orgId: string): Promise<{
    snapshotsDeleted: number;
    alertsDeleted: number;
    jobsArchived: number;
  }> {
    const policy = await this.getPolicy(orgId);
    if (!policy) {
      throw new Error('Data retention policy not configured');
    }

    const { PRICING_TABLES } = await import('@/lib/db/pricing-schema');

    // Delete old snapshots
    const snapshotsResult = await query<{ count: number }>(
      `
        WITH deleted AS (
          DELETE FROM ${PRICING_TABLES.MARKET_INTEL_SNAPSHOT}
          WHERE org_id = $1
            AND observed_at < NOW() - INTERVAL '1 day' * $2
          RETURNING snapshot_id
        )
        SELECT COUNT(*) as count FROM deleted
      `,
      [orgId, policy.retention_days_snapshots]
    );

    // Delete old alerts
    const alertsResult = await query<{ count: number }>(
      `
        WITH deleted AS (
          DELETE FROM ${PRICING_TABLES.MARKET_INTEL_ALERT}
          WHERE org_id = $1
            AND detected_at < NOW() - INTERVAL '1 day' * $2
          RETURNING alert_id
        )
        SELECT COUNT(*) as count FROM deleted
      `,
      [orgId, policy.retention_days_alerts]
    );

    // Archive old jobs
    const jobsResult = await query<{ count: number }>(
      `
        WITH archived AS (
          UPDATE ${PRICING_TABLES.MARKET_INTEL_SCRAPE_JOB}
          SET status = 'archived'
          WHERE org_id = $1
            AND created_at < NOW() - INTERVAL '1 day' * $2
            AND status != 'archived'
          RETURNING job_id
        )
        SELECT COUNT(*) as count FROM archived
      `,
      [orgId, policy.retention_days_jobs]
    );

    // Update last archive run timestamp
    await query(
      `
        UPDATE ${POLICY_TABLE}
        SET last_archive_run_at = NOW()
        WHERE org_id = $1
      `,
      [orgId]
    );

    return {
      snapshotsDeleted: snapshotsResult.rows[0]?.count || 0,
      alertsDeleted: alertsResult.rows[0]?.count || 0,
      jobsArchived: jobsResult.rows[0]?.count || 0,
    };
  }
}







