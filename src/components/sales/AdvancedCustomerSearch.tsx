'use client';

import { useState, useEffect, useMemo, useRef } from 'react';
import { Search, Building2, User, Mail, Phone, Filter } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';

interface Customer {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  company: string | null;
  segment: string | null;
  status: string | null;
  lifetime_value: number | null;
}

interface AdvancedCustomerSearchProps {
  value?: string;
  onValueChange: (customerId: string, customer?: Customer) => void;
  orgId?: string;
  disabled?: boolean;
  placeholder?: string;
}

const SEGMENT_OPTIONS = [
  { value: 'individual', label: 'Individual' },
  { value: 'startup', label: 'Startup' },
  { value: 'smb', label: 'SMB' },
  { value: 'mid_market', label: 'Mid Market' },
  { value: 'enterprise', label: 'Enterprise' },
  { value: 'dropshipping', label: 'Dropshipping' },
];

const STATUS_OPTIONS = [
  { value: 'prospect', label: 'Prospect' },
  { value: 'active', label: 'Active' },
  { value: 'inactive', label: 'Inactive' },
  { value: 'churned', label: 'Churned' },
];

export function AdvancedCustomerSearch({
  value,
  onValueChange,
  orgId,
  disabled,
  placeholder = 'Search customers by name, email, company, phone...',
}: AdvancedCustomerSearchProps) {
  const [open, setOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState<{
    segment?: string[];
    status?: string[];
    minLifetimeValue?: number;
    maxLifetimeValue?: number;
  }>({});
  const inputRef = useRef<HTMLInputElement>(null);

  // Debounce search term
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchTerm);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  // Fetch customers when search or filters change
  useEffect(() => {
    if (open || debouncedSearch) {
      fetchCustomers();
    }
  }, [open, debouncedSearch, filters]);

  // Focus input when popover opens
  useEffect(() => {
    if (open && inputRef.current) {
      setTimeout(() => {
        inputRef.current?.focus();
      }, 100);
    }
  }, [open]);

  const fetchCustomers = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.append('limit', '100');
      
      if (debouncedSearch) {
        params.append('search', debouncedSearch);
      }

      const url = orgId 
        ? `/api/v1/customers?${params.toString()}&orgId=${orgId}`
        : `/api/v1/customers?${params.toString()}`;
      
      const response = await fetch(url);
      const result = await response.json();

      if (result.success) {
        let filtered = result.data || [];

        // Apply client-side filters
        if (filters.segment && filters.segment.length > 0) {
          filtered = filtered.filter((c: Customer) => 
            c.segment && filters.segment!.includes(c.segment)
          );
        }

        if (filters.status && filters.status.length > 0) {
          filtered = filtered.filter((c: Customer) => 
            c.status && filters.status!.includes(c.status)
          );
        }

        if (filters.minLifetimeValue !== undefined) {
          filtered = filtered.filter((c: Customer) => 
            (c.lifetime_value || 0) >= filters.minLifetimeValue!
          );
        }

        if (filters.maxLifetimeValue !== undefined) {
          filtered = filtered.filter((c: Customer) => 
            (c.lifetime_value || 0) <= filters.maxLifetimeValue!
          );
        }

        setCustomers(filtered);
      }
    } catch (error) {
      console.error('Error fetching customers:', error);
    } finally {
      setLoading(false);
    }
  };

  const selectedCustomer = useMemo(() => {
    return customers.find(c => c.id === value);
  }, [customers, value]);

  const activeFilterCount = useMemo(() => {
    return (
      (filters.segment?.length || 0) +
      (filters.status?.length || 0) +
      (filters.minLifetimeValue !== undefined ? 1 : 0) +
      (filters.maxLifetimeValue !== undefined ? 1 : 0)
    );
  }, [filters]);

  const toggleSegment = (segment: string) => {
    const current = filters.segment || [];
    const newSegments = current.includes(segment)
      ? current.filter(s => s !== segment)
      : [...current, segment];
    setFilters({ ...filters, segment: newSegments.length > 0 ? newSegments : undefined });
  };

  const toggleStatus = (status: string) => {
    const current = filters.status || [];
    const newStatuses = current.includes(status)
      ? current.filter(s => s !== status)
      : [...current, status];
    setFilters({ ...filters, status: newStatuses.length > 0 ? newStatuses : undefined });
  };

  const clearFilters = () => {
    setFilters({});
  };

  const handleSelect = (customer: Customer) => {
    onValueChange(customer.id, customer);
    setOpen(false);
    setSearchTerm('');
    setFilters({}); // Clear filters after selection
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between"
          disabled={disabled}
        >
          {selectedCustomer ? (
            <div className="flex items-center gap-2 truncate">
              {selectedCustomer.company ? (
                <>
                  <Building2 className="h-4 w-4 shrink-0" />
                  <span className="truncate">{selectedCustomer.company}</span>
                  <span className="text-muted-foreground truncate">({selectedCustomer.name})</span>
                </>
              ) : (
                <>
                  <User className="h-4 w-4 shrink-0" />
                  <span className="truncate">{selectedCustomer.name}</span>
                </>
              )}
            </div>
          ) : (
            <span className="text-muted-foreground">{placeholder}</span>
          )}
          <Search className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[600px] p-0" align="start" onOpenAutoFocus={e => e.preventDefault()}>
        <Command shouldFilter={false}>
          <div className="border-b p-2">
            <CommandInput
              ref={inputRef}
              placeholder={placeholder}
              value={searchTerm}
              onValueChange={setSearchTerm}
            />
            <div className="mt-2 flex items-center justify-between">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowFilters(!showFilters)}
                className="h-8"
              >
                <Filter className="mr-2 h-4 w-4" />
                Filters
                {activeFilterCount > 0 && (
                  <Badge variant="secondary" className="ml-2">
                    {activeFilterCount}
                  </Badge>
                )}
              </Button>
              {activeFilterCount > 0 && (
                <Button variant="ghost" size="sm" onClick={clearFilters} className="h-8">
                  Clear filters
                </Button>
              )}
            </div>
            {showFilters && (
              <div className="mt-2 space-y-3 border-t pt-3">
                <div>
                  <p className="mb-2 text-xs font-medium text-muted-foreground">Segment</p>
                  <div className="flex flex-wrap gap-1">
                    {SEGMENT_OPTIONS.map(opt => (
                      <Button
                        key={opt.value}
                        variant={filters.segment?.includes(opt.value) ? 'default' : 'outline'}
                        size="sm"
                        className="h-7 text-xs"
                        onClick={() => toggleSegment(opt.value)}
                      >
                        {opt.label}
                      </Button>
                    ))}
                  </div>
                </div>
                <div>
                  <p className="mb-2 text-xs font-medium text-muted-foreground">Status</p>
                  <div className="flex flex-wrap gap-1">
                    {STATUS_OPTIONS.map(opt => (
                      <Button
                        key={opt.value}
                        variant={filters.status?.includes(opt.value) ? 'default' : 'outline'}
                        size="sm"
                        className="h-7 text-xs"
                        onClick={() => toggleStatus(opt.value)}
                      >
                        {opt.label}
                      </Button>
                    ))}
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <Input
                    type="number"
                    placeholder="Min lifetime value (ZAR)"
                    value={filters.minLifetimeValue || ''}
                    onChange={e =>
                      setFilters({
                        ...filters,
                        minLifetimeValue: e.target.value ? Number(e.target.value) : undefined,
                      })
                    }
                    className="h-8 text-xs"
                  />
                  <Input
                    type="number"
                    placeholder="Max lifetime value (ZAR)"
                    value={filters.maxLifetimeValue || ''}
                    onChange={e =>
                      setFilters({
                        ...filters,
                        maxLifetimeValue: e.target.value ? Number(e.target.value) : undefined,
                      })
                    }
                    className="h-8 text-xs"
                  />
                </div>
              </div>
            )}
          </div>
          <CommandList>
            {loading ? (
              <CommandEmpty>Loading customers...</CommandEmpty>
            ) : customers.length === 0 ? (
              <CommandEmpty>No customers found. Try adjusting your search or filters.</CommandEmpty>
            ) : (
              <CommandGroup>
                {customers.map(customer => (
                  <CommandItem
                    key={customer.id}
                    value={customer.id}
                    onSelect={() => handleSelect(customer)}
                    className="cursor-pointer"
                  >
                    <div className="flex w-full items-start gap-3 py-2">
                      <div className="mt-1">
                        {customer.company ? (
                          <Building2 className="h-5 w-5 text-muted-foreground" />
                        ) : (
                          <User className="h-5 w-5 text-muted-foreground" />
                        )}
                      </div>
                      <div className="flex-1 space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">
                            {customer.company || customer.name}
                          </span>
                          {customer.segment && (
                            <Badge variant="outline" className="text-xs">
                              {customer.segment}
                            </Badge>
                          )}
                          {customer.status && (
                            <Badge
                              variant={
                                customer.status === 'active'
                                  ? 'default'
                                  : customer.status === 'churned'
                                    ? 'destructive'
                                    : 'secondary'
                              }
                              className="text-xs"
                            >
                              {customer.status}
                            </Badge>
                          )}
                        </div>
                        {customer.company && (
                          <div className="text-sm text-muted-foreground">{customer.name}</div>
                        )}
                        <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
                          {customer.email && (
                            <div className="flex items-center gap-1">
                              <Mail className="h-3 w-3" />
                              {customer.email}
                            </div>
                          )}
                          {customer.phone && (
                            <div className="flex items-center gap-1">
                              <Phone className="h-3 w-3" />
                              {customer.phone}
                            </div>
                          )}
                          {customer.lifetime_value !== null && (
                            <div>
                              R {customer.lifetime_value.toLocaleString('en-ZA', { minimumFractionDigits: 2 })}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </CommandItem>
                ))}
              </CommandGroup>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

