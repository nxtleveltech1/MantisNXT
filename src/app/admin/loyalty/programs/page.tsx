"use client"

import React from "react"
import AdminLayout from "@/components/layout/AdminLayout"
import ProgramConfiguration from "@/components/loyalty/admin/ProgramConfiguration"

/**
 * Loyalty Programs Admin Page
 *
 * Full CRUD for loyalty programs with multi-step wizard for program setup.
 * Allows admins to create, edit, and manage loyalty program configurations.
 */
export default function LoyaltyProgramsPage() {
  return (
    <AdminLayout
      breadcrumbs={[
        { label: "Loyalty & Rewards", href: "/admin/loyalty" },
        { label: "Programs" },
      ]}
    >
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Loyalty Programs</h1>
          <p className="text-muted-foreground">
            Create and manage loyalty programs with custom tiers, benefits, and rules
          </p>
        </div>

        <ProgramConfiguration />
      </div>
    </AdminLayout>
  )
}
