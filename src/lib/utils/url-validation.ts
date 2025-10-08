/**
 * URL validation utilities to prevent security issues
 */

/**
 * Check if a URL is safe to use in href attributes
 * Prevents javascript:, data:, and other potentially dangerous URLs
 */
export function isSafeUrl(url: string | null | undefined): boolean {
  if (!url || typeof url !== 'string') {
    return false;
  }

  const trimmedUrl = url.trim().toLowerCase();
  
  // Block dangerous protocols
  const dangerousProtocols = [
    'javascript:',
    'data:',
    'vbscript:',
    'file:',
    'about:',
    'chrome:',
    'chrome-extension:',
    'moz-extension:',
    'ms-its:',
    'ms-help:',
    'res:',
    'livescript:',
    'mocha:',
  ];

  if (dangerousProtocols.some(protocol => trimmedUrl.startsWith(protocol))) {
    return false;
  }

  // Allow common safe protocols
  const safeProtocols = ['http:', 'https:', 'ftp:', 'ftps:', 'mailto:', 'tel:', 'sms:'];
  
  // If it doesn't start with a protocol, assume it's a domain (safe)
  if (!trimmedUrl.includes(':')) {
    return true;
  }

  // Check if it starts with a safe protocol
  return safeProtocols.some(protocol => trimmedUrl.startsWith(protocol));
}

/**
 * Sanitize a URL to make it safe for use in href attributes
 * Returns null if the URL cannot be made safe
 */
export function sanitizeUrl(url: string | null | undefined): string | null {
  if (!url || typeof url !== 'string') {
    return null;
  }

  const trimmedUrl = url.trim();
  
  if (!isSafeUrl(trimmedUrl)) {
    return null;
  }

  // If no protocol is specified, default to https
  if (!trimmedUrl.includes(':') && !trimmedUrl.startsWith('//')) {
    return `https://${trimmedUrl}`;
  }

  // If it starts with //, add https:
  if (trimmedUrl.startsWith('//')) {
    return `https:${trimmedUrl}`;
  }

  return trimmedUrl;
}

/**
 * Get a display-friendly version of a URL
 */
export function getDisplayUrl(url: string | null | undefined): string | null {
  if (!url || typeof url !== 'string') {
    return null;
  }

  const sanitized = sanitizeUrl(url);
  if (!sanitized) {
    return null;
  }

  // Remove protocol for display
  return sanitized.replace(/^https?:\/\//, '');
}