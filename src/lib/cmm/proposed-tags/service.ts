// @ts-nocheck

import { query } from '@/lib/database/unified-connection';
import { assignCoreTag } from '@/lib/cmm/tag-service-core';
import type { TaggingStatus } from '@/lib/cmm/ai-tagging/types';
import type {
  ProposedTagProductLinkParams,
  ProposedTagRecord,
  RecordTagProposalResult,
} from './types';
import {
  linkProposedTagToProduct,
  normalizeTagLabel,
  upsertProposedTag,
} from './repository';

export interface RecordTagProposalParams {
  supplierProductId: string;
  proposedName: string;
  tagType?: string | null;
  confidence?: number | null;
  reasoning?: string | null;
  provider?: string | null;
  jobId?: string | null;
  orgId?: string | null;
}

export interface ApproveTagProposalParams {
  tagProposalId: string;
  approvedBy?: string | null;
}

export interface RejectTagProposalParams {
  tagProposalId: string;
  reason?: string | null;
  rejectedBy?: string | null;
}

export async function recordProposedTagForProduct(
  params: RecordTagProposalParams
): Promise<RecordTagProposalResult> {
  const trimmedName = params.proposedName.trim();
  if (!trimmedName) {
    throw new Error('Proposed tag name cannot be empty');
  }

  const proposedTag = await upsertProposedTag({
    displayName: trimmedName,
    normalizedName: normalizeTagLabel(trimmedName),
    tagType: params.tagType ?? 'custom',
    confidence: params.confidence ?? null,
    provider: params.provider ?? null,
    jobId: params.jobId ?? null,
    orgId: params.orgId ?? null,
  });

  // Defensive check: ensure tag_proposal_id exists before linking
  if (!proposedTag || !proposedTag.tag_proposal_id) {
    const error = new Error(
      `Cannot link tag proposal to product: tag_proposal_id is missing. ` +
        `ProposedTag: ${JSON.stringify(proposedTag)}, ` +
        `ProductId: ${params.supplierProductId}, ` +
        `TagName: ${trimmedName}`
    );
    console.error('[recordProposedTagForProduct]', error.message);
    throw error;
  }

  const productLink = await linkProposedTagToProduct({
    tagProposalId: proposedTag.tag_proposal_id,
    supplierProductId: params.supplierProductId,
    jobId: params.jobId ?? null,
    confidence: params.confidence ?? null,
    reasoning: params.reasoning ?? null,
    provider: params.provider ?? null,
  } satisfies ProposedTagProductLinkParams);

  await query(
    `
      UPDATE core.supplier_product
      SET
        ai_tagging_status = 'pending_review',
        ai_tag_confidence = $2,
        ai_tag_reasoning = $3,
        ai_tag_provider = $4,
        ai_tagged_at = NULL,
        updated_at = NOW()
      WHERE supplier_product_id = $1
    `,
    [params.supplierProductId, params.confidence ?? null, params.reasoning ?? null, params.provider ?? null]
  );

  return {
    proposedTag,
    productLink,
    nextStatus: 'pending_review' as TaggingStatus,
  };
}

export async function listProposedTags(status: 'pending' | 'approved' | 'rejected' = 'pending') {
  const result = await query(
    `
      SELECT 
        pt.tag_proposal_id,
        pt.display_name,
        pt.normalized_name,
        pt.tag_type,
        pt.status,
        pt.status_reason,
        pt.suggestion_count,
        pt.last_confidence,
        pt.last_provider,
        pt.created_at,
        pt.updated_at,
        pt.resolved_at,
        ARRAY(
          SELECT jsonb_build_object(
            'supplier_product_id', ptp.supplier_product_id,
            'confidence', ptp.ai_confidence,
            'reasoning', ptp.ai_reasoning,
            'provider', ptp.ai_provider,
            'status', ptp.status,
            'updated_at', ptp.updated_at
          )
          FROM core.ai_tag_proposal_product ptp
          WHERE ptp.tag_proposal_id = pt.tag_proposal_id
        ) AS linked_products
      FROM core.ai_tag_proposal pt
      WHERE pt.status = $1
      ORDER BY pt.updated_at DESC
    `,
    [status]
  );

  return result.rows;
}

async function ensureTagLibraryEntry(name: string, tagType?: string | null) {
  const slug = normalizeTagLabel(name);
  const tagId = slug.startsWith('tag-') ? slug : `tag-${slug}`;

  await query(
    `
      INSERT INTO core.ai_tag_library (tag_id, name, type)
      VALUES ($1, $2, COALESCE($3, 'custom'))
      ON CONFLICT (tag_id) DO UPDATE
      SET name = EXCLUDED.name,
          type = EXCLUDED.type
    `,
    [tagId, name, tagType ?? 'custom']
  );

  return tagId;
}

export async function approveProposedTag(
  params: ApproveTagProposalParams
): Promise<{ tag_id: string; affected_products: number }> {
  const proposalResult = await query<{
    tag_proposal_id: string;
    display_name: string;
    tag_type: string;
    status: string;
  }>(
    `SELECT tag_proposal_id, display_name, tag_type, status FROM core.ai_tag_proposal WHERE tag_proposal_id = $1`,
    [params.tagProposalId]
  );

  if (proposalResult.rows.length === 0) {
    throw new Error('Proposed tag not found');
  }

  const proposal = proposalResult.rows[0];
  const tagId = await ensureTagLibraryEntry(proposal.display_name, proposal.tag_type);

  const linkedProducts = await query<{
    supplier_product_id: string;
    ai_confidence: number | null;
    ai_provider: string | null;
    ai_reasoning: string | null;
  }>(
    `
      SELECT supplier_product_id, ai_confidence, ai_provider, ai_reasoning
      FROM core.ai_tag_proposal_product
      WHERE tag_proposal_id = $1
    `,
    [params.tagProposalId]
  );

  for (const row of linkedProducts.rows) {
    await assignCoreTag(row.supplier_product_id, tagId, {
      assignedBy: params.approvedBy ?? 'ai_proposal',
    });

    await query(
      `
        UPDATE core.supplier_product
        SET
          ai_tagging_status = 'completed',
          ai_tag_confidence = COALESCE($2, ai_tag_confidence),
          ai_tag_provider = COALESCE($3, ai_tag_provider),
          ai_tag_reasoning = COALESCE($4, ai_tag_reasoning),
          ai_tagged_at = NOW(),
          updated_at = NOW()
        WHERE supplier_product_id = $1
      `,
      [row.supplier_product_id, row.ai_confidence, row.ai_provider, row.ai_reasoning]
    );
  }

  await query(
    `
      UPDATE core.ai_tag_proposal
      SET
        status = 'approved',
        status_reason = NULL,
        resolved_at = NOW(),
        updated_at = NOW()
      WHERE tag_proposal_id = $1
    `,
    [params.tagProposalId]
  );

  await query(
    `
      UPDATE core.ai_tag_proposal_product
      SET status = 'applied',
          resolved_at = NOW(),
          updated_at = NOW()
      WHERE tag_proposal_id = $1
    `,
    [params.tagProposalId]
  );

  return {
    tag_id: tagId,
    affected_products: linkedProducts.rowCount ?? 0,
  };
}

export async function rejectProposedTag(
  params: RejectTagProposalParams
): Promise<{ affected_products: number }> {
  await query(
    `
      UPDATE core.ai_tag_proposal
      SET status = 'rejected',
          status_reason = $2,
          resolved_at = NOW(),
          updated_at = NOW()
      WHERE tag_proposal_id = $1
    `,
    [params.tagProposalId, params.reason ?? null]
  );

  const resetProducts = await query(
    `
      UPDATE core.supplier_product sp
      SET
        ai_tagging_status = 'pending',
        ai_tag_confidence = NULL,
        ai_tag_provider = NULL,
        ai_tag_reasoning = NULL,
        ai_tagged_at = NULL,
        updated_at = NOW()
      FROM core.ai_tag_proposal_product ptp
      WHERE ptp.tag_proposal_id = $1
        AND sp.supplier_product_id = ptp.supplier_product_id
    `,
    [params.tagProposalId]
  );

  await query(
    `
      UPDATE core.ai_tag_proposal_product
      SET status = 'rejected',
          resolved_at = NOW(),
          updated_at = NOW()
      WHERE tag_proposal_id = $1
    `,
    [params.tagProposalId]
  );

  return { affected_products: resetProducts.rowCount ?? 0 };
}






