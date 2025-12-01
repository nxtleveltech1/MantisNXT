/**
 * User Preferences Store
 * Manages user preference persistence with database and in-memory caching
 */

import { query, withTransaction } from '@/lib/database/connection';
import { EventEmitter } from 'events';
import {
  UserPreferences,
  UserPreference,
  PreferenceUpdate,
  DEFAULT_USER_PREFERENCES,
  CreateUserPreferencesSchema,
  UpdateUserPreferencesSchema,
  SetPreferenceSchema,
  PreferenceChangeHandler,
} from './types';

export class PreferenceStore extends EventEmitter {
  private cache = new Map<string, { data: UserPreferences; expires: number }>();
  private readonly CACHE_TTL = 5 * 60 * 1000; // 5 minutes
  private changeHandlers = new Set<PreferenceChangeHandler>();

  constructor() {
    super();
    this.setMaxListeners(50); // Allow more listeners for preference changes
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
        `SELECT * FROM ai_user_preferences WHERE user_id = $1 AND org_id = $2`,
        [userId, orgId]
      );

      let preferences: UserPreferences;

      if (result.rows.length === 0) {
        // Create default preferences
        preferences = await this.createDefaultPreferences(userId, orgId);
      } else {
        const row = result.rows[0];
        preferences = {
          userId: row.user_id,
          orgId: row.org_id,
          expertiseLevel: row.expertise_level,
          responseStyle: row.response_style,
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
    category: string,
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
          category: category as any,
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
   * Set multiple preferences at once
   */
  async setPreferences(
    userId: string,
    updates: Partial<Pick<UserPreferences, 'expertiseLevel' | 'responseStyle' | 'preferences'>>
  ): Promise<void> {
    const validation = UpdateUserPreferencesSchema.safeParse(updates);
    if (!validation.success) {
      throw new Error(`Invalid preference updates: ${validation.error.message}`);
    }

    try {
      await withTransaction(async client => {
        // Get current preferences
        const currentPrefs = await this.getPreferences(userId, 'default-org');

        // Build update query dynamically
        const updateFields: string[] = [];
        const values: unknown[] = [];
        let paramIndex = 1;

        if (updates.expertiseLevel !== undefined) {
          updateFields.push(`expertise_level = $${paramIndex++}`);
          values.push(updates.expertiseLevel);
        }

        if (updates.responseStyle !== undefined) {
          updateFields.push(`response_style = $${paramIndex++}`);
          values.push(updates.responseStyle);
        }

        if (updates.preferences !== undefined) {
          updateFields.push(`preferences = $${paramIndex++}`);
          values.push(JSON.stringify(updates.preferences));
        }

        updateFields.push(`updated_at = NOW()`);

        values.push(userId, 'default-org');

        const sql = `
          UPDATE ai_user_preferences
          SET ${updateFields.join(', ')}
          WHERE user_id = $${paramIndex} AND org_id = $${paramIndex + 1}
        `;

        await client.query(sql, values);

        // Clear cache
        this.cache.delete(`${userId}:default-org`);

        // Emit events for each changed field
        for (const [key, value] of Object.entries(updates)) {
          if (value !== undefined) {
            const update: PreferenceUpdate = {
              userId,
              category: 'system' as any,
              key,
              oldValue: (currentPrefs as any)[key],
              newValue: value,
              reason: 'Bulk preference update',
              confidence: 1.0,
              timestamp: new Date(),
            };

            this.emit('preferenceChanged', update);
          }
        }
      });
    } catch (error) {
      console.error('Error setting preferences:', error);
      throw new Error(
        `Failed to set preferences: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Get organization default preferences
   */
  async getDefaults(orgId: string): Promise<UserPreferences> {
    // For now, return hardcoded defaults. In a real implementation,
    // this would fetch org-specific defaults from the database
    return {
      ...DEFAULT_USER_PREFERENCES,
      userId: 'system',
      orgId,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
  }

  /**
   * Merge user preferences with organization defaults
   */
  mergeWithDefaults(userPrefs: UserPreferences, orgDefaults: UserPreferences): UserPreferences {
    return {
      ...userPrefs,
      preferences: {
        ...orgDefaults.preferences,
        ...userPrefs.preferences,
      },
    };
  }

  /**
   * Reset user preferences to defaults
   */
  async resetToDefaults(userId: string, orgId: string = 'default-org'): Promise<void> {
    try {
      const defaults = await this.getDefaults(orgId);

      await withTransaction(async client => {
        await client.query(
          `UPDATE ai_user_preferences
           SET expertise_level = $1, response_style = $2, preferences = $3, updated_at = NOW()
           WHERE user_id = $4 AND org_id = $5`,
          [
            defaults.expertiseLevel,
            defaults.responseStyle,
            JSON.stringify(defaults.preferences),
            userId,
            orgId,
          ]
        );

        // Clear cache
        this.cache.delete(`${userId}:${orgId}`);

        // Emit reset event
        this.emit('preferencesReset', { userId, orgId, timestamp: new Date() });
      });
    } catch (error) {
      console.error('Error resetting preferences:', error);
      throw new Error(
        `Failed to reset preferences: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Export user preferences as JSON
   */
  async exportPreferences(userId: string, orgId: string = 'default-org'): Promise<string> {
    const preferences = await this.getPreferences(userId, orgId);
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
  async importPreferences(
    userId: string,
    data: string,
    orgId: string = 'default-org'
  ): Promise<void> {
    try {
      const importData = JSON.parse(data);

      if (!importData.preferences || !importData.preferences.expertiseLevel) {
        throw new Error('Invalid import data format');
      }

      const preferences = importData.preferences as UserPreferences;

      await this.setPreferences(userId, {
        expertiseLevel: preferences.expertiseLevel,
        responseStyle: preferences.responseStyle,
        preferences: preferences.preferences,
      });

      this.emit('preferencesImported', { userId, orgId, timestamp: new Date() });
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
    const defaults = await this.getDefaults(orgId);

    try {
      await query(
        `INSERT INTO ai_user_preferences (user_id, org_id, expertise_level, response_style, preferences)
         VALUES ($1, $2, $3, $4, $5)`,
        [
          userId,
          orgId,
          defaults.expertiseLevel,
          defaults.responseStyle,
          JSON.stringify(defaults.preferences),
        ]
      );

      return {
        ...defaults,
        userId,
        orgId,
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
export const preferenceStore = new PreferenceStore();
