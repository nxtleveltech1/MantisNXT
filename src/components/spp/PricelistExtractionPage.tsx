'use client';
import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CheckCircle } from 'lucide-react';
import { EnhancedPricelistUploadForm } from './EnhancedPricelistUploadForm';
import { ExtractionPreviewDialog } from './ExtractionPreviewDialog';
import { UploadStatusPoller } from './UploadStatusPoller';
import { toast } from 'sonner';

interface Props {
  supplier_id: string;
  org_id: string;
}

type Step = 'upload' | 'extract' | 'preview' | 'import' | 'complete';

export function PricelistExtractionPage({ supplier_id, org_id }: Props) {
  const [step, setStep] = useState<Step>('upload');
  const [upload_id, setUpload_id] = useState('');
  const [job_id, setJob_id] = useState('');
  const [extractionData, setExtractionData] = useState<any>(null);

  const handleUploadComplete = async (uploadId: string) => {
    setUpload_id(uploadId);
    setStep('extract');

    try {
      const response = await fetch('/api/v2/pricelists/extract', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-org-id': org_id
        },
        body: JSON.stringify({
          upload_id: uploadId,
          extraction_config: {
            auto_detect_columns: true,
            skip_empty_rows: true,
            skip_sku_as_brand: true,
            currency: 'ZAR'
          }
        })
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error);
      }

      setJob_id(data.data.job_id);
    } catch (error: any) {
      toast.error('Failed to start extraction: ' + error.message);
      setStep('upload');
    }
  };

  const handleExtractionComplete = async (jobStatus: any) => {
    setJob_id(jobStatus.job_id);
    setStep('preview');

    try {
      const url = `/api/v2/pricelists/preview/${jobStatus.job_id}`;
      const response = await fetch(url);
      const data = await response.json();
      if (data.success) {
        setExtractionData(data.data);
      }
    } catch (error) {
      console.error('Failed to fetch preview:', error);
    }
  };

  const handleImport = async () => {
    try {
      const url = `/api/v2/pricelists/import/${job_id}`;
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-org-id': org_id
        },
        body: JSON.stringify({
          skip_invalid_rows: false,
          validation_strategy: 'strict',
          conflict_resolution: {
            on_duplicate_sku: 'update',
            preserve_manual_edits: true
          }
        })
      });

      const data = await response.json();
      if (data.success) {
        setStep('complete');
        toast.success('Import completed successfully');
      }
    } catch (error: any) {
      toast.error('Import failed: ' + error.message);
    }
  };

  return (
    <div className="space-y-6">
      {step === 'upload' && (
        <EnhancedPricelistUploadForm
          supplier_id={supplier_id}
          org_id={org_id}
          onUploadComplete={handleUploadComplete}
        />
      )}

      {step === 'extract' && job_id && (
        <UploadStatusPoller
          jobId={job_id}
          onComplete={handleExtractionComplete}
        />
      )}

      {step === 'preview' && extractionData && (
        <ExtractionPreviewDialog
          isOpen={true}
          data={extractionData}
          onConfirm={handleImport}
          onCancel={() => setStep('upload')}
        />
      )}

      {step === 'complete' && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-green-600">
              <CheckCircle className="h-5 w-5" />
              Import Complete
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p>Pricelist imported successfully. You can now upload another file.</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
