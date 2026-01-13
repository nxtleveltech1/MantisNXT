/**
 * Xero Token Manager
 * 
 * Handles OAuth2 token storage, retrieval, refresh, and revocation
 * for Xero API authentication. Tokens are encrypted at rest.
 */

import { TokenSet } from 'xero-node';
import { query, withTransaction } from '@/lib/database';
import { encryptPII, decryptPII } from '@/lib/security/encryption';
import { getXeroClient } from './client';
import type { XeroConnection, XeroTenant } from './types';
import { XeroAuthError } from './errors';

// ============================================================================
// TOKEN STORAGE
// ============================================================================

/**
 * Save token set to database with encryption
 * 
 * @param orgId - Organization ID
 * @param tokenSet - Token set from Xero OAuth callback
 * @param tenant - Xero tenant information
 */
export async function saveTokenSet(
  orgId: string,
  tokenSet: TokenSet,
  tenant: XeroTenant
): Promise<void> {
  const encryptedAccessToken = encryptPII(tokenSet.access_token || '');
  const encryptedRefreshToken = encryptPII(tokenSet.refresh_token || '');
  const expiresAt = tokenSet.expires_at 
    ? new Date(tokenSet.expires_at * 1000) 
    : new Date(Date.now() + 30 * 60 * 1000); // Default 30 min

  const scopes = tokenSet.scope?.split(' ') || [];

  await query(
    `INSERT INTO xero_connections (
      org_id, xero_tenant_id, xero_tenant_name, 
      access_token, refresh_token, token_expires_at,
      scopes, is_active, connected_at, updated_at
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, true, NOW(), NOW())
    ON CONFLICT (org_id, xero_tenant_id) 
    DO UPDATE SET
      xero_tenant_name = EXCLUDED.xero_tenant_name,
      access_token = EXCLUDED.access_token,
      refresh_token = EXCLUDED.refresh_token,
      token_expires_at = EXCLUDED.token_expires_at,
      scopes = EXCLUDED.scopes,
      is_active = true,
      updated_at = NOW()`,
    [
      orgId,
      tenant.tenantId,
      tenant.tenantName,
      encryptedAccessToken,
      encryptedRefreshToken,
      expiresAt,
      scopes,
    ]
  );
}

/**
 * Update existing token set after refresh
 * 
 * @param orgId - Organization ID
 * @param tokenSet - New token set from refresh
 */
export async function updateTokenSet(
  orgId: string,
  tokenSet: TokenSet
): Promise<void> {
  const encryptedAccessToken = encryptPII(tokenSet.access_token || '');
  const encryptedRefreshToken = encryptPII(tokenSet.refresh_token || '');
  const expiresAt = tokenSet.expires_at 
    ? new Date(tokenSet.expires_at * 1000) 
    : new Date(Date.now() + 30 * 60 * 1000);

  await query(
    `UPDATE xero_connections 
     SET access_token = $1, 
         refresh_token = $2, 
         token_expires_at = $3,
         updated_at = NOW()
     WHERE org_id = $4 AND is_active = true`,
    [encryptedAccessToken, encryptedRefreshToken, expiresAt, orgId]
  );
}

// ============================================================================
// TOKEN RETRIEVAL
// ============================================================================

/**
 * Get stored Xero connection for an organization
 * 
 * @param orgId - Organization ID
 * @returns XeroConnection or null if not found
 */
export async function getXeroConnection(orgId: string): Promise<XeroConnection | null> {
  const result = await query<{
    id: string;
    org_id: string;
    xero_tenant_id: string;
    xero_tenant_name: string | null;
    access_token: string;
    refresh_token: string;
    token_expires_at: Date;
    scopes: string[];
    is_active: boolean;
    connected_at: Date;
    last_sync_at: Date | null;
    created_at: Date;
    updated_at: Date;
  }>(
    `SELECT * FROM xero_connections 
     WHERE org_id = $1 AND is_active = true
     LIMIT 1`,
    [orgId]
  );

  if (result.rows.length === 0) {
    return null;
  }

  const row = result.rows[0];
  return {
    id: row.id,
    orgId: row.org_id,
    xeroTenantId: row.xero_tenant_id,
    xeroTenantName: row.xero_tenant_name,
    accessToken: row.access_token, // Still encrypted
    refreshToken: row.refresh_token, // Still encrypted
    tokenExpiresAt: row.token_expires_at,
    scopes: row.scopes || [],
    isActive: row.is_active,
    connectedAt: row.connected_at,
    lastSyncAt: row.last_sync_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

/**
 * Check if organization has an active Xero connection
 * 
 * @param orgId - Organization ID
 * @returns true if active connection exists
 */
export async function hasActiveConnection(orgId: string): Promise<boolean> {
  const result = await query<{ count: string }>(
    `SELECT COUNT(*) as count FROM xero_connections 
     WHERE org_id = $1 AND is_active = true`,
    [orgId]
  );

  return parseInt(result.rows[0]?.count || '0', 10) > 0;
}

// ============================================================================
// TOKEN REFRESH
// ============================================================================

/**
 * Get a valid token set, refreshing if necessary
 * 
 * @param orgId - Organization ID
 * @returns Valid TokenSet ready for API calls
 * @throws XeroAuthError if no connection or refresh fails
 */
export async function getValidTokenSet(orgId: string): Promise<{
  tokenSet: TokenSet;
  tenantId: string;
}> {
  const connection = await getXeroConnection(orgId);

  if (!connection) {
    throw new XeroAuthError(
      'No Xero connection found. Please connect to Xero first.',
      'NO_CONNECTION'
    );
  }

  // Decrypt tokens with error handling
  let accessToken: string;
  let refreshToken: string;
  
  try {
    accessToken = decryptPII(connection.accessToken);
    refreshToken = decryptPII(connection.refreshToken);
  } catch (error) {
    // Encryption key may have changed or data is corrupted
    throw new XeroAuthError(
      'Failed to decrypt stored tokens. The encryption key may have changed. Please reconnect to Xero.',
      'DECRYPTION_FAILED',
      error
    );
  }

  // Create token set
  const tokenSet = new TokenSet({
    access_token: accessToken,
    refresh_token: refreshToken,
    expires_at: Math.floor(connection.tokenExpiresAt.getTime() / 1000),
    token_type: 'Bearer',
  });

  // Check if token is expired or will expire in next 10 minutes
  // Xero access tokens are valid for 30 minutes, so refresh at 20 minutes used
  const expiresAt = connection.tokenExpiresAt.getTime();
  const tenMinutesFromNow = Date.now() + 10 * 60 * 1000;

  if (expiresAt <= tenMinutesFromNow) {
    // Token is expired or expiring soon - refresh it
    try {
      const client = getXeroClient();
      const newTokenSet = await client.refreshWithRefreshToken(
        process.env.XERO_CLIENT_ID!,
        process.env.XERO_CLIENT_SECRET!,
        refreshToken
      );

      // Save the new tokens
      await updateTokenSet(orgId, newTokenSet);

      return {
        tokenSet: newTokenSet,
        tenantId: connection.xeroTenantId,
      };
    } catch (error) {
      // Refresh failed - connection may need to be re-established
      throw new XeroAuthError(
        'Failed to refresh Xero token. Please reconnect to Xero.',
        'REFRESH_FAILED',
        error
      );
    }
  }

  return {
    tokenSet,
    tenantId: connection.xeroTenantId,
  };
}

// ============================================================================
// CONNECTION MANAGEMENT
// ============================================================================

/**
 * Revoke/disconnect Xero connection for an organization
 * 
 * @param orgId - Organization ID
 */
export async function revokeConnection(orgId: string): Promise<void> {
  await query(
    `UPDATE xero_connections 
     SET is_active = false, updated_at = NOW()
     WHERE org_id = $1`,
    [orgId]
  );
}

/**
 * Update last sync timestamp
 * 
 * @param orgId - Organization ID
 */
export async function updateLastSyncAt(orgId: string): Promise<void> {
  await query(
    `UPDATE xero_connections 
     SET last_sync_at = NOW(), updated_at = NOW()
     WHERE org_id = $1 AND is_active = true`,
    [orgId]
  );
}

/**
 * Get all active Xero connections (for background sync jobs)
 * 
 * @returns Array of organization IDs with active Xero connections
 */
export async function getAllActiveConnections(): Promise<string[]> {
  const result = await query<{ org_id: string }>(
    `SELECT org_id FROM xero_connections WHERE is_active = true`
  );

  return result.rows.map(row => row.org_id);
}

// ============================================================================
// TENANT MANAGEMENT
// ============================================================================

/**
 * Get tenant ID for an organization
 * 
 * @param orgId - Organization ID
 * @returns Xero tenant ID or null
 */
export async function getTenantId(orgId: string): Promise<string | null> {
  const connection = await getXeroConnection(orgId);
  return connection?.xeroTenantId || null;
}

/**
 * Get tenant name for display
 * 
 * @param orgId - Organization ID
 * @returns Xero tenant/organization name or null
 */
export async function getTenantName(orgId: string): Promise<string | null> {
  const connection = await getXeroConnection(orgId);
  return connection?.xeroTenantName || null;
}
