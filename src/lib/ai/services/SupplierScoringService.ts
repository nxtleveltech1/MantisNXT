import { db } from '@/lib/database';
import {
  AIServiceBase,
  type AIServiceBaseOptions,
  type AIServiceRequestOptions,
  type AIServiceResponse,
} from './base';

export interface SupplierScore {
  supplierId: string;
  supplierName: string;
  overallScore: number; // 0-100
  categories: {
    reliability: number;
    quality: number;
    pricing: number;
    responsiveness: number;
    compliance: number;
  };
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  recommendations: string[];
  trends: {
    scoreChange30d: number;
    scoreChange90d: number;
  };
  metadata: Record<string, unknown>;
}

export interface SupplierPerformanceData {
  supplierId: string;
  deliveryMetrics: {
    onTimeDeliveryRate: number;
    avgDeliveryDays: number;
    totalDeliveries: number;
  };
  qualityMetrics: {
    defectRate: number;
    returnRate: number;
    qualityComplaints: number;
  };
  pricingMetrics: {
    avgPriceVariance: number;
    competitivenessScore: number;
  };
  responsiveness: {
    avgResponseTimeHours: number;
    communicationRating: number;
  };
}

export class SupplierScoringService extends AIServiceBase<AIServiceRequestOptions> {
  constructor(options?: AIServiceBaseOptions) {
    super('SupplierScoringService', options);
  }

  /**
   * Calculate comprehensive supplier score
   */
  async calculateScore(
    orgId: string,
    supplierId: string,
    options?: AIServiceRequestOptions
  ): Promise<AIServiceResponse<SupplierScore>> {
    return this.executeOperation(
      'supplier.score',
      async ({ service, runtimeOptions }) => {
        // Fetch supplier performance data
        const performanceData = await this.getSupplierPerformance(orgId, supplierId);
        const supplier = await this.getSupplierInfo(supplierId);

        // Calculate individual category scores
        const categories = {
          reliability: this.calculateReliabilityScore(performanceData),
          quality: this.calculateQualityScore(performanceData),
          pricing: this.calculatePricingScore(performanceData),
          responsiveness: this.calculateResponsivenessScore(performanceData),
          compliance: await this.calculateComplianceScore(orgId, supplierId),
        };

        // Calculate weighted overall score
        const overallScore = this.calculateOverallScore(categories);

        // Get AI recommendations
        const aiAnalysis = await this.getAIRecommendations(
          service,
          runtimeOptions,
          supplier,
          performanceData,
          categories,
          overallScore
        );

        // Determine risk level
        const riskLevel = this.determineRiskLevel(overallScore, categories);

        // Get historical trends
        const trends = await this.getScoreTrends(orgId, supplierId);

        // Store prediction
        await this.storePrediction(orgId, supplierId, {
          overallScore,
          categories,
          riskLevel,
          recommendations: aiAnalysis.recommendations,
        });

        return {
          supplierId,
          supplierName: supplier.name,
          overallScore,
          categories,
          riskLevel,
          recommendations: aiAnalysis.recommendations,
          trends,
          metadata: {
            dataPoints: performanceData,
            analysisDate: new Date().toISOString(),
            aiModel: aiAnalysis.model,
          },
        };
      },
      options,
      { supplierId }
    );
  }

  /**
   * Batch score multiple suppliers
   */
  async batchScore(
    orgId: string,
    supplierIds: string[],
    options?: AIServiceRequestOptions
  ): Promise<AIServiceResponse<SupplierScore[]>> {
    return this.executeOperation(
      'supplier.batch_score',
      async () => {
        const scores: SupplierScore[] = [];

        for (const supplierId of supplierIds) {
          try {
            const result = await this.calculateScore(orgId, supplierId, options);
            if (result.data) {
              scores.push(result.data);
            }
          } catch (error) {
            console.error(`Failed to score supplier ${supplierId}:`, error);
          }
        }

        return scores;
      },
      options,
      { supplierCount: supplierIds.length }
    );
  }

  /**
   * Get supplier performance metrics
   */
  private async getSupplierPerformance(
    orgId: string,
    supplierId: string
  ): Promise<SupplierPerformanceData> {
    const result = await db.query(
      `
      WITH delivery_metrics AS (
        SELECT
          COUNT(*) as total_deliveries,
          AVG(CASE WHEN delivered_on_time THEN 1 ELSE 0 END) as on_time_rate,
          AVG(EXTRACT(DAY FROM delivery_date - order_date)) as avg_delivery_days
        FROM purchase_orders
        WHERE supplier_id = $1
          AND status = 'completed'
          AND created_at >= NOW() - INTERVAL '90 days'
      ),
      quality_metrics AS (
        SELECT
          COALESCE(AVG(quality_rating), 5.0) as avg_quality,
          COUNT(*) FILTER (WHERE quality_rating < 3) as quality_complaints
        FROM supplier_reviews
        WHERE supplier_id = $1
          AND created_at >= NOW() - INTERVAL '90 days'
      )
      SELECT
        dm.total_deliveries,
        dm.on_time_rate,
        dm.avg_delivery_days,
        qm.avg_quality,
        qm.quality_complaints
      FROM delivery_metrics dm
      CROSS JOIN quality_metrics qm
      `,
      [supplierId]
    );

    const row = result.rows[0] || {};

    return {
      supplierId,
      deliveryMetrics: {
        onTimeDeliveryRate: parseFloat(row.on_time_rate) || 0,
        avgDeliveryDays: parseFloat(row.avg_delivery_days) || 0,
        totalDeliveries: parseInt(row.total_deliveries) || 0,
      },
      qualityMetrics: {
        defectRate: 0, // Calculate from returns/defects
        returnRate: 0,
        qualityComplaints: parseInt(row.quality_complaints) || 0,
      },
      pricingMetrics: {
        avgPriceVariance: 0,
        competitivenessScore: 0.7,
      },
      responsiveness: {
        avgResponseTimeHours: 24,
        communicationRating: parseFloat(row.avg_quality) || 5,
      },
    };
  }

  /**
   * Get supplier basic info
   */
  private async getSupplierInfo(supplierId: string): Promise<{ name: string }> {
    const result = await db.query(`SELECT name FROM public.suppliers WHERE id = $1`, [supplierId]);
    return result.rows[0] || { name: 'Unknown' };
  }

  /**
   * Calculate reliability score (0-100)
   */
  private calculateReliabilityScore(data: SupplierPerformanceData): number {
    const onTimeWeight = 0.7;
    const deliverySpeedWeight = 0.3;

    const onTimeScore = data.deliveryMetrics.onTimeDeliveryRate * 100;
    const deliverySpeedScore = Math.max(0, 100 - (data.deliveryMetrics.avgDeliveryDays - 7) * 5);

    return Math.round(onTimeScore * onTimeWeight + deliverySpeedScore * deliverySpeedWeight);
  }

  /**
   * Calculate quality score (0-100)
   */
  private calculateQualityScore(data: SupplierPerformanceData): number {
    const defectScore = Math.max(0, 100 - data.qualityMetrics.defectRate * 100);
    const returnScore = Math.max(0, 100 - data.qualityMetrics.returnRate * 100);
    const complaintScore = Math.max(0, 100 - data.qualityMetrics.qualityComplaints * 10);

    return Math.round((defectScore + returnScore + complaintScore) / 3);
  }

  /**
   * Calculate pricing competitiveness score (0-100)
   */
  private calculatePricingScore(data: SupplierPerformanceData): number {
    return Math.round(data.pricingMetrics.competitivenessScore * 100);
  }

  /**
   * Calculate responsiveness score (0-100)
   */
  private calculateResponsivenessScore(data: SupplierPerformanceData): number {
    const responseTimeScore = Math.max(
      0,
      100 - (data.responsiveness.avgResponseTimeHours - 24) * 2
    );
    const communicationScore = (data.responsiveness.communicationRating / 5) * 100;

    return Math.round((responseTimeScore + communicationScore) / 2);
  }

  /**
   * Calculate compliance score
   */
  private async calculateComplianceScore(orgId: string, supplierId: string): Promise<number> {
    // Check for compliance issues, certifications, etc.
    return 85; // Default high score
  }

  /**
   * Calculate weighted overall score
   */
  private calculateOverallScore(categories: SupplierScore['categories']): number {
    const weights = {
      reliability: 0.3,
      quality: 0.3,
      pricing: 0.2,
      responsiveness: 0.1,
      compliance: 0.1,
    };

    const score =
      categories.reliability * weights.reliability +
      categories.quality * weights.quality +
      categories.pricing * weights.pricing +
      categories.responsiveness * weights.responsiveness +
      categories.compliance * weights.compliance;

    return Math.round(score);
  }

  /**
   * Get AI-generated recommendations
   */
  private async getAIRecommendations(
    service: unknown,
    runtimeOptions: unknown,
    supplier: unknown,
    data: SupplierPerformanceData,
    categories: SupplierScore['categories'],
    overallScore: number
  ): Promise<{ recommendations: string[]; model?: string }> {
    const prompt = `
Analyze the following supplier performance and provide actionable recommendations:

Supplier: ${supplier.name}
Overall Score: ${overallScore}/100

Category Scores:
- Reliability: ${categories.reliability}/100
- Quality: ${categories.quality}/100
- Pricing: ${categories.pricing}/100
- Responsiveness: ${categories.responsiveness}/100
- Compliance: ${categories.compliance}/100

Performance Data:
- On-time delivery: ${(data.deliveryMetrics.onTimeDeliveryRate * 100).toFixed(1)}%
- Average delivery time: ${data.deliveryMetrics.avgDeliveryDays.toFixed(1)} days
- Total deliveries: ${data.deliveryMetrics.totalDeliveries}

Provide 3-5 specific, actionable recommendations in JSON array format:
["recommendation 1", "recommendation 2", ...]
`.trim();

    try {
      const response = await service.generateText(prompt, {
        ...runtimeOptions,
        temperature: 0.3,
        maxTokens: 500,
      });

      const jsonMatch = response.text.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        const recommendations = JSON.parse(jsonMatch[0]);
        return { recommendations, model: response.model };
      }
    } catch (error) {
      console.error('AI recommendations failed:', error);
    }

    // Fallback recommendations
    return {
      recommendations: this.getFallbackRecommendations(categories, overallScore),
    };
  }

  /**
   * Fallback recommendations when AI fails
   */
  private getFallbackRecommendations(
    categories: SupplierScore['categories'],
    overallScore: number
  ): string[] {
    const recommendations: string[] = [];

    if (categories.reliability < 70) {
      recommendations.push('Schedule regular check-ins to improve delivery reliability');
    }
    if (categories.quality < 70) {
      recommendations.push('Implement quality audit process for incoming shipments');
    }
    if (categories.pricing < 70) {
      recommendations.push('Negotiate better pricing or explore alternative suppliers');
    }
    if (categories.responsiveness < 70) {
      recommendations.push('Establish clear communication protocols and SLAs');
    }
    if (overallScore < 60) {
      recommendations.push('Consider supplier diversification to reduce risk');
    }

    return recommendations.length > 0
      ? recommendations
      : ['Maintain current supplier relationship with ongoing monitoring'];
  }

  /**
   * Determine risk level based on score
   */
  private determineRiskLevel(
    overallScore: number,
    categories: SupplierScore['categories']
  ): 'low' | 'medium' | 'high' | 'critical' {
    if (overallScore < 50 || categories.reliability < 40 || categories.quality < 40) {
      return 'critical';
    }
    if (overallScore < 70) {
      return 'high';
    }
    if (overallScore < 85) {
      return 'medium';
    }
    return 'low';
  }

  /**
   * Get score trends
   */
  private async getScoreTrends(
    orgId: string,
    supplierId: string
  ): Promise<SupplierScore['trends']> {
    const result = await db.query(
      `
      WITH scores AS (
        SELECT
          prediction_data->>'overallScore' as score,
          created_at
        FROM ai_prediction
        WHERE org_id = $1
          AND service_type = 'supplier_scoring'
          AND entity_id = $2
          AND created_at >= NOW() - INTERVAL '90 days'
        ORDER BY created_at DESC
      )
      SELECT
        (SELECT score FROM scores ORDER BY created_at DESC LIMIT 1) as current_score,
        (SELECT score FROM scores WHERE created_at <= NOW() - INTERVAL '30 days' ORDER BY created_at DESC LIMIT 1) as score_30d,
        (SELECT score FROM scores WHERE created_at <= NOW() - INTERVAL '90 days' ORDER BY created_at DESC LIMIT 1) as score_90d
      FROM scores
      LIMIT 1
      `,
      [orgId, supplierId]
    );

    const row = result.rows[0] || {};
    const current = parseFloat(row.current_score) || 0;
    const score30d = parseFloat(row.score_30d) || current;
    const score90d = parseFloat(row.score_90d) || current;

    return {
      scoreChange30d: Math.round(current - score30d),
      scoreChange90d: Math.round(current - score90d),
    };
  }

  /**
   * Store prediction in database
   */
  private async storePrediction(orgId: string, supplierId: string, data: unknown): Promise<void> {
    await db.query(
      `
      INSERT INTO ai_prediction (
        org_id, service_type, entity_type, entity_id,
        prediction_data, confidence_score, expires_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, NOW() + INTERVAL '7 days')
      `,
      [
        orgId,
        'supplier_scoring',
        'supplier',
        supplierId,
        JSON.stringify(data),
        data.overallScore / 100, // Normalize to 0-1
      ]
    );
  }
}
