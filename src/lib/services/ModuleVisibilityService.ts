/**
 * Module Visibility Service
 *
 * Manages sidebar module visibility settings stored in the database.
 * Settings are stored in auth.system_config table with config_key = 'sidebar_module_visibility'
 *
 * @module services/ModuleVisibilityService
 */

import { db } from '@/lib/database';

// ============================================================================
// TYPES
// ============================================================================

export interface ModuleVisibilitySettings {
  // Main navigation modules
  dashboard: boolean;
  analytics: boolean;
  systemHealth: boolean;
  projectManagement: boolean;
  suppliers: boolean;
  productManagement: boolean;
  customers: boolean;
  salesServices: boolean;
  salesChannels: boolean;
  courierLogistics: boolean;
  rentals: boolean;
  repairsWorkshop: boolean;
  docustore: boolean;
  aiServices: boolean;
  financial: boolean;

  // Secondary navigation modules
  systemIntegration: boolean;
  administration: boolean;
  support: boolean;

  // Projects
  loyalty: boolean;
  communication: boolean;
}

const DEFAULT_SETTINGS: ModuleVisibilitySettings = {
  // All modules enabled by default
  dashboard: true,
  analytics: true,
  systemHealth: true,
  projectManagement: true,
  suppliers: true,
  productManagement: true,
  customers: true,
  salesServices: true,
  salesChannels: true,
  courierLogistics: true,
  rentals: true,
  repairsWorkshop: true,
  docustore: true,
  aiServices: true,
  financial: true,
  systemIntegration: true,
  administration: true,
  support: true,
  loyalty: true,
  communication: true,
};

// ============================================================================
// MODULE VISIBILITY SERVICE
// ============================================================================

export class ModuleVisibilityService {
  private static CONFIG_KEY = 'sidebar_module_visibility';

  /**
   * Get module visibility settings for an organization
   */
  static async getSettings(orgId: string | null | undefined): Promise<ModuleVisibilitySettings> {
    try {
      // Validate orgId - must be a valid UUID or null
      if (!orgId || orgId === 'default' || orgId === '') {
        console.warn('[ModuleVisibility] Invalid or missing orgId, returning default settings');
        return DEFAULT_SETTINGS;
      }

      const result = await db.query(
        `SELECT config_value FROM auth.system_config 
         WHERE org_id = $1 AND config_key = $2`,
        [orgId, this.CONFIG_KEY]
      );

      if (result.rows.length === 0) {
        return DEFAULT_SETTINGS;
      }

      const storedSettings = result.rows[0].config_value as Partial<ModuleVisibilitySettings>;
      
      // Merge with defaults to ensure all keys exist
      return {
        ...DEFAULT_SETTINGS,
        ...storedSettings,
      };
    } catch (error) {
      console.error('Failed to get module visibility settings:', error);
      return DEFAULT_SETTINGS;
    }
  }

  /**
   * Save module visibility settings for an organization
   */
  static async saveSettings(
    orgId: string | null | undefined,
    settings: Partial<ModuleVisibilitySettings>,
    updatedBy?: string | null
  ): Promise<ModuleVisibilitySettings> {
    try {
      // Validate orgId - must be a valid UUID
      if (!orgId || orgId === 'default' || orgId === '') {
        throw new Error('Invalid organization ID. Organization ID is required and must be a valid UUID.');
      }

      // Validate UUID format
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      if (!uuidRegex.test(orgId)) {
        throw new Error(`Invalid organization ID format: ${orgId}. Expected UUID format.`);
      }

      // Get existing settings to merge
      const existingSettings = await this.getSettings(orgId);
      
      // Merge settings
      const settingsToStore: ModuleVisibilitySettings = {
        ...existingSettings,
        ...settings,
      };

      // Upsert settings - updated_by can be null if not provided
      await db.query(
        `INSERT INTO auth.system_config (org_id, config_key, config_value, category, updated_by, updated_at)
         VALUES ($1, $2, $3, 'ui', $4, NOW())
         ON CONFLICT (org_id, config_key) 
         DO UPDATE SET 
           config_value = $3,
           updated_by = $4,
           updated_at = NOW(),
           version = COALESCE(auth.system_config.version, 0) + 1`,
        [orgId, this.CONFIG_KEY, JSON.stringify(settingsToStore), updatedBy || null]
      );

      console.log(`[ModuleVisibility] Settings saved for org ${orgId}`);
      return settingsToStore;
    } catch (error) {
      console.error('Failed to save module visibility settings:', error);
      throw error;
    }
  }

  /**
   * Get module visibility settings for all organizations (admin use)
   */
  static async getAllSettings(): Promise<Record<string, ModuleVisibilitySettings>> {
    try {
      const result = await db.query(
        `SELECT org_id, config_value FROM auth.system_config 
         WHERE config_key = $1`,
        [this.CONFIG_KEY]
      );

      const settingsMap: Record<string, ModuleVisibilitySettings> = {};
      
      for (const row of result.rows) {
        settingsMap[row.org_id] = {
          ...DEFAULT_SETTINGS,
          ...(row.config_value as Partial<ModuleVisibilitySettings>),
        };
      }

      return settingsMap;
    } catch (error) {
      console.error('Failed to get all module visibility settings:', error);
      return {};
    }
  }
}

export default ModuleVisibilityService;

