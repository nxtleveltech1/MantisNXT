import { db } from '@/lib/database';
import {
  AIServiceBase,
  type AIServiceBaseOptions,
  type AIServiceRequestOptions,
  type AIServiceResponse,
} from './base';

export interface Anomaly {
  id: string;
  type: string;
  severity: 'info' | 'warning' | 'critical' | 'urgent';
  title: string;
  message: string;
  affectedEntity: {
    type: string;
    id: string;
    name?: string;
  };
  metrics: Record<string, number>;
  recommendations: string[];
  detectedAt: Date;
}

export interface AnomalyDetectionConfig {
  sensitivity: 'low' | 'medium' | 'high';
  categories: string[];
  thresholds?: Record<string, number>;
}

export class AnomalyDetectionService extends AIServiceBase<AIServiceRequestOptions> {
  constructor(options?: AIServiceBaseOptions) {
    super('AnomalyDetectionService', options);
  }

  /**
   * Detect anomalies in inventory levels
   */
  async detectInventoryAnomalies(
    orgId: string,
    config?: AnomalyDetectionConfig,
    options?: AIServiceRequestOptions
  ): Promise<AIServiceResponse<Anomaly[]>> {
    return this.executeOperation(
      'anomaly.inventory',
      async ({ service, runtimeOptions }) => {
        const anomalies: Anomaly[] = [];

        // Detect stock level anomalies
        const stockAnomalies = await this.detectStockLevelAnomalies(orgId);
        anomalies.push(...stockAnomalies);

        // Detect unusual movement patterns
        const movementAnomalies = await this.detectMovementAnomalies(orgId);
        anomalies.push(...movementAnomalies);

        // Get AI insights for detected anomalies
        for (const anomaly of anomalies) {
          const aiRecommendations = await this.getAIRecommendations(
            service,
            runtimeOptions,
            anomaly
          );
          anomaly.recommendations = aiRecommendations;
        }

        // Store alerts in database
        await this.storeAlerts(orgId, anomalies);

        return anomalies;
      },
      options,
      { orgId, configSensitivity: config?.sensitivity || 'medium' }
    );
  }

  /**
   * Detect pricing anomalies
   */
  async detectPricingAnomalies(
    orgId: string,
    options?: AIServiceRequestOptions
  ): Promise<AIServiceResponse<Anomaly[]>> {
    return this.executeOperation(
      'anomaly.pricing',
      async ({ service, runtimeOptions }) => {
        const result = await db.query(
          `
          WITH price_stats AS (
            SELECT
              p.id,
              p.name,
              pp.price,
              AVG(pp.price) OVER (PARTITION BY p.id ORDER BY pp.created_at ROWS BETWEEN 30 PRECEDING AND CURRENT ROW) as avg_price,
              STDDEV(pp.price) OVER (PARTITION BY p.id ORDER BY pp.created_at ROWS BETWEEN 30 PRECEDING AND CURRENT ROW) as stddev_price
            FROM products p
            JOIN pricelist_products pp ON pp.product_id = p.id
            WHERE current_setting('app.current_org_id', true)::uuid = $1
              AND pp.created_at >= NOW() - INTERVAL '90 days'
          )
          SELECT
            id,
            name,
            price,
            avg_price,
            stddev_price,
            ABS(price - avg_price) / NULLIF(stddev_price, 0) as z_score
          FROM price_stats
          WHERE ABS(price - avg_price) / NULLIF(stddev_price, 0) > 2
          `,
          [orgId]
        );

        const anomalies: Anomaly[] = result.rows.map(row => ({
          id: `price_${row.id}_${Date.now()}`,
          type: 'price_deviation',
          severity: parseFloat(row.z_score) > 3 ? 'critical' : 'warning',
          title: `Unusual price change detected for ${row.name}`,
          message: `Current price (${row.price}) deviates significantly from the 30-day average (${parseFloat(row.avg_price).toFixed(2)})`,
          affectedEntity: {
            type: 'product',
            id: row.id,
            name: row.name,
          },
          metrics: {
            currentPrice: parseFloat(row.price),
            averagePrice: parseFloat(row.avg_price),
            zScore: parseFloat(row.z_score),
          },
          recommendations: [],
          detectedAt: new Date(),
        }));

        // Get AI recommendations
        for (const anomaly of anomalies) {
          anomaly.recommendations = await this.getAIRecommendations(
            service,
            runtimeOptions,
            anomaly
          );
        }

        await this.storeAlerts(orgId, anomalies);

        return anomalies;
      },
      options,
      { orgId }
    );
  }

  /**
   * Detect supplier performance anomalies
   */
  async detectSupplierAnomalies(
    orgId: string,
    options?: AIServiceRequestOptions
  ): Promise<AIServiceResponse<Anomaly[]>> {
    return this.executeOperation(
      'anomaly.supplier',
      async ({ service, runtimeOptions }) => {
        const result = await db.query(
          `
          WITH supplier_metrics AS (
            SELECT
              s.id,
              s.name,
              COUNT(po.id) as total_orders,
              AVG(CASE WHEN po.delivered_on_time THEN 1 ELSE 0 END) as on_time_rate,
              AVG(EXTRACT(DAY FROM po.delivery_date - po.order_date)) as avg_delivery_days
            FROM public.suppliers s
            LEFT JOIN purchase_orders po ON po.supplier_id = s.id
            WHERE current_setting('app.current_org_id', true)::uuid = $1
              AND po.created_at >= NOW() - INTERVAL '90 days'
            GROUP BY s.id, s.name
            HAVING COUNT(po.id) >= 5
          )
          SELECT *
          FROM supplier_metrics
          WHERE on_time_rate < 0.7 OR avg_delivery_days > 14
          `,
          [orgId]
        );

        const anomalies: Anomaly[] = result.rows.map(row => {
          const onTimeRate = parseFloat(row.on_time_rate);
          const avgDays = parseFloat(row.avg_delivery_days);

          return {
            id: `supplier_${row.id}_${Date.now()}`,
            type: 'supplier_performance',
            severity: onTimeRate < 0.5 || avgDays > 21 ? 'critical' : 'warning',
            title: `Performance issues detected for supplier ${row.name}`,
            message: `On-time delivery: ${(onTimeRate * 100).toFixed(1)}%, Average delivery: ${avgDays.toFixed(1)} days`,
            affectedEntity: {
              type: 'supplier',
              id: row.id,
              name: row.name,
            },
            metrics: {
              onTimeRate,
              avgDeliveryDays: avgDays,
              totalOrders: parseInt(row.total_orders),
            },
            recommendations: [],
            detectedAt: new Date(),
          };
        });

        // Get AI recommendations
        for (const anomaly of anomalies) {
          anomaly.recommendations = await this.getAIRecommendations(
            service,
            runtimeOptions,
            anomaly
          );
        }

        await this.storeAlerts(orgId, anomalies);

        return anomalies;
      },
      options,
      { orgId }
    );
  }

  /**
   * Run comprehensive anomaly detection
   */
  async detectAll(
    orgId: string,
    config?: AnomalyDetectionConfig,
    options?: AIServiceRequestOptions
  ): Promise<AIServiceResponse<Anomaly[]>> {
    return this.executeOperation(
      'anomaly.all',
      async () => {
        const allAnomalies: Anomaly[] = [];

        // Run all detection methods in parallel
        const [inventory, pricing, supplier] = await Promise.all([
          this.detectInventoryAnomalies(orgId, config, options),
          this.detectPricingAnomalies(orgId, options),
          this.detectSupplierAnomalies(orgId, options),
        ]);

        if (inventory.data) allAnomalies.push(...inventory.data);
        if (pricing.data) allAnomalies.push(...pricing.data);
        if (supplier.data) allAnomalies.push(...supplier.data);

        // Sort by severity
        const severityOrder = { urgent: 0, critical: 1, warning: 2, info: 3 };
        allAnomalies.sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity]);

        return allAnomalies;
      },
      options,
      { orgId, categories: config?.categories?.join(',') }
    );
  }

  /**
   * Detect stock level anomalies using statistical methods
   */
  private async detectStockLevelAnomalies(orgId: string): Promise<Anomaly[]> {
    const result = await db.query(
      `
      WITH stock_stats AS (
        SELECT
          p.id,
          p.name,
          soh.quantity,
          AVG(soh.quantity) OVER (PARTITION BY p.id ORDER BY soh.updated_at ROWS BETWEEN 30 PRECEDING AND CURRENT ROW) as avg_quantity,
          STDDEV(soh.quantity) OVER (PARTITION BY p.id ORDER BY soh.updated_at ROWS BETWEEN 30 PRECEDING AND CURRENT ROW) as stddev_quantity,
          p.reorder_point,
          p.max_stock_level
        FROM products p
        JOIN stock_on_hand soh ON soh.product_id = p.id
        WHERE current_setting('app.current_org_id', true)::uuid = $1
      )
      SELECT *,
        ABS(quantity - avg_quantity) / NULLIF(stddev_quantity, 0) as z_score
      FROM stock_stats
      WHERE quantity <= reorder_point
         OR quantity >= max_stock_level * 1.5
         OR ABS(quantity - avg_quantity) / NULLIF(stddev_quantity, 0) > 3
      `,
      [orgId]
    );

    return result.rows.map(row => ({
      id: `stock_${row.id}_${Date.now()}`,
      type: 'stock_level',
      severity: row.quantity <= row.reorder_point ? 'critical' : 'warning',
      title: `Stock level anomaly for ${row.name}`,
      message:
        row.quantity <= row.reorder_point
          ? `Stock below reorder point (${row.quantity} <= ${row.reorder_point})`
          : `Unusual stock level detected (Z-score: ${parseFloat(row.z_score).toFixed(2)})`,
      affectedEntity: {
        type: 'product',
        id: row.id,
        name: row.name,
      },
      metrics: {
        currentQuantity: parseFloat(row.quantity),
        averageQuantity: parseFloat(row.avg_quantity),
        reorderPoint: parseFloat(row.reorder_point),
        zScore: parseFloat(row.z_score) || 0,
      },
      recommendations: [],
      detectedAt: new Date(),
    }));
  }

  /**
   * Detect unusual movement patterns
   */
  private async detectMovementAnomalies(orgId: string): Promise<Anomaly[]> {
    const result = await db.query(
      `
      WITH daily_movements AS (
        SELECT
          p.id,
          p.name,
          DATE(sm.created_at) as date,
          SUM(ABS(sm.quantity)) as total_movement
        FROM products p
        JOIN stock_movement sm ON sm.product_id = p.id
        WHERE current_setting('app.current_org_id', true)::uuid = $1
          AND sm.created_at >= NOW() - INTERVAL '30 days'
        GROUP BY p.id, p.name, DATE(sm.created_at)
      ),
      movement_stats AS (
        SELECT
          id,
          name,
          date,
          total_movement,
          AVG(total_movement) OVER (PARTITION BY id) as avg_movement,
          STDDEV(total_movement) OVER (PARTITION BY id) as stddev_movement
        FROM daily_movements
      )
      SELECT *,
        ABS(total_movement - avg_movement) / NULLIF(stddev_movement, 0) as z_score
      FROM movement_stats
      WHERE ABS(total_movement - avg_movement) / NULLIF(stddev_movement, 0) > 2.5
      ORDER BY z_score DESC
      LIMIT 10
      `,
      [orgId]
    );

    return result.rows.map(row => ({
      id: `movement_${row.id}_${Date.now()}`,
      type: 'unusual_movement',
      severity: parseFloat(row.z_score) > 3.5 ? 'critical' : 'warning',
      title: `Unusual movement pattern for ${row.name}`,
      message: `Movement on ${row.date} (${parseFloat(row.total_movement).toFixed(0)} units) significantly deviates from average`,
      affectedEntity: {
        type: 'product',
        id: row.id,
        name: row.name,
      },
      metrics: {
        movementQuantity: parseFloat(row.total_movement),
        averageMovement: parseFloat(row.avg_movement),
        zScore: parseFloat(row.z_score),
      },
      recommendations: [],
      detectedAt: new Date(),
    }));
  }

  /**
   * Get AI recommendations for an anomaly
   */
  private async getAIRecommendations(
    service: unknown,
    runtimeOptions: unknown,
    anomaly: Anomaly
  ): Promise<string[]> {
    const prompt = `
Analyze this anomaly and provide 2-3 specific, actionable recommendations:

Type: ${anomaly.type}
Severity: ${anomaly.severity}
Description: ${anomaly.message}
Metrics: ${JSON.stringify(anomaly.metrics, null, 2)}

Respond with a JSON array of recommendations:
["recommendation 1", "recommendation 2", ...]
`.trim();

    try {
      const response = await service.generateText(prompt, {
        ...runtimeOptions,
        temperature: 0.3,
        maxTokens: 300,
      });

      const jsonMatch = response.text.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
    } catch (error) {
      console.error('AI recommendations failed:', error);
    }

    // Fallback recommendations
    return this.getFallbackRecommendations(anomaly);
  }

  /**
   * Fallback recommendations based on anomaly type
   */
  private getFallbackRecommendations(anomaly: Anomaly): string[] {
    switch (anomaly.type) {
      case 'stock_level':
        return [
          'Review reorder points and adjust if necessary',
          'Check for pending purchase orders',
          'Consider emergency restocking if critical',
        ];
      case 'price_deviation':
        return [
          'Verify pricing data for errors',
          'Review recent supplier price changes',
          'Update pricing strategy if market conditions changed',
        ];
      case 'supplier_performance':
        return [
          'Schedule performance review meeting with supplier',
          'Document specific delivery issues',
          'Consider backup supplier options',
        ];
      default:
        return ['Investigate the anomaly', 'Monitor for recurrence'];
    }
  }

  /**
   * Store alerts in database and track predictions
   */
  private async storeAlerts(orgId: string, anomalies: Anomaly[]): Promise<void> {
    for (const anomaly of anomalies) {
      // Store in ai_alert table
      await db.query(
        `
        INSERT INTO ai_alert (
          org_id, service_type, severity, title, message,
          recommendations, entity_type, entity_id, metadata
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        ON CONFLICT DO NOTHING
        `,
        [
          orgId,
          'anomaly_detection',
          anomaly.severity,
          anomaly.title,
          anomaly.message,
          JSON.stringify(anomaly.recommendations),
          anomaly.affectedEntity.type,
          anomaly.affectedEntity.id,
          JSON.stringify({ metrics: anomaly.metrics }),
        ]
      );

      // Store in ai_prediction table for tracking
      const confidenceScore = this.calculateConfidence(anomaly);
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 7); // Anomaly predictions valid for 7 days

      await db.query(
        `
        INSERT INTO ai_prediction (
          org_id, service_type, entity_type, entity_id,
          prediction_data, confidence_score, expires_at, metadata
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        `,
        [
          orgId,
          'anomaly_detection',
          anomaly.affectedEntity.type,
          anomaly.affectedEntity.id,
          JSON.stringify({
            anomalyType: anomaly.type,
            severity: anomaly.severity,
            detected: true,
            metrics: anomaly.metrics,
          }),
          confidenceScore,
          expiresAt,
          JSON.stringify({
            title: anomaly.title,
            detectedAt: anomaly.detectedAt,
          }),
        ]
      );
    }
  }

  /**
   * Calculate confidence score based on anomaly metrics
   */
  private calculateConfidence(anomaly: Anomaly): number {
    // Z-score based confidence calculation
    const zScore = anomaly.metrics.zScore || anomaly.metrics.z_score || 0;

    if (zScore > 3.5) return 0.95;
    if (zScore > 3.0) return 0.9;
    if (zScore > 2.5) return 0.85;
    if (zScore > 2.0) return 0.75;

    // Severity-based confidence for non-statistical anomalies
    switch (anomaly.severity) {
      case 'urgent':
      case 'critical':
        return 0.9;
      case 'warning':
        return 0.75;
      case 'info':
        return 0.6;
      default:
        return 0.7;
    }
  }
}
