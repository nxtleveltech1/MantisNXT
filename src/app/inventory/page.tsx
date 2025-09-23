'use client'

import React from 'react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import InventoryDashboard from '@/components/dashboard/InventoryDashboard'
import InventoryManagement from '@/components/inventory/InventoryManagement'
import PricelistUploadWizard from '@/components/inventory/PricelistUploadWizard'


export default function InventoryPage() {
  return (
    <div className="container mx-auto py-6 space-y-6">
      <Tabs defaultValue="dashboard" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
          <TabsTrigger value="management">Inventory Management</TabsTrigger>
          <TabsTrigger value="upload">Import Data</TabsTrigger>
        </TabsList>

        <TabsContent value="dashboard" className="space-y-6">
          <InventoryDashboard />
        </TabsContent>

        <TabsContent value="management" className="space-y-6">
          <InventoryManagement />
        </TabsContent>

        <TabsContent value="upload" className="space-y-6">
          <div className="space-y-4">
            <div>
              <h2 className="text-2xl font-bold tracking-tight mb-2">Import Inventory Data</h2>
              <p className="text-muted-foreground">
                Upload and process inventory data from Excel or CSV files
              </p>
            </div>
            <PricelistUploadWizard
              onComplete={async (result) => {
                console.log('Upload completed:', result)
              }}
            />
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
