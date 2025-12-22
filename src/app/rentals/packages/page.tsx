'use client';

import React, { useState, useEffect } from 'react';
import AppLayout from '@/components/layout/AppLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useRouter } from 'next/navigation';
import { Plus, Search, Edit, Package } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import type { EquipmentPackage } from '@/types/rentals';

interface PackageWithItems extends EquipmentPackage {
  items?: Array<{ equipment_id: string; quantity: number; is_required: boolean }>;
}

export default function PackagesPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [packages, setPackages] = useState<PackageWithItems[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchPackages();
  }, []);

  const fetchPackages = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/rentals/packages');
      const result = await response.json();

      if (result.success) {
        setPackages(result.data || []);
      } else {
        toast({
          title: 'Error',
          description: 'Failed to load packages',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Error fetching packages:', error);
      toast({
        title: 'Error',
        description: 'Failed to load packages',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const filteredPackages = packages.filter(
    (pkg) =>
      pkg.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      pkg.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      pkg.package_type?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const formatCurrency = (amount?: number) => {
    if (!amount) return '-';
    return `R ${amount.toFixed(2)}`;
  };

  const breadcrumbs = [{ label: 'Rentals', href: '/rentals' }, { label: 'Packages' }];

  return (
    <AppLayout title="Equipment Packages" breadcrumbs={breadcrumbs}>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold tracking-tight">Equipment Packages</h1>
          <Button onClick={() => router.push('/rentals/packages/new')}>
            <Plus className="mr-2 h-4 w-4" />
            Create Package
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Package List</CardTitle>
            <CardDescription>Manage equipment packages and bundles</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="mb-4 flex items-center gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search packages..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-8"
                />
              </div>
            </div>

            {loading ? (
              <div className="py-8 text-center text-muted-foreground">Loading...</div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Items</TableHead>
                    <TableHead>Daily Rate</TableHead>
                    <TableHead>Weekly Rate</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredPackages.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center text-muted-foreground">
                        No packages found
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredPackages.map((pkg) => (
                      <TableRow key={pkg.package_id}>
                        <TableCell className="font-medium">{pkg.name}</TableCell>
                        <TableCell>{pkg.package_type || '-'}</TableCell>
                        <TableCell>
                          <Badge variant="outline">
                            <Package className="mr-1 h-3 w-3" />
                            {pkg.items?.length || 0} items
                          </Badge>
                        </TableCell>
                        <TableCell>{formatCurrency(pkg.rental_rate_daily)}</TableCell>
                        <TableCell>{formatCurrency(pkg.rental_rate_weekly)}</TableCell>
                        <TableCell>
                          <Badge variant={pkg.is_active ? 'default' : 'secondary'}>
                            {pkg.is_active ? 'Active' : 'Inactive'}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => router.push(`/rentals/packages/${pkg.package_id}`)}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}

