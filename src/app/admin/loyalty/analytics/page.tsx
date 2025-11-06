"use client"

import React from "react"
import AdminLayout from "@/components/layout/AdminLayout"
import AILoyaltyAnalytics from "@/components/loyalty/admin/AILoyaltyAnalytics"
import LoyaltyLeaderboard from "@/components/loyalty/admin/LoyaltyLeaderboard"

/**
 * AI-Powered Loyalty Analytics Admin Page
 *
 * Advanced analytics powered by Claude AI including:
 * - Churn prediction and at-risk customer identification
 * - Engagement scoring with behavioral insights
 * - Reward catalog optimization recommendations
 * - Tier movement forecasting
 * - ROI analysis with financial breakdowns
 * - Fraud and abuse pattern detection
 *
 * @author Claude Code
 * @date 2025-11-04
 */
export default function LoyaltyAnalyticsPage() {
  return (
    <AdminLayout
      breadcrumbs={[
        { label: "Loyalty & Rewards", href: "/admin/loyalty" },
        { label: "AI Analytics" },
      ]}
    >
      <div className="max-w-7xl mx-auto w-full space-y-6">
        <AILoyaltyAnalytics />
        <LoyaltyLeaderboard />
      </div>
    </AdminLayout>
  )
}
