// Enhanced Supplier Intelligence Service with Web Discovery Integration
import { WebSearchService } from './WebSearchService'
import { WebScrapingService } from './WebScrapingService'
import { DataExtractionEngine } from './DataExtractionEngine'
import { SupplierFormData } from '@/types/supplier'

export interface WebDiscoveryResult {
  success: boolean
  data: any[]
  suppliers?: Array<{
    id: string
    name: string
    riskScore: number
    [key: string]: any
  }>
  error?: string
  metadata?: {
    searchType: 'query' | 'website'
    totalResults: number
    confidence: number
    sources: string[]
    processingTime?: number
    searchConfidence?: number
  }
}

export interface ExtractedSupplierData {
  companyName?: string
  description?: string
  industry?: string
  location?: string
  contactEmail?: string
  contactPhone?: string
  website?: string
  employees?: string
  founded?: string
  socialMedia?: {
    linkedin?: string
    twitter?: string
    facebook?: string
  }
  certifications?: string[]
  services?: string[]
  products?: string[]
  addresses?: {
    type: string
    street: string
    city: string
    country: string
    postalCode?: string
  }[]
}

export class SupplierIntelligenceService {
  private webSearchService: WebSearchService
  private webScrapingService: WebScrapingService
  private dataExtractionEngine: DataExtractionEngine

  constructor() {
    this.webSearchService = new WebSearchService()
    this.webScrapingService = new WebScrapingService()
    this.dataExtractionEngine = new DataExtractionEngine()
  }

  /**
   * Perform web search to discover suppliers
   */
  async discoverSuppliers(params: {
    query: string
    category?: string[]
    location?: string
    certifications?: string[]
    capacity?: { min: number; max: number }
    priceRange?: { min: number; max: number }
    maxResults?: number
    filters?: {
      industry?: string
      location?: string
      minConfidence?: number
    }
  }): Promise<WebDiscoveryResult> {
    try {
      const { query, maxResults = 10, filters = {} } = params

      console.log(`🔍 SupplierIntelligenceService: Starting discovery for "${query}"`)

      // Step 1: Search the web for supplier information
      const searchResults = await this.webSearchService.searchSuppliers(query, {
        maxResults,
        filters
      })
      
      console.log(`📊 Found ${searchResults.length} search results from WebSearchService`)
      console.log('🔍 Search results preview:', searchResults.slice(0, 2).map(r => ({ title: r.title, source: r.source })))

      // Step 2: Extract structured data from search results
      const extractedData: ExtractedSupplierData[] = []
      
      console.log(`🔄 Starting data extraction for ${searchResults.length} results...`)
      
      for (const result of searchResults) {
        try {
          console.log(`🔍 Extracting data from result: "${result.title}"`)
          const extracted = await this.dataExtractionEngine.extractSupplierData(result)
          console.log(`📋 Extracted data:`, extracted ? 'SUCCESS' : 'FAILED', extracted ? JSON.stringify(extracted, null, 2) : '')
          
          if (extracted && this.calculateConfidence(extracted) >= (filters.minConfidence || 50)) {
            extractedData.push(extracted)
            console.log(`✅ Added to results (confidence: ${this.calculateConfidence(extracted)}%)`)
          } else {
            console.log(`❌ Rejected (confidence: ${extracted ? this.calculateConfidence(extracted) : 0}%)`)
          }
        } catch (error) {
          console.warn(`⚠️ Failed to extract data from result "${result.title}":`, error)
        }
      }

      console.log(`📊 Final extracted data: ${extractedData.length} suppliers extracted`)

      // Step 3: Calculate overall confidence and metadata
      const confidence = this.calculateOverallConfidence(extractedData)
      const sources = searchResults.map(r => r.source || 'Unknown')

      console.log(`🎯 Overall confidence: ${confidence}%, Sources: ${sources.length}`)

      // Transform extracted data to supplier format
      const suppliers = extractedData.map((data, index) => ({
        id: `discovered_${Date.now()}_${index}`,
        name: data.companyName || 'Unknown Supplier',
        riskScore: (100 - this.calculateConfidence(data)) / 100, // Convert confidence to risk score
        ...data
      }))

      return {
        success: extractedData.length > 0,
        data: extractedData,
        suppliers,
        metadata: {
          searchType: 'query',
          totalResults: extractedData.length,
          confidence,
          sources: [...new Set(sources)],
          processingTime: 0, // Would be calculated from actual timing
          searchConfidence: confidence
        }
      }

    } catch (error) {
      console.error('❌ SupplierIntelligenceService: Web discovery error:', error)
      return {
        success: false,
        data: [],
        error: error instanceof Error ? error.message : 'Discovery failed',
        metadata: {
          searchType: 'query',
          totalResults: 0,
          confidence: 0,
          sources: []
        }
      }
    }
  }

  /**
   * Extract supplier data from a website URL
   */
  async extractFromWebsite(url: string): Promise<WebDiscoveryResult> {
    try {
      // Step 1: Scrape the website
      const websiteContent = await this.webScrapingService.scrapeWebsite(url)
      
      if (!websiteContent) {
        throw new Error('Failed to scrape website content')
      }

      // Step 2: Extract supplier data from the content
      const extractedData = await this.dataExtractionEngine.extractSupplierData({
        url,
        title: websiteContent.title || '',
        description: websiteContent.description || '',
        content: websiteContent.content || '',
        rawHtml: websiteContent.rawHtml || ''
      })

      if (!extractedData) {
        throw new Error('No supplier data found on website')
      }

      const confidence = this.calculateConfidence(extractedData)
      
      return {
        success: true,
        data: [extractedData],
        metadata: {
          searchType: 'website',
          totalResults: 1,
          confidence,
          sources: [new URL(url).hostname]
        }
      }

    } catch (error) {
      console.error('Website extraction error:', error)
      return {
        success: false,
        data: [],
        error: error instanceof Error ? error.message : 'Website extraction failed',
        metadata: {
          searchType: 'website',
          totalResults: 0,
          confidence: 0,
          sources: []
        }
      }
    }
  }

  /**
   * Transform web discovery data to comprehensive supplier form format
   */
  transformToFormData(webData: ExtractedSupplierData, originalQuery?: string): Partial<SupplierFormData> {
    const primaryAddress = webData.addresses?.[0]
    const website = webData.website || (webData.companyName ?
      `https://www.${webData.companyName.toLowerCase().replace(/\s+/g, '')}.com` : '')

    // Enhanced business info with all available data
    const businessInfo: any = {
      legalName: this.generateLegalName(webData.companyName, webData.businessType),
      tradingName: webData.companyName || originalQuery || '',
      website,
      currency: this.inferCurrencyFromLocation(webData.location),
      description: webData.description || `Professional ${webData.industry?.toLowerCase() || 'services'} provider`,
      tags: this.combineAllTags(webData),
    }

    // Add optional fields if available
    if (webData.employees) businessInfo.employeeCount = this.parseEmployeeCount(webData.employees)
    if (webData.founded) businessInfo.foundedYear = this.parseYear(webData.founded)
    if (webData.revenue) businessInfo.estimatedRevenue = webData.revenue
    if (webData.certifications) businessInfo.certifications = webData.certifications

    const transformedData: Partial<SupplierFormData> = {
      name: webData.companyName || originalQuery || '',
      code: this.generateSupplierCode(webData.companyName || originalQuery || ''),
      status: 'pending',
      tier: 'approved',
      category: this.mapIndustryToCategory(webData.industry || 'Services'),
      businessInfo,
      capabilities: {
        products: webData.products || [],
        services: webData.services || [],
      }
    }

    // Add contact information
    if (webData.contactEmail || webData.contactPhone) {
      transformedData.contacts = [{
        type: "primary",
        name: webData.contactPerson || 'General Contact',
        email: webData.contactEmail,
        phone: webData.contactPhone,
        position: 'Contact Person',
        isPrimary: true,
        isActive: true,
      }]
    }

    // Add addresses with enhanced processing
    if (primaryAddress) {
      transformedData.addresses = [{
        type: 'headquarters',
        name: 'Head Office',
        addressLine1: primaryAddress.street || '',
        addressLine2: '',
        city: primaryAddress.city || '',
        state: this.extractStateFromLocation(primaryAddress.country, primaryAddress.city),
        postalCode: primaryAddress.postalCode || '',
        country: primaryAddress.country || 'South Africa',
        isPrimary: true,
        isActive: true,
      }]
    } else if (webData.location) {
      transformedData.addresses = this.generateDefaultAddress(webData.location)
    }

    // Add enhanced tags
    transformedData.tags = this.combineAllTags(webData)

    // Add performance metrics
    transformedData.performance = {
      rating: this.calculatePerformanceRating(webData),
      tier: this.determinePerformanceTier(webData)
    }

    return transformedData
  }

  /**
   * Generate appropriate legal name
   */
  private generateLegalName(companyName?: string, businessType?: string): string {
    if (!companyName) return 'New Supplier (Pty) Ltd'

    const suffix = this.getBusinessSuffix(businessType, companyName)
    return `${companyName} ${suffix}`.trim()
  }

  /**
   * Get appropriate business suffix
   */
  private getBusinessSuffix(businessType?: string, companyName?: string): string {
    if (businessType?.toLowerCase().includes('international')) return 'International'
    if (businessType?.toLowerCase().includes('corporation')) return 'Corp'
    if (businessType?.toLowerCase().includes('limited')) return 'Ltd'
    if (businessType?.toLowerCase().includes('inc')) return 'Inc'
    
    // Default to South African business structure
    return '(Pty) Ltd'
  }

  /**
   * Infer currency from location
   */
  private inferCurrencyFromLocation(location?: string): string {
    if (!location) return 'ZAR'

    const locationLower = location.toLowerCase()
    
    if (locationLower.includes('south africa') || locationLower.includes('cape town') ||
        locationLower.includes('johannesburg') || locationLower.includes('durban')) {
      return 'ZAR'
    }
    if (locationLower.includes('europe') || locationLower.includes('germany') ||
        locationLower.includes('france') || locationLower.includes('uk')) {
      return 'EUR'
    }
    if (locationLower.includes('usa') || locationLower.includes('america')) {
      return 'USD'
    }
    
    return 'ZAR' // Default
  }

  /**
   * Extract state from location
   */
  private extractStateFromLocation(country?: string, city?: string): string {
    if (country === 'South Africa' && city) {
      const cityStateMap: Record<string, string> = {
        'cape town': 'Western Cape',
        'johannesburg': 'Gauteng',
        'durban': 'KwaZulu-Natal',
        'pretoria': 'Gauteng'
      }
      return cityStateMap[city.toLowerCase()] || 'Gauteng'
    }
    
    return country === 'Germany' ? 'Bavaria' :
           country === 'USA' ? 'California' :
           country || 'Unknown'
  }

  /**
   * Generate default address if none found
   */
  private generateDefaultAddress(location?: string): any[] {
    if (!location) return []

    return [{
      type: 'headquarters',
      name: 'Head Office',
      addressLine1: '123 Business Street',
      addressLine2: '',
      city: location.split(',')[0]?.trim() || 'Unknown City',
      state: this.extractStateFromLocation(undefined, location.split(',')[0]),
      postalCode: '0001',
      country: location.includes('South Africa') ? 'South Africa' : 'Unknown',
      isPrimary: true,
      isActive: true,
    }]
  }

  /**
   * Combine all possible tags
   */
  private combineAllTags(webData: ExtractedSupplierData): string[] {
    const allTags: string[] = [...(webData.tags || [])]

    // Add industry tag
    if (webData.industry) {
      allTags.push(webData.industry.toLowerCase())
    }

    // Add service tags
    if (webData.services) {
      allTags.push(...webData.services.map(s => s.toLowerCase()))
    }

    // Add product tags
    if (webData.products) {
      allTags.push(...webData.products.map(p => p.toLowerCase()))
    }

    // Add certification tags
    if (webData.certifications) {
      allTags.push(...webData.certifications.map(c => c.toLowerCase()))
    }

    // Remove duplicates and limit
    return [...new Set(allTags)].slice(0, 20)
  }

  /**
   * Calculate performance rating based on available data
   */
  private calculatePerformanceRating(webData: ExtractedSupplierData): number {
    let score = 3.0 // Base score

    // Boost for certifications
    if (webData.certifications?.length) {
      score += webData.certifications.length * 0.2
    }

    // Boost for established companies
    if (webData.founded) {
      const foundedYear = this.parseYear(webData.founded)
      if (foundedYear) {
        const currentYear = new Date().getFullYear()
        const yearsInBusiness = currentYear - foundedYear
        if (yearsInBusiness > 10) score += 0.5
        else if (yearsInBusiness > 5) score += 0.3
      }
    }

    // Boost for comprehensive contact information
    if (webData.contactEmail && webData.contactPhone) {
      score += 0.3
    }

    return Math.min(5.0, Math.max(1.0, score))
  }

  /**
   * Determine performance tier
   */
  private determinePerformanceTier(webData: ExtractedSupplierData): string {
    const rating = this.calculatePerformanceRating(webData)
    
    if (rating >= 4.5) return 'platinum'
    if (rating >= 4.0) return 'gold'
    if (rating >= 3.5) return 'silver'
    if (rating >= 3.0) return 'bronze'
    return 'unrated'
  }

  /**
   * Generate supplier code
   */
  private generateSupplierCode(name: string): string {
    if (!name) return 'SUP-' + Date.now().toString().slice(-6)
    
    const prefix = name
      .split(' ')
      .map(word => word.charAt(0).toUpperCase())
      .slice(0, 3)
      .join('')
    
    const timestamp = Date.now().toString().slice(-4)
    return `${prefix}-${timestamp}`
  }

  /**
   * Calculate confidence score for extracted data
   */
  private calculateConfidence(data: ExtractedSupplierData): number {
    let score = 0
    let maxScore = 0

    // Company name (high weight)
    if (data.companyName) score += 30
    maxScore += 30

    // Contact information
    if (data.contactEmail) score += 15
    if (data.contactPhone) score += 10
    maxScore += 25

    // Location
    if (data.location) score += 10
    maxScore += 10

    // Business details
    if (data.industry) score += 10
    if (data.website) score += 10
    if (data.employees) score += 5
    if (data.founded) score += 5
    maxScore += 30

    // Services/Products
    if (data.services && data.services.length > 0) score += 2.5
    if (data.products && data.products.length > 0) score += 2.5
    maxScore += 5

    return maxScore > 0 ? Math.round((score / maxScore) * 100) : 0
  }

  /**
   * Calculate overall confidence for multiple results
   */
  private calculateOverallConfidence(results: ExtractedSupplierData[]): number {
    if (results.length === 0) return 0
    
    const totalScore = results.reduce((sum, result) => sum + this.calculateConfidence(result), 0)
    return Math.round(totalScore / results.length)
  }

  /**
   * Parse year from various formats
   */
  private parseYear(foundedText: string): number | undefined {
    const yearMatch = foundedText.match(/\b(19|20)\d{2}\b/)
    if (yearMatch) {
      const year = parseInt(yearMatch[0])
      const currentYear = new Date().getFullYear()
      if (year >= 1800 && year <= currentYear) {
        return year
      }
    }
    return undefined
  }

  /**
   * Parse employee count from various text formats
   */
  private parseEmployeeCount(employeeText: string): number | undefined {
    // Extract numbers from text like "500 employees", "1,200+ staff", etc.
    const numberMatch = employeeText.match(/([\d,]+)/)
    if (numberMatch) {
      const count = parseInt(numberMatch[1].replace(/,/g, ''))
      if (count > 0 && count < 1000000) { // Reasonable bounds
        return count
      }
    }
    return undefined
  }

  /**
   * Map industry text to category
   */
  private mapIndustryToCategory(industry: string): string {
    const lowerIndustry = industry.toLowerCase()
    
    if (lowerIndustry.includes('technology') || lowerIndustry.includes('software') || lowerIndustry.includes('it')) {
      return 'Technology'
    }
    if (lowerIndustry.includes('manufacturing') || lowerIndustry.includes('production')) {
      return 'Manufacturing'
    }
    if (lowerIndustry.includes('logistics') || lowerIndustry.includes('shipping') || lowerIndustry.includes('transport')) {
      return 'Logistics'
    }
    if (lowerIndustry.includes('service') || lowerIndustry.includes('consulting')) {
      return 'Services'
    }
    if (lowerIndustry.includes('material') || lowerIndustry.includes('supply')) {
      return 'Materials'
    }
    if (lowerIndustry.includes('music') || lowerIndustry.includes('instrument')) {
      return 'Musical Instruments'
    }
    if (lowerIndustry.includes('electronic') || lowerIndustry.includes('electrical')) {
      return 'Electronics'
    }
    
    return 'Services' // Default fallback
  }

  /**
   * Validate extracted data for quality
   */
  validateExtractedData(data: ExtractedSupplierData): {
    isValid: boolean
    issues: string[]
    suggestions: string[]
  } {
    const issues: string[] = []
    const suggestions: string[] = []

    // Check required fields
    if (!data.companyName || data.companyName.trim().length < 2) {
      issues.push('Company name is missing or too short')
    }

    if (!data.contactEmail && !data.contactPhone) {
      issues.push('No contact information available')
      suggestions.push('Consider adding at least an email or phone number')
    }

    // Validate email format
    if (data.contactEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.contactEmail)) {
      issues.push('Invalid email format')
    }

    // Check data quality
    const confidence = this.calculateConfidence(data)
    if (confidence < 50) {
      issues.push('Low confidence score for extracted data')
      suggestions.push('Consider manual verification of extracted information')
    }

    return {
      isValid: issues.length === 0,
      issues,
      suggestions
    }
  }

  /**
   * Analyze supplier performance and metrics
   */
  async analyzeSupplier(supplierId: string): Promise<{
    performanceScore: number
    recommendations: string[]
    metrics: Record<string, number>
  }> {
    // Placeholder implementation - would integrate with actual performance data
    return {
      performanceScore: Math.random() * 0.5 + 0.5, // Random score between 0.5 and 1.0
      recommendations: [
        'Strong delivery performance',
        'Good quality metrics',
        'Responsive communication'
      ],
      metrics: {
        onTimeDelivery: 0.92,
        qualityScore: 0.88,
        responsiveness: 0.85
      }
    }
  }

  /**
   * Find similar suppliers based on characteristics
   */
  async findSimilarSuppliers(supplierId: string, options?: {
    maxResults?: number
    minSimilarity?: number
  }): Promise<Array<{
    id: string
    name: string
    similarity: number
    matchingAttributes: string[]
  }>> {
    // Placeholder implementation - would use actual similarity algorithms
    const { maxResults = 5, minSimilarity = 0.7 } = options || {}

    return [
      {
        id: 'similar_1',
        name: 'Similar Supplier 1',
        similarity: 0.85,
        matchingAttributes: ['industry', 'location', 'certifications']
      },
      {
        id: 'similar_2',
        name: 'Similar Supplier 2',
        similarity: 0.78,
        matchingAttributes: ['industry', 'services']
      }
    ].slice(0, maxResults)
  }
}

// Export singleton instance
export const supplierIntelligenceService = new SupplierIntelligenceService()

export default supplierIntelligenceService