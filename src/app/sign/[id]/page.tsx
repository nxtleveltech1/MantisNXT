'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { 
  FileText, 
  CheckCircle2, 
  AlertCircle, 
  Clock, 
  Pen,
  RotateCcw,
  Send,
  Shield,
} from 'lucide-react';

interface AgreementData {
  agreement: {
    agreement_id: string;
    agreement_number: string;
    terms_and_conditions: string;
    liability_waiver: string;
    signature_status: string;
    customer_signed_at?: string;
  };
  reservation: {
    reservation_number: string;
    customer_name: string;
    pickup_date: string;
    return_date: string;
    equipment_items: Array<{
      name: string;
      quantity: number;
      daily_rate: number;
    }>;
    subtotal: number;
    deposit_amount: number;
    total: number;
  };
  delivery: {
    id: string;
    status: string;
    viewed_at?: string;
    signed_at?: string;
  };
}

type PageStatus = 'loading' | 'valid' | 'expired' | 'invalid' | 'already_signed' | 'signed';

export default function PublicSigningPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const reservationId = params?.id as string;
  const token = searchParams.get('token');

  const [status, setStatus] = useState<PageStatus>('loading');
  const [data, setData] = useState<AgreementData | null>(null);
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [liabilityAccepted, setLiabilityAccepted] = useState(false);
  const [isDrawing, setIsDrawing] = useState(false);
  const [signatureData, setSignatureData] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const contextRef = useRef<CanvasRenderingContext2D | null>(null);

  useEffect(() => {
    if (!token) {
      setStatus('invalid');
      return;
    }
    verifyToken();
  }, [token, reservationId]);

  useEffect(() => {
    initializeCanvas();
    window.addEventListener('resize', initializeCanvas);
    return () => window.removeEventListener('resize', initializeCanvas);
  }, [status]);

  const verifyToken = async () => {
    try {
      const response = await fetch(`/api/sign/${reservationId}/verify?token=${token}`);
      const result = await response.json();

      if (!result.success) {
        if (result.expired) {
          setStatus('expired');
        } else if (result.already_signed) {
          setStatus('already_signed');
        } else {
          setStatus('invalid');
        }
        return;
      }

      setData(result.data);
      setStatus('valid');
    } catch (err) {
      console.error('Error verifying token:', err);
      setStatus('invalid');
    }
  };

  const initializeCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * 2;
    canvas.height = rect.height * 2;
    canvas.style.width = `${rect.width}px`;
    canvas.style.height = `${rect.height}px`;

    const context = canvas.getContext('2d');
    if (!context) return;

    context.scale(2, 2);
    context.lineCap = 'round';
    context.strokeStyle = '#1a1a2e';
    context.lineWidth = 2;
    contextRef.current = context;
  };

  const startDrawing = (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    const canvas = canvasRef.current;
    const context = contextRef.current;
    if (!canvas || !context) return;

    setIsDrawing(true);

    const rect = canvas.getBoundingClientRect();
    const x = 'touches' in e ? e.touches[0].clientX - rect.left : e.clientX - rect.left;
    const y = 'touches' in e ? e.touches[0].clientY - rect.top : e.clientY - rect.top;

    context.beginPath();
    context.moveTo(x, y);
  };

  const draw = (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    if (!isDrawing) return;

    const canvas = canvasRef.current;
    const context = contextRef.current;
    if (!canvas || !context) return;

    const rect = canvas.getBoundingClientRect();
    const x = 'touches' in e ? e.touches[0].clientX - rect.left : e.clientX - rect.left;
    const y = 'touches' in e ? e.touches[0].clientY - rect.top : e.clientY - rect.top;

    context.lineTo(x, y);
    context.stroke();
  };

  const stopDrawing = () => {
    if (isDrawing) {
      setIsDrawing(false);
      const canvas = canvasRef.current;
      if (canvas) {
        setSignatureData(canvas.toDataURL('image/png'));
      }
    }
  };

  const clearSignature = () => {
    const canvas = canvasRef.current;
    const context = contextRef.current;
    if (!canvas || !context) return;

    context.clearRect(0, 0, canvas.width, canvas.height);
    setSignatureData(null);
  };

  const handleSubmit = async () => {
    if (!termsAccepted || !liabilityAccepted || !signatureData) {
      setError('Please accept all terms and provide your signature');
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const response = await fetch(`/api/sign/${reservationId}/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token,
          signature: signatureData,
          terms_accepted: termsAccepted,
          liability_accepted: liabilityAccepted,
        }),
      });

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || 'Failed to submit signature');
      }

      setStatus('signed');
    } catch (err) {
      console.error('Error submitting signature:', err);
      setError(err instanceof Error ? err.message : 'Failed to submit signature');
    } finally {
      setSubmitting(false);
    }
  };

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat('en-ZA', { style: 'currency', currency: 'ZAR' }).format(amount);

  const formatDate = (dateString: string) =>
    new Date(dateString).toLocaleDateString('en-ZA', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });

  // Loading state
  if (status === 'loading') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="pt-8 pb-8 text-center">
            <div className="animate-spin h-12 w-12 border-4 border-primary border-t-transparent rounded-full mx-auto mb-4" />
            <p className="text-muted-foreground">Loading agreement...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Invalid/Expired states
  if (status === 'invalid' || status === 'expired') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="pt-8 pb-8 text-center">
            <div className={`h-16 w-16 rounded-full mx-auto mb-4 flex items-center justify-center ${
              status === 'expired' ? 'bg-amber-100' : 'bg-red-100'
            }`}>
              {status === 'expired' ? (
                <Clock className="h-8 w-8 text-amber-600" />
              ) : (
                <AlertCircle className="h-8 w-8 text-red-600" />
              )}
            </div>
            <h2 className="text-xl font-semibold mb-2">
              {status === 'expired' ? 'Link Expired' : 'Invalid Link'}
            </h2>
            <p className="text-muted-foreground">
              {status === 'expired'
                ? 'This signing link has expired. Please contact us to request a new one.'
                : 'This signing link is invalid. Please check your message and try again.'}
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Already signed state
  if (status === 'already_signed') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="pt-8 pb-8 text-center">
            <div className="h-16 w-16 rounded-full bg-green-100 mx-auto mb-4 flex items-center justify-center">
              <CheckCircle2 className="h-8 w-8 text-green-600" />
            </div>
            <h2 className="text-xl font-semibold mb-2">Already Signed</h2>
            <p className="text-muted-foreground">
              This agreement has already been signed. Thank you!
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Successfully signed state
  if (status === 'signed') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-md border-green-200">
          <CardContent className="pt-8 pb-8 text-center">
            <div className="h-20 w-20 rounded-full bg-green-100 mx-auto mb-6 flex items-center justify-center">
              <CheckCircle2 className="h-10 w-10 text-green-600" />
            </div>
            <h2 className="text-2xl font-bold text-green-800 mb-2">Agreement Signed!</h2>
            <p className="text-green-700 mb-6">
              Thank you for signing the rental agreement. You&apos;ll receive a confirmation shortly.
            </p>
            <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-left">
              <p className="text-sm text-green-800">
                <strong>Reservation:</strong> {data?.reservation.reservation_number}
              </p>
              <p className="text-sm text-green-800 mt-1">
                <strong>Signed at:</strong> {new Date().toLocaleString('en-ZA')}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Main signing view
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-slate-100 to-slate-50">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 bg-primary rounded-lg flex items-center justify-center">
              <FileText className="h-5 w-5 text-white" />
            </div>
            <div>
              <h1 className="font-bold text-lg">Rental Agreement</h1>
              <p className="text-sm text-muted-foreground">{data?.reservation.reservation_number}</p>
            </div>
          </div>
          <Badge variant="outline" className="gap-1">
            <Shield className="h-3 w-3" />
            Secure
          </Badge>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-8 space-y-6">
        {/* Customer & Rental Info */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Rental Details</CardTitle>
          </CardHeader>
          <CardContent className="grid md:grid-cols-2 gap-6">
            <div>
              <p className="text-sm text-muted-foreground">Customer</p>
              <p className="font-medium">{data?.reservation.customer_name}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Rental Period</p>
              <p className="font-medium">
                {data?.reservation.pickup_date && formatDate(data.reservation.pickup_date)}
                <span className="text-muted-foreground mx-2">→</span>
                {data?.reservation.return_date && formatDate(data.reservation.return_date)}
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Equipment List */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Equipment</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {data?.reservation.equipment_items.map((item, index) => (
                <div 
                  key={index} 
                  className="flex items-center justify-between py-2 border-b last:border-0"
                >
                  <div>
                    <p className="font-medium">{item.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {item.quantity} × {formatCurrency(item.daily_rate)}/day
                    </p>
                  </div>
                </div>
              ))}
            </div>
            <Separator className="my-4" />
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Subtotal</span>
                <span>{formatCurrency(data?.reservation.subtotal || 0)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Security Deposit</span>
                <span>{formatCurrency(data?.reservation.deposit_amount || 0)}</span>
              </div>
              <div className="flex justify-between font-bold text-lg pt-2 border-t">
                <span>Total</span>
                <span>{formatCurrency(data?.reservation.total || 0)}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Terms and Conditions */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Terms and Conditions</CardTitle>
            <CardDescription>Please read carefully before signing</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="bg-slate-50 border rounded-lg p-4 max-h-64 overflow-y-auto text-sm whitespace-pre-wrap font-mono">
              {data?.agreement.terms_and_conditions}
            </div>
            <div className="flex items-start gap-3 mt-4">
              <Checkbox
                id="terms"
                checked={termsAccepted}
                onCheckedChange={(checked) => setTermsAccepted(checked === true)}
              />
              <Label htmlFor="terms" className="text-sm leading-tight cursor-pointer">
                I have read and agree to the Terms and Conditions
              </Label>
            </div>
          </CardContent>
        </Card>

        {/* Liability Waiver */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Liability Waiver</CardTitle>
            <CardDescription>Important legal information</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="bg-slate-50 border rounded-lg p-4 max-h-64 overflow-y-auto text-sm whitespace-pre-wrap font-mono">
              {data?.agreement.liability_waiver}
            </div>
            <div className="flex items-start gap-3 mt-4">
              <Checkbox
                id="liability"
                checked={liabilityAccepted}
                onCheckedChange={(checked) => setLiabilityAccepted(checked === true)}
              />
              <Label htmlFor="liability" className="text-sm leading-tight cursor-pointer">
                I understand and accept the Liability Waiver
              </Label>
            </div>
          </CardContent>
        </Card>

        {/* Signature Pad */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Pen className="h-5 w-5" />
              Your Signature
            </CardTitle>
            <CardDescription>Draw your signature in the box below</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="relative">
              <canvas
                ref={canvasRef}
                className="w-full h-40 border-2 border-dashed border-slate-300 rounded-lg bg-white cursor-crosshair touch-none"
                onMouseDown={startDrawing}
                onMouseMove={draw}
                onMouseUp={stopDrawing}
                onMouseLeave={stopDrawing}
                onTouchStart={startDrawing}
                onTouchMove={draw}
                onTouchEnd={stopDrawing}
              />
              {!signatureData && (
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <p className="text-slate-400">Sign here</p>
                </div>
              )}
            </div>
            <div className="flex justify-end mt-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={clearSignature}
                disabled={!signatureData}
              >
                <RotateCcw className="h-4 w-4 mr-1" />
                Clear
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Error Display */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg flex items-center gap-2">
            <AlertCircle className="h-5 w-5 flex-shrink-0" />
            <p className="text-sm">{error}</p>
          </div>
        )}

        {/* Submit Button */}
        <div className="sticky bottom-0 bg-gradient-to-t from-slate-100 via-slate-100 to-transparent pt-4 pb-6">
          <Button
            className="w-full h-14 text-lg font-semibold"
            disabled={!termsAccepted || !liabilityAccepted || !signatureData || submitting}
            onClick={handleSubmit}
          >
            {submitting ? (
              <>
                <div className="animate-spin h-5 w-5 border-2 border-white border-t-transparent rounded-full mr-2" />
                Submitting...
              </>
            ) : (
              <>
                <Send className="h-5 w-5 mr-2" />
                Sign & Submit Agreement
              </>
            )}
          </Button>
          <p className="text-center text-xs text-muted-foreground mt-3">
            By signing, you agree to the terms and conditions above
          </p>
        </div>
      </main>
    </div>
  );
}


