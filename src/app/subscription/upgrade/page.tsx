'use client';

import { useRouter } from 'next/navigation';
import { Building2 } from 'lucide-react';
import { SubscriptionUpgradeForm } from '@/components/subscription/SubscriptionUpgradeForm';

export default function SubscriptionUpgradePage() {
  const router = useRouter();

  const handleSuccess = () => {
    // Redirect to dashboard after successful upgrade
    router.push('/dashboard');
  };

  const handleCancel = () => {
    // Go back to previous page
    router.back();
  };

  return (
    <div className="bg-background min-h-screen px-4 py-12 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-2xl space-y-6">
        {/* Header */}
        <div className="space-y-4 text-center">
          <div className="flex justify-center">
            <div className="bg-primary rounded-xl p-3">
              <Building2 className="text-primary-foreground h-8 w-8" />
            </div>
          </div>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">MantisNXT</h1>
            <p className="text-muted-foreground mt-1 text-sm">Upgrade your subscription</p>
          </div>
        </div>

        {/* Subscription Form */}
        <SubscriptionUpgradeForm onSuccess={handleSuccess} onCancel={handleCancel} />

        {/* Footer */}
        <div className="text-muted-foreground space-y-1 text-center text-xs">
          <p>© 2024 MantisNXT. Procurement solutions for South African businesses.</p>
          <p>VAT Registration: 4123456789 | BEE Level 4</p>
        </div>
      </div>
    </div>
  );
}
