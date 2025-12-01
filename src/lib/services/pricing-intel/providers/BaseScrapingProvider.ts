import type { ScrapeRequest, ScrapeResult, ProviderHealth, ScrapingProviderId } from '../types';

export interface ScrapingProvider {
  readonly id: ScrapingProviderId;
  readonly displayName: string;
  health(): Promise<ProviderHealth>;
  scrape(request: ScrapeRequest): Promise<ScrapeResult>;
}
