import * as cheerio from 'cheerio'
import { AIDataExtractionService } from '@/services/ai/AIDataExtractionService'

export interface ParsedProductData {
  regular_price?: number
  sale_price?: number
  currency?: string
  availability_status?: 'in_stock' | 'out_of_stock' | 'limited' | 'preorder' | 'unknown'
  stock_quantity?: number
  title?: string
  description?: string
  images?: string[]
  sku?: string
  upc?: string
  ean?: string
  asin?: string
  mpn?: string
  promotions?: Array<{
    type: string
    description: string
    discount_amount?: number
    discount_percent?: number
  }>
  shipping?: {
    cost?: number
    free_shipping_threshold?: number
    delivery_time?: string
  }
  reviews?: {
    average_rating?: number
    review_count?: number
  }
}

export class ProductDataParser {
  private aiExtractor: AIDataExtractionService

  constructor() {
    this.aiExtractor = new AIDataExtractionService()
  }

  /**
   * Parse product data from HTML content
   */
  async parseFromHTML(html: string, url: string): Promise<ParsedProductData> {
    const $ = cheerio.load(html)

    // Try structured data extraction first (JSON-LD, microdata)
    const structuredData = this.extractStructuredData($)
    if (structuredData) {
      return structuredData
    }

    // Fallback to heuristic parsing
    const heuristicData = this.parseWithHeuristics($, url)

    // Use AI extraction as final enhancement
    try {
      const aiData = await this.parseWithAI(html, url)
      return { ...heuristicData, ...aiData }
    } catch (error) {
      console.warn('AI extraction failed, using heuristic data only:', error)
      return heuristicData
    }
  }

  /**
   * Extract structured data from JSON-LD, microdata, or Open Graph
   */
  private extractStructuredData($: cheerio.CheerioAPI): ParsedProductData | null {
    // Extract JSON-LD structured data
    const jsonLd = $('script[type="application/ld+json"]')
    for (let i = 0; i < jsonLd.length; i++) {
      try {
        const data = JSON.parse($(jsonLd[i]).html() || '{}')
        if (data['@type'] === 'Product' || data['@type'] === 'ProductModel') {
          return this.parseJSONLDProduct(data)
        }
      } catch {
        // Invalid JSON, skip
      }
    }

    // Try microdata
    const productMicrodata = $('[itemtype*="Product"]')
    if (productMicrodata.length > 0) {
      return this.parseMicrodataProduct(productMicrodata)
    }

    return null
  }

  /**
   * Parse JSON-LD Product schema
   */
  private parseJSONLDProduct(data: Record<string, unknown>): ParsedProductData {
    const offers = Array.isArray(data.offers) ? data.offers[0] : data.offers
    const offer = offers as Record<string, unknown> | undefined

    return {
      title: (data.name as string) || undefined,
      description: (data.description as string) || undefined,
      regular_price: this.parsePrice(offer?.price),
      sale_price: offer?.price ? this.parsePrice(offer.price) : undefined,
      currency: (offer?.priceCurrency as string)?.toUpperCase() || 'USD',
      availability_status: this.parseAvailabilityStatus(offer?.availability),
      sku: (data.sku as string) || (offer?.sku as string) || undefined,
      mpn: (data.mpn as string) || undefined,
      upc: (data.gtin12 as string) || undefined,
      ean: (data.gtin13 as string) || undefined,
      images: Array.isArray(data.image) ? data.image.map((i) => String(i)) : data.image ? [String(data.image)] : undefined,
      reviews: data.aggregateRating
        ? {
            average_rating: (data.aggregateRating as Record<string, unknown>)?.ratingValue
              ? parseFloat(String((data.aggregateRating as Record<string, unknown>).ratingValue))
              : undefined,
            review_count: (data.aggregateRating as Record<string, unknown>)?.reviewCount
              ? parseInt(String((data.aggregateRating as Record<string, unknown>).reviewCount), 10)
              : undefined,
          }
        : undefined,
    }
  }

  /**
   * Parse microdata product
   */
  private parseMicrodataProduct($product: cheerio.Cheerio<cheerio.Element>): ParsedProductData {
    return {
      title: $product.find('[itemprop="name"]').text().trim() || undefined,
      description: $product.find('[itemprop="description"]').text().trim() || undefined,
      regular_price: this.parsePrice($product.find('[itemprop="price"]').attr('content')),
      currency: $product.find('[itemprop="priceCurrency"]').attr('content')?.toUpperCase() || 'USD',
      availability_status: this.parseAvailabilityStatus(
        $product.find('[itemprop="availability"]').attr('content'),
      ),
      sku: $product.find('[itemprop="sku"]').text().trim() || undefined,
      images: $product
        .find('[itemprop="image"]')
        .map((_, el) => $(el).attr('src') || $(el).attr('content'))
        .get()
        .filter((url): url is string => Boolean(url)),
    }
  }

  /**
   * Parse with heuristics (CSS selectors, patterns)
   */
  private parseWithHeuristics($: cheerio.CheerioAPI, url: string): ParsedProductData {
    const data: ParsedProductData = {}

    // Common price selectors
    const priceSelectors = [
      '.price',
      '.product-price',
      '[data-price]',
      '.price-current',
      '.sale-price',
      '.regular-price',
      '[itemprop="price"]',
      '.amount',
      '.price-value',
      '#price',
      '.product__price',
    ]

    for (const selector of priceSelectors) {
      const priceElement = $(selector).first()
      if (priceElement.length > 0) {
        const priceText = priceElement.text().trim() || priceElement.attr('content') || ''
        const parsed = this.parsePrice(priceText)
        if (parsed !== undefined) {
          data.sale_price = parsed
          break
        }
      }
    }

    // Regular price (usually strikethrough)
    const regularPriceSelectors = [
      '.price-regular',
      '.original-price',
      '.was-price',
      'del.price',
      '.price-before',
      '.compare-at-price',
    ]

    for (const selector of regularPriceSelectors) {
      const priceElement = $(selector).first()
      if (priceElement.length > 0) {
        const priceText = priceElement.text().trim()
        const parsed = this.parsePrice(priceText)
        if (parsed !== undefined) {
          data.regular_price = parsed
          break
        }
      }
    }

    // Title
    const titleSelectors = [
      'h1.product-title',
      'h1',
      '.product-name',
      '[itemprop="name"]',
      '.product__title',
      'title',
    ]
    for (const selector of titleSelectors) {
      const title = $(selector).first().text().trim()
      if (title && title.length < 200) {
        data.title = title
        break
      }
    }

    // Availability
    const availabilitySelectors = [
      '.stock-status',
      '.availability',
      '[data-availability]',
      '.in-stock',
      '.out-of-stock',
      '.add-to-cart',
      'button[type="submit"]',
    ]

    for (const selector of availabilitySelectors) {
      const element = $(selector).first()
      if (element.length > 0) {
        const text = element.text().toLowerCase()
        if (text.includes('out of stock') || text.includes('unavailable')) {
          data.availability_status = 'out_of_stock'
        } else if (text.includes('in stock') || text.includes('available')) {
          data.availability_status = 'in_stock'
        } else if (text.includes('pre-order')) {
          data.availability_status = 'preorder'
        } else if (text.includes('limited') || text.includes('few left')) {
          data.availability_status = 'limited'
        }
        if (data.availability_status) break
      }
    }

    // Currency detection
    if (!data.currency) {
      const priceText = $('.price, [data-price], .product-price').first().text()
      if (priceText.includes('$')) data.currency = 'USD'
      else if (priceText.includes('€')) data.currency = 'EUR'
      else if (priceText.includes('£')) data.currency = 'GBP'
      else if (priceText.includes('R')) data.currency = 'ZAR'
      else data.currency = 'USD' // default
    }

    return data
  }

  /**
   * Parse with AI extraction
   */
  private async parseWithAI(html: string, url: string): Promise<Partial<ParsedProductData>> {
    // Extract text content for AI analysis
    const $ = cheerio.load(html)
    $('script, style, nav, footer, header').remove()
    const textContent = $('body').text().substring(0, 8000)

    const prompt = `Extract product pricing and availability information from the following webpage content.

URL: ${url}

Content:
${textContent}

Extract the following information if available:
- regular_price: The original/list price before discounts (as number)
- sale_price: The current selling price (as number)
- currency: 3-letter currency code (USD, EUR, ZAR, etc.)
- availability_status: One of: "in_stock", "out_of_stock", "limited", "preorder", or "unknown"
- stock_quantity: Number of items in stock (if mentioned)
- title: Product name/title
- sku: Product SKU/code
- upc: UPC barcode
- ean: EAN barcode
- promotions: Array of active promotions with type, description, discount_amount or discount_percent
- shipping: Object with cost, free_shipping_threshold, delivery_time
- reviews: Object with average_rating (0-5) and review_count

Return ONLY the fields you can clearly identify. Use null for missing numeric values.`

    try {
      // Use AI to extract structured data
      // This would require integrating with an AI service
      // For now, return empty - can be enhanced later
      return {}
    } catch {
      return {}
    }
  }

  /**
   * Parse price from text or number
   */
  private parsePrice(value: unknown): number | undefined {
    if (typeof value === 'number') return value
    if (typeof value !== 'string') return undefined

    // Remove currency symbols and clean
    const cleaned = value.replace(/[^\d.,]/g, '').replace(',', '')
    const parsed = parseFloat(cleaned)
    return isNaN(parsed) ? undefined : parsed
  }

  /**
   * Parse availability status
   */
  private parseAvailabilityStatus(value: unknown): 'in_stock' | 'out_of_stock' | 'limited' | 'preorder' | 'unknown' {
    if (typeof value !== 'string') return 'unknown'

    const normalized = value.toLowerCase()
    if (normalized.includes('in stock') || normalized.includes('available')) return 'in_stock'
    if (normalized.includes('out of stock') || normalized.includes('unavailable')) return 'out_of_stock'
    if (normalized.includes('pre-order') || normalized.includes('preorder')) return 'preorder'
    if (normalized.includes('limited') || normalized.includes('few left')) return 'limited'
    return 'unknown'
  }
}

