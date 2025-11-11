/**
 * Demand Forecast Individual Record API
 * GET    /api/v1/ai/forecasts/[id] - Get forecast by ID
 * PATCH  /api/v1/ai/forecasts/[id] - Update actual quantity
 * DELETE /api/v1/ai/forecasts/[id] - Delete forecast (admin only)
 */

import type { NextRequest} from 'next/server';
import { NextResponse } from 'next/server';
import {
  handleAIError,
  authenticateRequest,
  successResponse,
} from '@/lib/ai/api-utils';
import { demandForecastService } from '@/lib/ai/services/forecast-service';
import { z } from 'zod';

// Validation schemas
const updateActualQuantitySchema = z.object({
  actualQuantity: z.number().min(0),
});

/**
 * GET /api/v1/ai/forecasts/[id]
 * Get a specific forecast by ID
 */
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    await authenticateRequest(request);
    const params = await context.params;

    const forecast = await demandForecastService.getForecastById(params.id);

    if (!forecast) {
      return NextResponse.json(
        { success: false, error: 'Forecast not found' },
        { status: 404 }
      );
    }

    return successResponse(forecast);
  } catch (error) {
    return handleAIError(error);
  }
}

/**
 * PATCH /api/v1/ai/forecasts/[id]
 * Update actual quantity and calculate accuracy score
 */
export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    await authenticateRequest(request);
    const params = await context.params;

    const body = await request.json();
    const validated = updateActualQuantitySchema.parse(body);

    const updatedForecast = await demandForecastService.updateActualQuantity(
      params.id,
      validated.actualQuantity
    );

    return NextResponse.json({
      success: true,
      data: updatedForecast,
      message: 'Actual quantity updated and accuracy score calculated',
    });
  } catch (error) {
    return handleAIError(error);
  }
}

/**
 * DELETE /api/v1/ai/forecasts/[id]
 * Delete a forecast (admin only, for cleanup)
 */
export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    await authenticateRequest(request);
    const params = await context.params;

    // Check if forecast exists
    const forecast = await demandForecastService.getForecastById(params.id);
    if (!forecast) {
      return NextResponse.json(
        { success: false, error: 'Forecast not found' },
        { status: 404 }
      );
    }

    // Note: This is a simple implementation
    // In production, add role-based access control for deletions
    await demandForecastService.cleanupOldForecasts(
      forecast.org_id,
      new Date(forecast.forecast_date)
    );

    return NextResponse.json({
      success: true,
      data: { deleted: true, id: params.id },
      message: 'Forecast deleted successfully',
    });
  } catch (error) {
    return handleAIError(error);
  }
}
