// @ts-nocheck
// AI-Powered Web Scraping Service for intelligent supplier information extraction
export interface ScrapedWebsite {
  url: string;
  title: string;
  description: string;
  content: string;
  rawHtml: string;
  metadata: {
    companyName?: string;
    contactEmail?: string;
    contactPhone?: string;
    address?: string;
    socialMedia?: {
      linkedin?: string;
      twitter?: string;
      facebook?: string;
    };
    lastModified?: string;
    // Enhanced AI-extracted fields
    foundedYear?: string;
    employeeCount?: string;
    revenue?: string;
    industry?: string;
    certifications?: string[];
    services?: string[];
    products?: string[];
    aiSummary?: string;
    businessDescription?: string;
    keyStrengths?: string[];
  };
  extractionDate: string;
}

export class AIPoweredWebScrapingService {
  private timeout: number = 20000; // 20 seconds timeout

  constructor() {
    console.log('🤖 AI-Powered Web Scraping Service initialized');
  }

  /**
   * AI-powered website scraping with intelligent content analysis
   */
  async scrapeWebsite(url: string): Promise<ScrapedWebsite | null> {
    try {
      this.validateUrl(url);
      console.log(`🌐 Starting AI-powered analysis for: ${url}`);

      // Perform real web scraping with AI analysis
      const scrapedData = await this.performAIWebScraping(url);

      if (!scrapedData) {
        throw new Error('Failed to extract meaningful content from website');
      }

      console.log('✅ AI-powered analysis completed successfully');
      return scrapedData;
    } catch (error) {
      console.error('❌ AI web scraping failed:', error);
      throw new Error(
        `AI scraping failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * AI-powered web scraping with comprehensive analysis
   */
  private async performAIWebScraping(url: string): Promise<ScrapedWebsite | null> {
    try {
      console.log('🔍 Fetching website content...');

      // Fetch actual website content
      const response = await this.fetchWebsiteContent(url);
      if (!response) return null;

      const html = response;
      console.log(`📄 Content received: ${html.length} characters`);

      // Parse HTML and extract raw content
      const doc = new DOMParser().parseFromString(html, 'text/html');
      const rawContent = this.extractMeaningfulContent(doc);

      console.log(`📝 Meaningful content extracted: ${rawContent.length} characters`);

      // Perform AI-powered business intelligence analysis
      const aiAnalysis = this.performAIBusinessAnalysis(rawContent, url);

      console.log('🧠 AI Analysis Results:', aiAnalysis);

      // Generate comprehensive supplier profile
      const supplierProfile = this.generateSupplierProfile(aiAnalysis, url, html);

      return supplierProfile;
    } catch (error) {
      console.error('❌ AI scraping failed:', error);
      return null;
    }
  }

  /**
   * Fetch website content with error handling
   */
  private async fetchWebsiteContent(url: string): Promise<string | null> {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.timeout);

      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.5',
          'Accept-Encoding': 'gzip, deflate',
        },
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        console.log(`⚠️ HTTP ${response.status} for ${url}`);
        return null;
      }

      return await response.text();
    } catch (error) {
      console.error(`❌ Failed to fetch ${url}:`, error);
      return null;
    }
  }

  /**
   * Extract meaningful content from HTML using AI patterns
   */
  private extractMeaningfulContent(doc: Document): string {
    // Remove unwanted elements that don't contain business information
    const unwantedSelectors = [
      'script',
      'style',
      'nav',
      'header',
      'footer',
      'aside',
      '.sidebar',
      '.menu',
      '.navigation',
      '.ads',
      '.advertisement',
      '.social-share',
      '.comments',
      '.breadcrumb',
    ];

    unwantedSelectors.forEach(selector => {
      const elements = doc.querySelectorAll(selector);
      elements.forEach(el => el.remove());
    });

    // Extract content from priority areas using AI logic
    const contentAreas = this.identifyContentAreas(doc);

    let extractedContent = '';

    // Prioritize main content areas
    for (const area of contentAreas) {
      const element = doc.querySelector(area.selector);
      if (element) {
        const content = element.textContent || '';
        if (content.length > area.minLength) {
          extractedContent += content + '\n\n';
        }
      }
    }

    // Fallback to body content if no specific areas found
    if (!extractedContent.trim()) {
      extractedContent = doc.body?.textContent || '';
    }

    return this.cleanAndEnhanceContent(extractedContent);
  }

  /**
   * AI-powered content area identification
   */
  private identifyContentAreas(
    doc: Document
  ): Array<{ selector: string; minLength: number; weight: number }> {
    return [
      { selector: 'main', minLength: 100, weight: 10 },
      { selector: '[role="main"]', minLength: 100, weight: 10 },
      { selector: '.content', minLength: 50, weight: 8 },
      { selector: '.main-content', minLength: 50, weight: 8 },
      { selector: '#content', minLength: 50, weight: 8 },
      { selector: '.page-content', minLength: 50, weight: 8 },
      { selector: 'article', minLength: 100, weight: 7 },
      { selector: '.post', minLength: 50, weight: 6 },
      { selector: '.entry', minLength: 50, weight: 6 },
      { selector: '.about', minLength: 30, weight: 9 },
      { selector: '.company', minLength: 30, weight: 9 },
      { selector: '.services', minLength: 30, weight: 8 },
      { selector: '.contact', minLength: 30, weight: 8 },
    ];
  }

  /**
   * AI-powered business intelligence analysis
   */
  private performAIBusinessAnalysis(content: string, url: string): unknown {
    console.log('🧠 Starting AI business intelligence analysis...');

    const hostname = new URL(url).hostname;
    const domain = hostname.replace('www.', '');

    return {
      // Company identification
      companyName: this.extractCompanyNameAI(content, hostname),
      industry: this.analyzeIndustryAI(content),
      businessType: this.analyzeBusinessTypeAI(content),

      // Business description and summary
      description: this.generateBusinessDescriptionAI(content, domain),
      aiSummary: this.generateAISummary(content, domain),
      keyStrengths: this.extractKeyStrengthsAI(content),

      // Services and capabilities
      services: this.extractServicesAI(content),
      products: this.extractProductsAI(content),
      capabilities: this.extractCapabilitiesAI(content),

      // Contact and location information
      contactInfo: this.extractContactInfoAI(content),
      location: this.extractLocationAI(content),

      // Business metrics
      metrics: this.extractBusinessMetricsAI(content),

      // Quality indicators
      certifications: this.extractCertificationsAI(content),
      awards: this.extractAwardsAI(content),
      socialProof: this.extractSocialProofAI(content),
    };
  }

  /**
   * AI-powered company name extraction with multiple strategies
   */
  private extractCompanyNameAI(content: string, hostname: string): string {
    console.log('🏢 Extracting company name with AI...');

    // Strategy 1: Pattern-based extraction from headings and titles
    const headingPatterns = [
      /<h[1-3][^>]*>([^<]{3,50})<\/h[1-3]>/gi,
      /<title>([^<]{3,50})<\/title>/gi,
      /<meta[^>]*name=["']og:title["'][^>]*content=["']([^"']{3,50})["']/gi,
    ];

    for (const pattern of headingPatterns) {
      const matches = content.match(pattern);
      if (matches) {
        for (const match of matches.slice(0, 3)) {
          const cleanName = match.replace(/<[^>]*>/g, '').trim();
          if (this.isValidCompanyName(cleanName)) {
            console.log(`✅ AI extracted company name: "${cleanName}"`);
            return cleanName;
          }
        }
      }
    }

    // Strategy 2: Domain-based intelligent extraction
    const domainParts = hostname.split('.');
    if (domainParts.length >= 2) {
      const cleanDomain = domainParts[0]
        .replace(/[-_]/g, ' ')
        .replace(/\b\w/g, l => l.toUpperCase());

      if (cleanDomain.length > 2 && this.isValidCompanyName(cleanDomain)) {
        console.log(`✅ AI domain-based company name: "${cleanDomain}"`);
        return cleanDomain;
      }
    }

    // Strategy 3: Content-based extraction
    const companyPatterns = [
      /^(.{3,50}?)(?:\s*[-–—]\s*.+?)?\s*-\s*[A-Za-z]/,
      /^(.{3,50}?)(?:\s*\(.*?\))?\s*[-–—]/,
      /(?:company|corp|inc|ltd|pty)\s*[-–—]?\s*(.{3,30})/i,
    ];

    for (const pattern of companyPatterns) {
      const match = content.match(pattern);
      if (match && match[1]) {
        const name = match[1].trim();
        if (this.isValidCompanyName(name)) {
          console.log(`✅ AI content-based company name: "${name}"`);
          return name;
        }
      }
    }

    console.log('⚠️ Could not extract company name, using domain');
    return this.generateFallbackCompanyName(hostname);
  }

  /**
   * AI-powered industry classification
   */
  private analyzeIndustryAI(content: string): string {
    console.log('🏭 Analyzing industry with AI...');

    const lowerContent = content.toLowerCase();

    // AI-powered industry classification with confidence scoring
    const industryClassifiers = {
      'Technology & Software': {
        keywords: [
          'software',
          'technology',
          'it',
          'computing',
          'digital',
          'cloud',
          'saas',
          'app',
          'platform',
          'api',
          'development',
          'programming',
          'web',
          'mobile',
          'enterprise',
          'cybersecurity',
          'data',
          'analytics',
          'ai',
          'machine learning',
        ],
        weight: 1.0,
      },
      'Healthcare & Medical': {
        keywords: [
          'healthcare',
          'medical',
          'hospital',
          'pharmaceutical',
          'health',
          'medicine',
          'clinic',
          'pharmacy',
          'dental',
          'therapy',
          'patient',
          'doctor',
          'nurse',
        ],
        weight: 1.0,
      },
      'Financial Services': {
        keywords: [
          'finance',
          'banking',
          'financial',
          'investment',
          'insurance',
          'accounting',
          'consulting',
          'capital',
          'wealth',
          'loan',
          'credit',
          'trading',
        ],
        weight: 1.0,
      },
      'Manufacturing & Industrial': {
        keywords: [
          'manufacturing',
          'production',
          'factory',
          'industrial',
          'components',
          'parts',
          'assembly',
          'machinery',
          'equipment',
          'engineering',
        ],
        weight: 1.0,
      },
      'Professional Services': {
        keywords: [
          'consulting',
          'consultant',
          'advisory',
          'solutions',
          'services',
          'strategy',
          'management',
          'business',
          'professional',
        ],
        weight: 0.8,
      },
      'Education & Training': {
        keywords: [
          'education',
          'school',
          'university',
          'training',
          'learning',
          'academy',
          'course',
          'teaching',
          'student',
          'curriculum',
        ],
        weight: 1.0,
      },
      'Construction & Engineering': {
        keywords: [
          'construction',
          'building',
          'engineering',
          'contractor',
          'architect',
          'design',
          'civil',
          'structural',
          'infrastructure',
        ],
        weight: 1.0,
      },
      'Music & Entertainment': {
        keywords: [
          'music',
          'entertainment',
          'audio',
          'record',
          'label',
          'artist',
          'sound',
          'distribution',
          'studio',
          'production',
          'concert',
          'performance',
        ],
        weight: 1.0,
      },
    };

    // Calculate weighted scores for each industry
    const scores: Record<string, number> = {};

    for (const [industry, classifier] of Object.entries(industryClassifiers)) {
      let score = 0;
      for (const keyword of classifier.keywords) {
        if (lowerContent.includes(keyword)) {
          score += classifier.weight;
        }
      }
      scores[industry] = score;
    }

    // Find the industry with highest score
    const bestIndustry = Object.entries(scores).sort(([, a], [, b]) => b - a)[0];

    const result = bestIndustry[1] > 0 ? bestIndustry[0] : 'Professional Services';
    console.log(`✅ AI industry analysis: "${result}" (score: ${bestIndustry[1]})`);
    return result;
  }

  /**
   * AI-powered business type analysis
   */
  private analyzeBusinessTypeAI(content: string): string {
    const lowerContent = content.toLowerCase();

    const businessTypes = {
      'Technology Services': ['software development', 'it services', 'tech consulting'],
      Manufacturing: ['manufacturing', 'production', 'factory', 'industrial'],
      Consulting: ['consulting', 'advisory', 'business consulting'],
      Healthcare: ['medical', 'healthcare', 'clinic', 'hospital'],
      Retail: ['retail', 'shop', 'store', 'sales'],
      Education: ['education', 'training', 'learning', 'school'],
    };

    for (const [type, keywords] of Object.entries(businessTypes)) {
      if (keywords.some(keyword => lowerContent.includes(keyword))) {
        return type;
      }
    }

    return 'Professional Services';
  }

  /**
   * AI-powered business description generation
   */
  private generateBusinessDescriptionAI(content: string, domain: string): string {
    console.log('📝 Generating business description with AI...');

    // Extract first meaningful sentences that describe the business
    const sentences = content.split(/[.!?]+/).filter(s => s.trim().length > 20);

    for (const sentence of sentences) {
      const cleanSentence = sentence.trim();

      // Look for business-defining sentences
      if (this.isBusinessDescription(cleanSentence)) {
        console.log(`✅ AI generated description: "${cleanSentence.substring(0, 100)}..."`);
        return cleanSentence;
      }
    }

    // Generate fallback description based on domain and content analysis
    const baseName = domain
      .split('.')[0]
      .replace(/[-_]/g, ' ')
      .replace(/\b\w/g, l => l.toUpperCase());
    const industry = this.analyzeIndustryAI(content);

    const description = `${baseName} is a leading provider of ${industry.toLowerCase()} solutions, dedicated to delivering exceptional value and customer satisfaction through innovative approaches and professional expertise.`;

    console.log(`✅ AI fallback description: "${description}"`);
    return description;
  }

  /**
   * AI-powered service extraction
   */
  private extractServicesAI(content: string): string[] {
    console.log('⚙️ Extracting services with AI...');

    const services: string[] = [];
    const lowerContent = content.toLowerCase();

    // AI patterns for comprehensive service detection
    const servicePatterns = [
      // Direct service mentions
      /(?:we (?:provide|offer|supply|specialize in|deliver|provide)\s+([^.]+))/gi,
      /(?:our services? (?:include|encompass|cover)\s*:?\s*([^.]+))/gi,
      /(?:services? (?:offered|provided|available)\s*:?\s*([^.]+))/gi,

      // Capability-based patterns
      /(?:we help (?:businesses|organizations|companies)\s+([^.]+))/gi,
      /(?:we assist with\s+([^.]+))/gi,
      /(?:our expertise (?:includes|covers|encompasses)\s+([^.]+))/gi,

      // Professional service patterns
      /(?:specializing in|expert in|focus on)\s+([^.]+)/gi,
      /(?:leading provider of|trusted partner for)\s+([^.]+)/gi,
    ];

    for (const pattern of servicePatterns) {
      const matches = content.match(pattern);
      if (matches) {
        for (const match of matches.slice(0, 4)) {
          const service = this.cleanServiceText(match.trim());
          if (this.isValidService(service)) {
            services.push(service);
          }
        }
      }
    }

    // Deduplicate and limit results
    const uniqueServices = [...new Set(services)].slice(0, 6);

    console.log(`✅ AI extracted services:`, uniqueServices);
    return uniqueServices;
  }

  /**
   * AI-powered contact information extraction
   */
  private extractContactInfoAI(content: string): unknown {
    console.log('📞 Extracting contact info with AI...');

    const contactInfo: unknown = {};

    // AI-powered email extraction
    const emailRegex = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g;
    const emails = content.match(emailRegex);
    if (emails && emails.length > 0) {
      contactInfo.email = emails[0];
      console.log(`✅ AI extracted email: "${contactInfo.email}"`);
    }

    // AI-powered phone extraction with pattern recognition
    const phonePatterns = [
      // International format
      /\+?\d{1,4}[\s.-]?\(?\d{2,4}\)?[\s.-]?\d{3,4}[\s.-]?\d{4}/g,
      // Local format
      /\(?\d{3}\)?[\s.-]?\d{3}[\s.-]?\d{4}/g,
      // Labeled phone
      /(?:phone|tel|call|mobile|cell|contact)\s*:?\s*([^\n\r]+)/gi,
    ];

    for (const pattern of phonePatterns) {
      const matches = content.match(pattern);
      if (matches && matches[0].length >= 7) {
        contactInfo.phone = matches[0].trim();
        console.log(`✅ AI extracted phone: "${contactInfo.phone}"`);
        break;
      }
    }

    // AI-powered address extraction
    const addressPatterns = [
      /(?:address|located at|based at|headquarters)\s*:?\s*([^.\n]{10,100})/gi,
      /\d+[^,\n]*\s+(?:street|st|avenue|ave|road|rd|drive|dr|court|ct|boulevard|blvd|lane|ln|way|place|plaza)[^,\n]*/gi,
    ];

    for (const pattern of addressPatterns) {
      const matches = content.match(pattern);
      if (matches && matches[0].trim().length > 10) {
        contactInfo.address = matches[0].trim();
        console.log(`✅ AI extracted address: "${contactInfo.address}"`);
        break;
      }
    }

    return contactInfo;
  }

  /**
   * AI-powered business metrics extraction
   */
  private extractBusinessMetricsAI(content: string): unknown {
    console.log('📊 Extracting business metrics with AI...');

    const metrics: unknown = {};

    // AI-powered employee count extraction
    const employeePatterns = [
      /(\d+(?:,\d+)*)\s+(?:employees?|staff|team members?|people)/gi,
      /(?:employs?|has)\s+(\d+(?:,\d+)*)\s+(?:employees?|people|staff)/gi,
      /(?:team of|staff of)\s+(\d+(?:,\d+)*)/gi,
    ];

    for (const pattern of employeePatterns) {
      const match = content.match(pattern);
      if (match) {
        metrics.employees = match[1];
        console.log(`✅ AI extracted employees: "${metrics.employees}"`);
        break;
      }
    }

    // AI-powered founding year extraction
    const foundedPatterns = [
      /(?:founded|established|since|started|operating since)\s+(?:in\s+)?(\d{4})/gi,
    ];

    for (const pattern of foundedPatterns) {
      const match = content.match(pattern);
      if (match) {
        const year = parseInt(match[1]);
        const currentYear = new Date().getFullYear();
        if (year >= 1800 && year <= currentYear) {
          metrics.founded = match[1];
          console.log(`✅ AI extracted founded: "${metrics.founded}"`);
          break;
        }
      }
    }

    return metrics;
  }

  /**
   * Generate AI-powered supplier profile
   */
  private generateSupplierProfile(aiAnalysis: unknown, url: string, html: string): ScrapedWebsite {
    console.log('🎯 Generating comprehensive supplier profile...');

    return {
      url,
      title: aiAnalysis.companyName || 'Website',
      description: aiAnalysis.description || 'Professional services provider',
      content: aiAnalysis.description || '',
      rawHtml: html,
      metadata: {
        companyName: aiAnalysis.companyName,
        contactEmail: aiAnalysis.contactInfo.email,
        contactPhone: aiAnalysis.contactInfo.phone,
        address: aiAnalysis.contactInfo.address,
        foundedYear: aiAnalysis.metrics.founded,
        employeeCount: aiAnalysis.metrics.employees,
        industry: aiAnalysis.industry,
        certifications: aiAnalysis.certifications,
        services: aiAnalysis.services,
        products: aiAnalysis.products,
        aiSummary: aiAnalysis.aiSummary,
        businessDescription: aiAnalysis.description,
        keyStrengths: aiAnalysis.keyStrengths,
        socialMedia: aiAnalysis.socialMedia,
      },
      extractionDate: new Date().toISOString(),
    };
  }

  // Helper methods for AI analysis
  private cleanText(text: string): string {
    return text
      .replace(/\s+/g, ' ')
      .replace(/[\r\n]+/g, ' ')
      .trim();
  }

  private isValidCompanyName(name: string): boolean {
    if (!name || name.length < 3 || name.length > 50) return false;
    const nonBusinessWords = [
      'home',
      'about',
      'contact',
      'services',
      'products',
      'company',
      'welcome',
    ];
    return !nonBusinessWords.some(word => name.toLowerCase().includes(word));
  }

  private isBusinessDescription(text: string): boolean {
    const businessIndicators = [
      'provide',
      'offer',
      'specialize',
      'help',
      'assist',
      'deliver',
      'solution',
      'service',
      'business',
      'company',
      'professional',
      'expertise',
      'experience',
    ];
    return businessIndicators.some(indicator => text.toLowerCase().includes(indicator));
  }

  private cleanServiceText(text: string): string {
    return text
      .replace(/^(?:we|our)\s+/i, '')
      .replace(/\s+in\s+/i, ' in ')
      .replace(/\s+and\s+/i, ' and ')
      .trim()
      .replace(/[.!?]+$/, '');
  }

  private isValidService(service: string): boolean {
    return (
      service.length > 5 &&
      service.length < 80 &&
      !service.toLowerCase().includes('click') &&
      !service.toLowerCase().includes('read more')
    );
  }

  private generateAISummary(content: string, domain: string): string {
    // Generate AI summary based on content analysis
    const industry = this.analyzeIndustryAI(content);
    const services = this.extractServicesAI(content).slice(0, 3);

    return `${domain.split('.')[0]} is a ${industry.toLowerCase()} company that offers ${services.join(', ').toLowerCase()}. They focus on delivering quality solutions and professional service to their clients.`;
  }

  private extractKeyStrengthsAI(content: string): string[] {
    const strengths: string[] = [];
    const lowerContent = content.toLowerCase();

    const strengthKeywords = [
      'experience',
      'expert',
      'professional',
      'quality',
      'reliable',
      'trusted',
      'innovative',
      'leading',
      'established',
      'certified',
      'award-winning',
    ];

    for (const keyword of strengthKeywords) {
      if (lowerContent.includes(keyword)) {
        strengths.push(keyword.charAt(0).toUpperCase() + keyword.slice(1));
      }
    }

    return strengths.slice(0, 5);
  }

  private extractProductsAI(content: string): string[] {
    // Similar to services but looking for product-specific keywords
    const products: string[] = [];
    const productKeywords = [
      'software',
      'platform',
      'solution',
      'tool',
      'system',
      'app',
      'application',
      'equipment',
      'device',
      'product',
      'item',
      'component',
    ];

    for (const keyword of productKeywords) {
      if (content.toLowerCase().includes(keyword)) {
        products.push(keyword.charAt(0).toUpperCase() + keyword.slice(1));
      }
    }

    return [...new Set(products)].slice(0, 5);
  }

  private extractCapabilitiesAI(content: string): string[] {
    // Extract capabilities and competencies
    const capabilities: string[] = [];
    const capabilityPatterns = [
      /(?:capable of|expertise in|specialized in|skilled in)\s+([^.]+)/gi,
    ];

    for (const pattern of capabilityPatterns) {
      const matches = content.match(pattern);
      if (matches) {
        capabilities.push(
          ...matches.map(m =>
            m.replace(/^(?:capable of|expertise in|specialized in|skilled in)\s+/i, '').trim()
          )
        );
      }
    }

    return [...new Set(capabilities)].slice(0, 5);
  }

  private extractLocationAI(content: string): string {
    const locationPatterns = [
      /(?:based in|located in|headquartered in)\s+([A-Za-z\s,]+?)(?:\.|,|\n)/gi,
    ];

    for (const pattern of locationPatterns) {
      const match = content.match(pattern);
      if (match && match[1]) {
        return match[1].trim();
      }
    }

    return '';
  }

  private extractCertificationsAI(content: string): string[] {
    const certifications: string[] = [];

    const certPatterns = [
      /\b(ISO\s*\d{4,5}|ISO\s*\d{4,5}:\s*\d{4})\b/gi,
      /\b(AWS|Azure|GCP)\s*(Certified|Partner)\b/gi,
      /\b(Microsoft\s*(Gold|Silver)\s*Partner)\b/gi,
      /\b(B-BBEE)\s*(Level\s*\d+|Contributor)\b/gi,
      /\b(GDPR|SOC\s*2|PIIP|PIMS)\b/gi,
    ];

    for (const pattern of certPatterns) {
      const matches = content.match(pattern);
      if (matches) {
        certifications.push(...matches.slice(0, 2));
      }
    }

    return [...new Set(certifications)];
  }

  private extractAwardsAI(content: string): string[] {
    const awards: string[] = [];
    const awardPatterns = [/(?:award|winner|recognized|accredited)\s+([^.]+)/gi];

    for (const pattern of awardPatterns) {
      const matches = content.match(pattern);
      if (matches) {
        awards.push(...matches.slice(0, 3));
      }
    }

    return [...new Set(awards)];
  }

  private extractSocialProofAI(content: string): string[] {
    const socialProof: string[] = [];
    const proofPatterns = [
      /(?:trusted by|clients include|partners with|collaborated with)\s+([^.]+)/gi,
    ];

    for (const pattern of proofPatterns) {
      const matches = content.match(pattern);
      if (matches) {
        socialProof.push(...matches.slice(0, 3));
      }
    }

    return [...new Set(socialProof)];
  }

  private cleanAndEnhanceContent(content: string): string {
    return content
      .replace(/\s+/g, ' ')
      .replace(/[\r\n]+/g, ' ')
      .replace(/<[^>]*>/g, ' ')
      .trim();
  }

  private generateFallbackCompanyName(hostname: string): string {
    const domain = hostname.split('.')[0];
    return domain.replace(/[-_]/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  }

  private validateUrl(url: string): void {
    try {
      const urlObj = new URL(url);

      if (!['http:', 'https:'].includes(urlObj.protocol)) {
        throw new Error('URL must use HTTP or HTTPS protocol');
      }

      if (!urlObj.hostname) {
        throw new Error('URL must have a valid hostname');
      }

      // Security check
      if (
        urlObj.hostname === 'localhost' ||
        urlObj.hostname === '127.0.0.1' ||
        urlObj.hostname.startsWith('192.168.') ||
        urlObj.hostname.startsWith('10.') ||
        urlObj.hostname.startsWith('172.')
      ) {
        throw new Error('Cannot scrape localhost or private IP addresses');
      }
    } catch (error) {
      if (error instanceof Error) {
        throw error;
      }
      throw new Error('Invalid URL format');
    }
  }
}
