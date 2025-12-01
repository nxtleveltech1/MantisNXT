import { middleware } from '@/middleware';
import { NextResponse } from 'next/server';

describe('global middleware', () => {
  const originalEnv = { ...process.env };

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  it('returns 401 when no Authorization header is present', () => {
    const request = new Request('https://example.com/api/protected');
    const response = middleware(request);

    expect(response.status).toBe(401);
  });

  it('allows GET requests on allow-listed prefixes in non-production', () => {
    process.env.NODE_ENV = 'development';
    process.env.ALLOW_PUBLIC_GET_ENDPOINTS = '/api/public';

    const request = new Request('https://example.com/api/public/health');
    const response = middleware(request);

    expect(response).toBeInstanceOf(NextResponse);
    expect(response.status).toBe(200);
  });

  it('allows requests with valid Authorization header', () => {
    const request = new Request('https://example.com/api/protected', {
      headers: { Authorization: 'Bearer test-token' },
    });

    const response = middleware(request);
    expect(response.status).toBe(200);
  });
});
