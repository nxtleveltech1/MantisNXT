/**
 * AI Prediction Service
 *
 * Production-ready service for managing AI predictions with:
 * - Database integration with ai_prediction and ai_predictions tables
 * - Caching with expiration tracking
 * - Accuracy tracking with actual outcomes
 * - Integration with AIDatabaseService for prediction generation
 *
 * @module lib/ai/services/prediction-service
 */

import { query, withTransaction } from '@/lib/database';
import { AIDatabaseService } from '@/lib/ai/database-integration';
import { PoolClient } from 'pg';
import { PredictionError } from '@/lib/ai/errors';

// ============================================================================
// TYPES & INTERFACES
// ============================================================================

export type ServiceType =
  | 'demand_forecasting'
  | 'anomaly_detection'
  | 'supplier_scoring'
  | 'assistant';

export type EntityType = 'product' | 'supplier' | 'category' | 'customer';

export type PredictionType =
  | 'inventory_demand'
  | 'supplier_performance'
  | 'price_trends'
  | 'stock_levels'
  | 'custom';

export type PredictionStatus = 'pending' | 'validated' | 'expired' | 'rejected';

export interface Prediction {
  id: string;
  org_id: string;
  service_type: ServiceType;
  entity_type: EntityType;
  entity_id: string;
  prediction_type: string;
  prediction_data: Record<string, any>;
  confidence_score: number;
  accuracy_score?: number;
  created_at: string;
  expires_at: string;
  feedback_received: boolean;
  actual_outcome?: Record<string, any>;
  metadata?: Record<string, any>;
  status?: PredictionStatus;
}

export interface CreatePredictionInput {
  serviceType: ServiceType;
  entityType: EntityType;
  entityId: string;
  predictionType: string;
  predictionData: Record<string, any>;
  confidence?: number;
  metadata?: Record<string, any>;
  expiresInDays?: number;
}

export interface UpdatePredictionAccuracyInput {
  actualOutcome: Record<string, any>;
  accuracy?: number;
  notes?: string;
}

export interface ListPredictionsFilters {
  serviceType?: ServiceType;
  predictionType?: string;
  status?: string;
  entityType?: EntityType;
  entityId?: string;
  startDate?: Date;
  endDate?: Date;
  minConfidence?: number;
  limit?: number;
  offset?: number;
}

export interface ListPredictionsResult {
  predictions: Prediction[];
  total: number;
}

// ============================================================================
// PREDICTION SERVICE CLASS
// ============================================================================

export class PredictionService {
  private aiDatabase: AIDatabaseService;

  constructor() {
    this.aiDatabase = new AIDatabaseService();
  }

  // ==========================================================================
  // PUBLIC METHODS
  // ==========================================================================

  /**
   * List predictions with filters and pagination
   *
   * @param orgId - Organization ID
   * @param filters - Filter criteria
   * @returns Paginated list of predictions
   */
  async listPredictions(
    orgId: string,
    filters: ListPredictionsFilters = {}
  ): Promise<ListPredictionsResult> {
    try {
      const {
        serviceType,
        predictionType,
        status,
        entityType,
        entityId,
        startDate,
        endDate,
        minConfidence,
        limit = 50,
        offset = 0,
      } = filters;

      // Build WHERE clause dynamically
      const conditions: string[] = ['org_id = $1'];
      const params: any[] = [orgId];
      let paramIndex = 2;

      if (serviceType) {
        conditions.push(`service_type = $${paramIndex}`);
        params.push(serviceType);
        paramIndex++;
      }

      if (entityType) {
        conditions.push(`entity_type = $${paramIndex}`);
        params.push(entityType);
        paramIndex++;
      }

      if (entityId) {
        conditions.push(`entity_id = $${paramIndex}`);
        params.push(entityId);
        paramIndex++;
      }

      if (startDate) {
        conditions.push(`created_at >= $${paramIndex}`);
        params.push(startDate);
        paramIndex++;
      }

      if (endDate) {
        conditions.push(`created_at <= $${paramIndex}`);
        params.push(endDate);
        paramIndex++;
      }

      if (minConfidence !== undefined) {
        conditions.push(`confidence_score >= $${paramIndex}`);
        params.push(minConfidence);
        paramIndex++;
      }

      // Handle status filter (derived from expires_at)
      if (status === 'active' || status === 'pending') {
        conditions.push(`expires_at > NOW()`);
      } else if (status === 'expired') {
        conditions.push(`expires_at <= NOW()`);
      } else if (status === 'validated') {
        conditions.push(`actual_outcome IS NOT NULL`);
      }

      // Handle prediction type filter (stored in metadata or derived)
      if (predictionType) {
        conditions.push(`(
          metadata->>'prediction_type' = $${paramIndex}
          OR prediction_data->>'type' = $${paramIndex}
        )`);
        params.push(predictionType);
        paramIndex++;
      }

      const whereClause = conditions.join(' AND ');

      // Get total count
      const countResult = await query<{ count: string }>(
        `SELECT COUNT(*) as count FROM ai_prediction WHERE ${whereClause}`,
        params
      );
      const total = parseInt(countResult.rows[0]?.count || '0', 10);

      // Get paginated results
      const dataQuery = `
        SELECT
          id,
          org_id,
          service_type,
          entity_type,
          entity_id,
          prediction_data,
          confidence_score,
          accuracy_score,
          created_at,
          expires_at,
          feedback_received,
          actual_outcome,
          metadata,
          CASE
            WHEN expires_at <= NOW() THEN 'expired'
            WHEN actual_outcome IS NOT NULL THEN 'validated'
            WHEN feedback_received = true THEN 'rejected'
            ELSE 'pending'
          END as status
        FROM ai_prediction
        WHERE ${whereClause}
        ORDER BY created_at DESC
        LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
      `;

      params.push(limit, offset);

      const result = await query<Prediction>(dataQuery, params);

      return {
        predictions: result.rows,
        total,
      };
    } catch (error) {
      console.error('Error listing predictions:', error);
      throw new PredictionError(
        `Failed to list predictions: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Create a new prediction
   *
   * @param orgId - Organization ID
   * @param input - Prediction input data
   * @returns Created prediction
   */
  async createPrediction(
    orgId: string,
    input: CreatePredictionInput
  ): Promise<Prediction> {
    try {
      return await withTransaction(async (client: PoolClient) => {
        const {
          serviceType,
          entityType,
          entityId,
          predictionType,
          predictionData,
          confidence = 0.85,
          metadata = {},
          expiresInDays = 30,
        } = input;

        // Calculate expiration date
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + expiresInDays);

        // Enhance metadata with prediction type
        const enhancedMetadata = {
          ...metadata,
          prediction_type: predictionType,
          created_by_service: 'prediction-service',
        };

        // Insert into ai_prediction table
        const insertQuery = `
          INSERT INTO ai_prediction (
            org_id,
            service_type,
            entity_type,
            entity_id,
            prediction_data,
            confidence_score,
            expires_at,
            metadata
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
          RETURNING
            id,
            org_id,
            service_type,
            entity_type,
            entity_id,
            prediction_data,
            confidence_score,
            accuracy_score,
            created_at,
            expires_at,
            feedback_received,
            actual_outcome,
            metadata,
            'pending' as status
        `;

        const result = await client.query<Prediction>(insertQuery, [
          orgId,
          serviceType,
          entityType,
          entityId,
          JSON.stringify(predictionData),
          confidence,
          expiresAt,
          JSON.stringify(enhancedMetadata),
        ]);

        const prediction = result.rows[0];

        // Also cache in ai_predictions table for quick retrieval
        await this.cachePrediction(client, {
          prediction_type: predictionType,
          target_id: entityId,
          predictions: predictionData,
          confidence,
          expires_at: expiresAt,
        });

        return prediction;
      });
    } catch (error) {
      console.error('Error creating prediction:', error);
      throw new PredictionError(
        `Failed to create prediction: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Get prediction by ID
   *
   * @param id - Prediction ID
   * @param orgId - Organization ID (for security)
   * @returns Prediction or null
   */
  async getPredictionById(id: string, orgId: string): Promise<Prediction | null> {
    try {
      const result = await query<Prediction>(
        `
          SELECT
            id,
            org_id,
            service_type,
            entity_type,
            entity_id,
            prediction_data,
            confidence_score,
            accuracy_score,
            created_at,
            expires_at,
            feedback_received,
            actual_outcome,
            metadata,
            CASE
              WHEN expires_at <= NOW() THEN 'expired'
              WHEN actual_outcome IS NOT NULL THEN 'validated'
              WHEN feedback_received = true THEN 'rejected'
              ELSE 'pending'
            END as status
          FROM ai_prediction
          WHERE id = $1 AND org_id = $2
        `,
        [id, orgId]
      );

      return result.rows[0] || null;
    } catch (error) {
      console.error('Error getting prediction:', error);
      throw new PredictionError(
        `Failed to get prediction: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Update prediction accuracy with actual outcome
   *
   * @param id - Prediction ID
   * @param orgId - Organization ID (for security)
   * @param input - Accuracy update data
   * @returns Updated prediction
   */
  async updatePredictionAccuracy(
    id: string,
    orgId: string,
    input: UpdatePredictionAccuracyInput
  ): Promise<Prediction> {
    try {
      return await withTransaction(async (client: PoolClient) => {
        // First, get the current prediction
        const existing = await client.query<Prediction>(
          'SELECT * FROM ai_prediction WHERE id = $1 AND org_id = $2',
          [id, orgId]
        );

        if (existing.rows.length === 0) {
          throw new PredictionError('Prediction not found');
        }

        const prediction = existing.rows[0];

        // Calculate accuracy if not provided
        let accuracyScore = input.accuracy;
        if (!accuracyScore && input.actualOutcome) {
          accuracyScore = this.calculateAccuracy(
            prediction.prediction_data,
            input.actualOutcome
          );
        }

        // Update metadata with notes if provided
        const updatedMetadata = { ...prediction.metadata };
        if (input.notes) {
          updatedMetadata.validation_notes = input.notes;
          updatedMetadata.validated_at = new Date().toISOString();
        }

        // Update the prediction
        const updateResult = await client.query<Prediction>(
          `
            UPDATE ai_prediction
            SET
              actual_outcome = $1,
              accuracy_score = $2,
              feedback_received = true,
              metadata = $3
            WHERE id = $4 AND org_id = $5
            RETURNING
              id,
              org_id,
              service_type,
              entity_type,
              entity_id,
              prediction_data,
              confidence_score,
              accuracy_score,
              created_at,
              expires_at,
              feedback_received,
              actual_outcome,
              metadata,
              CASE
                WHEN expires_at <= NOW() THEN 'expired'
                WHEN actual_outcome IS NOT NULL THEN 'validated'
                WHEN feedback_received = true THEN 'rejected'
                ELSE 'pending'
              END as status
          `,
          [
            JSON.stringify(input.actualOutcome),
            accuracyScore || null,
            JSON.stringify(updatedMetadata),
            id,
            orgId,
          ]
        );

        return updateResult.rows[0];
      });
    } catch (error) {
      console.error('Error updating prediction accuracy:', error);
      throw new PredictionError(
        `Failed to update prediction accuracy: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Clean up expired predictions
   *
   * @param orgId - Organization ID (optional - cleans all if not provided)
   * @param daysOld - Number of days after expiration to delete (default: 30)
   * @returns Number of deleted predictions
   */
  async cleanupExpired(orgId?: string, daysOld: number = 30): Promise<number> {
    try {
      return await withTransaction(async (client: PoolClient) => {
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - daysOld);

        let deleteQuery: string;
        let params: any[];

        if (orgId) {
          deleteQuery = `
            DELETE FROM ai_prediction
            WHERE org_id = $1
              AND expires_at < $2
              AND feedback_received = false
          `;
          params = [orgId, cutoffDate];
        } else {
          deleteQuery = `
            DELETE FROM ai_prediction
            WHERE expires_at < $1
              AND feedback_received = false
          `;
          params = [cutoffDate];
        }

        const result = await client.query(deleteQuery, params);

        // Also cleanup ai_predictions cache
        await client.query(
          'DELETE FROM ai_predictions WHERE expires_at < $1',
          [cutoffDate]
        );

        return result.rowCount || 0;
      });
    } catch (error) {
      console.error('Error cleaning up expired predictions:', error);
      throw new PredictionError(
        `Failed to cleanup expired predictions: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Generate AI prediction using AIDatabaseService
   *
   * @param orgId - Organization ID
   * @param entityType - Entity type
   * @param entityId - Entity ID
   * @param predictionType - Type of prediction
   * @returns Created prediction
   */
  async generateAIPrediction(
    orgId: string,
    entityType: EntityType,
    entityId: string,
    predictionType: PredictionType,
    forecastDays: number = 30
  ): Promise<Prediction> {
    try {
      // Generate prediction using AI Database Service
      const aiPrediction = await this.aiDatabase.generatePredictions({
        type: predictionType,
        target_id: entityId ? parseInt(entityId, 10) : undefined,
        forecast_days: forecastDays,
      });

      // Create prediction record
      return await this.createPrediction(orgId, {
        serviceType: 'demand_forecasting',
        entityType,
        entityId,
        predictionType,
        predictionData: {
          predictions: aiPrediction.predictions,
          factors: aiPrediction.factors,
          type: aiPrediction.prediction_type,
        },
        confidence: aiPrediction.confidence,
        metadata: {
          recommendations: aiPrediction.recommendations,
          generated_by: 'ai-database-service',
        },
        expiresInDays: forecastDays,
      });
    } catch (error) {
      console.error('Error generating AI prediction:', error);
      throw new PredictionError(
        `Failed to generate AI prediction: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Get prediction statistics for an organization
   *
   * @param orgId - Organization ID
   * @returns Prediction statistics
   */
  async getPredictionStats(orgId: string): Promise<{
    total: number;
    pending: number;
    validated: number;
    expired: number;
    averageConfidence: number;
    averageAccuracy: number;
  }> {
    try {
      const result = await query<{
        total: string;
        pending: string;
        validated: string;
        expired: string;
        avg_confidence: string;
        avg_accuracy: string;
      }>(
        `
          SELECT
            COUNT(*) as total,
            COUNT(*) FILTER (WHERE expires_at > NOW() AND actual_outcome IS NULL) as pending,
            COUNT(*) FILTER (WHERE actual_outcome IS NOT NULL) as validated,
            COUNT(*) FILTER (WHERE expires_at <= NOW()) as expired,
            AVG(confidence_score) as avg_confidence,
            AVG(accuracy_score) FILTER (WHERE accuracy_score IS NOT NULL) as avg_accuracy
          FROM ai_prediction
          WHERE org_id = $1
        `,
        [orgId]
      );

      const stats = result.rows[0];

      return {
        total: parseInt(stats?.total || '0', 10),
        pending: parseInt(stats?.pending || '0', 10),
        validated: parseInt(stats?.validated || '0', 10),
        expired: parseInt(stats?.expired || '0', 10),
        averageConfidence: parseFloat(stats?.avg_confidence || '0'),
        averageAccuracy: parseFloat(stats?.avg_accuracy || '0'),
      };
    } catch (error) {
      console.error('Error getting prediction stats:', error);
      throw new PredictionError(
        `Failed to get prediction stats: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  // ==========================================================================
  // PRIVATE HELPER METHODS
  // ==========================================================================

  /**
   * Cache prediction in ai_predictions table
   */
  private async cachePrediction(
    client: PoolClient,
    data: {
      prediction_type: string;
      target_id?: string;
      predictions: any;
      confidence: number;
      expires_at: Date;
    }
  ): Promise<void> {
    try {
      await client.query(
        `
          INSERT INTO ai_predictions (
            prediction_type,
            target_id,
            predictions,
            confidence,
            expires_at
          ) VALUES ($1, $2, $3, $4, $5)
        `,
        [
          data.prediction_type,
          data.target_id ? parseInt(data.target_id, 10) : null,
          JSON.stringify(data.predictions),
          data.confidence,
          data.expires_at,
        ]
      );
    } catch (error) {
      // Cache failure shouldn't break the main operation
      console.error('Failed to cache prediction:', error);
    }
  }

  /**
   * Calculate accuracy score by comparing prediction with actual outcome
   */
  private calculateAccuracy(
    predictionData: Record<string, any>,
    actualOutcome: Record<string, any>
  ): number {
    try {
      // Handle different prediction data structures
      if (predictionData.predictions && Array.isArray(predictionData.predictions)) {
        // Time-series prediction
        const predictions = predictionData.predictions;
        const actuals = actualOutcome.actuals || [];

        if (actuals.length === 0) {
          return 0;
        }

        // Calculate Mean Absolute Percentage Error (MAPE)
        let totalError = 0;
        let count = 0;

        for (let i = 0; i < Math.min(predictions.length, actuals.length); i++) {
          const predicted = predictions[i]?.value || 0;
          const actual = actuals[i]?.value || 0;

          if (actual !== 0) {
            totalError += Math.abs((actual - predicted) / actual);
            count++;
          }
        }

        if (count === 0) {
          return 0;
        }

        const mape = totalError / count;
        // Convert MAPE to accuracy (1 - MAPE), capped between 0 and 1
        return Math.max(0, Math.min(1, 1 - mape));
      } else if (predictionData.value !== undefined && actualOutcome.value !== undefined) {
        // Single value prediction
        const predicted = predictionData.value;
        const actual = actualOutcome.value;

        if (actual === 0) {
          return predicted === 0 ? 1 : 0;
        }

        const percentageError = Math.abs((actual - predicted) / actual);
        return Math.max(0, Math.min(1, 1 - percentageError));
      } else {
        // Unknown structure - return 0
        return 0;
      }
    } catch (error) {
      console.error('Error calculating accuracy:', error);
      return 0;
    }
  }
}

// ============================================================================
// SINGLETON EXPORT
// ============================================================================

export const predictionService = new PredictionService();
