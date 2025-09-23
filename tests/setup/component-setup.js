// Component-specific test setup
require('./jest.setup.js')

// Additional component testing utilities
import { configure } from '@testing-library/react'

// Configure testing library
configure({
  testIdAttribute: 'data-testid',
  computedStyleSupportsPseudoElements: true
})

// Mock React components that cause issues in tests
jest.mock('next/dynamic', () => (func) => {
  const DynamicComponent = (props) => {
    return func().then((mod) => mod.default(props))
  }
  DynamicComponent.displayName = 'DynamicComponent'
  return DynamicComponent
})

// Mock Recharts for component tests
jest.mock('recharts', () => ({
  ResponsiveContainer: ({ children }) => <div data-testid="responsive-container">{children}</div>,
  LineChart: ({ children }) => <div data-testid="line-chart">{children}</div>,
  Line: () => <div data-testid="line" />,
  XAxis: () => <div data-testid="x-axis" />,
  YAxis: () => <div data-testid="y-axis" />,
  CartesianGrid: () => <div data-testid="cartesian-grid" />,
  Tooltip: () => <div data-testid="tooltip" />,
  Legend: () => <div data-testid="legend" />,
  BarChart: ({ children }) => <div data-testid="bar-chart">{children}</div>,
  Bar: () => <div data-testid="bar" />,
  PieChart: ({ children }) => <div data-testid="pie-chart">{children}</div>,
  Pie: () => <div data-testid="pie" />,
  Cell: () => <div data-testid="cell" />
}))

// Mock date-fns for consistent testing
jest.mock('date-fns', () => ({
  format: jest.fn((date, formatStr) => {
    if (formatStr === 'yyyy-MM-dd') return '2024-01-01'
    if (formatStr === 'MMM dd, yyyy') return 'Jan 01, 2024'
    return '2024-01-01T00:00:00.000Z'
  }),
  isValid: jest.fn(() => true),
  parseISO: jest.fn((dateStr) => new Date(dateStr)),
  addDays: jest.fn((date, days) => new Date(date.getTime() + days * 24 * 60 * 60 * 1000)),
  subDays: jest.fn((date, days) => new Date(date.getTime() - days * 24 * 60 * 60 * 1000)),
  startOfDay: jest.fn((date) => new Date(date.getFullYear(), date.getMonth(), date.getDate())),
  endOfDay: jest.fn((date) => new Date(date.getFullYear(), date.getMonth(), date.getDate(), 23, 59, 59, 999))
}))

// Mock react-day-picker for date picker components
jest.mock('react-day-picker', () => ({
  DayPicker: ({ onSelect, selected }) => (
    <div
      data-testid="day-picker"
      onClick={() => onSelect?.(new Date('2024-01-01'))}
    >
      {selected?.toISOString() || 'No date selected'}
    </div>
  )
}))

// Enhanced window mocks for component testing
Object.defineProperty(window, 'scrollTo', {
  value: jest.fn(),
  writable: true
})

Object.defineProperty(window, 'getComputedStyle', {
  value: () => ({
    getPropertyValue: () => '',
    height: '100px',
    width: '100px'
  })
})

// Mock Radix UI components for easier testing
jest.mock('@radix-ui/react-dialog', () => ({
  Dialog: ({ children, open }) => open ? <div data-testid="dialog">{children}</div> : null,
  DialogContent: ({ children }) => <div data-testid="dialog-content">{children}</div>,
  DialogHeader: ({ children }) => <div data-testid="dialog-header">{children}</div>,
  DialogTitle: ({ children }) => <h1 data-testid="dialog-title">{children}</h1>,
  DialogTrigger: ({ children, asChild }) =>
    asChild ? children : <button data-testid="dialog-trigger">{children}</button>,
  DialogClose: ({ children }) => <button data-testid="dialog-close">{children}</button>
}))

jest.mock('@radix-ui/react-select', () => ({
  Select: ({ children, value, onValueChange }) => (
    <div data-testid="select" data-value={value}>
      {children}
    </div>
  ),
  SelectTrigger: ({ children }) => <button data-testid="select-trigger">{children}</button>,
  SelectValue: ({ placeholder }) => <span data-testid="select-value">{placeholder}</span>,
  SelectContent: ({ children }) => <div data-testid="select-content">{children}</div>,
  SelectItem: ({ children, value }) => (
    <div data-testid="select-item" data-value={value}>{children}</div>
  )
}))

// Add custom test utilities to global scope
global.testUtils = {
  ...global.testUtils,

  // Component-specific utilities
  findByDataTestId: (container, testId) => {
    return container.querySelector(`[data-testid="${testId}"]`)
  },

  findAllByDataTestId: (container, testId) => {
    return container.querySelectorAll(`[data-testid="${testId}"]`)
  },

  // Form testing helpers
  fillInput: async (user, testId, value) => {
    const input = document.querySelector(`[data-testid="${testId}"]`)
    if (input) {
      await user.clear(input)
      await user.type(input, value)
    }
  },

  selectOption: async (user, selectTestId, optionValue) => {
    const select = document.querySelector(`[data-testid="${selectTestId}"]`)
    if (select) {
      await user.click(select)
      const option = document.querySelector(`[data-value="${optionValue}"]`)
      if (option) {
        await user.click(option)
      }
    }
  },

  // Table testing helpers
  getTableRowCount: (tableTestId = 'table') => {
    const table = document.querySelector(`[data-testid="${tableTestId}"]`)
    return table ? table.querySelectorAll('tbody tr').length : 0
  },

  getTableCellValue: (tableTestId, rowIndex, cellIndex) => {
    const table = document.querySelector(`[data-testid="${tableTestId}"]`)
    if (table) {
      const rows = table.querySelectorAll('tbody tr')
      if (rows[rowIndex]) {
        const cells = rows[rowIndex].querySelectorAll('td')
        return cells[cellIndex]?.textContent?.trim() || ''
      }
    }
    return ''
  }
}