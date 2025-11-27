/**
 * AI Preferences and Learning System
 * Main exports for user preference management and response calibration
 */

// Core types and schemas
export * from './types';

// Preference management
export { preferenceManager, PreferenceManager } from './manager';

// Learning and adaptation
export { learner, Learner } from './learner';

// Default instances (ready to use)
export { preferenceManager as preferences } from './manager';
export { learner as learningSystem } from './learner';

// Re-export commonly used types for convenience
export type {
  UserPreferences,
  ExpertiseLevel,
  ResponseStyle,
  PreferenceCategory,
  PreferenceScope,
  PreferenceValue,
  CommunicationPrefs,
  BehaviorPrefs,
  ToolPrefs,
  LearningContext,
  UserFeedback,
  LearningSignal,
  PreferenceSuggestion,
  LearningInsights,
  InteractionPattern,
  PreferenceUpdate,
} from './types';