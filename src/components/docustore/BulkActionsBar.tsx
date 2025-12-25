'use client';

import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Trash2, Archive, FolderOpen, Tag, MoreHorizontal } from 'lucide-react';

interface BulkActionsBarProps {
  selectedIds: string[];
  onClearSelection: () => void;
}

export function BulkActionsBar({ selectedIds, onClearSelection }: BulkActionsBarProps) {
  const [moveDialogOpen, setMoveDialogOpen] = useState(false);
  const [tagDialogOpen, setTagDialogOpen] = useState(false);
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null);
  const [tags, setTags] = useState<string>('');
  const queryClient = useQueryClient();

  const bulkMutation = useMutation({
    mutationFn: async (action: {
      type: 'bulk_delete' | 'bulk_move' | 'bulk_archive' | 'bulk_tag';
      folder_id?: string | null;
      tags?: string[];
    }) => {
      const response = await fetch('/api/v1/docustore/bulk', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: action.type,
          document_ids: selectedIds,
          folder_id: action.folder_id,
          tags: action.tags,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to perform bulk operation');
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['documents'] });
      onClearSelection();
      toast.success('Bulk operation completed');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to perform bulk operation');
    },
  });

  const handleBulkDelete = () => {
    if (confirm(`Are you sure you want to delete ${selectedIds.length} document(s)?`)) {
      bulkMutation.mutate({ type: 'bulk_delete' });
    }
  };

  const handleBulkArchive = () => {
    bulkMutation.mutate({ type: 'bulk_archive' });
  };

  const handleBulkMove = () => {
    if (selectedFolderId !== undefined) {
      bulkMutation.mutate({
        type: 'bulk_move',
        folder_id: selectedFolderId,
      });
      setMoveDialogOpen(false);
      setSelectedFolderId(null);
    }
  };

  const handleBulkTag = () => {
    const tagArray = tags
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean);

    if (tagArray.length > 0) {
      bulkMutation.mutate({
        type: 'bulk_tag',
        tags: tagArray,
      });
      setTagDialogOpen(false);
      setTags('');
    }
  };

  if (selectedIds.length === 0) {
    return null;
  }

  return (
    <>
      <div className="flex items-center justify-between rounded-lg border bg-muted/50 px-4 py-2">
        <span className="text-sm font-medium">
          {selectedIds.length} document{selectedIds.length !== 1 ? 's' : ''} selected
        </span>
        <div className="flex items-center gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm">
                <MoreHorizontal className="mr-2 h-4 w-4" />
                Actions
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => setMoveDialogOpen(true)}>
                <FolderOpen className="mr-2 h-4 w-4" />
                Move to Folder
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setTagDialogOpen(true)}>
                <Tag className="mr-2 h-4 w-4" />
                Add Tags
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleBulkArchive}>
                <Archive className="mr-2 h-4 w-4" />
                Archive
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleBulkDelete} className="text-destructive">
                <Trash2 className="mr-2 h-4 w-4" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <Button variant="ghost" size="sm" onClick={onClearSelection}>
            Clear
          </Button>
        </div>
      </div>

      {/* Move Dialog */}
      <Dialog open={moveDialogOpen} onOpenChange={setMoveDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Move Documents</DialogTitle>
            <DialogDescription>
              Select a folder to move {selectedIds.length} document(s) to
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Folder</Label>
              <Select
                value={selectedFolderId || 'root'}
                onValueChange={(value) => setSelectedFolderId(value === 'root' ? null : value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select folder" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="root">Root (No folder)</SelectItem>
                  {/* TODO: Load folders from API */}
                </SelectContent>
              </Select>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setMoveDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleBulkMove} disabled={bulkMutation.isPending}>
                Move
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Tag Dialog */}
      <Dialog open={tagDialogOpen} onOpenChange={setTagDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Tags</DialogTitle>
            <DialogDescription>
              Add tags to {selectedIds.length} document(s). Separate multiple tags with commas.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Tags</Label>
              <Input
                placeholder="e.g., important, contract, q1-2024"
                value={tags}
                onChange={(e) => setTags(e.target.value)}
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setTagDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleBulkTag} disabled={bulkMutation.isPending || !tags.trim()}>
                Add Tags
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

