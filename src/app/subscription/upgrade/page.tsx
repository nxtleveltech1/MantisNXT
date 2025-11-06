'use client'

import { useRouter } from 'next/navigation'
import { Building2 } from 'lucide-react'
import { SubscriptionUpgradeForm } from '@/components/subscription/SubscriptionUpgradeForm'

export default function SubscriptionUpgradePage() {
  const router = useRouter()

  const handleSuccess = () => {
    // Redirect to dashboard after successful upgrade
    router.push('/dashboard')
  }

  const handleCancel = () => {
    // Go back to previous page
    router.back()
  }

  return (
    <div className="min-h-screen bg-background py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-2xl mx-auto space-y-6">
        {/* Header */}
        <div className="text-center space-y-4">
          <div className="flex justify-center">
            <div className="bg-primary p-3 rounded-xl">
              <Building2 className="h-8 w-8 text-primary-foreground" />
            </div>
          </div>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">MantisNXT</h1>
            <p className="text-sm text-muted-foreground mt-1">Upgrade your subscription</p>
          </div>
        </div>

        {/* Subscription Form */}
        <SubscriptionUpgradeForm onSuccess={handleSuccess} onCancel={handleCancel} />

        {/* Footer */}
        <div className="text-center text-xs text-muted-foreground space-y-1">
          <p>© 2024 MantisNXT. Procurement solutions for South African businesses.</p>
          <p>VAT Registration: 4123456789 | BEE Level 4</p>
        </div>
      </div>
    </div>
  )
}
