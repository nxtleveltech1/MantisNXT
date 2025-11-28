import type {
  CompetitorProfile,
  CompetitorDataSource,
  CompetitorProductMatch,
  MarketIntelScrapeJob,
  MarketIntelScrapeRun,
  MarketIntelSnapshot,
  MarketIntelAlert,
  MarketIntelWebhookSubscription,
  MarketIntelDataPolicy,
} from '@/lib/db/pricing-schema'

export type ScrapingProviderId = 'firecrawl' | 'apify' | 'brightData' | 'scrapingBee' | 'custom'

export interface ScrapeRequest {
  orgId: string
  competitor: CompetitorProfile
  dataSource: CompetitorDataSource
  products?: CompetitorProductMatch[]
  options?: {
    rateLimitMs?: number
    timeWindow?: { start: string; end: string }
    metadata?: Record<string, unknown>
  }
}

export interface ScrapeResult {
  success: boolean
  products: MarketIntelSnapshot[]
  errors: string[]
  providerMetadata?: Record<string, unknown>
}

export interface ProviderHealth {
  id: ScrapingProviderId
  status: 'healthy' | 'degraded' | 'unavailable'
  lastChecked: number
  error?: string
}

export type {
  CompetitorProfile,
  CompetitorDataSource,
  CompetitorProductMatch,
  MarketIntelScrapeJob,
  MarketIntelScrapeRun,
  MarketIntelSnapshot,
  MarketIntelAlert,
  MarketIntelWebhookSubscription,
  MarketIntelDataPolicy,
}

