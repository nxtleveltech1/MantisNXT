'use client';

import { useMemo, useState } from 'react';
import type {
  ColumnDef,
  SortingState,
  ColumnFiltersState,
  VisibilityState,
  RowSelectionState,
} from '@tanstack/react-table';
import {
  useReactTable,
  getCoreRowModel,
  getFilteredRowModel,
  getSortedRowModel,
  getPaginationRowModel,
  flexRender,
} from '@tanstack/react-table';
import type { User } from '@/types/auth';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  ArrowUpDown,
  MoreHorizontal,
  Edit,
  Trash2,
  Shield,
  CheckCircle2,
  XCircle,
  Users,
} from 'lucide-react';
import { formatDate, getRoleLabel } from '@/lib/auth/validation';
import Link from 'next/link';

interface UserTableProps {
  data: User[];
  onEdit?: (user: User) => void;
  onDelete?: (user: User) => void;
  onToggleStatus?: (user: User) => void;
  onBulkAction?: (users: User[], action: string) => void;
}

export function UserTable({
  data,
  onEdit,
  onDelete,
  onToggleStatus,
  onBulkAction,
}: UserTableProps) {
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({});
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({});

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase();
  };

  const getRoleBadgeVariant = (role: string) => {
    switch (role) {
      case 'super_admin':
      case 'admin':
        return 'destructive';
      case 'manager':
        return 'default';
      case 'user':
        return 'secondary';
      case 'viewer':
        return 'outline';
      default:
        return 'secondary';
    }
  };

  const columns = useMemo<ColumnDef<User>[]>(
    () => [
      {
        id: 'select',
        header: ({ table }) => (
          <Checkbox
            checked={table.getIsAllPageRowsSelected()}
            onCheckedChange={value => table.toggleAllPageRowsSelected(!!value)}
            aria-label="Select all"
          />
        ),
        cell: ({ row }) => (
          <Checkbox
            checked={row.getIsSelected()}
            onCheckedChange={value => row.toggleSelected(!!value)}
            aria-label="Select row"
          />
        ),
        enableSorting: false,
        enableHiding: false,
      },
      {
        accessorKey: 'name',
        header: ({ column }) => {
          return (
            <Button
              variant="ghost"
              onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
            >
              User
              <ArrowUpDown className="ml-2 h-4 w-4" />
            </Button>
          );
        },
        cell: ({ row }) => {
          const user = row.original;
          return (
            <div className="flex items-center space-x-3">
              <Avatar>
                <AvatarImage src={user.profile_image} />
                <AvatarFallback>{getInitials(user.name)}</AvatarFallback>
              </Avatar>
              <div>
                <Link href={`/admin/users/${user.id}`} className="font-medium hover:underline">
                  {user.name}
                </Link>
                <div className="text-muted-foreground text-sm">{user.email}</div>
              </div>
            </div>
          );
        },
      },
      {
        accessorKey: 'role',
        header: ({ column }) => {
          return (
            <Button
              variant="ghost"
              onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
            >
              Role
              <ArrowUpDown className="ml-2 h-4 w-4" />
            </Button>
          );
        },
        cell: ({ row }) => {
          const role = row.getValue('role') as string;
          return <Badge variant={getRoleBadgeVariant(role) as unknown}>{getRoleLabel(role)}</Badge>;
        },
      },
      {
        accessorKey: 'department',
        header: ({ column }) => {
          return (
            <Button
              variant="ghost"
              onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
            >
              Department
              <ArrowUpDown className="ml-2 h-4 w-4" />
            </Button>
          );
        },
      },
      {
        accessorKey: 'is_active',
        header: 'Status',
        cell: ({ row }) => {
          const isActive = row.getValue('is_active') as boolean;
          return (
            <div className="flex items-center space-x-2">
              {isActive ? (
                <>
                  <CheckCircle2 className="h-4 w-4 text-green-600" />
                  <span className="text-green-600">Active</span>
                </>
              ) : (
                <>
                  <XCircle className="h-4 w-4 text-red-600" />
                  <span className="text-red-600">Inactive</span>
                </>
              )}
            </div>
          );
        },
      },
      {
        accessorKey: 'two_factor_enabled',
        header: '2FA',
        cell: ({ row }) => {
          const enabled = row.getValue('two_factor_enabled') as boolean;
          return enabled ? (
            <div className="flex items-center space-x-1 text-green-600">
              <Shield className="h-4 w-4" />
              <span className="text-sm">Yes</span>
            </div>
          ) : (
            <span className="text-muted-foreground text-sm">No</span>
          );
        },
      },
      {
        accessorKey: 'last_login',
        header: ({ column }) => {
          return (
            <Button
              variant="ghost"
              onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
            >
              Last Login
              <ArrowUpDown className="ml-2 h-4 w-4" />
            </Button>
          );
        },
        cell: ({ row }) => {
          const lastLogin = row.getValue('last_login') as Date;
          return lastLogin ? (
            <span className="text-sm">{formatDate(lastLogin)}</span>
          ) : (
            <span className="text-muted-foreground text-sm">Never</span>
          );
        },
      },
      {
        accessorKey: 'created_at',
        header: ({ column }) => {
          return (
            <Button
              variant="ghost"
              onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
            >
              Created
              <ArrowUpDown className="ml-2 h-4 w-4" />
            </Button>
          );
        },
        cell: ({ row }) => {
          const createdAt = row.getValue('created_at') as Date;
          return <span className="text-sm">{formatDate(createdAt)}</span>;
        },
      },
      {
        id: 'actions',
        cell: ({ row }) => {
          const user = row.original;

          return (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="h-8 w-8 p-0">
                  <span className="sr-only">Open menu</span>
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem asChild>
                  <Link href={`/admin/users/${user.id}`}>
                    <Edit className="mr-2 h-4 w-4" />
                    Edit User
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href={`/admin/users/${user.id}/roles`}>
                    <Users className="mr-2 h-4 w-4" />
                    Manage Roles
                  </Link>
                </DropdownMenuItem>
                {onToggleStatus && (
                  <DropdownMenuItem onClick={() => onToggleStatus(user)}>
                    {user.is_active ? (
                      <>
                        <XCircle className="mr-2 h-4 w-4" />
                        Deactivate
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="mr-2 h-4 w-4" />
                        Activate
                      </>
                    )}
                  </DropdownMenuItem>
                )}
                <DropdownMenuSeparator />
                {onDelete && (
                  <DropdownMenuItem className="text-red-600" onClick={() => onDelete(user)}>
                    <Trash2 className="mr-2 h-4 w-4" />
                    Delete User
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          );
        },
      },
    ],
    [onDelete, onToggleStatus]
  );

  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onColumnVisibilityChange: setColumnVisibility,
    onRowSelectionChange: setRowSelection,
    state: {
      sorting,
      columnFilters,
      columnVisibility,
      rowSelection,
    },
    initialState: {
      pagination: {
        pageSize: 10,
      },
    },
  });

  const selectedRows = table.getFilteredSelectedRowModel().rows;
  const selectedUsers = selectedRows.map(row => row.original);

  return (
    <div className="space-y-4">
      {/* Bulk Actions Bar */}
      {selectedRows.length > 0 && onBulkAction && (
        <div className="bg-muted/50 flex items-center justify-between rounded-lg border p-4">
          <div className="flex items-center space-x-2">
            <Checkbox
              checked={table.getIsAllPageRowsSelected()}
              onCheckedChange={value => table.toggleAllPageRowsSelected(!!value)}
            />
            <span className="text-sm font-medium">
              {selectedRows.length} user{selectedRows.length !== 1 ? 's' : ''} selected
            </span>
          </div>
          <div className="flex space-x-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => onBulkAction(selectedUsers, 'activate')}
            >
              Activate
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => onBulkAction(selectedUsers, 'deactivate')}
            >
              Deactivate
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => onBulkAction(selectedUsers, 'assign-role')}
            >
              Assign Role
            </Button>
            <Button
              size="sm"
              variant="destructive"
              onClick={() => onBulkAction(selectedUsers, 'delete')}
            >
              Delete
            </Button>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map(headerGroup => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map(header => {
                  return (
                    <TableHead key={header.id}>
                      {header.isPlaceholder
                        ? null
                        : flexRender(header.column.columnDef.header, header.getContext())}
                    </TableHead>
                  );
                })}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map(row => (
                <TableRow key={row.id} data-state={row.getIsSelected() && 'selected'}>
                  {row.getVisibleCells().map(cell => (
                    <TableCell key={cell.id}>
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={columns.length} className="h-24 text-center">
                  No users found.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between">
        <div className="text-muted-foreground text-sm">
          {table.getFilteredSelectedRowModel().rows.length} of{' '}
          {table.getFilteredRowModel().rows.length} row(s) selected.
        </div>
        <div className="flex items-center space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => table.previousPage()}
            disabled={!table.getCanPreviousPage()}
          >
            Previous
          </Button>
          <div className="text-sm">
            Page {table.getState().pagination.pageIndex + 1} of {table.getPageCount()}
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => table.nextPage()}
            disabled={!table.getCanNextPage()}
          >
            Next
          </Button>
        </div>
      </div>
    </div>
  );
}
