"use client"

import React from "react"
import AppLayout from "@/components/layout/AppLayout"
import RewardCatalogManager from "@/components/loyalty/admin/RewardCatalogManager"

/**
 * Rewards Catalog Admin Page
 *
 * Full reward catalog management with stock tracking and availability controls.
 * Allows admins to create, edit, and manage reward items in the catalog.
 */
export default function RewardCatalogPage() {
  return (
    <AppLayout
      breadcrumbs={[
        { label: "Loyalty & Rewards", href: "/admin/loyalty" },
        { label: "Rewards" },
      ]}
    >
      <div className="max-w-7xl mx-auto w-full space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Reward Catalog</h1>
          <p className="text-muted-foreground">
            Manage reward items, pricing, stock levels, and availability
          </p>
        </div>

        <RewardCatalogManager />
      </div>
    </AppLayout>
  )
}
