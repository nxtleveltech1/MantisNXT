'use client';

import React from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Filter } from 'lucide-react';

export function InventoryFilters() {
  return (
    <div className="flex items-center gap-2">
      <Input placeholder="Search SKU, name..." className="max-w-sm" />
      <Button variant="outline" size="sm">
        <Filter className="mr-2 h-4 w-4" />
        Filters
      </Button>
    </div>
  );
}
