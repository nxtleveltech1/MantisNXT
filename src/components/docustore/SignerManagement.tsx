'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { GripVertical, Trash2, Plus } from 'lucide-react';
import type { DocumentSigner } from '@/types/docustore';

const addSignerSchema = z.object({
  email: z.string().email('Invalid email address'),
  name: z.string().min(1, 'Name is required'),
  role: z.enum(['signer', 'approver', 'witness']).default('signer'),
});

type AddSignerFormValues = z.infer<typeof addSignerSchema>;

interface SignerManagementProps {
  workflowId: string;
  signers: DocumentSigner[];
  onSignersChange: (signers: DocumentSigner[]) => void;
}

export function SignerManagement({
  workflowId,
  signers,
  onSignersChange,
}: SignerManagementProps) {
  const [isAdding, setIsAdding] = useState(false);

  const form = useForm<AddSignerFormValues>({
    resolver: zodResolver(addSignerSchema),
    defaultValues: {
      role: 'signer',
    },
  });

  const onSubmit = async (values: AddSignerFormValues) => {
    try {
      const response = await fetch(`/api/v1/docustore/${workflowId}/signing/signers`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          workflow_id: workflowId,
          email: values.email,
          name: values.name,
          role: values.role,
          order: signers.length + 1,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to add signer');
      }

      const newSigner = await response.json();
      onSignersChange([...signers, newSigner.data]);
      form.reset();
      setIsAdding(false);
    } catch (error) {
      console.error('Error adding signer:', error);
      // TODO: Show toast error
    }
  };

  const handleRemoveSigner = async (signerId: string) => {
    try {
      const response = await fetch(`/api/v1/docustore/${signerId}/signing/signers`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to remove signer');
      }

      onSignersChange(signers.filter((s) => s.id !== signerId));
    } catch (error) {
      console.error('Error removing signer:', error);
      // TODO: Show toast error
    }
  };

  const getStatusBadgeVariant = (status: DocumentSigner['status']) => {
    switch (status) {
      case 'signed':
        return 'default';
      case 'pending':
        return 'secondary';
      case 'declined':
        return 'destructive';
      default:
        return 'outline';
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Signers</h3>
        {!isAdding && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setIsAdding(true)}
          >
            <Plus className="mr-2 h-4 w-4" />
            Add Signer
          </Button>
        )}
      </div>

      {isAdding && (
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 rounded-lg border p-4">
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Name</FormLabel>
                    <FormControl>
                      <Input placeholder="John Doe" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input type="email" placeholder="john@example.com" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="role"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Role</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select role" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="signer">Signer</SelectItem>
                      <SelectItem value="approver">Approver</SelectItem>
                      <SelectItem value="witness">Witness</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  setIsAdding(false);
                  form.reset();
                }}
              >
                Cancel
              </Button>
              <Button type="submit" size="sm">
                Add Signer
              </Button>
            </div>
          </form>
        </Form>
      )}

      {signers.length > 0 ? (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-8"></TableHead>
              <TableHead>Order</TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-12"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {signers.map((signer, index) => (
              <TableRow key={signer.id}>
                <TableCell>
                  <GripVertical className="h-4 w-4 text-muted-foreground" />
                </TableCell>
                <TableCell>{signer.order}</TableCell>
                <TableCell className="font-medium">{signer.name}</TableCell>
                <TableCell>{signer.email}</TableCell>
                <TableCell>
                  <Badge variant="outline">{signer.role}</Badge>
                </TableCell>
                <TableCell>
                  <Badge variant={getStatusBadgeVariant(signer.status)}>
                    {signer.status}
                  </Badge>
                </TableCell>
                <TableCell>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => handleRemoveSigner(signer.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      ) : (
        <div className="rounded-lg border border-dashed p-8 text-center text-muted-foreground">
          No signers added yet. Click &quot;Add Signer&quot; to get started.
        </div>
      )}
    </div>
  );
}

