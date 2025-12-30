'use client';

import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  MessageSquare,
  Smartphone,
  Send,
  CheckCircle2,
  Clock,
  Eye,
  AlertCircle,
  RefreshCw,
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface DeliveryHistory {
  id: string;
  channel: 'sms' | 'whatsapp';
  phone_number: string;
  status: string;
  sent_at: string;
  viewed_at?: string;
  signed_at?: string;
  created_at: string;
}

interface SendAgreementDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  reservationId: string;
  reservationNumber: string;
  customerName: string;
  customerPhone?: string;
  onSent?: () => void;
}

export function SendAgreementDialog({
  open,
  onOpenChange,
  reservationId,
  reservationNumber,
  customerName,
  customerPhone,
  onSent,
}: SendAgreementDialogProps) {
  const { toast } = useToast();
  const [channel, setChannel] = useState<'sms' | 'whatsapp'>('whatsapp');
  const [phone, setPhone] = useState(customerPhone || '');
  const [sending, setSending] = useState(false);
  const [deliveries, setDeliveries] = useState<DeliveryHistory[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  useEffect(() => {
    if (open) {
      fetchDeliveryHistory();
      if (customerPhone) {
        setPhone(customerPhone);
      }
    }
  }, [open, reservationId, customerPhone]);

  const fetchDeliveryHistory = async () => {
    setLoadingHistory(true);
    try {
      const response = await fetch(`/api/rentals/reservations/${reservationId}/agreement/send`);
      const result = await response.json();
      if (result.success) {
        setDeliveries(result.data || []);
      }
    } catch (error) {
      console.error('Failed to fetch delivery history:', error);
    } finally {
      setLoadingHistory(false);
    }
  };

  const handleSend = async () => {
    if (!phone) {
      toast({
        title: 'Error',
        description: 'Please enter a phone number',
        variant: 'destructive',
      });
      return;
    }

    setSending(true);
    try {
      const response = await fetch(`/api/rentals/reservations/${reservationId}/agreement/send`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ channel, phone }),
      });

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.message || 'Failed to send agreement');
      }

      toast({
        title: 'Agreement Sent',
        description: `Agreement sent via ${channel === 'whatsapp' ? 'WhatsApp' : 'SMS'} to ${phone}`,
      });

      fetchDeliveryHistory();
      onSent?.();
    } catch (error) {
      toast({
        title: 'Failed to Send',
        description: error instanceof Error ? error.message : 'Failed to send agreement',
        variant: 'destructive',
      });
    } finally {
      setSending(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'signed':
        return <CheckCircle2 className="h-4 w-4 text-green-600" />;
      case 'viewed':
        return <Eye className="h-4 w-4 text-blue-600" />;
      case 'sent':
      case 'delivered':
        return <Send className="h-4 w-4 text-slate-600" />;
      case 'failed':
      case 'expired':
        return <AlertCircle className="h-4 w-4 text-red-600" />;
      default:
        return <Clock className="h-4 w-4 text-slate-400" />;
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
      signed: 'default',
      viewed: 'secondary',
      sent: 'outline',
      delivered: 'outline',
      failed: 'destructive',
      expired: 'destructive',
      pending: 'outline',
    };

    return (
      <Badge variant={variants[status] || 'outline'} className="capitalize">
        {status}
      </Badge>
    );
  };

  const formatDateTime = (dateString: string) => {
    return new Date(dateString).toLocaleString('en-ZA', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Send className="h-5 w-5" />
            Send Agreement for Signing
          </DialogTitle>
          <DialogDescription>
            Send the rental agreement to {customerName} for digital signature via SMS or WhatsApp.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Channel Selection */}
          <div className="space-y-3">
            <Label>Delivery Channel</Label>
            <RadioGroup
              value={channel}
              onValueChange={(value) => setChannel(value as 'sms' | 'whatsapp')}
              className="grid grid-cols-2 gap-4"
            >
              <Label
                htmlFor="whatsapp"
                className={`flex flex-col items-center gap-2 rounded-lg border-2 p-4 cursor-pointer transition-colors ${
                  channel === 'whatsapp'
                    ? 'border-green-500 bg-green-50'
                    : 'border-slate-200 hover:border-slate-300'
                }`}
              >
                <RadioGroupItem value="whatsapp" id="whatsapp" className="sr-only" />
                <MessageSquare className={`h-8 w-8 ${channel === 'whatsapp' ? 'text-green-600' : 'text-slate-400'}`} />
                <span className={`font-medium ${channel === 'whatsapp' ? 'text-green-700' : 'text-slate-600'}`}>
                  WhatsApp
                </span>
                <span className="text-xs text-muted-foreground">Rich formatting</span>
              </Label>

              <Label
                htmlFor="sms"
                className={`flex flex-col items-center gap-2 rounded-lg border-2 p-4 cursor-pointer transition-colors ${
                  channel === 'sms'
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-slate-200 hover:border-slate-300'
                }`}
              >
                <RadioGroupItem value="sms" id="sms" className="sr-only" />
                <Smartphone className={`h-8 w-8 ${channel === 'sms' ? 'text-blue-600' : 'text-slate-400'}`} />
                <span className={`font-medium ${channel === 'sms' ? 'text-blue-700' : 'text-slate-600'}`}>
                  SMS
                </span>
                <span className="text-xs text-muted-foreground">Universal reach</span>
              </Label>
            </RadioGroup>
          </div>

          {/* Phone Number */}
          <div className="space-y-2">
            <Label htmlFor="phone">Phone Number</Label>
            <Input
              id="phone"
              type="tel"
              placeholder="+27 82 123 4567"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              Include country code (e.g., +27 for South Africa)
            </p>
          </div>

          {/* Previous Deliveries */}
          {deliveries.length > 0 && (
            <>
              <Separator />
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label>Delivery History</Label>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={fetchDeliveryHistory}
                    disabled={loadingHistory}
                  >
                    <RefreshCw className={`h-4 w-4 ${loadingHistory ? 'animate-spin' : ''}`} />
                  </Button>
                </div>
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {deliveries.map((delivery) => (
                    <div
                      key={delivery.id}
                      className="flex items-center justify-between p-3 rounded-lg bg-slate-50 text-sm"
                    >
                      <div className="flex items-center gap-3">
                        {getStatusIcon(delivery.status)}
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-medium capitalize">{delivery.channel}</span>
                            <span className="text-muted-foreground">→</span>
                            <span className="text-muted-foreground">{delivery.phone_number}</span>
                          </div>
                          <p className="text-xs text-muted-foreground">
                            {formatDateTime(delivery.sent_at || delivery.created_at)}
                          </p>
                        </div>
                      </div>
                      {getStatusBadge(delivery.status)}
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSend} disabled={sending || !phone}>
            {sending ? (
              <>
                <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full mr-2" />
                Sending...
              </>
            ) : (
              <>
                <Send className="h-4 w-4 mr-2" />
                Send Agreement
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}



