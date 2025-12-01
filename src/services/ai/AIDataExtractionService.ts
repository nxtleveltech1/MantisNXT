// @ts-nocheck

/**
 * AI-Powered Data Extraction Service
 * Uses Claude/OpenAI to intelligently extract structured supplier information from web content
 */

import { createAnthropic } from '@ai-sdk/anthropic';
import { createOpenAI } from '@ai-sdk/openai';
import { generateObject, generateText } from 'ai';
import { z } from 'zod';

export interface ExtractedSupplierData {
  companyName?: string;
  description?: string;
  industry?: string;
  location?: string;
  contactEmail?: string;
  contactPhone?: string;
  contactPerson?: string;
  website?: string;
  employees?: string;
  founded?: string;
  socialMedia?: {
    linkedin?: string;
    twitter?: string;
    facebook?: string;
  };
  certifications?: string[];
  services?: string[];
  products?: string[];
  brands?: string[]; // Supplier brands - brands they carry/distribute
  categories?: string[];
  brandLinks?: {
    name: string;
    url?: string;
  }[];
  addresses?: {
    type?: string;
    street?: string;
    city?: string;
    country?: string;
    postalCode?: string;
    state?: string;
  }[];
  revenue?: string;
  businessType?: string;
  tags?: string[];
  // Additional fields for comprehensive supplier data
  taxId?: string;
  registrationNumber?: string;
  vatNumber?: string;
  currency?: string;
  paymentTerms?: string;
  leadTime?: string;
  minimumOrderValue?: string;
}

// Zod schema for structured data extraction - lenient to handle AI variations
// Preprocess null values to undefined for optional fields
const SupplierDataSchema = z.object({
  companyName: z.preprocess(val => (val === null ? undefined : val), z.string().optional()),
  description: z.preprocess(val => (val === null ? undefined : val), z.string().optional()),
  industry: z.preprocess(val => (val === null ? undefined : val), z.string().optional()),
  location: z.preprocess(val => (val === null ? undefined : val), z.string().optional()),
  contactEmail: z.preprocess(
    val => (val === null ? undefined : val),
    z.string().email().optional().or(z.literal(''))
  ),
  contactPhone: z.preprocess(val => (val === null ? undefined : val), z.string().optional()),
  website: z.preprocess(
    val => (val === null ? undefined : val),
    z.string().optional().or(z.literal(''))
  ),
  employees: z.preprocess(val => (val === null ? undefined : val), z.string().optional()),
  founded: z.preprocess(val => (val === null ? undefined : val), z.string().optional()),
  socialMedia: z.preprocess(
    val => {
      if (val === null || val === undefined) return undefined;
      if (typeof val === 'object' && !Array.isArray(val)) {
        const record = val as Record<string, unknown>;
        const normalizeLink = (input: unknown) => {
          if (input === null || input === undefined) return undefined;
          if (typeof input === 'string') return input;
          return undefined;
        };

        return {
          linkedin: normalizeLink(record.linkedin),
          twitter: normalizeLink(record.twitter),
          facebook: normalizeLink(record.facebook),
        };
      }
      return val;
    },
    z
      .object({
        linkedin: z.string().url().optional().or(z.literal('')),
        twitter: z.string().url().optional().or(z.literal('')),
        facebook: z.string().url().optional().or(z.literal('')),
      })
      .optional()
  ),
  certifications: z.preprocess(val => {
    if (val === undefined || val === null) return undefined;
    if (typeof val === 'string') {
      return val === '' ? [] : [val];
    }
    return val;
  }, z.array(z.string()).optional()),
  services: z.array(z.string()).optional(),
  products: z.array(z.string()).optional(),
  brands: z.array(z.string()).optional(),
  categories: z.array(z.string()).optional(),
  brandLinks: z
    .array(
      z.object({
        name: z.string(),
        url: z.string().optional(),
      })
    )
    .optional(),
  addresses: z
    .array(
      z.object({
        type: z.string().optional().default('headquarters'),
        street: z.string().optional(),
        city: z.string().optional(),
        country: z.string().optional(),
        postalCode: z.string().optional(),
        state: z.string().optional(),
      })
    )
    .optional(),
  revenue: z.preprocess(val => (val === null ? undefined : val), z.string().optional()),
  businessType: z.preprocess(val => (val === null ? undefined : val), z.string().optional()),
  tags: z.array(z.string()).optional(),
  taxId: z.preprocess(val => (val === null ? undefined : val), z.string().optional()),
  registrationNumber: z.preprocess(val => (val === null ? undefined : val), z.string().optional()),
  vatNumber: z.preprocess(val => (val === null ? undefined : val), z.string().optional()),
  currency: z.string().optional(),
  paymentTerms: z.preprocess(val => (val === null ? undefined : val), z.string().optional()),
  leadTime: z.preprocess(val => (val === null ? undefined : val), z.string().optional()),
  minimumOrderValue: z.preprocess(val => (val === null ? undefined : val), z.string().optional()),
});

export class AIDataExtractionService {
  private anthropicApiKey?: string;
  private anthropicBaseUrl?: string;
  private openaiApiKey?: string;
  private openaiBaseUrl?: string;
  private openaiModel?: string;
  private provider: 'anthropic' | 'openai' = 'anthropic';

  constructor(config?: {
    anthropicApiKey?: string;
    anthropicBaseUrl?: string;
    openaiApiKey?: string;
    openaiBaseUrl?: string;
    openaiModel?: string;
  }) {
    // Initialize with provided config or environment variables
    this.anthropicApiKey = config?.anthropicApiKey || process.env.ANTHROPIC_API_KEY;
    this.anthropicBaseUrl = config?.anthropicBaseUrl;
    this.openaiApiKey = config?.openaiApiKey || process.env.OPENAI_API_KEY;
    this.openaiBaseUrl = config?.openaiBaseUrl;
    // Trim model name to prevent "model not found" errors from whitespace
    this.openaiModel = config?.openaiModel ? String(config.openaiModel).trim() : undefined;

    // Determine which provider to use
    if (this.anthropicApiKey) {
      this.provider = 'anthropic';
    } else if (this.openaiApiKey) {
      this.provider = 'openai';
    } else {
      console.warn('⚠️ No AI API keys found. AI extraction will use fallback methods.');
    }

    console.log(
      `🤖 AIDataExtractionService initialized with provider: ${this.provider}${this.openaiBaseUrl ? ` (baseUrl: ${this.openaiBaseUrl})` : ''}`
    );
  }

  /**
   * Extract supplier data from web content using AI
   */
  async extractSupplierData(content: {
    url: string;
    title: string;
    description: string;
    content?: string;
    rawHtml?: string;
  }): Promise<ExtractedSupplierData | null> {
    try {
      console.log(`🤖 Extracting supplier data using AI from: ${content.url}`);

      // Prepare content for AI analysis
      const textContent = this.prepareContentForAI(content);

      // Use AI to extract structured data
      if (this.provider === 'anthropic' && this.anthropicApiKey) {
        return await this.extractWithAnthropic(textContent, content.url);
      } else if (this.provider === 'openai' && this.openaiApiKey) {
        return await this.extractWithOpenAI(textContent, content.url);
      } else {
        // Fallback to rule-based extraction if no AI available
        console.log('⚠️ Using fallback extraction (no AI available)');
        return this.extractWithFallback(content);
      }
    } catch (error) {
      console.error('❌ AI extraction failed:', error);
      // Return null on error - let the caller handle fallback logic
      // This allows proper error tracking and prevents masking failures as successes
      return null;
    }
  }

  /**
   * Extract using Anthropic Claude
   */
  private async extractWithAnthropic(
    textContent: string,
    url: string
  ): Promise<ExtractedSupplierData | null> {
    if (!this.anthropicApiKey) {
      throw new Error('ANTHROPIC_API_KEY not configured');
    }

    const anthropic = createAnthropic({
      apiKey: this.anthropicApiKey,
    });

    const model = anthropic('claude-3-5-sonnet-20241022');

    const prompt = `You are an expert data extraction specialist. Extract structured supplier/company information from the following web content.

URL: ${url}

Content:
${textContent.substring(0, 8000)} ${textContent.length > 8000 ? '...' : ''}

Extract the following information if available:

REQUIRED FIELDS (if found):
- Company name (official business name)
- Description (what the company does)
- Industry (primary industry sector)
- Location (city, country, or region)
- Contact email (business email address - must be valid email format)
- Contact phone (business phone number)
- Website URL (must include full URL with https:// protocol)

OPTIONAL FIELDS:
- Employee count (number of employees as string, e.g., "50-200" or "500")
- Founded year (year the company was established, as string)
- Social media links (LinkedIn, Twitter, Facebook - must be full URLs)
- Certifications (ISO, SOC, etc. - array of strings)
- Services (list of services offered - array of strings)
- Products (list of PRODUCTS/SERVICES offered - array of strings)
  * Examples: "Digital Distribution Platform", "Music Marketing Services", "CD Manufacturing"
  * These are WHAT the company sells/provides, not brand names

- Brands (CRITICAL - EXTRACT ALL BRAND NAMES):
  * Brand names are MANUFACTURER/DISTRIBUTOR names that the supplier carries
  * Look for sections titled "Brands", "Our Brands", "Brands We Carry", "Featured Brands", or similar
  * If you see a "BRANDS PAGE CONTENT" section, extract EVERY brand name listed there
  * Brand names are typically capitalized manufacturer names (e.g., "Yamaha", "Shure", "Pioneer DJ", "Gibson", "Epiphone", "audio-technica", "KRK SYSTEMS", "TANNOY", "MIDAS", "AEROBAND", "AlphaTheta", "Blackstar AMPLIFICATION", "dBTechnologies", "HK AUDIO", "KLARK TEKNIK", "Turbosound", etc.)
  * Extract brand names from logos, lists, grids, or any brand mentions
  * This is DIFFERENT from products - brands are the manufacturer/distributor names, NOT the products/services
  * DO NOT confuse products/services with brands - if it says "Digital Distribution Platform", that's a PRODUCT, not a brand
  * Return as an array of strings, one brand name per string
  * Example: ["Yamaha", "Shure", "Pioneer DJ", "Gibson", "Epiphone", "audio-technica", "KRK SYSTEMS", "TANNOY", "Turbosound", "MIDAS", "AEROBAND", "AlphaTheta"]
- Addresses (CRITICAL - EXTRACT ALL PHYSICAL ADDRESSES):
  * Look for "Contact", "Address", "Location", "Find Us", "Visit Us", "Headquarters", "Office", or footer sections
  * Extract complete physical addresses including street address, city, state/province, postal code, and country
  * Address type should be one of: "headquarters", "billing", "shipping", "warehouse", "manufacturing"
  * If type is not specified, use "headquarters" for the first address
  * Return as an array of objects with: type, street, city, country, postalCode, state
  * Example: [{"type": "headquarters", "street": "123 Main St", "city": "Cape Town", "state": "Western Cape", "postalCode": "8001", "country": "South Africa"}]
  * Extract ALL addresses found - headquarters, warehouses, offices, etc.
- Revenue (if mentioned - as string)
- Business type (LLC, Inc, Pty Ltd, etc.)
- Tax ID / Registration Number / VAT Number (if mentioned)
- Payment terms (if mentioned)
- Currency (3-letter code like USD, ZAR, EUR)
- Tags (relevant keywords/tags - array of strings)

IMPORTANT FORMATTING RULES:
1. Website URLs: Always include full URL with https:// (e.g., "https://www.example.com" not "www.example.com")
2. Addresses: Each address MUST include a "type" field. Use "headquarters" if not specified.
3. Email: Must be valid email format (user@domain.com)
4. Social media: Must be full URLs (https://linkedin.com/...)
5. Only extract information that is clearly present in the content. Do not infer or make up data.

Return ONLY the information that can be clearly identified in the content.`;

    try {
      // Try generateObject first (Claude models generally support JSON schema)
      try {
        // Reasoning models don't support temperature
        const generateOptions: unknown = {
          model,
          schema: SupplierDataSchema,
          prompt,
        };
        if (!this.isReasoningModel('claude-3-5-sonnet-20241022')) {
          generateOptions.temperature = 0.1;
        }

        const result = await generateObject(generateOptions);

        console.log('✅ AI extraction completed successfully');

        // Post-process and normalize the extracted data
        return this.postProcessExtractedData(result.object, url);
      } catch (schemaError: unknown) {
        // Fallback to generateText with JSON mode if JSON schema fails
        // (defensive programming - Claude models should support JSON schema, but handle edge cases)
        if (
          schemaError?.message?.includes('json_schema') ||
          schemaError?.message?.includes('structured') ||
          schemaError?.responseBody?.includes('json_schema')
        ) {
          console.warn(`⚠️ Anthropic model doesn't support JSON schema, using JSON mode fallback`);

          // Use generateText with JSON mode
          const jsonPrompt = `${prompt}

IMPORTANT: You must respond with ONLY valid JSON matching this exact schema:
{
  "companyName": "string or omit",
  "description": "string or omit",
  "industry": "string or omit",
  "location": "string or omit",
  "contactEmail": "valid email or omit",
  "contactPhone": "string or omit",
  "website": "full URL with https:// or omit",
  "employees": "string or omit",
  "founded": "string or omit",
  "socialMedia": {
    "linkedin": "full URL or omit",
    "twitter": "full URL or omit",
    "facebook": "full URL or omit"
  } or omit,
  "certifications": ["string"] or omit,
  "services": ["string"] or omit,
  "products": ["string"] or omit,
  "brands": ["string"] or omit,
  "categories": ["string"] or omit,
  "brandLinks": [{"name": "string", "url": "string or omit"}] or omit,
  "addresses": [{"type": "string", "street": "string", "city": "string", "country": "string", "postalCode": "string", "state": "string"}] or omit,
  "revenue": "string or omit",
  "businessType": "string or omit",
  "tags": ["string"] or omit,
  "taxId": "string or omit",
  "registrationNumber": "string or omit",
  "vatNumber": "string or omit",
  "currency": "string or omit",
  "paymentTerms": "string or omit",
  "leadTime": "string or omit",
  "minimumOrderValue": "string or omit"
}

Return ONLY the JSON object, no other text.`;

          const textOptions: unknown = {
            model,
            prompt: jsonPrompt,
          };
          if (!this.isReasoningModel('claude-3-5-sonnet-20241022')) {
            textOptions.temperature = 0.1;
          }

          const textResult = await generateText(textOptions);

          // Parse the JSON response
          const jsonMatch = textResult.text.match(/\{[\s\S]*\}/);
          if (!jsonMatch) {
            throw new Error('No JSON found in AI response');
          }

          const parsedData = JSON.parse(jsonMatch[0]);

          // Validate against schema
          const validatedData = SupplierDataSchema.parse(parsedData);

          console.log('✅ AI extraction completed successfully (JSON mode fallback)');

          // Post-process and normalize the extracted data
          return this.postProcessExtractedData(validatedData, url);
        }

        // Re-throw if it's a different error
        throw schemaError;
      }
    } catch (error) {
      console.error('❌ Anthropic extraction error:', error);
      throw error;
    }
  }

  /**
   * Check if a model is a reasoning model (doesn't support temperature)
   */
  private isReasoningModel(modelName: string): boolean {
    if (!modelName) return false;
    const normalized = modelName.trim().toLowerCase();
    return /^o1(-|$)/i.test(normalized) || /^o3(-|$)/i.test(normalized);
  }

  /**
   * Check if a model supports JSON schema (structured outputs)
   */
  private supportsJsonSchema(modelName: string): boolean {
    if (!modelName) return false;

    // Models that don't support JSON schema format
    // These are "responses" models that only support specific output formats
    // Note: gpt-5-nano DOES support JSON schema, so it's not included here
    const unsupportedPatterns = [
      /gpt-5-mini/i, // gpt-5-mini doesn't support JSON schema
      /gpt-5-chat/i, // gpt-5-chat variants don't support JSON schema
      /^o1(-|$)/i, // o1, o1-mini, o1-preview, etc. (reasoning models)
      /^o3(-|$)/i, // o3, o3-mini, etc. (reasoning models)
    ];

    // Check if model name matches any unsupported pattern
    const normalizedModel = modelName.trim();
    return !unsupportedPatterns.some(pattern => pattern.test(normalizedModel));
  }

  /**
   * Get a fallback model that supports JSON schema
   */
  private getCompatibleModel(requestedModel?: string): string {
    if (!requestedModel) {
      return 'gpt-4o-mini';
    }

    const trimmedModel = requestedModel.trim();

    // If requested model supports JSON schema, use it
    if (this.supportsJsonSchema(trimmedModel)) {
      return trimmedModel;
    }

    // Fallback to models that definitely support JSON schema
    return 'gpt-4o-mini';
  }

  /**
   * Extract using OpenAI GPT (or OpenAI-compatible API like OpenRouter)
   */
  private async extractWithOpenAI(
    textContent: string,
    url: string
  ): Promise<ExtractedSupplierData | null> {
    if (!this.openaiApiKey) {
      throw new Error('OPENAI_API_KEY not configured');
    }

    const openai = createOpenAI({
      apiKey: this.openaiApiKey,
      ...(this.openaiBaseUrl ? { baseURL: this.openaiBaseUrl } : {}),
    });

    const requestedModel = this.openaiModel || 'gpt-4o-mini';
    const modelName = this.getCompatibleModel(requestedModel);

    // Log if we're using a fallback model
    if (requestedModel !== modelName) {
      console.warn(
        `⚠️ Model ${requestedModel} doesn't support JSON schema, falling back to ${modelName}`
      );
    }

    // Model name is already trimmed in constructor and getCompatibleModel, but double-check
    const model = openai(modelName.trim());

    const prompt = `You are an expert data extraction specialist. Extract structured supplier/company information from the following web content.

URL: ${url}

Content:
${textContent.substring(0, 8000)} ${textContent.length > 8000 ? '...' : ''}

Extract the following information if available:

REQUIRED FIELDS (if found):
- Company name (official business name)
- Description (what the company does)
- Industry (primary industry sector)
- Location (city, country, or region)
- Contact email (business email address - must be valid email format)
- Contact phone (business phone number)
- Website URL (must include full URL with https:// protocol)

OPTIONAL FIELDS:
- Employee count (number of employees as string, e.g., "50-200" or "500")
- Founded year (year the company was established, as string)
- Social media links (LinkedIn, Twitter, Facebook - must be full URLs)
- Certifications (ISO, SOC, etc. - array of strings)
- Services (list of services offered - array of strings)
- Products (list of PRODUCTS/SERVICES offered - array of strings)
  * Examples: "Digital Distribution Platform", "Music Marketing Services", "CD Manufacturing"
  * These are WHAT the company sells/provides, not brand names

- Brands (CRITICAL - EXTRACT ALL BRAND NAMES):
  * Brand names are MANUFACTURER/DISTRIBUTOR names that the supplier carries
  * Look for sections titled "Brands", "Our Brands", "Brands We Carry", "Featured Brands", or similar
  * If you see a "BRANDS PAGE CONTENT" section, extract EVERY brand name listed there
  * Brand names are typically capitalized manufacturer names (e.g., "Yamaha", "Shure", "Pioneer DJ", "Gibson", "Epiphone", "audio-technica", "KRK SYSTEMS", "TANNOY", "MIDAS", "AEROBAND", "AlphaTheta", "Blackstar AMPLIFICATION", "dBTechnologies", "HK AUDIO", "KLARK TEKNIK", "Turbosound", etc.)
  * Extract brand names from logos, lists, grids, or any brand mentions
  * This is DIFFERENT from products - brands are the manufacturer/distributor names, NOT the products/services
  * DO NOT confuse products/services with brands - if it says "Digital Distribution Platform", that's a PRODUCT, not a brand
  * Return as an array of strings, one brand name per string
  * Example: ["Yamaha", "Shure", "Pioneer DJ", "Gibson", "Epiphone", "audio-technica", "KRK SYSTEMS", "TANNOY", "Turbosound", "MIDAS", "AEROBAND", "AlphaTheta"]
- Addresses (CRITICAL - EXTRACT ALL PHYSICAL ADDRESSES):
  * Look for "Contact", "Address", "Location", "Find Us", "Visit Us", "Headquarters", "Office", or footer sections
  * Extract complete physical addresses including street address, city, state/province, postal code, and country
  * Address type should be one of: "headquarters", "billing", "shipping", "warehouse", "manufacturing"
  * If type is not specified, use "headquarters" for the first address
  * Return as an array of objects with: type, street, city, country, postalCode, state
  * Example: [{"type": "headquarters", "street": "123 Main St", "city": "Cape Town", "state": "Western Cape", "postalCode": "8001", "country": "South Africa"}]
  * Extract ALL addresses found - headquarters, warehouses, offices, etc.
- Revenue (if mentioned - as string)
- Business type (LLC, Inc, Pty Ltd, etc.)
- Tax ID / Registration Number / VAT Number (if mentioned)
- Payment terms (if mentioned)
- Currency (3-letter code like USD, ZAR, EUR)
- Tags (relevant keywords/tags - array of strings)

IMPORTANT FORMATTING RULES:
1. Website URLs: Always include full URL with https:// (e.g., "https://www.example.com" not "www.example.com")
2. Addresses: Each address MUST include a "type" field. Use "headquarters" if not specified.
3. Email: Must be valid email format (user@domain.com)
4. Social media: Must be full URLs (https://linkedin.com/...)
5. Only extract information that is clearly present in the content. Do not infer or make up data.

Return ONLY the information that can be clearly identified in the content.`;

    try {
      // Try generateObject first (requires JSON schema support)
      try {
        // Reasoning models don't support temperature
        const generateOptions: unknown = {
          model,
          schema: SupplierDataSchema,
          prompt,
        };
        if (!this.isReasoningModel(modelName)) {
          generateOptions.temperature = 0.1;
        }

        const result = await generateObject(generateOptions);

        console.log('✅ AI extraction completed successfully');

        // Post-process and normalize the extracted data
        return this.postProcessExtractedData(result.object, url);
      } catch (schemaError: unknown) {
        // Check if it's a rate limit error - don't retry, return null so other provider can try
        // Handle both direct rate limit errors and retry errors that contain rate limit errors
        const isRateLimitError =
          schemaError?.statusCode === 429 ||
          schemaError?.lastError?.statusCode === 429 ||
          schemaError?.message?.includes('Rate limit') ||
          schemaError?.message?.includes('rate limit') ||
          schemaError?.lastError?.message?.includes('Rate limit') ||
          schemaError?.lastError?.message?.includes('rate limit') ||
          schemaError?.responseBody?.includes('Rate limit') ||
          schemaError?.responseBody?.includes('rate limit') ||
          schemaError?.lastError?.responseBody?.includes('Rate limit') ||
          schemaError?.lastError?.responseBody?.includes('rate limit');

        if (isRateLimitError) {
          const errorSource = schemaError?.lastError || schemaError;
          const resetTime = errorSource?.responseHeaders?.['x-ratelimit-reset'];
          const resetDate = resetTime ? new Date(parseInt(resetTime)).toISOString() : 'unknown';
          console.warn(
            `⚠️ Rate limit exceeded for model ${modelName}. Reset at: ${resetDate}. Skipping this provider.`
          );
          // Return null to allow other provider to handle the request
          return null;
        }

        // Check if it's a model not found error - fallback to compatible model
        if (
          schemaError?.message?.includes('model_not_found') ||
          schemaError?.message?.includes('does not exist') ||
          schemaError?.responseBody?.includes('model_not_found')
        ) {
          console.warn(`⚠️ Model ${modelName} not found, falling back to gpt-4o-mini`);

          // Try with fallback model
          const fallbackModel = openai('gpt-4o-mini');
          try {
            const fallbackOptions: unknown = {
              model: fallbackModel,
              schema: SupplierDataSchema,
              prompt,
            };
            if (!this.isReasoningModel('gpt-4o-mini')) {
              fallbackOptions.temperature = 0.1;
            }

            const result = await generateObject(fallbackOptions);

            console.log('✅ AI extraction completed successfully (fallback model)');
            return this.postProcessExtractedData(result.object, url);
          } catch (fallbackError) {
            // If fallback also fails, try JSON mode
            console.warn(`⚠️ Fallback model also failed, using JSON mode`);
            throw schemaError; // Re-throw to trigger JSON mode fallback
          }
        }

        // If JSON schema is not supported, fall back to generateText with JSON mode
        if (
          schemaError?.message?.includes('json_schema') ||
          schemaError?.message?.includes('text.format') ||
          schemaError?.responseBody?.includes('json_schema')
        ) {
          console.warn(
            `⚠️ Model ${modelName} doesn't support JSON schema, using JSON mode fallback`
          );

          // Use generateText with JSON mode
          const jsonPrompt = `${prompt}

IMPORTANT: You must respond with ONLY valid JSON matching this exact schema:
{
  "companyName": "string or omit",
  "description": "string or omit",
  "industry": "string or omit",
  "location": "string or omit",
  "contactEmail": "valid email or omit",
  "contactPhone": "string or omit",
  "website": "full URL with https:// or omit",
  "employees": "string or omit",
  "founded": "string or omit",
  "socialMedia": {
    "linkedin": "full URL or omit",
    "twitter": "full URL or omit",
    "facebook": "full URL or omit"
  } or omit,
  "certifications": ["string"] or omit,
  "services": ["string"] or omit,
  "products": ["string"] or omit,
  "brands": ["string"] or omit,
  "categories": ["string"] or omit,
  "brandLinks": [{"name": "string", "url": "string or omit"}] or omit,
  "addresses": [{"type": "string", "street": "string", "city": "string", "country": "string", "postalCode": "string", "state": "string"}] or omit,
  "revenue": "string or omit",
  "businessType": "string or omit",
  "tags": ["string"] or omit,
  "taxId": "string or omit",
  "registrationNumber": "string or omit",
  "vatNumber": "string or omit",
  "currency": "string or omit",
  "paymentTerms": "string or omit",
  "leadTime": "string or omit",
  "minimumOrderValue": "string or omit"
}

Return ONLY the JSON object, no other text.`;

          // Try with fallback model if original failed
          const textModel =
            modelName.includes('gpt-5-nano') || modelName.includes('gpt-5-mini')
              ? openai('gpt-4o-mini')
              : model;

          const textOptions: unknown = {
            model: textModel,
            prompt: jsonPrompt,
          };
          if (!this.isReasoningModel(modelName)) {
            textOptions.temperature = 0.1;
          }

          const textResult = await generateText(textOptions);

          // Parse the JSON response
          const jsonMatch = textResult.text.match(/\{[\s\S]*\}/);
          if (!jsonMatch) {
            throw new Error('No JSON found in AI response');
          }

          const parsedData = JSON.parse(jsonMatch[0]);

          // Validate against schema
          const validatedData = SupplierDataSchema.parse(parsedData);

          console.log('✅ AI extraction completed successfully (JSON mode fallback)');

          // Post-process and normalize the extracted data
          return this.postProcessExtractedData(validatedData, url);
        }

        // Re-throw if it's a different error
        throw schemaError;
      }
    } catch (error) {
      console.error('❌ OpenAI extraction error:', error);
      throw error;
    }
  }

  /**
   * Post-process extracted data to fix common issues and ensure completeness
   */
  private postProcessExtractedData(data: unknown, sourceUrl: string): ExtractedSupplierData {
    const processed: ExtractedSupplierData = { ...data };

    // Normalize website URL
    if (processed.website) {
      processed.website = this.normalizeUrl(processed.website);
    } else if (sourceUrl) {
      // Use source URL if website not provided
      processed.website = this.normalizeUrl(sourceUrl);
    }

    // Ensure addresses have required fields and validate they're actual addresses
    if (processed.addresses && processed.addresses.length > 0) {
      processed.addresses = processed.addresses
        .map((addr: unknown, index: number) => ({
          type: addr.type || (index === 0 ? 'headquarters' : 'shipping'),
          street: addr.street || addr.addressLine1 || '',
          city: addr.city || '',
          country:
            addr.country ||
            processed.location?.split(',')[processed.location.split(',').length - 1]?.trim() ||
            '',
          postalCode: addr.postalCode || addr.postal_code || '',
          state: addr.state || addr.province || '',
        }))
        .filter((addr: unknown) => {
          // Remove empty addresses
          if (!addr.street && !addr.city) return false;

          // Validate that street field contains actual address data, not brand/product info
          if (addr.street) {
            // Reject if it contains brand/product keywords (these are NOT addresses)
            const invalidPatterns = [
              /^(enova|gibson|db technologies|pioneer|hpw|flx)/i, // Brand names at start
              /\b(reliable connection|iconic guitar|loud speakers|sub-woofers|column-array|controllers|view product|check out|explore)\b/i, // Product descriptions
              /\b(product|products|range|brand|brands|systems|applications|technology)\b/i, // Generic product words
              />>/g, // HTML/UI elements
              /\b(explore|check out|view)\b/i, // Action words from product pages
            ];

            if (invalidPatterns.some(pattern => pattern.test(addr.street))) {
              console.warn(
                `⚠️ Rejected invalid address street (contains brand/product info): "${addr.street.substring(0, 100)}"`
              );
              return false;
            }

            // Address should contain at least one of: street number, address keyword, or be a valid city name
            const hasStreetNumber = /\d+/.test(addr.street);
            const hasAddressKeyword =
              /\b(street|st|avenue|ave|road|rd|drive|dr|court|ct|boulevard|blvd|way|lane|ln|place|pl|parkway|pkwy)\b/i.test(
                addr.street
              );
            const isLikelyAddress = hasStreetNumber || hasAddressKeyword || addr.street.length < 50;

            // If street is very long and doesn't look like an address, reject it
            if (addr.street.length > 100 && !hasStreetNumber && !hasAddressKeyword) {
              console.warn(
                `⚠️ Rejected invalid address street (too long, doesn't look like address): "${addr.street.substring(0, 100)}"`
              );
              return false;
            }

            if (!isLikelyAddress && addr.street.length > 50) {
              console.warn(
                `⚠️ Rejected invalid address street (doesn't match address patterns): "${addr.street.substring(0, 100)}"`
              );
              return false;
            }
          }

          return true;
        });
    } else if (processed.location) {
      // Create address from location if no addresses provided
      const locationParts = processed.location.split(',').map((p: string) => p.trim());
      processed.addresses = [
        {
          type: 'headquarters',
          street: '',
          city: locationParts[0] || '',
          country: locationParts[locationParts.length - 1] || '',
          postalCode: '',
        },
      ];
    }

    // Normalize social media URLs
    if (processed.socialMedia) {
      Object.keys(processed.socialMedia).forEach(key => {
        const url = processed.socialMedia![key as keyof typeof processed.socialMedia];
        if (url && url !== '') {
          processed.socialMedia![key as keyof typeof processed.socialMedia] = this.normalizeUrl(
            url
          ) as unknown;
        }
      });
    }

    // Ensure email is valid
    if (processed.contactEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(processed.contactEmail)) {
      delete processed.contactEmail;
    }

    // Clean up empty arrays
    if (processed.services && processed.services.length === 0) delete processed.services;
    if (processed.products && processed.products.length === 0) delete processed.products;
    if (processed.certifications && processed.certifications.length === 0)
      delete processed.certifications;
    if (processed.tags && processed.tags.length === 0) delete processed.tags;

    // Post-process brands to filter out products/services that were incorrectly extracted
    if (processed.brands && processed.brands.length > 0) {
      // Filter out common product/service patterns - these are NOT brands
      const productServicePatterns = [
        /platform/i,
        /service/i,
        /product/i,
        /solution/i,
        /system/i,
        /software/i,
        /application/i,
        /digital distribution/i,
        /physical.*distribution/i,
        /marketing.*service/i,
        /development.*program/i,
        /management/i,
        /optimization/i,
        /publishing/i,
        /royalty/i,
        /streaming/i,
      ];

      // Filter out UI elements, button names, and image names
      const uiElementPatterns = [
        /^(site|page|web|button|link|menu|nav|header|footer|sidebar)/i,
        /(site|page|web|button|link|menu|nav|header|footer|sidebar)\s+\d+/i,
        /button\s*\d+/i,
        /site\s+button/i,
        /page\s+button/i,
        /subscribe/i,
        /newsletter/i,
        /magazine/i,
        /image\s+\d+/i,
        /whatsapp\s+image/i,
        /logo\s+\d+/i,
        /asset\s+\d+/i,
        /^\d+\s*$/,
        /^[a-z]+\s+\d+$/i, // Simple pattern like "button 01"
        /front$/i, // Image descriptions like "Front"
        /back$/i,
        /top$/i,
        /side$/i,
      ];

      // Filter out product model numbers and product descriptions
      const productModelPatterns = [
        /\b(hpw|xdj|grv|at-|lt-|mk\d+|series|pack|replacement|stylus|groovebox|pedal|bass pack)\b/i, // Product model prefixes and types
        /\b\d{3,}\b/, // 3+ digit numbers (model numbers)
        /[a-z]+\d{2,}[a-z]*/i, // Alphanumeric model codes like "hpw1000", "xdj az", "grv6"
        /[a-z]+-\d+/i, // Model codes like "AT-VMN40xML"
        /\b(replacement|stylus|pedal|pack|groovebox|track|front|back|top|side)\b/i, // Product type words
        /\b(from|to|the|of|and|or)\b/i, // Common words in product descriptions
        /\b\d+\s*(track|channel|series|mk|model)\b/i, // Number + product type
        /\b[A-Z]{2,}-\w+\d+\w*\b/i, // Model codes like "AT-VMN40xML", "LT-DUAL"
      ];

      // Filter out magazine/blog/article names (dates, months, years)
      const magazinePatterns = [
        /\b(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)\s+\d{4}/i, // Dates like "apr 2025"
        /\d{4}\s+(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)/i, // Dates like "2025 apr"
        /\b(soundpress|musicgear|magazine|blog|article|musical-instruments)\b/i,
        /-\d{4}$/i, // Ends with year like "-2025"
        /\b(subscribe|subsribe)\b/i, // Subscribe typos
      ];

      const originalCount = processed.brands.length;
      const filteredBrands = processed.brands.filter(brand => {
        const brandTrimmed = brand.trim();
        const brandLower = brandTrimmed.toLowerCase();

        // Basic validation
        if (brandTrimmed.length < 2 || brandTrimmed.length > 40) {
          console.log(`🚫 Filtered out brand (length): "${brand}"`);
          return false;
        }

        if (!brandTrimmed.match(/[a-z]/i)) {
          console.log(`🚫 Filtered out brand (no letters): "${brand}"`);
          return false;
        }

        if (/^\d+$/.test(brandTrimmed)) {
          console.log(`🚫 Filtered out brand (only numbers): "${brand}"`);
          return false;
        }

        // Check product/service patterns
        const isProduct = productServicePatterns.some(pattern => pattern.test(brandLower));
        if (isProduct) {
          console.log(`🚫 Filtered out product/service from brands: "${brand}"`);
          return false;
        }

        // Check UI element patterns
        const isUIElement = uiElementPatterns.some(pattern => pattern.test(brandLower));
        if (isUIElement) {
          console.log(`🚫 Filtered out UI element from brands: "${brand}"`);
          return false;
        }

        // Check product model patterns
        const isProductModel = productModelPatterns.some(pattern => pattern.test(brandTrimmed));
        if (isProductModel) {
          console.log(`🚫 Filtered out product model from brands: "${brand}"`);
          return false;
        }

        // Check magazine/blog patterns
        const isMagazine = magazinePatterns.some(pattern => pattern.test(brandLower));
        if (isMagazine) {
          console.log(`🚫 Filtered out magazine/blog from brands: "${brand}"`);
          return false;
        }

        // Filter out items that look like product descriptions (too many words, contains dashes with model numbers)
        const wordCount = brandTrimmed.split(/\s+/).length;
        if (wordCount > 3) {
          // Reduced from 4 to catch more product descriptions
          console.log(`🚫 Filtered out brand (too many words): "${brand}"`);
          return false;
        }

        // Filter out items with model-number-like patterns (e.g., "Audio-Technica AT-VMN40xML")
        if (/\b[A-Z]{2,}-\w+\d+\w*\b/i.test(brandTrimmed)) {
          console.log(`🚫 Filtered out brand (contains model number): "${brand}"`);
          return false;
        }

        // Filter out items that contain product model numbers anywhere
        if (/[a-z]+\d{3,}/i.test(brandTrimmed) || /\d{3,}[a-z]*/i.test(brandTrimmed)) {
          console.log(`🚫 Filtered out brand (contains model number): "${brand}"`);
          return false;
        }

        // Filter out items that start with lowercase (likely product names or descriptions)
        if (brandTrimmed.match(/^[a-z]/) && wordCount > 1) {
          // Allow single-word lowercase brands, but filter multi-word lowercase items
          console.log(`🚫 Filtered out brand (lowercase multi-word): "${brand}"`);
          return false;
        }

        return true;
      });

      // Deduplicate and normalize brands
      const brandMap = new Map<string, string>();
      filteredBrands.forEach(brand => {
        // Normalize: lowercase, remove extra spaces, remove special chars for comparison
        const normalized = brand
          .toLowerCase()
          .replace(/[\s\u00A0\u200B-\u200D\uFEFF\-_™®©]+/g, '')
          .trim();

        // Check if we already have this brand (case-insensitive, ignoring special chars and spaces)
        const existing = brandMap.get(normalized);

        if (!existing) {
          // First time seeing this brand
          brandMap.set(normalized, brand);
        } else {
          // Prefer the version with proper capitalization and hyphens
          const currentNormalized = brand.toLowerCase().replace(/[\s\-_]/g, '');
          const existingNormalized = existing.toLowerCase().replace(/[\s\-_]/g, '');
          if (currentNormalized === existingNormalized) {
            // Prefer version with proper capitalization (starts with capital)
            if (brand.match(/^[A-Z]/) && !existing.match(/^[A-Z]/)) {
              brandMap.set(normalized, brand);
            }
            // Prefer version with hyphens over spaces (e.g., "Audio-Technica" over "Audio Technica")
            else if (brand.includes('-') && !existing.includes('-') && brand.match(/^[A-Z]/)) {
              brandMap.set(normalized, brand);
            }
            // Prefer version without spaces if both have same capitalization (e.g., "KlarkTeknik" over "Klark Teknik")
            else if (!brand.includes(' ') && existing.includes(' ') && brand.match(/^[A-Z]/)) {
              brandMap.set(normalized, brand);
            }
          }
        }
      });

      processed.brands = Array.from(brandMap.values()).sort();

      if (originalCount !== processed.brands.length) {
        console.log(
          `🔍 Filtered brands: ${originalCount} → ${processed.brands.length} (removed ${originalCount - processed.brands.length} products/services/duplicates)`
        );
      }
    }

    if (processed.categories && processed.categories.length > 0) {
      const normalizedCategories = new Map<string, string>();
      processed.categories.forEach(category => {
        const cleaned = category.replace(/[\s\u00A0\u200B-\u200D\uFEFF]+/g, ' ').trim();
        if (!cleaned) return;
        const key = cleaned.toLowerCase();
        if (!normalizedCategories.has(key)) {
          normalizedCategories.set(key, cleaned.charAt(0).toUpperCase() + cleaned.slice(1));
        }
      });
      processed.categories = Array.from(normalizedCategories.values()).slice(0, 50);
    }

    // Generate tags if not provided
    if (!processed.tags || processed.tags.length === 0) {
      processed.tags = this.generateTags(processed);
    }

    return processed;
  }

  /**
   * Normalize URL to ensure it has protocol
   */
  private normalizeUrl(url: string): string {
    if (!url || url === '') return '';

    // Remove whitespace
    url = url.trim();

    // If it's already a full URL, return as is
    if (url.startsWith('http://') || url.startsWith('https://')) {
      return url;
    }

    // If it starts with www., add https://
    if (url.startsWith('www.')) {
      return `https://${url}`;
    }

    // If it looks like a domain, add https://
    if (url.includes('.') && !url.includes(' ')) {
      return `https://${url}`;
    }

    return url;
  }

  /**
   * Generate tags from extracted data
   */
  private generateTags(data: ExtractedSupplierData): string[] {
    const tags: string[] = [];

    if (data.industry) {
      tags.push(data.industry.toLowerCase());
    }

    if (data.services) {
      tags.push(...data.services.slice(0, 3).map(s => s.toLowerCase().substring(0, 20)));
    }

    if (data.location) {
      const locationParts = data.location.split(',').map(p => p.trim().toLowerCase());
      tags.push(...locationParts.slice(0, 2));
    }

    return [...new Set(tags)].slice(0, 10);
  }

  /**
   * Fallback extraction using rule-based methods
   */
  private extractWithFallback(content: {
    url: string;
    title: string;
    description: string;
    content?: string;
    rawHtml?: string;
  }): ExtractedSupplierData {
    const fullText =
      `${content.title} ${content.description} ${content.content || ''}`.toLowerCase();

    const data: ExtractedSupplierData = {
      companyName: this.extractCompanyName(content.title),
      description: content.description,
      website: content.url,
    };

    // Extract email
    const emailMatch = fullText.match(/\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/i);
    if (emailMatch) {
      data.contactEmail = emailMatch[0];
    }

    // Extract phone
    const phoneMatch = fullText.match(
      /(\+?\d{1,4}[\s.-]?)?(\(?\d{2,4}\)?[\s.-]?)?\d{3,4}[\s.-]?\d{4}/
    );
    if (phoneMatch) {
      data.contactPhone = phoneMatch[0];
    }

    // Extract industry keywords
    const industries = [
      'technology',
      'manufacturing',
      'healthcare',
      'finance',
      'music',
      'entertainment',
    ];
    for (const industry of industries) {
      if (fullText.includes(industry)) {
        data.industry = industry.charAt(0).toUpperCase() + industry.slice(1);
        break;
      }
    }

    return data;
  }

  /**
   * Prepare content for AI analysis
   */
  private prepareContentForAI(content: {
    url: string;
    title: string;
    description: string;
    content?: string;
    rawHtml?: string;
  }): string {
    let textContent = `Title: ${content.title}\n\n`;
    textContent += `Description: ${content.description}\n\n`;

    // PRIORITY: Extract brands section from HTML first
    if (content.rawHtml) {
      // Look for brands page links and extract brands from there
      const brandsLinkPattern = /href=["']([^"']*\/brands?[^"']*)["']/gi;
      const brandsLinks = [...content.rawHtml.matchAll(brandsLinkPattern)].map(m => m[1]);

      // Also look for brands sections directly in HTML
      const brandsPattern =
        /(?:<section[^>]*>|<div[^>]*>|<ul[^>]*>|<ol[^>]*>|<nav[^>]*>).*?(?:brands?|Brands?|BRANDS?|our brands|Our Brands|brands we carry|Brands We Carry|featured brands|Featured Brands)[^<]*(?:<\/section>|<\/div>|<\/ul>|<\/ol>|<\/nav>)/gis;
      const brandsMatches = content.rawHtml.match(brandsPattern);

      if (brandsMatches && brandsMatches.length > 0) {
        const brandsText = this.extractTextFromHtml(brandsMatches.join('\n'));
        textContent += `\n=== BRANDS SECTION (HIGH PRIORITY - EXTRACT ALL BRAND NAMES FROM HERE) ===\n${brandsText}\n=== END BRANDS SECTION ===\n\n`;
      }

      // Extract brand names directly from HTML (look for common brand name patterns)
      // Match capitalized words that look like brand names
      const brandNamePattern =
        /\b([A-Z][A-Z0-9\s&-]+(?:DJ|SYSTEMS|AMPLIFICATION|AUDIO|SOUND|WORKS|BEYOND|TEKNIK)?)\b/g;
      const potentialBrands = [...content.rawHtml.matchAll(brandNamePattern)]
        .map(m => m[1].trim())
        .filter(b => {
          const len = b.length;
          return (
            len > 2 &&
            len < 50 &&
            !b.match(
              /^(HTML|HEAD|BODY|DIV|SPAN|SECTION|NAV|HEADER|FOOTER|SCRIPT|STYLE|META|LINK)$/i
            ) &&
            !b.match(/^\d+$/) && // Not just numbers
            b.split(/\s+/).length <= 4
          ); // Not too many words
        })
        .slice(0, 50); // Limit to 50 potential brands

      if (potentialBrands.length > 0) {
        textContent += `\n=== POTENTIAL BRAND NAMES FOUND IN HTML ===\n${potentialBrands.join(', ')}\n=== END POTENTIAL BRANDS ===\n\n`;
      }
    }

    if (content.content) {
      // Use cleaned content if available
      textContent += `Content:\n${content.content.substring(0, 6000)}\n`;
    } else if (content.rawHtml) {
      // Extract text from HTML if needed
      const textFromHtml = this.extractTextFromHtml(content.rawHtml);
      textContent += `Content:\n${textFromHtml.substring(0, 6000)}\n`;
    }

    return textContent;
  }

  /**
   * Extract text from HTML (simple implementation)
   */
  private extractTextFromHtml(html: string): string {
    // Remove script and style tags
    let text = html.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '');
    text = text.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '');

    // Remove HTML tags
    text = text.replace(/<[^>]+>/g, ' ');

    // Decode HTML entities
    text = this.decodeHtmlEntities(text);

    // Clean up whitespace
    text = text.replace(/\s+/g, ' ').trim();

    return text;
  }

  /**
   * Extract company name from title
   */
  private extractCompanyName(title: string): string {
    // Remove common suffixes and prefixes
    const cleaned = title
      .replace(/\s*[-–—]\s*.+$/, '') // Remove everything after dash
      .replace(/\s*\(.*?\)\s*/g, '') // Remove parentheses
      .replace(/\s*\|.*$/, '') // Remove everything after pipe
      .trim();

    return cleaned || title;
  }

  /**
   * Decode HTML entities
   */
  private decodeHtmlEntities(text: string): string {
    return text
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/&nbsp;/g, ' ')
      .replace(/&#(\d+);/g, (_, dec) => String.fromCharCode(parseInt(dec, 10)))
      .trim();
  }
}

// Export singleton instance (uses env vars)
export const aiDataExtractionService = new AIDataExtractionService();

// Factory function to create instance with config
export function createAIDataExtractionService(config?: {
  anthropicApiKey?: string;
  anthropicBaseUrl?: string;
  openaiApiKey?: string;
  openaiBaseUrl?: string;
  openaiModel?: string;
}): AIDataExtractionService {
  return new AIDataExtractionService(config);
}
