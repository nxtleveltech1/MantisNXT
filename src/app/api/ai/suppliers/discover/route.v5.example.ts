/**
 * AI Supplier Discovery API - Vercel AI SDK v5 Upgrade Example
 *
 * This is an example implementation showing how to upgrade to use
 * generateObject() for structured supplier discovery output.
 *
 * To activate: Rename this file to route.ts (backup current route.ts first)
 */

import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { generateObject } from 'ai';
import { anthropic } from '@ai-sdk/anthropic';
import { z } from 'zod';

// ============================================================================
// ZOD SCHEMAS FOR STRUCTURED OUTPUT
// ============================================================================

const SupplierLocationSchema = z.object({
  country: z.string().describe('Country where supplier is located'),
  region: z.string().optional().describe('State/province/region'),
  city: z.string().optional().describe('City'),
  coordinates: z
    .object({
      lat: z.number(),
      lng: z.number(),
    })
    .optional(),
});

const CapacityInfoSchema = z.object({
  estimated: z.number().describe('Estimated production capacity'),
  unit: z.string().describe('Unit of measurement (e.g., units/month, tons/year)'),
  scalability: z.enum(['low', 'medium', 'high']).describe('Ability to scale production'),
});

const ContactInfoSchema = z.object({
  website: z.string().url().optional(),
  email: z.string().email().optional(),
  phone: z.string().optional(),
  primaryContact: z.string().optional(),
});

const SupplierStrengthSchema = z.object({
  area: z.string().describe('Area of strength (e.g., quality, cost, delivery)'),
  description: z.string().describe('Detailed explanation'),
  evidenceLevel: z.enum(['verified', 'reported', 'estimated']),
});

const SupplierConsiderationSchema = z.object({
  concern: z.string().describe('Potential issue or consideration'),
  severity: z.enum(['low', 'medium', 'high']),
  mitigation: z.string().optional().describe('Suggested mitigation strategy'),
});

const DiscoveredSupplierSchema = z.object({
  id: z.string().describe('Unique identifier for the supplier'),
  name: z.string().describe('Company/supplier name'),
  categories: z.array(z.string()).describe('Product/service categories'),
  location: SupplierLocationSchema,

  // Scoring
  confidence: z.number().min(0).max(1).describe('Match confidence score (0-1)'),
  riskScore: z.number().min(0).max(1).describe('Overall risk assessment (0=low, 1=high)'),
  qualityScore: z.number().min(0).max(1).optional().describe('Quality assessment score'),

  // Certifications and compliance
  certifications: z
    .array(
      z.object({
        name: z.string(),
        issuingBody: z.string().optional(),
        expiryDate: z.string().optional(),
        verified: z.boolean(),
      })
    )
    .describe('Industry certifications'),

  // Capacity
  capacity: CapacityInfoSchema.optional(),

  // Pricing (if available)
  pricingIndicator: z
    .object({
      range: z.enum(['budget', 'moderate', 'premium']),
      currency: z.string(),
      estimatedUnitCost: z.number().optional(),
      priceCompetitiveness: z.enum(['below_market', 'market_rate', 'above_market']).optional(),
    })
    .optional(),

  // Contact and details
  contactInfo: ContactInfoSchema.optional(),

  // Analysis
  strengths: z.array(SupplierStrengthSchema).describe('Key competitive advantages'),
  considerations: z.array(SupplierConsiderationSchema).describe('Potential concerns or risks'),

  // Business details
  yearsInBusiness: z.number().optional(),
  employeeCount: z.number().optional(),
  annualRevenue: z.number().optional(),

  // Metadata
  dataSource: z.enum(['verified_database', 'market_intelligence', 'ai_discovery']),
  lastUpdated: z.string().describe('ISO date string'),
});

const SupplierDiscoveryResponseSchema = z.object({
  suppliers: z.array(DiscoveredSupplierSchema),
  searchMetadata: z.object({
    totalMatches: z.number().describe('Total number of suppliers found'),
    searchConfidence: z.number().min(0).max(1).describe('Overall search quality'),
    coverageScore: z.number().min(0).max(1).describe('How well we covered the search space'),
    searchStrategy: z.string().describe('Strategy used for discovery'),
    limitations: z.array(z.string()).optional().describe('Known limitations of this search'),
  }),
  marketInsights: z
    .object({
      averageRiskScore: z.number(),
      pricingTrend: z.enum(['increasing', 'stable', 'decreasing']).optional(),
      competitiveLandscape: z.string().describe('Brief market overview'),
      recommendations: z.array(z.string()).describe('Strategic recommendations'),
    })
    .optional(),
});

// ============================================================================
// REQUEST VALIDATION SCHEMA
// ============================================================================

const DiscoveryRequestSchema = z.object({
  query: z.string().min(3).max(500).describe('Natural language search query'),
  requirements: z.object({
    category: z.array(z.string()).min(1).max(10),
    location: z.string().optional(),
    certifications: z.array(z.string()).optional(),
    capacity: z
      .object({
        min: z.number().min(0),
        max: z.number().min(0),
      })
      .optional(),
    priceRange: z
      .object({
        min: z.number().min(0),
        max: z.number().min(0),
        currency: z.string().default('USD'),
      })
      .optional(),
  }),
  filters: z
    .object({
      existingSuppliers: z.boolean().optional(),
      verified: z.boolean().optional(),
      riskLevel: z.enum(['low', 'medium', 'high']).optional(),
      minYearsInBusiness: z.number().optional(),
    })
    .optional(),
  options: z
    .object({
      maxResults: z.number().min(1).max(50).default(10),
      includeMarketInsights: z.boolean().default(true),
      detailLevel: z.enum(['basic', 'standard', 'comprehensive']).default('standard'),
    })
    .optional(),
});

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function buildSupplierDiscoveryPrompt(request: z.infer<typeof DiscoveryRequestSchema>): string {
  const { query, requirements, filters, options } = request;

  const parts = [
    '# AI Supplier Discovery System',
    '',
    'You are an expert procurement analyst with deep knowledge of global supply chains.',
    'Your task is to discover and analyze potential suppliers based on the provided requirements.',
    '',
    '## Search Query',
    query,
    '',
    '## Requirements',
  ];

  // Categories
  parts.push(`**Categories**: ${requirements.category.join(', ')}`);

  // Location
  if (requirements.location) {
    parts.push(`**Preferred Location**: ${requirements.location}`);
  }

  // Certifications
  if (requirements.certifications && requirements.certifications.length > 0) {
    parts.push(`**Required Certifications**: ${requirements.certifications.join(', ')}`);
  }

  // Capacity
  if (requirements.capacity) {
    parts.push(
      `**Production Capacity**: ${requirements.capacity.min.toLocaleString()} - ${requirements.capacity.max.toLocaleString()} units`
    );
  }

  // Price range
  if (requirements.priceRange) {
    parts.push(
      `**Price Range**: ${requirements.priceRange.currency} ${requirements.priceRange.min.toLocaleString()} - ${requirements.priceRange.max.toLocaleString()}`
    );
  }

  // Filters
  if (filters) {
    parts.push('', '## Filters');
    if (filters.verified) {
      parts.push('- Only include verified suppliers');
    }
    if (filters.riskLevel) {
      parts.push(`- Maximum risk level: ${filters.riskLevel}`);
    }
    if (filters.minYearsInBusiness) {
      parts.push(`- Minimum years in business: ${filters.minYearsInBusiness}`);
    }
  }

  // Instructions
  parts.push(
    '',
    '## Discovery Instructions',
    '',
    'For each potential supplier:',
    '1. **Match Assessment**: Evaluate how well they match the requirements (confidence score)',
    '2. **Risk Analysis**: Assess financial stability, compliance, reliability, market reputation',
    '3. **Quality Evaluation**: Analyze product quality, certifications, industry standing',
    '4. **Capacity Verification**: Estimate production capacity and scalability',
    '5. **Pricing Intelligence**: Determine pricing competitiveness and value proposition',
    '6. **Strengths & Considerations**: Identify key advantages and potential concerns',
    '',
    '## Quality Standards',
    '- Be realistic and conservative in assessments',
    '- Only include suppliers you are confident exist and match requirements',
    '- Provide evidence-based scores (confidence, risk, quality)',
    '- Highlight both strengths and potential concerns',
    '- Include actionable insights for procurement decisions'
  );

  // Detail level
  const detailLevel = options?.detailLevel || 'standard';
  if (detailLevel === 'comprehensive') {
    parts.push(
      '',
      'Provide comprehensive details including business metrics, market positioning, and strategic recommendations.'
    );
  } else if (detailLevel === 'basic') {
    parts.push(
      '',
      'Provide essential information only: name, location, scores, and brief analysis.'
    );
  }

  // Max results
  const maxResults = options?.maxResults || 10;
  parts.push('', `Return up to ${maxResults} best-matching suppliers, ranked by match quality.`);

  return parts.join('\n');
}

function calculateRiskThreshold(level: string): number {
  const thresholds: Record<string, number> = {
    low: 0.3,
    medium: 0.6,
    high: 1.0,
  };
  return thresholds[level] || 1.0;
}

// ============================================================================
// API ROUTE HANDLERS
// ============================================================================

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Validate request
    const validationResult = DiscoveryRequestSchema.safeParse(body);
    if (!validationResult.success) {
      return NextResponse.json(
        {
          success: false,
          error: 'Validation failed',
          details: validationResult.error.format(),
        },
        { status: 400 }
      );
    }

    const validatedRequest = validationResult.data;

    console.log('🤖 AI Supplier Discovery (v5) initiated:', validatedRequest.query);

    // Build discovery prompt
    const prompt = buildSupplierDiscoveryPrompt(validatedRequest);

    // Generate structured supplier discovery using Vercel AI SDK v5
    const result = await generateObject({
      model: anthropic('claude-3-5-sonnet-20241022'),
      schema: SupplierDiscoveryResponseSchema,
      prompt: buildSupplierDiscoveryPrompt(validatedRequest),
      maxRetries: 3,
      temperature: 0.2,
    });

    const usage = (result.usage ?? {}) as {
      promptTokens?: number;
      completionTokens?: number;
      totalTokens?: number;
      inputTokens?: number;
      outputTokens?: number;
    };
    const promptTokens = usage.promptTokens ?? usage.inputTokens ?? 0;
    const completionTokens = usage.completionTokens ?? usage.outputTokens ?? 0;
    const totalTokens = usage.totalTokens ?? promptTokens + completionTokens;

    console.log('✅ Discovery complete:', {
      suppliersFound: result.object.suppliers.length,
      finishReason: result.finishReason,
      tokensUsed: result.usage.totalTokens,
    });

    // Apply post-processing filters
    let filteredSuppliers = result.object.suppliers;

    // Filter by risk level
    if (validatedRequest.filters?.riskLevel) {
      const maxRisk = calculateRiskThreshold(validatedRequest.filters.riskLevel);
      filteredSuppliers = filteredSuppliers.filter(s => s.riskScore <= maxRisk);
    }

    // Filter by verification status
    if (validatedRequest.filters?.verified) {
      filteredSuppliers = filteredSuppliers.filter(s =>
        s.certifications.some(cert => cert.verified)
      );
    }

    // Filter by years in business
    if (validatedRequest.filters?.minYearsInBusiness) {
      filteredSuppliers = filteredSuppliers.filter(
        s => (s.yearsInBusiness || 0) >= validatedRequest.filters!.minYearsInBusiness!
      );
    }

    // Sort by confidence (best matches first)
    filteredSuppliers.sort((a, b) => b.confidence - a.confidence);

    // Limit results
    const maxResults = validatedRequest.options?.maxResults || 10;
    filteredSuppliers = filteredSuppliers.slice(0, maxResults);

    // Prepare response
    return NextResponse.json(
      {
        success: true,
        data: {
          suppliers: filteredSuppliers,
          searchMetadata: {
            ...result.object.searchMetadata,
            totalResults: filteredSuppliers.length,
            originalMatches: result.object.suppliers.length,
            filtersApplied: validatedRequest.filters || {},
          },
          marketInsights: result.object.marketInsights,
        },
        metadata: {
          queryProcessed: validatedRequest.query,
          finishReason: result.finishReason,
          usage: {
            promptTokens,
            completionTokens,
            totalTokens,
          },
          model: 'claude-3-5-sonnet-20241022',
          timestamp: new Date().toISOString(),
        },
      },
      {
        headers: {
          'X-AI-Model': 'claude-3-5-sonnet-20241022',
          'X-AI-Provider': 'anthropic',
          'X-AI-Tokens-Used': totalTokens.toString(),
        },
      }
    );
  } catch (error) {
    console.error('❌ AI Supplier Discovery failed:', error);

    // Handle AI-specific errors
    if (error instanceof Error) {
      if (error.message.includes('API key')) {
        return NextResponse.json(
          {
            success: false,
            error: 'AI provider configuration error',
            details: 'Please configure ANTHROPIC_API_KEY in environment variables',
            code: 'MISSING_API_KEY',
          },
          { status: 500 }
        );
      }

      if (error.message.includes('rate limit')) {
        return NextResponse.json(
          {
            success: false,
            error: 'Rate limit exceeded',
            details: 'Too many AI requests. Please try again later.',
            code: 'RATE_LIMIT',
          },
          { status: 429 }
        );
      }
    }

    return NextResponse.json(
      {
        success: false,
        error: 'AI supplier discovery failed',
        details: error instanceof Error ? error.message : 'Unknown error',
        code: 'AI_DISCOVERY_ERROR',
      },
      { status: 500 }
    );
  }
}

/**
 * GET endpoint - Find similar suppliers
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const supplierId = searchParams.get('supplierId');

    if (!supplierId) {
      return NextResponse.json(
        {
          success: false,
          error: 'Supplier ID is required',
        },
        { status: 400 }
      );
    }

    console.log('🔍 Finding similar suppliers (v5) for:', supplierId);

    // Define schema for similar suppliers
    const SimilarSuppliersSchema = z.object({
      similarSuppliers: z.array(
        z.object({
          id: z.string(),
          name: z.string(),
          similarityScore: z.number().min(0).max(1),
          similarityReasons: z.array(z.string()),
          keyDifferences: z.array(z.string()).optional(),
        })
      ),
      searchStrategy: z.string(),
    });

    // Generate similar suppliers using AI
    const result = await generateObject({
      model: anthropic('claude-3-5-sonnet-20241022'),
      schema: SimilarSuppliersSchema,
      prompt: `Find suppliers similar to supplier ID: ${supplierId}

Analyze similarity based on:
- Product categories
- Geographic location
- Certifications and compliance
- Production capacity
- Market positioning
- Quality standards
- Pricing tier

Return up to 10 most similar suppliers with similarity scores and reasoning.`,
      temperature: 0.3,
    });

    return NextResponse.json({
      success: true,
      data: {
        supplierId,
        ...result.object,
        count: result.object.similarSuppliers.length,
        timestamp: new Date().toISOString(),
      },
      metadata: {
        usage: result.usage,
        model: 'claude-3-5-sonnet-20241022',
      },
    });
  } catch (error) {
    console.error('❌ Similar supplier search failed:', error);

    return NextResponse.json(
      {
        success: false,
        error: 'Failed to find similar suppliers',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
