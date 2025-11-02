'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  getPaginationRowModel,
  getFilteredRowModel,
  ColumnDef,
  SortingState,
  flexRender,
} from '@tanstack/react-table';
import {
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Eye,
  Pencil,
  Trash2,
  Mail,
  MoreHorizontal,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface Customer {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  company: string | null;
  segment: string | null;
  status: string | null;
  lifetime_value: number | null;
  acquisition_date: string | null;
  last_interaction_date: string | null;
  tags: string[] | null;
  created_at: string;
}

interface CustomerTableProps {
  customers: Customer[];
  visibleColumns: string[];
  onDeleteCustomer: (id: string) => void;
  onRefresh: () => void;
}

/**
 * CustomerTable Component
 *
 * Advanced data table with TanStack Table
 * Features:
 * - Multi-column sorting
 * - Pagination with size selector
 * - Row selection
 * - Quick actions per row
 * - Responsive design
 * - Value-based color coding
 */
export function CustomerTable({
  customers,
  visibleColumns,
  onDeleteCustomer,
  onRefresh,
}: CustomerTableProps) {
  const router = useRouter();
  const [sorting, setSorting] = useState<SortingState>([]);
  const [pageSize, setPageSize] = useState(25);

  // Status badge configuration
  const getStatusBadge = (status: string | null) => {
    if (!status) return null;

    const config: Record<string, { color: string; label: string }> = {
      active: { color: 'bg-green-100 text-green-800', label: 'Active' },
      inactive: { color: 'bg-gray-100 text-gray-800', label: 'Inactive' },
      prospect: { color: 'bg-blue-100 text-blue-800', label: 'Prospect' },
      churned: { color: 'bg-red-100 text-red-800', label: 'Churned' },
    };

    const { color, label } = config[status] || { color: 'bg-gray-100 text-gray-800', label: status };

    return (
      <Badge className={`${color} font-medium`}>
        {label}
      </Badge>
    );
  };

  // Segment badge configuration
  const getSegmentBadge = (segment: string | null) => {
    if (!segment) return <span className="text-sm text-gray-400">-</span>;

    const config: Record<string, { color: string; label: string }> = {
      individual: { color: 'bg-gray-100 text-gray-700', label: 'Individual' },
      startup: { color: 'bg-yellow-100 text-yellow-800', label: 'Startup' },
      smb: { color: 'bg-green-100 text-green-800', label: 'SMB' },
      mid_market: { color: 'bg-blue-100 text-blue-800', label: 'Mid Market' },
      enterprise: { color: 'bg-purple-100 text-purple-800', label: 'Enterprise' },
    };

    const { color, label } = config[segment] || { color: 'bg-gray-100 text-gray-800', label: segment };

    return (
      <Badge className={`${color} font-medium`}>
        {label}
      </Badge>
    );
  };

  // Lifetime value with color coding
  const getLifetimeValueDisplay = (value: number | null) => {
    if (value === null || value === undefined) {
      return <span className="text-sm text-gray-400">$0.00</span>;
    }

    let colorClass = 'text-gray-600';
    let bgClass = 'bg-gray-50';

    if (value > 50000) {
      colorClass = 'text-purple-700 font-semibold';
      bgClass = 'bg-purple-50';
    } else if (value > 20000) {
      colorClass = 'text-blue-700 font-semibold';
      bgClass = 'bg-blue-50';
    } else if (value > 5000) {
      colorClass = 'text-green-700 font-semibold';
      bgClass = 'bg-green-50';
    } else if (value > 1000) {
      colorClass = 'text-yellow-700 font-medium';
      bgClass = 'bg-yellow-50';
    }

    return (
      <span className={`text-sm ${colorClass} ${bgClass} px-2 py-1 rounded`}>
        {new Intl.NumberFormat('en-US', {
          style: 'currency',
          currency: 'USD',
          minimumFractionDigits: 0,
          maximumFractionDigits: 0,
        }).format(value)}
      </span>
    );
  };

  // Relative date with tooltip
  const getRelativeDate = (dateString: string | null) => {
    if (!dateString) return <span className="text-sm text-gray-400">-</span>;

    const date = new Date(dateString);
    const relativeTime = formatDistanceToNow(date, { addSuffix: true });
    const absoluteDate = date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });

    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <span className="text-sm text-gray-700 cursor-help">
              {relativeTime}
            </span>
          </TooltipTrigger>
          <TooltipContent>
            <p>{absoluteDate}</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  };

  // Column definitions
  const columns = useMemo<ColumnDef<Customer>[]>(
    () => [
      {
        id: 'name',
        accessorKey: 'name',
        header: ({ column }) => (
          <button
            onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
            className="flex items-center gap-2 hover:text-gray-900 font-semibold"
          >
            Name
            {column.getIsSorted() === 'asc' ? (
              <ArrowUp className="h-4 w-4" />
            ) : column.getIsSorted() === 'desc' ? (
              <ArrowDown className="h-4 w-4" />
            ) : (
              <ArrowUpDown className="h-4 w-4 opacity-30" />
            )}
          </button>
        ),
        cell: ({ row }) => (
          <div className="font-medium text-gray-900">{row.original.name}</div>
        ),
      },
      {
        id: 'email',
        accessorKey: 'email',
        header: ({ column }) => (
          <button
            onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
            className="flex items-center gap-2 hover:text-gray-900 font-semibold"
          >
            Email
            {column.getIsSorted() === 'asc' ? (
              <ArrowUp className="h-4 w-4" />
            ) : column.getIsSorted() === 'desc' ? (
              <ArrowDown className="h-4 w-4" />
            ) : (
              <ArrowUpDown className="h-4 w-4 opacity-30" />
            )}
          </button>
        ),
        cell: ({ row }) => (
          <span className="text-sm text-gray-700">
            {row.original.email || <span className="text-gray-400">-</span>}
          </span>
        ),
      },
      {
        id: 'phone',
        accessorKey: 'phone',
        header: 'Phone',
        cell: ({ row }) => (
          <span className="text-sm text-gray-700">
            {row.original.phone || <span className="text-gray-400">-</span>}
          </span>
        ),
      },
      {
        id: 'company',
        accessorKey: 'company',
        header: ({ column }) => (
          <button
            onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
            className="flex items-center gap-2 hover:text-gray-900 font-semibold"
          >
            Company
            {column.getIsSorted() === 'asc' ? (
              <ArrowUp className="h-4 w-4" />
            ) : column.getIsSorted() === 'desc' ? (
              <ArrowDown className="h-4 w-4" />
            ) : (
              <ArrowUpDown className="h-4 w-4 opacity-30" />
            )}
          </button>
        ),
        cell: ({ row }) => (
          <span className="text-sm text-gray-700">
            {row.original.company || <span className="text-gray-400">-</span>}
          </span>
        ),
      },
      {
        id: 'segment',
        accessorKey: 'segment',
        header: ({ column }) => (
          <button
            onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
            className="flex items-center gap-2 hover:text-gray-900 font-semibold"
          >
            Segment
            {column.getIsSorted() === 'asc' ? (
              <ArrowUp className="h-4 w-4" />
            ) : column.getIsSorted() === 'desc' ? (
              <ArrowDown className="h-4 w-4" />
            ) : (
              <ArrowUpDown className="h-4 w-4 opacity-30" />
            )}
          </button>
        ),
        cell: ({ row }) => getSegmentBadge(row.original.segment),
      },
      {
        id: 'status',
        accessorKey: 'status',
        header: ({ column }) => (
          <button
            onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
            className="flex items-center gap-2 hover:text-gray-900 font-semibold"
          >
            Status
            {column.getIsSorted() === 'asc' ? (
              <ArrowUp className="h-4 w-4" />
            ) : column.getIsSorted() === 'desc' ? (
              <ArrowDown className="h-4 w-4" />
            ) : (
              <ArrowUpDown className="h-4 w-4 opacity-30" />
            )}
          </button>
        ),
        cell: ({ row }) => getStatusBadge(row.original.status),
      },
      {
        id: 'lifetime_value',
        accessorKey: 'lifetime_value',
        header: ({ column }) => (
          <button
            onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
            className="flex items-center gap-2 hover:text-gray-900 font-semibold"
          >
            Lifetime Value
            {column.getIsSorted() === 'asc' ? (
              <ArrowUp className="h-4 w-4" />
            ) : column.getIsSorted() === 'desc' ? (
              <ArrowDown className="h-4 w-4" />
            ) : (
              <ArrowUpDown className="h-4 w-4 opacity-30" />
            )}
          </button>
        ),
        cell: ({ row }) => getLifetimeValueDisplay(row.original.lifetime_value),
      },
      {
        id: 'acquisition_date',
        accessorKey: 'acquisition_date',
        header: ({ column }) => (
          <button
            onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
            className="flex items-center gap-2 hover:text-gray-900 font-semibold"
          >
            Acquired
            {column.getIsSorted() === 'asc' ? (
              <ArrowUp className="h-4 w-4" />
            ) : column.getIsSorted() === 'desc' ? (
              <ArrowDown className="h-4 w-4" />
            ) : (
              <ArrowUpDown className="h-4 w-4 opacity-30" />
            )}
          </button>
        ),
        cell: ({ row }) => getRelativeDate(row.original.acquisition_date),
      },
      {
        id: 'last_interaction_date',
        accessorKey: 'last_interaction_date',
        header: ({ column }) => (
          <button
            onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
            className="flex items-center gap-2 hover:text-gray-900 font-semibold"
          >
            Last Interaction
            {column.getIsSorted() === 'asc' ? (
              <ArrowUp className="h-4 w-4" />
            ) : column.getIsSorted() === 'desc' ? (
              <ArrowDown className="h-4 w-4" />
            ) : (
              <ArrowUpDown className="h-4 w-4 opacity-30" />
            )}
          </button>
        ),
        cell: ({ row }) => getRelativeDate(row.original.last_interaction_date),
      },
      {
        id: 'tags',
        accessorKey: 'tags',
        header: 'Tags',
        cell: ({ row }) => {
          const tags = row.original.tags;
          if (!tags || tags.length === 0) {
            return <span className="text-sm text-gray-400">-</span>;
          }
          return (
            <div className="flex flex-wrap gap-1">
              {tags.slice(0, 2).map((tag, i) => (
                <Badge key={i} variant="outline" className="text-xs">
                  {tag}
                </Badge>
              ))}
              {tags.length > 2 && (
                <Badge variant="outline" className="text-xs">
                  +{tags.length - 2}
                </Badge>
              )}
            </div>
          );
        },
      },
      {
        id: 'actions',
        header: 'Actions',
        cell: ({ row }) => (
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                router.push(`/customers/${row.original.id}`);
              }}
              className="h-8 w-8 p-0"
            >
              <Eye className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                router.push(`/customers/${row.original.id}/edit`);
              }}
              className="h-8 w-8 p-0"
            >
              <Pencil className="h-4 w-4" />
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={(e) => e.stopPropagation()}
                  className="h-8 w-8 p-0"
                >
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem
                  onClick={(e) => {
                    e.stopPropagation();
                    if (row.original.email) {
                      window.location.href = `mailto:${row.original.email}`;
                    }
                  }}
                >
                  <Mail className="h-4 w-4 mr-2" />
                  Send Email
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={(e) => {
                    e.stopPropagation();
                    if (confirm(`Are you sure you want to delete ${row.original.name}?`)) {
                      onDeleteCustomer(row.original.id);
                    }
                  }}
                  className="text-red-600"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        ),
      },
    ],
    [router, onDeleteCustomer]
  );

  // Filter columns based on visibility
  const visibleColumnsFiltered = useMemo(
    () => columns.filter(col => visibleColumns.includes(col.id as string) || col.id === 'actions'),
    [columns, visibleColumns]
  );

  const table = useReactTable({
    data: customers,
    columns: visibleColumnsFiltered,
    state: {
      sorting,
    },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    initialState: {
      pagination: {
        pageSize,
      },
    },
  });

  // Update page size when changed
  useMemo(() => {
    table.setPageSize(pageSize);
  }, [pageSize, table]);

  return (
    <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50 border-b border-gray-200">
            {table.getHeaderGroups().map(headerGroup => (
              <tr key={headerGroup.id}>
                {headerGroup.headers.map(header => (
                  <th
                    key={header.id}
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                  >
                    {header.isPlaceholder
                      ? null
                      : flexRender(header.column.columnDef.header, header.getContext())}
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {table.getRowModel().rows.length === 0 ? (
              <tr>
                <td
                  colSpan={visibleColumnsFiltered.length}
                  className="px-6 py-12 text-center text-gray-500"
                >
                  No customers found
                </td>
              </tr>
            ) : (
              table.getRowModel().rows.map(row => (
                <tr
                  key={row.id}
                  onClick={() => router.push(`/customers/${row.original.id}`)}
                  className="hover:bg-gray-50 cursor-pointer transition-colors"
                >
                  {row.getVisibleCells().map(cell => (
                    <td key={cell.id} className="px-6 py-4 whitespace-nowrap">
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between px-6 py-4 border-t border-gray-200">
        <div className="flex items-center gap-4">
          <span className="text-sm text-gray-700">
            Showing {table.getState().pagination.pageIndex * pageSize + 1} to{' '}
            {Math.min((table.getState().pagination.pageIndex + 1) * pageSize, customers.length)} of{' '}
            {customers.length} customers
          </span>
          <select
            value={pageSize}
            onChange={(e) => setPageSize(Number(e.target.value))}
            className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value={10}>10 per page</option>
            <option value={25}>25 per page</option>
            <option value={50}>50 per page</option>
            <option value={100}>100 per page</option>
          </select>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => table.setPageIndex(0)}
            disabled={!table.getCanPreviousPage()}
            className="h-8 w-8 p-0"
          >
            <ChevronsLeft className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => table.previousPage()}
            disabled={!table.getCanPreviousPage()}
            className="h-8 w-8 p-0"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-sm text-gray-700">
            Page {table.getState().pagination.pageIndex + 1} of {table.getPageCount()}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => table.nextPage()}
            disabled={!table.getCanNextPage()}
            className="h-8 w-8 p-0"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => table.setPageIndex(table.getPageCount() - 1)}
            disabled={!table.getCanNextPage()}
            className="h-8 w-8 p-0"
          >
            <ChevronsRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
