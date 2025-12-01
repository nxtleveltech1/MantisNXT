// @ts-nocheck

/**
 * Safe Data Utilities - Bulletproof data parsing and validation
 * Ensures UI never crashes due to data type errors
 */

import { format, isValid, parseISO, parse } from 'date-fns';

// ============================================================================
// SAFE DATE UTILITIES
// ============================================================================

export interface SafeDateResult {
  isValid: boolean;
  date: Date | null;
  error?: string;
  fallbackUsed: boolean;
}

/**
 * Safely parse any date input with comprehensive fallbacks
 */
export function safeParseDate(input: unknown, fallbackDate: Date = new Date()): SafeDateResult {
  // Handle null/undefined
  if (input == null) {
    return {
      isValid: false,
      date: fallbackDate,
      error: 'Date input is null or undefined',
      fallbackUsed: true,
    };
  }

  // Handle Date objects
  if (input instanceof Date) {
    if (isValid(input)) {
      return {
        isValid: true,
        date: input,
        fallbackUsed: false,
      };
    }
    return {
      isValid: false,
      date: fallbackDate,
      error: 'Invalid Date object',
      fallbackUsed: true,
    };
  }

  // Handle strings
  if (typeof input === 'string') {
    // Try ISO format first
    try {
      const isoDate = parseISO(input);
      if (isValid(isoDate)) {
        return {
          isValid: true,
          date: isoDate,
          fallbackUsed: false,
        };
      }
    } catch {
      // Silent catch for format parsing attempt
    }

    // Try common formats
    const formats = [
      'yyyy-MM-dd',
      'MM/dd/yyyy',
      'dd/MM/yyyy',
      'yyyy-MM-dd HH:mm:ss',
      'MM/dd/yyyy HH:mm:ss',
      "yyyy-MM-dd'T'HH:mm:ss",
      "yyyy-MM-dd'T'HH:mm:ss.SSS'Z'",
    ];

    for (const formatStr of formats) {
      try {
        const parsedDate = parse(input, formatStr, new Date());
        if (isValid(parsedDate)) {
          return {
            isValid: true,
            date: parsedDate,
            fallbackUsed: false,
          };
        }
      } catch {
        // Silent catch for format parsing attempt
      }
    }

    // Try native Date constructor as last resort
    try {
      const nativeDate = new Date(input);
      if (isValid(nativeDate)) {
        return {
          isValid: true,
          date: nativeDate,
          fallbackUsed: false,
        };
      }
    } catch {
      // Silent catch for format parsing attempt
    }

    return {
      isValid: false,
      date: fallbackDate,
      error: `Unable to parse date string: "${input}"`,
      fallbackUsed: true,
    };
  }

  // Handle numbers (timestamps)
  if (typeof input === 'number') {
    try {
      const date = new Date(input);
      if (isValid(date)) {
        return {
          isValid: true,
          date,
          fallbackUsed: false,
        };
      }
    } catch {
      // Silent catch for format parsing attempt
    }

    return {
      isValid: false,
      date: fallbackDate,
      error: `Invalid timestamp: ${input}`,
      fallbackUsed: true,
    };
  }

  return {
    isValid: false,
    date: fallbackDate,
    error: `Unsupported date type: ${typeof input}`,
    fallbackUsed: true,
  };
}

/**
 * Safe date formatting with fallbacks
 */
export function safeFormatDate(
  input: unknown,
  formatStr: string = 'MMM dd, yyyy',
  fallback: string = 'Invalid Date'
): string {
  const result = safeParseDate(input);

  if (!result.isValid || !result.date) {
    return fallback;
  }

  try {
    return format(result.date, formatStr);
  } catch {
    return fallback;
  }
}

/**
 * Safe relative time formatting
 */
export function safeRelativeTime(input: unknown, fallback: string = 'Unknown time'): string {
  const result = safeParseDate(input);

  if (!result.isValid || !result.date) {
    return fallback;
  }

  try {
    const now = new Date();
    const diffMs = now.getTime() - result.date.getTime();
    const diffSeconds = Math.floor(diffMs / 1000);
    const diffMinutes = Math.floor(diffSeconds / 60);
    const diffHours = Math.floor(diffMinutes / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffSeconds < 60) return 'Just now';
    if (diffMinutes < 60) return `${diffMinutes}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)}w ago`;
    if (diffDays < 365) return `${Math.floor(diffDays / 30)}mo ago`;
    return `${Math.floor(diffDays / 365)}y ago`;
  } catch {
    return fallback;
  }
}

// ============================================================================
// SAFE TYPE UTILITIES
// ============================================================================

/**
 * Safely convert to string with fallback
 */
export function safeString(input: unknown, fallback: string = ''): string {
  if (input == null) return fallback;
  if (typeof input === 'string') return input;

  try {
    return String(input);
  } catch {
    return fallback;
  }
}

/**
 * Safely convert to number with fallback
 */
export function safeNumber(input: unknown, fallback: number = 0): number {
  if (input == null) return fallback;
  if (typeof input === 'number' && !isNaN(input)) return input;

  if (typeof input === 'string') {
    const parsed = parseFloat(input.replace(/[^0-9.-]/g, ''));
    if (!isNaN(parsed)) return parsed;
  }

  return fallback;
}

/**
 * Safely convert to boolean with fallback
 */
export function safeBoolean(input: unknown, fallback: boolean = false): boolean {
  if (input == null) return fallback;
  if (typeof input === 'boolean') return input;

  if (typeof input === 'string') {
    const lower = input.toLowerCase().trim();
    if (lower === 'true' || lower === '1' || lower === 'yes') return true;
    if (lower === 'false' || lower === '0' || lower === 'no') return false;
  }

  if (typeof input === 'number') {
    return input !== 0;
  }

  return fallback;
}

/**
 * Safely access nested object properties
 */
export function safeGet<T>(obj: unknown, path: string, fallback: T): T {
  if (obj == null || typeof obj !== 'object') {
    return fallback;
  }

  try {
    const keys = path.split('.');
    let current: unknown = obj;

    for (const key of keys) {
      if (current == null || typeof current !== 'object') {
        return fallback;
      }
      current = current[key];
    }

    return current ?? fallback;
  } catch {
    return fallback;
  }
}

// ============================================================================
// DATA TRANSFORMERS
// ============================================================================

/**
 * Type-safe data transformer interface
 */
export interface DataTransformer<TInput, TOutput> {
  transform(input: TInput): TOutput;
  validate(input: unknown): input is TInput;
  fallback: TOutput;
}

/**
 * Safe array transformer
 */
export function safeArray<T>(
  input: unknown,
  itemTransformer?: (item: unknown) => T,
  fallback: T[] = []
): T[] {
  if (!Array.isArray(input)) {
    return fallback;
  }

  if (!itemTransformer) {
    return input as T[];
  }

  try {
    return input.map(itemTransformer);
  } catch {
    return fallback;
  }
}

/**
 * Safe object transformer with schema validation
 */
export function safeObject<T extends Record<string, unknown>>(
  input: unknown,
  schema: { [K in keyof T]: (value: unknown) => T[K] },
  fallback: T
): T {
  if (input == null || typeof input !== 'object') {
    return fallback;
  }

  try {
    const result = {} as T;
    const inputObj = input as Record<string, unknown>;

    for (const key of Object.keys(schema) as Array<keyof T>) {
      const transformer = schema[key];
      try {
        result[key] = transformer(inputObj[key]);
      } catch {
        result[key] = fallback[key];
      }
    }

    return result;
  } catch {
    return fallback;
  }
}

// ============================================================================
// SPECIFIC DOMAIN TRANSFORMERS
// ============================================================================

/**
 * Safe supplier data transformer
 */
export interface SafeSupplier {
  id: string;
  name: string;
  email: string;
  status: 'active' | 'inactive' | 'pending';
  createdAt: Date;
  updatedAt: Date;
  lastContactDate: Date | null;
  metrics: {
    totalOrders: number;
    totalValue: number;
    averageDeliveryTime: number;
    qualityScore: number;
  };
}

export function transformSupplierData(input: unknown): SafeSupplier {
  const fallback: SafeSupplier = {
    id: '',
    name: 'Unknown Supplier',
    email: '',
    status: 'inactive',
    createdAt: new Date(),
    updatedAt: new Date(),
    lastContactDate: null,
    metrics: {
      totalOrders: 0,
      totalValue: 0,
      averageDeliveryTime: 0,
      qualityScore: 0,
    },
  };

  return safeObject<SafeSupplier>(
    input,
    {
      id: v => safeString(v, fallback.id),
      name: v => safeString(v, fallback.name),
      email: v => safeString(v, fallback.email),
      status: v => {
        const str = safeString(v);
        return ['active', 'inactive', 'pending'].includes(str)
          ? (str as SafeSupplier['status'])
          : fallback.status;
      },
      createdAt: v => safeParseDate(v, fallback.createdAt).date!,
      updatedAt: v => safeParseDate(v, fallback.updatedAt).date!,
      lastContactDate: v => (v == null ? null : safeParseDate(v).date),
      metrics: v =>
        safeObject<SafeSupplier['metrics']>(
          v,
          {
            totalOrders: v => safeNumber(v, fallback.metrics.totalOrders),
            totalValue: v => safeNumber(v, fallback.metrics.totalValue),
            averageDeliveryTime: v => safeNumber(v, fallback.metrics.averageDeliveryTime),
            qualityScore: v => safeNumber(v, fallback.metrics.qualityScore),
          },
          fallback.metrics
        ),
    },
    fallback
  );
}

/**
 * Safe inventory item transformer
 */
export interface SafeInventoryItem {
  id: string;
  name: string;
  sku: string;
  quantity: number;
  price: number;
  status: 'in_stock' | 'low_stock' | 'out_of_stock';
  lastUpdated: Date;
  category: string;
  supplier: string;
}

export function transformInventoryData(input: unknown): SafeInventoryItem {
  const fallback: SafeInventoryItem = {
    id: '',
    name: 'Unknown Item',
    sku: '',
    quantity: 0,
    price: 0,
    status: 'out_of_stock',
    lastUpdated: new Date(),
    category: 'Uncategorized',
    supplier: 'Unknown',
  };

  return safeObject<SafeInventoryItem>(
    input,
    {
      id: v => safeString(v, fallback.id),
      name: v => safeString(v, fallback.name),
      sku: v => safeString(v, fallback.sku),
      quantity: v => safeNumber(v, fallback.quantity),
      price: v => safeNumber(v, fallback.price),
      status: v => {
        const str = safeString(v);
        return ['in_stock', 'low_stock', 'out_of_stock'].includes(str)
          ? (str as SafeInventoryItem['status'])
          : fallback.status;
      },
      lastUpdated: v => safeParseDate(v, fallback.lastUpdated).date!,
      category: v => safeString(v, fallback.category),
      supplier: v => safeString(v, fallback.supplier),
    },
    fallback
  );
}

// ============================================================================
// ERROR RECOVERY UTILITIES
// ============================================================================

/**
 * Execute function with safe error handling
 */
export function safeExecute<T>(fn: () => T, fallback: T, onError?: (error: Error) => void): T {
  try {
    return fn();
  } catch (error) {
    if (onError && error instanceof Error) {
      onError(error);
    }
    return fallback;
  }
}

/**
 * Execute async function with safe error handling
 */
export async function safeExecuteAsync<T>(
  fn: () => Promise<T>,
  fallback: T,
  onError?: (error: Error) => void
): Promise<T> {
  try {
    return await fn();
  } catch (error) {
    if (onError && error instanceof Error) {
      onError(error);
    }
    return fallback;
  }
}

/**
 * Create a safe version of any function
 */
export function makeSafe<TArgs extends unknown[], TReturn>(
  fn: (...args: TArgs) => TReturn,
  fallback: TReturn,
  onError?: (error: Error, args: TArgs) => void
): (...args: TArgs) => TReturn {
  return (...args: TArgs) => {
    try {
      return fn(...args);
    } catch (error) {
      if (onError && error instanceof Error) {
        onError(error, args);
      }
      return fallback;
    }
  };
}
