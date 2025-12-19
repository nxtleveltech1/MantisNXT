'use client';

import { useActivityStore, generateActivityId } from '@/stores/activity-store';

// Track if we've already patched fetch
let isPatched = false;

/**
 * Patches the global fetch to automatically track API activity
 * Call this once in your app initialization
 */
export function initActivityTracking() {
  if (typeof window === 'undefined' || isPatched) return;
  
  const originalFetch = window.fetch;
  
  window.fetch = async function (...args) {
    const store = useActivityStore.getState();
    const activityId = generateActivityId('fetch');
    
    // Determine the URL for labeling
    let url = '';
    if (typeof args[0] === 'string') {
      url = args[0];
    } else if (args[0] instanceof URL) {
      url = args[0].toString();
    } else if (args[0] instanceof Request) {
      url = args[0].url;
    }
    
    // Only track API calls (not static assets, etc.)
    const isApiCall = url.includes('/api/') || 
                      url.includes('api.') ||
                      (args[1]?.method && args[1].method !== 'GET');
    
    if (isApiCall) {
      const label = url.split('/').pop() || 'request';
      store.startActivity(activityId, 'api', label);
    }
    
    try {
      const response = await originalFetch.apply(this, args);
      return response;
    } finally {
      if (isApiCall) {
        store.endActivity(activityId);
      }
    }
  };
  
  isPatched = true;
}

/**
 * Hook to manually track activity - use for non-fetch operations
 */
export function useActivityTracker() {
  const { startActivity, endActivity, pulse } = useActivityStore();
  
  const track = <T>(
    operation: () => Promise<T>,
    type: 'api' | 'navigation' | 'processing' | 'upload' | 'ai' = 'processing',
    label?: string
  ): Promise<T> => {
    const id = generateActivityId(type);
    startActivity(id, type, label);
    
    return operation().finally(() => {
      endActivity(id);
    });
  };
  
  const startTracking = (
    type: 'api' | 'navigation' | 'processing' | 'upload' | 'ai' = 'processing',
    label?: string
  ) => {
    const id = generateActivityId(type);
    startActivity(id, type, label);
    return () => endActivity(id);
  };
  
  return {
    track,
    startTracking,
    pulse,
    startActivity,
    endActivity,
  };
}

/**
 * Component to initialize activity tracking on mount
 */
export function ActivityTrackingInitializer() {
  if (typeof window !== 'undefined') {
    initActivityTracking();
  }
  return null;
}










