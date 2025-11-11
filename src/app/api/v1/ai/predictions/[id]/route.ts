/**
 * AI Prediction Detail API
 * GET   /api/v1/ai/predictions/[id] - Get prediction by ID
 * PATCH /api/v1/ai/predictions/[id] - Update with actual outcome
 */

import type { NextRequest} from 'next/server';
import { NextResponse } from 'next/server';
import {
  handleAIError,
  authenticateRequest,
  successResponse,
} from '@/lib/ai/api-utils';
import { updatePredictionSchema } from '@/lib/ai/validation-schemas';
import { predictionService } from '@/lib/ai/services/prediction-service';

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

    const prediction = await predictionService.getPredictionById(id, user.org_id);

    if (!prediction) {
      return NextResponse.json(
        {
          success: false,
          error: 'Prediction not found',
        },
        { status: 404 }
      );
    }

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

    const prediction = await predictionService.updatePredictionAccuracy(id, user.org_id, {
      actualOutcome: validated.actualOutcome,
      accuracy: validated.accuracy,
      notes: validated.notes,
    });

    return successResponse(prediction);
  } catch (error) {
    return handleAIError(error);
  }
}
