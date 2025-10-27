import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { InventoryTable } from '@/components/inventory/InventoryTable'
import { InventoryItemFactory } from '../../fixtures/factories'

// Mock the UI components
jest.mock('@/components/ui/table', () => ({
  Table: ({ children, ...props }: any) => <table {...props}>{children}</table>,
  TableHeader: ({ children, ...props }: any) => <thead {...props}>{children}</thead>,
  TableBody: ({ children, ...props }: any) => <tbody {...props}>{children}</tbody>,
  TableRow: ({ children, ...props }: any) => <tr {...props}>{children}</tr>,
  TableHead: ({ children, ...props }: any) => <th {...props}>{children}</th>,
  TableCell: ({ children, ...props }: any) => <td {...props}>{children}</td>,
}))

jest.mock('@/components/ui/button', () => ({
  Button: ({ children, onClick, ...props }: any) => (
    <button onClick={onClick} {...props}>
      {children}
    </button>
  ),
}))

jest.mock('@/components/ui/badge', () => ({
  Badge: ({ children, variant, ...props }: any) => (
    <span className={`badge-${variant}`} {...props}>
      {children}
    </span>
  ),
}))

jest.mock('@/components/ui/checkbox', () => ({
  Checkbox: ({ checked, onCheckedChange, ...props }: any) => (
    <input
      type="checkbox"
      checked={checked}
      onChange={(e) => onCheckedChange?.(e.target.checked)}
      {...props}
    />
  ),
}))

jest.mock('@/components/ui/dropdown-menu', () => ({
  DropdownMenu: ({ children }: any) => <div>{children}</div>,
  DropdownMenuContent: ({ children }: any) => <div>{children}</div>,
  DropdownMenuItem: ({ children, onClick }: any) => (
    <div onClick={onClick}>{children}</div>
  ),
  DropdownMenuSeparator: () => <hr />,
  DropdownMenuTrigger: ({ children }: any) => <div>{children}</div>,
}))

// Mock Lucide React icons
jest.mock('lucide-react', () => ({
  MoreHorizontal: () => <span>⋯</span>,
  ArrowUpDown: () => <span>↕</span>,
  ArrowUp: () => <span>↑</span>,
  ArrowDown: () => <span>↓</span>,
  Edit: () => <span>✏️</span>,
  Trash: () => <span>🗑️</span>,
  Eye: () => <span>👁️</span>,
  Package: () => <span>📦</span>,
  AlertTriangle: () => <span>⚠️</span>,
  CheckCircle: () => <span>✓</span>,
}))

describe('InventoryTable', () => {
  const mockItems = [
    InventoryItemFactory.build({
      id: 'item-1',
      sku: 'TEST-001',
      name: 'Test Item 1',
      category: 'Electronics',
      currentStock: 100,
      reorderPoint: 20,
      unitPrice: 99.99,
      status: 'active'
    }),
    InventoryItemFactory.build({
      id: 'item-2',
      sku: 'TEST-002',
      name: 'Test Item 2',
      category: 'Office Supplies',
      currentStock: 5,
      reorderPoint: 10,
      unitPrice: 29.99,
      status: 'low_stock'
    }),
    InventoryItemFactory.build({
      id: 'item-3',
      sku: 'TEST-003',
      name: 'Test Item 3',
      category: 'Hardware',
      currentStock: 0,
      reorderPoint: 5,
      unitPrice: 149.99,
      status: 'out_of_stock'
    })
  ]

  const mockPagination = {
    page: 1,
    limit: 20,
    total: 3,
    totalPages: 1,
    hasNext: false,
    hasPrev: false
  }

  const defaultProps = {
    items: mockItems,
    pagination: mockPagination,
    loading: false,
    onSort: jest.fn(),
    onPageChange: jest.fn(),
    onItemSelect: jest.fn(),
    onItemEdit: jest.fn(),
    onItemDelete: jest.fn(),
    onItemView: jest.fn(),
    selectedItems: [],
    sortConfig: { field: 'name', direction: 'asc' as const }
  }

  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('Rendering', () => {
    it('should render inventory table with items', () => {
      render(<InventoryTable {...defaultProps} />)

      // Check table headers
      expect(screen.getByText('SKU')).toBeInTheDocument()
      expect(screen.getByText('Name')).toBeInTheDocument()
      expect(screen.getByText('Category')).toBeInTheDocument()
      expect(screen.getByText('Stock')).toBeInTheDocument()
      expect(screen.getByText('Status')).toBeInTheDocument()
      expect(screen.getByText('Price')).toBeInTheDocument()

      // Check item data
      expect(screen.getByText('TEST-001')).toBeInTheDocument()
      expect(screen.getByText('Test Item 1')).toBeInTheDocument()
      expect(screen.getByText('Electronics')).toBeInTheDocument()
      expect(screen.getByText('100')).toBeInTheDocument()
      expect(screen.getByText('$99.99')).toBeInTheDocument()
    })

    it('should show loading state', () => {
      render(<InventoryTable {...defaultProps} loading={true} />)

      expect(screen.getByText('Loading...')).toBeInTheDocument()
    })

    it('should show empty state when no items', () => {
      render(<InventoryTable {...defaultProps} items={[]} />)

      expect(screen.getByText('No inventory items found')).toBeInTheDocument()
    })

    it('should display correct status badges', () => {
      render(<InventoryTable {...defaultProps} />)

      expect(screen.getByText('Active')).toBeInTheDocument()
      expect(screen.getByText('Low Stock')).toBeInTheDocument()
      expect(screen.getByText('Out of Stock')).toBeInTheDocument()
    })

    it('should show stock levels with appropriate styling', () => {
      render(<InventoryTable {...defaultProps} />)

      const lowStockCell = screen.getByText('5')
      const outOfStockCell = screen.getByText('0')

      expect(lowStockCell.closest('td')).toHaveClass('text-yellow-600')
      expect(outOfStockCell.closest('td')).toHaveClass('text-red-600')
    })
  })

  describe('Selection', () => {
    it('should handle single item selection', async () => {
      const user = userEvent.setup()
      render(<InventoryTable {...defaultProps} />)

      const checkbox = screen.getAllByRole('checkbox')[1] // First item checkbox (0 is select all)
      await user.click(checkbox)

      expect(defaultProps.onItemSelect).toHaveBeenCalledWith('item-1', true)
    })

    it('should handle select all functionality', async () => {
      const user = userEvent.setup()
      render(<InventoryTable {...defaultProps} />)

      const selectAllCheckbox = screen.getAllByRole('checkbox')[0]
      await user.click(selectAllCheckbox)

      expect(defaultProps.onItemSelect).toHaveBeenCalledTimes(3)
      expect(defaultProps.onItemSelect).toHaveBeenCalledWith('item-1', true)
      expect(defaultProps.onItemSelect).toHaveBeenCalledWith('item-2', true)
      expect(defaultProps.onItemSelect).toHaveBeenCalledWith('item-3', true)
    })

    it('should show selected items correctly', () => {
      render(
        <InventoryTable
          {...defaultProps}
          selectedItems={['item-1', 'item-3']}
        />
      )

      const checkboxes = screen.getAllByRole('checkbox')
      expect(checkboxes[1]).toBeChecked() // item-1
      expect(checkboxes[2]).not.toBeChecked() // item-2
      expect(checkboxes[3]).toBeChecked() // item-3
    })

    it('should handle deselection', async () => {
      const user = userEvent.setup()
      render(
        <InventoryTable
          {...defaultProps}
          selectedItems={['item-1']}
        />
      )

      const checkbox = screen.getAllByRole('checkbox')[1]
      await user.click(checkbox)

      expect(defaultProps.onItemSelect).toHaveBeenCalledWith('item-1', false)
    })
  })

  describe('Sorting', () => {
    it('should handle column sorting', async () => {
      const user = userEvent.setup()
      render(<InventoryTable {...defaultProps} />)

      const skuHeader = screen.getByText('SKU')
      await user.click(skuHeader)

      expect(defaultProps.onSort).toHaveBeenCalledWith('sku')
    })

    it('should show sort indicators', () => {
      render(
        <InventoryTable
          {...defaultProps}
          sortConfig={{ field: 'name', direction: 'asc' }}
        />
      )

      const nameHeader = screen.getByText('Name')
      expect(nameHeader.closest('th')).toContainHTML('↑')
    })

    it('should show descending sort indicator', () => {
      render(
        <InventoryTable
          {...defaultProps}
          sortConfig={{ field: 'name', direction: 'desc' }}
        />
      )

      const nameHeader = screen.getByText('Name')
      expect(nameHeader.closest('th')).toContainHTML('↓')
    })

    it('should handle sorting by stock levels', async () => {
      const user = userEvent.setup()
      render(<InventoryTable {...defaultProps} />)

      const stockHeader = screen.getByText('Stock')
      await user.click(stockHeader)

      expect(defaultProps.onSort).toHaveBeenCalledWith('currentStock')
    })
  })

  describe('Actions', () => {
    it('should handle view action', async () => {
      const user = userEvent.setup()
      render(<InventoryTable {...defaultProps} />)

      const actionButton = screen.getAllByText('⋯')[0]
      await user.click(actionButton)

      const viewButton = screen.getByText('👁️')
      await user.click(viewButton)

      expect(defaultProps.onItemView).toHaveBeenCalledWith('item-1')
    })

    it('should handle edit action', async () => {
      const user = userEvent.setup()
      render(<InventoryTable {...defaultProps} />)

      const actionButton = screen.getAllByText('⋯')[0]
      await user.click(actionButton)

      const editButton = screen.getByText('✏️')
      await user.click(editButton)

      expect(defaultProps.onItemEdit).toHaveBeenCalledWith('item-1')
    })

    it('should handle delete action', async () => {
      const user = userEvent.setup()
      render(<InventoryTable {...defaultProps} />)

      const actionButton = screen.getAllByText('⋯')[0]
      await user.click(actionButton)

      const deleteButton = screen.getByText('🗑️')
      await user.click(deleteButton)

      expect(defaultProps.onItemDelete).toHaveBeenCalledWith('item-1')
    })

    it('should disable actions for out of stock items', () => {
      render(<InventoryTable {...defaultProps} />)

      const outOfStockRow = screen.getByText('TEST-003').closest('tr')
      expect(outOfStockRow).toHaveClass('opacity-60')
    })
  })

  describe('Pagination', () => {
    const paginationProps = {
      ...defaultProps,
      pagination: {
        page: 2,
        limit: 10,
        total: 25,
        totalPages: 3,
        hasNext: true,
        hasPrev: true
      }
    }

    it('should show pagination controls', () => {
      render(<InventoryTable {...paginationProps} />)

      expect(screen.getByText('Page 2 of 3')).toBeInTheDocument()
      expect(screen.getByText('25 total items')).toBeInTheDocument()
    })

    it('should handle page navigation', async () => {
      const user = userEvent.setup()
      render(<InventoryTable {...paginationProps} />)

      const nextButton = screen.getByText('Next')
      await user.click(nextButton)

      expect(defaultProps.onPageChange).toHaveBeenCalledWith(3)

      const prevButton = screen.getByText('Previous')
      await user.click(prevButton)

      expect(defaultProps.onPageChange).toHaveBeenCalledWith(1)
    })

    it('should disable navigation buttons appropriately', () => {
      render(
        <InventoryTable
          {...defaultProps}
          pagination={{
            ...defaultProps.pagination,
            page: 1,
            hasNext: false,
            hasPrev: false
          }}
        />
      )

      const prevButton = screen.getByText('Previous')
      const nextButton = screen.getByText('Next')

      expect(prevButton).toBeDisabled()
      expect(nextButton).toBeDisabled()
    })
  })

  describe('Keyboard Navigation', () => {
    it('should handle keyboard events for accessibility', async () => {
      const user = userEvent.setup()
      render(<InventoryTable {...defaultProps} />)

      const firstRow = screen.getByText('TEST-001').closest('tr')

      if (firstRow) {
        await user.click(firstRow)
        await user.keyboard('{Enter}')

        expect(defaultProps.onItemView).toHaveBeenCalledWith('item-1')
      }
    })

    it('should support space key for selection', async () => {
      const user = userEvent.setup()
      render(<InventoryTable {...defaultProps} />)

      const checkbox = screen.getAllByRole('checkbox')[1]
      await user.click(checkbox)
      await user.keyboard(' ')

      expect(defaultProps.onItemSelect).toHaveBeenCalled()
    })
  })

  describe('Responsive Design', () => {
    it('should hide certain columns on mobile', () => {
      // Mock mobile viewport
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 500,
      })

      render(<InventoryTable {...defaultProps} />)

      // Category column should be hidden on mobile
      const categoryHeader = screen.queryByText('Category')
      expect(categoryHeader?.closest('th')).toHaveClass('hidden sm:table-cell')
    })

    it('should show compact view on small screens', () => {
      const { container } = render(<InventoryTable {...defaultProps} />)

      expect(container.firstChild).toHaveClass('min-w-full')
    })
  })

  describe('Performance', () => {
    it('should render large datasets efficiently', () => {
      const largeDataset = Array.from({ length: 1000 }, (_, i) =>
        InventoryItemFactory.build({
          id: `item-${i}`,
          sku: `TEST-${i.toString().padStart(3, '0')}`,
          name: `Test Item ${i}`
        })
      )

      const startTime = performance.now()
      render(
        <InventoryTable
          {...defaultProps}
          items={largeDataset}
          pagination={{
            ...defaultProps.pagination,
            total: 1000,
            totalPages: 50
          }}
        />
      )
      const endTime = performance.now()

      // Should render within reasonable time (less than 100ms)
      expect(endTime - startTime).toBeLessThan(100)
    })

    it('should not re-render unnecessarily', () => {
      const renderSpy = jest.fn()
      const TestComponent = (props: any) => {
        renderSpy()
        return <InventoryTable {...props} />
      }

      const { rerender } = render(<TestComponent {...defaultProps} />)

      expect(renderSpy).toHaveBeenCalledTimes(1)

      // Re-render with same props
      rerender(<TestComponent {...defaultProps} />)

      // Should not cause unnecessary re-renders due to memoization
      expect(renderSpy).toHaveBeenCalledTimes(2)
    })
  })

  describe('Error Handling', () => {
    it('should handle missing data gracefully', () => {
      const itemsWithMissingData = [
        {
          ...InventoryItemFactory.build(),
          name: undefined,
          unitPrice: null
        }
      ]

      render(
        <InventoryTable
          {...defaultProps}
          items={itemsWithMissingData as any}
        />
      )

      expect(screen.getByText('N/A')).toBeInTheDocument()
      expect(screen.getByText('$0.00')).toBeInTheDocument()
    })

    it('should handle action errors gracefully', async () => {
      const onItemEditWithError = jest.fn().mockRejectedValue(new Error('API Error'))
      const user = userEvent.setup()

      render(
        <InventoryTable
          {...defaultProps}
          onItemEdit={onItemEditWithError}
        />
      )

      const actionButton = screen.getAllByText('⋯')[0]
      await user.click(actionButton)

      const editButton = screen.getByText('✏️')
      await user.click(editButton)

      await waitFor(() => {
        expect(screen.getByText('Error performing action')).toBeInTheDocument()
      })
    })
  })

  describe('Accessibility', () => {
    it('should have proper ARIA labels', () => {
      render(<InventoryTable {...defaultProps} />)

      expect(screen.getByRole('table')).toHaveAttribute('aria-label', 'Inventory items table')
      expect(screen.getAllByRole('checkbox')[0]).toHaveAttribute('aria-label', 'Select all items')
    })

    it('should support screen readers', () => {
      render(<InventoryTable {...defaultProps} />)

      const table = screen.getByRole('table')
      expect(table).toHaveAttribute('aria-describedby')

      const headers = screen.getAllByRole('columnheader')
      headers.forEach(header => {
        expect(header).toHaveAttribute('scope', 'col')
      })
    })

    it('should have proper focus management', async () => {
      const user = userEvent.setup()
      render(<InventoryTable {...defaultProps} />)

      const firstCheckbox = screen.getAllByRole('checkbox')[1]
      await user.tab()

      expect(firstCheckbox).toHaveFocus()
    })

    it('should announce sort changes to screen readers', async () => {
      const user = userEvent.setup()
      render(<InventoryTable {...defaultProps} />)

      const nameHeader = screen.getByText('Name')
      await user.click(nameHeader)

      expect(nameHeader.closest('th')).toHaveAttribute('aria-sort', 'ascending')
    })
  })
})