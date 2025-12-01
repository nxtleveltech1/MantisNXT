import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { PricelistUploadWizard } from '@/components/inventory/PricelistUploadWizard';
import { createTestXLSXBuffer, createBulkUploadScenario } from '../../fixtures/factories';
import * as XLSX from 'xlsx';

// Mock XLSX library
jest.mock('xlsx', () => ({
  read: jest.fn(),
  utils: {
    sheet_to_json: jest.fn(),
  },
}));

// Mock UI components
jest.mock('@/components/ui/dialog', () => ({
  Dialog: ({ children, open }: any) => (open ? <div role="dialog">{children}</div> : null),
  DialogContent: ({ children }: any) => <div>{children}</div>,
  DialogHeader: ({ children }: any) => <div>{children}</div>,
  DialogTitle: ({ children }: any) => <h1>{children}</h1>,
  DialogTrigger: ({ children }: any) => <div>{children}</div>,
}));

jest.mock('@/components/ui/button', () => ({
  Button: ({ children, onClick, disabled, ...props }: any) => (
    <button onClick={onClick} disabled={disabled} {...props}>
      {children}
    </button>
  ),
}));

jest.mock('@/components/ui/card', () => ({
  Card: ({ children }: any) => <div className="card">{children}</div>,
  CardContent: ({ children }: any) => <div className="card-content">{children}</div>,
  CardHeader: ({ children }: any) => <div className="card-header">{children}</div>,
  CardTitle: ({ children }: any) => <h2>{children}</h2>,
}));

jest.mock('@/components/ui/tabs', () => ({
  Tabs: ({ children, value, onValueChange }: any) => (
    <div data-testid="tabs" data-value={value}>
      {children}
    </div>
  ),
  TabsContent: ({ children, value }: any) => (
    <div data-testid={`tab-content-${value}`}>{children}</div>
  ),
  TabsList: ({ children }: any) => <div>{children}</div>,
  TabsTrigger: ({ children, value, onClick }: any) => (
    <button onClick={() => onClick?.(value)} data-testid={`tab-${value}`}>
      {children}
    </button>
  ),
}));

jest.mock('@/components/ui/progress', () => ({
  Progress: ({ value }: any) => (
    <div role="progressbar" aria-valuenow={value} data-testid="progress">
      {value}%
    </div>
  ),
}));

jest.mock('@/components/ui/table', () => ({
  Table: ({ children }: any) => <table>{children}</table>,
  TableHeader: ({ children }: any) => <thead>{children}</thead>,
  TableBody: ({ children }: any) => <tbody>{children}</tbody>,
  TableRow: ({ children }: any) => <tr>{children}</tr>,
  TableHead: ({ children }: any) => <th>{children}</th>,
  TableCell: ({ children }: any) => <td>{children}</td>,
}));

jest.mock('@/components/ui/alert', () => ({
  Alert: ({ children, variant }: any) => (
    <div className={`alert-${variant}`} role="alert">
      {children}
    </div>
  ),
  AlertDescription: ({ children }: any) => <div>{children}</div>,
}));

// Mock Lucide React icons
jest.mock('lucide-react', () => ({
  Upload: () => <span>📤</span>,
  CheckCircle: () => <span>✅</span>,
  AlertTriangle: () => <span>⚠️</span>,
  FileSpreadsheet: () => <span>📊</span>,
  RefreshCw: () => <span>🔄</span>,
  Download: () => <span>⬇️</span>,
  X: () => <span>❌</span>,
  Info: () => <span>ℹ️</span>,
}));

// Mock fetch
global.fetch = jest.fn();

describe('PricelistUploadWizard', () => {
  const mockOnComplete = jest.fn();
  const mockOnCancel = jest.fn();

  const defaultProps = {
    isOpen: true,
    onComplete: mockOnComplete,
    onCancel: mockOnCancel,
    supplierId: 'test-supplier-1',
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (fetch as jest.MockedFunction<typeof fetch>).mockResolvedValue({
      ok: true,
      json: async () => ({ success: true, data: { id: 'upload-123' } }),
    } as Response);

    // Mock XLSX functions
    (XLSX.read as jest.Mock).mockReturnValue({
      SheetNames: ['Sheet1'],
      Sheets: {
        Sheet1: {},
      },
    });
    (XLSX.utils.sheet_to_json as jest.Mock).mockReturnValue([
      {
        SKU: 'TEST-001',
        Name: 'Test Item 1',
        Category: 'Electronics',
        Stock: '10',
        Price: '99.99',
      },
      {
        SKU: 'TEST-002',
        Name: 'Test Item 2',
        Category: 'Office',
        Stock: '5',
        Price: '29.99',
      },
    ]);
  });

  describe('Initial State', () => {
    it('should render upload wizard when open', () => {
      render(<PricelistUploadWizard {...defaultProps} />);

      expect(screen.getByRole('dialog')).toBeInTheDocument();
      expect(screen.getByText('Pricelist Upload Wizard')).toBeInTheDocument();
      expect(screen.getByText('Upload File')).toBeInTheDocument();
    });

    it('should not render when closed', () => {
      render(<PricelistUploadWizard {...defaultProps} isOpen={false} />);

      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });

    it('should show upload zone initially', () => {
      render(<PricelistUploadWizard {...defaultProps} />);

      expect(screen.getByText('Drag and drop your Excel file here')).toBeInTheDocument();
      expect(screen.getByText('or click to browse files')).toBeInTheDocument();
    });
  });

  describe('File Upload', () => {
    it('should handle file selection', async () => {
      const user = userEvent.setup();
      render(<PricelistUploadWizard {...defaultProps} />);

      const testData = createBulkUploadScenario(2);
      const file = new File([testData], 'test-pricelist.xlsx', {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      });

      const fileInput = screen.getByRole('input', { hidden: true }); // File input is hidden
      await user.upload(fileInput, file);

      await waitFor(() => {
        expect(screen.getByText('File uploaded successfully')).toBeInTheDocument();
      });
    });

    it('should handle drag and drop', async () => {
      render(<PricelistUploadWizard {...defaultProps} />);

      const testData = createBulkUploadScenario(2);
      const file = new File([testData], 'test-pricelist.xlsx', {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      });

      const dropZone = screen.getByText('Drag and drop your Excel file here').closest('div');

      if (dropZone) {
        fireEvent.dragOver(dropZone, {
          dataTransfer: { files: [file] },
        });

        fireEvent.drop(dropZone, {
          dataTransfer: { files: [file] },
        });

        await waitFor(() => {
          expect(screen.getByText('File uploaded successfully')).toBeInTheDocument();
        });
      }
    });

    it('should reject invalid file types', async () => {
      const user = userEvent.setup();
      render(<PricelistUploadWizard {...defaultProps} />);

      const file = new File(['test content'], 'test.txt', {
        type: 'text/plain',
      });

      const fileInput = screen.getByRole('input', { hidden: true });
      await user.upload(fileInput, file);

      await waitFor(() => {
        expect(
          screen.getByText('Invalid file type. Please upload an Excel file.')
        ).toBeInTheDocument();
      });
    });

    it('should reject files that are too large', async () => {
      const user = userEvent.setup();
      render(<PricelistUploadWizard {...defaultProps} />);

      // Create a large buffer (11MB)
      const largeBuffer = new ArrayBuffer(11 * 1024 * 1024);
      const file = new File([largeBuffer], 'large-file.xlsx', {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      });

      const fileInput = screen.getByRole('input', { hidden: true });
      await user.upload(fileInput, file);

      await waitFor(() => {
        expect(screen.getByText('File size exceeds 10MB limit')).toBeInTheDocument();
      });
    });

    it('should show upload progress', async () => {
      const user = userEvent.setup();
      render(<PricelistUploadWizard {...defaultProps} />);

      const testData = createBulkUploadScenario(100); // Large dataset
      const file = new File([testData], 'large-pricelist.xlsx', {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      });

      const fileInput = screen.getByRole('input', { hidden: true });
      await user.upload(fileInput, file);

      // Should show progress indicator
      expect(screen.getByTestId('progress')).toBeInTheDocument();
    });
  });

  describe('Data Preview', () => {
    beforeEach(async () => {
      const user = userEvent.setup();
      render(<PricelistUploadWizard {...defaultProps} />);

      const testData = createBulkUploadScenario(2);
      const file = new File([testData], 'test-pricelist.xlsx', {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      });

      const fileInput = screen.getByRole('input', { hidden: true });
      await user.upload(fileInput, file);

      await waitFor(() => {
        expect(screen.getByText('File uploaded successfully')).toBeInTheDocument();
      });
    });

    it('should show data preview after successful upload', async () => {
      const user = userEvent.setup();

      // Navigate to preview tab
      const previewTab = screen.getByTestId('tab-preview');
      await user.click(previewTab);

      await waitFor(() => {
        expect(screen.getByText('Data Preview')).toBeInTheDocument();
        expect(screen.getByText('TEST-001')).toBeInTheDocument();
        expect(screen.getByText('Test Item 1')).toBeInTheDocument();
      });
    });

    it('should show column mapping interface', async () => {
      const user = userEvent.setup();

      const mappingTab = screen.getByTestId('tab-mapping');
      await user.click(mappingTab);

      await waitFor(() => {
        expect(screen.getByText('Column Mapping')).toBeInTheDocument();
        expect(screen.getByText('Map your file columns to system fields')).toBeInTheDocument();
      });
    });

    it('should validate data and show errors', async () => {
      // Mock data with validation errors
      (XLSX.utils.sheet_to_json as jest.Mock).mockReturnValue([
        {
          SKU: '', // Missing SKU
          Name: 'Invalid Item',
          Stock: 'invalid', // Invalid stock
          Price: '-10', // Negative price
        },
      ]);

      const user = userEvent.setup();
      render(<PricelistUploadWizard {...defaultProps} />);

      const testData = createBulkUploadScenario(1, true);
      const file = new File([testData], 'invalid-data.xlsx', {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      });

      const fileInput = screen.getByRole('input', { hidden: true });
      await user.upload(fileInput, file);

      await waitFor(() => {
        const validationTab = screen.getByTestId('tab-validation');
        user.click(validationTab);
      });

      await waitFor(() => {
        expect(screen.getByText('Validation Errors')).toBeInTheDocument();
        expect(screen.getByText('SKU is required')).toBeInTheDocument();
        expect(screen.getByText('Invalid stock value')).toBeInTheDocument();
        expect(screen.getByText('Price cannot be negative')).toBeInTheDocument();
      });
    });

    it('should allow fixing validation errors', async () => {
      const user = userEvent.setup();

      // Navigate to validation tab with errors
      const validationTab = screen.getByTestId('tab-validation');
      await user.click(validationTab);

      await waitFor(() => {
        const fixButton = screen.getByText('Fix Errors');
        user.click(fixButton);
      });

      // Should provide interface to fix errors
      expect(screen.getByText('Edit Invalid Rows')).toBeInTheDocument();
    });
  });

  describe('Processing and Import', () => {
    beforeEach(async () => {
      const user = userEvent.setup();
      render(<PricelistUploadWizard {...defaultProps} />);

      const testData = createBulkUploadScenario(2);
      const file = new File([testData], 'test-pricelist.xlsx', {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      });

      const fileInput = screen.getByRole('input', { hidden: true });
      await user.upload(fileInput, file);

      await waitFor(() => {
        expect(screen.getByText('File uploaded successfully')).toBeInTheDocument();
      });
    });

    it('should process valid data for import', async () => {
      const user = userEvent.setup();

      const processTab = screen.getByTestId('tab-import');
      await user.click(processTab);

      await waitFor(() => {
        expect(screen.getByText('Import Configuration')).toBeInTheDocument();
        expect(screen.getByText('Ready to import 2 items')).toBeInTheDocument();
      });

      const importButton = screen.getByText('Start Import');
      await user.click(importButton);

      await waitFor(() => {
        expect(screen.getByText('Importing data...')).toBeInTheDocument();
        expect(screen.getByTestId('progress')).toBeInTheDocument();
      });
    });

    it('should handle import success', async () => {
      const user = userEvent.setup();

      const processTab = screen.getByTestId('tab-import');
      await user.click(processTab);

      const importButton = screen.getByText('Start Import');
      await user.click(importButton);

      await waitFor(() => {
        expect(screen.getByText('Import completed successfully!')).toBeInTheDocument();
        expect(screen.getByText('2 items imported')).toBeInTheDocument();
      });

      expect(mockOnComplete).toHaveBeenCalledWith({
        success: true,
        importedCount: 2,
        errors: [],
      });
    });

    it('should handle import errors', async () => {
      (fetch as jest.MockedFunction<typeof fetch>).mockResolvedValue({
        ok: false,
        json: async () => ({
          success: false,
          error: 'Import failed',
          details: ['SKU TEST-001 already exists'],
        }),
      } as Response);

      const user = userEvent.setup();

      const processTab = screen.getByTestId('tab-import');
      await user.click(processTab);

      const importButton = screen.getByText('Start Import');
      await user.click(importButton);

      await waitFor(() => {
        expect(screen.getByText('Import failed')).toBeInTheDocument();
        expect(screen.getByText('SKU TEST-001 already exists')).toBeInTheDocument();
      });
    });

    it('should show import progress in real-time', async () => {
      // Mock streaming response for progress updates
      const mockReader = {
        read: jest
          .fn()
          .mockResolvedValueOnce({
            done: false,
            value: new TextEncoder().encode('data: {"progress": 25, "processed": 25}\n\n'),
          })
          .mockResolvedValueOnce({
            done: false,
            value: new TextEncoder().encode('data: {"progress": 50, "processed": 50}\n\n'),
          })
          .mockResolvedValueOnce({
            done: false,
            value: new TextEncoder().encode(
              'data: {"progress": 100, "processed": 100, "complete": true}\n\n'
            ),
          })
          .mockResolvedValueOnce({
            done: true,
            value: undefined,
          }),
      };

      (fetch as jest.MockedFunction<typeof fetch>).mockResolvedValue({
        ok: true,
        body: {
          getReader: () => mockReader,
        },
      } as any);

      const user = userEvent.setup();

      const processTab = screen.getByTestId('tab-import');
      await user.click(processTab);

      const importButton = screen.getByText('Start Import');
      await user.click(importButton);

      await waitFor(() => {
        expect(screen.getByTestId('progress')).toHaveAttribute('aria-valuenow', '25');
      });

      await waitFor(() => {
        expect(screen.getByTestId('progress')).toHaveAttribute('aria-valuenow', '50');
      });

      await waitFor(() => {
        expect(screen.getByTestId('progress')).toHaveAttribute('aria-valuenow', '100');
      });
    });
  });

  describe('AI-Assisted Features', () => {
    it('should suggest column mappings using AI', async () => {
      const user = userEvent.setup();
      render(<PricelistUploadWizard {...defaultProps} />);

      const testData = createBulkUploadScenario(2);
      const file = new File([testData], 'test-pricelist.xlsx', {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      });

      const fileInput = screen.getByRole('input', { hidden: true });
      await user.upload(fileInput, file);

      await waitFor(() => {
        const mappingTab = screen.getByTestId('tab-mapping');
        user.click(mappingTab);
      });

      await waitFor(() => {
        expect(screen.getByText('AI Suggested Mappings')).toBeInTheDocument();
        expect(screen.getByText('Auto-map columns')).toBeInTheDocument();
      });

      const autoMapButton = screen.getByText('Auto-map columns');
      await user.click(autoMapButton);

      await waitFor(() => {
        expect(screen.getByText('Mappings applied successfully')).toBeInTheDocument();
      });
    });

    it('should validate data using AI rules', async () => {
      const user = userEvent.setup();

      const validationTab = screen.getByTestId('tab-validation');
      await user.click(validationTab);

      await waitFor(() => {
        expect(screen.getByText('AI Validation')).toBeInTheDocument();
        expect(screen.getByText('Run smart validation')).toBeInTheDocument();
      });

      const smartValidationButton = screen.getByText('Run smart validation');
      await user.click(smartValidationButton);

      await waitFor(() => {
        expect(screen.getByText('AI validation completed')).toBeInTheDocument();
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle network errors gracefully', async () => {
      (fetch as jest.MockedFunction<typeof fetch>).mockRejectedValue(new Error('Network error'));

      const user = userEvent.setup();
      render(<PricelistUploadWizard {...defaultProps} />);

      const testData = createBulkUploadScenario(2);
      const file = new File([testData], 'test-pricelist.xlsx', {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      });

      const fileInput = screen.getByRole('input', { hidden: true });
      await user.upload(fileInput, file);

      await waitFor(() => {
        expect(screen.getByText('Network error occurred. Please try again.')).toBeInTheDocument();
      });
    });

    it('should handle corrupted Excel files', async () => {
      (XLSX.read as jest.Mock).mockImplementation(() => {
        throw new Error('Invalid file format');
      });

      const user = userEvent.setup();
      render(<PricelistUploadWizard {...defaultProps} />);

      const file = new File(['corrupted data'], 'corrupted.xlsx', {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      });

      const fileInput = screen.getByRole('input', { hidden: true });
      await user.upload(fileInput, file);

      await waitFor(() => {
        expect(screen.getByText('File is corrupted or invalid')).toBeInTheDocument();
      });
    });

    it('should allow retry after errors', async () => {
      const user = userEvent.setup();

      // Simulate error state
      (fetch as jest.MockedFunction<typeof fetch>).mockRejectedValueOnce(
        new Error('Network error')
      );

      render(<PricelistUploadWizard {...defaultProps} />);

      const testData = createBulkUploadScenario(2);
      const file = new File([testData], 'test-pricelist.xlsx', {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      });

      const fileInput = screen.getByRole('input', { hidden: true });
      await user.upload(fileInput, file);

      await waitFor(() => {
        expect(screen.getByText('Network error occurred. Please try again.')).toBeInTheDocument();
      });

      // Fix the mock for retry
      (fetch as jest.MockedFunction<typeof fetch>).mockResolvedValue({
        ok: true,
        json: async () => ({ success: true, data: { id: 'upload-123' } }),
      } as Response);

      const retryButton = screen.getByText('Retry');
      await user.click(retryButton);

      await waitFor(() => {
        expect(screen.getByText('File uploaded successfully')).toBeInTheDocument();
      });
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA labels', () => {
      render(<PricelistUploadWizard {...defaultProps} />);

      expect(screen.getByRole('dialog')).toHaveAttribute('aria-labelledby');
      expect(screen.getByRole('progressbar')).toHaveAttribute('aria-label');
    });

    it('should support keyboard navigation', async () => {
      const user = userEvent.setup();
      render(<PricelistUploadWizard {...defaultProps} />);

      // Tab navigation should work
      await user.tab();
      expect(document.activeElement).toHaveAttribute('role', 'button');

      // Escape should close dialog
      await user.keyboard('{Escape}');
      expect(mockOnCancel).toHaveBeenCalled();
    });

    it('should announce progress to screen readers', async () => {
      render(<PricelistUploadWizard {...defaultProps} />);

      const progressBar = screen.getByRole('progressbar');
      expect(progressBar).toHaveAttribute('aria-live', 'polite');
    });
  });

  describe('Performance', () => {
    it('should handle large files efficiently', async () => {
      const user = userEvent.setup();
      render(<PricelistUploadWizard {...defaultProps} />);

      const largeDataset = createBulkUploadScenario(10000); // 10k rows
      const file = new File([largeDataset], 'large-pricelist.xlsx', {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      });

      const startTime = performance.now();

      const fileInput = screen.getByRole('input', { hidden: true });
      await user.upload(fileInput, file);

      await waitFor(
        () => {
          expect(screen.getByText('File uploaded successfully')).toBeInTheDocument();
        },
        { timeout: 10000 }
      );

      const endTime = performance.now();
      expect(endTime - startTime).toBeLessThan(5000); // Should process within 5 seconds
    });

    it('should use streaming for large imports', async () => {
      const user = userEvent.setup();

      // Setup streaming mock
      const mockStream = new ReadableStream({
        start(controller) {
          controller.enqueue(new TextEncoder().encode('data: {"progress": 50}\n\n'));
          controller.close();
        },
      });

      (fetch as jest.MockedFunction<typeof fetch>).mockResolvedValue({
        ok: true,
        body: mockStream,
      } as any);

      render(<PricelistUploadWizard {...defaultProps} />);

      const testData = createBulkUploadScenario(1000);
      const file = new File([testData], 'large-pricelist.xlsx', {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      });

      const fileInput = screen.getByRole('input', { hidden: true });
      await user.upload(fileInput, file);

      const importTab = screen.getByTestId('tab-import');
      await user.click(importTab);

      const importButton = screen.getByText('Start Import');
      await user.click(importButton);

      // Verify streaming is used for large imports
      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/inventory/bulk-import'),
        expect.objectContaining({
          headers: expect.objectContaining({
            Accept: 'text/event-stream',
          }),
        })
      );
    });
  });
});
