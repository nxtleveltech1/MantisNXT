/**
 * Main entry point for AI Supplier Discovery System
 * Exports all public APIs and utilities
 */

// Core Engine
export { supplierDiscoveryEngine } from './engine';

// Cache Management
export { supplierCache } from './cache';

// Data Processing
export { dataProcessor } from './processor';
export { dataExtractor } from './extractors';

// Types
export type {
  SupplierDiscoveryRequest,
  SupplierDiscoveryResponse,
  DiscoveredSupplierData,
  SupplierAddress,
  SupplierContactInfo,
  SupplierBusinessInfo,
  SupplierCompliance,
  ConfidenceScores,
  ExtractionResult,
  DataSource,
  CacheEntry
} from './types';

// Configuration
export { DISCOVERY_CONFIG, DATA_SOURCES, FIELD_MAPPINGS } from './config';

// Utility functions
export { validateSupplierData, formatSupplierData, mergeSupplierData } from './utils';