/**
 * React Hook for Supplier Discovery
 */

import { useState, useCallback } from 'react';
import { DiscoveredSupplierData } from '@/lib/supplier-discovery/types';

interface UseSupplierDiscoveryState {
  isLoading: boolean;
  data: DiscoveredSupplierData | null;
  error: string | null;
  processingTime: number;
  sourcesUsed: string[];
  confidence: number;
}

interface DiscoveryRequest {
  supplierName: string;
  additionalContext?: {
    industry?: string;
    region?: string;
    website?: string;
  };
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
    confidence: 0
  });

  const discoverSupplier = useCallback(async (request: DiscoveryRequest) => {
    setState(prev => ({ ...prev, isLoading: true, error: null }));

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
        setState({
          isLoading: false,
          data: result.data,
          error: null,
          processingTime: result.metadata?.processingTime || 0,
          sourcesUsed: result.metadata?.sourcesUsed || [],
          confidence: result.metadata?.confidence || 0
        });
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
        setState({
          isLoading: false,
          data: result.data,
          error: null,
          processingTime: result.metadata?.processingTime || 0,
          sourcesUsed: result.metadata?.sourcesUsed || [],
          confidence: result.metadata?.confidence || 0
        });
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
      confidence: 0
    });
  }, []);

  return {
    ...state,
    discoverSupplier,
    refreshSupplier,
    clearState
  };
}