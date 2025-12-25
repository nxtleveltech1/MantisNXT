'use client';

import React, { useState, useEffect } from 'react';
import AppLayout from '@/components/layout/AppLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useRouter, useParams } from 'next/navigation';
import { ArrowLeft, CheckCircle2, Package, FileText, Download, Send, MessageSquare } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import type { Reservation, ReservationItem } from '@/types/rentals';
import type { RentalAgreement } from '@/services/rentals/agreementService';
import { SendAgreementDialog } from '@/components/rentals/SendAgreementDialog';

export default function ReservationDetailPage() {
  const router = useRouter();
  const params = useParams();
  const { toast } = useToast();
  const reservationId = params?.id as string;
  const [reservation, setReservation] = useState<Reservation | null>(null);
  const [items, setItems] = useState<ReservationItem[]>([]);
  const [agreement, setAgreement] = useState<RentalAgreement | null>(null);
  const [loading, setLoading] = useState(true);
  const [sendDialogOpen, setSendDialogOpen] = useState(false);

  useEffect(() => {
    if (reservationId) {
      fetchReservation();
    }
  }, [reservationId]);

  const fetchReservation = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/rentals/reservations/${reservationId}`);
      const result = await response.json();

      if (result.success) {
        setReservation(result.data);
        setItems(result.data.items || []);
        
        // Fetch agreement
        try {
          const agreementRes = await fetch(`/api/rentals/reservations/${reservationId}/agreement`);
          const agreementData = await agreementRes.json();
          if (agreementData.success) {
            setAgreement(agreementData.data);
          }
        } catch (err) {
          console.error('Error fetching agreement:', err);
        }
      } else {
        toast({
          title: 'Error',
          description: 'Failed to load reservation',
          variant: 'destructive',
        });
        router.push('/rentals/reservations');
      }
    } catch (error) {
      console.error('Error fetching reservation:', error);
      toast({
        title: 'Error',
        description: 'Failed to load reservation',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCheckout = async () => {
    try {
      const response = await fetch(`/api/rentals/reservations/${reservationId}/checkout`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          checkout_type: 'pickup',
          actual_datetime: new Date().toISOString(),
        }),
      });

      const result = await response.json();
      if (result.success) {
        toast({
          title: 'Success',
          description: 'Equipment checked out successfully',
        });
        fetchReservation();
      } else {
        throw new Error(result.error);
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to checkout equipment',
        variant: 'destructive',
      });
    }
  };

  const handleCheckin = async () => {
    try {
      const response = await fetch(`/api/rentals/reservations/${reservationId}/checkin`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          checkin_type: 'return',
          actual_datetime: new Date().toISOString(),
        }),
      });

      const result = await response.json();
      if (result.success) {
        toast({
          title: 'Success',
          description: 'Equipment checked in successfully',
        });
        fetchReservation();
      } else {
        throw new Error(result.error);
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to checkin equipment',
        variant: 'destructive',
      });
    }
  };

  if (loading || !reservation) {
    return (
      <AppLayout title="Reservation Details" breadcrumbs={[]}>
        <div className="flex items-center justify-center p-8">
          <div className="text-muted-foreground">Loading...</div>
        </div>
      </AppLayout>
    );
  }

  const formatDate = (dateString?: string) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-ZA', {
      style: 'currency',
      currency: 'ZAR',
    }).format(amount);
  };

  const breadcrumbs = [
    { label: 'Rentals', href: '/rentals' },
    { label: 'Reservations', href: '/rentals/reservations' },
    { label: reservation.reservation_number },
  ];

  return (
    <AppLayout title={`Reservation ${reservation.reservation_number}`} breadcrumbs={breadcrumbs}>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" onClick={() => router.back()}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back
            </Button>
            <div>
              <h1 className="text-3xl font-bold tracking-tight">
                {reservation.reservation_number}
              </h1>
              <p className="text-muted-foreground">{reservation.event_name || 'No event name'}</p>
            </div>
          </div>
          <div className="flex gap-2">
            {reservation.status === 'confirmed' && (
              <Button onClick={handleCheckout}>
                <CheckCircle2 className="mr-2 h-4 w-4" />
                Checkout
              </Button>
            )}
            {reservation.status === 'active' && (
              <Button onClick={handleCheckin} variant="outline">
                <Package className="mr-2 h-4 w-4" />
                Checkin
              </Button>
            )}
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium">Status</CardTitle>
            </CardHeader>
            <CardContent>
              <Badge className="text-lg">{reservation.status}</Badge>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium">Security Deposit</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {formatCurrency(reservation.security_deposit_amount)}
              </div>
              <p className="text-sm text-muted-foreground">
                Paid: {formatCurrency(reservation.security_deposit_paid)}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium">Equipment Value</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {formatCurrency(reservation.total_equipment_value)}
              </div>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="details" className="space-y-4">
          <TabsList>
            <TabsTrigger value="details">Details</TabsTrigger>
            <TabsTrigger value="equipment">Equipment</TabsTrigger>
            <TabsTrigger value="agreement">Agreement</TabsTrigger>
          </TabsList>

          <TabsContent value="details" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Reservation Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Rental Period</p>
                    <p className="text-lg">
                      {formatDate(reservation.rental_start_date)} -{' '}
                      {formatDate(reservation.rental_end_date)}
                    </p>
                  </div>
                  {reservation.event_date_start && (
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Event Dates</p>
                      <p className="text-lg">
                        {formatDate(reservation.event_date_start)} -{' '}
                        {formatDate(reservation.event_date_end)}
                      </p>
                    </div>
                  )}
                  {reservation.pickup_date && (
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Pickup Date</p>
                      <p className="text-lg">{formatDate(reservation.pickup_date)}</p>
                    </div>
                  )}
                  {reservation.return_date && (
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Return Date</p>
                      <p className="text-lg">{formatDate(reservation.return_date)}</p>
                    </div>
                  )}
                </div>
                {reservation.notes && (
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Notes</p>
                    <p className="text-sm">{reservation.notes}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="equipment" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Equipment</CardTitle>
                <CardDescription>Equipment included in this reservation</CardDescription>
              </CardHeader>
              <CardContent>
                {items.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No equipment items</p>
                ) : (
                  <div className="space-y-2">
                    {items.map((item) => (
                      <div
                        key={item.reservation_item_id}
                        className="flex items-center justify-between rounded-lg border p-3"
                      >
                        <div>
                          <p className="font-medium">Equipment ID: {item.equipment_id.substring(0, 8)}...</p>
                          <p className="text-sm text-muted-foreground">
                            Quantity: {item.quantity} × {formatCurrency(item.rental_rate)}/day
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="font-medium">{formatCurrency(item.line_total)}</p>
                          <p className="text-sm text-muted-foreground">
                            {item.rental_period_days} days
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="agreement" className="space-y-4">
            {/* Send Agreement for Signing Card */}
            <Card className="border-primary/20 bg-primary/5">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                      <MessageSquare className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <CardTitle className="text-base">Send Agreement for Signing</CardTitle>
                      <CardDescription>Send via SMS or WhatsApp for digital signature</CardDescription>
                    </div>
                  </div>
                  <Button onClick={() => setSendDialogOpen(true)} disabled={!agreement}>
                    <Send className="mr-2 h-4 w-4" />
                    Send Agreement
                  </Button>
                </div>
              </CardHeader>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Rental Agreement</CardTitle>
                <CardDescription>Legal agreement and terms</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {agreement ? (
                  <>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">Agreement Number</span>
                        <span className="font-medium">{agreement.agreement_number}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">Agreement Type</span>
                        <Badge>{agreement.agreement_type}</Badge>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">Created</span>
                        <span className="text-sm">{new Date(agreement.created_at).toLocaleDateString()}</span>
                      </div>
                    </div>
                    
                    <div className="space-y-4 border-t pt-4">
                      <div>
                        <h4 className="font-semibold mb-2">Terms and Conditions</h4>
                        <div className="text-sm text-muted-foreground whitespace-pre-wrap bg-muted p-4 rounded-lg max-h-96 overflow-y-auto">
                          {agreement.terms_and_conditions}
                        </div>
                      </div>
                      
                      <div>
                        <h4 className="font-semibold mb-2">Liability Waiver</h4>
                        <div className="text-sm text-muted-foreground whitespace-pre-wrap bg-muted p-4 rounded-lg max-h-96 overflow-y-auto">
                          {agreement.liability_waiver}
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex gap-2">
                      {agreement.agreement_pdf_url && (
                        <Button variant="outline" asChild>
                          <a href={agreement.agreement_pdf_url} target="_blank" rel="noopener noreferrer">
                            <Download className="mr-2 h-4 w-4" />
                            Download PDF
                          </a>
                        </Button>
                      )}
                    </div>
                  </>
                ) : (
                  <div className="text-center py-8">
                    <FileText className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                    <p className="text-sm text-muted-foreground mb-4">
                      Rental agreement will be generated automatically when reservation is created.
                    </p>
                    <Badge variant="outline">Agreement Generated</Badge>
                  </div>
                )}
              </CardContent>
            </Card>
            
            {/* Financial Breakdown */}
            {reservation && (
              <Card>
                <CardHeader>
                  <CardTitle>Financial Breakdown</CardTitle>
                  <CardDescription>Complete cost breakdown for this reservation</CardDescription>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Subtotal</span>
                    <span className="font-medium">{formatCurrency(reservation.subtotal || 0)}</span>
                  </div>
                  {reservation.delivery_cost > 0 && (
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Delivery</span>
                      <span className="font-medium">{formatCurrency(reservation.delivery_cost)}</span>
                    </div>
                  )}
                  {reservation.setup_cost > 0 && (
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Setup</span>
                      <span className="font-medium">{formatCurrency(reservation.setup_cost)}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-sm border-t pt-2">
                    <span className="text-muted-foreground">VAT ({(reservation.tax_rate || 0) * 100}%)</span>
                    <span className="font-medium">{formatCurrency(reservation.tax_amount || 0)}</span>
                  </div>
                  <div className="flex justify-between text-lg font-bold border-t pt-2">
                    <span>Total Rental Amount</span>
                    <span>{formatCurrency(reservation.total_rental_amount || 0)}</span>
                  </div>
                  <div className="flex justify-between text-sm pt-2 border-t">
                    <span className="text-muted-foreground">Security Deposit</span>
                    <span className="font-medium text-orange-600">{formatCurrency(reservation.security_deposit_amount)}</span>
                  </div>
                  <div className="flex justify-between text-lg font-bold pt-2 border-t">
                    <span>Total Amount Due</span>
                    <span className="text-primary">{formatCurrency(reservation.total_amount_due || 0)}</span>
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </div>

      {/* Send Agreement Dialog */}
      <SendAgreementDialog
        open={sendDialogOpen}
        onOpenChange={setSendDialogOpen}
        reservationId={reservationId}
        reservationNumber={reservation.reservation_number}
        customerName={reservation.customer_name || 'Customer'}
        customerPhone={reservation.customer_phone}
        onSent={fetchReservation}
      />
    </AppLayout>
  );
}

