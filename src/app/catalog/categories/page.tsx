"use client"

import React from 'react'
import SelfContainedLayout from '@/components/layout/SelfContainedLayout'

export default function CategoryManagementPage() {
  return (
    <SelfContainedLayout title="Category Management" breadcrumbs={[{ label: 'Inventory Management', href: '/inventory' }, { label: 'Category Management' }]}>
      <div className="space-y-4">
        <h1 className="text-2xl font-bold">Category Management</h1>
        <p className="text-muted-foreground">Manage product categories. (Placeholder screen)</p>
      </div>
    </SelfContainedLayout>
  )
}

