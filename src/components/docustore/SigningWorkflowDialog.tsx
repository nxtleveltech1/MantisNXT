'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { format } from 'date-fns';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { CalendarIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

const createSigningWorkflowSchema = z.object({
  expires_at: z.date().optional(),
  reminder_settings: z.object({
    enabled: z.boolean().default(true),
    days_before: z.array(z.number()).default([7, 3, 1]),
  }).optional(),
});

type CreateSigningWorkflowFormValues = z.infer<typeof createSigningWorkflowSchema>;

interface SigningWorkflowDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  documentId: string;
  onSuccess?: () => void;
}

export function SigningWorkflowDialog({
  open,
  onOpenChange,
  documentId,
  onSuccess,
}: SigningWorkflowDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<CreateSigningWorkflowFormValues>({
    resolver: zodResolver(createSigningWorkflowSchema),
    defaultValues: {
      reminder_settings: {
        enabled: true,
        days_before: [7, 3, 1],
      },
    },
  });

  const onSubmit = async (values: CreateSigningWorkflowFormValues) => {
    setIsSubmitting(true);
    try {
      const response = await fetch(`/api/v1/docustore/${documentId}/signing/workflow`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          document_id: documentId,
          expires_at: values.expires_at?.toISOString(),
          reminder_settings: values.reminder_settings,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to create signing workflow');
      }

      onSuccess?.();
      onOpenChange(false);
      form.reset();
    } catch (error) {
      console.error('Error creating signing workflow:', error);
      // TODO: Show toast error
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Create Signing Workflow</DialogTitle>
          <DialogDescription>
            Set up a signing workflow for this document. Add signers after creating the workflow.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="expires_at"
              render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel>Expiration Date</FormLabel>
                  <Popover>
                    <PopoverTrigger asChild>
                      <FormControl>
                        <Button
                          variant="outline"
                          className={cn(
                            'w-full pl-3 text-left font-normal',
                            !field.value && 'text-muted-foreground'
                          )}
                        >
                          {field.value ? (
                            format(field.value, 'PPP')
                          ) : (
                            <span>Select expiration date</span>
                          )}
                          <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                        </Button>
                      </FormControl>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={field.value}
                        onSelect={field.onChange}
                        disabled={(date) => date < new Date()}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                  <FormDescription>
                    Optional: Set when this signing workflow expires
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-end gap-2 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? 'Creating...' : 'Create Workflow'}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

