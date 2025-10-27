// API-specific test setup
require('./jest.setup.js')

// Mock database connections for API tests
jest.mock('pg', () => ({
  Client: jest.fn().mockImplementation(() => ({
    connect: jest.fn().mockResolvedValue(undefined),
    end: jest.fn().mockResolvedValue(undefined),
    query: jest.fn().mockResolvedValue({ rows: [], rowCount: 0 })
  }))
}))

// Mock Next.js API utilities
jest.mock('next/server', () => ({
  NextRequest: jest.fn().mockImplementation((url, options) => ({
    url,
    method: options?.method || 'GET',
    headers: new Headers(options?.headers || {}),
    json: jest.fn().mockResolvedValue(options?.body ? JSON.parse(options.body) : {}),
    formData: jest.fn().mockResolvedValue(new FormData())
  })),
  NextResponse: {
    json: jest.fn().mockImplementation((body, options) => ({
      status: options?.status || 200,
      json: jest.fn().mockResolvedValue(body)
    }))
  }
}))

// Mock environment variables for API tests
process.env.NODE_ENV = 'test'
process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/test'
process.env.TEST_DB_HOST = 'localhost'
process.env.TEST_DB_PORT = '5432'
process.env.TEST_DB_NAME = 'mantis_test'
process.env.TEST_DB_USER = 'postgres'
process.env.TEST_DB_PASSWORD = 'postgres'