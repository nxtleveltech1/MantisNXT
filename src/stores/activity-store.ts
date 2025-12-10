'use client';

import { create } from 'zustand';

interface ActivitySource {
  id: string;
  type: 'api' | 'navigation' | 'processing' | 'upload' | 'ai';
  startTime: number;
  label?: string;
}

interface ActivityState {
  // Active operations
  activeSources: Map<string, ActivitySource>;
  
  // Metrics
  activityLevel: number; // 0-100
  requestsPerSecond: number;
  totalRequests: number;
  
  // History for smoothing
  recentActivity: number[];
  
  // Actions
  startActivity: (id: string, type: ActivitySource['type'], label?: string) => void;
  endActivity: (id: string) => void;
  pulse: () => void; // Quick activity burst
  
  // Internal
  _updateMetrics: () => void;
}

export const useActivityStore = create<ActivityState>((set, get) => ({
  activeSources: new Map(),
  activityLevel: 0,
  requestsPerSecond: 0,
  totalRequests: 0,
  recentActivity: [],

  startActivity: (id, type, label) => {
    set((state) => {
      const newSources = new Map(state.activeSources);
      newSources.set(id, {
        id,
        type,
        startTime: Date.now(),
        label,
      });
      return { 
        activeSources: newSources,
        totalRequests: state.totalRequests + 1,
      };
    });
    get()._updateMetrics();
  },

  endActivity: (id) => {
    set((state) => {
      const newSources = new Map(state.activeSources);
      newSources.delete(id);
      return { activeSources: newSources };
    });
    get()._updateMetrics();
  },

  pulse: () => {
    const id = `pulse-${Date.now()}-${Math.random()}`;
    get().startActivity(id, 'processing');
    setTimeout(() => get().endActivity(id), 200);
  },

  _updateMetrics: () => {
    set((state) => {
      const activeCount = state.activeSources.size;
      const now = Date.now();
      
      // Calculate activity level based on active sources and types
      let baseLevel = 0;
      state.activeSources.forEach((source) => {
        const duration = now - source.startTime;
        const typeWeight = {
          api: 25,
          navigation: 15,
          processing: 35,
          upload: 40,
          ai: 50,
        }[source.type];
        
        // Longer operations contribute more (with diminishing returns)
        const durationBonus = Math.min(15, Math.log10(duration + 1) * 5);
        baseLevel += typeWeight + durationBonus;
      });
      
      // Track recent activity for smoothing
      const recentActivity = [...state.recentActivity, baseLevel].slice(-20);
      
      // Smooth the activity level
      const smoothedLevel = recentActivity.reduce((a, b) => a + b, 0) / recentActivity.length;
      const activityLevel = Math.min(100, Math.max(0, smoothedLevel));
      
      // Calculate requests per second (rough estimate)
      const requestsPerSecond = activeCount > 0 ? Math.max(1, activeCount * 2) : 0;
      
      return {
        activityLevel,
        requestsPerSecond,
        recentActivity,
      };
    });
  },
}));

// Global ID counter for activity tracking
let activityIdCounter = 0;
export const generateActivityId = (prefix = 'activity') => `${prefix}-${++activityIdCounter}-${Date.now()}`;

