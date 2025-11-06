"use client"

import React from "react"
import AdminLayout from "@/components/layout/AdminLayout"
import AIServiceConfiguration from "@/components/ai/admin/AIServiceConfiguration"

/**
 * AI Service Configuration Admin Page
 *
 * Multi-provider AI setup and configuration management.
 * Allows admins to configure AI services, API keys, and service settings.
 */
export default function AIConfigPage() {
  return (
    <AdminLayout
      breadcrumbs={[
        { label: "AI Services", href: "/admin/ai" },
        { label: "Configuration" },
      ]}
    >
      <div className="w-full space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">AI Service Configuration</h1>
          <p className="text-muted-foreground">
            Configure AI providers, API keys, and service settings
          </p>
        </div>

        <AIServiceConfiguration />
      </div>
    </AdminLayout>
  )
}
