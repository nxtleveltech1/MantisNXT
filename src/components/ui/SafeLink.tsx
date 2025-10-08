/**
 * SafeLink component - A wrapper for anchor tags that sanitizes URLs
 * to prevent javascript: and other dangerous URL schemes
 */

import React from 'react';
import { sanitizeUrl } from '@/lib/utils/url-validation';

interface SafeLinkProps extends Omit<React.AnchorHTMLAttributes<HTMLAnchorElement>, 'href'> {
  href: string | null | undefined;
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

/**
 * SafeLink component that sanitizes URLs before rendering
 * Returns fallback content (or null) if URL is unsafe
 */
export function SafeLink({ href, children, fallback = null, ...props }: SafeLinkProps) {
  const safeUrl = sanitizeUrl(href);
  
  if (!safeUrl) {
    return <>{fallback}</>;
  }
  
  return (
    <a href={safeUrl} {...props}>
      {children}
    </a>
  );
}

/**
 * Hook to get a safe URL or null if unsafe
 */
export function useSafeUrl(url: string | null | undefined): string | null {
  return sanitizeUrl(url);
}