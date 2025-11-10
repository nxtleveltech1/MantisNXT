/**
 * AI Categorization System Types
 * Comprehensive type definitions for job management and categorization tracking
 */

import { EnrichedProduct } from '../sip-product-enrichment';

// ==================== Job Types ====================

export type JobType = 'full_scan' | 'partial' | 'recategorize' | 'import_triggered';

export type JobStatus = 'queued' | 'running' | 'paused' | 'completed' | 'failed' | 'cancelled';

export type CategorizationStatus =
  | 'pending'
  | 'processing'
  | 'completed'
  | 'failed'
  | 'skipped'
  | 'pending_review';

export interface JobFilters {
  supplier_id?: string;
  category_id?: string;
  status?: CategorizationStatus[];
  confidence_min?: number;
  confidence_max?: number;
  exclude_categorized?: boolean;
}

export interface JobConfig {
  confidence_threshold?: number;
  force_recategorize?: boolean;
  auto_assign?: boolean;
  batch_delay_ms?: number;
  timeout_ms?: number;
  max_retries?: number;
  provider_batch_size?: number;
  provider_timeout_ms?: number;
  overall_timeout_ms?: number;
  max_batches?: number;
  org_id?: string;
  orgId?: string;
}

export interface JobParams {
  job_type: JobType;
  filters?: JobFilters;
  config?: JobConfig;
  batch_size?: number;
  created_by?: string;
}

export interface Job {
  job_id: string;
  job_type: JobType;
  status: JobStatus;
  total_products: number;
  processed_products: number;
  successful_categorizations: number;
  failed_categorizations: number;
  skipped_products: number;
  current_batch_offset: number;
  batch_size: number;
  filters: JobFilters;
  config: JobConfig;
  created_by: string;
  created_at: Date;
  started_at: Date | null;
  completed_at: Date | null;
  paused_at: Date | null;
  cancelled_at: Date | null;
  last_activity_at: Date | null;
  error_message: string | null;
  error_count: number;
  total_duration_ms: number | null;
  avg_batch_duration_ms: number | null;
  total_tokens_used: number;
}

export interface JobStatus_Detail {
  job: Job;
  progress_percentage: number;
  eta_seconds: number | null;
  current_batch_number: number;
  batches_completed: number;
  batches_remaining: number;
  recent_errors: string[];
  performance_metrics: {
    avg_products_per_second: number;
    avg_tokens_per_product: number;
    success_rate: number;
  };
}

// ==================== Progress Types ====================

export interface BatchProgress {
  progress_id: string;
  job_id: string;
  batch_number: number;
  batch_offset: number;
  batch_size: number;
  products_in_batch: number;
  successful_count: number;
  failed_count: number;
  skipped_count: number;
  duration_ms: number | null;
  tokens_used: number | null;
  provider_used: string | null;
  started_at: Date;
  completed_at: Date | null;
  error_message: string | null;
}

export interface ProgressMetrics {
  job_id: string;
  total_products: number;
  processed_products: number;
  successful_categorizations: number;
  failed_categorizations: number;
  skipped_products: number;
  progress_percentage: number;
  current_batch: number;
  total_batches: number;
  eta_seconds: number | null;
  avg_batch_duration_ms: number | null;
}

// ==================== Categorization Result Types ====================

export interface CategorySuggestion {
  supplier_product_id: string;
  category_id: string | null;
  category_name: string | null;
  confidence: number;
  reasoning: string | null;
  provider: string | null;
  alternatives?: Array<{
    category_id: string;
    category_name: string;
    confidence: number;
  }>;
}

export interface CategorizationResult {
  supplier_product_id: string;
  success: boolean;
  category_id: string | null;
  confidence: number | null;
  status: CategorizationStatus;
  error_message: string | null;
  provider: string | null;
  reasoning: string | null;
  skipped_reason?: 'already_categorized' | 'low_confidence' | 'no_suggestion' | 'error';
  proposed_category_id?: string | null;
  proposed_category_name?: string | null;
}

export interface BatchResult {
  batch_number: number;
  products_processed: number;
  successful: number;
  failed: number;
  skipped: number;
  pending_review: number;
  duration_ms: number;
  tokens_used: number;
  results: CategorizationResult[];
  errors: Array<{
    product_id: string;
    error: string;
  }>;
}

// ==================== Product Types (Extended) ====================

export interface EnrichedProductWithStatus extends EnrichedProduct {
  ai_categorization_status: CategorizationStatus;
  ai_confidence: number | null;
  ai_reasoning: string | null;
  ai_provider: string | null;
  ai_categorized_at: Date | null;
  previous_confidence: number | null;
  proposed_category_id?: string | null;
  proposed_category_name?: string | null;
  proposed_category_status?: string | null;
}

// ==================== API Request/Response Types ====================

export interface StartJobRequest {
  job_type?: JobType;
  filters?: JobFilters;
  config?: JobConfig;
  batch_size?: number;
}

export interface StartJobResponse {
  success: boolean;
  job_id: string;
  estimated_products: number;
  message?: string;
}

export interface JobStatusResponse {
  success: boolean;
  job: JobStatus_Detail;
}

export interface CancelJobResponse {
  success: boolean;
  cancelled: boolean;
  products_processed: number;
  message?: string;
}

export interface ProductsQueryParams {
  status?: CategorizationStatus;
  supplier_id?: string;
  confidence_min?: number;
  confidence_max?: number;
  search?: string;
  limit?: number;
  offset?: number;
  sort_by?: 'name' | 'confidence' | 'categorized_at' | 'supplier';
  sort_order?: 'asc' | 'desc';
}

export interface ProductsQueryResponse {
  success: boolean;
  products: EnrichedProductWithStatus[];
  total: number;
  limit: number;
  offset: number;
}

export interface RecategorizeRequest {
  product_ids: string[];
  force_override?: boolean;
  confidence_threshold?: number;
}

export interface RecategorizeResponse {
  success: boolean;
  job_id: string;
  products_queued: number;
  message?: string;
}

// ==================== Statistics Types ====================

export interface CategorizationStats {
  total_products: number;
  categorized_count: number;
  categorized_percentage: number;
  pending_count: number;
  pending_review_count?: number;
  failed_count: number;
  avg_confidence: number | null;
  confidence_distribution: {
    high: number; // >= 0.8
    medium: number; // 0.6 - 0.8
    low: number; // < 0.6
  };
  by_status: Record<CategorizationStatus, number>;
  by_provider: Record<string, number>;
  last_run_at: Date | null;
  active_jobs_count: number;
}

export interface TimelineDataPoint {
  date: string;
  categorized: number;
  failed: number;
}

export interface ProviderPerformance {
  provider: string;
  total_categorizations: number;
  success_rate: number;
  avg_confidence: number;
  avg_duration_ms: number;
}

// ==================== Error Types ====================

export interface CategorizationError {
  code: 'NETWORK_ERROR' | 'API_ERROR' | 'DATABASE_ERROR' | 'VALIDATION_ERROR' | 'RATE_LIMIT' | 'TIMEOUT' | 'UNKNOWN';
  message: string;
  product_id?: string;
  details?: any;
  retryable: boolean;
}

// ==================== Configuration Types ====================

export interface JobManagerConfig {
  default_batch_size: number;
  max_batch_size: number;
  default_confidence_threshold: number;
  max_concurrent_jobs: number;
  batch_delay_ms: number;
  max_retries: number;
  retry_delay_ms: number;
  timeout_ms: number;
}

export const DEFAULT_JOB_CONFIG: JobManagerConfig = {
  default_batch_size: 200,
  max_batch_size: 500,
  default_confidence_threshold: 0.7,
  max_concurrent_jobs: 3,
  batch_delay_ms: 2000,
  max_retries: 2,
  retry_delay_ms: 5000,
  timeout_ms: 45000,
};

