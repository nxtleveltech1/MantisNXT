export { AIServiceBase } from './base';
export type { AIServiceBaseOptions, AIServiceRequestOptions, AIServiceResponse, StreamingResult } from './base';
export { AITextService } from './text';
export type {
  AITextServiceOptions,
  TextGenerationOptions,
  TemplateGenerationOptions,
  TextGenerationBatchResult,
  TextGenerationBatchItem,
} from './text';
export { AIChatService } from './chat';
export type { AIChatServiceOptions, ChatRequestOptions, ConversationOptions } from './chat';
export { AIEmbeddingService } from './embedding';
export type {
  AIEmbeddingServiceOptions,
  EmbeddingRequestOptions,
  EmbeddingDocument,
  EmbeddingSearchResult,
  EmbeddingBatchResult,
  EmbeddingBatchItem,
} from './embedding';
export { PromptManager } from './prompts';
export type {
  PromptTemplate,
  PromptTemplateInput,
  PromptTemplateVariant,
  PromptRenderResult,
  RenderPromptOptions,
} from './prompts';
export { ResponseProcessor } from './response';
export type {
  StructuredParseOptions,
  StructuredParseResult,
  ResponseValidationResult,
  ResponseFormatOptions,
  ResponseQualityScore,
} from './response';

import { AITextService, type AITextServiceOptions } from './text';
import { AIChatService, type AIChatServiceOptions } from './chat';
import { AIEmbeddingService, type AIEmbeddingServiceOptions } from './embedding';
import { AIServiceBase } from './base';

const registry = new Map<string, AIServiceBase>();

export function createTextService(options?: AITextServiceOptions): AITextService {
  return new AITextService(options);
}

export function createChatService(options?: AIChatServiceOptions): AIChatService {
  return new AIChatService(options);
}

export function createEmbeddingService(options?: AIEmbeddingServiceOptions): AIEmbeddingService {
  return new AIEmbeddingService(options);
}

export function registerAIService<T extends AIServiceBase>(name: string, service: T): T {
  registry.set(name, service);
  return service;
}

export function getAIService<T extends AIServiceBase = AIServiceBase>(name: string): T | undefined {
  return registry.get(name) as T | undefined;
}

export function unregisterAIService(name: string): void {
  registry.delete(name);
}

export function listRegisteredAIServices(): Array<{ name: string; service: AIServiceBase }> {
  return Array.from(registry.entries()).map(([name, service]) => ({ name, service }));
}

export function disposeRegisteredAIServices(): void {
  for (const [name, service] of registry.entries()) {
    service.removeAllListeners();
    registry.delete(name);
  }
}

// ============================================================================
// New AI Analytics & Management Services
// ============================================================================

// Configuration & Management Services
export { AIServiceConfigService } from './AIServiceConfigService';
export type {
  AIServiceType,
  AIProvider,
  AIServiceConfig,
  CreateConfigData,
  UpdateConfigData,
  ConnectionTestResult,
  RateLimitStatus,
} from './AIServiceConfigService';

// Prediction & Analytics Services
export { AIPredictionService } from './AIPredictionService';
export type {
  AIPrediction,
  CreatePredictionData,
  PaginatedResult,
  AccuracyMetrics,
} from './AIPredictionService';

// Alert Management Services
export { AIAlertService } from './AIAlertService';
export type {
  AlertSeverity,
  AIAlert,
  CreateAlertData,
  AlertStats,
} from './AIAlertService';

// Conversation Services
export { AIConversationService } from './AIConversationService';
export type {
  ConversationRole,
  AIConversation,
  CreateMessageData,
  ConversationSummary,
  ConversationSearchResult,
} from './AIConversationService';

// Dashboard Services
export { AnalyticsDashboardService } from './AnalyticsDashboardService';
export type {
  AnalyticsDashboard,
  CreateDashboardData,
  UpdateDashboardData,
} from './AnalyticsDashboardService';

// Widget Services
export { AnalyticsWidgetService } from './AnalyticsWidgetService';
export type {
  WidgetType,
  AnalyticsMetricType,
  AnalyticsWidget,
  CreateWidgetData,
  UpdateWidgetData,
} from './AnalyticsWidgetService';

// Cache Services
export { MetricsCacheService } from './MetricsCacheService';
export type {
  TimePeriod,
  CachedMetric,
  CacheMetricData,
} from './MetricsCacheService';

// Specialized AI Services (Already exist, updated)
export { DemandForecastingService } from './DemandForecastingService';
export type {
  ForecastRequest,
  ForecastResult,
  BatchForecastRequest,
  ForecastAccuracyMetrics,
} from './DemandForecastingService';

export { AnomalyDetectionService } from './AnomalyDetectionService';
export type {
  Anomaly,
  AnomalyDetectionConfig,
} from './AnomalyDetectionService';

export { SupplierScoringService } from './SupplierScoringService';
export type {
  SupplierScore,
  SupplierPerformanceData,
} from './SupplierScoringService';

export { AIAssistantService } from './AIAssistantService';
export type {
  AssistantContext,
  AssistantMessage,
  AssistantResponse,
} from './AIAssistantService';
