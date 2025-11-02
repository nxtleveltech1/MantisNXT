/**
 * AI Prediction Detail API
 * GET   /api/v1/ai/predictions/[id] - Get prediction by ID
 * PATCH /api/v1/ai/predictions/[id] - Update with actual outcome
 */

import { NextRequest } from 'next/server';
import {
  handleAIError,
  authenticateRequest,
  successResponse,
} from '@/lib/ai/api-utils';
import { updatePredictionSchema } from '@/lib/ai/validation-schemas';

/**
 * GET /api/v1/ai/predictions/[id]
 * Get prediction details by ID
 */
export async function GET(
  request: NextRequest,

  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const user = await authenticateRequest(request);

    // TODO: Call PredictionService when available from Team C
    // const prediction = await PredictionService.getPrediction(user.org_id, id);

    // Mock response structure
    const prediction = {
      id,
      org_id: user.org_id,
      service_type: 'demand_forecasting',
      entity_type: 'product',
      entity_id: 'prod-123',
      prediction_type: 'demand',
      prediction_data: {
        predictedDemand: 150,
        period: '2025-12',
      },
      confidence: 0.87,
      status: 'pending',
      created_at: new Date().toISOString(),
      expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    };

    return successResponse(prediction);
  } catch (error) {
    return handleAIError(error);
  }
}

/**
 * PATCH /api/v1/ai/predictions/[id]
 * Update prediction with actual outcome for accuracy tracking
 */
export async function PATCH(
  request: NextRequest,

  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const user = await authenticateRequest(request);
    const body = await request.json();
    const validated = updatePredictionSchema.parse(body);

    // TODO: Call PredictionService when available from Team C
    // const prediction = await PredictionService.updatePrediction(
    //   user.org_id,
    //   id,
    //   validated
    // );

    // Mock response structure
    const prediction = {
      id,
      org_id: user.org_id,
      actual_outcome: validated.actualOutcome,
      accuracy: validated.accuracy,
      notes: validated.notes,
      status: 'completed',
      updated_at: new Date().toISOString(),
    };

    return successResponse(prediction);
  } catch (error) {
    return handleAIError(error);
  }
}
