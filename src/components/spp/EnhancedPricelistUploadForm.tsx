'use client';
import { useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Upload, CheckCircle } from 'lucide-react';
import { toast } from 'sonner';

export function EnhancedPricelistUploadForm({ supplier_id, org_id, onUploadComplete }) {
  const [selectedFile, setSelectedFile] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [currency, setCurrency] = useState('ZAR');

  const handleUpload = async () => {
    if (!selectedFile) {
      toast.error('Please select a file');
      return;
    }
    setIsLoading(true);
    const formData = new FormData();
    formData.append('file', selectedFile);
    formData.append('supplier_id', supplier_id);
    formData.append('org_id', org_id);
    formData.append('currency', currency);

    try {
      const response = await fetch('/api/v2/pricelists/upload', {
        method: 'POST',
        body: formData,
        headers: { 'x-org-id': org_id },
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      toast.success('File uploaded successfully');
      onUploadComplete(data.data.upload_id);
      setSelectedFile(null);
    } catch (error) {
      toast.error(error.message || 'Upload failed');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Upload Pricelist</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <input
          type="file"
          onChange={e => setSelectedFile(e.target.files?.[0])}
          accept=".xlsx,.xls,.csv,.pdf"
        />
        <select
          value={currency}
          onChange={e => setCurrency(e.target.value)}
          className="w-full rounded-md border px-3 py-2"
        >
          <option value="ZAR">ZAR</option>
          <option value="USD">USD</option>
        </select>
        <Button onClick={handleUpload} disabled={!selectedFile || isLoading} className="w-full">
          {isLoading ? 'Uploading...' : 'Upload'}
        </Button>
      </CardContent>
    </Card>
  );
}
