// UPDATE: [2025-01-27] Fixed equipment list refresh and auto-refresh on page visibility
// UPDATE: 2025-01-27 Fixed type errors with DECIMAL fields for rental_rate_daily display
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
import { Plus, Search, Edit, Trash2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import type { Equipment } from '@/types/rentals';

export default function EquipmentPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [equipment, setEquipment] = useState<Equipment[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchEquipment();
  }, []);

  // Refresh equipment list when page becomes visible (e.g., returning from new equipment page)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        fetchEquipment();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  // Also refresh when returning to this page via router
  useEffect(() => {
    const handleFocus = () => {
      fetchEquipment();
    };

    window.addEventListener('focus', handleFocus);
    return () => {
      window.removeEventListener('focus', handleFocus);
    };
  }, []);

  const fetchEquipment = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/rentals/equipment?limit=1000');
      const result = await response.json();
      console.log('Equipment list API response:', result);

      if (result.success) {
        const equipment = result.data || [];
        console.log('Equipment loaded:', equipment.length, 'items');
        setEquipment(equipment);
        if (equipment.length === 0) {
          toast({
            title: 'No Equipment',
            description: 'No equipment found. Please add equipment first.',
            variant: 'default',
          });
        }
      } else {
        console.error('Equipment fetch error:', result);
        toast({
          title: 'Error',
          description: result.error || 'Failed to load equipment',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Error fetching equipment:', error);
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to load equipment',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const filteredEquipment = equipment.filter(
    (item) =>
      item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.sku.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.equipment_type.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const breadcrumbs = [{ label: 'Rentals', href: '/rentals' }, { label: 'Equipment' }];

  return (
    <AppLayout title="Equipment Catalog" breadcrumbs={breadcrumbs}>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold tracking-tight">Equipment Catalog</h1>
          <div className="flex gap-2">
            <Button variant="outline" onClick={fetchEquipment}>
              Refresh
            </Button>
            <Button onClick={() => router.push('/rentals/equipment/new')}>
              <Plus className="mr-2 h-4 w-4" />
              Add Equipment
            </Button>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Equipment List</CardTitle>
            <CardDescription>Manage your AV equipment inventory</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="mb-4 flex items-center gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search equipment..."
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
                    <TableHead>SKU</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Daily Rate</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredEquipment.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center text-muted-foreground">
                        No equipment found
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredEquipment.map((item) => (
                      <TableRow key={item.equipment_id}>
                        <TableCell className="font-medium">{item.sku}</TableCell>
                        <TableCell>{item.name}</TableCell>
                        <TableCell>{item.equipment_type}</TableCell>
                        <TableCell>
                          <Badge
                            variant={
                              item.availability_status === 'available' ? 'default' : 'secondary'
                            }
                          >
                            {item.availability_status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {item.rental_rate_daily
                            ? `R ${(Number(item.rental_rate_daily) || 0).toFixed(2)}`
                            : '-'}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => router.push(`/rentals/equipment/${item.equipment_id}`)}
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

