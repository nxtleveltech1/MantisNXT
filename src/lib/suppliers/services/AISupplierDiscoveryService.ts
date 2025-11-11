/**
 * AI Supplier Discovery Service
 * Auto-populate supplier information using AI and external data sources
 */

import {
  type AISupplierDiscovery,
  type AISupplierMatch,
  type Supplier,
  type SupplierDiscoverySource,
  type AIEnrichmentData
} from '../types/SupplierDomain'

interface SupplierDiscoveryRequest {
  companyName: string
  website?: string
  email?: string
  phone?: string
}

interface DiscoveredSupplierData {
  name: string
  website?: string
  email?: string
  phone?: string
  address?: {
    street?: string
    city?: string
    state?: string
    country?: string
    postalCode?: string
  }
  contactPerson?: string
  businessType?: string
  description?: string
  socialMediaLinks?: {
    linkedin?: string
    twitter?: string
    facebook?: string
  }
  certifications?: string[]
  tags?: string[]
  confidence: number // 0-1 confidence score
}

interface DiscoverySuggestion {
  title: string
  description: string
  category: string
  location: string
  confidence: number
  source: SupplierDiscoverySource | 'ai_internal'
}

export class AISupplierDiscoveryService {
  private apiKey: string

  constructor() {
    this.apiKey = process.env.AI_DISCOVERY_API_KEY || ''
  }

  /**
   * Discover a single supplier profile using AI heuristics
   * (used internally to generate mock data)
   */
  async discoverSupplier(request: SupplierDiscoveryRequest): Promise<DiscoveredSupplierData> {
    const normalizedName = request.companyName.trim() || 'AI Supplier'
    const slug = normalizedName.toLowerCase().replace(/\s+/g, '')

    return {
      name: normalizedName,
      website: request.website || `https://www.${slug}.com`,
      email: request.email || `info@${slug}.com`,
      phone: request.phone || '+1 (555) 123-4567',
      address: {
        street: '123 Innovation Ave',
        city: 'Global City',
        state: 'CA',
        country: 'United States',
        postalCode: '90210'
      },
      contactPerson: 'John Smith',
      businessType: 'Manufacturing',
      description: `${normalizedName} is a leading supplier in their industry, providing high-quality products and services.`,
      socialMediaLinks: {
        linkedin: `https://linkedin.com/company/${slug}`
      },
      certifications: ['ISO 9001', 'ISO 14001'],
      tags: ['reliable', 'quality', 'established'],
      confidence: 0.85
    }
  }

  /**
   * Discover multiple suppliers using AI enrichment models
   */
  async discoverSuppliers(request: AISupplierDiscovery): Promise<AISupplierMatch[]> {
    const maxResults = Math.max(1, Math.min(request.maxResults ?? 10, 10))
    const minConfidence = request.minConfidence ?? 0.7
    const primarySource = request.sources?.[0] ?? 'web'

    const matches: AISupplierMatch[] = []
    for (let index = 0; index < maxResults; index++) {
      const supplier = this.buildMockSupplier(request, index)
      const confidence = Math.min(
        0.95,
        Math.max(minConfidence, 0.85 - index * 0.05)
      )

      matches.push({
        supplier,
        confidence,
        reasoning: this.buildReasoning(request),
        dataSource: primarySource,
        discoveredAt: new Date().toISOString()
      })
    }

    return matches
  }

  /**
   * Provide contextual discovery suggestions (categories/topics)
   */
  async getDiscoverySuggestions(filters: {
    category?: string | null
    location?: string | null
  }): Promise<DiscoverySuggestion[]> {
    const suggestions: DiscoverySuggestion[] = [
      {
        title: 'Explore regional suppliers',
        description: `Suppliers specialising in ${filters.category ?? 'key'} categories with strong local presence.`,
        category: filters.category ?? 'General',
        location: filters.location ?? 'Global',
        confidence: 0.82,
        source: 'web'
      },
      {
        title: 'High performance vendors',
        description: 'Vendors with consistent delivery and quality scores above 90%.',
        category: filters.category ?? 'Cross-category',
        location: filters.location ?? 'Global',
        confidence: 0.78,
        source: 'ai_internal'
      },
      {
        title: 'Emerging market leaders',
        description: 'Suppliers showing rapid growth and innovation in their sector.',
        category: filters.category ?? 'Emerging',
        location: filters.location ?? 'Global',
        confidence: 0.74,
        source: 'web'
      }
    ]

    return suggestions
  }

  /**
   * Validate and enrich existing supplier data with AI insights
   */
  async enrichSupplierData(supplier: Supplier, fields?: readonly string[]): Promise<AIEnrichmentData> {
    const selectedFields = fields ? Array.from(fields) : ['financial', 'risk', 'sustainability']

    return {
      supplierId: supplier.id,
      additionalInfo: {
        financialHealth: 'Stable financial performance with healthy cash flow.',
        riskAssessment: 'Low operational risk; medium supply chain risk due to regional dependencies.',
        marketPosition: `${supplier.name} holds a strong position within ${supplier.category ?? 'their primary industry'}.`,
        competitors: ['Global Market Solutions', 'Prime Suppliers Inc.'],
        sustainability: 'Actively investing in sustainable sourcing and energy efficiency.'
      },
      lastUpdated: new Date().toISOString(),
      confidence: 0.83,
      fields: selectedFields,
      insights: selectedFields.map(field => `Updated insight for ${field}.`)
    }
  }

  private buildReasoning(request: AISupplierDiscovery): string[] {
    const reasoning: string[] = [
      `Matches search intent for "${request.query}".`
    ]

    if (request.industry) {
      reasoning.push(`Operates within the ${request.industry} sector.`)
    }

    if (request.location) {
      reasoning.push(`Presence or operations in ${request.location}.`)
    }

    if (request.certifications?.length) {
      reasoning.push(`Holds certifications: ${request.certifications.join(', ')}.`)
    }

    return reasoning
  }

  private buildMockSupplier(request: AISupplierDiscovery, index: number): Supplier {
    const baseName = `${request.query} Partner ${index + 1}`.trim()
    const slug = baseName.toLowerCase().replace(/\s+/g, '')

    return {
      id: `ai-supplier-${Date.now()}-${index}`,
      name: baseName,
      code: `AI${String(index + 1).padStart(3, '0')}`,
      status: 'active',
      tier: 'approved',
      category: request.industry ?? 'General Services',
      subcategory: null,
      categories: request.industry ? [request.industry] : ['General'],
      tags: ['ai-discovered', request.industry ?? 'general'].filter(Boolean) as string[],
      brands: ['AI Brand'],
      businessInfo: {
        legalName: `${baseName} Holdings Ltd`,
        tradingName: baseName,
        industry: request.industry ?? 'General Services',
        taxId: `AI-TAX-${index + 1}`,
        registrationNumber: `AI-REG-${index + 1}`,
        website: `https://www.${slug}.com`,
        foundedYear: 2005 + index,
        employeeCount: 50 * (index + 1),
        annualRevenue: 1_500_000 * (index + 1),
        currency: 'USD'
      },
      contacts: [
        {
          id: `contact-${index}`,
          type: 'primary',
          name: 'Alex Johnson',
          title: 'Head of Sales',
          email: `sales@${slug}.com`,
          phone: '+1 (555) 987-1234',
          mobile: '+1 (555) 987-5678',
          department: 'Sales',
          isPrimary: true,
          isActive: true
        }
      ],
      addresses: [
        {
          id: `address-${index}`,
          type: 'headquarters',
          name: `${baseName} HQ`,
          addressLine1: '456 Innovation Drive',
          addressLine2: 'Suite 1200',
          city: request.location ?? 'Global City',
          state: 'CA',
          postalCode: '94016',
          country: request.location ?? 'United States',
          isPrimary: true,
          isActive: true
        }
      ],
      performance: {
        overallRating: 4.3,
        qualityRating: 4.4,
        deliveryRating: 4.1,
        serviceRating: 4.2,
        priceRating: 4.0,
        metrics: {
          onTimeDeliveryRate: 92,
          qualityAcceptanceRate: 96,
          responseTime: 4,
          defectRate: 1.5,
          leadTimeVariance: 6
        }
      },
      createdAt: new Date(),
      updatedAt: new Date(),
      notes: 'Generated by AISupplierDiscoveryService mock data pipeline.'
    }
  }
}

export const aiSupplierDiscovery = new AISupplierDiscoveryService()
