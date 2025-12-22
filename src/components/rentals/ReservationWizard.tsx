'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ChevronRight, ChevronLeft, Check } from 'lucide-react';

interface ReservationWizardProps {
  onComplete: (data: any) => void;
  onCancel: () => void;
}

export function ReservationWizard({ onComplete, onCancel }: ReservationWizardProps) {
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    customer_id: '',
    event_name: '',
    rental_start_date: '',
    rental_end_date: '',
    items: [] as Array<{ equipment_id: string; quantity: number }>,
  });

  const steps = [
    { number: 1, title: 'Customer & Event' },
    { number: 2, title: 'Select Equipment' },
    { number: 3, title: 'Review & Confirm' },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        {steps.map((s) => (
          <div key={s.number} className="flex items-center flex-1">
            <div className="flex flex-col items-center">
              <div
                className={`flex h-10 w-10 items-center justify-center rounded-full border-2 ${
                  step >= s.number
                    ? 'border-primary bg-primary text-primary-foreground'
                    : 'border-muted'
                }`}
              >
                {step > s.number ? <Check className="h-5 w-5" /> : s.number}
              </div>
              <p className="mt-2 text-sm font-medium">{s.title}</p>
            </div>
            {s.number < steps.length && (
              <div className={`flex-1 h-0.5 mx-2 ${step > s.number ? 'bg-primary' : 'bg-muted'}`} />
            )}
          </div>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{steps[step - 1].title}</CardTitle>
        </CardHeader>
        <CardContent>
          {/* Step content would go here */}
          <div className="flex justify-between mt-6">
            <Button variant="outline" onClick={onCancel}>
              Cancel
            </Button>
            <div className="flex gap-2">
              {step > 1 && (
                <Button variant="outline" onClick={() => setStep(step - 1)}>
                  <ChevronLeft className="mr-2 h-4 w-4" />
                  Previous
                </Button>
              )}
              {step < steps.length ? (
                <Button onClick={() => setStep(step + 1)}>
                  Next
                  <ChevronRight className="ml-2 h-4 w-4" />
                </Button>
              ) : (
                <Button onClick={() => onComplete(formData)}>
                  Complete
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

