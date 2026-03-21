'use client';

import React from 'react';
import AppLayout from '@/components/layout/AppLayout';
import { SellingPricesTable } from '@/components/retail-pricing/SellingPricesTable';

export default function RetailPricePositioningPage() {
  return (
    <AppLayout
      title="Retail Price Listing"
      breadcrumbs={[
        { label: 'Retail Price Listing', href: '/retail-pricing/price-list' },
        { label: 'Price positioning' },
      ]}
    >
      <div className="space-y-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Price positioning</h1>
          <p className="text-muted-foreground mt-1 text-sm max-w-3xl">
            Alternate, spreadsheet-style editor for the same selling prices as{' '}
            <a
              className="text-primary underline-offset-4 hover:underline"
              href="/retail-pricing/price-list"
            >
              Price List
            </a>
            : supplier unit cost, SOH, RRP, and customer price. Updates persist on stock-on-hand and
            flow to POS, quotes, and exports.
          </p>
        </div>
        <SellingPricesTable />
      </div>
    </AppLayout>
  );
}
