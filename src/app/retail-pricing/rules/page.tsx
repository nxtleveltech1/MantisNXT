'use client';

import React from 'react';
import AppLayout from '@/components/layout/AppLayout';
import { PricingRuleManager } from '@/components/pricing/PricingRuleManager';

export default function RetailPricingRulesPage() {
  return (
    <AppLayout
      title="Retail pricing rules"
      breadcrumbs={[
        { label: 'Retail Price Listing', href: '/retail-pricing/price-positioning' },
        { label: 'Rules' },
      ]}
    >
      <div className="space-y-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Margin and automation rules</h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Define how selling prices relate to cost (cost-plus, floors, priorities). Rules complement
            manual prices on the selling prices screen.
          </p>
        </div>
        <PricingRuleManager />
      </div>
    </AppLayout>
  );
}
