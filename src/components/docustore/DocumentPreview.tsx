'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { ZoomIn, ZoomOut, RotateCw, Maximize2 } from 'lucide-react';
import { Loader } from '@/components/kokonutui';

interface DocumentPreviewProps {
  documentId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function DocumentPreview({
  documentId,
  open,
  onOpenChange,
}: DocumentPreviewProps) {
  const [zoom, setZoom] = useState(1);
  const [fullscreen, setFullscreen] = useState(false);

  const { data: previewUrl, isLoading } = useQuery({
    queryKey: ['document-preview', documentId],
    queryFn: async () => {
      const response = await fetch(`/api/v1/docustore/${documentId}/preview?width=800&height=600`);
      if (!response.ok) {
        throw new Error('Failed to generate preview');
      }
      // TODO: Return actual preview URL when implemented
      return null;
    },
    enabled: open,
  });

  const handleZoomIn = () => {
    setZoom((prev) => Math.min(prev + 0.1, 2));
  };

  const handleZoomOut = () => {
    setZoom((prev) => Math.max(prev - 0.1, 0.5));
  };

  const handleResetZoom = () => {
    setZoom(1);
  };

  if (!open) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] p-0">
        <div className="flex flex-col h-full">
          {/* Toolbar */}
          <div className="flex items-center justify-between border-b px-4 py-2">
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleZoomOut}
                disabled={zoom <= 0.5}
              >
                <ZoomOut className="h-4 w-4" />
              </Button>
              <span className="text-sm font-medium">{Math.round(zoom * 100)}%</span>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleZoomIn}
                disabled={zoom >= 2}
              >
                <ZoomIn className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="sm" onClick={handleResetZoom}>
                <RotateCw className="h-4 w-4" />
              </Button>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setFullscreen(!fullscreen)}
            >
              <Maximize2 className="h-4 w-4" />
            </Button>
          </div>

          {/* Preview Content */}
          <div className="flex-1 overflow-auto p-4 bg-muted/50">
            {isLoading ? (
              <div className="flex items-center justify-center h-full">
                <Loader />
              </div>
            ) : previewUrl ? (
              <div
                className="mx-auto transition-transform"
                style={{
                  transform: `scale(${zoom})`,
                  transformOrigin: 'top center',
                }}
              >
                <img
                  src={previewUrl}
                  alt="Document preview"
                  className="max-w-full h-auto shadow-lg"
                />
              </div>
            ) : (
              <div className="flex items-center justify-center h-full text-muted-foreground">
                <div className="text-center">
                  <p className="mb-2">Preview not available</p>
                  <p className="text-sm">
                    Preview generation is not yet implemented for this document type.
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

