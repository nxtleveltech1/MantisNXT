"use client"

import React from "react"
import AdminLayout from "@/components/layout/AdminLayout"
import LoyaltyAnalytics from "@/components/loyalty/admin/LoyaltyAnalytics"
import LoyaltyLeaderboard from "@/components/loyalty/admin/LoyaltyLeaderboard"

/**
 * Loyalty Analytics Admin Page
 *
 * Charts, leaderboards, and performance metrics for loyalty programs.
 * Provides insights into program performance, customer engagement, and ROI.
 */
export default function LoyaltyAnalyticsPage() {
  return (
    <AdminLayout
      breadcrumbs={[
        { label: "Loyalty & Rewards", href: "/admin/loyalty" },
        { label: "Analytics" },
      ]}
    >
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Loyalty Analytics</h1>
          <p className="text-muted-foreground">
            Track program performance, customer engagement, and ROI metrics
          </p>
        </div>

        <div className="grid gap-6">
          <LoyaltyAnalytics />
          <LoyaltyLeaderboard />
        </div>
      </div>
    </AdminLayout>
  )
}
