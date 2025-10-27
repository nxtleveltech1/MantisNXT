import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { NextJsXlsxConverter } from '@/components/inventory/NextJsXlsxConverter'
import * as XLSX from 'xlsx'

// Mock XLSX
jest.mock('xlsx')
const mockXLSX = XLSX as jest.Mocked<typeof XLSX>

// Mock file reading
const mockFileReader = {
  readAsArrayBuffer: jest.fn(),
  result: null,
  onload: null,
  onerror: null
}

Object.defineProperty(global, 'FileReader', {
  writable: true,
  value: jest.fn(() => mockFileReader)
})

describe('NextJsXlsxConverter', () => {
  const mockOnDataProcessed = jest.fn()

  beforeEach(() => {
    jest.clearAllMocks()
    mockFileReader.readAsArrayBuffer.mockClear()
  })

  const defaultProps = {
    onDataProcessed: mockOnDataProcessed,
    requiredFields: ['supplier_name', 'brand', 'category', 'sku', 'description', 'price', 'vat_rate', 'stock_qty'],
    allowedFileTypes: ['.xlsx', '.xls', '.csv'],
    maxFileSize: 10
  }

  describe('Initial State', () => {
    it('should render trigger button when closed', () => {
      render(<NextJsXlsxConverter {...defaultProps} />)

      expect(screen.getByRole('button', { name: /smart import/i })).toBeInTheDocument()
    })

    it('should open dialog when trigger button is clicked', async () => {
      const user = userEvent.setup()
      render(<NextJsXlsxConverter {...defaultProps} />)

      await user.click(screen.getByRole('button', { name: /smart import/i }))

      expect(screen.getByRole('dialog')).toBeInTheDocument()
      expect(screen.getByText(/advanced xlsx converter/i)).toBeInTheDocument()
    })

    it('should render all tabs in correct order', async () => {
      const user = userEvent.setup()
      render(<NextJsXlsxConverter {...defaultProps} />)

      await user.click(screen.getByRole('button', { name: /smart import/i }))

      expect(screen.getByRole('tab', { name: /upload/i })).toBeInTheDocument()
      expect(screen.getByRole('tab', { name: /mapping/i })).toBeInTheDocument()
      expect(screen.getByRole('tab', { name: /preview/i })).toBeInTheDocument()
      expect(screen.getByRole('tab', { name: /settings/i })).toBeInTheDocument()
    })
  })

  describe('File Upload', () => {
    it('should show file upload area in upload tab', async () => {
      const user = userEvent.setup()
      render(<NextJsXlsxConverter {...defaultProps} />)

      await user.click(screen.getByRole('button', { name: /smart import/i }))

      expect(screen.getByText(/upload your supplier data file/i)).toBeInTheDocument()
      expect(screen.getByText(/supports excel.*csv files/i)).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /choose file/i })).toBeInTheDocument()
    })

    it('should accept valid file types', async () => {
      const user = userEvent.setup()
      render(<NextJsXlsxConverter {...defaultProps} />)

      await user.click(screen.getByRole('button', { name: /smart import/i }))

      const fileInput = screen.getByDisplayValue('') as HTMLInputElement
      expect(fileInput.accept).toBe('.xlsx,.xls,.csv')
    })

    it('should process valid XLSX file', async () => {
      const user = userEvent.setup()

      // Mock XLSX processing
      const mockWorkbook = {
        SheetNames: ['Sheet1'],
        Sheets: {
          Sheet1: {}
        }
      }

      const mockData = [
        ['Supplier Name', 'Brand', 'Category', 'SKU', 'Description', 'Price', 'VAT Rate', 'Stock Qty'],
        ['Acme Corp', 'Acme', 'Electronics', 'ACME-001', 'Acme Widget', 99.99, 15, 50]
      ]

      mockXLSX.read.mockReturnValue(mockWorkbook)
      mockXLSX.utils.sheet_to_json.mockReturnValue(mockData)

      render(<NextJsXlsxConverter {...defaultProps} />)

      await user.click(screen.getByRole('button', { name: /smart import/i }))

      // Create a mock file
      const file = new File(['file content'], 'test.xlsx', { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
      const fileInput = screen.getByDisplayValue('')

      // Simulate file selection
      Object.defineProperty(fileInput, 'files', {
        value: [file],
        writable: false,
      })

      // Mock FileReader
      mockFileReader.result = new ArrayBuffer(8)

      fireEvent.change(fileInput)

      // Simulate FileReader onload
      if (mockFileReader.onload) {
        mockFileReader.onload({ target: { result: new ArrayBuffer(8) } } as any)
      }

      await waitFor(() => {
        expect(mockXLSX.read).toHaveBeenCalled()
        expect(mockXLSX.utils.sheet_to_json).toHaveBeenCalled()
      })
    })

    it('should show error for oversized file', async () => {
      const user = userEvent.setup()

      // Mock window.alert
      window.alert = jest.fn()

      render(<NextJsXlsxConverter {...defaultProps} maxFileSize={1} />)

      await user.click(screen.getByRole('button', { name: /smart import/i }))

      // Create a large mock file (2MB, exceeding 1MB limit)
      const largeFile = new File(['x'.repeat(2 * 1024 * 1024)], 'large.xlsx', {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      })

      const fileInput = screen.getByDisplayValue('')

      Object.defineProperty(fileInput, 'files', {
        value: [largeFile],
        writable: false,
      })

      fireEvent.change(fileInput)

      expect(window.alert).toHaveBeenCalledWith('File size exceeds 1MB limit')
    })

    it('should show error for invalid file type', async () => {
      const user = userEvent.setup()

      window.alert = jest.fn()

      render(<NextJsXlsxConverter {...defaultProps} />)

      await user.click(screen.getByRole('button', { name: /smart import/i }))

      const invalidFile = new File(['content'], 'test.txt', { type: 'text/plain' })
      const fileInput = screen.getByDisplayValue('')

      Object.defineProperty(fileInput, 'files', {
        value: [invalidFile],
        writable: false,
      })

      fireEvent.change(fileInput)

      expect(window.alert).toHaveBeenCalledWith('File type not supported. Allowed types: .xlsx, .xls, .csv')
    })

    it('should show processing progress during file upload', async () => {
      const user = userEvent.setup()

      // Mock a slow XLSX read operation
      mockXLSX.read.mockImplementation(() => {
        return new Promise(resolve => {
          setTimeout(() => resolve({
            SheetNames: ['Sheet1'],
            Sheets: { Sheet1: {} }
          }), 100)
        }) as any
      })

      render(<NextJsXlsxConverter {...defaultProps} />)

      await user.click(screen.getByRole('button', { name: /smart import/i }))

      const file = new File(['content'], 'test.xlsx', {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      })
      const fileInput = screen.getByDisplayValue('')

      Object.defineProperty(fileInput, 'files', {
        value: [file],
        writable: false,
      })

      fireEvent.change(fileInput)

      // Should show progress indicator
      await waitFor(() => {
        expect(screen.getByText(/reading file/i)).toBeInTheDocument()
      })
    })
  })

  describe('Semantic Mapping', () => {
    beforeEach(async () => {
      // Setup file upload state
      const mockWorkbook = {
        SheetNames: ['Sheet1'],
        Sheets: { Sheet1: {} }
      }

      const mockData = [
        ['Supplier Name', 'Brand', 'Category', 'SKU', 'Description', 'Price', 'VAT Rate', 'Stock Qty'],
        ['Acme Corp', 'Acme', 'Electronics', 'ACME-001', 'Acme Widget', 99.99, 15, 50]
      ]

      mockXLSX.read.mockReturnValue(mockWorkbook)
      mockXLSX.utils.sheet_to_json.mockReturnValue(mockData)
      mockFileReader.result = new ArrayBuffer(8)
    })

    it('should show mapping interface after file upload', async () => {
      const user = userEvent.setup()
      render(<NextJsXlsxConverter {...defaultProps} />)

      await user.click(screen.getByRole('button', { name: /smart import/i }))

      const file = new File(['content'], 'test.xlsx', {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      })
      const fileInput = screen.getByDisplayValue('')

      Object.defineProperty(fileInput, 'files', {
        value: [file],
        writable: false,
      })

      fireEvent.change(fileInput)

      if (mockFileReader.onload) {
        mockFileReader.onload({ target: { result: new ArrayBuffer(8) } } as any)
      }

      await waitFor(() => {
        expect(screen.getByText(/smart field mapping/i)).toBeInTheDocument()
      })
    })

    it('should show AI confidence score', async () => {
      const user = userEvent.setup()
      render(<NextJsXlsxConverter {...defaultProps} />)

      await user.click(screen.getByRole('button', { name: /smart import/i }))

      const file = new File(['content'], 'test.xlsx', {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      })
      const fileInput = screen.getByDisplayValue('')

      Object.defineProperty(fileInput, 'files', {
        value: [file],
        writable: false,
      })

      fireEvent.change(fileInput)

      if (mockFileReader.onload) {
        mockFileReader.onload({ target: { result: new ArrayBuffer(8) } } as any)
      }

      await waitFor(() => {
        expect(screen.getByText(/ai confidence/i)).toBeInTheDocument()
      })
    })

    it('should allow manual field mapping adjustment', async () => {
      const user = userEvent.setup()
      render(<NextJsXlsxConverter {...defaultProps} />)

      await user.click(screen.getByRole('button', { name: /smart import/i }))

      const file = new File(['content'], 'test.xlsx', {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      })
      const fileInput = screen.getByDisplayValue('')

      Object.defineProperty(fileInput, 'files', {
        value: [file],
        writable: false,
      })

      fireEvent.change(fileInput)

      if (mockFileReader.onload) {
        mockFileReader.onload({ target: { result: new ArrayBuffer(8) } } as any)
      }

      await waitFor(() => {
        const selectElements = screen.getAllByRole('combobox')
        expect(selectElements.length).toBeGreaterThan(0)
      })
    })

    it('should show mapping completion progress', async () => {
      const user = userEvent.setup()
      render(<NextJsXlsxConverter {...defaultProps} />)

      await user.click(screen.getByRole('button', { name: /smart import/i }))

      const file = new File(['content'], 'test.xlsx', {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      })
      const fileInput = screen.getByDisplayValue('')

      Object.defineProperty(fileInput, 'files', {
        value: [file],
        writable: false,
      })

      fireEvent.change(fileInput)

      if (mockFileReader.onload) {
        mockFileReader.onload({ target: { result: new ArrayBuffer(8) } } as any)
      }

      await waitFor(() => {
        expect(screen.getByText(/complete/i)).toBeInTheDocument()
      })
    })

    it('should enable process data button when mapping is complete', async () => {
      const user = userEvent.setup()
      render(<NextJsXlsxConverter {...defaultProps} />)

      await user.click(screen.getByRole('button', { name: /smart import/i }))

      const file = new File(['content'], 'test.xlsx', {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      })
      const fileInput = screen.getByDisplayValue('')

      Object.defineProperty(fileInput, 'files', {
        value: [file],
        writable: false,
      })

      fireEvent.change(fileInput)

      if (mockFileReader.onload) {
        mockFileReader.onload({ target: { result: new ArrayBuffer(8) } } as any)
      }

      await waitFor(() => {
        const processButton = screen.getByRole('button', { name: /process data/i })
        expect(processButton).not.toBeDisabled()
      })
    })
  })

  describe('Data Preview', () => {
    it('should show validation results after processing', async () => {
      const user = userEvent.setup()
      render(<NextJsXlsxConverter {...defaultProps} />)

      await user.click(screen.getByRole('button', { name: /smart import/i }))

      // Complete file upload and mapping setup
      const file = new File(['content'], 'test.xlsx', {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      })
      const fileInput = screen.getByDisplayValue('')

      Object.defineProperty(fileInput, 'files', {
        value: [file],
        writable: false,
      })

      fireEvent.change(fileInput)

      if (mockFileReader.onload) {
        mockFileReader.onload({ target: { result: new ArrayBuffer(8) } } as any)
      }

      await waitFor(() => {
        const processButton = screen.getByRole('button', { name: /process data/i })
        expect(processButton).not.toBeDisabled()
      })

      // Click process data
      await user.click(screen.getByRole('button', { name: /process data/i }))

      await waitFor(() => {
        expect(screen.getByText(/total rows/i)).toBeInTheDocument()
        expect(screen.getByText(/valid/i)).toBeInTheDocument()
      })
    })

    it('should show apply button when data is valid', async () => {
      const user = userEvent.setup()
      render(<NextJsXlsxConverter {...defaultProps} />)

      await user.click(screen.getByRole('button', { name: /smart import/i }))

      // Complete the flow to preview tab
      const file = new File(['content'], 'test.xlsx', {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      })
      const fileInput = screen.getByDisplayValue('')

      Object.defineProperty(fileInput, 'files', {
        value: [file],
        writable: false,
      })

      fireEvent.change(fileInput)

      if (mockFileReader.onload) {
        mockFileReader.onload({ target: { result: new ArrayBuffer(8) } } as any)
      }

      await waitFor(() => {
        const processButton = screen.getByRole('button', { name: /process data/i })
        return user.click(processButton)
      })

      await waitFor(() => {
        const applyButton = screen.getByRole('button', { name: /apply/i })
        expect(applyButton).not.toBeDisabled()
      })
    })

    it('should call onDataProcessed when apply is clicked', async () => {
      const user = userEvent.setup()
      render(<NextJsXlsxConverter {...defaultProps} />)

      await user.click(screen.getByRole('button', { name: /smart import/i }))

      // Complete the flow
      const file = new File(['content'], 'test.xlsx', {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      })
      const fileInput = screen.getByDisplayValue('')

      Object.defineProperty(fileInput, 'files', {
        value: [file],
        writable: false,
      })

      fireEvent.change(fileInput)

      if (mockFileReader.onload) {
        mockFileReader.onload({ target: { result: new ArrayBuffer(8) } } as any)
      }

      await waitFor(() => {
        return user.click(screen.getByRole('button', { name: /process data/i }))
      })

      await waitFor(() => {
        return user.click(screen.getByRole('button', { name: /apply/i }))
      })

      expect(mockOnDataProcessed).toHaveBeenCalled()
    })
  })

  describe('Settings Tab', () => {
    it('should show configuration options', async () => {
      const user = userEvent.setup()
      render(<NextJsXlsxConverter {...defaultProps} />)

      await user.click(screen.getByRole('button', { name: /smart import/i }))
      await user.click(screen.getByRole('tab', { name: /settings/i }))

      expect(screen.getByText(/configuration/i)).toBeInTheDocument()
      expect(screen.getByText(/supplier filter/i)).toBeInTheDocument()
      expect(screen.getByText(/max file size/i)).toBeInTheDocument()
      expect(screen.getByText(/required fields/i)).toBeInTheDocument()
    })
  })

  describe('Reset Functionality', () => {
    it('should reset state when reset button is clicked', async () => {
      const user = userEvent.setup()
      render(<NextJsXlsxConverter {...defaultProps} />)

      await user.click(screen.getByRole('button', { name: /smart import/i }))

      // Complete file upload
      const file = new File(['content'], 'test.xlsx', {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      })
      const fileInput = screen.getByDisplayValue('')

      Object.defineProperty(fileInput, 'files', {
        value: [file],
        writable: false,
      })

      fireEvent.change(fileInput)

      if (mockFileReader.onload) {
        mockFileReader.onload({ target: { result: new ArrayBuffer(8) } } as any)
      }

      await waitFor(() => {
        expect(screen.getByText(/smart field mapping/i)).toBeInTheDocument()
      })

      // Click reset
      await user.click(screen.getByRole('button', { name: /reset/i }))

      // Should be back to upload tab
      expect(screen.getByText(/upload your supplier data file/i)).toBeInTheDocument()
    })
  })

  describe('Error Handling', () => {
    it('should handle file reading errors gracefully', async () => {
      const user = userEvent.setup()

      // Mock console.error to check if error is logged
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation()
      window.alert = jest.fn()

      render(<NextJsXlsxConverter {...defaultProps} />)

      await user.click(screen.getByRole('button', { name: /smart import/i }))

      const file = new File(['content'], 'test.xlsx', {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      })
      const fileInput = screen.getByDisplayValue('')

      Object.defineProperty(fileInput, 'files', {
        value: [file],
        writable: false,
      })

      // Simulate error during file reading
      mockXLSX.read.mockImplementation(() => {
        throw new Error('File reading failed')
      })

      fireEvent.change(fileInput)

      if (mockFileReader.onload) {
        mockFileReader.onload({ target: { result: new ArrayBuffer(8) } } as any)
      }

      await waitFor(() => {
        expect(window.alert).toHaveBeenCalledWith(expect.stringContaining('Error processing file'))
      })

      consoleSpy.mockRestore()
    })

    it('should handle empty file gracefully', async () => {
      const user = userEvent.setup()
      window.alert = jest.fn()

      // Mock XLSX to return empty data
      mockXLSX.read.mockReturnValue({
        SheetNames: ['Sheet1'],
        Sheets: { Sheet1: {} }
      })
      mockXLSX.utils.sheet_to_json.mockReturnValue([])

      render(<NextJsXlsxConverter {...defaultProps} />)

      await user.click(screen.getByRole('button', { name: /smart import/i }))

      const file = new File(['content'], 'test.xlsx', {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      })
      const fileInput = screen.getByDisplayValue('')

      Object.defineProperty(fileInput, 'files', {
        value: [file],
        writable: false,
      })

      fireEvent.change(fileInput)

      if (mockFileReader.onload) {
        mockFileReader.onload({ target: { result: new ArrayBuffer(8) } } as any)
      }

      await waitFor(() => {
        expect(window.alert).toHaveBeenCalledWith(expect.stringContaining('at least a header row'))
      })
    })
  })
})