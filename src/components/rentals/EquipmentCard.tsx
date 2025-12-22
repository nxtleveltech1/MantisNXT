'use client';

import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Eye } from 'lucide-react';
import type { Equipment } from '@/types/rentals';
import { useRouter } from 'next/navigation';

interface EquipmentCardProps {
  equipment: Equipment;
}

export function EquipmentCard({ equipment }: EquipmentCardProps) {
  const router = useRouter();

  const formatCurrency = (amount?: number) => {
    if (!amount) return 'N/A';
    return new Intl.NumberFormat('en-ZA', {
      style: 'currency',
      currency: 'ZAR',
    }).format(amount);
  };

  return (
    <Card className="hover:shadow-lg transition-shadow">
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <CardTitle className="text-lg">{equipment.name}</CardTitle>
            <CardDescription className="mt-1">
              {equipment.equipment_type} {equipment.brand && `• ${equipment.brand}`}
            </CardDescription>
          </div>
          <Badge
            variant={
              equipment.availability_status === 'available' ? 'default' : 'secondary'
            }
          >
            {equipment.availability_status}
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">SKU:</span>
            <span className="font-medium">{equipment.sku}</span>
          </div>
          {equipment.rental_rate_daily && (
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Daily Rate:</span>
              <span className="font-medium">{formatCurrency(equipment.rental_rate_daily)}</span>
            </div>
          )}
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Condition:</span>
            <Badge variant="outline">{equipment.condition_status}</Badge>
          </div>
          <Button
            className="w-full mt-4"
            variant="outline"
            onClick={() => router.push(`/rentals/equipment/${equipment.equipment_id}`)}
          >
            <Eye className="mr-2 h-4 w-4" />
            View Details
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

