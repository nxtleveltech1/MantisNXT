'use client';

import AppLayout from '@/components/layout/AppLayout';

export default function AdminSettingsLayout({ children }: { children: React.ReactNode }) {
  return (
    <AppLayout
      title="Administration"
      breadcrumbs={[{ label: 'Admin', href: '/admin' }, { label: 'Settings' }]}
    >
      {children}
    </AppLayout>
  );
}
