/**
 * Pricing Rules Management Page
 *
 * Complete interface for creating, editing, and managing pricing rules
 *
 * Author: Aster
 * Date: 2025-11-02
 */

'use client';

import React from 'react';
import AppLayout from '@/components/layout/AppLayout';
import { PricingRuleManager } from '@/components/pricing/PricingRuleManager';

export default function PricingRulesPage() {
  return (
    <AppLayout
      title="Pricing Rules"
      breadcrumbs={[
        { label: 'Operations', href: '/operations' },
        { label: 'Pricing & Optimization', href: '/operations/pricing' },
        { label: 'Pricing Rules' },
      ]}
    >
      <div className="space-y-6">
        <div>
          <p className="text-muted-foreground">
            Create and manage automated pricing strategies for your product catalog
          </p>
        </div>

        <PricingRuleManager />
      </div>
    </AppLayout>
  );
}
