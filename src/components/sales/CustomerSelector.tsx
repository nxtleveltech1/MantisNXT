'use client';

import { useState, useEffect } from 'react';
import { Loader2 } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface Customer {
  id: string;
  name: string;
  email?: string | null;
  company?: string | null;
}

interface CustomerSelectorProps {
  value?: string;
  onValueChange: (customerId: string) => void;
  orgId?: string;
  disabled?: boolean;
}

export function CustomerSelector({ value, onValueChange, orgId, disabled }: CustomerSelectorProps) {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadCustomers();
  }, []);

  const loadCustomers = async () => {
    setLoading(true);
    try {
      const url = orgId ? `/api/v1/customers?limit=1000&orgId=${orgId}` : '/api/v1/customers?limit=1000';
      const response = await fetch(url);
      const result = await response.json();
      
      if (result.success) {
        setCustomers(result.data || []);
      }
    } catch (error) {
      console.error('Error loading customers:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-10 w-full items-center justify-center rounded-md border border-input bg-background">
        <Loader2 className="h-4 w-4 animate-spin" />
      </div>
    );
  }

  return (
    <Select value={value} onValueChange={onValueChange} disabled={disabled}>
      <SelectTrigger>
        <SelectValue placeholder="Select customer..." />
      </SelectTrigger>
      <SelectContent>
        {customers.length === 0 ? (
          <div className="text-muted-foreground p-2 text-center text-sm">No customers found</div>
        ) : (
          customers.map(customer => (
            <SelectItem key={customer.id} value={customer.id}>
              <div className="flex flex-col">
                <span>{customer.name}</span>
                {customer.company && (
                  <span className="text-muted-foreground text-xs">{customer.company}</span>
                )}
              </div>
            </SelectItem>
          ))
        )}
      </SelectContent>
    </Select>
  );
}

