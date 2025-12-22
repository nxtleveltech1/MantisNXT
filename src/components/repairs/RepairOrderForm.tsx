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
import type { RepairOrder } from '@/types/repairs';

interface RepairOrderFormProps {
  order?: RepairOrder;
  onSubmit: (data: any) => void;
  onCancel: () => void;
}

export function RepairOrderForm({ order, onSubmit, onCancel }: RepairOrderFormProps) {
  const [formData, setFormData] = useState({
    reported_issue: order?.reported_issue || '',
    diagnosis: order?.diagnosis || '',
    status: order?.status || 'received',
    priority: order?.priority || 'normal',
    notes: order?.notes || '',
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle>{order ? 'Edit Repair Order' : 'New Repair Order'}</CardTitle>
        <CardDescription>Enter repair order details</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="reported_issue">Reported Issue *</Label>
          <Textarea
            id="reported_issue"
            value={formData.reported_issue}
            onChange={(e) => setFormData({ ...formData, reported_issue: e.target.value })}
            rows={4}
            required
          />
        </div>
        {order && (
          <div className="space-y-2">
            <Label htmlFor="diagnosis">Diagnosis</Label>
            <Textarea
              id="diagnosis"
              value={formData.diagnosis}
              onChange={(e) => setFormData({ ...formData, diagnosis: e.target.value })}
              rows={4}
            />
          </div>
        )}
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="priority">Priority</Label>
            <Select
              value={formData.priority}
              onValueChange={(value: any) => setFormData({ ...formData, priority: value })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="low">Low</SelectItem>
                <SelectItem value="normal">Normal</SelectItem>
                <SelectItem value="high">High</SelectItem>
                <SelectItem value="urgent">Urgent</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {order && (
            <div className="space-y-2">
              <Label htmlFor="status">Status</Label>
              <Select
                value={formData.status}
                onValueChange={(value: any) => setFormData({ ...formData, status: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="received">Received</SelectItem>
                  <SelectItem value="diagnosed">Diagnosed</SelectItem>
                  <SelectItem value="in_progress">In Progress</SelectItem>
                  <SelectItem value="waiting_parts">Waiting Parts</SelectItem>
                  <SelectItem value="testing">Testing</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}
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
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <Button onClick={() => onSubmit(formData)}>
            {order ? 'Update' : 'Create'} Repair Order
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

