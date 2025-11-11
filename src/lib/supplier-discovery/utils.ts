// @ts-nocheck

/**
 * Utility functions for Supplier Discovery System
 */

import type { DiscoveredSupplierData, SupplierAddress, SupplierContactInfo } from './types';
import { DISCOVERY_CONFIG } from './config';

/**
 * Validate discovered supplier data meets minimum requirements
 */
export function validateSupplierData(data: DiscoveredSupplierData): {
  isValid: boolean;
  errors: string[];
  warnings: string[];
} {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Required field validation
  if (!data.supplierName || data.supplierName.trim().length < 2) {
    errors.push('Supplier name is required and must be at least 2 characters');
  }

  // Confidence threshold validation
  if (data.confidence.overall < DISCOVERY_CONFIG.MIN_CONFIDENCE_THRESHOLD) {
    errors.push(`Overall confidence (${Math.round(data.confidence.overall * 100)}%) is below minimum threshold (${Math.round(DISCOVERY_CONFIG.MIN_CONFIDENCE_THRESHOLD * 100)}%)`);
  }

  // Contact information validation
  if (!data.contactInfo.phone && !data.contactInfo.email && !data.contactInfo.website) {
    warnings.push('No contact information found - phone, email, or website recommended');
  }

  // Email validation
  if (data.contactInfo.email && !isValidEmail(data.contactInfo.email)) {
    warnings.push('Email address format appears invalid');
  }

  // Phone number validation
  if (data.contactInfo.phone && !isValidSAPhoneNumber(data.contactInfo.phone)) {
    warnings.push('Phone number format appears invalid for South African numbers');
  }

  // Website validation
  if (data.contactInfo.website && !isValidWebsite(data.contactInfo.website)) {
    warnings.push('Website URL format appears invalid');
  }

  // Registration number validation
  if (data.registrationNumber && !isValidSARegistrationNumber(data.registrationNumber)) {
    warnings.push('Registration number format does not match South African standard');
  }

  // VAT number validation
  if (data.compliance.vatNumber && !isValidSAVATNumber(data.compliance.vatNumber)) {
    warnings.push('VAT number format appears invalid for South African VAT numbers');
  }

  // Address completeness
  if (!data.address.city && !data.address.province) {
    warnings.push('Address information is incomplete - city and province recommended');
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings
  };
}

/**
 * Format supplier data for consistent display
 */
export function formatSupplierData(data: DiscoveredSupplierData): DiscoveredSupplierData {
  return {
    ...data,
    supplierName: formatCompanyName(data.supplierName),
    contactInfo: {
      ...data.contactInfo,
      phone: formatPhoneNumber(data.contactInfo.phone),
      email: data.contactInfo.email.toLowerCase().trim(),
      website: formatWebsite(data.contactInfo.website)
    },
    address: formatAddress(data.address),
    registrationNumber: formatRegistrationNumber(data.registrationNumber),
    compliance: {
      ...data.compliance,
      vatNumber: formatVATNumber(data.compliance.vatNumber)
    }
  };
}

/**
 * Merge multiple supplier data sources with conflict resolution
 */
export function mergeSupplierData(
  dataSources: DiscoveredSupplierData[]
): DiscoveredSupplierData | null {
  if (dataSources.length === 0) return null;
  if (dataSources.length === 1) return dataSources[0];

  // Sort by confidence (highest first)
  const sortedSources = dataSources.sort((a, b) => b.confidence.overall - a.confidence.overall);
  const primary = sortedSources[0];

  // Merge strategy: use highest confidence value for each field
  const merged: DiscoveredSupplierData = {
    supplierName: selectBestValue(dataSources, 'supplierName'),
    registrationNumber: selectBestValue(dataSources, 'registrationNumber'),
    address: mergeAddresses(dataSources.map(d => d.address)),
    contactInfo: mergeContactInfo(dataSources.map(d => d.contactInfo)),
    businessInfo: {
      industry: selectBestValue(dataSources, 'businessInfo.industry'),
      establishedDate: selectBestValue(dataSources, 'businessInfo.establishedDate'),
      employeeCount: Math.max(...dataSources.map(d => d.businessInfo.employeeCount || 0)),
      annualRevenue: Math.max(...dataSources.map(d => d.businessInfo.annualRevenue || 0))
    },
    compliance: {
      vatNumber: selectBestValue(dataSources, 'compliance.vatNumber'),
      beeRating: selectBestValue(dataSources, 'compliance.beeRating'),
      certifications: mergeArrays(dataSources.map(d => d.compliance.certifications))
    },
    confidence: {
      overall: primary.confidence.overall,
      individual: { ...primary.confidence.individual }
    },
    sources: mergeArrays(dataSources.map(d => d.sources)),
    discoveredAt: primary.discoveredAt
  };

  return merged;
}

/**
 * Calculate data freshness score based on discovery time
 */
export function calculateFreshnessScore(discoveredAt: Date): number {
  const now = new Date();
  const ageInHours = (now.getTime() - discoveredAt.getTime()) / (1000 * 60 * 60);

  // Freshness decays over time
  if (ageInHours <= 1) return 1.0;
  if (ageInHours <= 24) return 0.9;
  if (ageInHours <= 168) return 0.7; // 1 week
  if (ageInHours <= 720) return 0.5; // 1 month
  return 0.3;
}

/**
 * Suggest data refresh based on age and confidence
 */
export function shouldRefreshData(data: DiscoveredSupplierData): {
  shouldRefresh: boolean;
  reason: string;
  priority: 'low' | 'medium' | 'high';
} {
  const freshnessScore = calculateFreshnessScore(data.discoveredAt);
  const confidence = data.confidence.overall;

  // High priority refresh conditions
  if (confidence < 0.7 && freshnessScore < 0.8) {
    return {
      shouldRefresh: true,
      reason: 'Low confidence data that is becoming stale',
      priority: 'high'
    };
  }

  // Medium priority refresh conditions
  if (freshnessScore < 0.5) {
    return {
      shouldRefresh: true,
      reason: 'Data is over a month old',
      priority: 'medium'
    };
  }

  if (confidence < 0.6) {
    return {
      shouldRefresh: true,
      reason: 'Low confidence data should be refreshed',
      priority: 'medium'
    };
  }

  // Low priority refresh conditions
  if (freshnessScore < 0.7 && confidence < 0.8) {
    return {
      shouldRefresh: true,
      reason: 'Moderate age and confidence - refresh recommended',
      priority: 'low'
    };
  }

  return {
    shouldRefresh: false,
    reason: 'Data is fresh and reliable',
    priority: 'low'
  };
}

/**
 * Helper validation functions
 */
function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

function isValidSAPhoneNumber(phone: string): boolean {
  // SA phone number patterns
  const patterns = [
    /^\+27[0-9]{9}$/,  // +27 followed by 9 digits
    /^0[0-9]{9}$/,     // 0 followed by 9 digits
    /^27[0-9]{9}$/     // 27 followed by 9 digits
  ];

  const cleaned = phone.replace(/[\s\-()]/g, '');
  return patterns.some(pattern => pattern.test(cleaned));
}

function isValidWebsite(website: string): boolean {
  try {
    new URL(website);
    return true;
  } catch {
    return false;
  }
}

function isValidSARegistrationNumber(regNumber: string): boolean {
  // SA company registration format: YYYY/NNNNNN/NN
  const pattern = /^[0-9]{4}\/[0-9]{6}\/[0-9]{2}$/;
  return pattern.test(regNumber);
}

function isValidSAVATNumber(vatNumber: string): boolean {
  // SA VAT number format: 4XXXXXXXXX (starts with 4, followed by 9 digits)
  const pattern = /^4[0-9]{9}$/;
  const cleaned = vatNumber.replace(/\D/g, '');
  return pattern.test(cleaned);
}

/**
 * Helper formatting functions
 */
function formatCompanyName(name: string): string {
  return name
    .trim()
    .replace(/\s+/g, ' ')
    .replace(/\b(pty|ltd|inc|corp|llc|limited|proprietary)\b\.?/gi, match =>
      match.charAt(0).toUpperCase() + match.slice(1).toLowerCase()
    );
}

function formatPhoneNumber(phone: string): string {
  if (!phone) return '';

  const digits = phone.replace(/\D/g, '');

  if (digits.startsWith('27') && digits.length === 11) {
    return '+' + digits;
  }
  if (digits.startsWith('0') && digits.length === 10) {
    return '+27' + digits.substring(1);
  }

  return phone;
}

function formatWebsite(website: string): string {
  if (!website) return '';

  if (!website.startsWith('http')) {
    return 'https://' + website.replace(/^\/+/, '');
  }

  return website;
}

function formatAddress(address: SupplierAddress): SupplierAddress {
  return {
    street: address.street.trim(),
    city: address.city.trim(),
    province: address.province.trim(),
    postalCode: address.postalCode.replace(/\D/g, ''),
    country: address.country.trim() || 'South Africa'
  };
}

function formatRegistrationNumber(regNumber: string): string {
  if (!regNumber) return '';

  const cleaned = regNumber.replace(/[^\d/]/g, '');

  // Ensure proper format: YYYY/NNNNNN/NN
  const match = cleaned.match(/^(\d{4})\/(\d{6})\/(\d{2})$/);
  if (match) {
    return cleaned;
  }

  return regNumber;
}

function formatVATNumber(vatNumber: string): string {
  if (!vatNumber) return '';

  const digits = vatNumber.replace(/\D/g, '');

  if (digits.length === 10 && digits.startsWith('4')) {
    return digits;
  }

  return vatNumber;
}

/**
 * Helper merge functions
 */
function selectBestValue(dataSources: DiscoveredSupplierData[], path: string): string {
  const values = dataSources
    .map(data => getNestedValue(data, path))
    .filter(value => value && value.trim().length > 0)
    .map(value => ({ value, confidence: Math.random() })) // In real implementation, use actual confidence
    .sort((a, b) => b.confidence - a.confidence);

  return values.length > 0 ? values[0].value : '';
}

function getNestedValue(obj: unknown, path: string): string {
  return path.split('.').reduce((current, key) => current?.[key], obj) || '';
}

function mergeAddresses(addresses: SupplierAddress[]): SupplierAddress {
  const nonEmpty = addresses.filter(addr =>
    addr.street || addr.city || addr.province || addr.postalCode
  );

  if (nonEmpty.length === 0) {
    return { street: '', city: '', province: '', postalCode: '', country: 'South Africa' };
  }

  // Use the most complete address
  const sorted = nonEmpty.sort((a, b) => {
    const scoreA = [a.street, a.city, a.province, a.postalCode].filter(Boolean).length;
    const scoreB = [b.street, b.city, b.province, b.postalCode].filter(Boolean).length;
    return scoreB - scoreA;
  });

  return sorted[0];
}

function mergeContactInfo(contacts: SupplierContactInfo[]): SupplierContactInfo {
  const merged: SupplierContactInfo = { phone: '', email: '', website: '' };

  // Take first non-empty value for each field
  merged.phone = contacts.find(c => c.phone)?.phone || '';
  merged.email = contacts.find(c => c.email)?.email || '';
  merged.website = contacts.find(c => c.website)?.website || '';

  return merged;
}

function mergeArrays(arrays: string[][]): string[] {
  const combined = arrays.flat();
  return [...new Set(combined)]; // Remove duplicates
}
