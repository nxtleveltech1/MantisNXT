// @ts-nocheck

import { query } from '@/lib/database/unified-connection';
import type {
  ProposedCategoryUpsertParams,
  RecordProposalResult,
} from './types';
import {
  linkProposedCategoryToProduct,
  normalizeCategoryLabel,
  upsertProposedCategory,
} from './repository';

export interface RecordProposalParams {
  supplierProductId: string;
  proposedName: string;
  confidence?: number | null;
  reasoning?: string | null;
  provider?: string | null;
  jobId?: string | null;
  orgId?: string | null;
}

export interface ApproveProposalParams {
  proposedCategoryId: string;
  parentCategoryId?: string | null;
  approvedBy?: string | null;
}

export interface RejectProposalParams {
  proposedCategoryId: string;
  reason?: string | null;
  rejectedBy?: string | null;
}

export async function recordProposedCategoryForProduct(
  params: RecordProposalParams
): Promise<RecordProposalResult> {
  const { supplierProductId, proposedName } = params;
  const trimmedName = proposedName.trim();
  if (!trimmedName) {
    throw new Error('Proposed category name cannot be empty');
  }

  const upsertParams: ProposedCategoryUpsertParams = {
    displayName: trimmedName,
    normalizedName: normalizeCategoryLabel(trimmedName),
    confidence: params.confidence ?? null,
    provider: params.provider ?? null,
    jobId: params.jobId ?? null,
    orgId: params.orgId ?? null,
  };

  const proposedCategory = await upsertProposedCategory(upsertParams);
  const productLink = await linkProposedCategoryToProduct({
    proposedCategoryId: proposedCategory.proposed_category_id,
    supplierProductId,
    jobId: params.jobId ?? null,
    confidence: params.confidence ?? null,
    reasoning: params.reasoning ?? null,
    provider: params.provider ?? null,
  });

  await query(
    `
      UPDATE core.supplier_product
      SET
        ai_categorization_status = 'pending_review',
        ai_confidence = $2,
        ai_reasoning = $3,
        ai_provider = $4,
        ai_categorized_at = NULL,
        updated_at = NOW()
      WHERE supplier_product_id = $1
    `,
    [supplierProductId, params.confidence ?? null, params.reasoning ?? null, params.provider ?? null]
  );

  return {
    proposedCategory,
    productLink,
    nextStatus: 'pending_review',
  };
}

export async function listProposedCategories(status: 'pending' | 'approved' | 'rejected' = 'pending') {
  const result = await query(
    `
      SELECT 
        pc.proposed_category_id,
        pc.display_name,
        pc.normalized_name,
        pc.status,
        pc.status_reason,
        pc.suggestion_count,
        pc.last_confidence,
        pc.last_provider,
        pc.created_at,
        pc.updated_at,
        pc.resolved_at,
        pc.suggested_parent_id,
        ARRAY(
          SELECT jsonb_build_object(
            'supplier_product_id', pcp.supplier_product_id,
            'confidence', pcp.ai_confidence,
            'reasoning', pcp.ai_reasoning,
            'provider', pcp.ai_provider,
            'status', pcp.status,
            'updated_at', pcp.updated_at
          )
          FROM core.ai_proposed_category_product pcp
          WHERE pcp.proposed_category_id = pc.proposed_category_id
        ) AS linked_products
      FROM core.ai_proposed_category pc
      WHERE pc.status = $1
      ORDER BY pc.updated_at DESC
    `,
    [status]
  );

  return result.rows;
}

async function createCategoryFromProposal(
  proposedCategoryId: string,
  name: string,
  parentCategoryId?: string | null
) {
  const existing = await query<{ category_id: string }>(
    `SELECT category_id FROM core.category WHERE LOWER(name) = LOWER($1) LIMIT 1`,
    [name]
  );
  if (existing.rows.length > 0) {
    return existing.rows[0].category_id;
  }

  const slug = normalizeCategoryLabel(name);
  let level = 1;
  let path = `/${slug}`;

  if (parentCategoryId) {
    const parentResult = await query<{
      category_id: string;
      level: number;
      path: string;
    }>(
      `SELECT category_id, level, path FROM core.category WHERE category_id = $1`,
      [parentCategoryId]
    );
    if (parentResult.rows.length > 0) {
      const parent = parentResult.rows[0];
      level = parent.level + 1;
      path = `${parent.path}/${slug}`;
    }
  }

  const insert = await query<{ category_id: string }>(
    `
      INSERT INTO core.category (
        name,
        parent_id,
        level,
        path,
        is_active,
        created_at,
        updated_at
      )
      VALUES ($1, $2, $3, $4, TRUE, NOW(), NOW())
      RETURNING category_id
    `,
    [name, parentCategoryId ?? null, level, path]
  );

  return insert.rows[0].category_id;
}

export async function approveProposedCategory(
  params: ApproveProposalParams
): Promise<{ category_id: string; affected_products: number }> {
  const { proposedCategoryId, parentCategoryId } = params;

  const proposalResult = await query<{
    proposed_category_id: string;
    display_name: string;
    status: string;
  }>(
    `SELECT proposed_category_id, display_name, status FROM core.ai_proposed_category WHERE proposed_category_id = $1`,
    [proposedCategoryId]
  );

  if (proposalResult.rows.length === 0) {
    throw new Error('Proposed category not found');
  }

  const proposal = proposalResult.rows[0];

  if (proposal.status === 'approved') {
    const existingLink = await query<{ category_id: string }>(
      `SELECT category_id FROM core.category WHERE LOWER(name) = LOWER($1) LIMIT 1`,
      [proposal.display_name]
    );
    return {
      category_id: existingLink.rows[0]?.category_id || '',
      affected_products: 0,
    };
  }

  const categoryId = await createCategoryFromProposal(
    proposedCategoryId,
    proposal.display_name,
    parentCategoryId ?? null
  );

  const updateProposal = query(
    `
      UPDATE core.ai_proposed_category
      SET 
        suggested_parent_id = $2,
        status = 'approved',
        status_reason = NULL,
        resolved_at = NOW(),
        updated_at = NOW()
      WHERE proposed_category_id = $1
    `,
    [proposedCategoryId, parentCategoryId ?? null]
  );

  const applyProducts = query(
    `
      UPDATE core.supplier_product sp
      SET 
        previous_confidence = sp.ai_confidence,
        category_id = $2,
        ai_confidence = pcp.ai_confidence,
        ai_provider = pcp.ai_provider,
        ai_reasoning = pcp.ai_reasoning,
        ai_categorization_status = 'completed',
        ai_categorized_at = NOW(),
        updated_at = NOW()
      FROM core.ai_proposed_category_product pcp
      WHERE pcp.proposed_category_id = $1
        AND sp.supplier_product_id = pcp.supplier_product_id
    `,
    [proposedCategoryId, categoryId]
  );

  const updateLinks = query(
    `
      UPDATE core.ai_proposed_category_product
      SET status = 'applied',
          resolved_at = NOW(),
          updated_at = NOW()
      WHERE proposed_category_id = $1
    `,
    [proposedCategoryId]
  );

  const results = await Promise.all([updateProposal, applyProducts, updateLinks]);
  const affectedProducts = results[1].rowCount ?? 0;

  return { category_id: categoryId, affected_products: affectedProducts };
}

export async function rejectProposedCategory(
  params: RejectProposalParams
): Promise<{ affected_products: number }> {
  const { proposedCategoryId, reason } = params;

  await query(
    `
      UPDATE core.ai_proposed_category
      SET status = 'rejected',
          status_reason = $2,
          resolved_at = NOW(),
          updated_at = NOW()
      WHERE proposed_category_id = $1
    `,
    [proposedCategoryId, reason ?? null]
  );

  const resetProducts = await query(
    `
      UPDATE core.supplier_product sp
      SET 
        ai_categorization_status = 'pending',
        ai_confidence = NULL,
        ai_provider = NULL,
        ai_reasoning = NULL,
        ai_categorized_at = NULL,
        updated_at = NOW()
      FROM core.ai_proposed_category_product pcp
      WHERE pcp.proposed_category_id = $1
        AND sp.supplier_product_id = pcp.supplier_product_id
    `,
    [proposedCategoryId]
  );

  await query(
    `
      UPDATE core.ai_proposed_category_product
      SET status = 'rejected',
          resolved_at = NOW(),
          updated_at = NOW()
      WHERE proposed_category_id = $1
    `,
    [proposedCategoryId]
  );

  return { affected_products: resetProducts.rowCount ?? 0 };
}

