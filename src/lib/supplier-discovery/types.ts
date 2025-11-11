/**
 * Types for AI Supplier Discovery System
 */

export interface SupplierDiscoveryRequest {
  supplierName: string;
  additionalContext?: {
    industry?: string;
    region?: string;
    website?: string;
  };
}

export interface SupplierAddress {
  street: string;
  city: string;
  province: string;
  postalCode: string;
  country: string;
}

export interface SupplierContactInfo {
  phone: string;
  email: string;
  website: string;
}

export interface SupplierBusinessInfo {
  industry: string;
  establishedDate: string;
  employeeCount: number;
  annualRevenue: number;
}

export interface SupplierCompliance {
  vatNumber: string;
  beeRating: string;
  certifications: string[];
}

export interface ConfidenceScores {
  overall: number;
  individual: Record<string, number>;
}

export interface DiscoveredSupplierData {
  supplierName: string;
  registrationNumber: string;
  address: SupplierAddress;
  contactInfo: SupplierContactInfo;
  businessInfo: SupplierBusinessInfo;
  compliance: SupplierCompliance;
  confidence: ConfidenceScores;
  sources: string[];
  discoveredAt: Date;
}

export interface DataSource {
  name: string;
  url: string;
  priority: number;
  enabled: boolean;
  selectors: Record<string, string>;
}

export interface ExtractionResult {
  field: string;
  value: unknown;
  confidence: number;
  source: string;
  timestamp: Date;
}

export interface SupplierDiscoveryResponse {
  success: boolean;
  data?: DiscoveredSupplierData;
  error?: string;
  processingTime: number;
  sourcesUsed: string[];
}

export interface CacheEntry {
  data: DiscoveredSupplierData;
  timestamp: Date;
  ttl: number;
}