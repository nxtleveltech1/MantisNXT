import { query } from '@/lib/database'
import { PRICING_TABLES } from '@/lib/db/pricing-schema'
import type { MarketIntelSnapshot } from './types'

const SNAPSHOT_TABLE = PRICING_TABLES.MARKET_INTEL_SNAPSHOT

export class MarketIntelligenceService {
  async recordSnapshots(snapshots: MarketIntelSnapshot[]): Promise<void> {
    if (snapshots.length === 0) return

    const insertValues: string[] = []
    const params: unknown[] = []
    let idx = 1

    for (const snapshot of snapshots) {
      insertValues.push(
        `(
          $${idx++}, $${idx++}, $${idx++}, $${idx++}, $${idx++},
          $${idx++}, $${idx++}, $${idx++}, $${idx++}, $${idx++},
          $${idx++}, $${idx++}, $${idx++}, $${idx++}, $${idx++},
          $${idx++}, $${idx++}, $${idx++}
        )`,
      )
      params.push(
        snapshot.snapshot_id,
        snapshot.org_id,
        snapshot.competitor_id,
        snapshot.match_id ?? null,
        snapshot.run_id ?? null,
        snapshot.observed_at,
        JSON.stringify(snapshot.identifiers),
        JSON.stringify(snapshot.pricing),
        JSON.stringify(snapshot.availability),
        JSON.stringify(snapshot.product_details),
        JSON.stringify(snapshot.promotions ?? []),
        JSON.stringify(snapshot.shipping ?? {}),
        JSON.stringify(snapshot.reviews ?? {}),
        JSON.stringify(snapshot.price_position ?? {}),
        snapshot.market_share_estimate ?? null,
        JSON.stringify(snapshot.elasticity_signals ?? {}),
        JSON.stringify(snapshot.raw_payload ?? {}),
        snapshot.hash,
        snapshot.is_anomaly ?? false,
      )
    }

    await query(
      `
        INSERT INTO ${SNAPSHOT_TABLE} (
          snapshot_id,
          org_id,
          competitor_id,
          match_id,
          run_id,
          observed_at,
          identifiers,
          pricing,
          availability,
          product_details,
          promotions,
          shipping,
          reviews,
          price_position,
          market_share_estimate,
          elasticity_signals,
          raw_payload,
          hash,
          is_anomaly
        )
        VALUES ${insertValues.join(', ')}
        ON CONFLICT (org_id, hash) DO NOTHING
      `,
      params,
    )
  }

  async listSnapshots(orgId: string, filters?: { competitorId?: string; limit?: number }) {
    const conditions = ['org_id = $1']
    const params: unknown[] = [orgId]
    if (filters?.competitorId) {
      params.push(filters.competitorId)
      conditions.push(`competitor_id = $${params.length}`)
    }

    const limitClause = `LIMIT ${filters?.limit ?? 100}`
    const result = await query<MarketIntelSnapshot>(
      `
        SELECT *
        FROM ${SNAPSHOT_TABLE}
        WHERE ${conditions.join(' AND ')}
        ORDER BY observed_at DESC
        ${limitClause}
      `,
      params,
    )
    return result.rows
  }

  async exportSnapshots(orgId: string, format: 'json' | 'csv', filters?: { competitorId?: string }) {
    const rows = await this.listSnapshots(orgId, filters)
    if (format === 'json') {
      return JSON.stringify(rows, null, 2)
    }

    const header = [
      'snapshot_id',
      'observed_at',
      'competitor_id',
      'match_id',
      'price_regular',
      'price_sale',
      'availability_status',
      'market_position_rank',
      'currency',
    ]
    const lines = [header.join(',')]

    for (const row of rows) {
      const pricing = row.pricing as Record<string, unknown>
      const availability = row.availability as Record<string, unknown>
      const pricePosition = row.price_position as Record<string, unknown>
      lines.push(
        [
          row.snapshot_id,
          row.observed_at.toISOString(),
          row.competitor_id,
          row.match_id ?? '',
          pricing?.regular_price ?? '',
          pricing?.sale_price ?? '',
          availability?.status ?? '',
          pricePosition?.rank ?? '',
          pricing?.currency ?? '',
        ]
          .map((value) => `"${String(value ?? '').replace(/"/g, '""')}"`)
          .join(','),
      )
    }

    return lines.join('\n')
  }
}

