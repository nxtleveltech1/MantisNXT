'use client';

import { useRef, useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Pen, X, Check } from 'lucide-react';

interface SignatureCaptureProps {
  onSignature: (signatureData: string) => void;
  onClear?: () => void;
  disabled?: boolean;
}

export function SignatureCapture({
  onSignature,
  onClear,
  disabled = false,
}: SignatureCaptureProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasSignature, setHasSignature] = useState(false);

  const startDrawing = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
      if (disabled) return;

      setIsDrawing(true);
      const canvas = canvasRef.current;
      if (!canvas) return;

      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const rect = canvas.getBoundingClientRect();
      const x =
        'touches' in e
          ? e.touches[0].clientX - rect.left
          : e.clientX - rect.left;
      const y =
        'touches' in e
          ? e.touches[0].clientY - rect.top
          : e.clientY - rect.top;

      ctx.beginPath();
      ctx.moveTo(x, y);
    },
    [disabled]
  );

  const draw = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
      if (!isDrawing || disabled) return;

      const canvas = canvasRef.current;
      if (!canvas) return;

      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const rect = canvas.getBoundingClientRect();
      const x =
        'touches' in e
          ? e.touches[0].clientX - rect.left
          : e.clientX - rect.left;
      const y =
        'touches' in e
          ? e.touches[0].clientY - rect.top
          : e.clientY - rect.top;

      ctx.lineTo(x, y);
      ctx.strokeStyle = '#000';
      ctx.lineWidth = 2;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.stroke();
    },
    [isDrawing, disabled]
  );

  const stopDrawing = useCallback(() => {
    setIsDrawing(false);
    setHasSignature(true);
  }, []);

  const clearSignature = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setHasSignature(false);
    onClear?.();
  }, [onClear]);

  const saveSignature = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || !hasSignature) return;

    const signatureData = canvas.toDataURL('image/png');
    onSignature(signatureData);
  }, [hasSignature, onSignature]);

  return (
    <Card className="p-4">
      <div className="space-y-4">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Pen className="h-4 w-4" />
          <span>Sign in the box below</span>
        </div>

        <div className="relative border-2 border-dashed rounded-lg bg-muted/50">
          <canvas
            ref={canvasRef}
            width={600}
            height={200}
            className="w-full h-[200px] cursor-crosshair touch-none"
            onMouseDown={startDrawing}
            onMouseMove={draw}
            onMouseUp={stopDrawing}
            onMouseLeave={stopDrawing}
            onTouchStart={startDrawing}
            onTouchMove={draw}
            onTouchEnd={stopDrawing}
          />
        </div>

        <div className="flex justify-between gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={clearSignature}
            disabled={!hasSignature || disabled}
          >
            <X className="mr-2 h-4 w-4" />
            Clear
          </Button>
          <Button
            type="button"
            onClick={saveSignature}
            disabled={!hasSignature || disabled}
          >
            <Check className="mr-2 h-4 w-4" />
            Save Signature
          </Button>
        </div>
      </div>
    </Card>
  );
}

