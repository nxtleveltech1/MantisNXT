'use client';

import React, { useState, useMemo } from 'react';
import { Check, ChevronsUpDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Label } from '@/components/ui/label';

export interface Supplier {
  id: string;
  name: string;
  code?: string;
  supplier_id?: string;
  supplier_code?: string;
  status?: string;
  active?: boolean;
}

interface SearchableSupplierSelectProps {
  suppliers: Supplier[];
  value?: string;
  onValueChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  loading?: boolean;
  error?: string;
  label?: string;
  required?: boolean;
  showAllOption?: boolean;
  allOptionLabel?: string;
  allOptionValue?: string;
  filterActive?: boolean;
  className?: string;
  id?: string;
}

export function SearchableSupplierSelect({
  suppliers,
  value,
  onValueChange,
  placeholder = 'Select supplier',
  disabled = false,
  loading = false,
  error,
  label,
  required = false,
  showAllOption = false,
  allOptionLabel = 'All suppliers',
  allOptionValue = 'all',
  filterActive = false,
  className,
  id,
}: SearchableSupplierSelectProps) {
  const [open, setOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Filter suppliers based on active status and search query
  const filteredSuppliers = useMemo(() => {
    let filtered = suppliers;

    // Filter by active status if requested
    if (filterActive) {
      filtered = filtered.filter(
        s => s.status === 'active' || s.active === true
      );
    }

    // Filter by search query
    if (searchQuery) {
      const query = searchQuery.toLowerCase().trim();
      filtered = filtered.filter(supplier => {
        const name = (supplier.name || '').toLowerCase();
        const code = (supplier.code || supplier.supplier_code || '').toLowerCase();
        return name.includes(query) || code.includes(query);
      });
    }

    return filtered;
  }, [suppliers, searchQuery, filterActive]);

  const selectedSupplier = suppliers.find(
    s => s.id === value || s.supplier_id === value
  );

  const displayValue = selectedSupplier
    ? `${selectedSupplier.name}${selectedSupplier.code || selectedSupplier.supplier_code ? ` (${selectedSupplier.code || selectedSupplier.supplier_code})` : ''}`
    : value === allOptionValue && showAllOption
      ? allOptionLabel
      : placeholder;

  return (
    <div className={cn('space-y-2', className)}>
      {label && (
        <Label htmlFor={id}>
          {label}
          {required && <span className="text-destructive ml-1">*</span>}
        </Label>
      )}
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            id={id}
            variant="outline"
            role="combobox"
            aria-expanded={open}
            disabled={disabled || loading}
            className="w-full justify-between"
          >
            <span className="truncate">
              {loading ? 'Loading suppliers…' : displayValue}
            </span>
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-full p-0" align="start">
          <Command shouldFilter={false}>
            <CommandInput
              placeholder="Search suppliers by name or code..."
              value={searchQuery}
              onValueChange={setSearchQuery}
            />
            <CommandList>
              {loading ? (
                <CommandEmpty>Loading suppliers…</CommandEmpty>
              ) : filteredSuppliers.length === 0 && !showAllOption ? (
                <CommandEmpty>
                  {suppliers.length === 0
                    ? 'No suppliers found'
                    : 'No suppliers match your search'}
                </CommandEmpty>
              ) : (
                <CommandGroup>
                  {showAllOption && (
                    <CommandItem
                      value={allOptionValue}
                      onSelect={() => {
                        onValueChange(allOptionValue);
                        setOpen(false);
                        setSearchQuery('');
                      }}
                      className="cursor-pointer"
                    >
                      <Check
                        className={cn(
                          'mr-2 h-4 w-4',
                          value === allOptionValue ? 'opacity-100' : 'opacity-0'
                        )}
                      />
                      <span>{allOptionLabel}</span>
                    </CommandItem>
                  )}
                  {filteredSuppliers.map(supplier => {
                    const supplierId = supplier.id || supplier.supplier_id || '';
                    const isSelected = value === supplierId;
                    return (
                      <CommandItem
                        key={supplierId}
                        value={supplierId}
                        onSelect={() => {
                          onValueChange(supplierId);
                          setOpen(false);
                          setSearchQuery('');
                        }}
                        className="cursor-pointer"
                      >
                        <Check
                          className={cn(
                            'mr-2 h-4 w-4',
                            isSelected ? 'opacity-100' : 'opacity-0'
                          )}
                        />
                        <span className="truncate">
                          {supplier.name}
                          {(supplier.code || supplier.supplier_code) && (
                            <span className="text-muted-foreground">
                              {' '}
                              ({supplier.code || supplier.supplier_code})
                            </span>
                          )}
                        </span>
                      </CommandItem>
                    );
                  })}
                </CommandGroup>
              )}
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
      {error && <p className="text-destructive text-xs">{error}</p>}
    </div>
  );
}

