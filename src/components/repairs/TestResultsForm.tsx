'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';

interface TestResultsFormProps {
  repairOrderId: string;
  onTestAdded: () => void;
}

export function TestResultsForm({ repairOrderId, onTestAdded }: TestResultsFormProps) {
  const { toast } = useToast();
  const [formData, setFormData] = useState({
    test_name: '',
    test_type: '',
    test_result: 'pass' as const,
    notes: '',
  });

  const handleSubmit = async () => {
    if (!formData.test_name.trim()) {
      toast({
        title: 'Error',
        description: 'Please enter a test name',
        variant: 'destructive',
      });
      return;
    }

    try {
      const response = await fetch('/api/repairs/tests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          repair_order_id: repairOrderId,
          ...formData,
        }),
      });

      const result = await response.json();
      if (result.success) {
        toast({
          title: 'Success',
          description: 'Test result recorded',
        });
        setFormData({
          test_name: '',
          test_type: '',
          test_result: 'pass',
          notes: '',
        });
        onTestAdded();
      } else {
        throw new Error(result.error);
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to record test',
        variant: 'destructive',
      });
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Record Test Result</CardTitle>
        <CardDescription>Add quality control test results</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="test_name">Test Name *</Label>
          <Input
            id="test_name"
            value={formData.test_name}
            onChange={(e) => setFormData({ ...formData, test_name: e.target.value })}
            placeholder="e.g., Functionality Test, Calibration Check"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="test_type">Test Type</Label>
          <Input
            id="test_type"
            value={formData.test_type}
            onChange={(e) => setFormData({ ...formData, test_type: e.target.value })}
            placeholder="functionality, calibration, stress_test, etc."
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="test_result">Result</Label>
          <Select
            value={formData.test_result}
            onValueChange={(value: any) => setFormData({ ...formData, test_result: value })}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="pass">Pass</SelectItem>
              <SelectItem value="fail">Fail</SelectItem>
              <SelectItem value="partial">Partial</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="notes">Notes</Label>
          <Textarea
            id="notes"
            value={formData.notes}
            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
            rows={3}
          />
        </div>
        <Button onClick={handleSubmit} className="w-full">
          Record Test Result
        </Button>
      </CardContent>
    </Card>
  );
}

