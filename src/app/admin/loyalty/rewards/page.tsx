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
      title="Loyalty & Rewards"
      breadcrumbs={[
        { label: "Loyalty & Rewards", href: "/admin/loyalty" },
        { label: "Rewards" },
      ]}
    >
      <div className="mx-auto w-full space-y-6 xl:max-w-7xl">
        <RewardCatalogManager />
      </div>
    </AppLayout>
  )
}
