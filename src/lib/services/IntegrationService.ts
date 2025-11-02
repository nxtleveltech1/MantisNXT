/**
 * IntegrationService
 * Service for managing external system integrations
 */

import { query } from '@/lib/database';
import crypto from 'crypto';

export interface IntegrationConnector {
  id: string;
  org_id: string;
  name: string;
  provider: 'woocommerce' | 'odoo' | 'custom';
  config: Record<string, any>;
  credentials_encrypted?: string;
  status: 'active' | 'inactive' | 'error' | 'configuring';
  sync_frequency_minutes: number;
  last_sync_at?: string;
  last_sync_status?: 'success' | 'error' | 'pending';
  error_message?: string;
  retry_count?: number;
  created_by: string;
  created_at?: string;
  updated_at?: string;
}

export interface CreateConnectorInput {
  org_id: string;
  name: string;
  provider: 'woocommerce' | 'odoo' | 'custom';
  config: Record<string, any>;
  credentials: Record<string, any>;
  sync_frequency_minutes?: number;
  created_by: string;
}

export interface UpdateConnectorInput {
  name?: string;
  config?: Record<string, any>;
  credentials?: Record<string, any>;
  sync_frequency_minutes?: number;
  status?: 'active' | 'inactive' | 'error' | 'configuring';
}

export interface SyncStatistics {
  connector_id: string;
  entity_type: string;
  total_synced: number;
  successful: number;
  failed: number;
  last_sync_at?: string;
}

export class IntegrationService {
  private static ENCRYPTION_KEY = process.env.INTEGRATION_ENCRYPTION_KEY || 'default-key-change-in-production';

  /**
   * Encrypt credentials using AES-256-CBC
   */
  private static encryptCredentials(credentials: Record<string, any>): string {
    const key = Buffer.from(this.ENCRYPTION_KEY.padEnd(32, '0').substring(0, 32));
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv('aes-256-cbc', key, iv);

    const credentialsString = JSON.stringify(credentials);
    let encrypted = cipher.update(credentialsString, 'utf8', 'hex');
    encrypted += cipher.final('hex');

    return iv.toString('hex') + ':' + encrypted;
  }

  /**
   * Decrypt credentials
   */
  private static decryptCredentials(encryptedData: string): Record<string, any> {
    const key = Buffer.from(this.ENCRYPTION_KEY.padEnd(32, '0').substring(0, 32));
    const parts = encryptedData.split(':');
    const iv = Buffer.from(parts[0], 'hex');
    const encrypted = parts[1];

    const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv);
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');

    return JSON.parse(decrypted);
  }

  /**
   * Create a new integration connector
   */
  static async createConnector(input: CreateConnectorInput): Promise<IntegrationConnector> {
    const encryptedCredentials = this.encryptCredentials(input.credentials);

    const result = await query<IntegrationConnector>(
      `INSERT INTO integration_connector (
        org_id, name, provider, config, credentials_encrypted,
        status, sync_frequency_minutes, created_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *`,
      [
        input.org_id,
        input.name,
        input.provider,
        JSON.stringify(input.config),
        encryptedCredentials,
        'configuring',
        input.sync_frequency_minutes || 60,
        input.created_by
      ]
    );

    if (!result.rows.length) {
      throw new Error('Failed to create connector');
    }

    return result.rows[0];
  }

  /**
   * Get connector by ID
   */
  static async getConnector(connectorId: string): Promise<IntegrationConnector | null> {
    const result = await query<IntegrationConnector>(
      'SELECT * FROM integration_connector WHERE id = $1',
      [connectorId]
    );

    return result.rows[0] || null;
  }

  /**
   * Get connector with decrypted credentials
   */
  static async getConnectorWithCredentials(
    connectorId: string
  ): Promise<(IntegrationConnector & { credentials: Record<string, any> }) | null> {
    const connector = await this.getConnector(connectorId);

    if (!connector) {
      return null;
    }

    let credentials = {};
    if (connector.credentials_encrypted) {
      try {
        credentials = this.decryptCredentials(connector.credentials_encrypted);
      } catch (error) {
        console.error('Failed to decrypt credentials:', error);
      }
    }

    return {
      ...connector,
      credentials,
    };
  }

  /**
   * List all connectors for an organization
   */
  static async listConnectors(orgId: string, provider?: string): Promise<IntegrationConnector[]> {
    let sql = 'SELECT * FROM integration_connector WHERE org_id = $1';
    const params: any[] = [orgId];

    if (provider) {
      sql += ' AND provider = $2';
      params.push(provider);
    }

    sql += ' ORDER BY created_at DESC';

    const result = await query<IntegrationConnector>(sql, params);

    return result.rows;
  }

  /**
   * Update connector
   */
  static async updateConnector(
    connectorId: string,
    updates: UpdateConnectorInput
  ): Promise<IntegrationConnector> {
    const setClauses: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    if (updates.name !== undefined) {
      setClauses.push(`name = $${paramIndex}`);
      values.push(updates.name);
      paramIndex++;
    }

    if (updates.config !== undefined) {
      setClauses.push(`config = $${paramIndex}`);
      values.push(JSON.stringify(updates.config));
      paramIndex++;
    }

    if (updates.sync_frequency_minutes !== undefined) {
      setClauses.push(`sync_frequency_minutes = $${paramIndex}`);
      values.push(updates.sync_frequency_minutes);
      paramIndex++;
    }

    if (updates.status !== undefined) {
      setClauses.push(`status = $${paramIndex}`);
      values.push(updates.status);
      paramIndex++;
    }

    if (updates.credentials !== undefined) {
      setClauses.push(`credentials_encrypted = $${paramIndex}`);
      values.push(this.encryptCredentials(updates.credentials));
      paramIndex++;
    }

    setClauses.push(`updated_at = NOW()`);
    values.push(connectorId);

    const result = await query<IntegrationConnector>(
      `UPDATE integration_connector
       SET ${setClauses.join(', ')}
       WHERE id = $${paramIndex}
       RETURNING *`,
      values
    );

    if (!result.rows.length) {
      throw new Error('Failed to update connector');
    }

    return result.rows[0];
  }

  /**
   * Delete connector
   */
  static async deleteConnector(connectorId: string): Promise<void> {
    await query(
      'DELETE FROM integration_connector WHERE id = $1',
      [connectorId]
    );
  }

  /**
   * Update connector status
   */
  static async updateConnectorStatus(
    connectorId: string,
    status: 'active' | 'inactive' | 'error' | 'configuring',
    errorMessage?: string
  ): Promise<void> {
    const setClauses = ['status = $1', 'updated_at = NOW()'];
    const values: any[] = [status];
    let paramIndex = 2;

    if (errorMessage !== undefined) {
      setClauses.push(`error_message = $${paramIndex}`);
      values.push(errorMessage);
      paramIndex++;
    }

    values.push(connectorId);

    await query(
      `UPDATE integration_connector
       SET ${setClauses.join(', ')}
       WHERE id = $${paramIndex}`,
      values
    );
  }

  /**
   * Record sync completion
   */
  static async recordSyncCompletion(
    connectorId: string,
    status: 'success' | 'error',
    errorMessage?: string
  ): Promise<void> {
    const setClauses = [
      'last_sync_at = NOW()',
      'last_sync_status = $1',
      'updated_at = NOW()'
    ];
    const values: any[] = [status];
    let paramIndex = 2;

    if (status === 'success') {
      setClauses.push(`retry_count = 0`);
      setClauses.push(`error_message = NULL`);
    } else if (errorMessage) {
      setClauses.push(`error_message = $${paramIndex}`);
      values.push(errorMessage);
      paramIndex++;
    }

    values.push(connectorId);

    await query(
      `UPDATE integration_connector
       SET ${setClauses.join(', ')}
       WHERE id = $${paramIndex}`,
      values
    );
  }

  /**
   * Get sync statistics
   */
  static async getSyncStatistics(
    connectorId: string,
    hours: number = 24
  ): Promise<SyncStatistics[]> {
    // This would require a stored procedure or complex query
    // For now, return empty array
    console.warn('getSyncStatistics not fully implemented for Neon');
    return [];
  }

  /**
   * Test connection for a connector
   */
  static async testConnection(connectorId: string): Promise<{ success: boolean; message: string }> {
    const connector = await this.getConnectorWithCredentials(connectorId);

    if (!connector) {
      return { success: false, message: 'Connector not found' };
    }

    try {
      // Import appropriate service based on provider
      if (connector.provider === 'woocommerce') {
        const { WooCommerceService } = await import('./WooCommerceService');
        const wooService = new WooCommerceService({
          url: connector.config.url,
          consumerKey: connector.credentials.consumerKey,
          consumerSecret: connector.credentials.consumerSecret,
        });

        const isConnected = await wooService.testConnection();
        return {
          success: isConnected,
          message: isConnected ? 'Connection successful' : 'Connection failed',
        };
      } else if (connector.provider === 'odoo') {
        const { OdooService } = await import('./OdooService');
        const odooService = new OdooService({
          url: connector.config.url,
          database: connector.config.database,
          username: connector.credentials.username,
          password: connector.credentials.password,
        });

        const isConnected = await odooService.testConnection();
        return {
          success: isConnected,
          message: isConnected ? 'Connection successful' : 'Connection failed',
        };
      } else {
        return { success: false, message: 'Unsupported provider' };
      }
    } catch (error) {
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Connection test failed',
      };
    }
  }

  /**
   * Get recent sync logs
   */
  static async getRecentSyncLogs(connectorId: string, limit: number = 10) {
    const result = await query(
      `SELECT * FROM sync_log
       WHERE connector_id = $1
       ORDER BY started_at DESC
       LIMIT $2`,
      [connectorId, limit]
    );

    return result.rows;
  }

  /**
   * Get unresolved conflicts
   */
  static async getUnresolvedConflicts(connectorId: string, limit: number = 5) {
    const result = await query(
      `SELECT * FROM sync_conflict
       WHERE connector_id = $1 AND is_resolved = false
       ORDER BY created_at DESC
       LIMIT $2`,
      [connectorId, limit]
    );

    return result.rows;
  }
}