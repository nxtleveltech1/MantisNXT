import type { ScrapingProviderId, ProviderHealth, ScrapeRequest, ScrapeResult } from './types'
import type { ScrapingProvider } from './providers/BaseScrapingProvider'
import { FirecrawlProvider } from './providers/FirecrawlProvider'

export class ScrapingProviderRegistry {
  private providers = new Map<ScrapingProviderId, ScrapingProvider>()

  constructor(initialProviders?: ScrapingProvider[]) {
    const defaults = initialProviders ?? [new FirecrawlProvider()]
    defaults.forEach((provider) => {
      this.providers.set(provider.id, provider)
    })
  }

  register(provider: ScrapingProvider) {
    this.providers.set(provider.id, provider)
  }

  get(providerId: ScrapingProviderId): ScrapingProvider {
    const provider = this.providers.get(providerId)
    if (!provider) {
      throw new Error(`Scraping provider ${providerId} is not registered`)
    }
    return provider
  }

  list(): ScrapingProvider[] {
    return Array.from(this.providers.values())
  }

  async health(): Promise<ProviderHealth[]> {
    return Promise.all(this.list().map((provider) => provider.health()))
  }

  async scrapeWithProvider(
    providerId: ScrapingProviderId,
    request: ScrapeRequest,
  ): Promise<ScrapeResult> {
    return this.get(providerId).scrape(request)
  }
}

