/**
 * Middleware Authorization Tests
 * Tests for global authorization enforcement in src/middleware.ts
 * 
 * Note: These tests verify the middleware logic. For full integration tests,
 * see tests/api/integration.test.ts or use E2E tests with Playwright.
 */

import { middleware } from '@/middleware'

// Mock Next.js request
function createMockRequest(url: string, method: string = 'GET', headers: Record<string, string> = {}): Request {
  return new Request(url, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...headers,
    },
  })
}

describe('Middleware Authorization', () => {
  beforeEach(() => {
    // Reset environment variables
    delete process.env.ALLOW_PUBLIC_GET_ENDPOINTS
    process.env.NODE_ENV = 'test'
  })

  describe('Public Endpoints', () => {
    it('should allow GET /api/health without authentication', () => {
      const request = createMockRequest('http://localhost:3000/api/health', 'GET')
      const response = middleware(request)
      
      expect(response).toBeInstanceOf(NextResponse)
      // Should not be 401
      expect((response as NextResponse).status).not.toBe(401)
    })

    it('should allow OPTIONS requests without authentication', () => {
      const request = createMockRequest('http://localhost:3000/api/suppliers', 'OPTIONS')
      const response = middleware(request)
      
      expect(response).toBeInstanceOf(NextResponse)
      expect((response as NextResponse).status).not.toBe(401)
    })
  })

  describe('Protected Endpoints', () => {
    it('should reject API requests without Authorization header', () => {
      const request = createMockRequest('http://localhost:3000/api/suppliers', 'GET')
      const response = middleware(request)
      
      expect(response).toBeInstanceOf(NextResponse)
      const json = JSON.parse((response as NextResponse).body?.toString() || '{}')
      expect(json.error).toBe('Authentication required')
      expect(json.code).toBe('NO_TOKEN')
    })

    it('should reject API requests with invalid Authorization header format', () => {
      const request = createMockRequest('http://localhost:3000/api/suppliers', 'GET', {
        Authorization: 'InvalidToken',
      })
      const response = middleware(request)
      
      expect(response).toBeInstanceOf(NextResponse)
      const json = JSON.parse((response as NextResponse).body?.toString() || '{}')
      expect(json.error).toBe('Authentication required')
    })

    it('should allow API requests with valid Bearer token', () => {
      const request = createMockRequest('http://localhost:3000/api/suppliers', 'GET', {
        Authorization: 'Bearer valid-token-here',
      })
      const response = middleware(request)
      
      expect(response).toBeInstanceOf(NextResponse)
      // Should pass through (not 401)
      expect((response as NextResponse).status).not.toBe(401)
    })

    it('should protect POST requests to API endpoints', () => {
      const request = createMockRequest('http://localhost:3000/api/inventory', 'POST')
      const response = middleware(request)
      
      expect(response).toBeInstanceOf(NextResponse)
      const json = JSON.parse((response as NextResponse).body?.toString() || '{}')
      expect(json.error).toBe('Authentication required')
    })

    it('should protect PUT requests to API endpoints', () => {
      const request = createMockRequest('http://localhost:3000/api/inventory/123', 'PUT')
      const response = middleware(request)
      
      expect(response).toBeInstanceOf(NextResponse)
      const json = JSON.parse((response as NextResponse).body?.toString() || '{}')
      expect(json.error).toBe('Authentication required')
    })

    it('should protect DELETE requests to API endpoints', () => {
      const request = createMockRequest('http://localhost:3000/api/inventory/123', 'DELETE')
      const response = middleware(request)
      
      expect(response).toBeInstanceOf(NextResponse)
      const json = JSON.parse((response as NextResponse).body?.toString() || '{}')
      expect(json.error).toBe('Authentication required')
    })
  })

  describe('Development Mode Allowlist', () => {
    beforeEach(() => {
      process.env.NODE_ENV = 'development'
    })

    it('should allow GET requests to allowlisted endpoints', () => {
      process.env.ALLOW_PUBLIC_GET_ENDPOINTS = '/api/test,/api/debug'
      const request = createMockRequest('http://localhost:3000/api/test', 'GET')
      const response = middleware(request)
      
      expect(response).toBeInstanceOf(NextResponse)
      expect((response as NextResponse).status).not.toBe(401)
    })

    it('should not allow POST requests even if endpoint is allowlisted', () => {
      process.env.ALLOW_PUBLIC_GET_ENDPOINTS = '/api/test'
      const request = createMockRequest('http://localhost:3000/api/test', 'POST')
      const response = middleware(request)
      
      expect(response).toBeInstanceOf(NextResponse)
      const json = JSON.parse((response as NextResponse).body?.toString() || '{}')
      expect(json.error).toBe('Authentication required')
    })

    it('should respect comma-separated allowlist', () => {
      process.env.ALLOW_PUBLIC_GET_ENDPOINTS = '/api/test,/api/debug,/api/health'
      const request1 = createMockRequest('http://localhost:3000/api/test', 'GET')
      const request2 = createMockRequest('http://localhost:3000/api/debug', 'GET')
      
      const response1 = middleware(request1)
      const response2 = middleware(request2)
      
      expect((response1 as NextResponse).status).not.toBe(401)
      expect((response2 as NextResponse).status).not.toBe(401)
    })
  })

  describe('Non-API Routes', () => {
    it('should allow non-API routes without authentication', () => {
      const request = createMockRequest('http://localhost:3000/', 'GET')
      const response = middleware(request)
      
      expect(response).toBeInstanceOf(NextResponse)
      expect((response as NextResponse).status).not.toBe(401)
    })

    it('should allow page routes without authentication', () => {
      const request = createMockRequest('http://localhost:3000/suppliers', 'GET')
      const response = middleware(request)
      
      expect(response).toBeInstanceOf(NextResponse)
      expect((response as NextResponse).status).not.toBe(401)
    })
  })
})

