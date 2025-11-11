/**
 * Prediction Accuracy Metrics API
 * GET /api/v1/ai/predictions/accuracy
 */

import type { NextRequest } from 'next/server';
import {
  handleAIError,
  authenticateRequest,
  successResponse,
  extractDateRange,
} from '@/lib/ai/api-utils';
import { predictionService } from '@/lib/ai/services/prediction-service';

/**
 * GET /api/v1/ai/predictions/accuracy
 * Get accuracy metrics for predictions by service type
 */
export async function GET(request: NextRequest) {
  try {
    const user = await authenticateRequest(request);
    const searchParams = request.nextUrl.searchParams;
    const { startDate, endDate } = extractDateRange(searchParams);

    const serviceType = searchParams.get('serviceType') as unknown;
    const predictionType = searchParams.get('predictionType') || undefined;

    // Get overall stats
    const stats = await predictionService.getPredictionStats(user.org_id);

    // Build metrics response
    const metrics = {
      overall: {
        totalPredictions: stats.total,
        pendingPredictions: stats.pending,
        validatedPredictions: stats.validated,
        expiredPredictions: stats.expired,
        averageConfidence: stats.averageConfidence,
        averageAccuracy: stats.averageAccuracy,
      },
      period: {
        startDate: startDate?.toISOString(),
        endDate: endDate?.toISOString(),
      },
      filters: {
        serviceType,
        predictionType,
      },
      calculatedAt: new Date().toISOString(),
    };

    return successResponse(metrics);
  } catch (error) {
    return handleAIError(error);
  }
}
