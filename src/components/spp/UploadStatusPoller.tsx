'use client';
import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { toast } from 'sonner';

interface Props {
  jobId: string;
  onComplete: (data: any) => void;
}

export function UploadStatusPoller({ jobId, onComplete }: Props) {
  const [status, setStatus] = useState<any>(null);
  const [isPolling, setIsPolling] = useState(true);

  useEffect(() => {
    if (!isPolling || !jobId) return;

    const poll = async () => {
      try {
        const url = `/api/v2/pricelists/extract/${jobId}`;
        const res = await fetch(url);
        const data = await res.json();
        setStatus(data.data);

        const completed = ['completed', 'failed', 'cancelled'].includes(data.data.status);
        if (completed) {
          setIsPolling(false);
          if (data.data.status === 'completed') {
            toast.success('Extraction complete');
            onComplete(data.data);
          } else {
            toast.error('Extraction failed: ' + (data.data.error?.message || 'Unknown'));
          }
        }
      } catch (error) {
        console.error('Poll error:', error);
      }
    };

    const timer = setInterval(poll, 1000);
    poll();
    return () => clearInterval(timer);
  }, [jobId, isPolling, onComplete]);

  if (!status) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Extracting...</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <p className="text-sm">{status.progress?.current_step || 'Processing'}</p>
          <Progress value={status.progress?.percent_complete || 0} className="mt-2" />
        </div>
        <p className="text-xs text-gray-500">
          {status.progress?.rows_processed || 0} / {status.progress?.rows_total || 0} rows
        </p>
      </CardContent>
    </Card>
  );
}
