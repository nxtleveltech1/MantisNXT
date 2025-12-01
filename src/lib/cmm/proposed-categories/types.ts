import type { CategorizationStatus } from '@/lib/cmm/ai-categorization/types';

export type ProposedCategoryStatus = 'pending' | 'approved' | 'rejected';
export type ProposedCategoryProductStatus = 'pending' | 'applied' | 'rejected';

export interface ProposedCategoryRecord {
  proposed_category_id: string;
  org_id: string;
  normalized_name: string;
  display_name: string;
  suggested_parent_id: string | null;
  status: ProposedCategoryStatus;
  status_reason: string | null;
  suggestion_count: number;
  last_confidence: number | null;
  last_provider: string | null;
  first_seen_job_id: string | null;
  last_seen_job_id: string | null;
  created_at: string;
  updated_at: string;
  resolved_at: string | null;
}

export interface ProposedCategoryProductRecord {
  proposed_category_product_id: string;
  proposed_category_id: string;
  supplier_product_id: string;
  job_id: string | null;
  ai_confidence: number | null;
  ai_reasoning: string | null;
  ai_provider: string | null;
  status: ProposedCategoryProductStatus;
  created_at: string;
  updated_at: string;
  resolved_at: string | null;
}

export interface ProposedCategoryUpsertParams {
  orgId?: string | null;
  displayName: string;
  normalizedName?: string;
  suggestedParentId?: string | null;
  confidence?: number | null;
  provider?: string | null;
  jobId?: string | null;
}

export interface ProposedCategoryProductLinkParams {
  proposedCategoryId: string;
  supplierProductId: string;
  jobId?: string | null;
  confidence?: number | null;
  reasoning?: string | null;
  provider?: string | null;
}

export interface RecordProposalResult {
  proposedCategory: ProposedCategoryRecord;
  productLink: ProposedCategoryProductRecord;
  nextStatus: CategorizationStatus;
}
