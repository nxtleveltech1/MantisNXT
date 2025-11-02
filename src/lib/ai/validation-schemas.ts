/**
 * AI API Validation Schemas
 * Zod schemas for request validation
 */

import { z } from 'zod';

// Service Types
export const serviceTypeSchema = z.enum([
  'demand_forecasting',
  'anomaly_detection',
  'supplier_scoring',
  'assistant',
]);

// Entity Types
export const entityTypeSchema = z.enum(['product', 'supplier', 'category', 'customer']);

// Severity Levels
export const severitySchema = z.enum(['critical', 'high', 'medium', 'low']);

// Alert Status
export const alertStatusSchema = z.enum(['pending', 'acknowledged', 'resolved', 'dismissed']);

// Widget Types
export const widgetTypeSchema = z.enum([
  'metric_card',
  'line_chart',
  'bar_chart',
  'pie_chart',
  'area_chart',
  'table',
  'alert_list',
  'prediction_list',
]);

// Configuration Schemas
export const createConfigSchema = z.object({
  serviceType: serviceTypeSchema,
  config: z.record(z.unknown()),
  enabled: z.boolean().optional().default(false),
});

export const updateConfigSchema = z.object({
  config: z.record(z.unknown()).optional(),
  enabled: z.boolean().optional(),
});

export const testConfigSchema = z.object({
  config: z.record(z.unknown()),
});

// Prediction Schemas
export const createPredictionSchema = z.object({
  serviceType: serviceTypeSchema,
  entityType: entityTypeSchema,
  entityId: z.string().uuid(),
  predictionType: z.string(),
  predictionData: z.record(z.unknown()),
  confidence: z.number().min(0).max(1).optional(),
  metadata: z.record(z.unknown()).optional(),
});

export const updatePredictionSchema = z.object({
  actualOutcome: z.record(z.unknown()),
  accuracy: z.number().min(0).max(1).optional(),
  notes: z.string().optional(),
});

// Forecast Schemas
export const generateForecastSchema = z.object({
  productId: z.string().uuid(),
  horizon: z.number().int().min(1).max(365).default(30),
  granularity: z.enum(['daily', 'weekly', 'monthly']).default('daily'),
  includeConfidenceIntervals: z.boolean().default(true),
  metadata: z.record(z.unknown()).optional(),
});

export const generateBulkForecastSchema = z.object({
  productIds: z.array(z.string().uuid()).min(1).max(100),
  horizon: z.number().int().min(1).max(365).default(30),
  granularity: z.enum(['daily', 'weekly', 'monthly']).default('daily'),
  includeConfidenceIntervals: z.boolean().default(true),
});

// Anomaly Detection Schemas
export const detectAnomaliesSchema = z.object({
  entityType: entityTypeSchema,
  entityId: z.string().uuid().optional(),
  metricType: z.string(),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  sensitivity: z.enum(['low', 'medium', 'high']).default('medium'),
});

// Alert Schemas
export const createAlertSchema = z.object({
  serviceType: serviceTypeSchema,
  severity: severitySchema,
  title: z.string().min(1).max(255),
  message: z.string(),
  entityType: entityTypeSchema.optional(),
  entityId: z.string().uuid().optional(),
  metadata: z.record(z.unknown()).optional(),
});

export const acknowledgeAlertSchema = z.object({
  acknowledgedBy: z.string().uuid(),
  notes: z.string().optional(),
});

export const resolveAlertSchema = z.object({
  resolvedBy: z.string().uuid(),
  resolution: z.string(),
  notes: z.string().optional(),
});

// Conversation Schemas
export const createMessageSchema = z.object({
  conversationId: z.string().uuid().optional(),
  message: z.string().min(1),
  context: z.record(z.unknown()).optional(),
  metadata: z.record(z.unknown()).optional(),
});

export const updateContextSchema = z.object({
  context: z.record(z.unknown()),
});

// Dashboard Schemas
export const createDashboardSchema = z.object({
  name: z.string().min(1).max(255),
  description: z.string().optional(),
  layout: z.array(
    z.object({
      i: z.string(),
      x: z.number(),
      y: z.number(),
      w: z.number(),
      h: z.number(),
    })
  ),
  isPublic: z.boolean().default(false),
  metadata: z.record(z.unknown()).optional(),
});

export const updateDashboardSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  description: z.string().optional(),
  layout: z
    .array(
      z.object({
        i: z.string(),
        x: z.number(),
        y: z.number(),
        w: z.number(),
        h: z.number(),
      })
    )
    .optional(),
  isPublic: z.boolean().optional(),
  metadata: z.record(z.unknown()).optional(),
});

export const updateLayoutSchema = z.object({
  layout: z.array(
    z.object({
      i: z.string(),
      x: z.number(),
      y: z.number(),
      w: z.number(),
      h: z.number(),
    })
  ),
});

export const shareDashboardSchema = z.object({
  userIds: z.array(z.string().uuid()).optional(),
  makePublic: z.boolean().optional(),
});

// Widget Schemas
export const createWidgetSchema = z.object({
  dashboardId: z.string().uuid(),
  type: widgetTypeSchema,
  title: z.string().min(1).max(255),
  config: z.record(z.unknown()),
  dataSource: z.object({
    type: z.string(),
    params: z.record(z.unknown()),
  }),
  refreshInterval: z.number().int().min(0).optional(),
  metadata: z.record(z.unknown()).optional(),
});

export const updateWidgetSchema = z.object({
  title: z.string().min(1).max(255).optional(),
  config: z.record(z.unknown()).optional(),
  dataSource: z
    .object({
      type: z.string(),
      params: z.record(z.unknown()),
    })
    .optional(),
  refreshInterval: z.number().int().min(0).optional(),
  metadata: z.record(z.unknown()).optional(),
});

// Metrics Schemas
export const invalidateMetricsSchema = z.object({
  metricType: z.string().optional(),
  key: z.string().optional(),
});

export const recalculateMetricsSchema = z.object({
  metricType: z.string(),
  force: z.boolean().default(false),
});

// Cleanup Schemas
export const cleanupPredictionsSchema = z.object({
  olderThan: z.string().datetime(),
  serviceType: serviceTypeSchema.optional(),
  dryRun: z.boolean().default(false),
});
