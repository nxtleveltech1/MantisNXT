'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { Trash2 } from 'lucide-react';

interface PermissionsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  documentId: string;
}

interface DocumentPermission {
  id: string;
  user_id?: string | null;
  role_id?: string | null;
  permission_type: 'read' | 'write' | 'delete' | 'share';
  expires_at?: string | null;
  created_at: string;
}

export function PermissionsDialog({
  open,
  onOpenChange,
  documentId,
}: PermissionsDialogProps) {
  const queryClient = useQueryClient();

  const { data: permissions, isLoading } = useQuery<DocumentPermission[]>({
    queryKey: ['document-permissions', documentId],
    queryFn: async () => {
      const response = await fetch(`/api/v1/docustore/${documentId}/permissions`);
      if (!response.ok) {
        throw new Error('Failed to fetch permissions');
      }
      const result = await response.json();
      return result.data || [];
    },
    enabled: open,
  });

  const revokeMutation = useMutation({
    mutationFn: async (permissionId: string) => {
      const response = await fetch(`/api/v1/docustore/${permissionId}/permissions`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to revoke permission');
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['document-permissions', documentId] });
      toast.success('Permission revoked');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to revoke permission');
    },
  });

  const handleRevoke = (permissionId: string) => {
    if (confirm('Are you sure you want to revoke this permission?')) {
      revokeMutation.mutate(permissionId);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Document Permissions</DialogTitle>
          <DialogDescription>
            Manage who has access to this document
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="py-8 text-center text-muted-foreground">Loading permissions...</div>
        ) : permissions && permissions.length > 0 ? (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>User/Role</TableHead>
                <TableHead>Permission</TableHead>
                <TableHead>Expires</TableHead>
                <TableHead className="w-12"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {permissions.map((permission) => (
                <TableRow key={permission.id}>
                  <TableCell>
                    {permission.user_id ? (
                      <span className="font-medium">User: {permission.user_id}</span>
                    ) : permission.role_id ? (
                      <span className="font-medium">Role: {permission.role_id}</span>
                    ) : (
                      <span className="text-muted-foreground">Unknown</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">{permission.permission_type}</Badge>
                  </TableCell>
                  <TableCell>
                    {permission.expires_at ? (
                      format(new Date(permission.expires_at), 'PPP')
                    ) : (
                      <span className="text-muted-foreground">Never</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleRevoke(permission.id)}
                      disabled={revokeMutation.isPending}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        ) : (
          <div className="py-8 text-center text-muted-foreground">
            No permissions set. This document uses default access controls.
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

