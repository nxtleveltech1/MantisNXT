'use client';

import AppLayout from '@/components/layout/AppLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function MetaDataPage() {
    return (
        <AppLayout
            title="Meta Data Management"
            breadcrumbs={[
                { label: 'Product Management', href: '/catalog/categories' },
                { label: 'Meta Data' },
            ]}
        >
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Definitions</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">0</div>
                        <p className="text-xs text-muted-foreground">Meta data fields defined</p>
                    </CardContent>
                </Card>
            </div>

            <div className="mt-6">
                <div className="rounded-md border p-8 text-center text-muted-foreground">
                    <p>Meta Data management features coming soon.</p>
                </div>
            </div>
        </AppLayout>
    );
}
