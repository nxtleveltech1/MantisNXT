// AI-Enhanced Supplier Management Components
export { default as AISupplierDiscoveryPanel } from './AISupplierDiscoveryPanel';
export { default as AISupplierInsightsPanel } from './AISupplierInsightsPanel';
export { default as AIEnhancedSupplierForm } from './AIEnhancedSupplierForm';

// Re-export analytics components
export { default as AIPredictiveAnalyticsDashboard } from '../../analytics/ai/AIPredictiveAnalyticsDashboard';

// Types
export type {
  AISupplierRecommendation,
  AISupplierInsight,
  AIPredictiveModel,
  AIAnomalyDetection,
  AIMarketIntelligence,
  AISupplierRiskProfile,
} from '../../../types/ai-supplier';

// Hooks
export {
  useAISupplier,
  useAISupplierRecommendations,
  useAISupplierInsights,
  useAISupplierChat,
} from '../../../hooks/useAISupplier';
