import '@testing-library/jest-dom'
import { server } from '../mocks/server'

// Mock IntersectionObserver
global.IntersectionObserver = class IntersectionObserver {
  constructor() {}
  disconnect() {}
  observe() {}
  unobserve() {}
}

// Mock ResizeObserver
global.ResizeObserver = class ResizeObserver {
  constructor() {}
  disconnect() {}
  observe() {}
  unobserve() {}
}

// Mock matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: jest.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: jest.fn(),
    removeListener: jest.fn(),
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
  })),
})

// Mock fetch
global.fetch = jest.fn()

// Mock XLSX for testing
jest.mock('xlsx', () => ({
  read: jest.fn(),
  utils: {
    sheet_to_json: jest.fn(),
  }
}))

// Mock Next.js router
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
    replace: jest.fn(),
    prefetch: jest.fn(),
    back: jest.fn(),
    forward: jest.fn(),
    refresh: jest.fn(),
  }),
  useSearchParams: () => new URLSearchParams(),
  usePathname: () => '/',
}))

// Mock Next.js image (using mock variables to avoid scope issues)
jest.mock('next/image', () => ({
  __esModule: true,
  default: (props) => {
    const mockReact = require('react')
    // eslint-disable-next-line @next/next/no-img-element, jsx-a11y/alt-text
    return mockReact.createElement('img', props)
  },
}))

// Setup MSW
beforeAll(() => server.listen({ onUnhandledRequest: 'error' }))
afterEach(() => server.resetHandlers())
afterAll(() => server.close())

// Global test utilities
global.testUtils = {
  // Utility to wait for async operations
  waitFor: async (assertion, timeout = 5000) => {
    const start = Date.now()
    while (Date.now() - start < timeout) {
      try {
        await assertion()
        return
      } catch (error) {
        await new Promise(resolve => setTimeout(resolve, 100))
      }
    }
    throw new Error(`Assertion timed out after ${timeout}ms`)
  },

  // Utility to generate test data
  generateInventoryItem: (overrides = {}) => ({
    id: `test_${Date.now()}`,
    sku: `TEST-SKU-${Math.random().toString(36).substring(7)}`,
    name: 'Test Item',
    description: 'Test item description',
    category: 'Test Category',
    currentStock: 10,
    reorderPoint: 5,
    maxStock: 100,
    minStock: 1,
    unitCost: 99.99,
    unitPrice: 129.99,
    currency: 'USD',
    unit: 'pcs',
    status: 'active',
    ...overrides
  })
}