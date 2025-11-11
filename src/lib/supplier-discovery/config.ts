// @ts-nocheck

/**
 * Configuration for AI Supplier Discovery System
 */

import type { DataSource } from './types';

export const DISCOVERY_CONFIG = {
  // Response time requirements
  TIMEOUT_MS: 30000,
  MAX_RETRY_ATTEMPTS: 3,

  // Cache settings
  CACHE_TTL_HOURS: 24,
  CACHE_MAX_ENTRIES: 1000,

  // Confidence thresholds
  MIN_CONFIDENCE_THRESHOLD: 0.6,
  HIGH_CONFIDENCE_THRESHOLD: 0.85,

  // Rate limiting
  MAX_REQUESTS_PER_MINUTE: 60,
  MAX_CONCURRENT_REQUESTS: 5,

  // Data validation
  REQUIRED_FIELDS: ['supplierName', 'contactInfo'],
  OPTIONAL_FIELDS: ['address', 'businessInfo', 'compliance'],
};

export const DATA_SOURCES: DataSource[] = [
  {
    name: 'SA Companies Registry',
    url: 'https://eservices.cipc.co.za',
    priority: 1,
    enabled: true,
    selectors: {
      registrationNumber: '.registration-number',
      legalName: '.company-name',
      address: '.registered-address',
      status: '.company-status'
    }
  },
  {
    name: 'LinkedIn Company Search',
    url: 'https://www.linkedin.com/company',
    priority: 2,
    enabled: true,
    selectors: {
      companyName: 'h1[data-test-id="org-name"]',
      industry: '.org-top-card-summary-info-list__item',
      employees: '.org-about-company-module__company-size-definition',
      website: '.org-about-company-module__company-details a'
    }
  },
  {
    name: 'Google Business',
    url: 'https://www.google.com/maps/search',
    priority: 3,
    enabled: true,
    selectors: {
      address: '[data-value="Address"]',
      phone: '[data-value="Phone"]',
      website: '[data-value="Website"]',
      hours: '[data-value="Hours"]'
    }
  },
  {
    name: 'Yellow Pages SA',
    url: 'https://www.yellowpages.co.za',
    priority: 4,
    enabled: true,
    selectors: {
      name: '.listing-name',
      address: '.listing-address',
      phone: '.listing-phone',
      website: '.listing-website'
    }
  },
  {
    name: 'BEE Directory',
    url: 'https://www.bee-directory.co.za',
    priority: 5,
    enabled: true,
    selectors: {
      beeLevel: '.bee-level',
      beeRating: '.bee-rating',
      certificationDate: '.cert-date'
    }
  }
];

export const FIELD_MAPPINGS = {
  // Common field aliases and variations
  companyName: ['name', 'company_name', 'business_name', 'legal_name'],
  registrationNumber: ['reg_number', 'company_reg', 'registration_no', 'company_number'],
  vatNumber: ['vat_no', 'tax_number', 'vat_registration'],
  phone: ['telephone', 'contact_number', 'phone_number'],
  email: ['email_address', 'contact_email', 'business_email'],
  website: ['web_site', 'homepage', 'url'],
  address: ['postal_address', 'physical_address', 'business_address'],
  industry: ['sector', 'business_type', 'category'],
  employees: ['staff_count', 'employee_count', 'workforce_size']
};

export const EXTRACTION_PATTERNS = {
  // Regex patterns for data extraction
  email: /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g,
  phone: /(\+27|0)[0-9\s\-()]{8,15}/g,
  vatNumber: /4[0-9]{9}/g,
  registrationNumber: /[0-9]{4}\/[0-9]{6}\/[0-9]{2}/g,
  website: /(https?:\/\/)?([\da-z.-]+)\.([a-z.]{2,6})([/\w .-]*)*\/?/g,
  postalCode: /[0-9]{4}/g
};

export const CONFIDENCE_WEIGHTS = {
  // Weights for calculating confidence scores
  officialSource: 0.4,      // Government registries, official databases
  businessDirectory: 0.3,   // Yellow Pages, business directories
  socialMedia: 0.2,         // LinkedIn, Facebook business pages
  websiteContent: 0.1       // Company websites, general web content
};

export const USER_AGENTS = [
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
  'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
];

export const RETRY_CONFIG = {
  retries: 3,
  retryDelay: 1000, // ms
  retryCondition: (error: unknown) => {
    return error.code === 'ECONNRESET' ||
           error.code === 'ETIMEDOUT' ||
           (error.response && error.response.status >= 500);
  }
};
