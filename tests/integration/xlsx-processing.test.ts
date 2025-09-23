import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { NextJsXlsxConverter } from '@/components/inventory/NextJsXlsxConverter'
import { server } from '../mocks/server'
import { http, HttpResponse } from 'msw'
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

describe('XLSX Processing Integration', () => {
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

  describe('Complete XLSX Processing Workflow', () => {
    it('should process complete XLSX file from upload to validation', async () => {
      const user = userEvent.setup()

      // Mock XLSX processing with realistic data
      const mockWorkbook = {
        SheetNames: ['Supplier Data'],
        Sheets: {
          'Supplier Data': {}
        }
      }

      const mockData = [
        ['Supplier Name', 'Brand', 'Category', 'SKU', 'Description', 'Price', 'VAT Rate', 'Stock Qty'],
        ['Acme Corp', 'Acme', 'Electronics', 'ACME-001', 'Acme Widget Pro', 99.99, 15, 50],
        ['Beta Ltd', 'Beta', 'Hardware', 'BETA-002', 'Beta Tool Set', 149.50, 20, 25],
        ['Gamma Inc', 'Gamma', 'Software', 'GAMMA-003', 'Gamma Software License', 299.00, 0, 100]
      ]

      mockXLSX.read.mockReturnValue(mockWorkbook)
      mockXLSX.utils.sheet_to_json.mockReturnValue(mockData)
      mockFileReader.result = new ArrayBuffer(8)

      render(<NextJsXlsxConverter {...defaultProps} />)

      // Step 1: Open dialog
      await user.click(screen.getByRole('button', { name: /smart import/i }))
      expect(screen.getByRole('dialog')).toBeInTheDocument()

      // Step 2: Upload file
      const file = new File(['file content'], 'suppliers.xlsx', {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      })
      const fileInput = screen.getByDisplayValue('')

      Object.defineProperty(fileInput, 'files', {
        value: [file],
        writable: false,
      })

      fireEvent.change(fileInput)

      // Simulate FileReader completion
      if (mockFileReader.onload) {
        mockFileReader.onload({ target: { result: new ArrayBuffer(8) } } as any)
      }

      // Step 3: Wait for mapping interface
      await waitFor(() => {
        expect(screen.getByText(/smart field mapping/i)).toBeInTheDocument()
      }, { timeout: 5000 })

      // Verify semantic mapping was generated
      expect(screen.getByText(/ai confidence/i)).toBeInTheDocument()

      // Step 4: Process data
      const processButton = screen.getByRole('button', { name: /process data/i })
      expect(processButton).not.toBeDisabled()

      await user.click(processButton)

      // Step 5: Wait for validation results
      await waitFor(() => {
        expect(screen.getByText(/total rows/i)).toBeInTheDocument()
        expect(screen.getByText(/valid/i)).toBeInTheDocument()
      }, { timeout: 5000 })

      // Step 6: Apply processed data
      const applyButton = screen.getByRole('button', { name: /apply/i })
      expect(applyButton).not.toBeDisabled()

      await user.click(applyButton)

      // Verify callback was called with processed data
      await waitFor(() => {
        expect(mockOnDataProcessed).toHaveBeenCalledWith(
          expect.objectContaining({
            isValid: true,
            cleanedData: expect.arrayContaining([
              expect.objectContaining({
                supplier_name: 'Acme Corp',
                brand: 'Acme',
                category: 'Electronics',
                sku: 'ACME-001'
              })
            ])
          })
        )
      })
    })

    it('should handle validation errors and warnings properly', async () => {
      const user = userEvent.setup()

      // Mock XLSX data with errors
      const mockWorkbook = {
        SheetNames: ['Bad Data'],
        Sheets: { 'Bad Data': {} }
      }

      const mockDataWithErrors = [
        ['Supplier Name', 'Brand', 'Category', 'SKU', 'Description', 'Price', 'VAT Rate', 'Stock Qty'],
        ['Good Corp', 'Good', 'Electronics', 'GOOD-001', 'Good Product', 99.99, 15, 50],
        ['', 'Bad', 'Electronics', 'BAD-001', 'Missing Supplier', 99.99, 15, 50], // Missing supplier
        ['Error Corp', 'Error', 'Electronics', 'ERROR-001', 'Invalid Price', 'invalid', 15, 50], // Invalid price
        ['Duplicate Corp', 'Dup', 'Electronics', 'GOOD-001', 'Duplicate SKU', 79.99, 15, 30] // Duplicate SKU
      ]

      mockXLSX.read.mockReturnValue(mockWorkbook)
      mockXLSX.utils.sheet_to_json.mockReturnValue(mockDataWithErrors)
      mockFileReader.result = new ArrayBuffer(8)

      render(<NextJsXlsxConverter {...defaultProps} />)

      // Upload and process file
      await user.click(screen.getByRole('button', { name: /smart import/i }))

      const file = new File(['content'], 'bad-data.xlsx', {
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

      // Verify error display
      await waitFor(() => {
        expect(screen.getByText(/validation errors/i)).toBeInTheDocument()
        expect(screen.getByText(/warnings/i)).toBeInTheDocument()
      })

      // Check specific error messages
      expect(screen.getByText(/required field.*supplier_name.*missing/i)).toBeInTheDocument()
      expect(screen.getByText(/invalid.*price/i)).toBeInTheDocument()
      expect(screen.getByText(/duplicate sku/i)).toBeInTheDocument()

      // Verify summary counts
      expect(screen.getByText(/invalid/i)).toBeInTheDocument()
    })

    it('should handle large file processing with progress indicators', async () => {
      const user = userEvent.setup()

      // Mock large dataset
      const mockWorkbook = {
        SheetNames: ['Large Dataset'],
        Sheets: { 'Large Dataset': {} }
      }

      // Generate 1000 rows of data
      const headers = ['Supplier Name', 'Brand', 'Category', 'SKU', 'Description', 'Price', 'VAT Rate', 'Stock Qty']
      const mockLargeData = [headers]

      for (let i = 1; i <= 1000; i++) {
        mockLargeData.push([
          `Supplier ${i}`,
          `Brand ${i}`,
          'Electronics',
          `SKU-${i.toString().padStart(4, '0')}`,
          `Product ${i} Description`,
          (Math.random() * 1000 + 10).toFixed(2),
          15,
          Math.floor(Math.random() * 100 + 1)
        ])
      }

      mockXLSX.read.mockReturnValue(mockWorkbook)
      mockXLSX.utils.sheet_to_json.mockReturnValue(mockLargeData)
      mockFileReader.result = new ArrayBuffer(8)

      render(<NextJsXlsxConverter {...defaultProps} />)

      await user.click(screen.getByRole('button', { name: /smart import/i }))

      const file = new File(['large content'], 'large-dataset.xlsx', {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      })
      const fileInput = screen.getByDisplayValue('')

      Object.defineProperty(fileInput, 'files', {
        value: [file],
        writable: false,
      })

      fireEvent.change(fileInput)

      // Verify progress indicators appear
      await waitFor(() => {
        expect(screen.getByText(/reading file/i)).toBeInTheDocument()
      })

      if (mockFileReader.onload) {
        mockFileReader.onload({ target: { result: new ArrayBuffer(8) } } as any)
      }

      await waitFor(() => {
        expect(screen.getByText(/analyzing headers/i)).toBeInTheDocument()
      })

      await waitFor(() => {
        expect(screen.getByText(/generating semantic mapping/i)).toBeInTheDocument()
      })

      // Wait for completion
      await waitFor(() => {
        expect(screen.getByText(/complete/i)).toBeInTheDocument()
      }, { timeout: 10000 })

      // Process the large dataset
      const processButton = screen.getByRole('button', { name: /process data/i })
      await user.click(processButton)

      // Verify processing progress
      await waitFor(() => {
        expect(screen.getByText(/validating data/i)).toBeInTheDocument()
      })

      // Wait for validation completion
      await waitFor(() => {
        expect(screen.getByText(/1000/)).toBeInTheDocument() // Total rows
      }, { timeout: 15000 })
    })

    it('should maintain state across tab navigation', async () => {
      const user = userEvent.setup()

      const mockWorkbook = {
        SheetNames: ['Test Data'],
        Sheets: { 'Test Data': {} }
      }

      const mockData = [
        ['Supplier Name', 'Brand', 'Category', 'SKU', 'Description', 'Price', 'VAT Rate', 'Stock Qty'],
        ['Test Corp', 'Test', 'Electronics', 'TEST-001', 'Test Product', 99.99, 15, 50]
      ]

      mockXLSX.read.mockReturnValue(mockWorkbook)
      mockXLSX.utils.sheet_to_json.mockReturnValue(mockData)
      mockFileReader.result = new ArrayBuffer(8)

      render(<NextJsXlsxConverter {...defaultProps} />)

      await user.click(screen.getByRole('button', { name: /smart import/i }))

      // Upload file
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

      // Navigate to settings tab
      await user.click(screen.getByRole('tab', { name: /settings/i }))
      expect(screen.getByText(/configuration/i)).toBeInTheDocument()

      // Navigate back to mapping tab
      await user.click(screen.getByRole('tab', { name: /mapping/i }))
      expect(screen.getByText(/smart field mapping/i)).toBeInTheDocument()

      // Verify mapping state is preserved
      expect(screen.getByText(/ai confidence/i)).toBeInTheDocument()

      // Process data
      await user.click(screen.getByRole('button', { name: /process data/i }))

      await waitFor(() => {
        expect(screen.getByText(/total rows/i)).toBeInTheDocument()
      })

      // Navigate to upload tab and back to preview
      await user.click(screen.getByRole('tab', { name: /upload/i }))
      await user.click(screen.getByRole('tab', { name: /preview/i }))

      // Verify preview state is preserved
      expect(screen.getByText(/total rows/i)).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /apply/i })).not.toBeDisabled()
    })

    it('should handle supplier filtering correctly', async () => {
      const user = userEvent.setup()

      const mockWorkbook = {
        SheetNames: ['Mixed Suppliers'],
        Sheets: { 'Mixed Suppliers': {} }
      }

      const mockData = [
        ['Supplier Name', 'Brand', 'Category', 'SKU', 'Description', 'Price', 'VAT Rate', 'Stock Qty'],
        ['Acme Corp', 'Acme', 'Electronics', 'ACME-001', 'Acme Product', 99.99, 15, 50],
        ['Beta Ltd', 'Beta', 'Hardware', 'BETA-001', 'Beta Product', 149.99, 20, 25],
        ['Acme Corp', 'Acme', 'Software', 'ACME-002', 'Another Acme Product', 199.99, 15, 30]
      ]

      mockXLSX.read.mockReturnValue(mockWorkbook)
      mockXLSX.utils.sheet_to_json.mockReturnValue(mockData)
      mockFileReader.result = new ArrayBuffer(8)

      render(<NextJsXlsxConverter {...defaultProps} supplierFilter="Acme Corp" />)

      await user.click(screen.getByRole('button', { name: /smart import/i }))

      const file = new File(['content'], 'mixed-suppliers.xlsx', {
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
        // Should only show 2 valid rows (Acme Corp products), filtering out Beta Ltd
        expect(screen.getByText(/valid.*2/i)).toBeInTheDocument()
      })

      // Apply and verify filtered data
      await user.click(screen.getByRole('button', { name: /apply/i }))

      expect(mockOnDataProcessed).toHaveBeenCalledWith(
        expect.objectContaining({
          cleanedData: expect.arrayContaining([
            expect.objectContaining({ supplier_name: 'Acme Corp', sku: 'ACME-001' }),
            expect.objectContaining({ supplier_name: 'Acme Corp', sku: 'ACME-002' })
          ])
        })
      )

      // Verify Beta Ltd products are not included
      expect(mockOnDataProcessed).toHaveBeenCalledWith(
        expect.objectContaining({
          cleanedData: expect.not.arrayContaining([
            expect.objectContaining({ supplier_name: 'Beta Ltd' })
          ])
        })
      )
    })

    it('should handle semantic mapping edge cases', async () => {
      const user = userEvent.setup()

      // Mock data with unusual column names
      const mockWorkbook = {
        SheetNames: ['Unusual Headers'],
        Sheets: { 'Unusual Headers': {} }
      }

      const mockData = [
        ['Vendor', 'Manufacturer', 'Product Type', 'Item Code', 'Item Name', 'Cost', 'Tax %', 'In Stock'],
        ['Test Vendor', 'Test Manufacturer', 'Test Category', 'TEST-001', 'Test Item', 99.99, 15, 50]
      ]

      mockXLSX.read.mockReturnValue(mockWorkbook)
      mockXLSX.utils.sheet_to_json.mockReturnValue(mockData)
      mockFileReader.result = new ArrayBuffer(8)

      render(<NextJsXlsxConverter {...defaultProps} />)

      await user.click(screen.getByRole('button', { name: /smart import/i }))

      const file = new File(['content'], 'unusual-headers.xlsx', {
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

      // Verify semantic mapping found reasonable matches
      expect(screen.getByText(/ai confidence/i)).toBeInTheDocument()

      // Check that unusual headers are available in dropdowns
      const selectElements = screen.getAllByRole('combobox')
      expect(selectElements.length).toBeGreaterThan(0)

      // Manually adjust mappings if needed
      // This would test the manual mapping functionality

      await user.click(screen.getByRole('button', { name: /process data/i }))

      await waitFor(() => {
        expect(screen.getByText(/total rows/i)).toBeInTheDocument()
      })
    })
  })

  describe('Error Recovery', () => {
    it('should recover from processing errors and allow retry', async () => {
      const user = userEvent.setup()

      // Mock initial failure
      mockXLSX.read.mockImplementationOnce(() => {
        throw new Error('Processing failed')
      })

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

      fireEvent.change(fileInput)

      if (mockFileReader.onload) {
        mockFileReader.onload({ target: { result: new ArrayBuffer(8) } } as any)
      }

      await waitFor(() => {
        expect(window.alert).toHaveBeenCalledWith(expect.stringContaining('Error processing file'))
      })

      // Reset and try again with successful mock
      await user.click(screen.getByRole('button', { name: /reset/i }))

      const mockWorkbook = {
        SheetNames: ['Recovery Test'],
        Sheets: { 'Recovery Test': {} }
      }

      const mockData = [
        ['Supplier Name', 'Brand', 'Category', 'SKU', 'Description', 'Price', 'VAT Rate', 'Stock Qty'],
        ['Recovery Corp', 'Recovery', 'Electronics', 'REC-001', 'Recovery Product', 99.99, 15, 50]
      ]

      mockXLSX.read.mockReturnValue(mockWorkbook)
      mockXLSX.utils.sheet_to_json.mockReturnValue(mockData)

      const retryFile = new File(['retry content'], 'retry.xlsx', {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      })
      const retryFileInput = screen.getByDisplayValue('')

      Object.defineProperty(retryFileInput, 'files', {
        value: [retryFile],
        writable: false,
      })

      fireEvent.change(retryFileInput)

      if (mockFileReader.onload) {
        mockFileReader.onload({ target: { result: new ArrayBuffer(8) } } as any)
      }

      // Should now succeed
      await waitFor(() => {
        expect(screen.getByText(/smart field mapping/i)).toBeInTheDocument()
      })
    })
  })
})