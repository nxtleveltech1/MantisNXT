/**
 * ReferralProgram - Referral management
 *
 * Features:
 * - Unique referral link display
 * - One-click copy button
 * - Referral count and points earned
 * - Share buttons (Email, Twitter, LinkedIn, Facebook)
 * - Referral history table
 * - How it works FAQ
 *
 * APIs:
 * - GET /api/v1/customers/[id]/loyalty/referrals
 * - POST /api/v1/customers/[id]/loyalty/referrals
 */

'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Copy,
  Mail,
  Share2,
  Users,
  TrendingUp,
  Check,
  Clock,
  X,
  Plus,
} from 'lucide-react';
import { format } from 'date-fns';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface ReferralProgramProps {
  customerId: string;
}

interface ReferralData {
  referrals: Referral[];
  total: number;
  referral_code: string;
  total_referrals: number;
  successful_referrals: number;
  pending_referrals: number;
  total_points_earned: number;
}

interface Referral {
  id: string;
  referred_email: string;
  referred_name?: string;
  status: 'pending' | 'completed' | 'expired';
  points_earned: number;
  referred_at: string;
  completed_at?: string;
}

const STATUS_CONFIG = {
  pending: {
    label: 'Pending',
    color: 'bg-yellow-100 text-yellow-800 border-yellow-300',
    icon: Clock,
  },
  completed: {
    label: 'Completed',
    color: 'bg-green-100 text-green-800 border-green-300',
    icon: Check,
  },
  expired: {
    label: 'Expired',
    color: 'bg-red-100 text-red-800 border-red-300',
    icon: X,
  },
};

export function ReferralProgram({ customerId }: ReferralProgramProps) {
  const [showInviteDialog, setShowInviteDialog] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteName, setInviteName] = useState('');

  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['loyalty-referrals', customerId],
    queryFn: async () => {
      const response = await fetch(
        `/api/v1/customers/${customerId}/loyalty/referrals`
      );
      if (!response.ok) throw new Error('Failed to fetch referrals');
      const json = await response.json();
      return json.data as ReferralData;
    },
  });

  const createReferralMutation = useMutation({
    mutationFn: async (data: { referred_email: string; referred_name?: string }) => {
      const response = await fetch(
        `/api/v1/customers/${customerId}/loyalty/referrals`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data),
        }
      );
      if (!response.ok) throw new Error('Failed to create referral');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['loyalty-referrals', customerId],
      });
      toast.success('Invitation sent!', {
        description: 'Your referral has been recorded.',
      });
      setShowInviteDialog(false);
      setInviteEmail('');
      setInviteName('');
    },
    onError: () => {
      toast.error('Failed to send invitation', {
        description: 'Please try again or contact support.',
      });
    },
  });

  const referralLink = data
    ? `${window.location.origin}/signup?ref=${data.referral_code}`
    : '';

  const handleCopyLink = () => {
    navigator.clipboard.writeText(referralLink);
    toast.success('Link copied to clipboard!');
  };

  const handleShareEmail = () => {
    const subject = encodeURIComponent('Join me and earn rewards!');
    const body = encodeURIComponent(
      `I've been using this amazing service and thought you'd love it too! Sign up using my referral link and we both get rewards:\n\n${referralLink}`
    );
    window.open(`mailto:?subject=${subject}&body=${body}`, '_blank');
  };

  const handleShareTwitter = () => {
    const text = encodeURIComponent(
      `Join me and earn rewards! ${referralLink}`
    );
    window.open(`https://twitter.com/intent/tweet?text=${text}`, '_blank');
  };

  const handleShareLinkedIn = () => {
    window.open(
      `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(referralLink)}`,
      '_blank'
    );
  };

  const handleShareFacebook = () => {
    window.open(
      `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(referralLink)}`,
      '_blank'
    );
  };

  const handleInvite = () => {
    if (!inviteEmail) {
      toast.error('Please enter an email address');
      return;
    }
    createReferralMutation.mutate({
      referred_email: inviteEmail,
      referred_name: inviteName || undefined,
    });
  };

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto" />
          <p className="text-muted-foreground">Loading referral program...</p>
        </div>
      </div>
    );
  }

  if (!data) return null;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold">Referral Program</h2>
        <p className="text-muted-foreground">
          Invite friends and earn rewards together
        </p>
      </div>

      {/* Stats Overview */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="pt-6">
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-muted-foreground">
                <Users className="h-4 w-4" />
                <span className="text-sm font-medium">Total Referrals</span>
              </div>
              <p className="text-3xl font-bold">{data.total_referrals}</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-muted-foreground">
                <Check className="h-4 w-4" />
                <span className="text-sm font-medium">Successful</span>
              </div>
              <p className="text-3xl font-bold text-green-600">
                {data.successful_referrals}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-muted-foreground">
                <Clock className="h-4 w-4" />
                <span className="text-sm font-medium">Pending</span>
              </div>
              <p className="text-3xl font-bold text-yellow-600">
                {data.pending_referrals}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-muted-foreground">
                <TrendingUp className="h-4 w-4" />
                <span className="text-sm font-medium">Points Earned</span>
              </div>
              <p className="text-3xl font-bold text-primary">
                {data.total_points_earned.toLocaleString()}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Referral Link */}
      <Card className="border-primary/30 bg-gradient-to-br from-primary/5 to-primary/10">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Share2 className="h-5 w-5 text-primary" />
            Your Referral Link
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Input
              value={referralLink}
              readOnly
              className="font-mono text-sm bg-background"
            />
            <Button onClick={handleCopyLink} className="gap-2 shrink-0">
              <Copy className="h-4 w-4" />
              Copy
            </Button>
          </div>

          <Separator />

          {/* Share Buttons */}
          <div className="space-y-3">
            <p className="text-sm font-medium">Share via:</p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <Button
                variant="outline"
                onClick={handleShareEmail}
                className="gap-2"
              >
                <Mail className="h-4 w-4" />
                Email
              </Button>
              <Button
                variant="outline"
                onClick={handleShareTwitter}
                className="gap-2"
              >
                <svg
                  className="h-4 w-4"
                  fill="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                </svg>
                Twitter
              </Button>
              <Button
                variant="outline"
                onClick={handleShareLinkedIn}
                className="gap-2"
              >
                <svg
                  className="h-4 w-4"
                  fill="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
                </svg>
                LinkedIn
              </Button>
              <Button
                variant="outline"
                onClick={handleShareFacebook}
                className="gap-2"
              >
                <svg
                  className="h-4 w-4"
                  fill="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
                </svg>
                Facebook
              </Button>
            </div>
          </div>

          <Separator />

          {/* Direct Invite */}
          <div className="space-y-3">
            <p className="text-sm font-medium">Or invite directly:</p>
            <Button
              onClick={() => setShowInviteDialog(true)}
              variant="outline"
              className="w-full gap-2"
            >
              <Plus className="h-4 w-4" />
              Send Invitation
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Referral History */}
      <Card>
        <CardHeader>
          <CardTitle>Referral History</CardTitle>
        </CardHeader>
        <CardContent>
          {data.referrals.length === 0 ? (
            <div className="text-center py-8 space-y-2">
              <Users className="h-12 w-12 text-muted-foreground mx-auto" />
              <p className="font-medium">No referrals yet</p>
              <p className="text-sm text-muted-foreground">
                Start inviting friends to earn rewards!
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Contact</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Points</TableHead>
                    <TableHead>Date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.referrals.map((referral) => {
                    const statusConfig = STATUS_CONFIG[referral.status];
                    const StatusIcon = statusConfig.icon;

                    return (
                      <TableRow key={referral.id}>
                        <TableCell>
                          <div className="space-y-1">
                            {referral.referred_name && (
                              <p className="font-medium">
                                {referral.referred_name}
                              </p>
                            )}
                            <p className="text-sm text-muted-foreground">
                              {referral.referred_email}
                            </p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant="outline"
                            className={cn('gap-1.5', statusConfig.color)}
                          >
                            <StatusIcon className="h-3 w-3" />
                            {statusConfig.label}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <span
                            className={cn(
                              'font-semibold',
                              referral.points_earned > 0
                                ? 'text-green-600'
                                : 'text-muted-foreground'
                            )}
                          >
                            {referral.points_earned > 0
                              ? `+${referral.points_earned.toLocaleString()}`
                              : '-'}
                          </span>
                        </TableCell>
                        <TableCell>
                          <div className="text-sm">
                            <p>
                              {format(
                                new Date(referral.referred_at),
                                'MMM d, yyyy'
                              )}
                            </p>
                            {referral.completed_at && (
                              <p className="text-xs text-muted-foreground">
                                Completed{' '}
                                {format(
                                  new Date(referral.completed_at),
                                  'MMM d'
                                )}
                              </p>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* How It Works FAQ */}
      <Card>
        <CardHeader>
          <CardTitle>How It Works</CardTitle>
        </CardHeader>
        <CardContent>
          <Accordion type="single" collapsible className="w-full">
            <AccordionItem value="item-1">
              <AccordionTrigger>How do I refer someone?</AccordionTrigger>
              <AccordionContent>
                Simply share your unique referral link with friends via email,
                social media, or direct invitation. When they sign up using your
                link, you&apos;ll both receive rewards!
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="item-2">
              <AccordionTrigger>What rewards do I earn?</AccordionTrigger>
              <AccordionContent>
                You&apos;ll earn 100 points for each successful referral when your
                friend completes their first purchase. Your friend will also
                receive 50 bonus points as a welcome gift!
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="item-3">
              <AccordionTrigger>
                When will I receive my referral points?
              </AccordionTrigger>
              <AccordionContent>
                Referral points are credited to your account once your friend
                completes their first qualifying purchase. This typically
                happens within 24-48 hours of their purchase.
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="item-4">
              <AccordionTrigger>Is there a referral limit?</AccordionTrigger>
              <AccordionContent>
                No! You can refer as many friends as you&apos;d like. There&apos;s no cap
                on the rewards you can earn through referrals.
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="item-5">
              <AccordionTrigger>
                What if my referral doesn&apos;t complete a purchase?
              </AccordionTrigger>
              <AccordionContent>
                Referral bonuses are only awarded when the referred customer
                completes their first purchase. Pending referrals will expire
                after 90 days if no purchase is made.
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </CardContent>
      </Card>

      {/* Invite Dialog */}
      <Dialog open={showInviteDialog} onOpenChange={setShowInviteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Send Invitation</DialogTitle>
            <DialogDescription>
              Invite someone directly by email
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email Address *</Label>
              <Input
                id="email"
                type="email"
                placeholder="friend@example.com"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="name">Name (optional)</Label>
              <Input
                id="name"
                placeholder="Friend&apos;s name"
                value={inviteName}
                onChange={(e) => setInviteName(e.target.value)}
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowInviteDialog(false)}
              disabled={createReferralMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              onClick={handleInvite}
              disabled={createReferralMutation.isPending || !inviteEmail}
              className="gap-2"
            >
              {createReferralMutation.isPending ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
                  Sending...
                </>
              ) : (
                <>
                  <Mail className="h-4 w-4" />
                  Send Invitation
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
