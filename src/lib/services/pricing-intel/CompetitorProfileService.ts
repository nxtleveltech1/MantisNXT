import { query } from '@/lib/database'
import { PRICING_TABLES } from '@/lib/db/pricing-schema'
import type {
  CompetitorProfile,
  CompetitorDataSource,
} from './types'

const COMPETITOR_TABLE = PRICING_TABLES.COMPETITOR_PROFILE
const DATA_SOURCE_TABLE = PRICING_TABLES.COMPETITOR_DATA_SOURCE

export class CompetitorProfileService {
  async list(orgId: string): Promise<CompetitorProfile[]> {
    const result = await query<CompetitorProfile>(
      `
        SELECT *
        FROM ${COMPETITOR_TABLE}
        WHERE org_id = $1 AND deleted_at IS NULL
        ORDER BY company_name
      `,
      [orgId],
    )
    return result.rows
  }

  async get(orgId: string, competitorId: string): Promise<CompetitorProfile | null> {
    const result = await query<CompetitorProfile>(
      `
        SELECT *
        FROM ${COMPETITOR_TABLE}
        WHERE org_id = $1 AND competitor_id = $2 AND deleted_at IS NULL
      `,
      [orgId, competitorId],
    )
    return result.rows[0] ?? null
  }

  async create(
    orgId: string,
    input: Omit<CompetitorProfile, 'competitor_id' | 'org_id' | 'created_at' | 'updated_at' | 'deleted_at'>,
  ): Promise<CompetitorProfile> {
    const result = await query<CompetitorProfile>(
      `
        INSERT INTO ${COMPETITOR_TABLE} (
          competitor_id,
          org_id,
          company_name,
          website_url,
          marketplace_listings,
          social_profiles,
          custom_data_sources,
          default_currency,
          proxy_policy,
          captcha_policy,
          robots_txt_behavior,
          notes,
          created_by,
          updated_by
        )
        VALUES (
          gen_random_uuid(),
          $1,
          $2,
          $3,
          $4::jsonb,
          $5::jsonb,
          $6::jsonb,
          $7,
          $8::jsonb,
          $9::jsonb,
          $10,
          $11,
          $12,
          $13
        )
        RETURNING *
      `,
      [
        orgId,
        input.company_name,
        input.website_url ?? null,
        JSON.stringify(input.marketplace_listings ?? []),
        JSON.stringify(input.social_profiles ?? []),
        JSON.stringify(input.custom_data_sources ?? []),
        input.default_currency ?? 'USD',
        JSON.stringify(input.proxy_policy ?? {}),
        JSON.stringify(input.captcha_policy ?? {}),
        input.robots_txt_behavior ?? 'respect',
        input.notes ?? null,
        input.created_by ?? null,
        input.updated_by ?? null,
      ],
    )
    return result.rows[0]
  }

  async update(
    orgId: string,
    competitorId: string,
    input: Partial<CompetitorProfile>,
  ): Promise<CompetitorProfile | null> {
    const result = await query<CompetitorProfile>(
      `
        UPDATE ${COMPETITOR_TABLE}
        SET
          company_name = COALESCE($3, company_name),
          website_url = COALESCE($4, website_url),
          marketplace_listings = COALESCE($5::jsonb, marketplace_listings),
          social_profiles = COALESCE($6::jsonb, social_profiles),
          custom_data_sources = COALESCE($7::jsonb, custom_data_sources),
          default_currency = COALESCE($8, default_currency),
          proxy_policy = COALESCE($9::jsonb, proxy_policy),
          captcha_policy = COALESCE($10::jsonb, captcha_policy),
          robots_txt_behavior = COALESCE($11, robots_txt_behavior),
          notes = COALESCE($12, notes),
          updated_by = COALESCE($13, updated_by),
          updated_at = NOW()
        WHERE org_id = $1 AND competitor_id = $2 AND deleted_at IS NULL
        RETURNING *
      `,
      [
        orgId,
        competitorId,
        input.company_name ?? null,
        input.website_url ?? null,
        input.marketplace_listings ? JSON.stringify(input.marketplace_listings) : null,
        input.social_profiles ? JSON.stringify(input.social_profiles) : null,
        input.custom_data_sources ? JSON.stringify(input.custom_data_sources) : null,
        input.default_currency ?? null,
        input.proxy_policy ? JSON.stringify(input.proxy_policy) : null,
        input.captcha_policy ? JSON.stringify(input.captcha_policy) : null,
        input.robots_txt_behavior ?? null,
        input.notes ?? null,
        input.updated_by ?? null,
      ],
    )
    return result.rows[0] ?? null
  }

  async archive(orgId: string, competitorId: string): Promise<void> {
    await query(
      `
        UPDATE ${COMPETITOR_TABLE}
        SET deleted_at = NOW()
        WHERE org_id = $1 AND competitor_id = $2
      `,
      [orgId, competitorId],
    )
  }

  async listDataSources(orgId: string, competitorId: string): Promise<CompetitorDataSource[]> {
    const result = await query<CompetitorDataSource>(
      `
        SELECT *
        FROM ${DATA_SOURCE_TABLE}
        WHERE org_id = $1 AND competitor_id = $2
        ORDER BY created_at DESC
      `,
      [orgId, competitorId],
    )
    return result.rows
  }

  async addDataSource(
    orgId: string,
    competitorId: string,
    payload: Omit<CompetitorDataSource, 'data_source_id' | 'org_id' | 'created_at' | 'updated_at'>,
  ): Promise<CompetitorDataSource> {
    const result = await query<CompetitorDataSource>(
      `
        INSERT INTO ${DATA_SOURCE_TABLE} (
          data_source_id,
          competitor_id,
          org_id,
          source_type,
          label,
          endpoint_url,
          auth_config,
          rate_limit_config,
          robots_txt_cache,
          last_success_at,
          last_status,
          health_status,
          metadata
        )
        VALUES (
          gen_random_uuid(),
          $1,
          $2,
          $3,
          $4,
          $5,
          $6::jsonb,
          $7::jsonb,
          $8::jsonb,
          $9,
          $10,
          $11,
          $12::jsonb
        )
        RETURNING *
      `,
      [
        competitorId,
        orgId,
        payload.source_type,
        payload.label ?? null,
        payload.endpoint_url,
        JSON.stringify(payload.auth_config ?? {}),
        JSON.stringify(payload.rate_limit_config ?? {}),
        payload.robots_txt_cache ? JSON.stringify(payload.robots_txt_cache) : null,
        payload.last_success_at ?? null,
        payload.last_status ?? null,
        payload.health_status ?? 'unknown',
        JSON.stringify(payload.metadata ?? {}),
      ],
    )
    return result.rows[0]
  }

  async deleteDataSource(orgId: string, dataSourceId: string): Promise<void> {
    await query(
      `
        DELETE FROM ${DATA_SOURCE_TABLE}
        WHERE org_id = $1 AND data_source_id = $2
      `,
      [orgId, dataSourceId],
    )
  }
}

