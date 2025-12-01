'use client';

import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface StandardPaginationProps {
  page: number;
  pageCount: number;
  limit: number;
  onPageChange: (page: number) => void;
  onLimitChange: (limit: number) => void;
  limitOptions?: number[];
  className?: string;
}

export function StandardPagination({
  page,
  pageCount,
  limit,
  onPageChange,
  onLimitChange,
  limitOptions = [25, 50, 100, 200],
  className,
}: StandardPaginationProps) {
  return (
    <div className={`mt-3 flex items-center justify-between text-sm ${className || ''}`}>
      <div>
        Page {page} of {pageCount}
      </div>
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          disabled={page <= 1}
          onClick={() => onPageChange(Math.max(1, page - 1))}
        >
          Prev
        </Button>
        <Select
          value={String(limit)}
          onValueChange={v => {
            onLimitChange(parseInt(v, 10));
            onPageChange(1);
          }}
        >
          <SelectTrigger className="w-24">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {limitOptions.map(n => (
              <SelectItem key={n} value={String(n)}>
                {n} / page
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button
          variant="outline"
          size="sm"
          disabled={page >= pageCount}
          onClick={() => onPageChange(Math.min(pageCount, page + 1))}
        >
          Next
        </Button>
      </div>
    </div>
  );
}
