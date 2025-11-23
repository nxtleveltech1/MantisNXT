# Listing View Standards

This document defines the standard pattern for all listing/table views across the MantisNXT platform, based on the **Supplier Inventory Portfolio** (`CatalogTable`) implementation.

## Reference Implementation

The **Supplier Inventory Portfolio** (`src/components/catalog/CatalogTable.tsx`) serves as the gold standard reference implementation.

## Required Features

All listing views must include:

### 1. Column Management
- **ColumnManagementDialog** with drag-and-drop reordering
- Visibility toggles for each column
- localStorage persistence per listing type
- Reset to defaults functionality
- Column ordering with visual feedback

### 2. Filters Bar
- Search input (by name, SKU, or relevant identifier)
- Multiple dropdown selects (supplier, category, status, etc. as applicable)
- Price/range inputs (when applicable)
- Refresh button with loading state
- Item count display (e.g., "1,855 items")

### 3. Table Structure
- Sortable columns (clickable headers)
- Dynamic column rendering based on visibility
- Clickable rows for detail views
- Empty state handling
- Loading states
- Responsive design

### 4. Pagination
- Page navigation (Prev/Next buttons)
- Page size selector (25, 50, 100, 200 per page)
- Page count display ("Page 1 of 38")
- Total items display

### 5. Optional Features
- Summary/metrics cards (when applicable)
- Export functionality
- Bulk actions (when applicable)
- Row selection (when applicable)

## Standard Component Structure

```tsx
<Card>
  <CardHeader>
    <CardTitle>Listing Title</CardTitle>
  </CardHeader>
  <CardContent>
    {/* Optional: Summary Cards */}
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      {/* Metrics cards */}
    </div>

    {/* Filters Bar */}
    <div className="flex flex-wrap items-center gap-3 mb-4">
      <Input placeholder="Search..." />
      <Select>...</Select>
      <Button variant="outline">Refresh</Button>
      <div className="ml-auto text-sm text-muted-foreground">
        {total.toLocaleString()} items
      </div>
    </div>

    {/* Column Management */}
    <div className="flex items-center justify-between mb-2">
      <Button variant="outline" size="sm" onClick={() => setColumnDialogOpen(true)}>
        <Settings2 className="h-4 w-4 mr-2" />
        Manage Columns
      </Button>
      <ColumnManagementDialog ... />
    </div>

    {/* Table */}
    <div className="rounded-md border overflow-auto">
      <Table>
        <TableHeader>
          <TableRow>
            {visibleColumns.map((column) => renderHeaderCell(column))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {/* Rows */}
        </TableBody>
      </Table>
    </div>

    {/* Pagination */}
    <div className="flex items-center justify-between mt-3 text-sm">
      <div>Page {page} of {pageCount}</div>
      <div className="flex items-center gap-2">
        <Button variant="outline" size="sm" disabled={page <= 1}>Prev</Button>
        <Select value={String(limit)} onValueChange={...}>
          {/* Page size options */}
        </Select>
        <Button variant="outline" size="sm" disabled={page >= pageCount}>Next</Button>
      </div>
    </div>
  </CardContent>
</Card>
```

## Column Definition Pattern

```tsx
type ColumnDef = {
  key: string
  label: string
  visible: boolean
  order: number
  align?: 'left' | 'center' | 'right'
  sortable?: boolean
}

const DEFAULT_COLUMNS: ColumnDef[] = [
  { key: 'column1', label: 'Column 1', visible: true, order: 1, align: 'left', sortable: true },
  { key: 'column2', label: 'Column 2', visible: true, order: 2, align: 'right', sortable: false },
  // ...
]
```

## localStorage Key Pattern

Use consistent localStorage keys per listing type:
- `catalog_table_columns` (Supplier Inventory Portfolio)
- `inventory_table_columns` (Inventory Management)
- `products_table_columns` (AI Categorization Products)
- `customers_table_columns` (Customer Table)
- `invoices_table_columns` (Invoices)
- etc.

## Implementation Checklist

When creating or updating a listing view:

- [ ] Column management with drag-and-drop reordering
- [ ] Column visibility toggles
- [ ] localStorage persistence
- [ ] Search input
- [ ] Filter dropdowns (as applicable)
- [ ] Refresh button with loading state
- [ ] Item count display
- [ ] Sortable columns
- [ ] Dynamic column rendering
- [ ] Pagination with page size selector
- [ ] Empty state handling
- [ ] Loading states
- [ ] Responsive design
- [ ] Consistent styling with reference implementation

## Migration Priority

1. ✅ **CatalogTable** (Supplier Inventory Portfolio) - Reference implementation
2. **ProductsTable** (AI Categorization) - High priority
3. **InventoryManagement** - High priority
4. **CustomerTable** - Medium priority
5. **InvoicesPage** - Medium priority
6. **LocationsTable** - Medium priority
7. Other listing views - As needed

## Notes

- Requirements will differ per listing (e.g., different filters, columns, actions)
- The **structure and UX patterns** should remain consistent
- Column management is **required** for all listing views
- Filters should be contextual but follow the same visual pattern
- Pagination should always include page size selector

