// @ts-nocheck
/**
 * Enhanced React Hook for Supplier Discovery with Web Integration
 */

import { useState, useCallback } from 'react';
import { DiscoveredSupplierData } from '@/lib/supplier-discovery/types';
import { supplierIntelligenceService, WebDiscoveryResult } from '@/services/ai/SupplierIntelligenceService';

interface UseSupplierDiscoveryState {
  isLoading: boolean;
  data: DiscoveredSupplierData | null;
  error: string | null;
  processingTime: number;
  sourcesUsed: string[];
  confidence: number;
  webResults: WebDiscoveryResult | null;
  searchType: 'traditional' | 'web-query' | 'web-website' | null;
}

interface DiscoveryRequest {
  supplierName: string;
  additionalContext?: {
    industry?: string;
    region?: string;
    website?: string;
  };
}

interface WebDiscoveryRequest {
  query?: string;
  url?: string;
  searchType: 'query' | 'website';
}

interface DiscoveryResponse {
  success: boolean;
  data?: DiscoveredSupplierData;
  error?: string;
  metadata?: {
    processingTime: number;
    sourcesUsed: string[];
    confidence: number;
  };
}

export function useSupplierDiscovery() {
  const [state, setState] = useState<UseSupplierDiscoveryState>({
    isLoading: false,
    data: null,
    error: null,
    processingTime: 0,
    sourcesUsed: [],
    confidence: 0,
    webResults: null,
    searchType: null
  });

  // Traditional supplier discovery (existing functionality)
  const discoverSupplier = useCallback(async (request: DiscoveryRequest) => {
    setState(prev => ({ ...prev, isLoading: true, error: null, searchType: 'traditional' }));

    try {
      const response = await fetch('/api/suppliers/discovery', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(request)
      });

      const result: DiscoveryResponse = await response.json();

      if (result.success && result.data) {
        setState(prev => ({
          ...prev,
          isLoading: false,
          data: result.data,
          error: null,
          processingTime: result.metadata?.processingTime || 0,
          sourcesUsed: result.metadata?.sourcesUsed || [],
          confidence: result.metadata?.confidence || 0
        }));
      } else {
        setState(prev => ({
          ...prev,
          isLoading: false,
          error: result.error || 'Failed to discover supplier information',
          processingTime: result.metadata?.processingTime || 0,
          sourcesUsed: result.metadata?.sourcesUsed || []
        }));
      }
    } catch (error) {
      console.error('Supplier discovery error:', error);
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: error instanceof Error ? error.message : 'Network error occurred'
      }));
    }
  }, []);

  // Web-based supplier discovery (new functionality)
  const discoverFromWeb = useCallback(async (request: WebDiscoveryRequest) => {
    setState(prev => ({ ...prev, isLoading: true, error: null, searchType: request.searchType === 'query' ? 'web-query' : 'web-website' }));

    const startTime = Date.now();

    try {
      let webResult: WebDiscoveryResult

      if (request.searchType === 'website' && request.url) {
        webResult = await supplierIntelligenceService.extractFromWebsite(request.url)
      } else if (request.searchType === 'query' && request.query) {
        webResult = await supplierIntelligenceService.discoverSuppliers(request.query)
      } else {
        throw new Error('Invalid web discovery request')
      }

      const processingTime = Date.now() - startTime

      if (webResult.success) {
        setState(prev => ({
          ...prev,
          isLoading: false,
          webResults: webResult,
          error: null,
          processingTime,
          sourcesUsed: webResult.metadata?.sources || [],
          confidence: webResult.metadata?.confidence || 0
        }))

        return webResult
      } else {
        setState(prev => ({
          ...prev,
          isLoading: false,
          error: webResult.error || 'Failed to discover supplier from web',
          processingTime,
          sourcesUsed: webResult.metadata?.sources || []
        }))
        return webResult
      }
    } catch (error) {
      console.error('Web discovery error:', error)
      const processingTime = Date.now() - startTime
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: error instanceof Error ? error.message : 'Web discovery failed',
        processingTime
      }))
      return {
        success: false,
        data: [],
        error: error instanceof Error ? error.message : 'Web discovery failed',
        metadata: {
          searchType: request.searchType,
          totalResults: 0,
          confidence: 0,
          sources: []
        }
      }
    }
  }, [])

  // Transform web discovery results to form data
  const transformWebResultsToFormData = useCallback((webResult: WebDiscoveryResult) => {
    if (!webResult.success || !webResult.data || webResult.data.length === 0) {
      return null
    }

    // Take the first result (highest confidence)
    const firstResult = webResult.data[0]
    return supplierIntelligenceService.transformToFormData(firstResult)
  }, [])

  const refreshSupplier = useCallback(async (request: DiscoveryRequest) => {
    setState(prev => ({ ...prev, isLoading: true, error: null }));

    try {
      const response = await fetch('/api/suppliers/discovery', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(request)
      });

      const result: DiscoveryResponse = await response.json();

      if (result.success && result.data) {
        setState(prev => ({
          ...prev,
          isLoading: false,
          data: result.data,
          error: null,
          processingTime: result.metadata?.processingTime || 0,
          sourcesUsed: result.metadata?.sourcesUsed || [],
          confidence: result.metadata?.confidence || 0
        }));
      } else {
        setState(prev => ({
          ...prev,
          isLoading: false,
          error: result.error || 'Failed to refresh supplier information'
        }));
      }
    } catch (error) {
      console.error('Supplier refresh error:', error);
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: error instanceof Error ? error.message : 'Network error occurred'
      }));
    }
  }, []);

  const clearState = useCallback(() => {
    setState({
      isLoading: false,
      data: null,
      error: null,
      processingTime: 0,
      sourcesUsed: [],
      confidence: 0,
      webResults: null,
      searchType: null
    });
  }, []);

  // Utility function to validate web results
  const validateWebResults = useCallback((webResult: WebDiscoveryResult) => {
    if (!webResult.success || !webResult.data || webResult.data.length === 0) {
      return { isValid: false, issues: ['No valid data found'] }
    }

    const issues: string[] = []
    let validCount = 0

    webResult.data.forEach((data, index) => {
      const validation = supplierIntelligenceService.validateExtractedData(data)
      if (validation.isValid) {
        validCount++
      } else {
        issues.push(`Result ${index + 1}: ${validation.issues.join(', ')}`)
      }
    })

    return {
      isValid: validCount > 0,
      issues,
      validCount,
      totalCount: webResult.data.length
    }
  }, [])

  return {
    ...state,
    discoverSupplier,
    discoverFromWeb,
    transformWebResultsToFormData,
    refreshSupplier,
    clearState,
    validateWebResults
  };
}