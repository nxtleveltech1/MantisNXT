'use client';

import React from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Home, ArrowLeft, Building2, FileX, Search, HelpCircle } from 'lucide-react';

export default function NotFound() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-gray-50 via-blue-50 to-indigo-50 p-4">
      <div className="w-full max-w-2xl text-center">
        {/* Logo and Branding */}
        <div className="mb-8 flex items-center justify-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-600 text-white shadow-lg">
            <Building2 className="h-6 w-6" />
          </div>
          <div className="text-left">
            <h1 className="text-2xl font-bold text-gray-900">MantisNXT</h1>
            <p className="text-sm text-gray-600">Procurement Management</p>
          </div>
        </div>

        {/* Main 404 Content */}
        <Card className="mb-8 border-0 bg-white/80 shadow-xl backdrop-blur-sm">
          <CardContent className="p-12">
            <div className="mb-6 flex justify-center">
              <div className="relative">
                <div className="flex h-32 w-32 items-center justify-center rounded-full bg-gray-100 text-gray-400">
                  <FileX className="h-16 w-16" />
                </div>
                <div className="absolute -top-2 -right-2 flex h-12 w-12 items-center justify-center rounded-full bg-red-100 text-red-600">
                  <span className="text-xl font-bold">404</span>
                </div>
              </div>
            </div>

            <h2 className="mb-4 text-4xl font-bold text-gray-900">Page Not Found</h2>

            <p className="mx-auto mb-8 max-w-lg text-lg text-gray-600">
              Sorry, we couldn&apos;t find the page you&apos;re looking for. It might have been
              moved, deleted, or the URL might be incorrect.
            </p>

            {/* Action Buttons */}
            <div className="flex flex-col items-center justify-center gap-4 sm:flex-row">
              <Button asChild className="bg-blue-600 px-8 py-3 text-white hover:bg-blue-700">
                <Link href="/">
                  <Home className="mr-2 h-4 w-4" />
                  Go to Dashboard
                </Link>
              </Button>

              <Button variant="outline" className="px-8 py-3" onClick={() => window.history.back()}>
                <ArrowLeft className="mr-2 h-4 w-4" />
                Go Back
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Quick Navigation Links */}
        <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-3">
          <Card className="cursor-pointer border-0 bg-white/60 backdrop-blur-sm transition-shadow hover:shadow-md">
            <CardContent className="p-6">
              <Link href="/suppliers" className="group block text-center">
                <Building2 className="mx-auto mb-3 h-8 w-8 text-blue-600 group-hover:text-blue-700" />
                <h3 className="mb-1 font-semibold text-gray-900">Suppliers</h3>
                <p className="text-sm text-gray-600">Manage your suppliers</p>
              </Link>
            </CardContent>
          </Card>

          <Card className="cursor-pointer border-0 bg-white/60 backdrop-blur-sm transition-shadow hover:shadow-md">
            <CardContent className="p-6">
              <Link href="/purchase-orders" className="group block text-center">
                <Search className="mx-auto mb-3 h-8 w-8 text-blue-600 group-hover:text-blue-700" />
                <h3 className="mb-1 font-semibold text-gray-900">Orders</h3>
                <p className="text-sm text-gray-600">View purchase orders</p>
              </Link>
            </CardContent>
          </Card>

          <Card className="cursor-pointer border-0 bg-white/60 backdrop-blur-sm transition-shadow hover:shadow-md">
            <CardContent className="p-6">
              <Link href="/analytics" className="group block text-center">
                <HelpCircle className="mx-auto mb-3 h-8 w-8 text-blue-600 group-hover:text-blue-700" />
                <h3 className="mb-1 font-semibold text-gray-900">Analytics</h3>
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
              className="cursor-pointer border-none bg-transparent font-medium text-blue-600 underline hover:text-blue-700"
              onClick={() => {
                /* Add support contact logic here */
              }}
            >
              support team
            </button>{' '}
            or check our{' '}
            <button
              className="cursor-pointer border-none bg-transparent font-medium text-blue-600 underline hover:text-blue-700"
              onClick={() => {
                /* Add documentation navigation logic here */
              }}
            >
              documentation
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}
