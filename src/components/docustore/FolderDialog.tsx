'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
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
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import type { DocumentFolder } from '@/lib/services/docustore/folder-types';

const createFolderSchema = z.object({
  name: z.string().min(1, 'Folder name is required'),
  parent_id: z.string().uuid().nullable().optional(),
  icon: z.string().optional(),
  color: z.string().regex(/^#[0-9A-F]{6}$/i).optional(),
});

type CreateFolderFormValues = z.infer<typeof createFolderSchema>;

interface FolderDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  folder?: DocumentFolder | null;
  parentFolders?: Array<{ id: string; name: string }>;
  onSuccess?: () => void;
}

const COLOR_OPTIONS = [
  { value: '#3b82f6', label: 'Blue' },
  { value: '#10b981', label: 'Green' },
  { value: '#f59e0b', label: 'Amber' },
  { value: '#ef4444', label: 'Red' },
  { value: '#8b5cf6', label: 'Purple' },
  { value: '#ec4899', label: 'Pink' },
  { value: '#6366f1', label: 'Indigo' },
  { value: '#14b8a6', label: 'Teal' },
];

export function FolderDialog({
  open,
  onOpenChange,
  folder,
  parentFolders = [],
  onSuccess,
}: FolderDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<CreateFolderFormValues>({
    resolver: zodResolver(createFolderSchema),
    defaultValues: {
      name: folder?.name || '',
      parent_id: folder?.parent_id || null,
      icon: folder?.icon || undefined,
      color: folder?.color || undefined,
    },
  });

  useEffect(() => {
    if (folder) {
      form.reset({
        name: folder.name,
        parent_id: folder.parent_id || null,
        icon: folder.icon || undefined,
        color: folder.color || undefined,
      });
    } else {
      form.reset({
        name: '',
        parent_id: null,
        icon: undefined,
        color: undefined,
      });
    }
  }, [folder, form]);

  const onSubmit = async (values: CreateFolderFormValues) => {
    setIsSubmitting(true);
    try {
      const orgId = await fetch('/api/v1/organizations/current')
        .then((res) => res.json())
        .then((data) => data.data?.id)
        .catch(() => null);

      if (!orgId) {
        throw new Error('Organization ID not found');
      }

      if (folder) {
        // Update existing folder
        const response = await fetch(`/api/v1/docustore/folders/${folder.id}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            name: values.name,
            icon: values.icon,
            color: values.color,
          }),
        });

        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.error || 'Failed to update folder');
        }
      } else {
        // Create new folder
        const response = await fetch('/api/v1/docustore/folders', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            name: values.name,
            parent_id: values.parent_id,
            icon: values.icon,
            color: values.color,
          }),
        });

        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.error || 'Failed to create folder');
        }
      }

      onSuccess?.();
      onOpenChange(false);
      form.reset();
    } catch (error) {
      console.error('Error saving folder:', error);
      // TODO: Show toast error
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{folder ? 'Edit Folder' : 'Create Folder'}</DialogTitle>
          <DialogDescription>
            {folder
              ? 'Update folder details'
              : 'Create a new folder to organize your documents'}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Folder Name</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., Contracts, Invoices" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {!folder && parentFolders.length > 0 && (
              <FormField
                control={form.control}
                name="parent_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Parent Folder</FormLabel>
                    <Select
                      onValueChange={(value) => field.onChange(value === 'root' ? null : value)}
                      value={field.value || 'root'}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select parent folder" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="root">Root (No parent)</SelectItem>
                        {parentFolders.map((parent) => (
                          <SelectItem key={parent.id} value={parent.id}>
                            {parent.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            <FormField
              control={form.control}
              name="color"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Color</FormLabel>
                  <Popover>
                    <PopoverTrigger asChild>
                      <FormControl>
                        <Button
                          type="button"
                          variant="outline"
                          className="w-full justify-start"
                        >
                          {field.value ? (
                            <div className="flex items-center gap-2">
                              <div
                                className="h-4 w-4 rounded-full"
                                style={{ backgroundColor: field.value }}
                              />
                              <span>
                                {COLOR_OPTIONS.find((c) => c.value === field.value)?.label ||
                                  field.value}
                              </span>
                            </div>
                          ) : (
                            <span>Select color</span>
                          )}
                        </Button>
                      </FormControl>
                    </PopoverTrigger>
                    <PopoverContent className="w-64">
                      <div className="grid grid-cols-4 gap-2">
                        {COLOR_OPTIONS.map((color) => (
                          <button
                            key={color.value}
                            type="button"
                            onClick={() => field.onChange(color.value)}
                            className={`h-10 w-10 rounded-full border-2 ${
                              field.value === color.value
                                ? 'border-foreground'
                                : 'border-transparent'
                            }`}
                            style={{ backgroundColor: color.value }}
                            aria-label={color.label}
                          />
                        ))}
                      </div>
                    </PopoverContent>
                  </Popover>
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
                {isSubmitting ? (folder ? 'Updating...' : 'Creating...') : folder ? 'Update' : 'Create'}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

