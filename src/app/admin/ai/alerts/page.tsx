"use client"

import React from "react"
import AdminLayout from "@/components/layout/AdminLayout"
import AIAlertManagement from "@/components/ai/admin/AIAlertManagement"

/**
 * AI Alert Management Admin Page
 *
 * Manage AI-generated alerts and notification workflows.
 * Allows admins to configure alert rules, thresholds, and notification channels.
 */
export default function AIAlertsPage() {
  return (
    <AdminLayout
      breadcrumbs={[
        { label: "AI Services", href: "/admin/ai" },
        { label: "Alerts" },
      ]}
    >
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">AI Alert Management</h1>
          <p className="text-muted-foreground">
            Configure alert rules, thresholds, and notification workflows
          </p>
        </div>

        <AIAlertManagement />
      </div>
    </AdminLayout>
  )
}
