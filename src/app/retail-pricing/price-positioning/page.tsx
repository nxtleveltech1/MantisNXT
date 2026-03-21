'use client';

import React from 'react';
import AppLayout from '@/components/layout/AppLayout';
import { SellingPricesTable } from '@/components/retail-pricing/SellingPricesTable';

export default function RetailPricePositioningPage() {
  return (
    <AppLayout
      title="Retail Price Listing"
      breadcrumbs={[
        { label: 'Retail Price Listing', href: '/retail-pricing/price-positioning' },
        { label: 'Price positioning' },
      ]}
    >
      <div className="space-y-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Price positioning</h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Set selling prices from the same NXT SOH view as inventory: supplier unit cost, stock on
            hand, RRP, and customer price. Updates persist on{' '}
            <code className="text-foreground rounded bg-muted px-1 py-0.5 text-xs">inventory_items</code>{' '}
            and flow to POS, quotes, and exports.
          </p>
        </div>
        <SellingPricesTable />
      </div>
    </AppLayout>
  );
}
