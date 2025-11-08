"use client"

import React from "react"
import AppLayout from "@/components/layout/AppLayout"
import RuleEngineBuilder from "@/components/loyalty/admin/RuleEngineBuilder"

/**
 * Loyalty Rules Admin Page
 *
 * Drag-and-drop rule builder with test functionality.
 * Allows admins to create complex earning and redemption rules with conditions.
 */
export default function LoyaltyRulesPage() {
  return (
    <AppLayout
      breadcrumbs={[
        { label: "Loyalty & Rewards", href: "/admin/loyalty" },
        { label: "Rules" },
      ]}
    >
      <div className="max-w-7xl mx-auto w-full space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Loyalty Rules</h1>
          <p className="text-muted-foreground">
            Build and test earning and redemption rules with custom conditions
          </p>
        </div>

        <RuleEngineBuilder />
      </div>
    </AppLayout>
  )
}
