/**
 * Data validation utilities for runtime type checking and error prevention
 * Provides type guards and validation functions for dashboard data
 */

import { safeParseDate, normalizeTimestamps } from './dateUtils';

// Activity item validation
export interface ValidatedActivityItem {
  id: string;
  type: string;
  title: string;
  description: string;
  timestamp: Date;
  priority: 'low' | 'medium' | 'high';
  status: 'pending' | 'completed' | 'failed';
  entityType?: string;
  entityId?: string;
  entityName?: string;
  metadata?: Record<string, any>;
}

// Alert item validation - Updated to match API structure
export interface ValidatedAlertItem {
  id: string;
  type: 'low_stock' | 'out_of_stock' | 'expiry_warning' | 'quality_issue' | 'performance_issue' | 'price_change' | 'delivery_delay';
  severity: 'low' | 'medium' | 'high' | 'critical' | 'info' | 'warning' | 'error';
  title: string;
  message: string;
  isRead: boolean;
  createdAt: Date;
  // Optional fields from API - making more fields optional for compatibility
  status?: 'active' | 'acknowledged' | 'resolved' | 'snoozed';
  priority?: number;
  isActive?: boolean;
  itemId?: string;
  itemName?: string;
  itemSku?: string;
  currentValue?: number | null;
  threshold?: number | null;
  supplierName?: string | null;
  warehouseId?: string | null;
  warehouseName?: string | null;
  assignedTo?: string | null;
  assignedToName?: string | null;
  contextId?: string;
  // Additional fields from API
  updatedAt?: Date;
  acknowledgedBy?: string | null;
  acknowledgedAt?: Date | null;
  resolvedBy?: string | null;
  resolvedAt?: Date | null;
  snoozedUntil?: Date | null;
  escalationLevel?: number;
}

/**
 * Type guard for activity items
 */
export function isValidActivityItem(item: any): item is ValidatedActivityItem {
  if (!item || typeof item !== 'object') return false;

  return (
    typeof item.id === 'string' &&
    typeof item.type === 'string' &&
    typeof item.title === 'string' &&
    typeof item.description === 'string' &&
    ['low', 'medium', 'high'].includes(item.priority) &&
    ['pending', 'completed', 'failed'].includes(item.status) &&
    safeParseDate(item.timestamp) !== null
  );
}

/**
 * Type guard for alert items - Updated to match API structure with improved validation
 */
export function isValidAlertItem(item: any): item is ValidatedAlertItem {
  if (!item || typeof item !== 'object') {
    return false;
  }

  // Basic required fields
  const hasRequiredFields = (
    typeof item.id === 'string' &&
    typeof item.title === 'string' &&
    typeof item.message === 'string' &&
    safeParseDate(item.createdAt) !== null
  );

  if (!hasRequiredFields) {
    return false;
  }

  // Validate type (be more permissive)
  const validTypes = ['low_stock', 'out_of_stock', 'expiry_warning', 'quality_issue', 'performance_issue', 'price_change', 'delivery_delay'];
  const hasValidType = typeof item.type === 'string' && validTypes.includes(item.type);

  if (!hasValidType) {
    return false;
  }

  // Validate severity (be more permissive)
  const validSeverities = ['low', 'medium', 'high', 'critical', 'info', 'warning', 'error'];
  const hasValidSeverity = typeof item.severity === 'string' && validSeverities.includes(item.severity);

  if (!hasValidSeverity) {
    return false;
  }

  // isRead can be boolean, string that can be converted to boolean, or missing (default to false)
  const hasValidIsRead = item.isRead === undefined ||
                         typeof item.isRead === 'boolean' ||
                         (typeof item.isRead === 'string' && ['true', 'false'].includes(item.isRead.toLowerCase()));

  if (!hasValidIsRead) {
    return false;
  }

  return true;
}

/**
 * Safely validate and normalize activity items
 */
export function validateActivityItems(items: any[]): ValidatedActivityItem[] {
  if (!Array.isArray(items)) {
    if (process.env.NODE_ENV === 'development') {
      console.warn('Expected array for activity items, got:', typeof items);
    }
    return [];
  }

  const validated: ValidatedActivityItem[] = [];

  items.forEach((item, index) => {
    try {
      if (isValidActivityItem(item)) {
        const normalized = normalizeTimestamps(item, ['timestamp']);
        validated.push(normalized as ValidatedActivityItem);
      } else if (process.env.NODE_ENV === 'development') {
        console.warn(`Invalid activity item at index ${index}`);
      }
    } catch (error) {
      if (process.env.NODE_ENV === 'development') {
        console.error(`Error validating activity item at index ${index}:`, error);
      }
    }
  });

  return validated;
}

/**
 * Safely validate and normalize alert items with fallback recovery
 */
export function validateAlertItems(items: any[]): ValidatedAlertItem[] {
  if (!Array.isArray(items)) {
    if (process.env.NODE_ENV === 'development') {
      console.warn('Expected array for alert items, got:', typeof items);
    }
    return [];
  }

  const validated: ValidatedAlertItem[] = [];
  const errors: Array<{index: number, item: any, error: string}> = [];

  items.forEach((item, index) => {
    try {
      if (isValidAlertItem(item)) {
        const normalized = normalizeTimestamps(item, ['createdAt', 'updatedAt', 'acknowledgedAt', 'resolvedAt', 'snoozedUntil']);

        // Ensure isRead has a default value and is boolean
        const rawIsRead = (item as { isRead?: unknown }).isRead;
        const normalizedIsRead =
          typeof rawIsRead === 'boolean'
            ? rawIsRead
            : typeof rawIsRead === 'string'
              ? rawIsRead.toLowerCase() === 'true'
              : false;

        const alertItem: ValidatedAlertItem = {
          ...normalized,
          isRead: normalizedIsRead
        } as ValidatedAlertItem;

        validated.push(alertItem);
      } else {
        // Try fallback validation with relaxed constraints
        const fallbackItem = attemptFallbackValidation(item, index);
        if (fallbackItem) {
          validated.push(fallbackItem);
        } else {
          // Detailed error logging for debugging (dev only)
          const missingFields = [];
          if (!item || typeof item !== 'object') {
            errors.push({index, item, error: 'Item is not an object'});
            if (process.env.NODE_ENV === 'development') {
              console.warn(`Invalid alert item at index ${index}: Not an object`);
            }
            return;
          }

          if (typeof item.id !== 'string') missingFields.push('id (string)');
          if (typeof item.title !== 'string') missingFields.push('title (string)');
          if (typeof item.message !== 'string') missingFields.push('message (string)');
          if (!safeParseDate(item.createdAt)) missingFields.push('createdAt (valid date)');

          const validTypes = ['low_stock', 'out_of_stock', 'expiry_warning', 'quality_issue', 'performance_issue', 'price_change', 'delivery_delay'];
          if (!validTypes.includes(item.type)) missingFields.push(`type (one of: ${validTypes.join(', ')})`);

          const validSeverities = ['low', 'medium', 'high', 'critical', 'info', 'warning', 'error'];
          if (!validSeverities.includes(item.severity)) missingFields.push(`severity (one of: ${validSeverities.join(', ')})`);

          const errorMsg = `Missing or invalid fields: ${missingFields.join(', ')}`;
          errors.push({index, item, error: errorMsg});

          if (process.env.NODE_ENV === 'development') {
            console.warn(`Invalid alert item at index ${index}: ${errorMsg}`);
          }
        }
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      errors.push({index, item, error: errorMsg});
      if (process.env.NODE_ENV === 'development') {
        console.error(`Error validating alert item at index ${index}:`, error);
      }
    }
  });

  // Log summary only in development and only if there are errors
  if (errors.length > 0 && process.env.NODE_ENV === 'development') {
    console.warn(`Alert validation: ${validated.length} valid, ${errors.length} invalid out of ${items.length} total`);
  }

  return validated;
}

/**
 * Attempt fallback validation with data repair for partial alert objects
 */
function attemptFallbackValidation(item: any, index: number): ValidatedAlertItem | null {
  if (!item || typeof item !== 'object') {
    return null;
  }

  try {
    // Ensure we have all required fields with sensible defaults
    const repaired: any = {
      // Required fields with fallbacks
      id: item.id || `generated_alert_${Date.now()}_${index}`,
      type: item.type || 'quality_issue', // Default fallback type
      severity: mapSeverityValue(item.severity || 'info'), // Default to info severity
      title: item.title || item.name || 'System Alert',
      message: item.message || item.description || 'System alert requires attention',

      // Handle isRead conversion more carefully
      isRead: item.isRead === true || item.isRead === 'true' || item.isRead === 1 ? true : false,

      // Handle dates more carefully
      createdAt: safeParseDate(item.createdAt || item.created_at || item.timestamp) || new Date(),

      // Copy all optional fields with proper type checking
      status: ['active', 'acknowledged', 'resolved', 'snoozed'].includes(item.status) ? item.status : 'active',
      priority: typeof item.priority === 'number' ? item.priority :
                typeof item.priority === 'string' ? parseInt(item.priority) || undefined : undefined,
      isActive: typeof item.isActive === 'boolean' ? item.isActive :
                typeof item.isActive === 'string' ? item.isActive.toLowerCase() === 'true' : true,

      // Item-related fields
      itemId: typeof item.itemId === 'string' ? item.itemId : undefined,
      itemName: typeof item.itemName === 'string' ? item.itemName : undefined,
      itemSku: typeof item.itemSku === 'string' ? item.itemSku : undefined,

      // Numeric fields with proper null handling
      currentValue: typeof item.currentValue === 'number' ? item.currentValue :
                    typeof item.currentValue === 'string' ? parseFloat(item.currentValue) || null : null,
      threshold: typeof item.threshold === 'number' ? item.threshold :
                 typeof item.threshold === 'string' ? parseFloat(item.threshold) || null : null,

      // String fields with null handling
      supplierName: typeof item.supplierName === 'string' ? item.supplierName : null,
      warehouseId: typeof item.warehouseId === 'string' ? item.warehouseId : null,
      warehouseName: typeof item.warehouseName === 'string' ? item.warehouseName : null,
      assignedTo: typeof item.assignedTo === 'string' ? item.assignedTo : null,
      assignedToName: typeof item.assignedToName === 'string' ? item.assignedToName : null,

      // Date fields
      updatedAt: safeParseDate(item.updatedAt || item.updated_at) || new Date(),
      acknowledgedBy: typeof item.acknowledgedBy === 'string' ? item.acknowledgedBy : null,
      acknowledgedAt: safeParseDate(item.acknowledgedAt) || null,
      resolvedBy: typeof item.resolvedBy === 'string' ? item.resolvedBy : null,
      resolvedAt: safeParseDate(item.resolvedAt) || null,
      snoozedUntil: safeParseDate(item.snoozedUntil) || null,
      escalationLevel: typeof item.escalationLevel === 'number' ? item.escalationLevel : 0,

      // Context ID fallback
      contextId: item.contextId || item.itemId || item.id
    };

    // Validate the repaired item
    if (isValidAlertItem(repaired)) {
      const normalized = normalizeTimestamps(repaired, ['createdAt', 'updatedAt', 'acknowledgedAt', 'resolvedAt', 'snoozedUntil']);
      return normalized as ValidatedAlertItem;
    } else {
      return null;
    }

  } catch (error) {
    if (process.env.NODE_ENV === 'development') {
      console.error(`Fallback validation error for alert ${index}:`, error);
    }
    return null;
  }
}

/**
 * Validate API response structure
 */
export function validateApiResponse<T>(response: any, expectedDataType: string): {
  success: boolean;
  data: T | null;
  error?: string;
} {
  if (!response) {
    return { success: false, data: null, error: 'No response received' };
  }

  if (!response.success) {
    return {
      success: false,
      data: null,
      error: response.error || 'API request failed'
    };
  }

  if (!response.data) {
    return {
      success: false,
      data: null,
      error: `No data in response for ${expectedDataType}`
    };
  }

  return { success: true, data: response.data };
}

/**
 * Safe property access with fallback
 */
export function safeGet<T>(
  obj: any,
  path: string,
  fallback: T
): T {
  try {
    const keys = path.split('.');
    let current = obj;

    for (const key of keys) {
      if (current && typeof current === 'object' && key in current) {
        current = current[key];
      } else {
        return fallback;
      }
    }

    return current !== undefined ? current : fallback;
  } catch (error) {
    if (process.env.NODE_ENV === 'development') {
      console.warn(`Safe get failed for path "${path}":`, error);
    }
    return fallback;
  }
}

/**
 * Validate metrics object
 */
export function validateMetrics(metrics: any): Record<string, number> {
  const validated: Record<string, number> = {};

  if (!metrics || typeof metrics !== 'object') {
    return validated;
  }

  Object.entries(metrics).forEach(([key, value]) => {
    if (typeof value === 'number' && !isNaN(value)) {
      validated[key] = value;
    } else if (typeof value === 'string') {
      const parsed = parseFloat(value);
      if (!isNaN(parsed)) {
        validated[key] = parsed;
      }
    }
  });

  return validated;
}

/**
 * Error boundary helper for component validation
 */
export function withDataValidation<T>(
  data: any,
  validator: (data: any) => T,
  fallback: T,
  errorContext: string
): T {
  try {
    if (!data) {
      if (process.env.NODE_ENV === 'development') {
        console.warn(`${errorContext}: No data provided`);
      }
      return fallback;
    }

    return validator(data);
  } catch (error) {
    if (process.env.NODE_ENV === 'development') {
      console.error(`${errorContext}: Validation failed`, error);
    }
    return fallback;
  }
}

/**
 * Rate limiting for error logging to prevent spam
 */
class ErrorLogger {
  private errorCounts = new Map<string, { count: number; lastLogged: number }>();
  private readonly maxErrorsPerMinute = 5;
  private readonly resetInterval = 60000; // 1 minute

  logError(errorKey: string, error: any, context: string) {
    const now = Date.now();
    const errorInfo = this.errorCounts.get(errorKey) || { count: 0, lastLogged: 0 };

    // Reset count if enough time has passed
    if (now - errorInfo.lastLogged > this.resetInterval) {
      errorInfo.count = 0;
    }

    errorInfo.count++;
    errorInfo.lastLogged = now;
    this.errorCounts.set(errorKey, errorInfo);

    // Only log if under the rate limit
    if (errorInfo.count <= this.maxErrorsPerMinute) {
      console.error(`${context} (${errorInfo.count}/${this.maxErrorsPerMinute}):`, error);
    } else if (errorInfo.count === this.maxErrorsPerMinute + 1) {
      console.warn(`${context}: Rate limiting further error logs for this error type`);
    }
  }
}

export const errorLogger = new ErrorLogger();

/**
 * Transform raw API alert data to ensure compatibility with validation schema
 */
export function transformAlertItem(rawItem: any): any {
  if (!rawItem || typeof rawItem !== 'object') {
    return rawItem;
  }

  // Map API fields to expected validation fields
  const transformed = {
    ...rawItem,

    // Ensure isRead is boolean (API might have different field or string value)
    isRead: typeof rawItem.isRead === 'boolean' ? rawItem.isRead :
            typeof rawItem.isRead === 'string' ? rawItem.isRead.toLowerCase() === 'true' :
            false, // default to false if undefined

    // Map severity values if needed
    severity: mapSeverityValue(rawItem.severity),

    // Ensure type is valid - provide fallback
    type: rawItem.type || 'quality_issue',

    // Ensure title and message exist
    title: rawItem.title || 'Alert Notification',
    message: rawItem.message || 'Alert requires attention',

    // Ensure createdAt is properly formatted and parsed
    createdAt: rawItem.createdAt || rawItem.created_at || rawItem.timestamp || new Date(),

    // Transform updatedAt if present
    updatedAt: rawItem.updatedAt || rawItem.updated_at || rawItem.modifiedAt || rawItem.createdAt || new Date(),

    // Add contextId if missing but we have itemId
    contextId: rawItem.contextId || rawItem.itemId || rawItem.id,

    // Ensure nullable fields are properly handled
    currentValue: typeof rawItem.currentValue === 'number' ? rawItem.currentValue : null,
    threshold: typeof rawItem.threshold === 'number' ? rawItem.threshold : null,
    supplierName: rawItem.supplierName || null,
    warehouseId: rawItem.warehouseId || null,
    warehouseName: rawItem.warehouseName || null,
    assignedTo: rawItem.assignedTo || null,
    assignedToName: rawItem.assignedToName || null,
    acknowledgedBy: rawItem.acknowledgedBy || null,
    acknowledgedAt: rawItem.acknowledgedAt ? safeParseDate(rawItem.acknowledgedAt) : null,
    resolvedBy: rawItem.resolvedBy || null,
    resolvedAt: rawItem.resolvedAt ? safeParseDate(rawItem.resolvedAt) : null,
    snoozedUntil: rawItem.snoozedUntil ? safeParseDate(rawItem.snoozedUntil) : null,
    escalationLevel: typeof rawItem.escalationLevel === 'number' ? rawItem.escalationLevel : 0
  };

  return transformed;
}

/**
 * Map different severity naming conventions with better fallbacks
 */
function mapSeverityValue(severity: any): string {
  if (!severity) {
    return 'info'; // Default fallback
  }

  if (typeof severity !== 'string') {
    severity = String(severity);
  }

  const severityMap: Record<string, string> = {
    'low': 'low',
    'medium': 'medium',
    'high': 'high',
    'critical': 'critical',
    'info': 'info',
    'warning': 'warning',
    'error': 'error',
    // Handle alternative naming
    'warn': 'warning',
    'err': 'error',
    'crit': 'critical',
    // Handle numeric severity levels
    '1': 'low',
    '2': 'medium',
    '3': 'high',
    '4': 'critical'
  };

  const mapped = severityMap[severity.toLowerCase()];

  if (!mapped) {
    // If not mapped and it's one of the valid values, keep it, otherwise default to 'info'
    const validSeverities = ['low', 'medium', 'high', 'critical', 'info', 'warning', 'error'];
    return validSeverities.includes(severity.toLowerCase()) ? severity.toLowerCase() : 'info';
  }

  return mapped;
}

/**
 * Debug function to log sample alert data structure with validation details
 * Only enabled in development mode
 */
export function debugAlertStructure(alerts: any[], sampleSize: number = 3): void {
  if (process.env.NODE_ENV !== 'development') {
    return; // Only debug in development
  }

  if (!Array.isArray(alerts) || alerts.length === 0) {
    console.log('No alerts to debug');
    return;
  }

  console.log(`Alert structure debug (showing ${Math.min(sampleSize, alerts.length)} of ${alerts.length} items):`);

  alerts.slice(0, sampleSize).forEach((alert, index) => {
    const validation = {
      hasId: typeof alert?.id === 'string',
      hasType: typeof alert?.type === 'string' && ['low_stock', 'out_of_stock', 'expiry_warning', 'quality_issue', 'performance_issue', 'price_change', 'delivery_delay'].includes(alert.type),
      hasSeverity: typeof alert?.severity === 'string' && ['low', 'medium', 'high', 'critical', 'info', 'warning', 'error'].includes(alert.severity),
      hasTitle: typeof alert?.title === 'string',
      hasMessage: typeof alert?.message === 'string',
      hasValidCreatedAt: !!safeParseDate(alert?.createdAt),
      isReadValid: alert?.isRead === undefined || typeof alert?.isRead === 'boolean' || (typeof alert?.isRead === 'string' && ['true', 'false'].includes(alert?.isRead.toLowerCase()))
    };

    console.log(`Alert ${index} (valid=${Object.values(validation).every(v => v)}):`, {
      id: alert?.id,
      type: alert?.type,
      severity: alert?.severity,
      title: alert?.title,
      message: typeof alert?.message === 'string' ? alert.message.substring(0, 50) + '...' : alert?.message,
      validation
    });
  });
}
