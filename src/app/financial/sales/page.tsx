'use client';

import AppLayout from '@/components/layout/AppLayout';
import SalesDashboard from '@/components/sales/SalesDashboard';

export default function AllSalesPage() {
    return (
        <AppLayout
            title="Sales Overview"
            breadcrumbs={[
                { label: 'Financial', href: '/financial/sales' },
                { label: 'Sales' },
            ]}
        >
            <SalesDashboard channel="all" title="Total Sales Overview" />
        </AppLayout>
    );
}
