import type { TaggingStatus } from '@/lib/cmm/ai-tagging/types';

export type ProposedTagStatus = 'pending' | 'approved' | 'rejected';
export type ProposedTagProductStatus = 'pending' | 'applied' | 'rejected';

export interface ProposedTagRecord {
  tag_proposal_id: string;
  org_id: string;
  normalized_name: string;
  display_name: string;
  tag_type: string;
  status: ProposedTagStatus;
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

export interface ProposedTagProductRecord {
  tag_proposal_product_id: string;
  tag_proposal_id: string;
  supplier_product_id: string;
  job_id: string | null;
  ai_confidence: number | null;
  ai_reasoning: string | null;
  ai_provider: string | null;
  status: ProposedTagProductStatus;
  created_at: string;
  updated_at: string;
  resolved_at: string | null;
}

export interface ProposedTagUpsertParams {
  orgId?: string | null;
  displayName: string;
  normalizedName?: string;
  tagType?: string | null;
  confidence?: number | null;
  provider?: string | null;
  jobId?: string | null;
}

export interface ProposedTagProductLinkParams {
  tagProposalId: string;
  supplierProductId: string;
  jobId?: string | null;
  confidence?: number | null;
  reasoning?: string | null;
  provider?: string | null;
}

export interface RecordTagProposalResult {
  proposedTag: ProposedTagRecord;
  productLink: ProposedTagProductRecord;
  nextStatus: TaggingStatus;
}





