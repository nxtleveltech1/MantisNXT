// UPDATE: [2025-12-25] Advanced search dialog for DocuStore
'use client';

import { useState } from 'react';
import { Filter, Search, X, Calendar } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import type { AdvancedSearchParams, DocumentSigningStatus } from '@/types/docustore';

interface AdvancedSearchDialogProps {
  onSearch: (params: AdvancedSearchParams) => void;
  onReset: () => void;
  activeFiltersCount?: number;
  className?: string;
}

const statusOptions: { value: DocumentSigningStatus | 'all'; label: string }[] = [
  { value: 'all', label: 'All Statuses' },
  { value: 'draft', label: 'Draft' },
  { value: 'pending_your_signature', label: 'Pending Your Signature' },
  { value: 'pending_other_signatures', label: 'Pending Others' },
  { value: 'completed', label: 'Completed' },
  { value: 'voided', label: 'Voided' },
];

const sortOptions = [
  { value: 'date', label: 'Date Created' },
  { value: 'lastEdit', label: 'Last Modified' },
  { value: 'name', label: 'Name' },
  { value: 'status', label: 'Status' },
];

const documentTypeOptions = [
  { value: '', label: 'All Types' },
  { value: 'agreement', label: 'Agreements' },
  { value: 'contract', label: 'Contracts' },
  { value: 'invoice', label: 'Invoices' },
  { value: 'nda', label: 'NDAs' },
  { value: 'proposal', label: 'Proposals' },
  { value: 'other', label: 'Other' },
];

export function AdvancedSearchDialog({
  onSearch,
  onReset,
  activeFiltersCount = 0,
  className,
}: AdvancedSearchDialogProps) {
  const [open, setOpen] = useState(false);
  const [params, setParams] = useState<AdvancedSearchParams>({
    search: '',
    status: 'all',
    documentType: '',
    signerEmail: '',
    signerName: '',
    dateFrom: '',
    dateTo: '',
    sortBy: 'date',
    sortOrder: 'desc',
  });

  const handleSearch = () => {
    onSearch(params);
    setOpen(false);
  };

  const handleReset = () => {
    setParams({
      search: '',
      status: 'all',
      documentType: '',
      signerEmail: '',
      signerName: '',
      dateFrom: '',
      dateTo: '',
      sortBy: 'date',
      sortOrder: 'desc',
    });
    onReset();
  };

  const updateParam = <K extends keyof AdvancedSearchParams>(
    key: K,
    value: AdvancedSearchParams[K]
  ) => {
    setParams((prev) => ({ ...prev, [key]: value }));
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className={cn('h-9 gap-2 text-sm font-medium', className)}
        >
          <Filter className="h-4 w-4" />
          Advanced Search
          {activeFiltersCount > 0 && (
            <Badge variant="secondary" className="h-5 px-1.5 text-[10px] font-bold">
              {activeFiltersCount}
            </Badge>
          )}
        </Button>
      </DialogTrigger>

      <DialogContent className="sm:max-w-[560px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Search className="h-5 w-5 text-primary" />
            Advanced Search
          </DialogTitle>
          <DialogDescription>
            Find documents using multiple criteria
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-5 py-4">
          {/* Search Text */}
          <div className="space-y-2">
            <Label htmlFor="search" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Search Text
            </Label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                id="search"
                placeholder="Search document title or description..."
                value={params.search || ''}
                onChange={(e) => updateParam('search', e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          {/* Status and Document Type */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Status
              </Label>
              <Select
                value={params.status || 'all'}
                onValueChange={(value) =>
                  updateParam('status', value as DocumentSigningStatus | 'all')
                }
              >
                <SelectTrigger className="h-10">
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  {statusOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Document Type
              </Label>
              <Select
                value={params.documentType || ''}
                onValueChange={(value) => updateParam('documentType', value)}
              >
                <SelectTrigger className="h-10">
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  {documentTypeOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Signer Filters */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="signerName" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Signer Name
              </Label>
              <Input
                id="signerName"
                placeholder="Filter by signer name..."
                value={params.signerName || ''}
                onChange={(e) => updateParam('signerName', e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="signerEmail" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Signer Email
              </Label>
              <Input
                id="signerEmail"
                type="email"
                placeholder="Filter by email..."
                value={params.signerEmail || ''}
                onChange={(e) => updateParam('signerEmail', e.target.value)}
              />
            </div>
          </div>

          {/* Date Range */}
          <div className="space-y-2">
            <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
              <Calendar className="h-3 w-3" />
              Date Range
            </Label>
            <div className="grid grid-cols-2 gap-4">
              <Input
                type="date"
                placeholder="From"
                value={params.dateFrom || ''}
                onChange={(e) => updateParam('dateFrom', e.target.value)}
              />
              <Input
                type="date"
                placeholder="To"
                value={params.dateTo || ''}
                onChange={(e) => updateParam('dateTo', e.target.value)}
              />
            </div>
          </div>

          {/* Sort Options */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Sort By
              </Label>
              <Select
                value={params.sortBy || 'date'}
                onValueChange={(value) =>
                  updateParam('sortBy', value as 'name' | 'date' | 'status' | 'lastEdit')
                }
              >
                <SelectTrigger className="h-10">
                  <SelectValue placeholder="Sort by" />
                </SelectTrigger>
                <SelectContent>
                  {sortOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Sort Order
              </Label>
              <Select
                value={params.sortOrder || 'desc'}
                onValueChange={(value) => updateParam('sortOrder', value as 'asc' | 'desc')}
              >
                <SelectTrigger className="h-10">
                  <SelectValue placeholder="Order" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="desc">Newest First</SelectItem>
                  <SelectItem value="asc">Oldest First</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="ghost" onClick={handleReset} className="gap-2">
            <X className="h-4 w-4" />
            Reset Filters
          </Button>
          <Button onClick={handleSearch} className="gap-2">
            <Search className="h-4 w-4" />
            Search
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

