/**
 * Main AI Supplier Discovery Engine
 * Orchestrates the entire discovery process
 */

import {
  SupplierDiscoveryRequest,
  SupplierDiscoveryResponse,
  DiscoveredSupplierData
} from './types';
import { dataExtractor } from './extractors';
import { dataProcessor } from './processor';
import { supplierCache } from './cache';
import { DISCOVERY_CONFIG } from './config';

export class SupplierDiscoveryEngine {
  private isInitialized = false;
  private requestQueue: Array<{ request: SupplierDiscoveryRequest; resolve: Function; reject: Function }> = [];
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
          sourcesUsed: []
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
          sourcesUsed: cached.sources
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
            sourcesUsed: []
          };
        }

        // Process and validate extracted data
        const discoveredData = await dataProcessor.processExtractionResults(extractionResults);

        if (!discoveredData) {
          return {
            success: false,
            error: 'Unable to process supplier data - insufficient information or low confidence',
            processingTime: Date.now() - startTime,
            sourcesUsed: [...new Set(extractionResults.map(r => r.source))]
          };
        }

        // Cache the results
        supplierCache.set(request.supplierName, discoveredData, request.additionalContext);

        // Return successful response
        return {
          success: true,
          data: discoveredData,
          processingTime: Date.now() - startTime,
          sourcesUsed: discoveredData.sources
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
        sourcesUsed: []
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
        this.discoverSupplier(request).catch(error => ({
          success: false,
          error: error.message,
          processingTime: 0,
          sourcesUsed: []
        } as SupplierDiscoveryResponse))
      );

      const batchResults = await Promise.all(batchPromises);
      results.push(...batchResults);

      // Small delay between batches
      if (i + batchSize < requests.length) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    console.log(`Bulk discovery completed: ${results.filter(r => r.success).length}/${requests.length} successful`);
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
      isInitialized: this.isInitialized
    };
  }

  /**
   * Refresh cached supplier data
   */
  async refreshSupplierData(
    supplierName: string,
    additionalContext?: any
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
    return !!(
      request &&
      request.supplierName &&
      request.supplierName.trim().length >= 2
    );
  }

  private async queueRequest(request: SupplierDiscoveryRequest): Promise<SupplierDiscoveryResponse> {
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
    if (this.requestQueue.length > 0 && this.activeRequests < DISCOVERY_CONFIG.MAX_CONCURRENT_REQUESTS) {
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
  async healthCheck(): Promise<{ healthy: boolean; details: any }> {
    try {
      const stats = this.getStatistics();

      return {
        healthy: this.isInitialized && this.activeRequests < DISCOVERY_CONFIG.MAX_CONCURRENT_REQUESTS,
        details: {
          initialized: this.isInitialized,
          activeRequests: this.activeRequests,
          maxConcurrentRequests: DISCOVERY_CONFIG.MAX_CONCURRENT_REQUESTS,
          queueLength: this.requestQueue.length,
          cacheSize: stats.cacheStats.keys,
          cacheHitRate: stats.cacheStats.hitRate
        }
      };
    } catch (error) {
      return {
        healthy: false,
        details: { error: error instanceof Error ? error.message : 'Unknown error' }
      };
    }
  }
}

// Export singleton instance
export const supplierDiscoveryEngine = new SupplierDiscoveryEngine();