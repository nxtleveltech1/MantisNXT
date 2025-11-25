"use client"

import React from 'react'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Package, ArrowRight } from 'lucide-react'

interface SupplierProductWorkflowProps {
  showLegacyWorkflow?: boolean;
}

export default function SupplierProductWorkflow({ showLegacyWorkflow = false }: SupplierProductWorkflowProps) {
  // If legacy workflow is requested, show a placeholder
  if (showLegacyWorkflow) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Legacy Supplier Product Workflow</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            The legacy workflow has been deprecated. Please use the NXT-SPP system instead.
          </p>
        </CardContent>
      </Card>
    );
  }

  // Default: Show migration notice and redirect
  return (
    <div className="text-center py-12">
      <div className="max-w-2xl mx-auto">
        <div className="mb-6">
          <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Package className="w-8 h-8 text-blue-600" />
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
              <span className="font-semibold text-green-800">Sup SOH Reporting</span>
            </div>
            <p className="text-sm text-green-700">Supplier stock-on-hand reporting (Sup SOH)</p>
          </div>
        </div>
        
        <div className="space-y-4">
          <Link href="/nxt-spp">
            <Button size="lg" className="text-lg px-8 py-3">
              Go to NXT-SPP System
              <ArrowRight className="w-5 h-5 ml-2" />
            </Button>
          </Link>
          
          <div className="text-sm text-gray-500">
            <Link href="/docs/integration" className="underline hover:text-gray-700">
              Learn more about the integration
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}