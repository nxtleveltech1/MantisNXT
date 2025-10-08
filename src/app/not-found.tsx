"use client"

import React from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { 
  Home, 
  ArrowLeft, 
  Building2, 
  FileX, 
  Search,
  HelpCircle
} from 'lucide-react'

export default function NotFound() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-indigo-50 flex items-center justify-center p-4">
      <div className="max-w-2xl w-full text-center">
        {/* Logo and Branding */}
        <div className="flex items-center justify-center gap-3 mb-8">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-600 text-white shadow-lg">
            <Building2 className="h-6 w-6" />
          </div>
          <div className="text-left">
            <h1 className="text-2xl font-bold text-gray-900">MantisNXT</h1>
            <p className="text-sm text-gray-600">Procurement Management</p>
          </div>
        </div>

        {/* Main 404 Content */}
        <Card className="mb-8 border-0 shadow-xl bg-white/80 backdrop-blur-sm">
          <CardContent className="p-12">
            <div className="flex justify-center mb-6">
              <div className="relative">
                <div className="flex h-32 w-32 items-center justify-center rounded-full bg-gray-100 text-gray-400">
                  <FileX className="h-16 w-16" />
                </div>
                <div className="absolute -top-2 -right-2 flex h-12 w-12 items-center justify-center rounded-full bg-red-100 text-red-600">
                  <span className="text-xl font-bold">404</span>
                </div>
              </div>
            </div>

            <h2 className="text-4xl font-bold text-gray-900 mb-4">
              Page Not Found
            </h2>
            
            <p className="text-lg text-gray-600 mb-8 max-w-lg mx-auto">
              Sorry, we couldn't find the page you're looking for. It might have been moved, 
              deleted, or the URL might be incorrect.
            </p>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
              <Button asChild className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3">
                <Link href="/">
                  <Home className="mr-2 h-4 w-4" />
                  Go to Dashboard
                </Link>
              </Button>
              
              <Button 
                variant="outline" 
                className="px-8 py-3"
                onClick={() => window.history.back()}
              >
                <ArrowLeft className="mr-2 h-4 w-4" />
                Go Back
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Quick Navigation Links */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
          <Card className="hover:shadow-md transition-shadow cursor-pointer border-0 bg-white/60 backdrop-blur-sm">
            <CardContent className="p-6">
              <Link href="/suppliers" className="block text-center group">
                <Building2 className="h-8 w-8 mx-auto mb-3 text-blue-600 group-hover:text-blue-700" />
                <h3 className="font-semibold text-gray-900 mb-1">Suppliers</h3>
                <p className="text-sm text-gray-600">Manage your suppliers</p>
              </Link>
            </CardContent>
          </Card>

          <Card className="hover:shadow-md transition-shadow cursor-pointer border-0 bg-white/60 backdrop-blur-sm">
            <CardContent className="p-6">
              <Link href="/purchase-orders" className="block text-center group">
                <Search className="h-8 w-8 mx-auto mb-3 text-blue-600 group-hover:text-blue-700" />
                <h3 className="font-semibold text-gray-900 mb-1">Orders</h3>
                <p className="text-sm text-gray-600">View purchase orders</p>
              </Link>
            </CardContent>
          </Card>

          <Card className="hover:shadow-md transition-shadow cursor-pointer border-0 bg-white/60 backdrop-blur-sm">
            <CardContent className="p-6">
              <Link href="/analytics" className="block text-center group">
                <HelpCircle className="h-8 w-8 mx-auto mb-3 text-blue-600 group-hover:text-blue-700" />
                <h3 className="font-semibold text-gray-900 mb-1">Analytics</h3>
                <p className="text-sm text-gray-600">View insights</p>
              </Link>
            </CardContent>
          </Card>
        </div>

        {/* Contact Information */}
        <div className="text-center text-sm text-gray-500">
          <p>
            Need help? Contact our{' '}
            <button 
              className="text-blue-600 hover:text-blue-700 font-medium underline bg-transparent border-none cursor-pointer"
              onClick={() => {/* Add support contact logic here */}}
            >
              support team
            </button>{' '}
            or check our{' '}
            <button 
              className="text-blue-600 hover:text-blue-700 font-medium underline bg-transparent border-none cursor-pointer"
              onClick={() => {/* Add documentation navigation logic here */}}
            >
              documentation
            </button>
          </p>
        </div>
      </div>
    </div>
  )
}