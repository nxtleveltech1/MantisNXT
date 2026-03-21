'use client';

import React from 'react';
import AppLayout from '@/components/layout/AppLayout';
import { PriceListWorkspace } from '@/components/retail-pricing/PriceListWorkspace';

export default function PriceListPage() {
  return (
    <AppLayout
      title="Retail Price Listing"
      breadcrumbs={[
        { label: 'Retail Price Listing', href: '/retail-pricing/price-list' },
        { label: 'Price List' },
      ]}
    >
      <div className="space-y-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Set retail price</h1>
          <p className="text-muted-foreground mt-1 text-sm max-w-3xl">
            Primary price-setting flow: choose filters, set margin or markup rules, preview new prices,
            then apply. For direct grid editing of the same selling prices, use{' '}
            <a
              className="text-primary underline-offset-4 hover:underline"
              href="/retail-pricing/price-positioning"
            >
              Price positioning
            </a>
            .
          </p>
        </div>
        <PriceListWorkspace />
      </div>
    </AppLayout>
  );
}
