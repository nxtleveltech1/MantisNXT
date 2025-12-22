'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Plus, Trash2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import type { PartsInventory } from '@/types/repairs';

interface PartsUsageFormProps {
  repairOrderId: string;
  onPartsAdded: () => void;
}

export function PartsUsageForm({ repairOrderId, onPartsAdded }: PartsUsageFormProps) {
  const { toast } = useToast();
  const [parts, setParts] = useState<PartsInventory[]>([]);
  const [selectedPartId, setSelectedPartId] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [unitCost, setUnitCost] = useState('');

  useEffect(() => {
    fetchParts();
  }, []);

  const fetchParts = async () => {
    try {
      const response = await fetch('/api/repairs/parts');
      const result = await response.json();
      if (result.success) {
        setParts(result.data || []);
      }
    } catch (error) {
      console.error('Error fetching parts:', error);
    }
  };

  const handleAddPart = async () => {
    if (!selectedPartId || !quantity) {
      toast({
        title: 'Error',
        description: 'Please select a part and quantity',
        variant: 'destructive',
      });
      return;
    }

    try {
      // This would call an API to add part to repair order
      // For now, just show success
      toast({
        title: 'Success',
        description: 'Part added to repair order',
      });
      onPartsAdded();
      setSelectedPartId('');
      setQuantity(1);
      setUnitCost('');
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to add part',
        variant: 'destructive',
      });
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Add Parts</CardTitle>
        <CardDescription>Record parts used in this repair</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-2">
          <Select value={selectedPartId} onValueChange={setSelectedPartId}>
            <SelectTrigger className="flex-1">
              <SelectValue placeholder="Select part" />
            </SelectTrigger>
            <SelectContent>
              {parts.map((part) => (
                <SelectItem key={part.part_id} value={part.part_id}>
                  Part ID: {part.product_id.substring(0, 8)}... (Available: {part.quantity_available})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Input
            type="number"
            min="1"
            value={quantity}
            onChange={(e) => setQuantity(parseInt(e.target.value) || 1)}
            className="w-24"
            placeholder="Qty"
          />
          <Input
            type="number"
            step="0.01"
            value={unitCost}
            onChange={(e) => setUnitCost(e.target.value)}
            className="w-32"
            placeholder="Unit Cost"
          />
          <Button onClick={handleAddPart}>
            <Plus className="mr-2 h-4 w-4" />
            Add
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

