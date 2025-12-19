/**
 * Logistics Settings Service
 *
 * Stores org-level logistics configuration in `organization.settings.logistics`.
 */
import { query } from '@/lib/database/unified-connection';
import { z } from 'zod';

export const LogisticsSettingsSchema = z.object({
  pickup_address: z
    .object({
      formatted: z.string().min(1).optional(),
      street: z.string().optional(),
      city: z.string().optional(),
      province: z.string().optional(),
      postalCode: z.string().optional(),
      country: z.string().optional(),
      lat: z.number().optional(),
      lng: z.number().optional(),
    })
    .optional(),
  default_service_tier: z.enum(['standard', 'express', 'urgent']).optional(),
  default_courier_provider_id: z.string().uuid().optional(),
  enable_live_tracking: z.boolean().optional(),
});

export type LogisticsSettings = z.infer<typeof LogisticsSettingsSchema>;

type OrgSettingsRow = { settings: unknown };

export class LogisticsSettingsService {
  static async getSettings(orgId: string): Promise<LogisticsSettings> {
    const result = await query<OrgSettingsRow>('SELECT settings FROM organization WHERE id = $1', [
      orgId,
    ]);

    const settings = (result.rows[0]?.settings ?? {}) as Record<string, unknown>;
    const logistics = (settings.logistics ?? {}) as unknown;

    return LogisticsSettingsSchema.parse(logistics);
  }

  static async updateSettings(orgId: string, patch: LogisticsSettings): Promise<LogisticsSettings> {
    // Load existing settings
    const result = await query<OrgSettingsRow>('SELECT settings FROM organization WHERE id = $1', [
      orgId,
    ]);
    const existing = (result.rows[0]?.settings ?? {}) as Record<string, unknown>;
    const existingLogistics = (existing.logistics ?? {}) as Record<string, unknown>;

    const nextLogistics = {
      ...existingLogistics,
      ...patch,
    };

    const validated = LogisticsSettingsSchema.parse(nextLogistics);

    const next = {
      ...existing,
      logistics: validated,
    };

    await query('UPDATE organization SET settings = $2 WHERE id = $1', [orgId, JSON.stringify(next)]);

    return validated;
  }
}


