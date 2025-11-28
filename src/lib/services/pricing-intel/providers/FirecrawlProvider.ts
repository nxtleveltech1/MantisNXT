import crypto from 'node:crypto'

import { FirecrawlService } from '@/services/web-scraping/FirecrawlService'
import type { ScrapeRequest, ScrapeResult, ProviderHealth } from '../types'
import type { ScrapingProvider } from './BaseScrapingProvider'

export class FirecrawlProvider implements ScrapingProvider {
  readonly id = 'firecrawl' as const
  readonly displayName = 'Firecrawl'
  private client: FirecrawlService

  constructor(client?: FirecrawlService) {
    this.client = client ?? new FirecrawlService()
  }

  async health(): Promise<ProviderHealth> {
    return {
      id: this.id,
      status: this.client.isConfigured() ? 'healthy' : 'unavailable',
      lastChecked: Date.now(),
      error: this.client.isConfigured() ? undefined : 'Missing FIRECRAWL_API_KEY',
    }
  }

  async scrape(request: ScrapeRequest): Promise<ScrapeResult> {
    if (!this.client.isConfigured()) {
      return {
        success: false,
        products: [],
        errors: ['Firecrawl API key not configured'],
      }
    }

    const errors: string[] = []
    const snapshots: ScrapeResult['products'] = []

    for (const match of request.products ?? []) {
      try {
        const result = await this.client.scrape({
          url: match.competitor_url ?? request.dataSource.endpoint_url,
          formats: ['markdown', 'html'],
          timeout: request.options?.rateLimitMs
            ? Math.max(request.options.rateLimitMs, 5_000)
            : 30_000,
        })

        if (!result.success || !result.data) {
          errors.push(
            `Failed to scrape ${match.competitor_product_id}: ${result.error ?? 'Unknown error'}`,
          )
          continue
        }

        snapshots.push({
          snapshot_id: crypto.randomUUID(),
          org_id: request.orgId,
          competitor_id: request.competitor.competitor_id,
          match_id: match.match_id,
          run_id: undefined,
          observed_at: new Date(),
          identifiers: {
            sku: match.competitor_sku,
            upc: match.upc,
            ean: match.ean,
            asin: match.asin,
            mpn: match.mpn,
          },
          pricing: {
            regular_price: null,
            sale_price: null,
            currency: request.competitor.default_currency ?? 'USD',
          },
          availability: {
            status: 'unknown',
          },
          product_details: {
            title: match.competitor_title,
            url: match.competitor_url ?? request.dataSource.endpoint_url,
            content: result.data.markdown ?? result.data.html ?? '',
          },
          promotions: [],
          shipping: {},
          reviews: {},
          price_position: {},
          market_share_estimate: null,
          elasticity_signals: {},
          raw_payload: result.data,
          hash: crypto
            .createHash('sha256')
            .update(JSON.stringify(result.data))
            .digest('hex'),
          is_anomaly: false,
          created_at: new Date(),
        })
      } catch (error) {
        errors.push(
          `Firecrawl error for ${match.competitor_product_id}: ${
            error instanceof Error ? error.message : String(error)
          }`,
        )
      }
    }

    return {
      success: errors.length === 0,
      products: snapshots,
      errors,
    }
  }
}

