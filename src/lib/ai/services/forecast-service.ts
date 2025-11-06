/**
 * Demand Forecast Service
 *
 * Production-grade demand forecasting service that integrates with:
 * - AIDatabaseService.generatePredictions() for AI-powered forecasting
 * - demand_forecast table for persistence and accuracy tracking
 * - Multi-horizon support (daily, weekly, monthly)
 * - Confidence interval calculation
 * - Accuracy metrics and performance tracking
 */

import { query, withTransaction } from '@/lib/database';
import { AIDatabaseService } from '../database-integration';
import { PoolClient } from 'pg';

// ============================================================================
// TYPES & INTERFACES
// ============================================================================

export type ForecastHorizon = 'daily' | 'weekly' | 'monthly';

export interface ForecastPrediction {
  date: string;
  value: number;
  confidence: number;
  lower_bound?: number;
  upper_bound?: number;
}

export interface DemandForecast {
  id: string;
  org_id: string;
  product_id: string;
  forecast_date: string;
  forecast_horizon: ForecastHorizon;
  predicted_quantity: number;
  lower_bound: number;
  upper_bound: number;
  confidence_interval: number;
  algorithm_used: string;
  actual_quantity: number | null;
  accuracy_score: number | null;
  metadata: Record<string, any>;
  created_at: string;
}

export interface ForecastListOptions {
  productId?: string;
  startDate?: Date;
  endDate?: Date;
  horizon?: ForecastHorizon;
  limit?: number;
  offset?: number;
}

export interface GenerateForecastOptions {
  productId: string;
  horizon: ForecastHorizon;
  days: number;
  includeConfidenceIntervals?: boolean;
  metadata?: Record<string, any>;
}

export interface AccuracyMetrics {
  horizon: ForecastHorizon;
  total_forecasts: number;
  forecasts_with_actuals: number;
  average_accuracy: number;
  median_accuracy: number;
  accuracy_by_range: {
    excellent: number; // > 0.9
    good: number; // 0.7 - 0.9
    fair: number; // 0.5 - 0.7
    poor: number; // < 0.5
  };
  mean_absolute_error: number;
  mean_absolute_percentage_error: number;
}

// ============================================================================
// DEMAND FORECAST SERVICE
// ============================================================================

export class DemandForecastService {
  private aiDatabase: AIDatabaseService;
  private readonly CONFIDENCE_LEVEL = 0.95; // 95% confidence interval

  constructor() {
    this.aiDatabase = new AIDatabaseService();
  }

  /**
   * List forecasts with filters and pagination
   */
  async listForecasts(
    orgId: string,
    options: ForecastListOptions = {}
  ): Promise<{ forecasts: DemandForecast[]; total: number }> {
    const { productId, startDate, endDate, horizon, limit = 50, offset = 0 } = options;

    // Build dynamic WHERE clause
    const conditions: string[] = ['org_id = $1'];
    const params: any[] = [orgId];
    let paramIndex = 2;

    if (productId) {
      conditions.push(`product_id = $${paramIndex++}`);
      params.push(productId);
    }

    if (startDate) {
      conditions.push(`forecast_date >= $${paramIndex++}`);
      params.push(startDate.toISOString().split('T')[0]);
    }

    if (endDate) {
      conditions.push(`forecast_date <= $${paramIndex++}`);
      params.push(endDate.toISOString().split('T')[0]);
    }

    if (horizon) {
      conditions.push(`forecast_horizon = $${paramIndex++}`);
      params.push(horizon);
    }

    const whereClause = conditions.join(' AND ');

    // Get total count
    const countResult = await query<{ count: string }>(
      `SELECT COUNT(*) as count FROM demand_forecast WHERE ${whereClause}`,
      params
    );
    const total = parseInt(countResult.rows[0]?.count || '0', 10);

    // Get paginated results
    const result = await query<DemandForecast>(
      `SELECT
        id, org_id, product_id, forecast_date, forecast_horizon,
        predicted_quantity, lower_bound, upper_bound, confidence_interval,
        algorithm_used, actual_quantity, accuracy_score, metadata, created_at
      FROM demand_forecast
      WHERE ${whereClause}
      ORDER BY forecast_date DESC, created_at DESC
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
      [...params, limit, offset]
    );

    return {
      forecasts: result.rows,
      total,
    };
  }

  /**
   * Generate demand forecast using AI
   */
  async generateForecast(
    orgId: string,
    options: GenerateForecastOptions
  ): Promise<DemandForecast[]> {
    const { productId, horizon, days, includeConfidenceIntervals = true, metadata = {} } = options;

    // Validate inputs
    if (days < 1 || days > 365) {
      throw new Error('Forecast days must be between 1 and 365');
    }

    // Use AIDatabaseService to generate AI-powered predictions
    const aiPrediction = await this.aiDatabase.generatePredictions({
      type: 'inventory_demand',
      target_id: parseInt(productId, 10), // Convert UUID to numeric for AI service
      forecast_days: days,
    });

    // Transform AI predictions into database records
    const forecasts: DemandForecast[] = [];

    return withTransaction(async (client: PoolClient) => {
      for (const prediction of aiPrediction.predictions) {
        const forecastDate = new Date(prediction.date);

        // Calculate bounds based on confidence
        const predictedQty = prediction.value;
        const confidence = prediction.confidence;

        // Use AI-provided bounds or calculate from confidence
        const lowerBound = prediction.lower_bound ?? predictedQty * (1 - (1 - confidence) * 2);
        const upperBound = prediction.upper_bound ?? predictedQty * (1 + (1 - confidence) * 2);

        // Upsert forecast (update if exists, insert if not)
        const result = await client.query<DemandForecast>(
          `INSERT INTO demand_forecast (
            org_id, product_id, forecast_date, forecast_horizon,
            predicted_quantity, lower_bound, upper_bound, confidence_interval,
            algorithm_used, metadata
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
          ON CONFLICT (org_id, product_id, forecast_date, forecast_horizon)
          DO UPDATE SET
            predicted_quantity = EXCLUDED.predicted_quantity,
            lower_bound = EXCLUDED.lower_bound,
            upper_bound = EXCLUDED.upper_bound,
            confidence_interval = EXCLUDED.confidence_interval,
            algorithm_used = EXCLUDED.algorithm_used,
            metadata = EXCLUDED.metadata,
            created_at = NOW()
          RETURNING *`,
          [
            orgId,
            productId,
            forecastDate.toISOString().split('T')[0],
            horizon,
            predictedQty,
            lowerBound,
            upperBound,
            this.CONFIDENCE_LEVEL,
            'claude-3.5-sonnet-forecasting', // Algorithm identifier
            JSON.stringify({
              ...metadata,
              ai_confidence: confidence,
              factors: aiPrediction.factors,
              recommendations: aiPrediction.recommendations,
            }),
          ]
        );

        forecasts.push(result.rows[0]);
      }

      return forecasts;
    });
  }

  /**
   * Update actual quantity and calculate accuracy score
   */
  async updateActualQuantity(
    forecastId: string,
    actualQuantity: number
  ): Promise<DemandForecast> {
    return withTransaction(async (client: PoolClient) => {
      // Get the forecast
      const forecastResult = await client.query<DemandForecast>(
        `SELECT * FROM demand_forecast WHERE id = $1`,
        [forecastId]
      );

      if (forecastResult.rows.length === 0) {
        throw new Error(`Forecast ${forecastId} not found`);
      }

      const forecast = forecastResult.rows[0];

      // Calculate accuracy score
      const accuracyScore = this.calculateAccuracyScore(
        forecast.predicted_quantity,
        actualQuantity,
        forecast.lower_bound,
        forecast.upper_bound
      );

      // Update the record
      const result = await client.query<DemandForecast>(
        `UPDATE demand_forecast
        SET actual_quantity = $1, accuracy_score = $2
        WHERE id = $3
        RETURNING *`,
        [actualQuantity, accuracyScore, forecastId]
      );

      return result.rows[0];
    });
  }

  /**
   * Get accuracy metrics for an organization by horizon
   */
  async getAccuracyMetrics(
    orgId: string,
    horizon?: ForecastHorizon
  ): Promise<AccuracyMetrics[]> {
    // Build query to group by horizon
    const horizonFilter = horizon ? `AND forecast_horizon = $2` : '';
    const params = horizon ? [orgId, horizon] : [orgId];

    const result = await query<{
      forecast_horizon: ForecastHorizon;
      total_forecasts: string;
      forecasts_with_actuals: string;
      avg_accuracy: string;
      median_accuracy: string;
      excellent_count: string;
      good_count: string;
      fair_count: string;
      poor_count: string;
      mean_abs_error: string;
      mean_abs_pct_error: string;
    }>(
      `SELECT
        forecast_horizon,
        COUNT(*) as total_forecasts,
        COUNT(actual_quantity) as forecasts_with_actuals,
        AVG(accuracy_score) as avg_accuracy,
        PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY accuracy_score) as median_accuracy,
        COUNT(CASE WHEN accuracy_score > 0.9 THEN 1 END) as excellent_count,
        COUNT(CASE WHEN accuracy_score > 0.7 AND accuracy_score <= 0.9 THEN 1 END) as good_count,
        COUNT(CASE WHEN accuracy_score > 0.5 AND accuracy_score <= 0.7 THEN 1 END) as fair_count,
        COUNT(CASE WHEN accuracy_score <= 0.5 THEN 1 END) as poor_count,
        AVG(ABS(predicted_quantity - actual_quantity)) as mean_abs_error,
        AVG(ABS(predicted_quantity - actual_quantity) / NULLIF(actual_quantity, 0)) as mean_abs_pct_error
      FROM demand_forecast
      WHERE org_id = $1 ${horizonFilter}
      GROUP BY forecast_horizon
      ORDER BY forecast_horizon`,
      params
    );

    return result.rows.map((row) => ({
      horizon: row.forecast_horizon,
      total_forecasts: parseInt(row.total_forecasts, 10),
      forecasts_with_actuals: parseInt(row.forecasts_with_actuals, 10),
      average_accuracy: parseFloat(row.avg_accuracy) || 0,
      median_accuracy: parseFloat(row.median_accuracy) || 0,
      accuracy_by_range: {
        excellent: parseInt(row.excellent_count, 10),
        good: parseInt(row.good_count, 10),
        fair: parseInt(row.fair_count, 10),
        poor: parseInt(row.poor_count, 10),
      },
      mean_absolute_error: parseFloat(row.mean_abs_error) || 0,
      mean_absolute_percentage_error: parseFloat(row.mean_abs_pct_error) || 0,
    }));
  }

  /**
   * Get forecast by ID
   */
  async getForecastById(forecastId: string): Promise<DemandForecast | null> {
    const result = await query<DemandForecast>(
      `SELECT * FROM demand_forecast WHERE id = $1`,
      [forecastId]
    );

    return result.rows[0] || null;
  }

  /**
   * Delete forecasts older than specified date
   */
  async cleanupOldForecasts(
    orgId: string,
    olderThanDate: Date
  ): Promise<number> {
    const result = await query(
      `DELETE FROM demand_forecast
      WHERE org_id = $1 AND forecast_date < $2`,
      [orgId, olderThanDate.toISOString().split('T')[0]]
    );

    return result.rowCount;
  }

  // ============================================================================
  // PRIVATE HELPER METHODS
  // ============================================================================

  /**
   * Calculate accuracy score for a forecast
   *
   * Scoring methodology:
   * 1. Perfect prediction (actual = predicted): 1.0
   * 2. Within confidence bounds: 0.7 - 0.99 (based on distance from predicted)
   * 3. Outside bounds: 0.0 - 0.69 (based on distance from nearest bound)
   */
  private calculateAccuracyScore(
    predicted: number,
    actual: number,
    lowerBound: number,
    upperBound: number
  ): number {
    // Avoid division by zero
    if (predicted === 0) {
      return actual === 0 ? 1.0 : 0.0;
    }

    const absError = Math.abs(predicted - actual);
    const relativeError = absError / predicted;

    // Perfect prediction
    if (absError === 0) {
      return 1.0;
    }

    // Within confidence bounds - high accuracy
    if (actual >= lowerBound && actual <= upperBound) {
      // Linear scale from 0.7 to 0.99 based on how close to predicted value
      const range = upperBound - lowerBound;
      const distanceFromPredicted = absError;
      const normalizedDistance = range > 0 ? distanceFromPredicted / range : 0;

      // Score decreases as distance from predicted increases
      return Math.max(0.7, 0.99 - normalizedDistance * 0.29);
    }

    // Outside bounds - lower accuracy
    // Calculate distance from nearest bound
    const distanceFromBounds = actual < lowerBound
      ? lowerBound - actual
      : actual - upperBound;

    const boundRange = upperBound - lowerBound;
    const normalizedOutsideDistance = boundRange > 0 ? distanceFromBounds / boundRange : 1;

    // Score decreases rapidly as distance from bounds increases
    return Math.max(0.0, 0.7 - normalizedOutsideDistance * 0.7);
  }

  /**
   * Calculate days between forecast horizons
   */
  private getDaysForHorizon(horizon: ForecastHorizon, count: number = 1): number {
    switch (horizon) {
      case 'daily':
        return count;
      case 'weekly':
        return count * 7;
      case 'monthly':
        return count * 30;
      default:
        return count;
    }
  }
}

// Export singleton instance
export const demandForecastService = new DemandForecastService();
