'use client';

import AppLayout from '@/components/layout/AppLayout';
import SalesDashboard from '@/components/sales/SalesDashboard';

export default function InStoreSalesPage() {
    return (
        <AppLayout
            title="In-Store Sales"
            breadcrumbs={[
                { label: 'Financial', href: '/financial/sales' },
                { label: 'Sales' },
                { label: 'In-Store' },
            ]}
        >
            <SalesDashboard channel="in-store" title="In-Store Sales Performance" />
        </AppLayout>
    );
}
