'use client';

import React, { useEffect, useState } from 'react';
import { FileText, Plus, Edit2, Trash2, Loader2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';

interface Doc {
  id: string;
  title: string;
  text?: string;
  folder?: string;
  createdAt?: string;
  updatedAt?: string;
}

interface DocsNotesViewProps {
  connected: boolean;
}

export function DocsNotesView({ connected }: DocsNotesViewProps) {
  const { toast } = useToast();
  const [docs, setDocs] = useState<Doc[]>([]);
  const [loading, setLoading] = useState(false);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editingDoc, setEditingDoc] = useState<Doc | null>(null);
  const [formData, setFormData] = useState({ title: '', text: '', folder: '' });

  useEffect(() => {
    if (connected) {
      loadDocs();
    }
  }, [connected]);

  const loadDocs = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/v1/project-management/dartai/docs');
      const data = await res.json();
      if (data.error) {
        throw new Error(data.error.message || 'Failed to load docs');
      }
      const docsList: Doc[] = Array.isArray(data.data) ? data.data : [];
      setDocs(docsList);
    } catch (error: unknown) {
      console.error('[Docs] Failed to load docs:', error);
      toast({
        title: 'Failed to load docs',
        description: error instanceof Error ? error.message : 'Unknown error',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCreateDoc = async () => {
    if (!formData.title.trim()) {
      toast({
        title: 'Validation Error',
        description: 'Doc title is required',
        variant: 'destructive',
      });
      return;
    }

    try {
      const payload = {
        item: {
          title: formData.title,
          ...(formData.text && { text: formData.text }),
          ...(formData.folder && { folder: formData.folder }),
        },
      };

      const url = editingDoc
        ? `/api/v1/project-management/dartai/docs/${editingDoc.id}`
        : '/api/v1/project-management/dartai/docs';
      const method = editingDoc ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (data.error) {
        throw new Error(data.error.message || 'Failed to save doc');
      }

      toast({
        title: editingDoc ? 'Doc Updated' : 'Doc Created',
        description: 'Doc has been saved successfully',
      });

      setCreateDialogOpen(false);
      setEditingDoc(null);
      setFormData({ title: '', text: '', folder: '' });
      await loadDocs();
    } catch (error: unknown) {
      toast({
        title: editingDoc ? 'Failed to update doc' : 'Failed to create doc',
        description: error instanceof Error ? error.message : 'Unknown error',
        variant: 'destructive',
      });
    }
  };

  const handleDeleteDoc = async (docId: string) => {
    if (!confirm('Are you sure you want to delete this doc?')) return;

    try {
      const res = await fetch(`/api/v1/project-management/dartai/docs/${docId}`, {
        method: 'DELETE',
      });

      const data = await res.json();
      if (data.error) {
        throw new Error(data.error.message || 'Failed to delete doc');
      }

      toast({
        title: 'Doc Deleted',
        description: 'Doc has been deleted successfully',
      });

      await loadDocs();
    } catch (error: unknown) {
      toast({
        title: 'Failed to delete doc',
        description: error instanceof Error ? error.message : 'Unknown error',
        variant: 'destructive',
      });
    }
  };

  if (!connected) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12">
          <FileText className="mb-4 h-12 w-12 text-muted-foreground" />
          <p className="text-muted-foreground text-center">
            Connect your Dart-AI account to view docs and notes
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-lg font-semibold">Docs & Notes</h3>
          <p className="text-muted-foreground text-sm">Manage your documentation and notes</p>
        </div>
        <Button onClick={() => setCreateDialogOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          New Doc
        </Button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin" />
        </div>
      ) : docs.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <FileText className="mb-4 h-12 w-12 text-muted-foreground" />
            <p className="text-muted-foreground mb-4">No docs found</p>
            <Button onClick={() => setCreateDialogOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Create your first doc
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {docs.map(doc => (
            <Card key={doc.id} className="hover:shadow-md transition-shadow">
              <CardHeader>
                <CardTitle className="text-base flex items-start justify-between">
                  <span className="flex-1">{doc.title}</span>
                  <div className="flex gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setEditingDoc(doc);
                        setFormData({
                          title: doc.title,
                          text: doc.text || '',
                          folder: doc.folder || '',
                        });
                        setCreateDialogOpen(true);
                      }}
                    >
                      <Edit2 className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => handleDeleteDoc(doc.id)}>
                      <Trash2 className="h-4 w-4 text-red-500" />
                    </Button>
                  </div>
                </CardTitle>
                {doc.folder && (
                  <p className="text-xs text-muted-foreground">Folder: {doc.folder}</p>
                )}
              </CardHeader>
              <CardContent>
                {doc.text && (
                  <p className="text-sm text-muted-foreground line-clamp-3">{doc.text}</p>
                )}
                {doc.updatedAt && (
                  <p className="text-xs text-muted-foreground mt-2">
                    Updated: {new Date(doc.updatedAt).toLocaleDateString()}
                  </p>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog
        open={createDialogOpen}
        onOpenChange={open => {
          setCreateDialogOpen(open);
          if (!open) {
            setEditingDoc(null);
            setFormData({ title: '', text: '', folder: '' });
          }
        }}
      >
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editingDoc ? 'Edit Doc' : 'Create New Doc'}</DialogTitle>
            <DialogDescription>
              {editingDoc ? 'Update doc details' : 'Create a new doc in Dart-AI'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="doc-title">Title *</Label>
              <Input
                id="doc-title"
                value={formData.title}
                onChange={e => setFormData(prev => ({ ...prev, title: e.target.value }))}
                placeholder="Doc title"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="doc-folder">Folder</Label>
              <Input
                id="doc-folder"
                value={formData.folder}
                onChange={e => setFormData(prev => ({ ...prev, folder: e.target.value }))}
                placeholder="Folder name (optional)"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="doc-text">Content</Label>
              <Textarea
                id="doc-text"
                value={formData.text}
                onChange={e => setFormData(prev => ({ ...prev, text: e.target.value }))}
                placeholder="Doc content (markdown supported)"
                rows={8}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreateDoc}>
              {editingDoc ? 'Update Doc' : 'Create Doc'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

