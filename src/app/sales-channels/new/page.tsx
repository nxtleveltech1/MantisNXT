'use client';

import AppLayout from '@/components/layout/AppLayout';
import { ChannelConfigForm } from '@/components/sales-channels/ChannelConfigForm';

export default function NewChannelPage() {
  return (
    <AppLayout>
      <div className="space-y-6 p-6">
        <ChannelConfigForm />
      </div>
    </AppLayout>
  );
}

