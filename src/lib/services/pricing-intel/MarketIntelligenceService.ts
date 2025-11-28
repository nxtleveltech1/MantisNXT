import { query } from '@/lib/database'
import { PRICING_TABLES } from '@/lib/db/pricing-schema'
import { SCHEMA } from '@/lib/db/schema-contract'
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

  async exportSnapshots(
    orgId: string,
    format: 'json' | 'csv' | 'excel',
    filters?: { competitorId?: string }
  ) {
    const rows = await this.listSnapshots(orgId, filters)

    if (format === 'json') {
      return JSON.stringify(rows, null, 2)
    }

    if (format === 'excel') {
      const XLSX = await import('xlsx')
      const workbook = XLSX.utils.book_new()

      // Prepare data
      const data = rows.map((row) => {
        const pricing = row.pricing as Record<string, unknown>
        const availability = row.availability as Record<string, unknown>
        const pricePosition = row.price_position as Record<string, unknown>
        const productDetails = row.product_details as Record<string, unknown>
        const identifiers = row.identifiers as Record<string, unknown>

        return {
          'Snapshot ID': row.snapshot_id,
          'Observed At': row.observed_at.toISOString(),
          'Competitor ID': row.competitor_id,
          'Match ID': row.match_id ?? '',
          'Product Title': productDetails?.title ?? '',
          'SKU': identifiers?.sku ?? '',
          'UPC': identifiers?.upc ?? '',
          'EAN': identifiers?.ean ?? '',
          'Regular Price': pricing?.regular_price ?? '',
          'Sale Price': pricing?.sale_price ?? '',
          'Currency': pricing?.currency ?? 'USD',
          'Availability Status': availability?.status ?? '',
          'Stock Quantity': availability?.quantity ?? '',
          'Market Position Rank': pricePosition?.rank ?? '',
          'Market Share Estimate': row.market_share_estimate ?? '',
          'Is Anomaly': row.is_anomaly ? 'Yes' : 'No',
          'Product URL': identifiers?.url ?? productDetails?.url ?? '',
        }
      })

      const worksheet = XLSX.utils.json_to_sheet(data)

      // Auto-size columns
      const colWidths = [
        { wch: 36 }, // Snapshot ID
        { wch: 20 }, // Observed At
        { wch: 36 }, // Competitor ID
        { wch: 36 }, // Match ID
        { wch: 40 }, // Product Title
        { wch: 20 }, // SKU
        { wch: 15 }, // UPC
        { wch: 15 }, // EAN
        { wch: 12 }, // Regular Price
        { wch: 12 }, // Sale Price
        { wch: 8 }, // Currency
        { wch: 18 }, // Availability Status
        { wch: 14 }, // Stock Quantity
        { wch: 18 }, // Market Position Rank
        { wch: 18 }, // Market Share Estimate
        { wch: 12 }, // Is Anomaly
        { wch: 50 }, // Product URL
      ]
      worksheet['!cols'] = colWidths

      XLSX.utils.book_append_sheet(workbook, worksheet, 'Market Intelligence')

      // Generate Excel buffer
      return XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' })
    }

    // CSV format
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

  /**
   * Calculate price positioning for a product across all competitors
   */
  async getPricePositioning(
    orgId: string,
    productId: string,
    matchIds: string[]
  ): Promise<{
    internalPrice: number
    competitorPrices: Array<{
      competitorId: string
      competitorName: string
      price: number
      currency: string
      observedAt: Date
    }>
    rank: number // 1 = lowest, higher = more expensive
    percentile: number // 0-100
    spread: number // price difference between lowest and highest
    marketMedian: number
    marketAverage: number
    position: 'lowest' | 'below_median' | 'at_median' | 'above_median' | 'highest'
  } | null> {
    if (matchIds.length === 0) {
      return null
    }

    // Get internal product price
    const internalPriceResult = await query<{ price: number; currency: string | null }>(
      `
        SELECT unit_price as price, 'ZAR' as currency
        FROM public.inventory_item
        WHERE id = $1
        LIMIT 1
      `,
      [productId]
    )

    if (internalPriceResult.rows.length === 0) {
      return null
    }

    const internalPrice = internalPriceResult.rows[0].price
    const currency = internalPriceResult.rows[0].currency || 'USD'

    // Get latest snapshots for matched products
    const latestSnapshots = await query<{
      snapshot_id: string
      competitor_id: string
      pricing: unknown
      observed_at: Date
      competitor_name?: string
    }>(
      `
        SELECT DISTINCT ON (snap.competitor_id)
          snap.snapshot_id,
          snap.competitor_id,
          snap.pricing,
          snap.observed_at,
          cp.company_name as competitor_name
        FROM ${SNAPSHOT_TABLE} snap
        LEFT JOIN ${PRICING_TABLES.COMPETITOR_PROFILE} cp ON cp.competitor_id = snap.competitor_id
        WHERE snap.org_id = $1
          AND snap.match_id = ANY($2::uuid[])
        ORDER BY snap.competitor_id, snap.observed_at DESC
      `,
      [orgId, matchIds]
    )

    const competitorPrices: Array<{
      competitorId: string
      competitorName: string
      price: number
      currency: string
      observedAt: Date
    }> = []

    for (const snapshot of latestSnapshots.rows) {
      const pricing = snapshot.pricing as Record<string, unknown>
      const price = (pricing?.sale_price || pricing?.regular_price) as number | undefined

      if (price && typeof price === 'number') {
        competitorPrices.push({
          competitorId: snapshot.competitor_id,
          competitorName: snapshot.competitor_name || 'Unknown',
          price,
          currency: (pricing?.currency as string) || currency,
          observedAt: snapshot.observed_at,
        })
      }
    }

    if (competitorPrices.length === 0) {
      return {
        internalPrice,
        competitorPrices: [],
        rank: 1,
        percentile: 50,
        spread: 0,
        marketMedian: internalPrice,
        marketAverage: internalPrice,
        position: 'at_median',
      }
    }

    // Calculate market statistics
    const allPrices = [internalPrice, ...competitorPrices.map((cp) => cp.price)].sort((a, b) => a - b)
    const sortedCompetitorPrices = [...competitorPrices.map((cp) => cp.price)].sort((a, b) => a - b)

    const marketMedian = sortedCompetitorPrices[Math.floor(sortedCompetitorPrices.length / 2)]
    const marketAverage = sortedCompetitorPrices.reduce((sum, p) => sum + p, 0) / sortedCompetitorPrices.length
    const spread = sortedCompetitorPrices[sortedCompetitorPrices.length - 1] - sortedCompetitorPrices[0]

    // Find rank (1 = lowest)
    const rank = allPrices.indexOf(internalPrice) + 1
    const percentile = (rank / allPrices.length) * 100

    // Determine position
    let position: 'lowest' | 'below_median' | 'at_median' | 'above_median' | 'highest'
    if (rank === 1) {
      position = 'lowest'
    } else if (rank === allPrices.length) {
      position = 'highest'
    } else if (internalPrice < marketMedian) {
      position = 'below_median'
    } else if (internalPrice > marketMedian) {
      position = 'above_median'
    } else {
      position = 'at_median'
    }

    return {
      internalPrice,
      competitorPrices,
      rank,
      percentile: Math.round(percentile * 100) / 100,
      spread,
      marketMedian,
      marketAverage,
      position,
    }
  }

  /**
   * Calculate market share estimation based on pricing competitiveness
   */
  async calculateMarketShare(
    orgId: string,
    productId: string,
    matchIds: string[]
  ): Promise<number> {
    const positioning = await this.getPricePositioning(orgId, productId, matchIds)

    if (!positioning || positioning.competitorPrices.length === 0) {
      return 0
    }

    // Simple market share estimation based on price position
    // Lower price = higher market share assumption (can be refined with actual sales data)
    const baseShare = 100 / (positioning.competitorPrices.length + 1) // Equal share baseline

    // Adjust based on price position
    // Lowest price gets 2x base, highest gets 0.5x base, others scale linearly
    let shareMultiplier = 1.0

    if (positioning.position === 'lowest') {
      shareMultiplier = 2.0
    } else if (positioning.position === 'highest') {
      shareMultiplier = 0.5
    } else if (positioning.position === 'below_median') {
      shareMultiplier = 1.5
    } else if (positioning.position === 'above_median') {
      shareMultiplier = 0.75
    }

    return Math.round(baseShare * shareMultiplier * 100) / 100
  }

  /**
   * Calculate price elasticity signals based on competitor price changes
   */
  async calculatePriceElasticity(
    orgId: string,
    productId: string,
    matchIds: string[]
  ): Promise<{
    elasticity: number // < 1 = inelastic, > 1 = elastic
    confidence: number // 0-100
    signals: Array<{
      type: string
      value: number
      description: string
    }>
  }> {
    // Get price history for all competitors
    const priceHistory = await query<{
      competitor_id: string
      pricing: unknown
      observed_at: Date
    }>(
      `
        SELECT competitor_id, pricing, observed_at
        FROM ${SNAPSHOT_TABLE}
        WHERE org_id = $1
          AND match_id = ANY($2::uuid[])
          AND observed_at >= NOW() - INTERVAL '90 days'
        ORDER BY observed_at DESC
      `,
      [orgId, matchIds]
    )

    if (priceHistory.rows.length < 2) {
      return {
        elasticity: 1.0,
        confidence: 0,
        signals: [
          {
            type: 'insufficient_data',
            value: 0,
            description: 'Not enough historical data to calculate elasticity',
          },
        ],
      }
    }

    // Simple elasticity calculation based on price variance
    const prices = priceHistory.rows.map((row) => {
      const pricing = row.pricing as Record<string, unknown>
      return (pricing?.sale_price || pricing?.regular_price) as number | undefined
    }).filter((p): p is number => typeof p === 'number')

    if (prices.length < 2) {
      return {
        elasticity: 1.0,
        confidence: 0,
        signals: [
          {
            type: 'insufficient_data',
            value: 0,
            description: 'Not enough valid price data',
          },
        ],
      }
    }

    const avgPrice = prices.reduce((sum, p) => sum + p, 0) / prices.length
    const priceVariance = prices.reduce((sum, p) => sum + Math.pow(p - avgPrice, 2), 0) / prices.length
    const priceStdDev = Math.sqrt(priceVariance)
    const coefficientOfVariation = priceStdDev / avgPrice

    // Estimate elasticity: higher price volatility suggests more elastic market
    // This is a simplified calculation - real elasticity requires demand data
    const estimatedElasticity = Math.max(0.5, Math.min(2.0, 1.0 + coefficientOfVariation))

    const signals = [
      {
        type: 'price_volatility',
        value: coefficientOfVariation,
        description: `Price coefficient of variation: ${(coefficientOfVariation * 100).toFixed(1)}%`,
      },
      {
        type: 'data_points',
        value: prices.length,
        description: `Analysis based on ${prices.length} price observations`,
      },
    ]

    return {
      elasticity: Math.round(estimatedElasticity * 100) / 100,
      confidence: Math.min(100, Math.round((prices.length / 20) * 100)),
      signals,
    }
  }

  /**
   * Identify assortment gaps (products competitors sell that we don't)
   */
  async identifyAssortmentGaps(
    orgId: string,
    competitorId?: string
  ): Promise<Array<{
    competitorId: string
    competitorName: string
    productTitle: string
    productUrl?: string
    identifiers: Record<string, unknown>
    pricing: Record<string, unknown>
    detectedAt: Date
  }>> {
    const conditions = ['snap.org_id = $1', 'snap.match_id IS NULL']
    const params: unknown[] = [orgId]

    if (competitorId) {
      params.push(competitorId)
      conditions.push(`snap.competitor_id = $${params.length}`)
    }

    const result = await query<{
      snapshot_id: string
      competitor_id: string
      competitor_name: string
      identifiers: unknown
      pricing: unknown
      product_details: unknown
      observed_at: Date
    }>(
      `
        SELECT DISTINCT ON (snap.competitor_id, (snap.product_details->>'title'))
          snap.snapshot_id,
          snap.competitor_id,
          cp.company_name as competitor_name,
          snap.identifiers,
          snap.pricing,
          snap.product_details,
          snap.observed_at
        FROM ${SNAPSHOT_TABLE} snap
        LEFT JOIN ${PRICING_TABLES.COMPETITOR_PROFILE} cp ON cp.competitor_id = snap.competitor_id
        WHERE ${conditions.join(' AND ')}
        ORDER BY snap.competitor_id, (snap.product_details->>'title'), snap.observed_at DESC
        LIMIT 100
      `,
      params
    )

    return result.rows.map((row) => {
      const productDetails = row.product_details as Record<string, unknown>
      const identifiers = row.identifiers as Record<string, unknown>
      const pricing = row.pricing as Record<string, unknown>

      return {
        competitorId: row.competitor_id,
        competitorName: row.competitor_name || 'Unknown',
        productTitle: (productDetails?.title as string) || 'Unknown Product',
        productUrl: identifiers?.url as string | undefined,
        identifiers,
        pricing,
        detectedAt: row.observed_at,
      }
    })
  }

  /**
   * Detect new products added by competitors
   */
  async detectNewProducts(
    orgId: string,
    competitorId?: string,
    sinceDays = 30
  ): Promise<Array<{
    competitorId: string
    competitorName: string
    productTitle: string
    productUrl?: string
    identifiers: Record<string, unknown>
    pricing: Record<string, unknown>
    firstDetectedAt: Date
  }>> {
    const conditions = ['snap.org_id = $1', `snap.observed_at >= NOW() - INTERVAL '${sinceDays} days'`]
    const params: unknown[] = [orgId]

    if (competitorId) {
      params.push(competitorId)
      conditions.push(`snap.competitor_id = $${params.length}`)
    }

    // Find products first seen in the time window (not seen before)
    const result = await query<{
      snapshot_id: string
      competitor_id: string
      competitor_name: string
      identifiers: unknown
      pricing: unknown
      product_details: unknown
      first_seen: Date
    }>(
      `
        WITH first_observations AS (
          SELECT
            snap.competitor_id,
            snap.identifiers,
            MIN(snap.observed_at) as first_seen,
            COUNT(*) as observation_count
          FROM ${SNAPSHOT_TABLE} snap
          WHERE ${conditions.join(' AND ')}
          GROUP BY snap.competitor_id, snap.identifiers
          HAVING MIN(snap.observed_at) >= NOW() - INTERVAL '${sinceDays} days'
        ),
        earlier_snapshots AS (
          SELECT DISTINCT snap.competitor_id, snap.identifiers
          FROM ${SNAPSHOT_TABLE} snap
          WHERE snap.org_id = $1
            AND snap.observed_at < NOW() - INTERVAL '${sinceDays} days'
        )
        SELECT DISTINCT ON (fo.competitor_id, fo.identifiers)
          snap.snapshot_id,
          snap.competitor_id,
          cp.company_name as competitor_name,
          snap.identifiers,
          snap.pricing,
          snap.product_details,
          fo.first_seen
        FROM first_observations fo
        JOIN ${SNAPSHOT_TABLE} snap ON 
          snap.competitor_id = fo.competitor_id 
          AND snap.identifiers = fo.identifiers
        LEFT JOIN ${PRICING_TABLES.COMPETITOR_PROFILE} cp ON cp.competitor_id = snap.competitor_id
        LEFT JOIN earlier_snapshots es ON 
          es.competitor_id = fo.competitor_id 
          AND es.identifiers = fo.identifiers
        WHERE es.competitor_id IS NULL
        ORDER BY fo.competitor_id, fo.identifiers, snap.observed_at DESC
        LIMIT 100
      `,
      params
    )

    return result.rows.map((row) => {
      const productDetails = row.product_details as Record<string, unknown>
      const identifiers = row.identifiers as Record<string, unknown>
      const pricing = row.pricing as Record<string, unknown>

      return {
        competitorId: row.competitor_id,
        competitorName: row.competitor_name || 'Unknown',
        productTitle: (productDetails?.title as string) || 'Unknown Product',
        productUrl: identifiers?.url as string | undefined,
        identifiers,
        pricing,
        firstDetectedAt: row.first_seen,
      }
    })
  }

  /**
   * Track competitive response time (how quickly competitors react to price changes)
   */
  async trackCompetitiveResponse(
    orgId: string,
    productId: string,
    matchIds: string[]
  ): Promise<Array<{
    competitorId: string
    competitorName: string
    responseTimeHours: number
    priceChange: number
    priceChangePercent: number
    respondedAt: Date
  }>> {
    // Get our price changes from price_history table
    const ourPriceChanges = await query<{
      old_price: number | null
      new_price: number
      changed_at: Date
    }>(
      `
        SELECT 
          old_price,
          new_price,
          effective_date as changed_at
        FROM ${SCHEMA.CORE}.price_history
        WHERE org_id = $1
          AND inventory_item_id = $2
          AND effective_date >= NOW() - INTERVAL '90 days'
        ORDER BY effective_date DESC
        LIMIT 10
      `,
      [orgId, productId]
    )

    if (ourPriceChanges.rows.length === 0) {
      return []
    }

    const responses: Array<{
      competitorId: string
      competitorName: string
      responseTimeHours: number
      priceChange: number
      priceChangePercent: number
      respondedAt: Date
    }> = []

    for (const priceChange of ourPriceChanges.rows) {
      // Get competitor prices before and after our change
      const competitorPrices = await query<{
        competitor_id: string
        competitor_name: string
        pricing: unknown
        observed_at: Date
      }>(
        `
          SELECT DISTINCT ON (snap.competitor_id)
            snap.competitor_id,
            cp.company_name as competitor_name,
            snap.pricing,
            snap.observed_at
          FROM ${SNAPSHOT_TABLE} snap
          LEFT JOIN ${PRICING_TABLES.COMPETITOR_PROFILE} cp ON cp.competitor_id = snap.competitor_id
          WHERE snap.org_id = $1
            AND snap.match_id = ANY($2::uuid[])
            AND snap.observed_at BETWEEN $3 - INTERVAL '7 days' AND $3 + INTERVAL '30 days'
          ORDER BY snap.competitor_id, ABS(EXTRACT(EPOCH FROM (snap.observed_at - $3)))
        `,
        [orgId, matchIds, priceChange.changed_at]
      )

      for (const competitor of competitorPrices.rows) {
        const pricing = competitor.pricing as Record<string, unknown>
        const price = (pricing?.sale_price || pricing?.regular_price) as number | undefined

        if (price) {
          const timeDiff = competitor.observed_at.getTime() - priceChange.changed_at.getTime()
          const responseTimeHours = timeDiff / (1000 * 60 * 60)

          if (responseTimeHours > 0 && responseTimeHours < 720) {
            // Response within 30 days
            const priceChangeAmount = price - priceChange.new_price
            const priceChangePercent = ((price - priceChange.new_price) / priceChange.new_price) * 100

            responses.push({
              competitorId: competitor.competitor_id,
              competitorName: competitor.competitor_name || 'Unknown',
              responseTimeHours: Math.round(responseTimeHours * 10) / 10,
              priceChange: priceChangeAmount,
              priceChangePercent: Math.round(priceChangePercent * 100) / 100,
              respondedAt: competitor.observed_at,
            })
          }
        }
      }
    }

    return responses.sort((a, b) => a.responseTimeHours - b.responseTimeHours)
  }

  /**
   * Calculate total cost comparison including shipping
   */
  async getTotalCostComparison(
    orgId: string,
    productId: string,
    matchIds: string[]
  ): Promise<{
    internalTotalCost: number
    competitorCosts: Array<{
      competitorId: string
      competitorName: string
      basePrice: number
      shippingCost: number
      totalCost: number
      currency: string
    }>
    cheapestOption: {
      competitorId: string
      competitorName: string
      totalCost: number
    } | null
  }> {
    const positioning = await this.getPricePositioning(orgId, productId, matchIds)

    if (!positioning) {
      return {
        internalTotalCost: 0,
        competitorCosts: [],
        cheapestOption: null,
      }
    }

    // Get our shipping cost (placeholder - should come from actual shipping config)
    const internalShippingCost = 0 // TODO: Get from shipping configuration

    const competitorCosts = positioning.competitorPrices.map((cp) => {
      const shippingCost = 0 // TODO: Extract from snapshot.shipping JSONB
      return {
        competitorId: cp.competitorId,
        competitorName: cp.competitorName,
        basePrice: cp.price,
        shippingCost,
        totalCost: cp.price + shippingCost,
        currency: cp.currency,
      }
    })

    const allCosts = [
      { competitorId: 'internal', competitorName: 'Us', totalCost: positioning.internalPrice + internalShippingCost },
      ...competitorCosts.map((cc) => ({
        competitorId: cc.competitorId,
        competitorName: cc.competitorName,
        totalCost: cc.totalCost,
      })),
    ]

    const cheapest = allCosts.reduce((min, curr) => (curr.totalCost < min.totalCost ? curr : min))

    return {
      internalTotalCost: positioning.internalPrice + internalShippingCost,
      competitorCosts,
      cheapestOption: cheapest.competitorId === 'internal' ? null : cheapest,
    }
  }
}

