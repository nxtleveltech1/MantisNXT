import { query } from '@/lib/database';
import { decryptDartAiToken, encryptDartAiToken } from '@/lib/security/dartai-token-encryption';

export type DartAiTokenStatus = {
  connected: boolean;
  lastValidatedAt: string | null;
  updatedAt: string | null;
};

export class DartAiNotConnectedError extends Error {
  code = 'DARTAI_NOT_CONNECTED' as const;
  constructor() {
    super('Dart-AI is not connected for this user');
    this.name = 'DartAiNotConnectedError';
  }
}

export async function upsertDartAiUserToken(params: {
  orgId: string;
  userId: string;
  token: string;
  ipAddress?: string;
  userAgent?: string;
}): Promise<void> {
  const encrypted = encryptDartAiToken(params.token.trim());

  await query(
    `
    INSERT INTO auth.dartai_user_tokens (org_id, user_id, encrypted_token)
    VALUES ($1, $2, $3)
    ON CONFLICT (org_id, user_id)
    DO UPDATE SET
      encrypted_token = EXCLUDED.encrypted_token,
      updated_at = NOW()
    `,
    [params.orgId, params.userId, encrypted]
  );

  await query(
    `
    INSERT INTO auth.dartai_token_audit_log (org_id, user_id, action, ip_address, user_agent, details)
    VALUES ($1, $2, $3, $4, $5, $6::jsonb)
    `,
    [
      params.orgId,
      params.userId,
      'connected',
      params.ipAddress || null,
      params.userAgent || null,
      JSON.stringify({}),
    ]
  );
}

export async function markDartAiTokenValidated(params: {
  orgId: string;
  userId: string;
  ipAddress?: string;
  userAgent?: string;
}): Promise<void> {
  await query(
    `
    UPDATE auth.dartai_user_tokens
    SET last_validated_at = NOW(), updated_at = NOW(), access_count = access_count + 1
    WHERE org_id = $1 AND user_id = $2
    `,
    [params.orgId, params.userId]
  );

  await query(
    `
    INSERT INTO auth.dartai_token_audit_log (org_id, user_id, action, ip_address, user_agent, details)
    VALUES ($1, $2, $3, $4, $5, $6::jsonb)
    `,
    [
      params.orgId,
      params.userId,
      'validated',
      params.ipAddress || null,
      params.userAgent || null,
      JSON.stringify({}),
    ]
  );
}

export async function disconnectDartAiUserToken(params: {
  orgId: string;
  userId: string;
  ipAddress?: string;
  userAgent?: string;
}): Promise<void> {
  await query(
    `
    DELETE FROM auth.dartai_user_tokens
    WHERE org_id = $1 AND user_id = $2
    `,
    [params.orgId, params.userId]
  );

  await query(
    `
    INSERT INTO auth.dartai_token_audit_log (org_id, user_id, action, ip_address, user_agent, details)
    VALUES ($1, $2, $3, $4, $5, $6::jsonb)
    `,
    [
      params.orgId,
      params.userId,
      'disconnected',
      params.ipAddress || null,
      params.userAgent || null,
      JSON.stringify({}),
    ]
  );
}

export async function getDartAiTokenStatus(params: {
  orgId: string;
  userId: string;
}): Promise<DartAiTokenStatus> {
  const result = await query<{
    last_validated_at: string | null;
    updated_at: string | null;
  }>(
    `
    SELECT last_validated_at, updated_at
    FROM auth.dartai_user_tokens
    WHERE org_id = $1 AND user_id = $2
    `,
    [params.orgId, params.userId]
  );

  if (result.rows.length === 0) {
    return { connected: false, lastValidatedAt: null, updatedAt: null };
  }

  return {
    connected: true,
    lastValidatedAt: result.rows[0].last_validated_at,
    updatedAt: result.rows[0].updated_at,
  };
}

export async function getDartAiUserToken(params: {
  orgId: string;
  userId: string;
  ipAddress?: string;
  userAgent?: string;
}): Promise<string> {
  const result = await query<{ encrypted_token: string }>(
    `
    SELECT encrypted_token
    FROM auth.dartai_user_tokens
    WHERE org_id = $1 AND user_id = $2
    `,
    [params.orgId, params.userId]
  );

  if (result.rows.length === 0) {
    throw new DartAiNotConnectedError();
  }

  // Track usage (no token exposure in logs)
  await query(
    `
    UPDATE auth.dartai_user_tokens
    SET last_used_at = NOW(), access_count = access_count + 1
    WHERE org_id = $1 AND user_id = $2
    `,
    [params.orgId, params.userId]
  );

  await query(
    `
    INSERT INTO auth.dartai_token_audit_log (org_id, user_id, action, ip_address, user_agent, details)
    VALUES ($1, $2, $3, $4, $5, $6::jsonb)
    `,
    [
      params.orgId,
      params.userId,
      'used',
      params.ipAddress || null,
      params.userAgent || null,
      JSON.stringify({}),
    ]
  );

  return decryptDartAiToken(result.rows[0].encrypted_token);
}


