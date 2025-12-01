/**
 * AI Learning System
 * Tracks user interactions and adapts preferences based on patterns
 */

import { query } from '@/lib/database/connection';
import {
  LearningContext,
  UserFeedback,
  LearningSignal,
  PreferenceSuggestion,
  LearningInsights,
  InteractionPattern,
  PreferenceUpdate,
} from './types';
import { preferenceManager } from './manager';

export class Learner {
  /**
   * Record user interaction for learning
   */
  async recordInteraction(userId: string, context: LearningContext): Promise<void> {
    try {
      // Record each interaction as a learning signal
      for (const interaction of context.interactions) {
        await query(
          `INSERT INTO ai_learning_signals (
            user_id, signal_type, signal_data, strength, timestamp
          ) VALUES ($1, $2, $3, $4, NOW())`,
          [
            userId,
            'interaction',
            JSON.stringify({
              ...interaction,
              sessionId: context.sessionId,
            }),
            this.calculateInteractionStrength(interaction),
          ]
        );
      }

      // Record feedback if present
      for (const feedback of context.feedback) {
        await this.recordFeedback(userId, feedback);
      }
    } catch (error) {
      console.error('Error recording interaction:', error);
      // Don't throw - learning failures shouldn't break main flow
    }
  }

  /**
   * Record user feedback
   */
  async recordFeedback(userId: string, feedback: UserFeedback): Promise<void> {
    try {
      await query(
        `INSERT INTO ai_learning_signals (
          user_id, signal_type, signal_data, strength, timestamp
        ) VALUES ($1, $2, $3, $4, $5)`,
        [
          userId,
          'feedback',
          JSON.stringify({
            type: feedback.type,
            context: feedback.context,
            severity: feedback.severity,
          }),
          this.calculateFeedbackStrength(feedback),
          feedback.timestamp,
        ]
      );
    } catch (error) {
      console.error('Error recording feedback:', error);
    }
  }

  /**
   * Suggest preference adaptations based on learning data
   */
  async suggestAdaptation(userId: string): Promise<PreferenceSuggestion[]> {
    const patterns = await this.analyzePatterns(userId);
    const suggestions: PreferenceSuggestion[] = [];

    for (const pattern of patterns) {
      if (pattern.confidence > 0.7) {
        // Only suggest high-confidence adaptations
        const suggestion = await this.generateSuggestionFromPattern(userId, pattern);
        if (suggestion) {
          suggestions.push(suggestion);
        }
      }
    }

    return suggestions;
  }

  /**
   * Apply learned adaptations to user preferences
   */
  async applyLearning(userId: string): Promise<void> {
    try {
      const suggestions = await this.suggestAdaptation(userId);

      for (const suggestion of suggestions) {
        if (suggestion.confidence > 0.8) {
          // Only auto-apply very high confidence suggestions
          await preferenceManager.setPreference(
            userId,
            suggestion.category,
            suggestion.key,
            suggestion.suggestedValue
          );

          // Record the adaptation
          await this.recordAdaptation(userId, suggestion);
        }
      }
    } catch (error) {
      console.error('Error applying learning:', error);
    }
  }

  /**
   * Get learning insights for a user
   */
  async getInsights(userId: string): Promise<LearningInsights> {
    const patterns = await this.analyzePatterns(userId);
    const suggestions = await this.suggestAdaptation(userId);
    const adaptationHistory = await this.getAdaptationHistory(userId);

    return {
      userId,
      patterns,
      suggestions,
      adaptationHistory,
      lastAnalyzed: new Date(),
      insights: await this.generateInsights(userId, patterns),
    };
  }

  /**
   * Reset learning data for a user
   */
  async resetLearning(userId: string): Promise<void> {
    try {
      await query(`DELETE FROM ai_learning_signals WHERE user_id = $1`, [userId]);
    } catch (error) {
      console.error('Error resetting learning data:', error);
      throw new Error(
        `Failed to reset learning: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Analyze interaction patterns from learning signals
   */
  private async analyzePatterns(userId: string): Promise<InteractionPattern[]> {
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
        LIMIT 20`,
        [userId]
      );

      return result.rows.map((row, index) => ({
        patternId: `pattern_${userId}_${Date.now()}_${index}`,
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
   * Generate a preference suggestion from a pattern
   */
  private async generateSuggestionFromPattern(
    userId: string,
    pattern: InteractionPattern
  ): Promise<PreferenceSuggestion | null> {
    const suggestionId = `suggestion_${userId}_${Date.now()}_${Math.random()}`;

    switch (pattern.patternType) {
      case 'interaction':
        return this.generateInteractionSuggestion(userId, pattern, suggestionId);
      case 'feedback':
        return this.generateFeedbackSuggestion(userId, pattern, suggestionId);
      default:
        return null;
    }
  }

  /**
   * Generate suggestion based on interaction patterns
   */
  private async generateInteractionSuggestion(
    userId: string,
    pattern: InteractionPattern,
    suggestionId: string
  ): Promise<PreferenceSuggestion | null> {
    const data = pattern.pattern as any;

    // Frequently used tools
    if (data.type === 'tool_usage' && pattern.occurrences > 10) {
      return {
        suggestionId,
        userId,
        category: 'tools',
        key: 'favorites',
        suggestedValue: [data.toolName],
        reason: `Frequently used tool: ${data.toolName}`,
        confidence: pattern.confidence,
        basedOn: [`${pattern.occurrences} usages`],
        timestamp: new Date(),
      };
    }

    // Response format preferences
    if (data.type === 'response_format' && pattern.occurrences > 5) {
      return {
        suggestionId,
        userId,
        category: 'communication',
        key: 'responseFormat',
        suggestedValue: data.format,
        reason: `Preferred response format: ${data.format}`,
        confidence: pattern.confidence,
        basedOn: [`${pattern.occurrences} interactions`],
        timestamp: new Date(),
      };
    }

    return null;
  }

  /**
   * Generate suggestion based on feedback patterns
   */
  private async generateFeedbackSuggestion(
    userId: string,
    pattern: InteractionPattern,
    suggestionId: string
  ): Promise<PreferenceSuggestion | null> {
    const data = pattern.pattern as any;

    // Negative feedback on verbosity
    if (data.type === 'negative' && data.context?.verbosity === 'too_high') {
      return {
        suggestionId,
        userId,
        category: 'communication',
        key: 'verbosity',
        suggestedValue: 'low',
        reason: 'User prefers more concise responses',
        confidence: pattern.confidence,
        basedOn: [`${pattern.occurrences} negative feedbacks`],
        timestamp: new Date(),
      };
    }

    // Positive feedback on technical content
    if (data.type === 'positive' && data.context?.technicalLevel === 'appropriate') {
      return {
        suggestionId,
        userId,
        category: 'communication',
        key: 'showTechnicalDetails',
        suggestedValue: true,
        reason: 'User appreciates technical details',
        confidence: pattern.confidence,
        basedOn: [`${pattern.occurrences} positive feedbacks`],
        timestamp: new Date(),
      };
    }

    return null;
  }

  /**
   * Record a preference adaptation
   */
  private async recordAdaptation(userId: string, suggestion: PreferenceSuggestion): Promise<void> {
    try {
      await query(
        `INSERT INTO ai_learning_signals (
          user_id, signal_type, signal_data, strength, timestamp
        ) VALUES ($1, $2, $3, $4, NOW())`,
        [
          userId,
          'preference_change',
          JSON.stringify({
            category: suggestion.category,
            key: suggestion.key,
            oldValue: null, // Would need to track this
            newValue: suggestion.suggestedValue,
            reason: suggestion.reason,
            source: 'learned',
          }),
          suggestion.confidence,
        ]
      );
    } catch (error) {
      console.error('Error recording adaptation:', error);
    }
  }

  /**
   * Get adaptation history for a user
   */
  private async getAdaptationHistory(userId: string): Promise<PreferenceUpdate[]> {
    try {
      const result = await query(
        `SELECT signal_data, strength, timestamp
        FROM ai_learning_signals
        WHERE user_id = $1 AND signal_type = 'preference_change'
        ORDER BY timestamp DESC
        LIMIT 50`,
        [userId]
      );

      return result.rows.map(row => {
        const data = JSON.parse(row.signal_data);
        return {
          userId,
          category: data.category,
          key: data.key,
          oldValue: data.oldValue,
          newValue: data.newValue,
          reason: data.reason,
          confidence: parseFloat(row.strength),
          timestamp: new Date(row.timestamp),
        };
      });
    } catch (error) {
      console.error('Error getting adaptation history:', error);
      return [];
    }
  }

  /**
   * Generate insights from patterns
   */
  private async generateInsights(
    userId: string,
    patterns: InteractionPattern[]
  ): Promise<Record<string, unknown>> {
    const insights: Record<string, unknown> = {
      totalPatterns: patterns.length,
      highConfidencePatterns: patterns.filter(p => p.confidence > 0.8).length,
      mostActiveCategory: this.findMostActiveCategory(patterns),
      learningTrends: this.analyzeTrends(patterns),
    };

    return insights;
  }

  /**
   * Find the most active preference category
   */
  private findMostActiveCategory(patterns: InteractionPattern[]): string {
    const categoryCounts: Record<string, number> = {};

    for (const pattern of patterns) {
      const data = pattern.pattern as any;
      if (data.category) {
        categoryCounts[data.category] = (categoryCounts[data.category] || 0) + pattern.occurrences;
      }
    }

    const sorted = Object.entries(categoryCounts).sort(([, a], [, b]) => b - a);
    return sorted[0]?.[0] || 'communication';
  }

  /**
   * Analyze learning trends
   */
  private analyzeTrends(patterns: InteractionPattern[]): Record<string, unknown> {
    const recent = patterns.filter(p => {
      const daysSince = (Date.now() - p.lastObserved.getTime()) / (1000 * 60 * 60 * 24);
      return daysSince <= 7;
    });

    return {
      recentActivity: recent.length,
      averageConfidence: patterns.reduce((sum, p) => sum + p.confidence, 0) / patterns.length,
      topPatternType: patterns[0]?.patternType || 'none',
    };
  }

  /**
   * Calculate interaction strength
   */
  private calculateInteractionStrength(interaction: Record<string, unknown>): number {
    // Base strength on interaction type and metadata
    let strength = 0.5;

    if (interaction.type === 'tool_usage') strength += 0.2;
    if (interaction.type === 'feedback') strength += 0.3;
    if (interaction.satisfaction === 'high') strength += 0.2;

    return Math.min(strength, 1.0);
  }

  /**
   * Calculate feedback strength
   */
  private calculateFeedbackStrength(feedback: UserFeedback): number {
    let strength = 0.5;

    if (feedback.type === 'positive') strength += 0.3;
    if (feedback.type === 'negative') strength += 0.2;
    if (feedback.severity === 'high') strength += 0.2;

    return Math.min(strength, 1.0);
  }
}

// Export singleton instance
export const learner = new Learner();
