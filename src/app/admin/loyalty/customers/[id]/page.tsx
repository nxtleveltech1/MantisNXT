"use client"

import React from "react"
import { useParams } from "next/navigation"
import AppLayout from '@/components/layout/AppLayout'
import CustomerLoyaltyProfile from "@/components/loyalty/admin/CustomerLoyaltyProfile"

/**
 * Customer Loyalty Profile Admin Page
 *
 * Individual customer loyalty details with transaction history and point adjustments.
 * Allows admins to view and manage customer-specific loyalty data.
 */
export default function CustomerLoyaltyProfilePage() {
  const params = useParams()
  const customerId = params?.id as string

  return (
    <AppLayout
      breadcrumbs={[
        { label: "Loyalty & Rewards", href: "/admin/loyalty" },
        { label: "Customers", href: "/admin/loyalty/customers" },
        { label: `Customer ${customerId}` },
      ]}
    >
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Customer Loyalty Profile</h1>
          <p className="text-muted-foreground">
            View and manage loyalty data for individual customers
          </p>
        </div>

        <CustomerLoyaltyProfile customerId={customerId} />
      </div>
    </AppLayout>
  )
}
