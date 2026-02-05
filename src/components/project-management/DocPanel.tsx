'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';

export function DocPanel({ entityType, entityId, docs, onRefresh }: { entityType: string; entityId: string; docs: Array<any>; onRefresh: () => void }) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const { toast } = useToast();

  const createDoc = async () => {
    if (!title.trim()) return;
    const res = await fetch('/api/v1/project-management/docs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title,
        description,
        entity_type: entityType,
        entity_id: entityId,
      }),
    });
    const data = await res.json();
    if (data.error) {
      toast({ title: 'Failed to create doc', description: data.error.message, variant: 'destructive' });
      return;
    }
    setTitle('');
    setDescription('');
    onRefresh();
  };

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Input value={title} onChange={e => setTitle(e.target.value)} placeholder="Document title" />
        <Textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="Description" />
        <Button onClick={createDoc}>Add Document</Button>
      </div>
      <div className="space-y-2">
        {docs.length === 0 ? (
          <div className="text-sm text-muted-foreground">No documents yet.</div>
        ) : (
          docs.map(doc => (
            <div key={doc.id} className="rounded border p-3">
              <div className="text-sm font-medium">{doc.title}</div>
              <div className="text-xs text-muted-foreground">{doc.description || 'No description'}</div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
