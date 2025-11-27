/**
 * Response Calibrator
 * Adapts AI responses based on user preferences and learning patterns
 */

import { query } from '@/lib/database/connection';
import {
  UserPreferences,
  ExpertiseLevel,
  ResponseStyle,
  InteractionPattern,
  LearningSignal,
  CalibrationSettings,
  PreferenceUpdate,
} from './types';

export class Calibrator {
  private expertiseTemplates = {
    beginner: {
      verbosity: 0.8,
      technicalDepth: 0.3,
      examples: true,
      simpleLanguage: true,
      stepByStep: true,
    },
    intermediate: {
      verbosity: 1.0,
      technicalDepth: 0.5,
      examples: true,
      simpleLanguage: false,
      stepByStep: false,
    },
    advanced: {
      verbosity: 0.9,
      technicalDepth: 0.7,
      examples: false,
      simpleLanguage: false,
      stepByStep: false,
    },
    expert: {
      verbosity: 0.7,
      technicalDepth: 0.9,
      examples: false,
      simpleLanguage: false,
      stepByStep: false,
    },
  };

  private styleTemplates = {
    concise: {
      maxLength: 200,
      bulletPoints: true,
      avoidFluff: true,
      directAnswers: true,
    },
    detailed: {
      maxLength: 800,
      bulletPoints: false,
      avoidFluff: false,
      directAnswers: false,
    },
    technical: {
      maxLength: 1000,
      bulletPoints: false,
      avoidFluff: true,
      directAnswers: true,
      includeCode: true,
      formalLanguage: true,
    },
    conversational: {
      maxLength: 600,
      bulletPoints: false,
      avoidFluff: false,
      directAnswers: false,
      friendlyTone: true,
      contractions: true,
    },
  };

  /**
   * Calibrate response based on user preferences
   */
  calibrateResponse(response: string, preferences: UserPreferences): string {
    const settings = this.buildCalibrationSettings(preferences);

    let calibrated = response;

    // Apply verbosity adjustment
    calibrated = this.adjustVerbosity(calibrated, settings.verbosityMultiplier);

    // Apply technical depth
    calibrated = this.adjustTechnicalDepth(calibrated, settings.technicalDepth);

    // Apply response style
    calibrated = this.applyStyle(calibrated, settings.responseStyle);

    // Apply personalization
    calibrated = this.applyPersonalization(calibrated, settings.personalizationWeight);

    return calibrated;
  }

  /**
   * Adjust response verbosity based on expertise level
   */
  adjustVerbosity(text: string, multiplier: number): string {
    if (multiplier === 1.0) return text;

    const words = text.split(' ');
    const targetLength = Math.round(words.length * multiplier);

    if (multiplier < 1.0) {
      // Make more concise
      return this.makeConcise(text, targetLength);
    } else {
      // Make more detailed
      return this.makeDetailed(text, targetLength);
    }
  }

  /**
   * Adjust technical depth based on user expertise
   */
  adjustTechnicalDepth(text: string, depth: number): string {
    // For now, this is a placeholder. In a real implementation,
    // this would use AI to adjust technical complexity
    if (depth < 0.4) {
      // Simplify for beginners
      return text
        .replace(/technical jargon/g, 'simpler terms')
        .replace(/complex concepts/g, 'basic ideas');
    } else if (depth > 0.7) {
      // Add technical depth for experts
      return text
        .replace(/basic ideas/g, 'complex concepts')
        .replace(/simpler terms/g, 'technical jargon');
    }

    return text;
  }

  /**
   * Apply response style formatting
   */
  applyStyle(text: string, style: ResponseStyle): string {
    const template = this.styleTemplates[style];

    switch (style) {
      case 'concise':
        return this.makeConcise(text, template.maxLength);

      case 'detailed':
        return this.makeDetailed(text, template.maxLength);

      case 'technical':
        return this.makeTechnical(text);

      case 'conversational':
        return this.makeConversational(text);

      default:
        return text;
    }
  }

  /**
   * Record user interaction for learning
   */
  async recordInteraction(userId: string, interaction: {
    type: 'query' | 'response' | 'feedback';
    content: string;
    response?: string;
    satisfaction?: number;
    metadata?: Record<string, unknown>;
  }): Promise<void> {
    try {
      await query(
        `INSERT INTO ai_learning_signals (
          user_id, signal_type, signal_data, strength, timestamp
        ) VALUES ($1, $2, $3, $4, NOW())`,
        [
          userId,
          'interaction',
          JSON.stringify({
            type: interaction.type,
            content: interaction.content,
            response: interaction.response,
            satisfaction: interaction.satisfaction,
            metadata: interaction.metadata,
          }),
          interaction.satisfaction || 0.5,
        ]
      );
    } catch (error) {
      console.error('Error recording interaction:', error);
      // Don't throw - learning failures shouldn't break the main flow
    }
  }

  /**
   * Analyze user interaction patterns
   */
  async analyzePatterns(userId: string): Promise<InteractionPattern[]> {
    try {
      const result = await query(
        `SELECT
          signal_type,
          signal_data,
          COUNT(*) as occurrences,
          AVG(strength) as avg_strength,
          MAX(timestamp) as last_observed
        FROM ai_learning_signals
        WHERE user_id = $1
          AND timestamp > NOW() - INTERVAL '30 days'
        GROUP BY signal_type, signal_data
        ORDER BY occurrences DESC
        LIMIT 10`,
        [userId]
      );

      return result.rows.map(row => ({
        patternId: `pattern_${Date.now()}_${Math.random()}`,
        userId,
        patternType: row.signal_type as any,
        pattern: JSON.parse(row.signal_data),
        confidence: parseFloat(row.avg_strength),
        lastObserved: new Date(row.last_observed),
        occurrences: parseInt(row.occurrences),
      }));
    } catch (error) {
      console.error('Error analyzing patterns:', error);
      return [];
    }
  }

  /**
   * Suggest preference updates based on learning data
   */
  async suggestPreferenceUpdates(userId: string): Promise<PreferenceUpdate[]> {
    const patterns = await this.analyzePatterns(userId);
    const suggestions: PreferenceUpdate[] = [];

    // Analyze patterns for preference suggestions
    for (const pattern of patterns) {
      if (pattern.patternType === 'interaction' && pattern.occurrences > 5) {
        const data = pattern.pattern as any;

        // Suggest verbosity changes based on satisfaction
        if (data.satisfaction < 0.3) {
          suggestions.push({
            userId,
            category: 'communication' as any,
            key: 'verbosity',
            oldValue: undefined,
            newValue: 'more_concise',
            reason: 'User frequently shows low satisfaction with detailed responses',
            confidence: pattern.confidence,
            timestamp: new Date(),
          });
        }

        // Suggest style changes based on interaction patterns
        if (data.type === 'query' && data.content.includes('?')) {
          suggestions.push({
            userId,
            category: 'communication' as any,
            key: 'responseStyle',
            oldValue: undefined,
            newValue: 'conversational',
            reason: 'User frequently asks questions, suggesting preference for conversational style',
            confidence: pattern.confidence * 0.8,
            timestamp: new Date(),
          });
        }
      }
    }

    return suggestions;
  }

  /**
   * Process learning signal and potentially update preferences
   */
  async processLearningSignal(signal: LearningSignal): Promise<void> {
    try {
      // Store the signal
      await query(
        `INSERT INTO ai_learning_signals (
          user_id, signal_type, signal_data, strength, timestamp
        ) VALUES ($1, $2, $3, $4, $5)`,
        [
          signal.userId,
          signal.signalType,
          JSON.stringify(signal.signalData),
          signal.strength,
          signal.timestamp,
        ]
      );

      // If signal is strong enough, consider automatic preference updates
      if (signal.strength > 0.8) {
        await this.processStrongSignal(signal);
      }
    } catch (error) {
      console.error('Error processing learning signal:', error);
    }
  }

  /**
   * Build calibration settings from user preferences
   */
  private buildCalibrationSettings(preferences: UserPreferences): CalibrationSettings {
    const expertise = this.expertiseTemplates[preferences.expertiseLevel];
    const style = this.styleTemplates[preferences.responseStyle];

    return {
      expertiseLevel: preferences.expertiseLevel,
      responseStyle: preferences.responseStyle,
      verbosityMultiplier: expertise.verbosity,
      technicalDepth: expertise.technicalDepth,
      personalizationWeight: 0.7, // Default personalization weight
      learningRate: 0.1, // Default learning rate
    };
  }

  /**
   * Make text more concise
   */
  private makeConcise(text: string, maxLength: number): string {
    // Simple implementation - in reality, this would use AI
    const sentences = text.split('. ');
    let result = '';
    let wordCount = 0;

    for (const sentence of sentences) {
      if (wordCount + sentence.split(' ').length > maxLength / 6) break; // Rough word limit
      result += sentence + '. ';
      wordCount += sentence.split(' ').length;
    }

    return result.trim() || text.substring(0, maxLength) + '...';
  }

  /**
   * Make text more detailed
   */
  private makeDetailed(text: string, minLength: number): string {
    // Simple implementation - in reality, this would use AI to expand
    if (text.length >= minLength) return text;

    // Add explanatory phrases
    return text
      .replace(/is/g, 'is actually')
      .replace(/are/g, 'are typically')
      .replace(/can/g, 'can potentially');
  }

  /**
   * Make text more technical
   */
  private makeTechnical(text: string): string {
    // Simple implementation - in reality, this would use AI
    return text
      .replace(/easy/g, 'straightforward')
      .replace(/hard/g, 'complex')
      .replace(/works/g, 'functions')
      .replace(/does/g, 'executes');
  }

  /**
   * Make text more conversational
   */
  private makeConversational(text: string): string {
    // Simple implementation - in reality, this would use AI
    return text
      .replace(/You should/g, 'I recommend you')
      .replace(/This means/g, 'What this means is')
      .replace(/However/g, 'That said');
  }

  /**
   * Apply personalization based on learned patterns
   */
  private applyPersonalization(text: string, weight: number): string {
    // Placeholder for personalization logic
    // In a real implementation, this would use learned user patterns
    return text;
  }

  /**
   * Process strong learning signals for automatic preference updates
   */
  private async processStrongSignal(signal: LearningSignal): Promise<void> {
    // Placeholder for automatic preference learning
    // In a real implementation, this would analyze signals and update preferences
    console.log('Processing strong signal:', signal);
  }
}

// Export singleton instance
export const calibrator = new Calibrator();