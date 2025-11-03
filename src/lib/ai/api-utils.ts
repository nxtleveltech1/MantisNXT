/**
 * AI API Utilities
 * Shared utilities for AI service API endpoints
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import {
  AIServiceError,
  RateLimitError,
  ProviderError,
  ConfigurationError,
  PredictionError,
  ForecastError,
  AnomalyError,
  AlertError,
  ConversationError,
  DashboardError,
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
export function requireQueryParams(
  searchParams: URLSearchParams,
  params: string[]
): void {
  const missing = params.filter((param) => !searchParams.has(param));
  if (missing.length > 0) {
    throw new Error(`Missing required parameters: ${missing.join(', ')}`);
  }
}

/**
 * Extract AI service type from path or params
 */
export function extractServiceType(
  params: unknown
): 'demand_forecasting' | 'anomaly_detection' | 'supplier_scoring' | 'assistant' {
  const serviceType = (params as { service?: string })?.service;

  if (!serviceType) {
    throw new ConfigurationError('Service type is required', 'unknown');
  }

  const validTypes = ['demand_forecasting', 'anomaly_detection', 'supplier_scoring', 'assistant'];
  if (!validTypes.includes(serviceType)) {
    throw new ConfigurationError(`Invalid service type: ${serviceType}`, serviceType);
  }

  return serviceType as 'demand_forecasting' | 'anomaly_detection' | 'supplier_scoring' | 'assistant';
}

/**
 * Extract alert severity filter
 */
export function extractSeverity(searchParams: URLSearchParams): 'critical' | 'high' | 'medium' | 'low' | null {
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
export async function authenticateRequest(request: NextRequest) {
  // Development mode bypass
  if (process.env.NODE_ENV === 'development' && process.env.DISABLE_AUTH === 'true') {
    return {
      id: 'dev-user-123',
      org_id: 'dev-org-123',
      email: 'dev@mantisnxt.com',
      role: 'admin',
    };
  }

  // This is a placeholder - integrate with your actual auth system
  // For now, returning mock user data
  const authHeader = request.headers.get('authorization');

  if (!authHeader) {
    throw new Error('Unauthorized');
  }

  // Mock user - replace with actual auth logic
  return {
    id: 'user-123',
    org_id: 'org-456',
    email: 'user@example.com',
    role: 'admin',
  };
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
    'demand_forecast',
    'prediction_accuracy',
    'anomaly_count',
    'alert_summary',
    'supplier_score',
    'cost_savings',
    'efficiency_gain',
  ];

  if (!validTypes.includes(type)) {
    throw new MetricsError(`Invalid metric type: ${type}`);
  }
}
