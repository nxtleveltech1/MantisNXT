'use client'

import React, { useState } from 'react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import SelfContainedLayout from '@/components/layout/SelfContainedLayout'
import EnhancedInventoryDashboard from '@/components/inventory/EnhancedInventoryDashboard'
import InventoryManagement from '@/components/inventory/InventoryManagement'
import { EnhancedPricelistUpload } from '@/components/supplier-portfolio/EnhancedPricelistUpload'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Info } from 'lucide-react'
import Link from 'next/link'
import SupplierInventoryView from '@/components/inventory/SupplierInventoryView'
import ProductStockManagement from '@/components/inventory/ProductStockManagement'
import SupplierProductWorkflow from '@/components/inventory/SupplierProductWorkflow'
import InventoryDetailView from '@/components/inventory/InventoryDetailView'

export default function InventoryPage() {
  const [selectedDetailItem, setSelectedDetailItem] = useState<string | null>(null)
  const [uploadOpen, setUploadOpen] = useState(false)

  const breadcrumbs = [
    { label: "Inventory Management" }
  ]

  return (
    <SelfContainedLayout
      title="Comprehensive Inventory Management"
      breadcrumbs={breadcrumbs}
    >
      <div className="space-y-6">
        {/* NXT-SPP Banner */}
        <Alert className="border-blue-200 bg-blue-50">
          <Info className="h-4 w-4 text-blue-600" />
          <AlertDescription className="text-blue-900">
            <strong>New System Available:</strong> The NXT-SPP Supplier Inventory Portfolio system provides a streamlined workflow for uploading pricelists, selecting inventory, and tracking stock.
            <Link href="/nxt-spp" className="ml-2 underline font-semibold hover:text-blue-700">
              Go to NXT-SPP Dashboard →
            </Link>
          </AlertDescription>
        </Alert>

        <Tabs defaultValue="dashboard" className="space-y-6">
          <TabsList className="grid w-full grid-cols-7">
            <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
            <TabsTrigger value="management">Inventory</TabsTrigger>
            <TabsTrigger value="supplier-view">By Supplier</TabsTrigger>
            <TabsTrigger value="stock-mgmt">Stock Management</TabsTrigger>
            <TabsTrigger value="workflow">Supplier Workflow</TabsTrigger>
            <TabsTrigger value="upload">Import Data</TabsTrigger>
            <TabsTrigger value="analytics">Advanced Analytics</TabsTrigger>
          </TabsList>

          <TabsContent value="dashboard" className="space-y-6">
            <EnhancedInventoryDashboard />
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

          <TabsContent value="workflow" className="space-y-6">
            <SupplierProductWorkflow />
          </TabsContent>

          <TabsContent value="upload" className="space-y-6">
            <div className="space-y-4">
              <div>
                <h2 className="text-2xl font-bold tracking-tight mb-2">Import Inventory Data</h2>
                <p className="text-muted-foreground">
                  Upload and process inventory data from Excel or CSV files with comprehensive validation and mapping
                </p>
              </div>

              <Alert className="border-blue-200 bg-blue-50">
                <Info className="h-4 w-4 text-blue-600" />
                <AlertDescription className="text-blue-900">
                  <strong>Using the new single upload system.</strong> All uploads are now handled through the NXT-SPP system.
                  <Link href="/nxt-spp?tab=upload" className="ml-2 underline font-semibold hover:text-blue-700">
                    Go to full upload workflow →
                  </Link>
                </AlertDescription>
              </Alert>

              <div className="flex justify-center py-8">
                <button
                  onClick={() => setUploadOpen(true)}
                  className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
                >
                  Upload Pricelist
                </button>
              </div>

              <EnhancedPricelistUpload
                open={uploadOpen}
                onOpenChange={setUploadOpen}
                onComplete={async (result) => {
                  console.log('Upload completed:', result)
                  setUploadOpen(false)
                }}
                autoValidate={true}
              />
            </div>
          </TabsContent>

          <TabsContent value="analytics" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Enhanced Analytics Features */}
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

        {/* Detail View Modal */}
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
