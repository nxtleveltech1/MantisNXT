/**
 * Date utilities for safe timestamp handling and validation
 * Prevents runtime errors from timestamp format mismatches
 */

/**
 * Safely converts a timestamp string or Date object to a Date
 * Returns null if conversion fails
 */
export function safeParseDate(timestamp: string | Date | null | undefined): Date | null {
  if (!timestamp) return null;

  // If already a Date object, return it
  if (timestamp instanceof Date) {
    return isValidDate(timestamp) ? timestamp : null;
  }

  // If string, try to parse it
  if (typeof timestamp === 'string') {
    try {
      const parsed = new Date(timestamp);
      return isValidDate(parsed) ? parsed : null;
    } catch (error) {
      console.warn('Failed to parse timestamp:', timestamp, error);
      return null;
    }
  }

  return null;
}

/**
 * Checks if a Date object is valid
 */
export function isValidDate(date: Date): boolean {
  return date instanceof Date && !isNaN(date.getTime());
}

/**
 * Safely gets the time value from a timestamp
 * Returns null if the timestamp is invalid
 */
export function safeGetTime(timestamp: string | Date | null | undefined): number | null {
  const date = safeParseDate(timestamp);
  return date ? date.getTime() : null;
}

/**
 * Safely formats a relative time string
 * Returns fallback string if timestamp is invalid
 */
export function safeRelativeTime(
  timestamp: string | Date | null | undefined,
  fallback: string = 'Unknown'
): string {
  const date = safeParseDate(timestamp);

  if (!date) return fallback;

  try {
    const now = new Date();
    const diffMs = date.getTime() - now.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));

    return new Intl.RelativeTimeFormat('en', { numeric: 'auto' }).format(diffHours, 'hour');
  } catch (error) {
    console.warn('Failed to format relative time:', timestamp, error);
    return fallback;
  }
}

/**
 * Safely formats a date string
 * Returns fallback string if timestamp is invalid
 */
export function safeFormatDate(
  timestamp: string | Date | null | undefined,
  options: Intl.DateTimeFormatOptions = {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  },
  fallback: string = 'Unknown'
): string {
  const date = safeParseDate(timestamp);

  if (!date) return fallback;

  try {
    return new Intl.DateTimeFormat('en', options).format(date);
  } catch (error) {
    console.warn('Failed to format date:', timestamp, error);
    return fallback;
  }
}

/**
 * Type guard to check if an object has a valid timestamp property
 */
export function hasValidTimestamp<T extends Record<string, unknown>>(
  obj: T,
  timestampKey: keyof T = 'timestamp'
): obj is T & { [K in keyof T]: K extends typeof timestampKey ? Date : T[K] } {
  const value = obj ? obj[timestampKey] : null;
  return !!value && safeParseDate(value as string | Date | null | undefined) !== null;
}

/**
 * Transform API response data to ensure timestamps are Date objects
 */
export function normalizeTimestamps<T extends Record<string, unknown>>(
  data: T,
  timestampKeys: (keyof T)[] = ['timestamp', 'createdAt', 'updatedAt']
): T {
  const normalized = { ...data };

  timestampKeys.forEach(key => {
    const value = normalized[key];
    if (value !== undefined && value !== null) {
      const parsed = safeParseDate(value as string | Date | null | undefined);
      if (parsed) {
        normalized[key] = parsed as T[typeof key];
      }
    }
  });

  return normalized;
}

/**
 * Transform an array of items to ensure timestamps are Date objects
 */
export function normalizeTimestampsArray<T extends Record<string, unknown>>(
  items: T[],
  timestampKeys: (keyof T)[] = ['timestamp', 'createdAt', 'updatedAt']
): T[] {
  return items.map(item => normalizeTimestamps(item, timestampKeys));
}

/**
 * Safe comparison function for sorting by timestamp
 */
export function compareTimestamps(
  a: string | Date | null | undefined,
  b: string | Date | null | undefined,
  descending: boolean = true
): number {
  const timeA = safeGetTime(a) ?? 0;
  const timeB = safeGetTime(b) ?? 0;

  return descending ? timeB - timeA : timeA - timeB;
}

/**
 * Check if a timestamp is within a certain time range
 */
export function isTimestampInRange(
  timestamp: string | Date | null | undefined,
  rangeHours: number = 24
): boolean {
  const date = safeParseDate(timestamp);
  if (!date) return false;

  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffHours = diffMs / (1000 * 60 * 60);

  return diffHours >= 0 && diffHours <= rangeHours;
}
