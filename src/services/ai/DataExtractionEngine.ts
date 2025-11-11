// Data Extraction Engine for parsing and structuring supplier information
import { SearchResult } from './WebSearchService';
import { ScrapedWebsite } from './WebScrapingService';
import type { ExtractedSupplierData } from './ExtractedSupplierData';

export class DataExtractionEngine {
  private industryKeywords: Record<string, string[]> = {
    Technology: [
      'software',
      'technology',
      'it',
      'computing',
      'digital',
      'cloud',
      'saas',
      'app',
      'platform',
    ],
    'Music & Entertainment': [
      'music',
      'entertainment',
      'audio',
      'record',
      'label',
      'artist',
      'sound',
      'distribution',
    ],
    Manufacturing: [
      'manufacturing',
      'production',
      'factory',
      'industrial',
      'components',
      'parts',
      'assembly',
    ],
    Healthcare: [
      'healthcare',
      'medical',
      'hospital',
      'pharmaceutical',
      'health',
      'medicine',
      'clinic',
    ],
    Finance: [
      'finance',
      'banking',
      'financial',
      'investment',
      'insurance',
      'accounting',
      'consulting',
    ],
    Education: ['education', 'school', 'university', 'training', 'learning', 'academy'],
    'Real Estate': [
      'real estate',
      'property',
      'construction',
      'building',
      'development',
      'housing',
    ],
    Retail: ['retail', 'shop', 'store', 'commerce', 'sales', 'consumer'],
    Transportation: ['transportation', 'logistics', 'shipping', 'freight', 'delivery', 'courier'],
    Energy: ['energy', 'renewable', 'solar', 'wind', 'power', 'utility', 'oil', 'gas'],
  };

  /**
   * Extract supplier data from search results or scraped content
   */
  async extractSupplierData(
    source: SearchResult | ScrapedWebsite
  ): Promise<ExtractedSupplierData | null> {
    try {
      console.log('🔄 Extracting supplier data from source...');

      let extractedData: ExtractedSupplierData = {};

      if ('url' in source && 'title' in source && 'content' in source) {
        // Source is from web scraping
        extractedData = await this.extractFromScrapedWebsite(source);
      } else {
        // Source is from web search results
        extractedData = await this.extractFromSearchResult(source);
      }

      // Post-process and validate extracted data
      const processedData = this.postProcessData(extractedData);

      console.log('✅ Data extraction completed');
      return processedData;
    } catch (error) {
      console.error('❌ Data extraction failed:', error);
      return null;
    }
  }

  /**
   * Extract comprehensive data from scraped website content
   */
  private async extractFromScrapedWebsite(website: ScrapedWebsite): Promise<ExtractedSupplierData> {
    const data: ExtractedSupplierData = {};

    // Use enhanced metadata if available
    if (website.metadata) {
      data.companyName = website.metadata.companyName;
      data.contactEmail = website.metadata.contactEmail;
      data.contactPhone = website.metadata.contactPhone;
      data.location = website.metadata.address;
      data.website = website.url;
      data.employees = website.metadata.employeeCount;
      data.founded = website.metadata.foundedYear;
      data.revenue = website.metadata.revenue;
      data.industry = website.metadata.industry;

      if (website.metadata.socialMedia) {
        data.socialMedia = website.metadata.socialMedia;
      }

      if (website.metadata.certifications) {
        data.certifications = website.metadata.certifications;
      }

      if (website.metadata.services) {
        data.services = website.metadata.services;
      }

      if (website.metadata.products) {
        data.products = website.metadata.products;
      }
    }

    // Extract additional data from content
    const content = website.content + ' ' + website.description;

    // Extract company name from title if not in metadata
    if (!data.companyName) {
      data.companyName = this.extractCompanyName(website.title, content);
    }

    // Extract industry if not from metadata
    if (!data.industry) {
      data.industry = this.extractIndustry(content);
    }

    // Extract services and products if not from metadata
    if (!data.services || data.services.length === 0) {
      data.services = this.extractServices(content);
    }
    if (!data.products || data.products.length === 0) {
      data.products = this.extractProducts(content);
    }

    // Extract employee count if not from metadata
    if (!data.employees) {
      data.employees = this.extractEmployees(content);
    }

    // Extract founding year if not from metadata
    if (!data.founded) {
      data.founded = this.extractFoundedYear(content);
    }

    // Extract revenue if not from metadata
    if (!data.revenue) {
      data.revenue = this.extractRevenue(content);
    }

    // Extract location if not from metadata
    if (!data.location) {
      data.location = this.extractLocation(content);
    }

    // Extract contact info if not from metadata
    if (!data.contactEmail) {
      data.contactEmail = this.extractEmail(content);
    }
    if (!data.contactPhone) {
      data.contactPhone = this.extractPhone(content);
    }

    // Extract addresses
    data.addresses = this.extractAddresses(content);

    // Extract business type
    data.businessType = this.extractBusinessType(content);

    // Extract certifications if not from metadata
    if (!data.certifications || data.certifications.length === 0) {
      data.certifications = this.extractCertifications(content);
    }

    // Generate tags
    data.tags = this.generateTags(content, data.industry, data.services, data.products);

    return data;
  }

  /**
   * Extract data from search result
   */
  private async extractFromSearchResult(result: SearchResult): Promise<ExtractedSupplierData> {
    console.log(`🔍 DataExtractionEngine: Extracting from search result "${result.title}"`);
    console.log('📋 Source data:', {
      title: result.title,
      description: result.description.substring(0, 200) + '...',
      url: result.url,
      source: result.source,
    });

    const data: ExtractedSupplierData = {};

    try {
      // Extract company name from title
      data.companyName = this.extractCompanyName(result.title, result.description);
      console.log(`🏢 Extracted company name: "${data.companyName}"`);

      // Extract industry
      data.industry = this.extractIndustry(result.description);
      console.log(`🏭 Extracted industry: "${data.industry}"`);

      // Extract services and products from description
      data.services = this.extractServices(result.description);
      data.products = this.extractProducts(result.description);
      console.log(`⚙️ Extracted services:`, data.services);
      console.log(`📦 Extracted products:`, data.products);

      // Extract location
      data.location = this.extractLocation(result.description);
      console.log(`📍 Extracted location: "${data.location}"`);

      // Extract contact info
      data.contactEmail = this.extractEmail(result.description);
      data.contactPhone = this.extractPhone(result.description);
      console.log(`📧 Extracted email: "${data.contactEmail}"`);
      console.log(`📞 Extracted phone: "${data.contactPhone}"`);

      // Set website URL
      data.website = result.url;
      console.log(`🌐 Set website: "${data.website}"`);

      // Extract social media links
      data.socialMedia = this.extractSocialMedia(result.description);
      console.log(`📱 Extracted social media:`, data.socialMedia);

      // Generate tags
      data.tags = this.generateTags(
        result.description,
        data.industry,
        data.services,
        data.products
      );
      console.log(`🏷️ Generated tags:`, data.tags);

      console.log('✅ Data extraction completed successfully');
      return data;
    } catch (error) {
      console.error('❌ Error during data extraction:', error);
      return data; // Return whatever data was extracted so far
    }
  }

  /**
   * Extract company name from text using advanced patterns
   */
  private extractCompanyName(title: string, content: string): string {
    // Look for common company name patterns
    const patterns = [
      /^(.+?)(?:\s*[-–—]\s*.+?)?\s*-\s*[A-Za-z]/, // "Company Name - Description"
      /^(.+?)(?:\s*\(.*?\))?\s*[-–—]/, // "Company Name (LLC) - Description"
      /^([A-Za-z][A-Za-z\s&.,]+?)(?:\s*[-–—]|$)/, // "Company Name..."
      /^(.+?)\s*[-–—]\s*[A-Za-z]/, // "Company Name - Service"
      /(?:company|corp|inc|ltd|pty)\s*[-–—]?\s*(.+)/i, // "Company - Corp Name"
    ];

    for (const pattern of patterns) {
      const match = title.match(pattern);
      if (match && match[1] && match[1].trim().length >= 3) {
        const name = match[1].trim();
        if (this.isValidCompanyName(name)) {
          return name;
        }
      }
    }

    // Enhanced fallback: extract meaningful business names
    const words = title.split(/[\s-–—]/).filter(w => w.length >= 2);
    if (words.length > 0) {
      // Look for capitalized words that might be company names
      const capitalizedWords = words.filter(
        word => /^[A-Z][a-z]/.test(word) || /^[A-Z]{2,}$/.test(word)
      );

      if (capitalizedWords.length > 0) {
        return capitalizedWords.slice(0, 4).join(' ');
      }

      return words.slice(0, 4).join(' ');
    }

    return '';
  }

  /**
   * Validate if extracted text is likely a company name
   */
  private isValidCompanyName(name: string): boolean {
    if (name.length < 3 || name.length > 100) return false;

    // Check for common non-business words
    const nonBusinessWords = ['home', 'about', 'contact', 'services', 'products', 'company'];
    if (nonBusinessWords.some(word => name.toLowerCase().includes(word))) {
      return false;
    }

    return true;
  }

  /**
   * Extract industry from content
   */
  private extractIndustry(content: string): string {
    const lowerContent = content.toLowerCase();

    for (const [industry, keywords] of Object.entries(this.industryKeywords)) {
      for (const keyword of keywords) {
        if (lowerContent.includes(keyword)) {
          return industry;
        }
      }
    }

    return 'Services'; // Default fallback
  }

  /**
   * Extract services from content
   */
  private extractServices(content: string): string[] {
    const services: string[] = [];
    const lowerContent = content.toLowerCase();

    const servicePatterns = [
      /(?:services?|solutions?|consulting|support|maintenance|development)/gi,
      /(?:we offer|we provide|our services|specializing in)/gi,
    ];

    for (const pattern of servicePatterns) {
      const matches = content.match(pattern);
      if (matches) {
        services.push(...matches.slice(0, 3)); // Limit to 3 services
      }
    }

    return [...new Set(services)].slice(0, 5);
  }

  /**
   * Extract products from content
   */
  private extractProducts(content: string): string[] {
    const products: string[] = [];

    // Look for product-related keywords
    const productKeywords = [
      'software',
      'app',
      'platform',
      'system',
      'solution',
      'tool',
      'product',
      'equipment',
      'component',
      'device',
      'instrument',
      'machine',
      'technology',
    ];

    const lowerContent = content.toLowerCase();

    for (const keyword of productKeywords) {
      if (lowerContent.includes(keyword)) {
        // Extract context around the keyword
        const regex = new RegExp(`([^.]*${keyword}[^.]*)`, 'gi');
        const matches = content.match(regex);
        if (matches) {
          products.push(...matches.map(m => m.trim()).slice(0, 2));
        }
      }
    }

    return [...new Set(products)].slice(0, 5);
  }

  /**
   * Extract employee count
   */
  private extractEmployees(content: string): string {
    const patterns = [
      /(\d+(?:,\d+)*)\s+(?:employees?|staff|team members?)/gi,
      /(?:employs?|has)\s+(\d+(?:,\d+)*)\s+(?:employees?|people|staff)/gi,
      /(?:team of|staff of)\s+(\d+(?:,\d+)*)/gi,
    ];

    for (const pattern of patterns) {
      const match = content.match(pattern);
      if (match) {
        return match[1];
      }
    }

    return '';
  }

  /**
   * Extract founding year
   */
  private extractFoundedYear(content: string): string {
    const patterns = [
      /founded\s+(?:in\s+)?(\d{4})/gi,
      /established\s+(?:in\s+)?(\d{4})/gi,
      /since\s+(\d{4})/gi,
      /operating\s+since\s+(\d{4})/gi,
    ];

    for (const pattern of patterns) {
      const match = content.match(pattern);
      if (match) {
        const year = parseInt(match[1]);
        const currentYear = new Date().getFullYear();
        if (year >= 1800 && year <= currentYear) {
          return match[1];
        }
      }
    }

    return '';
  }

  /**
   * Extract location/address
   */
  private extractLocation(content: string): string {
    // Look for address patterns
    const addressPatterns = [
      /(?:based in|located in|headquartered in)\s+([A-Za-z\s,]+?)(?:\.|,|\n)/gi,
      /(?:address|addr):\s*([^.\n]+)/gi,
      /(?:street|st|avenue|ave|road|rd|drive|dr|court|ct|boulevard|blvd)[^.\n]*([^.\n]*)/gi,
    ];

    for (const pattern of addressPatterns) {
      const match = content.match(pattern);
      if (match && match[1].trim().length >= 3) {
        return match[1].trim();
      }
    }

    return '';
  }

  /**
   * Extract email address
   */
  private extractEmail(content: string): string {
    const emailPattern = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g;
    const matches = content.match(emailPattern);
    return matches ? matches[0] : '';
  }

  /**
   * Extract phone number
   */
  private extractPhone(content: string): string {
    const phonePatterns = [
      /(\+?\d{1,4}[\s.-]?)?(\(?\d{2,4}\)?[\s.-]?)?\d{3,4}[\s.-]?\d{4}/g,
      /(?:phone|tel|call):\s*([^\n\r]+)/gi,
    ];

    for (const pattern of phonePatterns) {
      const matches = content.match(pattern);
      if (matches && matches[0].length >= 7) {
        return matches[0].trim();
      }
    }

    return '';
  }

  /**
   * Extract social media links
   */
  private extractSocialMedia(content: string): {
    linkedin?: string;
    twitter?: string;
    facebook?: string;
  } {
    const social: { linkedin?: string; twitter?: string; facebook?: string } = {};

    const linkedinMatch = content.match(/linkedin\.com\/[^\s)]+/gi);
    if (linkedinMatch) social.linkedin = 'https://' + linkedinMatch[0];

    const twitterMatch = content.match(/twitter\.com\/[^\s)]+/gi);
    if (twitterMatch) social.twitter = 'https://' + twitterMatch[0];

    const facebookMatch = content.match(/facebook\.com\/[^\s)]+/gi);
    if (facebookMatch) social.facebook = 'https://' + facebookMatch[0];

    return social;
  }

  /**
   * Extract addresses
   */
  private extractAddresses(
    content: string
  ): { type: string; street: string; city: string; country: string; postalCode?: string }[] {
    const addresses: {
      type: string;
      street: string;
      city: string;
      country: string;
      postalCode?: string;
    }[] = [];

    // Look for structured address patterns
    const addressPattern =
      /(\d+[^,\n]*\s+(?:street|st|avenue|ave|road|rd|drive|dr|court|ct|boulevard|blvd)[^,\n]*),?\s*([^,\n]+),?\s*([^,\n]+)(?:,\s*(\d{4,6}))?/gi;

    let match;
    while ((match = addressPattern.exec(content)) !== null) {
      addresses.push({
        type: 'headquarters',
        street: match[1].trim(),
        city: match[2].trim(),
        country: match[3].trim(),
        postalCode: match[4]?.trim(),
      });

      if (addresses.length >= 3) break; // Limit to 3 addresses
    }

    return addresses;
  }

  /**
   * Extract revenue information
   */
  private extractRevenue(content: string): string {
    const patterns = [
      /(?:revenue|sales|turnover)\s*[-:]?\s*\$?([\d,.]+(?:\s*[mkb]|million|billion|thousand)?)/gi,
      /\$([\d,.]+(?:\s*[mkb]|million|billion|thousand)?)\s+(?:revenue|sales)/gi,
    ];

    for (const pattern of patterns) {
      const match = content.match(pattern);
      if (match) {
        return match[1];
      }
    }

    return '';
  }

  /**
   * Extract business type
   */
  private extractBusinessType(content: string): string {
    const lowerContent = content.toLowerCase();

    const businessTypes = [
      'private limited',
      'pty ltd',
      'limited',
      'inc',
      'corp',
      'corporation',
      'llc',
      'partnership',
      'sole proprietorship',
      'non-profit',
      'npo',
    ];

    for (const type of businessTypes) {
      if (lowerContent.includes(type)) {
        return type.toUpperCase();
      }
    }

    return '';
  }

  /**
   * Extract certifications from content
   */
  private extractCertifications(content: string): string[] {
    const certifications: string[] = [];

    const certificationPatterns = [
      /\b(ISO\s*\d{4,5}|ISO\s*\d{4,5}:\s*\d{4})\b/gi, // ISO 9001, ISO 9001:2015
      /\b(SOC\s*\d|SOC\s*\d\s*Type\s*\w)\b/gi, // SOC 2, SOC 2 Type II
      /\b(GDPR|SOC\s*2|PIIP|PIMS)\b/gi, // GDPR, SOC 2, etc.
      /\b(AWS|Azure|GCP)\s*(Certified|Partner|Partner\s*Gold)\b/gi, // Cloud certifications
      /\b(Microsoft\s*(Gold|Silver)\s*Partner)\b/gi,
      /\b(CCNA|CCNP|MCSE|MCSA|AWS|CompTIA|CISSP)\b/gi, // Technical certs
      /\b(B-BBEE)\s*(Level\s*\d+|Contributor)\b/gi, // South African B-BBEE
      /\b(CE\s*Mark|FDA\s*Approved|UL\s*Listed)\b/gi, // Safety standards
    ];

    for (const pattern of certificationPatterns) {
      const matches = content.match(pattern);
      if (matches) {
        certifications.push(...matches.map(m => m.trim()).slice(0, 3));
      }
    }

    return [...new Set(certifications)].slice(0, 10);
  }

  /**
   * Generate comprehensive tags from content
   */
  private generateTags(
    content: string,
    industry?: string,
    services?: string[],
    products?: string[]
  ): string[] {
    const tags: string[] = [];

    // Add industry as tag
    if (industry) {
      tags.push(industry.toLowerCase());
    }

    // Add service keywords as tags
    if (services) {
      services.forEach(service => {
        const keyword = service
          .toLowerCase()
          .replace(/[^a-z0-9\s]/g, '')
          .trim();
        if (keyword.length >= 3) {
          tags.push(keyword);
        }
      });
    }

    // Add product keywords as tags
    if (products) {
      products.forEach(product => {
        const keyword = product
          .toLowerCase()
          .replace(/[^a-z0-9\s]/g, '')
          .trim();
        if (keyword.length >= 3) {
          tags.push(keyword);
        }
      });
    }

    // Extract additional relevant keywords with enhanced patterns
    const keywordPatterns = [
      /\b(digital|online|cloud|mobile|web|api|saas|platform|enterprise|professional|custom|solutions?)\b/gi,
      /\b(technology|software|development|consulting|support|management)\b/gi,
      /\b(global|international|nationwide|local|regional)\b/gi,
      /\b(24\/7|reliable|trusted|certified|experienced|established)\b/gi,
      /\b(innovation|innovative|quality|premium|advanced)\b/gi,
      /\b(contact|services|solutions|support|assistance)\b/gi,
      /\b(south africa|cape town|johannesburg|global|europe|usa)\b/gi,
    ];

    for (const pattern of keywordPatterns) {
      const matches = content.match(pattern);
      if (matches) {
        tags.push(...matches.map(m => m.toLowerCase()).slice(0, 3));
      }
    }

    // Remove duplicates and limit to 15 tags
    return [...new Set(tags)].slice(0, 15);
  }

  /**
   * Post-process and validate extracted data
   */
  private postProcessData(data: ExtractedSupplierData): ExtractedSupplierData {
    // Clean up empty strings
    Object.keys(data).forEach(key => {
      const value = data[key as keyof ExtractedSupplierData];
      if (typeof value === 'string' && value.trim() === '') {
        delete data[key as keyof ExtractedSupplierData];
      }
    });

    // Validate email format
    if (data.contactEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.contactEmail)) {
      delete data.contactEmail;
    }

    // Validate company name
    if (data.companyName && data.companyName.length < 2) {
      delete data.companyName;
    }

    return data;
  }
}
