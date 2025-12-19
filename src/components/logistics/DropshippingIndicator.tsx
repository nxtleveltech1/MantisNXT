'use client';

import { Badge } from '@/components/ui/badge';
import { Package, Truck } from 'lucide-react';

interface DropshippingIndicatorProps {
  isDropshipping: boolean;
  supplierName?: string;
}

export function DropshippingIndicator({ isDropshipping, supplierName }: DropshippingIndicatorProps) {
  if (!isDropshipping) {
    return null;
  }

  return (
    <Badge variant="outline" className="bg-purple-50 text-purple-800 border-purple-200">
      <Truck className="h-3 w-3 mr-1" />
      Dropshipping
      {supplierName && <span className="ml-1">• {supplierName}</span>}
    </Badge>
  );
}




