'use client';

import { useState } from 'react';
import { Settings2, Check } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';

export interface ColumnDefinition {
  id: string;
  label: string;
  defaultVisible: boolean;
}

interface ColumnSelectorProps {
  columns: ColumnDefinition[];
  visibleColumns: string[];
  onVisibilityChange: (columnIds: string[]) => void;
}

/**
 * ColumnSelector Component
 *
 * Dropdown menu for toggling column visibility in tables
 * Features:
 * - Show/hide columns
 * - Persistent state via parent component
 * - Visual indicator for visible columns
 */
export function ColumnSelector({
  columns,
  visibleColumns,
  onVisibilityChange,
}: ColumnSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);

  const toggleColumn = (columnId: string) => {
    const newVisibleColumns = visibleColumns.includes(columnId)
      ? visibleColumns.filter(id => id !== columnId)
      : [...visibleColumns, columnId];

    onVisibilityChange(newVisibleColumns);
  };

  const isColumnVisible = (columnId: string) => visibleColumns.includes(columnId);

  return (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <Settings2 className="h-4 w-4" />
          Columns
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <div className="px-2 py-1.5 text-sm font-semibold text-gray-700">
          Toggle Columns
        </div>
        <div className="h-px bg-gray-200 my-1" />
        {columns.map(column => (
          <DropdownMenuItem
            key={column.id}
            onClick={(e) => {
              e.preventDefault();
              toggleColumn(column.id);
            }}
            className="flex items-center justify-between cursor-pointer"
          >
            <span>{column.label}</span>
            {isColumnVisible(column.id) && (
              <Check className="h-4 w-4 text-blue-600" />
            )}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
