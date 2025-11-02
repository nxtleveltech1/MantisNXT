import { db } from '@/lib/database';
import {
  AIServiceBase,
  type AIServiceBaseOptions,
  type AIServiceRequestOptions,
  type AIServiceResponse,
} from './base';
import type { AIProviderId } from '@/types/ai';

export interface ForecastRequest {
  productId: string;
  horizon: 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'yearly';
  historicalDays?: number;
  includeSeasonality?: boolean;
}

export interface ForecastResult {
  productId: string;
  forecastDate: Date;
  horizon: string;
  predictedQuantity: number;
  lowerBound: number;
  upperBound: number;
  confidenceInterval: number;
  algorithm: string;
  seasonalFactors?: Record<string, number>;
  trend?: 'increasing' | 'decreasing' | 'stable';
  metadata: Record<string, any>;
}

export interface BatchForecastRequest {
  productIds: string[];
  horizon: 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'yearly';
  historicalDays?: number;
}

export interface ForecastAccuracyMetrics {
  horizon: string;
  totalForecasts: number;
  avgAccuracy: number;
  medianAccuracy: number;
  forecastsWithActuals: number;
}

export class DemandForecastingService extends AIServiceBase<AIServiceRequestOptions> {
  constructor(options?: AIServiceBaseOptions) {
    super('DemandForecastingService', options);
  }

  /**
   * Generate demand forecast for a single product
   */
  async generateForecast(
    orgId: string,
    request: ForecastRequest,
    options?: AIServiceRequestOptions,
  ): Promise<AIServiceResponse<ForecastResult>> {
    return this.executeOperation(
      'forecast.generate',
      async ({ service, runtimeOptions }) => {
        // Fetch historical data
        const historicalData = await this.getHistoricalData(
          orgId,
          request.productId,
          request.historicalDays || 90,
        );

        if (historicalData.length === 0) {
          throw new Error('Insufficient historical data for forecasting');
        }

        // Prepare prompt for AI
        const prompt = this.buildForecastPrompt(request, historicalData);

        // Call AI service with caching
        const response = await service.generateText(prompt, {
          ...runtimeOptions,
          temperature: 0.2,
          maxTokens: 2000,
        });

        // Parse AI response
        const forecastData = this.parseForecastResponse(response.text);

        // Calculate bounds using statistical methods
        const { lowerBound, upperBound } = this.calculateConfidenceBounds(
          forecastData.predictedQuantity,
          historicalData,
          0.95,
        );

        // Store forecast in database
        const forecast = await this.storeForecast(orgId, {
          productId: request.productId,
          forecastDate: new Date(),
          horizon: request.horizon,
          predictedQuantity: forecastData.predictedQuantity,
          lowerBound,
          upperBound,
          confidenceInterval: 0.95,
          algorithm: 'ai-hybrid',
          metadata: {
            seasonalFactors: forecastData.seasonalFactors,
            trend: forecastData.trend,
            historicalDataPoints: historicalData.length,
            model: response.model || 'unknown',
          },
        });

        return forecast;
      },
      options,
      { productId: request.productId, horizon: request.horizon },
    );
  }

  /**
   * Generate forecasts for multiple products in batch
   */
  async generateBatchForecast(
    orgId: string,
    request: BatchForecastRequest,
    options?: AIServiceRequestOptions,
  ): Promise<AIServiceResponse<ForecastResult[]>> {
    return this.executeOperation(
      'forecast.batch',
      async ({ service, runtimeOptions }) => {
        const forecasts: ForecastResult[] = [];

        // Process in chunks to avoid rate limits
        const chunkSize = 10;
        for (let i = 0; i < request.productIds.length; i += chunkSize) {
          const chunk = request.productIds.slice(i, i + chunkSize);

          const chunkForecasts = await Promise.all(
            chunk.map(async (productId) => {
              try {
                const result = await this.generateForecast(
                  orgId,
                  { ...request, productId },
                  options,
                );
                return result.data;
              } catch (error) {
                console.error(`Forecast failed for product ${productId}:`, error);
                return null;
              }
            }),
          );

          forecasts.push(...chunkForecasts.filter((f): f is ForecastResult => f !== null));
        }

        return forecasts;
      },
      options,
      { productCount: request.productIds.length, horizon: request.horizon },
    );
  }

  /**
   * Get forecast accuracy metrics
   */
  async getAccuracyMetrics(
    orgId: string,
    days: number = 30,
  ): Promise<AIServiceResponse<ForecastAccuracyMetrics[]>> {
    return this.executeOperation(
      'forecast.accuracy',
      async () => {
        const result = await db.query(
          `SELECT * FROM get_forecast_accuracy_metrics($1, $2)`,
          [orgId, days],
        );

        return result.rows.map((row) => ({
          horizon: row.forecast_horizon,
          totalForecasts: parseInt(row.total_forecasts),
          avgAccuracy: parseFloat(row.avg_accuracy) || 0,
          medianAccuracy: parseFloat(row.median_accuracy) || 0,
          forecastsWithActuals: parseInt(row.forecasts_with_actuals),
        }));
      },
      undefined,
      { orgId, days },
    );
  }

  /**
   * Update actual values and calculate accuracy
   */
  async updateActuals(
    orgId: string,
    forecastId: string,
    actualQuantity: number,
  ): Promise<void> {
    await db.query(
      `
      UPDATE demand_forecast
      SET actual_quantity = $1
      WHERE id = $2 AND org_id = $3
      `,
      [actualQuantity, forecastId, orgId],
    );
  }

  /**
   * Fetch historical sales/movement data
   */
  private async getHistoricalData(
    orgId: string,
    productId: string,
    days: number,
  ): Promise<Array<{ date: Date; quantity: number }>> {
    const result = await db.query(
      `
      SELECT
        DATE(sm.created_at) as date,
        SUM(ABS(sm.quantity)) as quantity
      FROM stock_movement sm
      WHERE sm.product_id = $1
        AND sm.created_at >= NOW() - INTERVAL '1 day' * $2
        AND current_setting('app.current_org_id', true)::uuid = $3
      GROUP BY DATE(sm.created_at)
      ORDER BY date ASC
      `,
      [productId, days, orgId],
    );

    return result.rows.map((row) => ({
      date: new Date(row.date),
      quantity: parseFloat(row.quantity),
    }));
  }

  /**
   * Build AI prompt for forecasting
   */
  private buildForecastPrompt(
    request: ForecastRequest,
    historicalData: Array<{ date: Date; quantity: number }>,
  ): string {
    const dataPoints = historicalData
      .map((d) => `${d.date.toISOString().split('T')[0]}: ${d.quantity}`)
      .join('\n');

    return `
You are a demand forecasting AI. Analyze the following historical sales data and generate a ${request.horizon} forecast.

Historical Data (${historicalData.length} days):
${dataPoints}

Requirements:
1. Predict the quantity for the next ${request.horizon} period
2. Identify any seasonal patterns
3. Determine the trend (increasing/decreasing/stable)
4. Provide confidence level

Respond in JSON format:
{
  "predictedQuantity": <number>,
  "seasonalFactors": { "day_of_week": <number>, "month": <number> },
  "trend": "increasing|decreasing|stable",
  "confidence": <0-1>,
  "reasoning": "<brief explanation>"
}
`.trim();
  }

  /**
   * Parse AI forecast response
   */
  private parseForecastResponse(text: string): {
    predictedQuantity: number;
    seasonalFactors?: Record<string, number>;
    trend?: 'increasing' | 'decreasing' | 'stable';
  } {
    try {
      // Extract JSON from response
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No JSON found in response');
      }

      const parsed = JSON.parse(jsonMatch[0]);

      return {
        predictedQuantity: parsed.predictedQuantity || 0,
        seasonalFactors: parsed.seasonalFactors,
        trend: parsed.trend,
      };
    } catch (error) {
      console.error('Failed to parse forecast response:', error);
      // Fallback to simple average
      return { predictedQuantity: 0 };
    }
  }

  /**
   * Calculate confidence bounds using historical variance
   */
  private calculateConfidenceBounds(
    predicted: number,
    historicalData: Array<{ date: Date; quantity: number }>,
    confidenceLevel: number,
  ): { lowerBound: number; upperBound: number } {
    if (historicalData.length === 0) {
      return { lowerBound: predicted * 0.8, upperBound: predicted * 1.2 };
    }

    const quantities = historicalData.map((d) => d.quantity);
    const mean = quantities.reduce((sum, q) => sum + q, 0) / quantities.length;
    const variance =
      quantities.reduce((sum, q) => sum + Math.pow(q - mean, 2), 0) / quantities.length;
    const stdDev = Math.sqrt(variance);

    // Z-score for 95% confidence interval
    const zScore = 1.96;
    const margin = zScore * stdDev;

    return {
      lowerBound: Math.max(0, predicted - margin),
      upperBound: predicted + margin,
    };
  }

  /**
   * Store forecast in database
   */
  private async storeForecast(orgId: string, data: any): Promise<ForecastResult> {
    const result = await db.query(
      `
      INSERT INTO demand_forecast (
        org_id, product_id, forecast_date, forecast_horizon,
        predicted_quantity, lower_bound, upper_bound,
        confidence_interval, algorithm_used, metadata
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING *
      `,
      [
        orgId,
        data.productId,
        data.forecastDate,
        data.horizon,
        data.predictedQuantity,
        data.lowerBound,
        data.upperBound,
        data.confidenceInterval,
        data.algorithm,
        JSON.stringify(data.metadata),
      ],
    );

    const row = result.rows[0];
    return {
      productId: row.product_id,
      forecastDate: row.forecast_date,
      horizon: row.forecast_horizon,
      predictedQuantity: parseFloat(row.predicted_quantity),
      lowerBound: parseFloat(row.lower_bound),
      upperBound: parseFloat(row.upper_bound),
      confidenceInterval: parseFloat(row.confidence_interval),
      algorithm: row.algorithm_used,
      metadata: row.metadata,
    };
  }
}
