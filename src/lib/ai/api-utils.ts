/**
 * AI API Utilities
 * Shared utilities for AI service API endpoints
 */

import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import {
  AIServiceError,
  RateLimitError,
  ProviderError,
  ConfigurationError,
  AlertError,
  WidgetError,
  MetricsError,
} from './errors';

/**
 * Handle AI-specific errors with proper status codes and formatting
 */
export function handleAIError(error: unknown): NextResponse {
  console.error('AI API Error:', error);

  // Zod validation errors
  if (error instanceof z.ZodError) {
    return NextResponse.json(
      {
        success: false,
        error: 'Validation failed',
        details: error.errors,
      },
      { status: 400 }
    );
  }

  // AI service errors
  if (error instanceof AIServiceError) {
    return NextResponse.json(
      {
        success: false,
        error: error.message,
        code: error.code,
        serviceType: error.serviceType,
      },
      { status: error.statusCode }
    );
  }

  // Rate limit errors
  if (error instanceof RateLimitError) {
    return NextResponse.json(
      {
        success: false,
        error: 'Rate limit exceeded',
        retryAfter: error.retryAfter,
      },
      {
        status: 429,
        headers: {
          'Retry-After': error.retryAfter.toString(),
        },
      }
    );
  }

  // Provider errors
  if (error instanceof ProviderError) {
    return NextResponse.json(
      {
        success: false,
        error: 'AI provider error',
        provider: error.provider,
        details: error.details,
      },
      { status: 503 }
    );
  }

  // Generic errors
  if (error instanceof Error) {
    return NextResponse.json(
      {
        success: false,
        error: error.message,
      },
      { status: 500 }
    );
  }

  // Unknown errors
  return NextResponse.json(
    {
      success: false,
      error: 'AI service error',
    },
    { status: 500 }
  );
}

/**
 * Extract pagination parameters from URL search params
 */
export function extractPagination(searchParams: URLSearchParams) {
  const page = parseInt(searchParams.get('page') || '1', 10);
  const limit = parseInt(searchParams.get('limit') || '50', 10);
  const offset = (page - 1) * limit;

  return {
    page,
    limit,
    offset,
  };
}

/**
 * Extract date range filters from URL search params
 */
export function extractDateRange(searchParams: URLSearchParams) {
  const startDate = searchParams.get('startDate');
  const endDate = searchParams.get('endDate');

  return {
    startDate: startDate ? new Date(startDate) : undefined,
    endDate: endDate ? new Date(endDate) : undefined,
  };
}

/**
 * Extract entity filters from URL search params
 */
export function extractEntityFilters(searchParams: URLSearchParams) {
  return {
    entityType: searchParams.get('entityType') as 'product' | 'supplier' | 'category' | null,
    entityId: searchParams.get('entityId') || undefined,
  };
}

/**
 * Create success response with metadata
 */
export function successResponse<T>(
  data: T,
  metadata?: {
    page?: number;
    limit?: number;
    total?: number;
    hasMore?: boolean;
  }
): NextResponse {
  return NextResponse.json({
    success: true,
    data,
    ...(metadata && { metadata }),
  });
}

/**
 * Create created response (201)
 */
export function createdResponse<T>(data: T): NextResponse {
  return NextResponse.json(
    {
      success: true,
      data,
    },
    { status: 201 }
  );
}

/**
 * Create no content response (204)
 */
export function noContentResponse(): NextResponse {
  return new NextResponse(null, { status: 204 });
}

/**
 * Validate required query parameters
 */
export function requireQueryParams(searchParams: URLSearchParams, params: string[]): void {
  const missing = params.filter(param => !searchParams.has(param));
  if (missing.length > 0) {
    throw new Error(`Missing required parameters: ${missing.join(', ')}`);
  }
}

/**
 * Extract AI service type from path or params
 */
export function extractServiceType(
  params: unknown
):
  | 'demand_forecasting'
  | 'anomaly_detection'
  | 'supplier_scoring'
  | 'assistant'
  | 'supplier_discovery' {
  const serviceType = (params as { service?: string })?.service;

  if (!serviceType) {
    throw new ConfigurationError('Service type is required', 'unknown');
  }

  // Normalize chatbot to assistant (database stores assistant as chatbot)
  const normalizedType = serviceType === 'chatbot' ? 'assistant' : serviceType;

  const validTypes = [
    'demand_forecasting',
    'anomaly_detection',
    'supplier_scoring',
    'assistant',
    'supplier_discovery',
  ];
  if (!validTypes.includes(normalizedType)) {
    throw new ConfigurationError(`Invalid service type: ${serviceType}`, serviceType);
  }

  return normalizedType as
    | 'demand_forecasting'
    | 'anomaly_detection'
    | 'supplier_scoring'
    | 'assistant'
    | 'supplier_discovery';
}

/**
 * Extract alert severity filter
 */
export function extractSeverity(
  searchParams: URLSearchParams
): 'critical' | 'high' | 'medium' | 'low' | null {
  const severity = searchParams.get('severity');
  if (!severity) return null;

  const validSeverities = ['critical', 'high', 'medium', 'low'];
  if (!validSeverities.includes(severity)) {
    throw new AlertError(`Invalid severity: ${severity}`);
  }

  return severity as 'critical' | 'high' | 'medium' | 'low';
}

/**
 * Extract prediction type filter
 */
export function extractPredictionType(searchParams: URLSearchParams): string | null {
  return searchParams.get('predictionType');
}

/**
 * Extract status filter
 */
export function extractStatus(searchParams: URLSearchParams): string | null {
  return searchParams.get('status');
}

/**
 * Mock authentication - replace with actual auth
 * TODO: Integrate with project authentication system
 */
const FALLBACK_ORG_ID = '00000000-0000-0000-0000-000000000000';
const DEFAULT_ORG_ID = process.env.DEFAULT_ORG_ID ?? FALLBACK_ORG_ID;
const UUID_REGEX = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;

function normalizeOrgId(value?: string | null): string {
  if (value && UUID_REGEX.test(value)) {
    return value;
  }
  return DEFAULT_ORG_ID;
}

export async function authenticateRequest(_request: NextRequest) {
  // In non-production, allow a consistent development identity without headers
  if (process.env.NODE_ENV !== 'production') {
    return {
      id: '11111111-1111-1111-1111-111111111111',
      org_id: DEFAULT_ORG_ID,
      organizationId: 1,
      email: 'dev@mantisnxt.com',
      role: 'admin',
    } as const;
  }

  // Placeholder for production authentication
  return {
    id: '22222222-2222-2222-2222-222222222222',
    org_id: normalizeOrgId('org-456'),
    organizationId: 1,
    email: 'user@example.com',
    role: 'admin',
  } as const;
}

/**
 * Check rate limits for AI services
 * TODO: Implement actual rate limiting logic
 */
export async function checkRateLimit(
  userId: string,
  serviceType: string,
  operation: string
): Promise<void> {
  // Placeholder for rate limiting logic
  // Implement Redis-based rate limiting or similar
  // Example rate limit structure:
  // - demand_forecasting: 100 requests/hour
  // - anomaly_detection: 200 requests/hour
  // - assistant: 50 requests/hour
  // For now, this is a no-op
  // When implementing, throw RateLimitError if limit exceeded
}

/**
 * Validate widget type
 */
export function validateWidgetType(type: string): void {
  const validTypes = [
    'metric_card',
    'line_chart',
    'bar_chart',
    'pie_chart',
    'area_chart',
    'table',
    'alert_list',
    'prediction_list',
  ];

  if (!validTypes.includes(type)) {
    throw new WidgetError(`Invalid widget type: ${type}`);
  }
}

/**
 * Validate metric type
 */
export function validateMetricType(type: string): void {
  const validTypes = [
    'sales',
    'inventory',
    'supplier_performance',
    'customer_behavior',
    'financial',
    'operational',
    'all', // Special type for recalculation
  ];

  if (!validTypes.includes(type)) {
    throw new MetricsError(`Invalid metric type: ${type}. Valid types: ${validTypes.join(', ')}`);
  }
}
