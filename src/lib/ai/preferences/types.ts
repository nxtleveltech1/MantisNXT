/**
 * User Preference and Learning Types
 * Zod schemas and TypeScript types for user preferences and AI learning
 */

import { z } from 'zod';

// ============================================================================
// ENUMS AND CONSTANTS
// ============================================================================

export const PreferenceCategorySchema = z.enum(['communication', 'behavior', 'tools', 'notifications', 'privacy']);
export type PreferenceCategory = z.infer<typeof PreferenceCategorySchema>;

export const PreferenceScopeSchema = z.enum(['user', 'org', 'global']);
export type PreferenceScope = z.infer<typeof PreferenceScopeSchema>;

export const ExpertiseLevelSchema = z.enum(['beginner', 'intermediate', 'advanced', 'expert']);
export type ExpertiseLevel = z.infer<typeof ExpertiseLevelSchema>;

export const ResponseStyleSchema = z.enum(['concise', 'detailed', 'technical', 'conversational']);
export type ResponseStyle = z.infer<typeof ResponseStyleSchema>;

// ============================================================================
// CORE TYPES
// ============================================================================

export const PreferenceValueSchema = z.object({
  value: z.unknown(),
  updatedAt: z.date(),
  source: z.enum(['user', 'learned', 'default']),
});
export type PreferenceValue = z.infer<typeof PreferenceValueSchema>;

export const UserPreferencesSchema = z.object({
  id: z.string().uuid(),
  userId: z.string().uuid(),
  orgId: z.string().uuid(),
  preferences: z.record(z.unknown()), // Flexible preference storage
  createdAt: z.date(),
  updatedAt: z.date(),
});
export type UserPreferences = z.infer<typeof UserPreferencesSchema>;

export const CommunicationPrefsSchema = z.object({
  verbosity: z.enum(['low', 'medium', 'high']),
  responseFormat: z.enum(['text', 'structured', 'markdown']),
  language: z.string(),
  showTechnicalDetails: z.boolean().optional(),
  includeExamples: z.boolean().optional(),
});
export type CommunicationPrefs = z.infer<typeof CommunicationPrefsSchema>;

export const BehaviorPrefsSchema = z.object({
  autoApprove: z.boolean(),
  confirmThreshold: z.enum(['low', 'medium', 'high']),
  defaultTools: z.array(z.string()),
  timeoutSettings: z.number().optional(),
});
export type BehaviorPrefs = z.infer<typeof BehaviorPrefsSchema>;

export const ToolPrefsSchema = z.object({
  enabledTools: z.array(z.string()),
  toolSettings: z.record(z.unknown()),
  favorites: z.array(z.string()),
  shortcuts: z.record(z.string()).optional(),
});
export type ToolPrefs = z.infer<typeof ToolPrefsSchema>;

export const LearningContextSchema = z.object({
  sessionId: z.string().uuid(),
  interactions: z.array(z.record(z.unknown())),
  feedback: z.array(z.record(z.unknown())),
  adaptations: z.array(z.record(z.unknown())),
});
export type LearningContext = z.infer<typeof LearningContextSchema>;

export const UserFeedbackSchema = z.object({
  type: z.enum(['positive', 'negative', 'correction']),
  context: z.record(z.unknown()),
  timestamp: z.date(),
  severity: z.enum(['low', 'medium', 'high']).optional(),
});
export type UserFeedback = z.infer<typeof UserFeedbackSchema>;

// ============================================================================
// LEARNING AND ADAPTATION TYPES
// ============================================================================

export const InteractionPatternSchema = z.object({
  patternId: z.string().uuid(),
  userId: z.string().uuid(),
  patternType: z.enum(['query_frequency', 'response_preference', 'feature_usage', 'error_patterns']),
  pattern: z.record(z.unknown()),
  confidence: z.number().min(0).max(1),
  lastObserved: z.date(),
  occurrences: z.number().int().min(0),
});
export type InteractionPattern = z.infer<typeof InteractionPatternSchema>;

export const LearningSignalSchema = z.object({
  signalId: z.string().uuid(),
  userId: z.string().uuid(),
  signalType: z.enum(['feedback', 'correction', 'preference_change', 'usage_pattern', 'interaction']),
  signalData: z.record(z.unknown()),
  strength: z.number().min(0).max(1),
  timestamp: z.date(),
});
export type LearningSignal = z.infer<typeof LearningSignalSchema>;

export const PreferenceUpdateSchema = z.object({
  userId: z.string().uuid(),
  category: PreferenceCategorySchema,
  key: z.string(),
  oldValue: z.unknown().optional(),
  newValue: z.unknown(),
  reason: z.string(),
  confidence: z.number().min(0).max(1),
  timestamp: z.date(),
});
export type PreferenceUpdate = z.infer<typeof PreferenceUpdateSchema>;

export const PreferenceSuggestionSchema = z.object({
  suggestionId: z.string().uuid(),
  userId: z.string().uuid(),
  category: PreferenceCategorySchema,
  key: z.string(),
  suggestedValue: z.unknown(),
  reason: z.string(),
  confidence: z.number().min(0).max(1),
  basedOn: z.array(z.string()),
  timestamp: z.date(),
});
export type PreferenceSuggestion = z.infer<typeof PreferenceSuggestionSchema>;

export const LearningInsightsSchema = z.object({
  userId: z.string().uuid(),
  patterns: z.array(InteractionPatternSchema),
  suggestions: z.array(PreferenceSuggestionSchema),
  adaptationHistory: z.array(PreferenceUpdateSchema),
  lastAnalyzed: z.date(),
  insights: z.record(z.unknown()),
});
export type LearningInsights = z.infer<typeof LearningInsightsSchema>;

// ============================================================================
// VALIDATION SCHEMAS
// ============================================================================

export const CreateUserPreferencesSchema = z.object({
  userId: z.string().uuid(),
  orgId: z.string().uuid(),
  preferences: z.record(z.unknown()).optional().default({}),
});

export const UpdateUserPreferencesSchema = z.object({
  preferences: z.record(z.unknown()).optional(),
});

export const SetPreferenceSchema = z.object({
  userId: z.string().uuid(),
  category: PreferenceCategorySchema,
  key: z.string(),
  value: z.unknown(),
});

export const LearningSignalInputSchema = z.object({
  userId: z.string().uuid(),
  signalType: LearningSignalSchema.shape.signalType,
  signalData: z.record(z.unknown()),
  strength: z.number().min(0).max(1).optional().default(0.5),
});

// ============================================================================
// DEFAULT VALUES
// ============================================================================

export const DEFAULT_USER_PREFERENCES: Omit<UserPreferences, 'id' | 'userId' | 'orgId' | 'createdAt' | 'updatedAt'> = {
  preferences: {
    communication: {
      verbosity: 'medium',
      responseFormat: 'markdown',
      language: 'en',
      showTechnicalDetails: true,
      includeExamples: true,
    },
    behavior: {
      autoApprove: false,
      confirmThreshold: 'medium',
      defaultTools: [],
    },
    tools: {
      enabledTools: [],
      toolSettings: {},
      favorites: [],
    },
    notifications: {
      emailAlerts: true,
      pushNotifications: false,
      weeklyDigest: true,
    },
    privacy: {
      dataSharing: false,
      analyticsOptIn: true,
      retentionPeriod: '1year',
    },
  },
};

// ============================================================================
// UTILITY TYPES
// ============================================================================

export type PreferencesMap = Record<string, unknown>;
export type PreferenceChangeHandler = (update: PreferenceUpdate) => void | Promise<void>;
export type LearningSignalProcessor = (signal: LearningSignal) => void | Promise<void>;