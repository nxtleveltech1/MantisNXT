/**
 * Tests for URL validation utilities
 */

import { isSafeUrl, sanitizeUrl, getDisplayUrl } from '../url-validation';

describe('URL Validation', () => {
  describe('isSafeUrl', () => {
    it('should block javascript: URLs', () => {
      expect(isSafeUrl('javascript:alert("xss")')).toBe(false);
      expect(isSafeUrl('JAVASCRIPT:alert("xss")')).toBe(false);
      expect(isSafeUrl(' javascript:alert("xss") ')).toBe(false);
    });

    it('should block other dangerous protocols', () => {
      expect(isSafeUrl('data:text/html,<script>alert("xss")</script>')).toBe(false);
      expect(isSafeUrl('vbscript:msgbox("xss")')).toBe(false);
      expect(isSafeUrl('file:///etc/passwd')).toBe(false);
      expect(isSafeUrl('chrome-extension://malicious')).toBe(false);
    });

    it('should allow safe URLs', () => {
      expect(isSafeUrl('https://example.com')).toBe(true);
      expect(isSafeUrl('http://example.com')).toBe(true);
      expect(isSafeUrl('ftp://files.example.com')).toBe(true);
      expect(isSafeUrl('mailto:user@example.com')).toBe(true);
      expect(isSafeUrl('tel:+1234567890')).toBe(true);
      expect(isSafeUrl('example.com')).toBe(true);
      expect(isSafeUrl('www.example.com')).toBe(true);
    });

    it('should handle null/undefined/empty values', () => {
      expect(isSafeUrl(null)).toBe(false);
      expect(isSafeUrl(undefined)).toBe(false);
      expect(isSafeUrl('')).toBe(false);
      expect(isSafeUrl('   ')).toBe(false);
    });
  });

  describe('sanitizeUrl', () => {
    it('should return null for dangerous URLs', () => {
      expect(sanitizeUrl('javascript:alert("xss")')).toBeNull();
      expect(sanitizeUrl('data:text/html,malicious')).toBeNull();
      expect(sanitizeUrl('vbscript:msgbox("xss")')).toBeNull();
    });

    it('should add https to domain-only URLs', () => {
      expect(sanitizeUrl('example.com')).toBe('https://example.com');
      expect(sanitizeUrl('www.example.com')).toBe('https://www.example.com');
    });

    it('should preserve safe protocols', () => {
      expect(sanitizeUrl('https://example.com')).toBe('https://example.com');
      expect(sanitizeUrl('http://example.com')).toBe('http://example.com');
      expect(sanitizeUrl('ftp://files.example.com')).toBe('ftp://files.example.com');
      expect(sanitizeUrl('mailto:user@example.com')).toBe('mailto:user@example.com');
    });

    it('should handle protocol-relative URLs', () => {
      expect(sanitizeUrl('//example.com')).toBe('https://example.com');
    });

    it('should return null for null/undefined/empty values', () => {
      expect(sanitizeUrl(null)).toBeNull();
      expect(sanitizeUrl(undefined)).toBeNull();
      expect(sanitizeUrl('')).toBeNull();
      expect(sanitizeUrl('   ')).toBeNull();
    });
  });

  describe('getDisplayUrl', () => {
    it('should remove protocol from display URLs', () => {
      expect(getDisplayUrl('https://example.com')).toBe('example.com');
      expect(getDisplayUrl('http://example.com')).toBe('example.com');
    });

    it('should handle domain-only URLs', () => {
      expect(getDisplayUrl('example.com')).toBe('example.com');
    });

    it('should return null for unsafe URLs', () => {
      expect(getDisplayUrl('javascript:alert("xss")')).toBeNull();
      expect(getDisplayUrl('data:text/html,malicious')).toBeNull();
    });

    it('should return null for null/undefined values', () => {
      expect(getDisplayUrl(null)).toBeNull();
      expect(getDisplayUrl(undefined)).toBeNull();
    });
  });
});