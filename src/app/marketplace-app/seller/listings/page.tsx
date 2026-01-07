"use client";

import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Plus, Package } from "lucide-react";

export default function SellerListingsPage() {
  const router = useRouter();

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200">
        <div className="flex items-center justify-between px-6 py-4">
          <div className="flex items-center gap-4">
            <Button variant="outline" onClick={() => router.push("/marketplace-app/seller")}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Dashboard
            </Button>
            <h1 className="text-2xl font-bold text-gray-900">My Listings</h1>
          </div>
          <Button onClick={() => router.push("/marketplace-app/seller/listings/create")}>
            <Plus className="h-4 w-4 mr-2" />
            Create Listing
          </Button>
        </div>
      </header>

      <main className="p-6 max-w-7xl mx-auto">
        <Card>
          <CardHeader>
            <CardTitle>Your Listings</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-center py-12">
              <Package className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground mb-4">You haven't created any listings yet</p>
              <Button onClick={() => router.push("/marketplace-app/seller/listings/create")}>
                <Plus className="h-4 w-4 mr-2" />
                Create Your First Listing
              </Button>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}

