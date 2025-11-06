/**
 * AI Predictions API
 * GET  /api/v1/ai/predictions - List predictions with filters
 * POST /api/v1/ai/predictions - Create prediction
 */

import { NextRequest } from 'next/server';
import {
  handleAIError,
  authenticateRequest,
  successResponse,
  createdResponse,
  extractPagination,
  extractDateRange,
  extractEntityFilters,
  extractPredictionType,
  extractStatus,
} from '@/lib/ai/api-utils';
import { createPredictionSchema } from '@/lib/ai/validation-schemas';
import { predictionService } from '@/lib/ai/services/prediction-service';

/**
 * GET /api/v1/ai/predictions
 * List predictions with optional filters
 */
export async function GET(request: NextRequest) {
  try {
    const user = await authenticateRequest(request);
    const searchParams = request.nextUrl.searchParams;
    const { limit, offset, page } = extractPagination(searchParams);
    const { startDate, endDate } = extractDateRange(searchParams);
    const { entityType, entityId } = extractEntityFilters(searchParams);

    const filters = {
      serviceType: searchParams.get('serviceType') as any,
      predictionType: extractPredictionType(searchParams) || undefined,
      status: extractStatus(searchParams) || undefined,
      entityType: entityType || undefined,
      entityId: entityId || undefined,
      startDate,
      endDate,
      minConfidence: searchParams.get('minConfidence')
        ? parseFloat(searchParams.get('minConfidence')!)
        : undefined,
      limit,
      offset,
    };

    const result = await predictionService.listPredictions(user.org_id, filters);

    return successResponse(result.predictions, {
      page,
      limit,
      total: result.total,
      hasMore: offset + limit < result.total,
    });
  } catch (error) {
    return handleAIError(error);
  }
}

/**
 * POST /api/v1/ai/predictions
 * Create new prediction
 */
export async function POST(request: NextRequest) {
  try {
    const user = await authenticateRequest(request);
    const body = await request.json();
    const validated = createPredictionSchema.parse(body);

    const prediction = await predictionService.createPrediction(user.org_id, {
      serviceType: validated.serviceType,
      entityType: validated.entityType,
      entityId: validated.entityId,
      predictionType: validated.predictionType,
      predictionData: validated.predictionData,
      confidence: validated.confidence,
      metadata: validated.metadata,
    });

    return createdResponse(prediction);
  } catch (error) {
    return handleAIError(error);
  }
}
