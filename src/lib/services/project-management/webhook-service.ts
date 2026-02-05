import crypto from 'crypto';
import { query } from '@/lib/database';

export type PmWebhook = {
  webhook_id: string;
  org_id: string;
  name: string;
  target_url: string;
  secret: string;
  events: string[];
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

export class WebhookService {
  static async list(orgId: string): Promise<PmWebhook[]> {
    const result = await query<PmWebhook>(
      `SELECT webhook_id, org_id, name, target_url, secret, events, is_active, created_at, updated_at
       FROM core.pm_webhook
       WHERE org_id = $1
       ORDER BY created_at DESC`,
      [orgId]
    );
    return result.rows;
  }

  static async create(params: {
    orgId: string;
    name: string;
    targetUrl: string;
    events: string[];
  }): Promise<PmWebhook> {
    const secret = crypto.randomBytes(32).toString('hex');
    const result = await query<PmWebhook>(
      `INSERT INTO core.pm_webhook (org_id, name, target_url, secret, events)
       VALUES ($1, $2, $3, $4, $5::text[])
       RETURNING webhook_id, org_id, name, target_url, secret, events, is_active, created_at, updated_at`,
      [params.orgId, params.name, params.targetUrl, secret, params.events]
    );
    return result.rows[0];
  }

  static async remove(orgId: string, webhookId: string): Promise<void> {
    await query('DELETE FROM core.pm_webhook WHERE org_id = $1 AND webhook_id = $2', [orgId, webhookId]);
  }

  static async deliver(params: {
    orgId: string;
    eventType: string;
    payload: Record<string, unknown>;
  }): Promise<void> {
    const hooks = await query<PmWebhook>(
      `SELECT * FROM core.pm_webhook
       WHERE org_id = $1 AND is_active = true
       AND ($2 = ANY(events) OR 'all' = ANY(events))`,
      [params.orgId, params.eventType]
    );

    if (hooks.rows.length === 0) return;

    const body = JSON.stringify({
      event: params.eventType,
      data: params.payload,
      sent_at: new Date().toISOString(),
    });

    for (const hook of hooks.rows) {
      const delivery = await query<{ delivery_id: string }>(
        `INSERT INTO core.pm_webhook_delivery (webhook_id, org_id, event_type, payload, status, attempt_count)
         VALUES ($1, $2, $3, $4::jsonb, 'pending', 0)
         RETURNING delivery_id`,
        [hook.webhook_id, params.orgId, params.eventType, JSON.stringify(params.payload)]
      );

      const signature = WebhookService.signPayload(hook.secret, body);
      let status: 'success' | 'failed' = 'failed';
      let responseStatus: number | null = null;
      let responseBody: string | null = null;

      try {
        const res = await fetch(hook.target_url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-PM-Event': params.eventType,
            'X-PM-Signature': signature,
          },
          body,
        });

        responseStatus = res.status;
        responseBody = await res.text();
        status = res.ok ? 'success' : 'failed';
      } catch (error) {
        responseBody = error instanceof Error ? error.message : 'Webhook delivery failed';
      }

      await query(
        `
        UPDATE core.pm_webhook_delivery
        SET status = $1, attempt_count = attempt_count + 1, response_status = $2, response_body = $3, updated_at = now()
        WHERE delivery_id = $4
        `,
        [status, responseStatus, responseBody, delivery.rows[0].delivery_id]
      );
    }
  }

  private static signPayload(secret: string, payload: string): string {
    const hmac = crypto.createHmac('sha256', secret);
    hmac.update(payload, 'utf8');
    return `sha256=${hmac.digest('hex')}`;
  }
}
