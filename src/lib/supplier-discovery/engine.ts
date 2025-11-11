// @ts-nocheck

/**
 * Main AI Supplier Discovery Engine
 * Orchestrates the entire discovery process with AI-powered analytics
 */

import type { SupplierDiscoveryRequest, SupplierDiscoveryResponse } from './types';
import { dataExtractor } from './extractors';
import { dataProcessor } from './processor';
import { supplierCache } from './cache';
import { DISCOVERY_CONFIG } from './config';
import type { SupplierScore, SupplierRiskAssessment, SupplierPerformancePrediction, SupplierComparison } from './ai-analytics';
import { supplierAIAnalytics } from './ai-analytics';

export class SupplierDiscoveryEngine {
  private isInitialized = false;
  private requestQueue: Array<{
    request: SupplierDiscoveryRequest;
    resolve: (value: unknown) => void;
    reject: (reason?: unknown) => void;
  }> = [];
  private activeRequests = 0;

  /**
   * Initialize the discovery engine
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    try {
      await dataExtractor.initialize();
      this.isInitialized = true;
      console.log('Supplier Discovery Engine initialized');
    } catch (error) {
      console.error('Failed to initialize discovery engine:', error);
      throw error;
    }
  }

  /**
   * Cleanup resources
   */
  async cleanup(): Promise<void> {
    await dataExtractor.cleanup();
    this.isInitialized = false;
    console.log('Discovery engine cleanup completed');
  }

  /**
   * Main discovery method
   */
  async discoverSupplier(request: SupplierDiscoveryRequest): Promise<SupplierDiscoveryResponse> {
    const startTime = Date.now();

    try {
      console.log(`Starting supplier discovery for: ${request.supplierName}`);

      // Validate request
      if (!this.validateRequest(request)) {
        return {
          success: false,
          error: 'Invalid request: supplier name is required',
          processingTime: Date.now() - startTime,
          sourcesUsed: [],
        };
      }

      // Check cache first
      const cached = supplierCache.get(request.supplierName, request.additionalContext);
      if (cached) {
        console.log(`Cache hit for supplier: ${request.supplierName}`);
        return {
          success: true,
          data: cached,
          processingTime: Date.now() - startTime,
          sourcesUsed: cached.sources,
        };
      }

      // Check rate limiting
      if (this.activeRequests >= DISCOVERY_CONFIG.MAX_CONCURRENT_REQUESTS) {
        return this.queueRequest(request);
      }

      this.activeRequests++;

      try {
        // Initialize if needed
        if (!this.isInitialized) {
          await this.initialize();
        }

        // Extract data from multiple sources
        const extractionResults = await dataExtractor.extractSupplierData(request);

        if (extractionResults.length === 0) {
          return {
            success: false,
            error: 'No data found for the specified supplier',
            processingTime: Date.now() - startTime,
            sourcesUsed: [],
          };
        }

        // Process and validate extracted data
        const discoveredData = await dataProcessor.processExtractionResults(extractionResults);

        if (!discoveredData) {
          return {
            success: false,
            error: 'Unable to process supplier data - insufficient information or low confidence',
            processingTime: Date.now() - startTime,
            sourcesUsed: [...new Set(extractionResults.map(r => r.source))],
          };
        }

        // Cache the results
        supplierCache.set(request.supplierName, discoveredData, request.additionalContext);

        // Return successful response
        return {
          success: true,
          data: discoveredData,
          processingTime: Date.now() - startTime,
          sourcesUsed: discoveredData.sources,
        };
      } finally {
        this.activeRequests--;
        this.processQueue();
      }
    } catch (error) {
      console.error('Supplier discovery failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
        processingTime: Date.now() - startTime,
        sourcesUsed: [],
      };
    }
  }

  /**
   * Bulk discovery for multiple suppliers
   */
  async discoverMultipleSuppliers(
    requests: SupplierDiscoveryRequest[]
  ): Promise<SupplierDiscoveryResponse[]> {
    console.log(`Starting bulk discovery for ${requests.length} suppliers`);

    const results: SupplierDiscoveryResponse[] = [];

    // Process in batches to avoid overwhelming the system
    const batchSize = Math.min(DISCOVERY_CONFIG.MAX_CONCURRENT_REQUESTS, 3);

    for (let i = 0; i < requests.length; i += batchSize) {
      const batch = requests.slice(i, i + batchSize);

      const batchPromises = batch.map(request =>
        this.discoverSupplier(request).catch(
          error =>
            (({
              success: false,
              error: error.message,
              processingTime: 0,
              sourcesUsed: []
            }) as SupplierDiscoveryResponse)
        )
      );

      const batchResults = await Promise.all(batchPromises);
      results.push(...batchResults);

      // Small delay between batches
      if (i + batchSize < requests.length) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    console.log(
      `Bulk discovery completed: ${results.filter(r => r.success).length}/${requests.length} successful`
    );
    return results;
  }

  /**
   * Get discovery statistics
   */
  getStatistics() {
    const cacheStats = supplierCache.getStats();

    return {
      cacheStats,
      activeRequests: this.activeRequests,
      queueLength: this.requestQueue.length,
      isInitialized: this.isInitialized,
    };
  }

  /**
   * Refresh cached supplier data
   */
  async refreshSupplierData(
    supplierName: string,
    additionalContext?: unknown
  ): Promise<SupplierDiscoveryResponse> {
    // Remove from cache
    supplierCache.delete(supplierName, additionalContext);

    // Perform fresh discovery
    return this.discoverSupplier({ supplierName, additionalContext });
  }

  /**
   * Update supplier data with higher confidence if available
   */
  async updateSupplierIfBetter(
    request: SupplierDiscoveryRequest
  ): Promise<SupplierDiscoveryResponse> {
    const result = await this.discoverSupplier(request);

    if (result.success && result.data) {
      const updated = supplierCache.updateIfBetter(
        request.supplierName,
        result.data,
        request.additionalContext
      );

      if (updated) {
        console.log(`Updated cached data for ${request.supplierName} with higher confidence`);
      }
    }

    return result;
  }

  /**
   * Private helper methods
   */
  private validateRequest(request: SupplierDiscoveryRequest): boolean {
    return !!(request && request.supplierName && request.supplierName.trim().length >= 2);
  }

  private async queueRequest(
    request: SupplierDiscoveryRequest
  ): Promise<SupplierDiscoveryResponse> {
    return new Promise((resolve, reject) => {
      this.requestQueue.push({ request, resolve, reject });

      // Set timeout for queued requests
      setTimeout(() => {
        const index = this.requestQueue.findIndex(item => item.request === request);
        if (index !== -1) {
          this.requestQueue.splice(index, 1);
          reject(new Error('Request timeout - too many concurrent requests'));
        }
      }, DISCOVERY_CONFIG.TIMEOUT_MS);
    });
  }

  private async processQueue(): Promise<void> {
    if (
      this.requestQueue.length > 0 &&
      this.activeRequests < DISCOVERY_CONFIG.MAX_CONCURRENT_REQUESTS
    ) {
      const { request, resolve, reject } = this.requestQueue.shift()!;

      try {
        const result = await this.discoverSupplier(request);
        resolve(result);
      } catch (error) {
        reject(error);
      }
    }
  }

  /**
   * Health check
   */
  async healthCheck(): Promise<{ healthy: boolean; details: unknown }> {
    try {
      const stats = this.getStatistics();

      return {
        healthy:
          this.isInitialized && this.activeRequests < DISCOVERY_CONFIG.MAX_CONCURRENT_REQUESTS,
        details: {
          initialized: this.isInitialized,
          activeRequests: this.activeRequests,
          maxConcurrentRequests: DISCOVERY_CONFIG.MAX_CONCURRENT_REQUESTS,
          queueLength: this.requestQueue.length,
          cacheSize: stats.cacheStats.keys,
          cacheHitRate: stats.cacheStats.hitRate,
        },
      };
    } catch (error) {
      return {
        healthy: false,
        details: { error: error instanceof Error ? error.message : 'Unknown error' },
      };
    }
  }

  // ============================================================================
  // AI ANALYTICS INTEGRATION METHODS
  // ============================================================================

  /**
   * Score a supplier using AI-powered comprehensive analysis
   *
   * @param supplierId - The supplier database ID
   * @returns Comprehensive supplier score with insights
   */
  async scoreSupplier(supplierId: number): Promise<SupplierScore> {
    console.log(`Discovery Engine: Scoring supplier ${supplierId} with AI analytics`);
    return supplierAIAnalytics.scoreSupplier(supplierId);
  }

  /**
   * Assess supplier risks using anomaly detection
   *
   * @param supplierId - The supplier database ID
   * @returns Risk assessment with anomalies and recommendations
   */
  async assessSupplierRisk(supplierId: number): Promise<SupplierRiskAssessment> {
    console.log(`Discovery Engine: Assessing risk for supplier ${supplierId}`);
    return supplierAIAnalytics.assessSupplierRisk(supplierId);
  }

  /**
   * Predict supplier performance using AI forecasting
   *
   * @param supplierId - The supplier database ID
   * @param predictionType - Type of prediction to generate
   * @param forecastDays - Number of days to forecast (default: 30)
   * @returns Performance predictions with trends and factors
   */
  async predictSupplierPerformance(
    supplierId: number,
    predictionType: 'on_time_delivery' | 'quality_score' | 'cost_trend' | 'order_volume' = 'on_time_delivery',
    forecastDays: number = 30
  ): Promise<SupplierPerformancePrediction> {
    console.log(`Discovery Engine: Predicting ${predictionType} for supplier ${supplierId}`);
    return supplierAIAnalytics.predictSupplierPerformance(supplierId, predictionType, forecastDays);
  }

  /**
   * Compare multiple suppliers with AI-powered analysis
   *
   * @param supplierIds - Array of supplier database IDs to compare
   * @returns Comparative analysis with rankings and recommendations
   */
  async compareSuppliers(supplierIds: number[]): Promise<SupplierComparison> {
    console.log(`Discovery Engine: Comparing ${supplierIds.length} suppliers`);
    return supplierAIAnalytics.compareSuppliers(supplierIds);
  }

  /**
   * Get comprehensive AI insights for a supplier
   * Combines scoring, risk assessment, and predictions
   *
   * @param supplierId - The supplier database ID
   * @returns Comprehensive supplier insights
   */
  async getSupplierAIInsights(supplierId: number): Promise<{
    score: SupplierScore;
    risk: SupplierRiskAssessment;
    predictions: {
      onTimeDelivery: SupplierPerformancePrediction;
      qualityScore: SupplierPerformancePrediction;
    };
    summary: {
      overallHealth: 'excellent' | 'good' | 'fair' | 'poor';
      recommendation: string;
      urgentActions: string[];
    };
  }> {
    console.log(`Discovery Engine: Getting comprehensive AI insights for supplier ${supplierId}`);

    try {
      // Run all analyses in parallel for performance
      const [score, risk, deliveryPrediction, qualityPrediction] = await Promise.all([
        this.scoreSupplier(supplierId),
        this.assessSupplierRisk(supplierId),
        this.predictSupplierPerformance(supplierId, 'on_time_delivery', 30),
        this.predictSupplierPerformance(supplierId, 'quality_score', 30),
      ]);

      // Determine overall health
      let overallHealth: 'excellent' | 'good' | 'fair' | 'poor';
      if (score.overallScore >= 85 && risk.riskLevel === 'low') {
        overallHealth = 'excellent';
      } else if (score.overallScore >= 70 && ['low', 'medium'].includes(risk.riskLevel)) {
        overallHealth = 'good';
      } else if (score.overallScore >= 60) {
        overallHealth = 'fair';
      } else {
        overallHealth = 'poor';
      }

      // Generate overall recommendation
      let recommendation: string;
      if (overallHealth === 'excellent') {
        recommendation = 'Preferred supplier - maintain strong relationship and consider expanding partnership';
      } else if (overallHealth === 'good') {
        recommendation = 'Reliable supplier - continue monitoring performance and address minor issues';
      } else if (overallHealth === 'fair') {
        recommendation = 'Secondary supplier - monitor closely and develop improvement plan';
      } else {
        recommendation = 'High-risk supplier - consider alternative suppliers and implement strict oversight';
      }

      // Collect urgent actions
      const urgentActions: string[] = [];
      if (risk.riskLevel === 'critical' || risk.riskLevel === 'high') {
        urgentActions.push('Address critical risks immediately');
        risk.risks
          .filter(r => r.severity === 'critical' || r.severity === 'high')
          .slice(0, 3)
          .forEach(r => urgentActions.push(r.mitigation));
      }
      if (score.overallScore < 60) {
        urgentActions.push('Review supplier performance and develop improvement plan');
      }
      if (deliveryPrediction.trend === 'declining' || qualityPrediction.trend === 'declining') {
        urgentActions.push('Investigate declining performance trends');
      }

      return {
        score,
        risk,
        predictions: {
          onTimeDelivery: deliveryPrediction,
          qualityScore: qualityPrediction,
        },
        summary: {
          overallHealth,
          recommendation,
          urgentActions: urgentActions.length > 0 ? urgentActions : ['No urgent actions required'],
        },
      };
    } catch (error) {
      console.error('Discovery Engine: Failed to get AI insights:', error);
      throw new Error(`Failed to get supplier insights: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
}

// Export singleton instance
export const supplierDiscoveryEngine = new SupplierDiscoveryEngine();
