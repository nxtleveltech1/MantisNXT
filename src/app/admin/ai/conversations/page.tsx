"use client"

import React from "react"
import AdminLayout from "@/components/layout/AdminLayout"
import ConversationHistory from "@/components/ai/admin/ConversationHistory"

/**
 * AI Conversations History Admin Page
 *
 * View and manage AI conversation logs and history.
 * Provides search, filtering, and export capabilities for conversation threads.
 */
export default function AIConversationsPage() {
  return (
    <AdminLayout
      breadcrumbs={[
        { label: "AI Services", href: "/admin/ai" },
        { label: "Conversations" },
      ]}
    >
      <div className="w-full space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">AI Conversations</h1>
          <p className="text-muted-foreground">
            Review conversation history, search messages, and export conversation data
          </p>
        </div>

        <ConversationHistory />
      </div>
    </AdminLayout>
  )
}