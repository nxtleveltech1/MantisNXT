import { db } from '@/lib/database';
import {
  AIServiceBase,
  type AIServiceBaseOptions,
  type AIServiceRequestOptions,
  type AIServiceResponse,
} from './base';
import type { AIServiceType } from './AIServiceConfigService';

// ============================================================================
// Types
// ============================================================================

export interface AIPrediction {
  id: string;
  orgId: string;
  serviceType: AIServiceType;
  entityType: string;
  entityId: string;
  predictionData: Record<string, any>;
  confidenceScore: number;
  accuracyScore?: number;
  createdAt: Date;
  expiresAt: Date;
  feedbackReceived: boolean;
  actualOutcome?: Record<string, any>;
  metadata: Record<string, any>;
}

export interface CreatePredictionData {
  serviceType: AIServiceType;
  entityType: string;
  entityId: string;
  predictionData: Record<string, any>;
  confidenceScore: number;
  expiresAt: Date;
  metadata?: Record<string, any>;
}

export interface PaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
}

export interface AccuracyMetrics {
  avgAccuracy: number;
  medianAccuracy: number;
  totalPredictions: number;
  predictionsWithFeedback: number;
  accuracyByConfidence: Array<{
    confidenceRange: string;
    avgAccuracy: number;
    count: number;
  }>;
}

// ============================================================================
// Service Implementation
// ============================================================================

export class AIPredictionService extends AIServiceBase<AIServiceRequestOptions> {
  constructor(options?: AIServiceBaseOptions) {
    super('AIPredictionService', options);
  }

  /**
   * Create and store a new prediction
   */
  async createPrediction(
    orgId: string,
    data: CreatePredictionData,
    options?: AIServiceRequestOptions,
  ): Promise<AIServiceResponse<AIPrediction>> {
    return this.executeOperation(
      'prediction.create',
      async () => {
        // Validate confidence score
        if (data.confidenceScore < 0 || data.confidenceScore > 1) {
          throw new Error('Confidence score must be between 0 and 1');
        }

        const result = await db.query(
          `
          INSERT INTO ai_prediction (
            org_id, service_type, entity_type, entity_id,
            prediction_data, confidence_score, expires_at, metadata
          )
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
          RETURNING *
          `,
          [
            orgId,
            data.serviceType,
            data.entityType,
            data.entityId,
            JSON.stringify(data.predictionData),
            data.confidenceScore,
            data.expiresAt,
            JSON.stringify(data.metadata || {}),
          ],
        );

        return this.mapPredictionRow(result.rows[0]);
      },
      options,
      {
        orgId,
        serviceType: data.serviceType,
        entityType: data.entityType,
      },
    );
  }

  /**
   * Update prediction with actual outcome and calculate accuracy
   */
  async updatePredictionAccuracy(
    predictionId: string,
    actualOutcome: Record<string, any>,
    options?: AIServiceRequestOptions,
  ): Promise<AIServiceResponse<void>> {
    return this.executeOperation(
      'prediction.updateAccuracy',
      async () => {
        // Get the prediction to calculate accuracy
        const predResult = await db.query(
          `
          SELECT prediction_data, confidence_score
          FROM ai_prediction
          WHERE id = $1
          `,
          [predictionId],
        );

        if (predResult.rows.length === 0) {
          throw new Error(`Prediction ${predictionId} not found`);
        }

        const prediction = predResult.rows[0];
        const accuracyScore = this.calculateAccuracy(
          prediction.prediction_data,
          actualOutcome,
        );

        // Update with actual outcome and accuracy
        await db.query(
          `
          UPDATE ai_prediction
          SET
            actual_outcome = $1,
            accuracy_score = $2,
            feedback_received = true
          WHERE id = $3
          `,
          [JSON.stringify(actualOutcome), accuracyScore, predictionId],
        );
      },
      options,
      { predictionId },
    );
  }

  /**
   * Get a single prediction by ID
   */
  async getPrediction(
    predictionId: string,
    options?: AIServiceRequestOptions,
  ): Promise<AIServiceResponse<AIPrediction>> {
    return this.executeOperation(
      'prediction.get',
      async () => {
        const result = await db.query(
          `
          SELECT * FROM ai_prediction
          WHERE id = $1
          `,
          [predictionId],
        );

        if (result.rows.length === 0) {
          throw new Error(`Prediction ${predictionId} not found`);
        }

        return this.mapPredictionRow(result.rows[0]);
      },
      options,
      { predictionId },
    );
  }

  /**
   * Get predictions for a specific entity
   */
  async getPredictionsByEntity(
    entityType: string,
    entityId: string,
    options?: AIServiceRequestOptions,
  ): Promise<AIServiceResponse<AIPrediction[]>> {
    return this.executeOperation(
      'prediction.getByEntity',
      async () => {
        const result = await db.query(
          `
          SELECT * FROM ai_prediction
          WHERE entity_type = $1 AND entity_id = $2
          ORDER BY created_at DESC
          `,
          [entityType, entityId],
        );

        return result.rows.map((row) => this.mapPredictionRow(row));
      },
      options,
      { entityType, entityId },
    );
  }

  /**
   * Get predictions by service type with pagination
   */
  async getPredictionsByService(
    orgId: string,
    serviceType: AIServiceType,
    page: number = 1,
    pageSize: number = 50,
    options?: AIServiceRequestOptions,
  ): Promise<AIServiceResponse<PaginatedResult<AIPrediction>>> {
    return this.executeOperation(
      'prediction.getByService',
      async () => {
        const offset = (page - 1) * pageSize;

        // Get total count
        const countResult = await db.query(
          `
          SELECT COUNT(*) as total
          FROM ai_prediction
          WHERE org_id = $1 AND service_type = $2
          `,
          [orgId, serviceType],
        );

        const total = parseInt(countResult.rows[0]?.total || '0');

        // Get paginated data
        const result = await db.query(
          `
          SELECT * FROM ai_prediction
          WHERE org_id = $1 AND service_type = $2
          ORDER BY created_at DESC
          LIMIT $3 OFFSET $4
          `,
          [orgId, serviceType, pageSize, offset],
        );

        const data = result.rows.map((row) => this.mapPredictionRow(row));

        return {
          data,
          total,
          page,
          pageSize,
          hasMore: offset + data.length < total,
        };
      },
      options,
      { orgId, serviceType, page, pageSize },
    );
  }

  /**
   * Get average confidence score for a service
   */
  async getAverageConfidence(
    orgId: string,
    serviceType: AIServiceType,
    options?: AIServiceRequestOptions,
  ): Promise<AIServiceResponse<number>> {
    return this.executeOperation(
      'prediction.avgConfidence',
      async () => {
        const result = await db.query(
          `
          SELECT AVG(confidence_score) as avg_confidence
          FROM ai_prediction
          WHERE org_id = $1
            AND service_type = $2
            AND expires_at > NOW()
          `,
          [orgId, serviceType],
        );

        return parseFloat(result.rows[0]?.avg_confidence || '0');
      },
      options,
      { orgId, serviceType },
    );
  }

  /**
   * Get comprehensive accuracy metrics
   */
  async getAccuracyMetrics(
    orgId: string,
    serviceType: AIServiceType,
    options?: AIServiceRequestOptions,
  ): Promise<AIServiceResponse<AccuracyMetrics>> {
    return this.executeOperation(
      'prediction.accuracyMetrics',
      async () => {
        // Get overall metrics
        const overallResult = await db.query(
          `
          SELECT
            AVG(accuracy_score) as avg_accuracy,
            PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY accuracy_score) as median_accuracy,
            COUNT(*) as total_predictions,
            COUNT(*) FILTER (WHERE feedback_received = true) as predictions_with_feedback
          FROM ai_prediction
          WHERE org_id = $1
            AND service_type = $2
            AND accuracy_score IS NOT NULL
          `,
          [orgId, serviceType],
        );

        const overall = overallResult.rows[0];

        // Get accuracy by confidence range
        const rangeResult = await db.query(
          `
          SELECT
            CASE
              WHEN confidence_score >= 0.9 THEN '0.9-1.0'
              WHEN confidence_score >= 0.7 THEN '0.7-0.9'
              WHEN confidence_score >= 0.5 THEN '0.5-0.7'
              ELSE '0.0-0.5'
            END as confidence_range,
            AVG(accuracy_score) as avg_accuracy,
            COUNT(*) as count
          FROM ai_prediction
          WHERE org_id = $1
            AND service_type = $2
            AND accuracy_score IS NOT NULL
          GROUP BY
            CASE
              WHEN confidence_score >= 0.9 THEN '0.9-1.0'
              WHEN confidence_score >= 0.7 THEN '0.7-0.9'
              WHEN confidence_score >= 0.5 THEN '0.5-0.7'
              ELSE '0.0-0.5'
            END
          ORDER BY confidence_range DESC
          `,
          [orgId, serviceType],
        );

        return {
          avgAccuracy: parseFloat(overall.avg_accuracy || '0'),
          medianAccuracy: parseFloat(overall.median_accuracy || '0'),
          totalPredictions: parseInt(overall.total_predictions || '0'),
          predictionsWithFeedback: parseInt(
            overall.predictions_with_feedback || '0',
          ),
          accuracyByConfidence: rangeResult.rows.map((row) => ({
            confidenceRange: row.confidence_range,
            avgAccuracy: parseFloat(row.avg_accuracy),
            count: parseInt(row.count),
          })),
        };
      },
      options,
      { orgId, serviceType },
    );
  }

  /**
   * Clean up expired predictions (older than 30 days past expiration)
   */
  async cleanupExpiredPredictions(
    options?: AIServiceRequestOptions,
  ): Promise<AIServiceResponse<number>> {
    return this.executeOperation(
      'prediction.cleanup',
      async () => {
        const result = await db.query(
          `
          SELECT cleanup_expired_predictions() as deleted_count
          `,
        );

        return parseInt(result.rows[0]?.deleted_count || '0');
      },
      options,
    );
  }

  /**
   * Calculate accuracy score by comparing prediction to actual outcome
   */
  private calculateAccuracy(
    predictionData: Record<string, any>,
    actualOutcome: Record<string, any>,
  ): number {
    // This is a simplified accuracy calculation
    // In production, you'd want domain-specific accuracy metrics

    // For numeric predictions
    if (
      typeof predictionData.value === 'number' &&
      typeof actualOutcome.value === 'number'
    ) {
      const predicted = predictionData.value;
      const actual = actualOutcome.value;

      if (actual === 0) {
        return predicted === 0 ? 1.0 : 0.0;
      }

      const percentError = Math.abs(predicted - actual) / Math.abs(actual);
      return Math.max(0, Math.min(1, 1 - percentError));
    }

    // For categorical predictions
    if (
      typeof predictionData.category === 'string' &&
      typeof actualOutcome.category === 'string'
    ) {
      return predictionData.category === actualOutcome.category ? 1.0 : 0.0;
    }

    // For boolean predictions
    if (
      typeof predictionData.result === 'boolean' &&
      typeof actualOutcome.result === 'boolean'
    ) {
      return predictionData.result === actualOutcome.result ? 1.0 : 0.0;
    }

    // Default: calculate as object similarity
    const predKeys = Object.keys(predictionData);
    const actualKeys = Object.keys(actualOutcome);
    const allKeys = new Set([...predKeys, ...actualKeys]);

    let matches = 0;
    let total = 0;

    for (const key of allKeys) {
      if (key === 'metadata' || key === 'timestamp') continue;
      total++;
      if (predictionData[key] === actualOutcome[key]) {
        matches++;
      }
    }

    return total > 0 ? matches / total : 0;
  }

  /**
   * Map database row to AIPrediction
   */
  private mapPredictionRow(row: any): AIPrediction {
    return {
      id: row.id,
      orgId: row.org_id,
      serviceType: row.service_type,
      entityType: row.entity_type,
      entityId: row.entity_id,
      predictionData: row.prediction_data || {},
      confidenceScore: parseFloat(row.confidence_score),
      accuracyScore: row.accuracy_score
        ? parseFloat(row.accuracy_score)
        : undefined,
      createdAt: new Date(row.created_at),
      expiresAt: new Date(row.expires_at),
      feedbackReceived: row.feedback_received,
      actualOutcome: row.actual_outcome || undefined,
      metadata: row.metadata || {},
    };
  }
}
