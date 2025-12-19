/**
 * Email Settings Service
 *
 * Manages email configuration stored in the database.
 * Settings are stored in auth.system_config table with config_key = 'email_settings'
 *
 * @module services/EmailSettingsService
 */

import { db } from '@/lib/database';
import crypto from 'node:crypto';

// ============================================================================
// TYPES
// ============================================================================

export interface EmailSettings {
  // Provider selection
  provider: 'resend' | 'smtp' | 'auto';

  // Resend configuration
  resendApiKey?: string;

  // SMTP configuration
  smtpHost?: string;
  smtpPort?: number;
  smtpUser?: string;
  smtpPassword?: string;
  smtpSecure?: boolean;

  // From configuration
  fromEmail: string;
  fromName: string;
  replyToEmail?: string;

  // Feature flags
  enabled: boolean;
  welcomeEmailEnabled: boolean;
  passwordResetEnabled: boolean;
  invitationEmailEnabled: boolean;
  poApprovalEnabled: boolean;
  invoiceReminderEnabled: boolean;

  // Metadata
  lastTestedAt?: string;
  lastTestResult?: 'success' | 'error';
  lastTestError?: string;
}

const DEFAULT_SETTINGS: EmailSettings = {
  provider: 'auto',
  fromEmail: 'noreply@mantisnxt.com',
  fromName: 'MantisNXT',
  enabled: true,
  welcomeEmailEnabled: true,
  passwordResetEnabled: true,
  invitationEmailEnabled: true,
  poApprovalEnabled: true,
  invoiceReminderEnabled: true,
};

// ============================================================================
// ENCRYPTION HELPERS
// ============================================================================

const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || process.env.JWT_SECRET || 'default-key-change-me';
const ALGORITHM = 'aes-256-gcm';

function encrypt(text: string): string {
  const key = crypto.scryptSync(ENCRYPTION_KEY, 'salt', 32);
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  
  const authTag = cipher.getAuthTag();
  
  return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`;
}

function decrypt(encryptedText: string): string {
  try {
    const [ivHex, authTagHex, encrypted] = encryptedText.split(':');
    if (!ivHex || !authTagHex || !encrypted) {
      return encryptedText; // Return as-is if not encrypted format
    }
    
    const key = crypto.scryptSync(ENCRYPTION_KEY, 'salt', 32);
    const iv = Buffer.from(ivHex, 'hex');
    const authTag = Buffer.from(authTagHex, 'hex');
    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(authTag);
    
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
  } catch {
    return encryptedText; // Return as-is if decryption fails
  }
}

// ============================================================================
// EMAIL SETTINGS SERVICE
// ============================================================================

export class EmailSettingsService {
  private static CONFIG_KEY = 'email_settings';

  /**
   * Get email settings for an organization
   */
  static async getSettings(orgId: string): Promise<EmailSettings> {
    try {
      const result = await db.query(
        `SELECT config_value FROM auth.system_config 
         WHERE org_id = $1 AND config_key = $2`,
        [orgId, this.CONFIG_KEY]
      );

      if (result.rows.length === 0) {
        return DEFAULT_SETTINGS;
      }

      const storedSettings = result.rows[0].config_value as Partial<EmailSettings>;
      
      // Decrypt sensitive fields
      const settings: EmailSettings = {
        ...DEFAULT_SETTINGS,
        ...storedSettings,
      };

      if (storedSettings.resendApiKey) {
        settings.resendApiKey = decrypt(storedSettings.resendApiKey);
      }
      if (storedSettings.smtpPassword) {
        settings.smtpPassword = decrypt(storedSettings.smtpPassword);
      }

      return settings;
    } catch (error) {
      console.error('Failed to get email settings:', error);
      return DEFAULT_SETTINGS;
    }
  }

  /**
   * Get email settings without decrypting sensitive fields (for API responses)
   */
  static async getSettingsMasked(orgId: string): Promise<EmailSettings & { hasResendKey: boolean; hasSmtpPassword: boolean }> {
    const settings = await this.getSettings(orgId);
    
    return {
      ...settings,
      resendApiKey: settings.resendApiKey ? '••••••••' : undefined,
      smtpPassword: settings.smtpPassword ? '••••••••' : undefined,
      hasResendKey: !!settings.resendApiKey,
      hasSmtpPassword: !!settings.smtpPassword,
    };
  }

  /**
   * Save email settings for an organization
   */
  static async saveSettings(
    orgId: string,
    settings: Partial<EmailSettings>,
    updatedBy?: string
  ): Promise<EmailSettings> {
    try {
      // Get existing settings to merge
      const existingSettings = await this.getSettings(orgId);
      
      // Prepare settings for storage
      const settingsToStore: Partial<EmailSettings> = {
        ...existingSettings,
        ...settings,
      };

      // Encrypt sensitive fields before storage
      if (settings.resendApiKey && settings.resendApiKey !== '••••••••') {
        settingsToStore.resendApiKey = encrypt(settings.resendApiKey);
      } else if (settings.resendApiKey === '••••••••') {
        // Keep existing encrypted value
        const existing = await this.getSettingsRaw(orgId);
        settingsToStore.resendApiKey = existing?.resendApiKey;
      }

      if (settings.smtpPassword && settings.smtpPassword !== '••••••••') {
        settingsToStore.smtpPassword = encrypt(settings.smtpPassword);
      } else if (settings.smtpPassword === '••••••••') {
        // Keep existing encrypted value
        const existing = await this.getSettingsRaw(orgId);
        settingsToStore.smtpPassword = existing?.smtpPassword;
      }

      // Upsert settings
      await db.query(
        `INSERT INTO auth.system_config (org_id, config_key, config_value, category, updated_by, updated_at)
         VALUES ($1, $2, $3, 'email', $4, NOW())
         ON CONFLICT (org_id, config_key) 
         DO UPDATE SET 
           config_value = $3,
           updated_by = $4,
           updated_at = NOW(),
           version = auth.system_config.version + 1`,
        [orgId, this.CONFIG_KEY, JSON.stringify(settingsToStore), updatedBy]
      );

      console.log(`[EmailSettings] Settings saved for org ${orgId}`);
      return this.getSettings(orgId);
    } catch (error) {
      console.error('Failed to save email settings:', error);
      throw error;
    }
  }

  /**
   * Get raw settings without decryption (for internal use)
   */
  private static async getSettingsRaw(orgId: string): Promise<Partial<EmailSettings> | null> {
    try {
      const result = await db.query(
        `SELECT config_value FROM auth.system_config 
         WHERE org_id = $1 AND config_key = $2`,
        [orgId, this.CONFIG_KEY]
      );

      if (result.rows.length === 0) {
        return null;
      }

      return result.rows[0].config_value as Partial<EmailSettings>;
    } catch {
      return null;
    }
  }

  /**
   * Update test results
   */
  static async updateTestResults(
    orgId: string,
    success: boolean,
    error?: string
  ): Promise<void> {
    const settings = await this.getSettings(orgId);
    await this.saveSettings(orgId, {
      ...settings,
      lastTestedAt: new Date().toISOString(),
      lastTestResult: success ? 'success' : 'error',
      lastTestError: error,
    });
  }

  /**
   * Check if email is configured for an organization
   */
  static async isConfigured(orgId: string): Promise<boolean> {
    const settings = await this.getSettings(orgId);
    
    if (!settings.enabled) return false;
    
    // Check if at least one provider is configured
    const hasResend = !!settings.resendApiKey;
    const hasSmtp = !!(settings.smtpHost && settings.smtpUser);
    
    return hasResend || hasSmtp;
  }
}

export default EmailSettingsService;






