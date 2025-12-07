'use client';

import AppLayout from '@/components/layout/AppLayout';
import SalesDashboard from '@/components/sales/SalesDashboard';

export default function OnlineSalesPage() {
    return (
        <AppLayout
            title="Online Sales"
            breadcrumbs={[
                { label: 'Financial', href: '/financial/sales' },
                { label: 'Sales' },
                { label: 'Online' },
            ]}
        >
            <SalesDashboard channel="online" title="Online Sales Performance" />
        </AppLayout>
    );
}
