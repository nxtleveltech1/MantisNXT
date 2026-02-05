import { query } from '@/lib/database';

export type NotificationType = 'info' | 'success' | 'warning' | 'error' | 'system' | 'alert' | 'reminder';

export class NotificationService {
  static async notify(params: {
    orgId: string;
    userId: string | null;
    type: NotificationType;
    title: string;
    message: string;
    actionUrl?: string | null;
    metadata?: Record<string, unknown>;
    expiresAt?: string | null;
  }): Promise<void> {
    await query(
      `
      INSERT INTO public.notification (
        org_id, user_id, type, title, message, action_url, metadata, expires_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb, $8)
      `,
      [
        params.orgId,
        params.userId,
        params.type,
        params.title,
        params.message,
        params.actionUrl || null,
        JSON.stringify(params.metadata || {}),
        params.expiresAt || null,
      ]
    );
  }
}
