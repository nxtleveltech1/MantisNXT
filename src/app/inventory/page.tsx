'use client'

import React, { useState } from 'react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import SelfContainedLayout from '@/components/layout/SelfContainedLayout'
import EnhancedInventoryDashboard from '@/components/inventory/EnhancedInventoryDashboard'
import AsyncBoundary from '@/components/ui/AsyncBoundary'
import InventoryManagement from '@/components/inventory/InventoryManagement'
import SupplierInventoryView from '@/components/inventory/SupplierInventoryView'
import ProductStockManagement from '@/components/inventory/ProductStockManagement'
import InventoryDetailView from '@/components/inventory/InventoryDetailView'

export default function InventoryPage() {
  const [selectedDetailItem, setSelectedDetailItem] = useState<string | null>(null)

  const breadcrumbs = [
    { label: 'Inventory Management' }
  ]

  return (
    <SelfContainedLayout
      title="Comprehensive Inventory Management"
      breadcrumbs={breadcrumbs}
    >
      <div className="space-y-6">
        <Tabs defaultValue="management" className="space-y-6">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
            <TabsTrigger value="management">Inventory Management</TabsTrigger>
            <TabsTrigger value="supplier-view">By Supplier</TabsTrigger>
            <TabsTrigger value="stock-mgmt">Stock Management</TabsTrigger>
            <TabsTrigger value="analytics">Advanced Analytics</TabsTrigger>
          </TabsList>

          <TabsContent value="dashboard" className="space-y-6">
            <AsyncBoundary>
              <EnhancedInventoryDashboard />
            </AsyncBoundary>
          </TabsContent>

          <TabsContent value="management" className="space-y-6">
            <InventoryManagement />
          </TabsContent>

          <TabsContent value="supplier-view" className="space-y-6">
            <SupplierInventoryView />
          </TabsContent>

          <TabsContent value="stock-mgmt" className="space-y-6">
            <ProductStockManagement />
          </TabsContent>

          <TabsContent value="analytics" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="lg:col-span-2 text-center py-12">
                <h2 className="text-2xl font-bold mb-4">Advanced Inventory Analytics</h2>
                <p className="text-muted-foreground mb-6">
                  Comprehensive analytics with AI-powered insights, demand forecasting, and optimization recommendations
                </p>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 max-w-4xl mx-auto">
                  <div className="p-6 border rounded-lg">
                    <h3 className="font-semibold mb-2">AI-Powered Insights</h3>
                    <p className="text-sm text-muted-foreground">
                      Machine learning algorithms analyze inventory patterns and provide intelligent recommendations
                    </p>
                  </div>
                  <div className="p-6 border rounded-lg">
                    <h3 className="font-semibold mb-2">Demand Forecasting</h3>
                    <p className="text-sm text-muted-foreground">
                      Predict future demand based on historical data, seasonality, and market trends
                    </p>
                  </div>
                  <div className="p-6 border rounded-lg">
                    <h3 className="font-semibold mb-2">Cost Optimization</h3>
                    <p className="text-sm text-muted-foreground">
                      Identify cost-saving opportunities through optimal ordering quantities and supplier selection
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </TabsContent>
        </Tabs>

        {selectedDetailItem && (
          <InventoryDetailView
            itemId={selectedDetailItem}
            onClose={() => setSelectedDetailItem(null)}
          />
        )}
      </div>
    </SelfContainedLayout>
  )
}
