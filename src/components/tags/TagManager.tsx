'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Plus, Edit, Trash2, Tag } from 'lucide-react';
import { toast } from 'sonner';

type TagRecord = {
  id: string;
  name: string;
  type: string;
  productCount: number;
  description?: string;
  color?: string;
  icon?: string;
  parent_tag_id?: string | null;
  is_active?: boolean;
};

interface TagManagerProps {
  tags: TagRecord[];
  onRefresh: () => void;
}

export function TagManager({ tags, onRefresh }: TagManagerProps) {
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editingTag, setEditingTag] = useState<TagRecord | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    type: 'custom',
    description: '',
    color: '',
    icon: '',
  });

  const handleCreate = async () => {
    try {
      const response = await fetch('/api/tags', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: formData.name, type: formData.type }),
      });

      const data = await response.json();
      if (data.success) {
        toast.success('Tag created successfully');
        setIsCreateOpen(false);
        setFormData({ name: '', type: 'custom', description: '', color: '', icon: '' });
        onRefresh();
      } else {
        toast.error(data.message || 'Failed to create tag');
      }
    } catch (error) {
      toast.error('Failed to create tag');
      console.error(error);
    }
  };

  const handleEdit = (tag: TagRecord) => {
    setEditingTag(tag);
    setFormData({
      name: tag.name,
      type: tag.type,
      description: tag.description || '',
      color: tag.color || '',
      icon: tag.icon || '',
    });
    setIsEditOpen(true);
  };

  const handleUpdate = async () => {
    if (!editingTag) return;

    try {
      const response = await fetch(`/api/tags/${editingTag.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const data = await response.json();
      if (data.success) {
        toast.success('Tag updated successfully');
        setIsEditOpen(false);
        setEditingTag(null);
        onRefresh();
      } else {
        toast.error(data.message || 'Failed to update tag');
      }
    } catch (error) {
      toast.error('Failed to update tag');
      console.error(error);
    }
  };

  const handleDelete = async (tagId: string) => {
    if (
      !confirm('Are you sure you want to delete this tag? This will remove it from all products.')
    ) {
      return;
    }

    try {
      const response = await fetch(`/api/tags/${tagId}?cascade=true`, {
        method: 'DELETE',
      });

      const data = await response.json();
      if (data.success) {
        toast.success('Tag deleted successfully');
        onRefresh();
      } else {
        toast.error(data.message || 'Failed to delete tag');
      }
    } catch (error) {
      toast.error('Failed to delete tag');
      console.error(error);
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Tag Management</CardTitle>
            <CardDescription>Create, edit, and manage product tags</CardDescription>
          </div>
          <Button onClick={() => setIsCreateOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Create Tag
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {tags.map(tag => (
            <div
              key={tag.id}
              className="hover:bg-muted/50 flex items-center justify-between rounded-lg border p-3"
            >
              <div className="flex items-center gap-3">
                <Tag className="text-muted-foreground h-4 w-4" />
                <div>
                  <div className="font-medium">{tag.name}</div>
                  <div className="text-muted-foreground text-sm">
                    <Badge variant="outline" className="mr-2">
                      {tag.type}
                    </Badge>
                    {tag.productCount} products
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button variant="ghost" size="sm" onClick={() => handleEdit(tag)}>
                  <Edit className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="sm" onClick={() => handleDelete(tag.id)}>
                  <Trash2 className="text-destructive h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      </CardContent>

      {/* Create Dialog */}
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Tag</DialogTitle>
            <DialogDescription>Add a new tag to categorize products</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Tag Name</Label>
              <Input
                value={formData.name}
                onChange={e => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g., Summer Collection"
              />
            </div>
            <div>
              <Label>Type</Label>
              <Select
                value={formData.type}
                onValueChange={v => setFormData({ ...formData, type: v })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="custom">Custom</SelectItem>
                  <SelectItem value="seasonal">Seasonal</SelectItem>
                  <SelectItem value="stock">Stock</SelectItem>
                  <SelectItem value="auto">Auto</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreateOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreate}>Create</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Tag</DialogTitle>
            <DialogDescription>Update tag information</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Tag Name</Label>
              <Input
                value={formData.name}
                onChange={e => setFormData({ ...formData, name: e.target.value })}
              />
            </div>
            <div>
              <Label>Type</Label>
              <Select
                value={formData.type}
                onValueChange={v => setFormData({ ...formData, type: v })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="custom">Custom</SelectItem>
                  <SelectItem value="seasonal">Seasonal</SelectItem>
                  <SelectItem value="stock">Stock</SelectItem>
                  <SelectItem value="auto">Auto</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Description</Label>
              <Input
                value={formData.description}
                onChange={e => setFormData({ ...formData, description: e.target.value })}
                placeholder="Optional description"
              />
            </div>
            <div>
              <Label>Color (Hex)</Label>
              <Input
                value={formData.color}
                onChange={e => setFormData({ ...formData, color: e.target.value })}
                placeholder="#FF5733"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleUpdate}>Update</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
