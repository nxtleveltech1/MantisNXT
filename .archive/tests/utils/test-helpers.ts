import { render, RenderOptions, RenderResult } from '@testing-library/react'
import { ReactElement, ReactNode } from 'react'
import userEvent from '@testing-library/user-event'

// Test utilities and helpers

// Enhanced render function with providers
interface CustomRenderOptions extends Omit<RenderOptions, 'wrapper'> {
  providers?: ReactNode[]
  initialState?: any
}

export function renderWithProviders(
  ui: ReactElement,
  options: CustomRenderOptions = {}
): RenderResult & { user: ReturnType<typeof userEvent.setup> } {
  const { providers = [], initialState, ...renderOptions } = options

  function AllProviders({ children }: { children: ReactNode }) {
    return providers.reduce(
      (acc, Provider) => <Provider key={Provider}>{acc}</Provider>,
      children
    ) as ReactElement
  }

  const user = userEvent.setup()

  return {
    user,
    ...render(ui, {
      wrapper: providers.length > 0 ? AllProviders : undefined,
      ...renderOptions
    })
  }
}

// Mock data generators
export const mockApiResponse = (data: any, success = true, delay = 0) => {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve({
        ok: success,
        status: success ? 200 : 400,
        json: async () => ({
          success,
          data: success ? data : undefined,
          error: success ? undefined : 'API Error',
          message: success ? 'Success' : 'Request failed'
        })
      })
    }, delay)
  })
}

export const mockApiError = (status = 500, message = 'Server Error') => {
  return Promise.reject({
    status,
    message,
    response: {
      status,
      data: { error: message }
    }
  })
}

// Test data builders
export const buildTestUser = (overrides = {}) => ({
  id: 'test-user-1',
  email: 'test@example.com',
  firstName: 'Test',
  lastName: 'User',
  role: 'admin',
  organizationId: 'test-org-1',
  status: 'active',
  ...overrides
})

export const buildTestOrganization = (overrides = {}) => ({
  id: 'test-org-1',
  name: 'Test Organization',
  slug: 'test-org',
  domain: 'test.example.com',
  status: 'active',
  tier: 'enterprise',
  settings: {},
  ...overrides
})

// Form testing utilities
export const fillForm = async (
  user: ReturnType<typeof userEvent.setup>,
  formData: Record<string, string>
) => {
  for (const [fieldName, value] of Object.entries(formData)) {
    const field = document.querySelector(`[name="${fieldName}"]`) as HTMLInputElement
    if (field) {
      await user.clear(field)
      await user.type(field, value)
    }
  }
}

export const submitForm = async (
  user: ReturnType<typeof userEvent.setup>,
  formSelector = 'form'
) => {
  const form = document.querySelector(formSelector)
  if (form) {
    const submitButton = form.querySelector('[type="submit"]') as HTMLButtonElement
    if (submitButton) {
      await user.click(submitButton)
    }
  }
}

// Wait utilities
export const waitForApiCall = (mockFn: jest.MockedFunction<any>) => {
  return new Promise<void>((resolve) => {
    const checkCalls = () => {
      if (mockFn.mock.calls.length > 0) {
        resolve()
      } else {
        setTimeout(checkCalls, 10)
      }
    }
    checkCalls()
  })
}

export const waitForElement = (selector: string, timeout = 5000) => {
  return new Promise<Element>((resolve, reject) => {
    const startTime = Date.now()

    const check = () => {
      const element = document.querySelector(selector)
      if (element) {
        resolve(element)
      } else if (Date.now() - startTime > timeout) {
        reject(new Error(`Element ${selector} not found within ${timeout}ms`))
      } else {
        setTimeout(check, 100)
      }
    }

    check()
  })
}

// Table testing utilities
export const getTableData = (tableSelector = 'table') => {
  const table = document.querySelector(tableSelector) as HTMLTableElement
  if (!table) return []

  const rows = Array.from(table.querySelectorAll('tbody tr'))
  return rows.map(row => {
    const cells = Array.from(row.querySelectorAll('td'))
    return cells.map(cell => cell.textContent?.trim() || '')
  })
}

export const getTableHeaders = (tableSelector = 'table') => {
  const table = document.querySelector(tableSelector) as HTMLTableElement
  if (!table) return []

  const headerCells = Array.from(table.querySelectorAll('thead th'))
  return headerCells.map(cell => cell.textContent?.trim() || '')
}

export const sortTable = async (
  user: ReturnType<typeof userEvent.setup>,
  columnIndex: number,
  tableSelector = 'table'
) => {
  const table = document.querySelector(tableSelector) as HTMLTableElement
  const headerCells = table.querySelectorAll('thead th')
  const targetHeader = headerCells[columnIndex] as HTMLElement

  if (targetHeader) {
    await user.click(targetHeader)
  }
}

// File upload utilities
export const createMockFile = (
  content: string | Buffer,
  filename: string,
  type: string
) => {
  const file = new File([content], filename, { type })
  return file
}

export const uploadFile = async (
  user: ReturnType<typeof userEvent.setup>,
  file: File,
  inputSelector = 'input[type="file"]'
) => {
  const input = document.querySelector(inputSelector) as HTMLInputElement
  if (input) {
    await user.upload(input, file)
  }
}

// Navigation utilities
export const mockRouter = {
  push: jest.fn(),
  replace: jest.fn(),
  back: jest.fn(),
  forward: jest.fn(),
  refresh: jest.fn(),
  prefetch: jest.fn()
}

export const mockSearchParams = (params: Record<string, string> = {}) => {
  const searchParams = new URLSearchParams(params)
  return searchParams
}

// Local storage utilities
export const mockLocalStorage = () => {
  const storage: Record<string, string> = {}

  return {
    getItem: jest.fn((key: string) => storage[key] || null),
    setItem: jest.fn((key: string, value: string) => {
      storage[key] = value
    }),
    removeItem: jest.fn((key: string) => {
      delete storage[key]
    }),
    clear: jest.fn(() => {
      Object.keys(storage).forEach(key => delete storage[key])
    }),
    length: Object.keys(storage).length
  }
}

// Error boundary testing
export const throwError = (message = 'Test error') => {
  throw new Error(message)
}

export const ErrorThrowingComponent = ({ shouldThrow = false, message = 'Test error' }) => {
  if (shouldThrow) {
    throw new Error(message)
  }
  return <div>No error</div>
}

// Performance testing utilities
export const measureRenderTime = (renderFn: () => void) => {
  const start = performance.now()
  renderFn()
  const end = performance.now()
  return end - start
}

export const measureAsyncOperation = async <T>(operation: () => Promise<T>) => {
  const start = performance.now()
  const result = await operation()
  const end = performance.now()
  return {
    result,
    duration: end - start
  }
}

// Accessibility testing utilities
export const checkAccessibility = (element: HTMLElement) => {
  const issues: string[] = []

  // Check for alt text on images
  const images = element.querySelectorAll('img')
  images.forEach((img, index) => {
    if (!img.alt && !img.getAttribute('aria-label')) {
      issues.push(`Image ${index + 1} missing alt text`)
    }
  })

  // Check for proper heading hierarchy
  const headings = Array.from(element.querySelectorAll('h1, h2, h3, h4, h5, h6'))
  let lastLevel = 0
  headings.forEach((heading, index) => {
    const level = parseInt(heading.tagName.charAt(1))
    if (level > lastLevel + 1) {
      issues.push(`Heading level skipped at heading ${index + 1}`)
    }
    lastLevel = level
  })

  // Check for proper label associations
  const inputs = element.querySelectorAll('input, select, textarea')
  inputs.forEach((input, index) => {
    const hasLabel = input.getAttribute('aria-label') ||
                    input.getAttribute('aria-labelledby') ||
                    element.querySelector(`label[for="${input.id}"]`)
    if (!hasLabel) {
      issues.push(`Input ${index + 1} missing proper label`)
    }
  })

  return issues
}

// Animation testing utilities
export const disableAnimations = () => {
  const style = document.createElement('style')
  style.innerHTML = `
    *, *::before, *::after {
      animation-duration: 0s !important;
      animation-delay: 0s !important;
      transition-duration: 0s !important;
      transition-delay: 0s !important;
    }
  `
  document.head.appendChild(style)
  return () => document.head.removeChild(style)
}

// Viewport utilities
export const setViewport = (width: number, height: number) => {
  Object.defineProperty(window, 'innerWidth', {
    writable: true,
    configurable: true,
    value: width,
  })
  Object.defineProperty(window, 'innerHeight', {
    writable: true,
    configurable: true,
    value: height,
  })
  window.dispatchEvent(new Event('resize'))
}

export const VIEWPORTS = {
  mobile: [375, 667],
  tablet: [768, 1024],
  desktop: [1920, 1080],
  wide: [2560, 1440]
} as const

// Test data cleanup
export const cleanupTestData = async () => {
  // Clear localStorage
  window.localStorage.clear()

  // Clear sessionStorage
  window.sessionStorage.clear()

  // Clear any pending timers
  jest.clearAllTimers()

  // Reset all mocks
  jest.clearAllMocks()
}

// Database testing utilities
export const truncateTable = async (client: any, tableName: string) => {
  await client.query(`TRUNCATE TABLE ${tableName} RESTART IDENTITY CASCADE`)
}

export const resetSequences = async (client: any, tableNames: string[]) => {
  for (const tableName of tableNames) {
    await client.query(`ALTER SEQUENCE ${tableName}_id_seq RESTART WITH 1`)
  }
}

// API testing utilities
export const createApiTestContext = () => {
  const mockRequest = (method: string, url: string, data?: any) => ({
    method,
    url,
    headers: {},
    body: data ? JSON.stringify(data) : undefined,
    json: () => Promise.resolve(data),
    formData: () => Promise.resolve(new FormData())
  })

  const mockResponse = (data: any, status = 200) => ({
    status,
    ok: status >= 200 && status < 300,
    json: () => Promise.resolve(data),
    text: () => Promise.resolve(JSON.stringify(data))
  })

  return { mockRequest, mockResponse }
}

// Test environment detection
export const isTestEnvironment = () => process.env.NODE_ENV === 'test'
export const isE2EEnvironment = () => process.env.NODE_ENV === 'e2e'
export const isCIEnvironment = () => process.env.CI === 'true'

// Re-export commonly used testing utilities
export * from '@testing-library/react'
export { userEvent }
export { default as userEvent } from '@testing-library/user-event'