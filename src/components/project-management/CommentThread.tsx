'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';

export function CommentThread({ entityType, entityId, comments, onRefresh }: { entityType: string; entityId: string; comments: Array<any>; onRefresh: () => void }) {
  const [message, setMessage] = useState('');
  const { toast } = useToast();

  const submit = async () => {
    if (!message.trim()) return;
    const res = await fetch('/api/v1/project-management/comments', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ entity_type: entityType, entity_id: entityId, body: message }),
    });
    const data = await res.json();
    if (data.error) {
      toast({ title: 'Failed to post comment', description: data.error.message, variant: 'destructive' });
      return;
    }
    setMessage('');
    onRefresh();
  };

  return (
    <div className="space-y-4">
      <div className="space-y-3">
        {comments.length === 0 ? (
          <div className="text-sm text-muted-foreground">No comments yet.</div>
        ) : (
          comments.map(comment => (
            <div key={comment.comment_id} className="rounded border p-3">
              <div className="text-xs text-muted-foreground">{comment.author_id || 'System'}</div>
              <div className="text-sm">{comment.body}</div>
            </div>
          ))
        )}
      </div>
      <div className="space-y-2">
        <Textarea value={message} onChange={e => setMessage(e.target.value)} placeholder="Add a comment" />
        <Button onClick={submit}>Post Comment</Button>
      </div>
    </div>
  );
}
