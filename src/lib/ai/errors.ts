/**
 * AI Service Error Classes
 * Custom error types for AI service operations
 */

export class AIServiceError extends Error {
  constructor(
    message: string,
    public code: string,
    public serviceType: string,
    public statusCode: number = 500
  ) {
    super(message);
    this.name = 'AIServiceError';
  }
}

export class RateLimitError extends Error {
  constructor(
    message: string,
    public retryAfter: number
  ) {
    super(message);
    this.name = 'RateLimitError';
  }
}

export class ProviderError extends Error {
  constructor(
    message: string,
    public provider: string,
    public details?: unknown
  ) {
    super(message);
    this.name = 'ProviderError';
  }
}

export class ConfigurationError extends AIServiceError {
  constructor(message: string, serviceType: string) {
    super(message, 'CONFIGURATION_ERROR', serviceType, 400);
    this.name = 'ConfigurationError';
  }
}

export class PredictionError extends AIServiceError {
  constructor(message: string) {
    super(message, 'PREDICTION_ERROR', 'prediction', 500);
    this.name = 'PredictionError';
  }
}

export class ForecastError extends AIServiceError {
  constructor(message: string) {
    super(message, 'FORECAST_ERROR', 'demand_forecasting', 500);
    this.name = 'ForecastError';
  }
}

export class AnomalyError extends AIServiceError {
  constructor(message: string) {
    super(message, 'ANOMALY_ERROR', 'anomaly_detection', 500);
    this.name = 'AnomalyError';
  }
}

export class AlertError extends AIServiceError {
  constructor(message: string) {
    super(message, 'ALERT_ERROR', 'alerts', 500);
    this.name = 'AlertError';
  }
}

export class ConversationError extends AIServiceError {
  constructor(message: string) {
    super(message, 'CONVERSATION_ERROR', 'assistant', 500);
    this.name = 'ConversationError';
  }
}

export class DashboardError extends AIServiceError {
  constructor(message: string) {
    super(message, 'DASHBOARD_ERROR', 'dashboard', 500);
    this.name = 'DashboardError';
  }
}

export class WidgetError extends AIServiceError {
  constructor(message: string) {
    super(message, 'WIDGET_ERROR', 'widget', 500);
    this.name = 'WidgetError';
  }
}

export class MetricsError extends AIServiceError {
  constructor(message: string) {
    super(message, 'METRICS_ERROR', 'metrics', 500);
    this.name = 'MetricsError';
  }
}
