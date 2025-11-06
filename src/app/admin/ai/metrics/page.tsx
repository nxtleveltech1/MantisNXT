"use client"

import React from "react"
import AdminLayout from "@/components/layout/AdminLayout"
import AIMetricsMonitor from "@/components/ai/admin/AIMetricsMonitor"

/**
 * AI Metrics Monitor Admin Page
 *
 * Real-time monitoring and analytics dashboard for AI service performance.
 * Displays comprehensive metrics including predictions, accuracy, response times,
 * and service health status across all AI services.
 */
export default function AIMetricsPage() {
  return (
    <AdminLayout
      breadcrumbs={[
        { label: "AI Services", href: "/admin/ai" },
        { label: "Metrics" },
      ]}
    >
      <div className="max-w-7xl mx-auto w-full space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">AI Metrics Monitor</h1>
          <p className="text-muted-foreground">
            Track performance, accuracy, and health status of AI services in real-time
          </p>
        </div>

        <AIMetricsMonitor />
      </div>
    </AdminLayout>
  )
}