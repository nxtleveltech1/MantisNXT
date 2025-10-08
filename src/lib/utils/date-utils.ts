/**
 * Date utilities for consistent timestamp handling across the application
 */

/**
 * Safely parse a date from various input formats
 */
export function safeParseDate(input: unknown): Date | null {
  if (!input) return null;

  try {
    // Handle Date objects
    if (input instanceof Date) {
      return isNaN(input.getTime()) ? null : input;
    }

    // Handle strings and numbers
    const date = new Date(input as string | number);
    return isNaN(date.getTime()) ? null : date;
  } catch {
    return null;
  }
}

/**
 * Safely get timestamp for comparison, with fallback
 */
export function safeGetTime(input: unknown, fallback: number = 0): number {
  const date = safeParseDate(input);
  return date ? date.getTime() : fallback;
}

/**
 * Format timestamp for display with error handling
 */
export function formatTimestamp(
  input: unknown,
  options: Intl.DateTimeFormatOptions = {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  }
): string {
  const date = safeParseDate(input);
  if (!date) return 'Invalid date';

  try {
    return date.toLocaleString('en-ZA', options);
  } catch {
    return date.toISOString();
  }
}

/**
 * Get relative time (e.g., "2 hours ago")
 */
export function getRelativeTime(input: unknown): string {
  const date = safeParseDate(input);
  if (!date) return 'Unknown time';

  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMinutes = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMinutes / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMinutes < 1) return 'Just now';
  if (diffMinutes < 60) return `${diffMinutes}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;

  return formatTimestamp(date, { month: 'short', day: 'numeric' });
}

/**
 * Ensure timestamp is properly serialized as ISO string
 */
export function serializeTimestamp(input: unknown): string {
  const date = safeParseDate(input);
  return date ? date.toISOString() : new Date().toISOString();
}

/**
 * Sort activities by timestamp with error handling
 */
export function sortByTimestamp<T extends { timestamp: unknown }>(
  activities: T[],
  order: 'asc' | 'desc' = 'desc'
): T[] {
  return activities.sort((a, b) => {
    const timeA = safeGetTime(a.timestamp);
    const timeB = safeGetTime(b.timestamp);
    return order === 'desc' ? timeB - timeA : timeA - timeB;
  });
}

/**
 * Filter activities by date range with error handling
 */
export function filterByDateRange<T extends { timestamp: unknown }>(
  activities: T[],
  from?: string | Date,
  to?: string | Date
): T[] {
  return activities.filter(activity => {
    const activityDate = safeParseDate(activity.timestamp);
    if (!activityDate) return false;

    if (from) {
      const fromDate = safeParseDate(from);
      if (fromDate && activityDate < fromDate) return false;
    }

    if (to) {
      const toDate = safeParseDate(to);
      if (toDate) {
        toDate.setHours(23, 59, 59, 999);
        if (activityDate > toDate) return false;
      }
    }

    return true;
  });
}

/**
 * Validate timestamp input for API endpoints
 */
export function validateTimestamp(input: unknown): string {
  const date = safeParseDate(input);
  if (!date) {
    throw new Error(`Invalid timestamp: ${input}`);
  }
  return date.toISOString();
}