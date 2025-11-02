import { db } from '@/lib/database';
import {
  AIServiceBase,
  type AIServiceBaseOptions,
  type AIServiceRequestOptions,
  type AIServiceResponse,
} from './base';

// ============================================================================
// Types
// ============================================================================

export type AIServiceType =
  | 'demand_forecasting'
  | 'supplier_scoring'
  | 'anomaly_detection'
  | 'sentiment_analysis'
  | 'recommendation_engine'
  | 'chatbot'
  | 'document_analysis';

export type AIProvider = 'openai' | 'anthropic' | 'azure_openai' | 'bedrock';

export interface AIServiceConfig {
  id: string;
  orgId: string;
  serviceType: AIServiceType;
  isEnabled: boolean;
  provider: AIProvider;
  modelName: string;
  apiEndpoint?: string;
  config: Record<string, any>;
  rateLimitPerHour: number;
  createdAt: Date;
  updatedAt: Date;
  createdBy?: string;
  updatedBy?: string;
}

export interface CreateConfigData {
  serviceType: AIServiceType;
  provider?: AIProvider;
  modelName: string;
  apiEndpoint?: string;
  config?: Record<string, any>;
  rateLimitPerHour?: number;
  createdBy?: string;
}

export interface UpdateConfigData {
  provider?: AIProvider;
  modelName?: string;
  apiEndpoint?: string;
  config?: Record<string, any>;
  rateLimitPerHour?: number;
  updatedBy?: string;
}

export interface ConnectionTestResult {
  success: boolean;
  provider: AIProvider;
  model: string;
  latencyMs: number;
  error?: string;
}

export interface RateLimitStatus {
  allowed: boolean;
  currentUsage: number;
  limit: number;
  resetAt: Date;
  remainingCalls: number;
}

// ============================================================================
// Service Implementation
// ============================================================================

export class AIServiceConfigService extends AIServiceBase<AIServiceRequestOptions> {
  constructor(options?: AIServiceBaseOptions) {
    super('AIServiceConfigService', options);
  }

  /**
   * Create a new AI service configuration
   */
  async createConfig(
    orgId: string,
    config: CreateConfigData,
    options?: AIServiceRequestOptions,
  ): Promise<AIServiceResponse<AIServiceConfig>> {
    return this.executeOperation(
      'config.create',
      async () => {
        const result = await db.query(
          `
          INSERT INTO ai_service_config (
            org_id, service_type, provider, model_name,
            api_endpoint, config, rate_limit_per_hour, created_by
          )
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
          RETURNING *
          `,
          [
            orgId,
            config.serviceType,
            config.provider || 'openai',
            config.modelName,
            config.apiEndpoint,
            JSON.stringify(config.config || {}),
            config.rateLimitPerHour || 1000,
            config.createdBy,
          ],
        );

        return this.mapConfigRow(result.rows[0]);
      },
      options,
      { orgId, serviceType: config.serviceType },
    );
  }

  /**
   * Update an existing AI service configuration
   */
  async updateConfig(
    configId: string,
    updates: UpdateConfigData,
    options?: AIServiceRequestOptions,
  ): Promise<AIServiceResponse<AIServiceConfig>> {
    return this.executeOperation(
      'config.update',
      async () => {
        const setClauses: string[] = [];
        const values: any[] = [];
        let paramIndex = 1;

        if (updates.provider !== undefined) {
          setClauses.push(`provider = $${paramIndex++}`);
          values.push(updates.provider);
        }
        if (updates.modelName !== undefined) {
          setClauses.push(`model_name = $${paramIndex++}`);
          values.push(updates.modelName);
        }
        if (updates.apiEndpoint !== undefined) {
          setClauses.push(`api_endpoint = $${paramIndex++}`);
          values.push(updates.apiEndpoint);
        }
        if (updates.config !== undefined) {
          setClauses.push(`config = $${paramIndex++}`);
          values.push(JSON.stringify(updates.config));
        }
        if (updates.rateLimitPerHour !== undefined) {
          setClauses.push(`rate_limit_per_hour = $${paramIndex++}`);
          values.push(updates.rateLimitPerHour);
        }
        if (updates.updatedBy !== undefined) {
          setClauses.push(`updated_by = $${paramIndex++}`);
          values.push(updates.updatedBy);
        }

        if (setClauses.length === 0) {
          throw new Error('No valid updates provided');
        }

        values.push(configId);

        const result = await db.query(
          `
          UPDATE ai_service_config
          SET ${setClauses.join(', ')}, updated_at = NOW()
          WHERE id = $${paramIndex}
          RETURNING *
          `,
          values,
        );

        if (result.rows.length === 0) {
          throw new Error(`Configuration ${configId} not found`);
        }

        return this.mapConfigRow(result.rows[0]);
      },
      options,
      { configId },
    );
  }

  /**
   * Delete an AI service configuration
   */
  async deleteConfig(
    configId: string,
    options?: AIServiceRequestOptions,
  ): Promise<AIServiceResponse<void>> {
    return this.executeOperation(
      'config.delete',
      async () => {
        const result = await db.query(
          `
          DELETE FROM ai_service_config
          WHERE id = $1
          RETURNING id
          `,
          [configId],
        );

        if (result.rows.length === 0) {
          throw new Error(`Configuration ${configId} not found`);
        }
      },
      options,
      { configId },
    );
  }

  /**
   * Get AI service configuration
   */
  async getConfig(
    orgId: string,
    serviceType: AIServiceType,
    options?: AIServiceRequestOptions,
  ): Promise<AIServiceResponse<AIServiceConfig | null>> {
    return this.executeOperation(
      'config.get',
      async () => {
        const result = await db.query(
          `
          SELECT * FROM ai_service_config
          WHERE org_id = $1 AND service_type = $2
          `,
          [orgId, serviceType],
        );

        if (result.rows.length === 0) {
          return null;
        }

        return this.mapConfigRow(result.rows[0]);
      },
      options,
      { orgId, serviceType },
    );
  }

  /**
   * List all AI service configurations for an organization
   */
  async listConfigs(
    orgId: string,
    options?: AIServiceRequestOptions,
  ): Promise<AIServiceResponse<AIServiceConfig[]>> {
    return this.executeOperation(
      'config.list',
      async () => {
        const result = await db.query(
          `
          SELECT * FROM ai_service_config
          WHERE org_id = $1
          ORDER BY service_type
          `,
          [orgId],
        );

        return result.rows.map((row) => this.mapConfigRow(row));
      },
      options,
      { orgId },
    );
  }

  /**
   * Enable an AI service
   */
  async enableService(
    orgId: string,
    serviceType: AIServiceType,
    options?: AIServiceRequestOptions,
  ): Promise<AIServiceResponse<void>> {
    return this.executeOperation(
      'config.enable',
      async () => {
        const result = await db.query(
          `
          UPDATE ai_service_config
          SET is_enabled = true, updated_at = NOW()
          WHERE org_id = $1 AND service_type = $2
          RETURNING id
          `,
          [orgId, serviceType],
        );

        if (result.rows.length === 0) {
          throw new Error(
            `No configuration found for service type ${serviceType}`,
          );
        }
      },
      options,
      { orgId, serviceType, action: 'enable' },
    );
  }

  /**
   * Disable an AI service
   */
  async disableService(
    orgId: string,
    serviceType: AIServiceType,
    options?: AIServiceRequestOptions,
  ): Promise<AIServiceResponse<void>> {
    return this.executeOperation(
      'config.disable',
      async () => {
        const result = await db.query(
          `
          UPDATE ai_service_config
          SET is_enabled = false, updated_at = NOW()
          WHERE org_id = $1 AND service_type = $2
          RETURNING id
          `,
          [orgId, serviceType],
        );

        if (result.rows.length === 0) {
          throw new Error(
            `No configuration found for service type ${serviceType}`,
          );
        }
      },
      options,
      { orgId, serviceType, action: 'disable' },
    );
  }

  /**
   * Update provider for a service
   */
  async updateProvider(
    orgId: string,
    serviceType: AIServiceType,
    provider: AIProvider,
    modelName: string,
    options?: AIServiceRequestOptions,
  ): Promise<AIServiceResponse<void>> {
    return this.executeOperation(
      'config.updateProvider',
      async () => {
        const result = await db.query(
          `
          UPDATE ai_service_config
          SET provider = $1, model_name = $2, updated_at = NOW()
          WHERE org_id = $3 AND service_type = $4
          RETURNING id
          `,
          [provider, modelName, orgId, serviceType],
        );

        if (result.rows.length === 0) {
          throw new Error(
            `No configuration found for service type ${serviceType}`,
          );
        }
      },
      options,
      { orgId, serviceType, provider, modelName },
    );
  }

  /**
   * Test connection to AI provider
   */
  async testConnection(
    configId: string,
    options?: AIServiceRequestOptions,
  ): Promise<AIServiceResponse<ConnectionTestResult>> {
    return this.executeOperation(
      'config.testConnection',
      async ({ service }) => {
        // Get config
        const configResult = await db.query(
          `
          SELECT * FROM ai_service_config WHERE id = $1
          `,
          [configId],
        );

        if (configResult.rows.length === 0) {
          throw new Error(`Configuration ${configId} not found`);
        }

        const config = this.mapConfigRow(configResult.rows[0]);
        const startTime = Date.now();

        try {
          // Test with a simple prompt
          const response = await service.generateText('Test connection', {
            provider: config.provider as any,
            model: config.modelName,
            maxTokens: 10,
            temperature: 0,
          });

          const latencyMs = Date.now() - startTime;

          return {
            success: true,
            provider: config.provider,
            model: config.modelName,
            latencyMs,
          };
        } catch (error) {
          const latencyMs = Date.now() - startTime;
          const errorMessage =
            error instanceof Error ? error.message : String(error);

          return {
            success: false,
            provider: config.provider,
            model: config.modelName,
            latencyMs,
            error: errorMessage,
          };
        }
      },
      options,
      { configId },
    );
  }

  /**
   * Check rate limit status
   */
  async checkRateLimit(
    orgId: string,
    serviceType: AIServiceType,
    options?: AIServiceRequestOptions,
  ): Promise<AIServiceResponse<RateLimitStatus>> {
    return this.executeOperation(
      'config.checkRateLimit',
      async () => {
        // Get config
        const configResult = await db.query(
          `
          SELECT rate_limit_per_hour FROM ai_service_config
          WHERE org_id = $1 AND service_type = $2
          `,
          [orgId, serviceType],
        );

        if (configResult.rows.length === 0) {
          throw new Error(
            `No configuration found for service type ${serviceType}`,
          );
        }

        const limit = configResult.rows[0].rate_limit_per_hour;

        // Count recent usage (last hour)
        const usageResult = await db.query(
          `
          SELECT COUNT(*) as usage_count
          FROM ai_prediction
          WHERE org_id = $1
            AND service_type = $2
            AND created_at >= NOW() - INTERVAL '1 hour'
          `,
          [orgId, serviceType],
        );

        const currentUsage = parseInt(usageResult.rows[0]?.usage_count || '0');
        const remainingCalls = Math.max(0, limit - currentUsage);

        // Calculate reset time (top of next hour)
        const now = new Date();
        const resetAt = new Date(now);
        resetAt.setHours(resetAt.getHours() + 1, 0, 0, 0);

        return {
          allowed: currentUsage < limit,
          currentUsage,
          limit,
          resetAt,
          remainingCalls,
        };
      },
      options,
      { orgId, serviceType },
    );
  }

  /**
   * Update rate limit for a configuration
   */
  async updateRateLimit(
    configId: string,
    rateLimit: number,
    options?: AIServiceRequestOptions,
  ): Promise<AIServiceResponse<void>> {
    return this.executeOperation(
      'config.updateRateLimit',
      async () => {
        if (rateLimit < 0) {
          throw new Error('Rate limit must be non-negative');
        }

        const result = await db.query(
          `
          UPDATE ai_service_config
          SET rate_limit_per_hour = $1, updated_at = NOW()
          WHERE id = $2
          RETURNING id
          `,
          [rateLimit, configId],
        );

        if (result.rows.length === 0) {
          throw new Error(`Configuration ${configId} not found`);
        }
      },
      options,
      { configId, rateLimit },
    );
  }

  /**
   * Map database row to AIServiceConfig
   */
  private mapConfigRow(row: any): AIServiceConfig {
    return {
      id: row.id,
      orgId: row.org_id,
      serviceType: row.service_type,
      isEnabled: row.is_enabled,
      provider: row.provider,
      modelName: row.model_name,
      apiEndpoint: row.api_endpoint,
      config: row.config || {},
      rateLimitPerHour: row.rate_limit_per_hour,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
      createdBy: row.created_by,
      updatedBy: row.updated_by,
    };
  }
}
