// Integration test setup
require('./api-setup.js')

const { setupTestDatabase, teardownTestDatabase, resetTestData } = require('./database.setup')

// Extended timeout for integration tests
jest.setTimeout(30000)

// Global setup for integration tests
beforeAll(async () => {
  try {
    // Only setup database if not already done
    if (!global.__DATABASE_SETUP__) {
      await setupTestDatabase()
      global.__DATABASE_SETUP__ = true
    }
  } catch (error) {
    console.error('Integration test setup failed:', error)
    throw error
  }
})

// Clean data between tests
beforeEach(async () => {
  try {
    await resetTestData()
  } catch (error) {
    console.warn('Test data reset failed:', error)
  }
})

// Cleanup after all tests
afterAll(async () => {
  try {
    if (global.__DATABASE_SETUP__) {
      await teardownTestDatabase()
      global.__DATABASE_SETUP__ = false
    }
  } catch (error) {
    console.error('Integration test teardown failed:', error)
  }
})

// Mock external API calls for integration tests
global.fetch = jest.fn()

// Default fetch mock for successful responses
const mockFetch = (response = { success: true, data: [] }, status = 200) => {
  global.fetch.mockResolvedValueOnce({
    ok: status >= 200 && status < 300,
    status,
    json: async () => response,
    text: async () => JSON.stringify(response),
    headers: new Headers({ 'Content-Type': 'application/json' })
  })
}

// Export utilities for integration tests
global.integrationUtils = {
  mockFetch,

  mockApiSuccess: (data = {}) => mockFetch({ success: true, data }, 200),
  mockApiError: (error = 'API Error', status = 500) => mockFetch({ success: false, error }, status),

  // Database utilities
  async cleanDatabase() {
    await resetTestData()
  },

  // File upload utilities
  createMockFormData: (file, fieldName = 'file') => {
    const formData = new FormData()
    formData.append(fieldName, file)
    return formData
  },

  createMockFile: (content, filename, type = 'text/plain') => {
    return new File([content], filename, { type })
  },

  // API testing utilities
  async testApiEndpoint(method, url, payload) {
    const options = {
      method,
      headers: { 'Content-Type': 'application/json' }
    }

    if (payload) {
      options.body = JSON.stringify(payload)
    }

    return await fetch(url, options)
  },

  // Performance testing utilities
  async measureApiPerformance(apiCall, threshold = 1000) {
    const start = performance.now()
    const result = await apiCall()
    const duration = performance.now() - start

    expect(duration).toBeLessThan(threshold)
    return { result, duration }
  }
}

// Mock Redis for caching tests
jest.mock('redis', () => ({
  createClient: jest.fn(() => ({
    connect: jest.fn().mockResolvedValue(undefined),
    disconnect: jest.fn().mockResolvedValue(undefined),
    get: jest.fn().mockResolvedValue(null),
    set: jest.fn().mockResolvedValue('OK'),
    del: jest.fn().mockResolvedValue(1),
    exists: jest.fn().mockResolvedValue(0),
    expire: jest.fn().mockResolvedValue(1),
    flushAll: jest.fn().mockResolvedValue('OK')
  }))
}))

// Mock email service for notification tests
jest.mock('nodemailer', () => ({
  createTransporter: jest.fn(() => ({
    sendMail: jest.fn().mockResolvedValue({
      messageId: 'test-message-id',
      accepted: ['test@example.com'],
      rejected: []
    })
  }))
}))

// Mock file system operations for upload tests
const fs = require('fs')
const path = require('path')

// Ensure test upload directory exists
const testUploadDir = path.join(process.cwd(), 'tests', 'temp')
if (!fs.existsSync(testUploadDir)) {
  fs.mkdirSync(testUploadDir, { recursive: true })
}

// Cleanup temp files after tests
afterEach(() => {
  try {
    const files = fs.readdirSync(testUploadDir)
    files.forEach(file => {
      if (file.startsWith('test-')) {
        fs.unlinkSync(path.join(testUploadDir, file))
      }
    })
  } catch (error) {
    // Ignore cleanup errors
  }
})

// Mock AWS SDK for cloud storage tests
jest.mock('aws-sdk', () => ({
  S3: jest.fn(() => ({
    upload: jest.fn().mockReturnValue({
      promise: jest.fn().mockResolvedValue({
        Location: 'https://bucket.s3.amazonaws.com/test-key',
        Key: 'test-key',
        Bucket: 'test-bucket'
      })
    }),
    deleteObject: jest.fn().mockReturnValue({
      promise: jest.fn().mockResolvedValue({})
    }),
    getObject: jest.fn().mockReturnValue({
      promise: jest.fn().mockResolvedValue({
        Body: Buffer.from('test content')
      })
    })
  }))
}))

// Add integration-specific environment variables
process.env.NODE_ENV = 'test'
process.env.INTEGRATION_TEST = 'true'
process.env.LOG_LEVEL = 'error' // Reduce logging noise
process.env.DISABLE_RATE_LIMITING = 'true'
process.env.SKIP_EMAIL_SENDING = 'true'