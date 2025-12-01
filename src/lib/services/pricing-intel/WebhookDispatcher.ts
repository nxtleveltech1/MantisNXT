import crypto from 'node:crypto';

import { PRICING_TABLES } from '@/lib/db/pricing-schema';
import { query } from '@/lib/database';

const WEBHOOK_TABLE = PRICING_TABLES.MARKET_INTEL_WEBHOOK;

export class WebhookDispatcher {
  async list(orgId: string) {
    const result = await query(
      `SELECT * FROM ${WEBHOOK_TABLE} WHERE org_id = $1 AND enabled = true`,
      [orgId]
    );
    return result.rows;
  }

  async register(
    orgId: string,
    payload: { event_type: string; target_url: string; secret?: string }
  ) {
    const result = await query(
      `
        INSERT INTO ${WEBHOOK_TABLE} (
          webhook_id,
          org_id,
          event_type,
          target_url,
          secret,
          enabled
        ) VALUES (
          gen_random_uuid(),
          $1,
          $2,
          $3,
          $4,
          true
        )
        RETURNING *
      `,
      [orgId, payload.event_type, payload.target_url, payload.secret ?? null]
    );
    return result.rows[0];
  }

  async disable(orgId: string, webhookId: string) {
    await query(
      `
        UPDATE ${WEBHOOK_TABLE}
        SET enabled = false, updated_at = NOW()
        WHERE org_id = $1 AND webhook_id = $2
      `,
      [orgId, webhookId]
    );
  }

  async dispatch(orgId: string, event: string, body: Record<string, unknown>) {
    const webhooks = await this.list(orgId);
    await Promise.all(
      webhooks
        .filter(hook => hook.event_type === event)
        .map(async hook => {
          const signature = hook.secret ? await this.signPayload(hook.secret, body) : undefined;
          try {
            await fetch(hook.target_url, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                ...(signature ? { 'x-hook-signature': signature } : {}),
              },
              body: JSON.stringify(body),
            });
          } catch (error) {
            await query(
              `
                UPDATE ${WEBHOOK_TABLE}
                SET failure_count = failure_count + 1,
                    last_failure_at = NOW()
                WHERE webhook_id = $1
              `,
              [hook.webhook_id]
            );
            throw error;
          }
        })
    );
  }

  private async signPayload(secret: string, payload: Record<string, unknown>) {
    const hmac = crypto.createHmac('sha256', secret);
    hmac.update(JSON.stringify(payload));
    return hmac.digest('hex');
  }
}
