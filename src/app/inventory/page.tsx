'use client'

import React, { useState } from 'react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import SelfContainedLayout from '@/components/layout/SelfContainedLayout'
import EnhancedInventoryDashboard from '@/components/inventory/EnhancedInventoryDashboard'
import AsyncBoundary from '@/components/ui/AsyncBoundary'
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
        {/* NXT-SPP Integration Banner */}
        <Alert className="border-green-200 bg-green-50">
          <Info className="h-4 w-4 text-green-600" />
          <AlertDescription className="text-green-900">
            <strong>✅ NXT-SPP Integration Complete:</strong> The NXT-SPP system is now the unified platform for all supplier inventory management. All pricelist uploads, product selection, and stock tracking should be done through NXT-SPP.
            <Link href="/nxt-spp" className="ml-2 inline-flex items-center px-3 py-1 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors font-semibold">
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

          <TabsContent value="workflow" className="space-y-6">
            <div className="text-center py-12">
              <div className="max-w-2xl mx-auto">
                <div className="mb-6">
                  <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                    </svg>
                  </div>
                  <h2 className="text-2xl font-bold text-gray-900 mb-2">Supplier Product Workflow Has Moved</h2>
                  <p className="text-gray-600 mb-6">
                    The supplier product workflow is now part of the unified NXT-SPP system, providing a streamlined experience for managing supplier pricelists, product selection, and inventory.
                  </p>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
                  <div className="p-4 border rounded-lg bg-green-50">
                    <div className="flex items-center mb-2">
                      <svg className="w-5 h-5 text-green-600 mr-2" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                      <span className="font-semibold text-green-800">Upload & Validate</span>
                    </div>
                    <p className="text-sm text-green-700">Upload and validate supplier pricelists</p>
                  </div>
                  
                  <div className="p-4 border rounded-lg bg-green-50">
                    <div className="flex items-center mb-2">
                      <svg className="w-5 h-5 text-green-600 mr-2" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                      <span className="font-semibold text-green-800">Automatic Merging</span>
                    </div>
                    <p className="text-sm text-green-700">Automatic product catalog merging</p>
                  </div>
                  
                  <div className="p-4 border rounded-lg bg-green-50">
                    <div className="flex items-center mb-2">
                      <svg className="w-5 h-5 text-green-600 mr-2" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                      <span className="font-semibold text-green-800">Selection Interface</span>
                    </div>
                    <p className="text-sm text-green-700">Inventory selection interface (ISI)</p>
                  </div>
                  
                  <div className="p-4 border rounded-lg bg-green-50">
                    <div className="flex items-center mb-2">
                      <svg className="w-5 h-5 text-green-600 mr-2" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                      <span className="font-semibold text-green-800">Stock Reporting</span>
                    </div>
                    <p className="text-sm text-green-700">Stock on hand reporting</p>
                  </div>
                </div>
                
                <div className="space-y-4">
                  <Link 
                    href="/nxt-spp"
                    className="inline-flex items-center px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-semibold text-lg"
                  >
                    Go to NXT-SPP System
                    <svg className="w-5 h-5 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                    </svg>
                  </Link>
                  
                  <div className="text-sm text-gray-500">
                    <Link href="/docs/integration" className="underline hover:text-gray-700">
                      Learn more about the integration
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="upload" className="space-y-6">
            <div className="space-y-4">
              <div>
                <h2 className="text-2xl font-bold tracking-tight mb-2">Import Inventory Data</h2>
                <p className="text-muted-foreground">
                  Upload and process inventory data from Excel or CSV files with comprehensive validation and mapping
                </p>
              </div>

              <Alert className="border-orange-200 bg-orange-50">
                <Info className="h-4 w-4 text-orange-600" />
                <AlertDescription className="text-orange-900">
                  <strong>For full workflow control, use the NXT-SPP system.</strong> This upload dialog provides basic functionality, but the complete workflow is available in NXT-SPP.
                  <Link href="/nxt-spp?tab=upload" className="ml-2 underline font-semibold hover:text-orange-700">
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
