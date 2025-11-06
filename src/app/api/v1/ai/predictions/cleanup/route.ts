/**
 * Prediction Cleanup API
 * POST /api/v1/ai/predictions/cleanup
 */

import { NextRequest } from 'next/server';
import {
  handleAIError,
  authenticateRequest,
  successResponse,
} from '@/lib/ai/api-utils';
import { cleanupPredictionsSchema } from '@/lib/ai/validation-schemas';
import { predictionService } from '@/lib/ai/services/prediction-service';

/**
 * POST /api/v1/ai/predictions/cleanup
 * Clean up expired or old predictions
 */
export async function POST(request: NextRequest) {
  try {
    const user = await authenticateRequest(request);
    const body = await request.json();
    const validated = cleanupPredictionsSchema.parse(body);

    // Calculate days old from olderThan date
    const olderThanDate = new Date(validated.olderThan);
    const now = new Date();
    const daysOld = Math.floor((now.getTime() - olderThanDate.getTime()) / (1000 * 60 * 60 * 24));

    // For dry run, get predictions that would be deleted
    let affectedPredictions: any[] = [];
    if (validated.dryRun) {
      const filters = {
        serviceType: validated.serviceType,
        status: 'expired',
        endDate: olderThanDate,
        limit: 100,
        offset: 0,
      };
      const result = await predictionService.listPredictions(user.org_id, filters);
      affectedPredictions = result.predictions.map((p) => ({
        id: p.id,
        service_type: p.service_type,
        created_at: p.created_at,
      }));
    }

    // Execute cleanup if not dry run
    const deletedCount = validated.dryRun
      ? 0
      : await predictionService.cleanupExpired(user.org_id, daysOld);

    const result = {
      success: true,
      dryRun: validated.dryRun,
      deletedCount,
      affectedPredictions,
      cutoffDate: olderThanDate.toISOString(),
      executedAt: new Date().toISOString(),
    };

    return successResponse(result);
  } catch (error) {
    return handleAIError(error);
  }
}
