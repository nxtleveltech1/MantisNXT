'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import AppLayout from '@/components/layout/AppLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Search, Package, ArrowRight } from 'lucide-react';
import { toast } from 'sonner';

export default function TrackingIndexPage() {
  const router = useRouter();
  const [trackingNumber, setTrackingNumber] = useState('');

  const handleTrack = (e: React.FormEvent) => {
    e.preventDefault();
    if (!trackingNumber.trim()) {
      toast.error('Please enter a tracking number');
      return;
    }
    router.push(`/logistics/tracking/${trackingNumber.trim()}`);
  };

  return (
    <AppLayout
      title="Track Delivery"
      breadcrumbs={[
        { label: 'Courier Logistics', href: '/logistics/dashboard' },
        { label: 'Tracking' },
      ]}
    >
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Track Delivery</h1>
          <p className="text-muted-foreground">Enter a tracking number to view delivery status</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Package className="h-5 w-5" />
              Track Your Package
            </CardTitle>
            <CardDescription>Enter your tracking number below to get real-time updates</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleTrack} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="tracking_number">Tracking Number</Label>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 transform text-gray-400" />
                    <Input
                      id="tracking_number"
                      value={trackingNumber}
                      onChange={e => setTrackingNumber(e.target.value)}
                      placeholder="Enter tracking number (e.g., TRACK123456)"
                      className="pl-10"
                      autoFocus
                    />
                  </div>
                  <Button type="submit">
                    Track
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </div>
              </div>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>How to Track</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-muted-foreground">
            <p>• Enter your tracking number in the field above</p>
            <p>• Your tracking number can be found in your delivery confirmation email</p>
            <p>• View real-time updates on your package location and status</p>
            <p>• Get estimated delivery times and delivery history</p>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}




