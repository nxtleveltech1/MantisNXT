"use client"

import React from "react"
import AdminLayout from "@/components/layout/AdminLayout"
import RedemptionQueue from "@/components/loyalty/admin/RedemptionQueue"

/**
 * Redemptions Queue Admin Page
 *
 * Manage redemption workflow and approval queue.
 * Allows admins to process, approve, and fulfill customer redemption requests.
 */
export default function RedemptionsQueuePage() {
  return (
    <AdminLayout
      breadcrumbs={[
        { label: "Loyalty & Rewards", href: "/admin/loyalty" },
        { label: "Redemptions" },
      ]}
    >
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Redemption Queue</h1>
          <p className="text-muted-foreground">
            Process and manage customer reward redemption requests
          </p>
        </div>

        <RedemptionQueue />
      </div>
    </AdminLayout>
  )
}
