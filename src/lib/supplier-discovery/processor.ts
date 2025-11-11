// @ts-nocheck

/**
 * Data Processing and Validation Pipeline
 */

import type {
  ExtractionResult,
  DiscoveredSupplierData,
  SupplierAddress,
  SupplierContactInfo,
  SupplierBusinessInfo,
  SupplierCompliance,
  ConfidenceScores
} from './types';
import { FIELD_MAPPINGS, CONFIDENCE_WEIGHTS, DISCOVERY_CONFIG } from './config';

export class DataProcessor {
  /**
   * Process raw extraction results into structured supplier data
   */
  async processExtractionResults(results: ExtractionResult[]): Promise<DiscoveredSupplierData | null> {
    if (results.length === 0) {
      console.warn('No extraction results to process');
      return null;
    }

    console.log(`Processing ${results.length} extraction results`);

    // Group results by field type
    const groupedResults = this.groupResultsByField(results);

    // Extract and validate core data
    const supplierName = this.extractSupplierName(groupedResults);
    const registrationNumber = this.extractRegistrationNumber(groupedResults);
    const address = this.extractAddress(groupedResults);
    const contactInfo = this.extractContactInfo(groupedResults);
    const businessInfo = this.extractBusinessInfo(groupedResults);
    const compliance = this.extractCompliance(groupedResults);

    // Calculate confidence scores
    const confidence = this.calculateConfidenceScores(groupedResults, results);

    // Validate minimum requirements
    if (!supplierName || confidence.overall < DISCOVERY_CONFIG.MIN_CONFIDENCE_THRESHOLD) {
      console.warn('Supplier data does not meet minimum requirements');
      return null;
    }

    // Compile sources used
    const sources = [...new Set(results.map(r => r.source))];

    const discoveredData: DiscoveredSupplierData = {
      supplierName,
      registrationNumber: registrationNumber || '',
      address,
      contactInfo,
      businessInfo,
      compliance,
      confidence,
      sources,
      discoveredAt: new Date()
    };

    console.log(`Successfully processed supplier data for: ${supplierName}`);
    return discoveredData;
  }

  /**
   * Group extraction results by field type
   */
  private groupResultsByField(results: ExtractionResult[]): Record<string, ExtractionResult[]> {
    const grouped: Record<string, ExtractionResult[]> = {};

    results.forEach(result => {
      const normalizedField = this.normalizeFieldName(result.field);
      if (!grouped[normalizedField]) {
        grouped[normalizedField] = [];
      }
      grouped[normalizedField].push(result);
    });

    return grouped;
  }

  /**
   * Normalize field names using mappings
   */
  private normalizeFieldName(field: string): string {
    const lowerField = field.toLowerCase();

    for (const [standard, aliases] of Object.entries(FIELD_MAPPINGS)) {
      if (aliases.includes(lowerField) || lowerField === standard) {
        return standard;
      }
    }

    return lowerField;
  }

  /**
   * Extract and validate supplier name
   */
  private extractSupplierName(groupedResults: Record<string, ExtractionResult[]>): string | null {
    const nameFields = ['companyName', 'name', 'supplierName'];

    for (const field of nameFields) {
      const results = groupedResults[field];
      if (results && results.length > 0) {
        // Use the result with highest confidence
        const bestResult = results.reduce((best, current) =>
          current.confidence > best.confidence ? current : best
        );

        const cleanName = this.cleanCompanyName(bestResult.value);
        if (cleanName && cleanName.length >= 2) {
          return cleanName;
        }
      }
    }

    return null;
  }

  /**
   * Clean and normalize company name
   */
  private cleanCompanyName(name: string): string {
    return name
      .trim()
      .replace(/\s+/g, ' ')
      .replace(/[^\w\s&().-]/g, '')
      .replace(/\b(pty|ltd|inc|corp|llc|limited|proprietary)\b\.?/gi, match =>
        match.charAt(0).toUpperCase() + match.slice(1).toLowerCase()
      );
  }

  /**
   * Extract registration number
   */
  private extractRegistrationNumber(groupedResults: Record<string, ExtractionResult[]>): string | null {
    const regResults = groupedResults['registrationNumber'];
    if (regResults && regResults.length > 0) {
      const bestResult = regResults.reduce((best, current) =>
        current.confidence > best.confidence ? current : best
      );

      // Validate SA company registration format
      const regNumber = bestResult.value.replace(/\s/g, '');
      if (/^[0-9]{4}\/[0-9]{6}\/[0-9]{2}$/.test(regNumber)) {
        return regNumber;
      }
    }

    return null;
  }

  /**
   * Extract and structure address information
   */
  private extractAddress(groupedResults: Record<string, ExtractionResult[]>): SupplierAddress {
    const addressResults = groupedResults['address'] || [];

    const defaultAddress: SupplierAddress = {
      street: '',
      city: '',
      province: '',
      postalCode: '',
      country: 'South Africa'
    };

    if (addressResults.length === 0) {
      return defaultAddress;
    }

    // Use the highest confidence address
    const bestAddress = addressResults.reduce((best, current) =>
      current.confidence > best.confidence ? current : best
    );

    return this.parseAddress(bestAddress.value) || defaultAddress;
  }

  /**
   * Parse address string into components
   */
  private parseAddress(addressString: string): SupplierAddress | null {
    try {
      const parts = addressString.split(',').map(p => p.trim());

      if (parts.length < 2) {
        return null;
      }

      // Extract postal code
      const postalCodeMatch = addressString.match(/\b\d{4}\b/);
      const postalCode = postalCodeMatch ? postalCodeMatch[0] : '';

      // SA provinces
      const provinces = [
        'Western Cape', 'Eastern Cape', 'Northern Cape', 'Free State',
        'KwaZulu-Natal', 'North West', 'Gauteng', 'Mpumalanga', 'Limpopo'
      ];

      let province = '';
      let city = '';
      let street = '';

      // Find province
      for (const prov of provinces) {
        if (addressString.toLowerCase().includes(prov.toLowerCase())) {
          province = prov;
          break;
        }
      }

      // Major SA cities
      const majorCities = [
        'Cape Town', 'Johannesburg', 'Durban', 'Pretoria', 'Port Elizabeth',
        'Bloemfontein', 'East London', 'Pietermaritzburg', 'Welkom', 'Kimberley',
        'Rustenburg', 'Polokwane', 'Witbank', 'Midrand', 'Sandton', 'Centurion'
      ];

      // Find city
      for (const cityName of majorCities) {
        if (addressString.toLowerCase().includes(cityName.toLowerCase())) {
          city = cityName;
          break;
        }
      }

      // Extract street (first part before city/postal code)
      street = parts[0] || '';
      if (parts.length > 1 && !city) {
        city = parts[parts.length - 2] || '';
      }

      return {
        street,
        city,
        province,
        postalCode,
        country: 'South Africa'
      };
    } catch (error) {
      console.warn('Failed to parse address:', error);
      return null;
    }
  }

  /**
   * Extract contact information
   */
  private extractContactInfo(groupedResults: Record<string, ExtractionResult[]>): SupplierContactInfo {
    const phone = this.getBestValue(groupedResults['phone']) || '';
    const email = this.getBestValue(groupedResults['email']) || '';
    const website = this.getBestValue(groupedResults['website']) || '';

    return {
      phone: this.formatPhoneNumber(phone),
      email: this.validateEmail(email) ? email : '',
      website: this.formatWebsite(website)
    };
  }

  /**
   * Extract business information
   */
  private extractBusinessInfo(groupedResults: Record<string, ExtractionResult[]>): SupplierBusinessInfo {
    const industry = this.getBestValue(groupedResults['industry']) || '';
    const employeesStr = this.getBestValue(groupedResults['employees']) || '0';
    const establishedStr = this.getBestValue(groupedResults['established']) || '';

    return {
      industry,
      establishedDate: this.parseEstablishedDate(establishedStr),
      employeeCount: this.parseEmployeeCount(employeesStr),
      annualRevenue: 0 // Would need additional data sources
    };
  }

  /**
   * Extract compliance information
   */
  private extractCompliance(groupedResults: Record<string, ExtractionResult[]>): SupplierCompliance {
    const vatNumber = this.getBestValue(groupedResults['vatNumber']) || '';
    const beeRating = this.getBestValue(groupedResults['beeLevel']) || '';

    return {
      vatNumber: this.validateVatNumber(vatNumber) ? vatNumber : '',
      beeRating,
      certifications: [] // Would need additional processing
    };
  }

  /**
   * Get best value from grouped results
   */
  private getBestValue(results: ExtractionResult[] | undefined): string | null {
    if (!results || results.length === 0) {
      return null;
    }

    const bestResult = results.reduce((best, current) =>
      current.confidence > best.confidence ? current : best
    );

    return bestResult.value;
  }

  /**
   * Calculate comprehensive confidence scores
   */
  private calculateConfidenceScores(
    groupedResults: Record<string, ExtractionResult[]>,
    allResults: ExtractionResult[]
  ): ConfidenceScores {
    const individual: Record<string, number> = {};

    // Calculate individual field confidence
    for (const [field, results] of Object.entries(groupedResults)) {
      if (results.length > 0) {
        const maxConfidence = Math.max(...results.map(r => r.confidence));
        const sourceBonus = results.length > 1 ? 0.1 : 0; // Bonus for multiple sources
        individual[field] = Math.min(maxConfidence + sourceBonus, 1.0);
      }
    }

    // Calculate overall confidence
    const requiredFields = DISCOVERY_CONFIG.REQUIRED_FIELDS;
    const requiredFieldsPresent = requiredFields.filter(field =>
      individual[field] && individual[field] > 0.5
    ).length;

    const completenessScore = requiredFieldsPresent / requiredFields.length;
    const averageConfidence = Object.values(individual).reduce((sum, conf) => sum + conf, 0) /
                             Math.max(Object.values(individual).length, 1);

    // Weight by source types
    const sourceTypeBonus = this.calculateSourceTypeBonus(allResults);

    const overall = Math.min(
      (completenessScore * 0.4 + averageConfidence * 0.5 + sourceTypeBonus * 0.1),
      1.0
    );

    return { overall, individual };
  }

  /**
   * Calculate bonus based on source types
   */
  private calculateSourceTypeBonus(results: ExtractionResult[]): number {
    const sourceTypes = new Set(
      results.map(r => this.categorizeSource(r.source))
    );

    let bonus = 0;
    if (sourceTypes.has('official')) bonus += CONFIDENCE_WEIGHTS.officialSource;
    if (sourceTypes.has('directory')) bonus += CONFIDENCE_WEIGHTS.businessDirectory;
    if (sourceTypes.has('social')) bonus += CONFIDENCE_WEIGHTS.socialMedia;
    if (sourceTypes.has('website')) bonus += CONFIDENCE_WEIGHTS.websiteContent;

    return Math.min(bonus, 1.0);
  }

  /**
   * Categorize source type
   */
  private categorizeSource(source: string): string {
    const url = source.toLowerCase();

    if (url.includes('cipc.co.za') || url.includes('gov.za')) {
      return 'official';
    }
    if (url.includes('yellowpages') || url.includes('directory') || url.includes('brabys')) {
      return 'directory';
    }
    if (url.includes('linkedin') || url.includes('facebook')) {
      return 'social';
    }
    return 'website';
  }

  /**
   * Utility methods
   */
  private formatPhoneNumber(phone: string): string {
    if (!phone) return '';

    // Remove all non-digits
    const digits = phone.replace(/\D/g, '');

    // SA phone number formatting
    if (digits.startsWith('27')) {
      return '+' + digits;
    }
    if (digits.startsWith('0') && digits.length === 10) {
      return '+27' + digits.substring(1);
    }

    return phone;
  }

  private validateEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  private formatWebsite(website: string): string {
    if (!website) return '';

    if (!website.startsWith('http')) {
      return 'https://' + website.replace(/^\/+/, '');
    }

    return website;
  }

  private parseEstablishedDate(dateStr: string): string {
    if (!dateStr) return '';

    // Extract year from various formats
    const yearMatch = dateStr.match(/\b(19|20)\d{2}\b/);
    return yearMatch ? yearMatch[0] : '';
  }

  private parseEmployeeCount(employeesStr: string): number {
    if (!employeesStr) return 0;

    // Extract number from strings like "50-100 employees" or "About 75 people"
    const numberMatch = employeesStr.match(/\b(\d+)\b/);
    return numberMatch ? parseInt(numberMatch[0], 10) : 0;
  }

  private validateVatNumber(vat: string): boolean {
    if (!vat) return false;

    // SA VAT number format: 4XXXXXXXXX
    const cleanVat = vat.replace(/\D/g, '');
    return /^4\d{9}$/.test(cleanVat);
  }
}

// Export singleton instance
export const dataProcessor = new DataProcessor();