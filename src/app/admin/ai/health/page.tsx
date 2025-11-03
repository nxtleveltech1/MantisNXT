"use client"

import React from "react"
import AdminLayout from "@/components/layout/AdminLayout"
import AIServiceHealthMonitor from "@/components/ai/admin/AIServiceHealthMonitor"

/**
 * AI Service Health Monitor Admin Page
 *
 * Real-time service monitoring with health status and performance metrics.
 * Allows admins to monitor AI service availability, latency, and errors.
 */
export default function AIHealthPage() {
  return (
    <AdminLayout
      breadcrumbs={[
        { label: "AI Services", href: "/admin/ai" },
        { label: "Health Monitor" },
      ]}
    >
      <div className="max-w-7xl mx-auto w-full space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">AI Service Health</h1>
          <p className="text-muted-foreground">
            Monitor AI service availability, performance, and error rates in real-time
          </p>
        </div>

        <AIServiceHealthMonitor />
      </div>
    </AdminLayout>
  )
}
