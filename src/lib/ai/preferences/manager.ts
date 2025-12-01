/**
 * User Preferences Manager
 * Manages user preference operations with caching and validation
 */

import { query, withTransaction } from '@/lib/database/connection';
import { EventEmitter } from 'events';
import {
  UserPreferences,
  PreferenceCategory,
  PreferenceValue,
  PreferenceUpdate,
  DEFAULT_USER_PREFERENCES,
  CreateUserPreferencesSchema,
  UpdateUserPreferencesSchema,
  SetPreferenceSchema,
  PreferenceChangeHandler,
} from './types';

export class PreferenceManager extends EventEmitter {
  private cache = new Map<string, { data: UserPreferences; expires: number }>();
  private readonly CACHE_TTL = 5 * 60 * 1000; // 5 minutes
  private changeHandlers = new Set<PreferenceChangeHandler>();

  constructor() {
    super();
    this.setMaxListeners(50);
  }

  /**
   * Get user preferences with caching
   */
  async getPreferences(userId: string, orgId: string): Promise<UserPreferences> {
    const cacheKey = `${userId}:${orgId}`;

    // Check cache first
    const cached = this.cache.get(cacheKey);
    if (cached && cached.expires > Date.now()) {
      return cached.data;
    }

    try {
      const result = await query(
        `SELECT id, user_id, org_id, preferences, created_at, updated_at FROM ai_user_preferences WHERE user_id = $1 AND org_id = $2`,
        [userId, orgId]
      );

      let preferences: UserPreferences;

      if (result.rows.length === 0) {
        // Create default preferences
        preferences = await this.createDefaultPreferences(userId, orgId);
      } else {
        const row = result.rows[0];
        preferences = {
          id: row.id,
          userId: row.user_id,
          orgId: row.org_id,
          preferences: row.preferences || {},
          createdAt: new Date(row.created_at),
          updatedAt: new Date(row.updated_at),
        };
      }

      // Cache the result
      this.cache.set(cacheKey, {
        data: preferences,
        expires: Date.now() + this.CACHE_TTL,
      });

      return preferences;
    } catch (error) {
      console.error('Error fetching user preferences:', error);
      throw new Error(
        `Failed to get preferences: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Set a single preference
   */
  async setPreference(
    userId: string,
    category: PreferenceCategory,
    key: string,
    value: unknown
  ): Promise<void> {
    const validation = SetPreferenceSchema.safeParse({ userId, category, key, value });
    if (!validation.success) {
      throw new Error(`Invalid preference data: ${validation.error.message}`);
    }

    try {
      await withTransaction(async client => {
        // Get current preferences to track changes
        const currentPrefs = await this.getPreferences(userId, 'default-org'); // TODO: Pass orgId properly

        // Update the specific preference
        const updatedPreferences = {
          ...currentPrefs.preferences,
          [category]: {
            ...((currentPrefs.preferences as any)?.[category] || {}),
            [key]: value,
          },
        };

        // Update in database
        await client.query(
          `UPDATE ai_user_preferences
           SET preferences = $1, updated_at = NOW()
           WHERE user_id = $2 AND org_id = $3`,
          [JSON.stringify(updatedPreferences), userId, 'default-org'] // TODO: Pass orgId properly
        );

        // Clear cache
        this.cache.delete(`${userId}:default-org`);

        // Emit change event
        const update: PreferenceUpdate = {
          userId,
          category,
          key,
          oldValue: (currentPrefs.preferences as any)?.[category]?.[key],
          newValue: value,
          reason: 'User preference update',
          confidence: 1.0,
          timestamp: new Date(),
        };

        this.emit('preferenceChanged', update);

        // Notify handlers
        for (const handler of this.changeHandlers) {
          try {
            await handler(update);
          } catch (error) {
            console.error('Error in preference change handler:', error);
          }
        }
      });
    } catch (error) {
      console.error('Error setting preference:', error);
      throw new Error(
        `Failed to set preference: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Reset preferences to defaults
   */
  async resetToDefaults(userId: string, category?: PreferenceCategory): Promise<void> {
    try {
      const defaults = DEFAULT_USER_PREFERENCES;

      await withTransaction(async client => {
        let updateQuery: string;
        let values: unknown[];

        if (category) {
          // Reset only specific category
          const currentPrefs = await this.getPreferences(userId, 'default-org');
          const updatedPreferences = {
            ...currentPrefs.preferences,
            [category]: defaults.preferences[category],
          };

          updateQuery = `UPDATE ai_user_preferences SET preferences = $1, updated_at = NOW() WHERE user_id = $2 AND org_id = $3`;
          values = [JSON.stringify(updatedPreferences), userId, 'default-org'];
        } else {
          // Reset all preferences
          updateQuery = `UPDATE ai_user_preferences SET preferences = $1, updated_at = NOW() WHERE user_id = $2 AND org_id = $3`;
          values = [JSON.stringify(defaults.preferences), userId, 'default-org'];
        }

        await client.query(updateQuery, values);

        // Clear cache
        this.cache.delete(`${userId}:default-org`);

        // Emit reset event
        this.emit('preferencesReset', { userId, category, timestamp: new Date() });
      });
    } catch (error) {
      console.error('Error resetting preferences:', error);
      throw new Error(
        `Failed to reset preferences: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Merge preferences with cascading priority: user > org > global
   */
  mergePreferences(
    userPrefs: UserPreferences,
    orgPrefs?: UserPreferences,
    globalPrefs?: UserPreferences
  ): UserPreferences {
    const merged = { ...userPrefs };

    if (orgPrefs) {
      merged.preferences = {
        ...orgPrefs.preferences,
        ...userPrefs.preferences,
      };
    }

    if (globalPrefs) {
      merged.preferences = {
        ...globalPrefs.preferences,
        ...(orgPrefs?.preferences || {}),
        ...userPrefs.preferences,
      };
    }

    return merged;
  }

  /**
   * Validate preference value for category and key
   */
  validatePreference(category: PreferenceCategory, key: string, value: unknown): boolean {
    // Basic validation - could be extended with more sophisticated rules
    try {
      switch (category) {
        case 'communication':
          if (key === 'verbosity') return ['low', 'medium', 'high'].includes(value as string);
          if (key === 'responseFormat')
            return ['text', 'structured', 'markdown'].includes(value as string);
          if (key === 'language') return typeof value === 'string' && value.length === 2;
          return typeof value === 'boolean' || typeof value === 'string';
        case 'behavior':
          if (key === 'autoApprove') return typeof value === 'boolean';
          if (key === 'confirmThreshold')
            return ['low', 'medium', 'high'].includes(value as string);
          if (key === 'defaultTools') return Array.isArray(value);
          return typeof value === 'boolean' || typeof value === 'number' || Array.isArray(value);
        case 'tools':
          if (key === 'enabledTools') return Array.isArray(value);
          if (key === 'favorites') return Array.isArray(value);
          return typeof value === 'object' || Array.isArray(value);
        case 'notifications':
          return typeof value === 'boolean';
        case 'privacy':
          return typeof value === 'boolean' || typeof value === 'string';
        default:
          return true;
      }
    } catch {
      return false;
    }
  }

  /**
   * Export user preferences as JSON
   */
  async exportPreferences(userId: string): Promise<string> {
    const preferences = await this.getPreferences(userId, 'default-org');
    return JSON.stringify(
      {
        version: '1.0',
        exportedAt: new Date().toISOString(),
        preferences,
      },
      null,
      2
    );
  }

  /**
   * Import preferences from JSON export
   */
  async importPreferences(userId: string, json: string): Promise<void> {
    try {
      const importData = JSON.parse(json);

      if (!importData.preferences || !importData.preferences.preferences) {
        throw new Error('Invalid import data format');
      }

      const preferences = importData.preferences as UserPreferences;

      // Validate imported preferences
      for (const [category, categoryPrefs] of Object.entries(preferences.preferences)) {
        for (const [key, value] of Object.entries(categoryPrefs as any)) {
          if (!this.validatePreference(category as PreferenceCategory, key, value)) {
            throw new Error(`Invalid preference value for ${category}.${key}`);
          }
        }
      }

      await withTransaction(async client => {
        await client.query(
          `UPDATE ai_user_preferences
           SET preferences = $1, updated_at = NOW()
           WHERE user_id = $2 AND org_id = $3`,
          [JSON.stringify(preferences.preferences), userId, 'default-org']
        );

        // Clear cache
        this.cache.delete(`${userId}:default-org`);

        this.emit('preferencesImported', { userId, timestamp: new Date() });
      });
    } catch (error) {
      console.error('Error importing preferences:', error);
      throw new Error(
        `Failed to import preferences: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Add a change handler
   */
  onPreferenceChange(handler: PreferenceChangeHandler): void {
    this.changeHandlers.add(handler);
  }

  /**
   * Remove a change handler
   */
  offPreferenceChange(handler: PreferenceChangeHandler): void {
    this.changeHandlers.delete(handler);
  }

  /**
   * Clear cache for a specific user
   */
  clearCache(userId: string, orgId: string = 'default-org'): void {
    this.cache.delete(`${userId}:${orgId}`);
  }

  /**
   * Clear all cache
   */
  clearAllCache(): void {
    this.cache.clear();
  }

  /**
   * Create default preferences for a new user
   */
  private async createDefaultPreferences(userId: string, orgId: string): Promise<UserPreferences> {
    const defaults = DEFAULT_USER_PREFERENCES;

    try {
      const result = await query(
        `INSERT INTO ai_user_preferences (user_id, org_id, preferences)
         VALUES ($1, $2, $3)
         RETURNING id, user_id, org_id, preferences, created_at, updated_at`,
        [userId, orgId, JSON.stringify(defaults.preferences)]
      );

      const row = result.rows[0];
      return {
        id: row.id,
        userId: row.user_id,
        orgId: row.org_id,
        preferences: row.preferences,
        createdAt: new Date(row.created_at),
        updatedAt: new Date(row.updated_at),
      };
    } catch (error) {
      console.error('Error creating default preferences:', error);
      throw new Error(
        `Failed to create default preferences: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }
}

// Export singleton instance
export const preferenceManager = new PreferenceManager();
