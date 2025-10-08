/**
 * AI Supplier Intelligence Service
 * Core AI-powered supplier analysis and discovery engine
 */

import { query, withTransaction } from '@/lib/database/unified-connection';
import type { PoolClient } from 'pg';

export interface SupplierCriteria {
  query?: string;
  category?: string[];
  location?: string[];
  certifications?: string[];
  capacity?: {
    min: number;
    max: number;
  };
  priceRange?: {
    min: number;
    max: number;
  };
}

export interface SupplierMatchResult {
  id: string;
  name: string;
  matchScore: number;
  category: string;
  location: string;
  capabilities: string[];
  riskScore: number;
  estimatedPricing: {
    min: number;
    max: number;
    currency: string;
  };
  aiInsights: {
    strengths: string[];
    concerns: string[];
    recommendations: string[];
  };
}

export interface SupplierAnalysis {
  supplierId: string;
  performanceScore: number;
  riskAssessment: {
    overall: number;
    factors: {
      financial: number;
      operational: number;
      compliance: number;
      market: number;
    };
  };
  recommendations: string[];
  insights: string[];
  lastUpdated: Date;
}

export class SupplierIntelligenceService {

  /**
   * AI-powered supplier discovery based on natural language criteria
   */
  async discoverSuppliers(criteria: SupplierCriteria): Promise<{
    suppliers: SupplierMatchResult[];
    metadata: {
      totalFound: number;
      searchConfidence: number;
      processingTime: number;
    };
  }> {
    const startTime = Date.now();

    try {
      // Build intelligent query based on criteria
      const query = this.buildIntelligentQuery(criteria);
      const params = this.extractQueryParameters(criteria);

      console.log('🤖 AI Supplier Discovery Query:', query);

      const result = await pool.query(query, params);
      const suppliers = await this.enrichSupplierData(result.rows);

      const processingTime = Date.now() - startTime;

      return {
        suppliers,
        metadata: {
          totalFound: suppliers.length,
          searchConfidence: this.calculateSearchConfidence(criteria, suppliers),
          processingTime
        }
      };

    } catch (error) {
      console.error('❌ AI Supplier Discovery failed:', error);
      throw new Error('Failed to discover suppliers with AI analysis');
    }
  }

  /**
   * Comprehensive AI analysis of supplier performance and risk
   */
  async analyzeSupplier(supplierId: string): Promise<SupplierAnalysis> {
    // Use withTransaction for atomic analysis operations
    return withTransaction(async (client) => {
      // Get comprehensive supplier data
      const supplierData = await this.getSupplierData(client, supplierId);
      const performanceHistory = await this.getPerformanceHistory(client, supplierId);
      const riskFactors = await this.getRiskFactors(client, supplierId);

      // AI-powered analysis
      const performanceScore = this.calculatePerformanceScore(performanceHistory);
      const riskAssessment = this.assessRisk(riskFactors);
      const insights = await this.generateInsights(supplierData, performanceHistory, riskFactors);
      const recommendations = this.generateRecommendations(performanceScore, riskAssessment);

      return {
        supplierId,
        performanceScore,
        riskAssessment,
        recommendations,
        insights,
        lastUpdated: new Date()
      };
    });
  }

  /**
   * Find similar suppliers using AI similarity matching
   */
  async findSimilarSuppliers(supplierId: string, limit: number = 5): Promise<SupplierMatchResult[]> {
    try {
      // Get reference supplier characteristics
      const referenceSupplier = await this.getSupplierCharacteristics(supplierId);

      const query = `
        WITH supplier_features AS (
          SELECT
            s.id,
            s.name,
            s.primary_category,
            s.geographic_region,
            COALESCE(s.rating, 0) as rating,
            COALESCE(s.payment_terms_days, 30) as payment_terms,
            COALESCE(s.spend_last_12_months, 0) as spend_volume
          FROM suppliers s
          WHERE s.id != $1
            AND s.status = 'active'
        ),
        similarity_scores AS (
          SELECT
            sf.*,
            -- Similarity calculation based on multiple factors
            (
              CASE
                WHEN sf.primary_category = $2 THEN 0.4
                ELSE 0
              END +
              CASE
                WHEN sf.geographic_region = $3 THEN 0.2
                ELSE 0
              END +
              (1 - ABS(sf.rating - $4) / 5.0) * 0.2 +
              (1 - ABS(sf.payment_terms - $5) / 100.0) * 0.1 +
              (1 - ABS(LOG(NULLIF(sf.spend_volume, 0) + 1) - LOG($6 + 1)) / 10.0) * 0.1
            ) as similarity_score
          FROM supplier_features sf
        )
        SELECT *
        FROM similarity_scores
        WHERE similarity_score > 0.3
        ORDER BY similarity_score DESC
        LIMIT $7
      `;

      const result = await pool.query(query, [
        supplierId,
        referenceSupplier.category,
        referenceSupplier.region,
        referenceSupplier.rating,
        referenceSupplier.paymentTerms,
        referenceSupplier.spendVolume,
        limit
      ]);

      return await this.enrichSupplierData(result.rows);

    } catch (error) {
      console.error('❌ Similar supplier search failed:', error);
      throw new Error('Failed to find similar suppliers');
    }
  }

  /**
   * Real-time supplier risk monitoring with AI
   */
  async monitorSupplierRisk(supplierId: string): Promise<{
    currentRisk: number;
    riskTrend: 'increasing' | 'decreasing' | 'stable';
    alerts: Array<{
      type: string;
      severity: 'low' | 'medium' | 'high' | 'critical';
      message: string;
      detectedAt: Date;
    }>;
  }> {
    try {
      const query = `
        WITH recent_performance AS (
          SELECT
            supplier_id,
            AVG(overall_rating) as avg_rating,
            COUNT(*) as evaluation_count,
            MAX(evaluation_date) as last_evaluation
          FROM supplier_performance_history
          WHERE supplier_id = $1
            AND evaluation_date >= CURRENT_DATE - INTERVAL '90 days'
          GROUP BY supplier_id
        ),
        payment_analysis AS (
          SELECT
            supplier_id,
            AVG(days_to_pay) as avg_payment_days,
            COUNT(CASE WHEN days_to_pay > payment_terms_days THEN 1 END) as late_payments,
            COUNT(*) as total_payments
          FROM payment_history
          WHERE supplier_id = $1
            AND payment_date >= CURRENT_DATE - INTERVAL '180 days'
          GROUP BY supplier_id
        ),
        contract_status AS (
          SELECT
            supplier_id,
            COUNT(CASE WHEN end_date <= CURRENT_DATE + INTERVAL '30 days' THEN 1 END) as expiring_contracts,
            COUNT(*) as active_contracts
          FROM contracts
          WHERE supplier_id = $1
            AND status = 'active'
          GROUP BY supplier_id
        )
        SELECT
          s.id,
          s.name,
          COALESCE(rp.avg_rating, 0) as performance_rating,
          COALESCE(pa.avg_payment_days, 0) as avg_payment_days,
          COALESCE(pa.late_payments, 0) as late_payments,
          COALESCE(pa.total_payments, 0) as total_payments,
          COALESCE(cs.expiring_contracts, 0) as expiring_contracts,
          COALESCE(cs.active_contracts, 0) as active_contracts
        FROM suppliers s
        LEFT JOIN recent_performance rp ON s.id = rp.supplier_id
        LEFT JOIN payment_analysis pa ON s.id = pa.supplier_id
        LEFT JOIN contract_status cs ON s.id = cs.supplier_id
        WHERE s.id = $1
      `;

      const result = await pool.query(query, [supplierId]);

      if (result.rows.length === 0) {
        throw new Error('Supplier not found');
      }

      const supplierData = result.rows[0];

      // AI risk calculation
      const riskFactors = {
        performanceRisk: this.calculatePerformanceRisk(supplierData),
        paymentRisk: this.calculatePaymentRisk(supplierData),
        contractRisk: this.calculateContractRisk(supplierData),
        operationalRisk: this.calculateOperationalRisk(supplierData)
      };

      const currentRisk = this.aggregateRiskScore(riskFactors);
      const riskTrend = await this.calculateRiskTrend(supplierId);
      const alerts = this.generateRiskAlerts(supplierData, riskFactors);

      return {
        currentRisk,
        riskTrend,
        alerts
      };

    } catch (error) {
      console.error('❌ Supplier risk monitoring failed:', error);
      throw new Error('Failed to monitor supplier risk');
    }
  }

  // Private helper methods

  private buildIntelligentQuery(criteria: SupplierCriteria): string {
    let query = `
      SELECT
        s.id,
        COALESCE(s.name, s.supplier_name, s.company_name) as name,
        s.primary_category as category,
        s.geographic_region as location,
        COALESCE(s.rating, 0) as rating,
        s.payment_terms_days,
        s.spend_last_12_months,
        s.status,
        s.performance_tier
      FROM suppliers s
      WHERE s.status = 'active'
    `;

    const conditions = [];

    if (criteria.category?.length) {
      conditions.push(`s.primary_category = ANY($${conditions.length + 1})`);
    }

    if (criteria.location?.length) {
      conditions.push(`s.geographic_region = ANY($${conditions.length + 1})`);
    }

    if (conditions.length > 0) {
      query += ' AND ' + conditions.join(' AND ');
    }

    query += `
      ORDER BY
        COALESCE(s.rating, 0) DESC,
        COALESCE(s.spend_last_12_months, 0) DESC
      LIMIT 20
    `;

    return query;
  }

  private extractQueryParameters(criteria: SupplierCriteria): any[] {
    const params = [];

    if (criteria.category?.length) {
      params.push(criteria.category);
    }

    if (criteria.location?.length) {
      params.push(criteria.location);
    }

    return params;
  }

  private async enrichSupplierData(supplierRows: any[]): Promise<SupplierMatchResult[]> {
    return supplierRows.map(row => ({
      id: row.id,
      name: row.name || 'Unknown Supplier',
      matchScore: this.calculateMatchScore(row),
      category: row.category || 'General',
      location: row.location || 'Unknown',
      capabilities: this.extractCapabilities(row),
      riskScore: this.calculateBasicRiskScore(row),
      estimatedPricing: {
        min: row.spend_last_12_months ? row.spend_last_12_months * 0.8 : 1000,
        max: row.spend_last_12_months ? row.spend_last_12_months * 1.2 : 5000,
        currency: 'USD'
      },
      aiInsights: {
        strengths: this.generateStrengths(row),
        concerns: this.generateConcerns(row),
        recommendations: this.generateBasicRecommendations(row)
      }
    }));
  }

  private calculateMatchScore(supplierData: any): number {
    let score = 0.5; // Base score

    if (supplierData.rating > 4) score += 0.3;
    else if (supplierData.rating > 3) score += 0.2;
    else if (supplierData.rating > 2) score += 0.1;

    if (supplierData.performance_tier === 'premium') score += 0.2;
    else if (supplierData.performance_tier === 'standard') score += 0.1;

    return Math.min(1.0, score);
  }

  private calculateSearchConfidence(criteria: SupplierCriteria, results: SupplierMatchResult[]): number {
    let confidence = 0.7; // Base confidence

    if (criteria.category?.length) confidence += 0.1;
    if (criteria.location?.length) confidence += 0.1;
    if (results.length > 5) confidence += 0.1;

    return Math.min(1.0, confidence);
  }

  private async getSupplierData(client: PoolClient, supplierId: string): Promise<any> {
    const result = await client.query(`
      SELECT *
      FROM suppliers
      WHERE id = $1
    `, [supplierId]);

    return result.rows[0];
  }

  private async getPerformanceHistory(client: PoolClient, supplierId: string): Promise<any[]> {
    const result = await client.query(`
      SELECT *
      FROM supplier_performance_history
      WHERE supplier_id = $1
      ORDER BY evaluation_date DESC
      LIMIT 12
    `, [supplierId]);

    return result.rows;
  }

  private async getSupplierCharacteristics(supplierId: string): Promise<any> {
    const result = await pool.query(`
      SELECT
        primary_category as category,
        geographic_region as region,
        COALESCE(rating, 0) as rating,
        COALESCE(payment_terms_days, 30) as paymentTerms,
        COALESCE(spend_last_12_months, 0) as spendVolume
      FROM suppliers
      WHERE id = $1
    `, [supplierId]);

    return result.rows[0] || {};
  }

  private calculateBasicRiskScore(supplierData: any): number {
    let risk = 0.3; // Base risk

    if (supplierData.payment_terms_days > 60) risk += 0.3;
    else if (supplierData.payment_terms_days > 45) risk += 0.2;

    if (supplierData.rating < 2) risk += 0.4;
    else if (supplierData.rating < 3) risk += 0.2;

    return Math.min(1.0, risk);
  }

  private extractCapabilities(supplierData: any): string[] {
    const capabilities = [];

    if (supplierData.category) capabilities.push(supplierData.category);
    if (supplierData.performance_tier === 'premium') capabilities.push('Premium Service');
    if (supplierData.rating > 4) capabilities.push('High Quality');
    if (supplierData.payment_terms_days <= 30) capabilities.push('Flexible Payment');

    return capabilities;
  }

  private generateStrengths(supplierData: any): string[] {
    const strengths = [];

    if (supplierData.rating > 4) strengths.push('Excellent performance rating');
    if (supplierData.payment_terms_days <= 30) strengths.push('Favorable payment terms');
    if (supplierData.spend_last_12_months > 100000) strengths.push('Established relationship');

    return strengths;
  }

  private generateConcerns(supplierData: any): string[] {
    const concerns = [];

    if (supplierData.rating < 3) concerns.push('Below average performance rating');
    if (supplierData.payment_terms_days > 60) concerns.push('Extended payment terms');
    if (!supplierData.spend_last_12_months) concerns.push('Limited transaction history');

    return concerns;
  }

  private generateBasicRecommendations(supplierData: any): string[] {
    const recommendations = [];

    if (supplierData.rating > 4) {
      recommendations.push('Consider expanding relationship');
    } else if (supplierData.rating < 3) {
      recommendations.push('Monitor performance closely');
    }

    if (supplierData.payment_terms_days > 45) {
      recommendations.push('Negotiate better payment terms');
    }

    return recommendations;
  }

  // Additional helper methods for risk analysis
  private calculatePerformanceRisk(data: any): number {
    return Math.max(0, 1 - (data.performance_rating / 5));
  }

  private calculatePaymentRisk(data: any): number {
    const latePaymentRate = data.total_payments > 0 ? data.late_payments / data.total_payments : 0;
    return Math.min(1, latePaymentRate * 2);
  }

  private calculateContractRisk(data: any): number {
    return data.active_contracts > 0 ? data.expiring_contracts / data.active_contracts : 0;
  }

  private calculateOperationalRisk(data: any): number {
    // Base operational risk calculation
    return 0.2; // Placeholder
  }

  private aggregateRiskScore(riskFactors: any): number {
    const weights = {
      performanceRisk: 0.3,
      paymentRisk: 0.3,
      contractRisk: 0.2,
      operationalRisk: 0.2
    };

    return Object.entries(riskFactors).reduce((total, [key, value]) => {
      return total + ((value as number) * weights[key as keyof typeof weights]);
    }, 0);
  }

  private async calculateRiskTrend(supplierId: string): Promise<'increasing' | 'decreasing' | 'stable'> {
    // Simplified trend calculation - in production would use historical risk data
    return 'stable';
  }

  private generateRiskAlerts(supplierData: any, riskFactors: any): Array<any> {
    const alerts = [];

    if (riskFactors.paymentRisk > 0.7) {
      alerts.push({
        type: 'payment_risk',
        severity: 'high' as const,
        message: 'High rate of late payments detected',
        detectedAt: new Date()
      });
    }

    if (riskFactors.contractRisk > 0.5) {
      alerts.push({
        type: 'contract_expiry',
        severity: 'medium' as const,
        message: 'Multiple contracts expiring soon',
        detectedAt: new Date()
      });
    }

    return alerts;
  }

  // Placeholder methods for full AI implementation
  private async getRiskFactors(client: PoolClient, supplierId: string): Promise<any> {
    return {}; // Placeholder
  }

  private calculatePerformanceScore(history: any[]): number {
    if (history.length === 0) return 0.5;

    const avgRating = history.reduce((sum, h) => sum + (h.overall_rating || 0), 0) / history.length;
    return avgRating / 5; // Normalize to 0-1 scale
  }

  private assessRisk(factors: any): any {
    return {
      overall: 0.3,
      factors: {
        financial: 0.2,
        operational: 0.3,
        compliance: 0.4,
        market: 0.2
      }
    };
  }

  private async generateInsights(supplierData: any, history: any[], factors: any): Promise<string[]> {
    return ['AI-generated insights would appear here'];
  }

  private generateRecommendations(score: number, risk: any): string[] {
    const recommendations = [];

    if (score > 0.8) {
      recommendations.push('Expand strategic partnership');
    } else if (score < 0.3) {
      recommendations.push('Consider alternative suppliers');
    }

    if (risk.overall > 0.7) {
      recommendations.push('Implement risk mitigation plan');
    }

    return recommendations;
  }
}