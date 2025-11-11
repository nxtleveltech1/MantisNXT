/**
 * Enhanced alert validation with comprehensive error handling and data repair
 * This module provides additional utilities to handle edge cases in alert validation
 */

import type { ValidatedAlertItem} from './dataValidation';
import { validateAlertItems, transformAlertItem } from './dataValidation';

/**
 * Pre-process alerts data to handle common API inconsistencies
 */
export function preprocessAlertsData(rawData: unknown): unknown[] {
  // Handle various response formats
  if (!rawData) {
    console.warn('📥 Preprocessing: No raw data provided');
    return [];
  }

  // Handle wrapped responses
  let alerts = rawData;
  if (rawData.data) alerts = rawData.data;
  if (rawData.alerts) alerts = rawData.alerts;
  if (rawData.items) alerts = rawData.items;

  // Ensure we have an array
  if (!Array.isArray(alerts)) {
    console.warn('📥 Preprocessing: Data is not an array', { type: typeof alerts, value: alerts });
    return [];
  }

  // Filter out completely invalid entries early
  const filtered = alerts.filter((item, index) => {
    if (item === null || item === undefined) {
      console.debug(`📥 Preprocessing: Filtered null/undefined item at index ${index}`);
      return false;
    }
    if (typeof item !== 'object') {
      console.debug(`📥 Preprocessing: Filtered non-object item at index ${index}: ${typeof item}`);
      return false;
    }
    return true;
  });

  console.log(`📥 Preprocessing: ${alerts.length} → ${filtered.length} alerts after filtering`);
  return filtered;
}

/**
 * Validate alerts with comprehensive error recovery
 */
export function validateAlertsWithRecovery(rawData: unknown): {
  alerts: ValidatedAlertItem[];
  stats: {
    input: number;
    processed: number;
    validated: number;
    recovered: number;
    failed: number;
  };
} {
  const stats = {
    input: 0,
    processed: 0,
    validated: 0,
    recovered: 0,
    failed: 0
  };

  try {
    // Step 1: Preprocess data
    const preprocessed = preprocessAlertsData(rawData);
    stats.input = Array.isArray(rawData) ? rawData.length : 
                  rawData?.data?.length || rawData?.alerts?.length || 0;
    stats.processed = preprocessed.length;

    if (preprocessed.length === 0) {
      console.log('📊 Alert validation: No alerts to process');
      return { alerts: [], stats };
    }

    // Step 2: Transform alerts
    console.log(`🔄 Transforming ${preprocessed.length} alerts`);
    const transformed = preprocessed.map(transformAlertItem);

    // Step 3: Validate with detailed tracking
    console.log(`✅ Validating ${transformed.length} transformed alerts`);
    const validated = validateAlertItems(transformed);
    
    stats.validated = validated.length;
    stats.recovered = stats.validated; // All validated alerts are "recovered" in some sense
    stats.failed = stats.processed - stats.validated;

    console.log(`📊 Alert validation complete:`, {
      input: stats.input,
      processed: stats.processed,
      validated: stats.validated,
      successRate: `${((stats.validated / Math.max(stats.input, 1)) * 100).toFixed(1)}%`
    });

    return { alerts: validated, stats };

  } catch (error) {
    console.error('❌ Critical error in alert validation:', error);
    return { alerts: [], stats };
  }
}

/**
 * Create a mock alert for testing validation
 */
export function createMockAlert(overrides: Partial<unknown> = {}): unknown {
  return {
    id: `mock_alert_${Date.now()}`,
    type: 'quality_issue',
    severity: 'medium',
    title: 'Mock Alert',
    message: 'This is a mock alert for testing',
    isRead: false,
    createdAt: new Date(),
    status: 'active',
    isActive: true,
    priority: 50,
    ...overrides
  };
}

/**
 * Validate alert API response structure with enhanced error recovery
 */
export function validateAlertApiResponse(response: unknown): {
  isValid: boolean;
  issues: string[];
  data: unknown[];
} {
  const issues: string[] = [];
  let data: unknown[] = [];

  console.log('🔍 Validating alert API response:', {
    hasResponse: !!response,
    responseType: typeof response,
    isArray: Array.isArray(response),
    keys: response && typeof response === 'object' ? Object.keys(response) : []
  });

  // Check if response exists
  if (!response) {
    issues.push('No response received');
    return { isValid: false, issues, data };
  }

  // Check response structure
  if (typeof response !== 'object') {
    issues.push(`Response is not an object (received: ${typeof response})`);
    return { isValid: false, issues, data };
  }

  // Extract data from various response formats with better error handling
  if (response.data && Array.isArray(response.data)) {
    data = response.data;
    console.log('📥 Extracted data from response.data:', data.length, 'items');
  } else if (response.alerts && Array.isArray(response.alerts)) {
    data = response.alerts;
    console.log('📥 Extracted data from response.alerts:', data.length, 'items');
  } else if (Array.isArray(response)) {
    data = response;
    console.log('📥 Response is direct array:', data.length, 'items');
  } else if (response.data && typeof response.data === 'object') {
    // Handle wrapped object responses
    if (response.data.alerts && Array.isArray(response.data.alerts)) {
      data = response.data.alerts;
      console.log('📥 Extracted data from response.data.alerts:', data.length, 'items');
    } else if (response.data.data && Array.isArray(response.data.data)) {
      data = response.data.data;
      console.log('📥 Extracted data from response.data.data:', data.length, 'items');
    } else {
      console.warn('⚠️ response.data exists but no recognizable array found:', Object.keys(response.data));
      issues.push('Response.data exists but contains no recognizable alert array');
      return { isValid: false, issues, data: [] };
    }
  } else {
    console.warn('⚠️ No recognizable data structure in response');
    issues.push('Response does not contain recognizable data structure');
    return { isValid: false, issues, data: [] };
  }

  // Validate data is array
  if (!Array.isArray(data)) {
    issues.push(`Data is not an array (received: ${typeof data})`);
    return { isValid: false, issues, data: [] };
  }

  // Check for common API response indicators
  if (response.success === false) {
    issues.push(`API reported failure: ${response.error || 'Unknown error'}`);
    // Don't fail validation if we have data anyway
    if (data.length === 0) {
      return { isValid: false, issues, data: [] };
    }
  }

  console.log('✅ Alert API response validation:', {
    isValid: issues.length === 0,
    issueCount: issues.length,
    dataCount: data.length
  });

  return {
    isValid: issues.length === 0,
    issues,
    data
  };
}

/**
 * Enhanced alert processing with full error recovery
 */
export function processAlertsData(apiResponse: unknown): ValidatedAlertItem[] {
  console.log('🚀 Starting enhanced alert processing', {
    hasResponse: !!apiResponse,
    responseType: typeof apiResponse,
    hasData: !!apiResponse?.data,
    dataLength: apiResponse?.data?.length
  });

  // Handle null/undefined response
  if (!apiResponse) {
    console.warn('❌ No API response provided');
    return [];
  }

  // Step 1: Validate API response structure
  const responseValidation = validateAlertApiResponse(apiResponse);

  console.log('📋 API response validation:', {
    isValid: responseValidation.isValid,
    issues: responseValidation.issues,
    dataCount: responseValidation.data.length
  });

  if (!responseValidation.isValid && responseValidation.data.length === 0) {
    console.error('❌ Invalid API response with no recoverable data:', responseValidation.issues);
    return [];
  }

  // Step 2: Process with recovery
  const result = validateAlertsWithRecovery(responseValidation.data);

  // Step 3: Log detailed results
  console.log('📊 Alert processing results:', {
    input: result.stats.input,
    processed: result.stats.processed,
    validated: result.stats.validated,
    failed: result.stats.failed,
    successRate: result.stats.input > 0
      ? `${((result.stats.validated / result.stats.input) * 100).toFixed(1)}%`
      : '0%'
  });

  if (result.stats.failed > 0) {
    console.warn(`⚠️ Alert processing had ${result.stats.failed} failures out of ${result.stats.input} total`);
  }

  return result.alerts;
}

// Export all utilities
export default {
  preprocessAlertsData,
  validateAlertsWithRecovery,
  createMockAlert,
  validateAlertApiResponse,
  processAlertsData
};