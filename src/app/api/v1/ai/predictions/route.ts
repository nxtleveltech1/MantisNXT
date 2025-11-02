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
      serviceType: searchParams.get('serviceType'),
      predictionType: extractPredictionType(searchParams),
      status: extractStatus(searchParams),
      entityType,
      entityId,
      startDate,
      endDate,
      minConfidence: searchParams.get('minConfidence')
        ? parseFloat(searchParams.get('minConfidence')!)
        : undefined,
    };

    // TODO: Call PredictionService when available from Team C
    // const result = await PredictionService.listPredictions(user.org_id, {
    //   ...filters,
    //   limit,
    //   offset,
    // });

    // Mock response structure
    const predictions = [];
    const total = 0;

    return successResponse(predictions, {
      page,
      limit,
      total,
      hasMore: offset + limit < total,
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

    // TODO: Call PredictionService when available from Team C
    // const prediction = await PredictionService.createPrediction(
    //   user.org_id,
    //   validated
    // );

    // Mock response structure
    const prediction = {
      id: 'pred-123',
      org_id: user.org_id,
      service_type: validated.serviceType,
      entity_type: validated.entityType,
      entity_id: validated.entityId,
      prediction_type: validated.predictionType,
      prediction_data: validated.predictionData,
      confidence: validated.confidence || 0.85,
      status: 'pending',
      created_at: new Date().toISOString(),
      expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    };

    return createdResponse(prediction);
  } catch (error) {
    return handleAIError(error);
  }
}
