import { query } from '@/lib/database/unified-connection';
import type {
  ProposedTagProductLinkParams,
  ProposedTagProductRecord,
  ProposedTagRecord,
  ProposedTagUpsertParams,
} from './types';

const DEFAULT_ORG_ID = '00000000-0000-0000-0000-000000000000';

function normalizeName(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .replace(/[^\w\s-]/g, '')
    .replace(/\s/g, '-');
}

export async function upsertProposedTag(
  params: ProposedTagUpsertParams
): Promise<ProposedTagRecord> {
  const orgId = params.orgId || DEFAULT_ORG_ID;
  const displayName = params.displayName.trim();
  const normalized = params.normalizedName ?? normalizeName(displayName);

  const result = await query<ProposedTagRecord>(
    `
      WITH upsert AS (
        INSERT INTO core.ai_tag_proposal (
          org_id,
          normalized_name,
          display_name,
          tag_type,
          last_confidence,
          last_provider,
          first_seen_job_id,
          last_seen_job_id
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $7)
        ON CONFLICT (org_id, normalized_name)
        DO UPDATE SET
          display_name = EXCLUDED.display_name,
          tag_type = COALESCE(EXCLUDED.tag_type, core.ai_tag_proposal.tag_type),
          suggestion_count = core.ai_tag_proposal.suggestion_count + 1,
          last_confidence = EXCLUDED.last_confidence,
          last_provider = EXCLUDED.last_provider,
          last_seen_job_id = EXCLUDED.last_seen_job_id,
          status = CASE
            WHEN core.ai_tag_proposal.status = 'rejected' THEN 'pending'
            ELSE core.ai_tag_proposal.status
          END,
          status_reason = NULL,
          resolved_at = NULL,
          updated_at = NOW()
        RETURNING 
          tag_proposal_id,
          org_id,
          normalized_name,
          display_name,
          tag_type,
          status,
          status_reason,
          suggestion_count,
          last_confidence,
          last_provider,
          first_seen_job_id,
          last_seen_job_id,
          created_at,
          updated_at,
          resolved_at
      )
      SELECT 
        tag_proposal_id,
        org_id,
        normalized_name,
        display_name,
        tag_type,
        status,
        status_reason,
        suggestion_count,
        last_confidence,
        last_provider,
        first_seen_job_id,
        last_seen_job_id,
        created_at,
        updated_at,
        resolved_at
      FROM upsert
    `,
    [
      orgId,
      normalized,
      displayName,
      params.tagType ?? 'custom',
      params.confidence ?? null,
      params.provider ?? null,
      params.jobId ?? null,
    ]
  );

  if (!result.rows || result.rows.length === 0) {
    const error = new Error(
      `Failed to upsert proposed tag: no rows returned for normalized_name="${normalized}", org_id="${orgId}"`
    );
    console.error('[upsertProposedTag]', error.message);
    throw error;
  }

  const record = result.rows[0];
  if (!record.tag_proposal_id) {
    const error = new Error(
      `Failed to upsert proposed tag: tag_proposal_id is missing in result. Record: ${JSON.stringify(record)}`
    );
    console.error('[upsertProposedTag]', error.message);
    throw error;
  }

  return record;
}

export async function linkProposedTagToProduct(
  params: ProposedTagProductLinkParams
): Promise<ProposedTagProductRecord> {
  const result = await query<ProposedTagProductRecord>(
    `
      INSERT INTO core.ai_tag_proposal_product (
        tag_proposal_id,
        supplier_product_id,
        job_id,
        ai_confidence,
        ai_reasoning,
        ai_provider
      )
      VALUES ($1, $2, $3, $4, $5, $6)
      ON CONFLICT (supplier_product_id, tag_proposal_id)
      DO UPDATE SET
        ai_confidence = EXCLUDED.ai_confidence,
        ai_reasoning = EXCLUDED.ai_reasoning,
        ai_provider = EXCLUDED.ai_provider,
        status = 'pending',
        resolved_at = NULL,
        updated_at = NOW()
      RETURNING *
    `,
    [
      params.tagProposalId,
      params.supplierProductId,
      params.jobId ?? null,
      params.confidence ?? null,
      params.reasoning ?? null,
      params.provider ?? null,
    ]
  );

  return result.rows[0];
}

export function normalizeTagLabel(label: string): string {
  return normalizeName(label);
}
