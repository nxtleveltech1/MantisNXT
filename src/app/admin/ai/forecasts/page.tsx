"use client"

import React from "react"
import AdminLayout from "@/components/layout/AdminLayout"
import ForecastViewer from "@/components/ai/admin/ForecastViewer"

/**
 * AI Forecasts Admin Page
 *
 * View and analyze AI-generated forecasts with visualization.
 * Allows admins to review demand forecasts, trends, and predictions.
 */
export default function ForecastsPage() {
  return (
    <AdminLayout
      breadcrumbs={[
        { label: "AI Services", href: "/admin/ai" },
        { label: "Forecasts" },
      ]}
    >
      <div className="max-w-7xl mx-auto w-full space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Demand Forecasts</h1>
          <p className="text-muted-foreground">
            View AI-generated demand forecasts, trends, and predictions
          </p>
        </div>

        <ForecastViewer />
      </div>
    </AdminLayout>
  )
}
