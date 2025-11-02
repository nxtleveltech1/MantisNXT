/**
 * RewardCatalog - Browse and redeem rewards
 *
 * Features:
 * - Grid/list view toggle
 * - Filters: Points range, type, availability
 * - Sort options
 * - Reward cards with redemption
 * - Redemption modal with confirmation
 * - Terms display
 *
 * APIs:
 * - GET /api/v1/customers/[id]/loyalty/rewards/available
 * - POST /api/v1/customers/[id]/loyalty/rewards/redeem
 */

'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Grid3x3,
  List,
  Gift,
  Check,
  AlertCircle,
  Search,
  Filter,
  X,
  Sparkles,
} from 'lucide-react';
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { PointsDisplay } from './shared/PointsDisplay';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface RewardCatalogProps {
  customerId: string;
  currentPoints: number;
}

interface Reward {
  id: string;
  name: string;
  description: string;
  points_cost: number;
  reward_type: string;
  image_url?: string;
  stock_quantity?: number;
  is_featured: boolean;
  is_active: boolean;
  terms?: string;
}

export function RewardCatalog({
  customerId,
  currentPoints,
}: RewardCatalogProps) {
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRewardType, setSelectedRewardType] = useState<string>('all');
  const [maxPoints, setMaxPoints] = useState<number[]>([currentPoints]);
  const [sortBy, setSortBy] = useState('points_asc');
  const [showFilters, setShowFilters] = useState(false);
  const [selectedReward, setSelectedReward] = useState<Reward | null>(null);

  const queryClient = useQueryClient();

  // Fetch rewards
  const { data, isLoading } = useQuery({
    queryKey: [
      'available-rewards',
      customerId,
      selectedRewardType,
      maxPoints[0],
    ],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (selectedRewardType !== 'all') {
        params.append('reward_type', selectedRewardType);
      }
      params.append('max_points', maxPoints[0].toString());

      const response = await fetch(
        `/api/v1/customers/${customerId}/loyalty/rewards/available?${params}`
      );
      if (!response.ok) throw new Error('Failed to fetch rewards');
      const json = await response.json();
      return json.data as Reward[];
    },
  });

  // Redeem mutation
  const redeemMutation = useMutation({
    mutationFn: async (rewardId: string) => {
      const response = await fetch(
        `/api/v1/customers/${customerId}/loyalty/rewards/redeem`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ reward_id: rewardId }),
        }
      );
      if (!response.ok) throw new Error('Failed to redeem reward');
      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({
        queryKey: ['available-rewards', customerId],
      });
      queryClient.invalidateQueries({
        queryKey: ['loyalty-summary', customerId],
      });
      toast.success('Reward redeemed successfully!', {
        description: `Redemption code: ${data.data.redemption_code}`,
      });
      setSelectedReward(null);
    },
    onError: () => {
      toast.error('Failed to redeem reward', {
        description: 'Please try again or contact support.',
      });
    },
  });

  // Filter and sort rewards
  const filteredRewards = (data || [])
    .filter((reward) => {
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        return (
          reward.name.toLowerCase().includes(query) ||
          reward.description.toLowerCase().includes(query)
        );
      }
      return true;
    })
    .sort((a, b) => {
      switch (sortBy) {
        case 'points_asc':
          return a.points_cost - b.points_cost;
        case 'points_desc':
          return b.points_cost - a.points_cost;
        case 'name':
          return a.name.localeCompare(b.name);
        default:
          return 0;
      }
    });

  const handleRedeem = (reward: Reward) => {
    if (reward.points_cost > currentPoints) {
      toast.error('Insufficient points', {
        description: `You need ${(reward.points_cost - currentPoints).toLocaleString()} more points.`,
      });
      return;
    }
    setSelectedReward(reward);
  };

  const confirmRedeem = () => {
    if (selectedReward) {
      redeemMutation.mutate(selectedReward.id);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold">Reward Catalog</h2>
          <p className="text-muted-foreground">
            You have{' '}
            <span className="font-semibold text-primary">
              {currentPoints.toLocaleString()}
            </span>{' '}
            points to spend
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant={viewMode === 'grid' ? 'default' : 'outline'}
            size="icon"
            onClick={() => setViewMode('grid')}
          >
            <Grid3x3 className="h-4 w-4" />
          </Button>
          <Button
            variant={viewMode === 'list' ? 'default' : 'outline'}
            size="icon"
            onClick={() => setViewMode('list')}
          >
            <List className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Search and Filters */}
      <Card>
        <CardContent className="pt-6 space-y-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search rewards..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            <Button
              variant="outline"
              onClick={() => setShowFilters(!showFilters)}
              className="gap-2"
            >
              <Filter className="h-4 w-4" />
              Filters
              {showFilters && <X className="h-4 w-4" />}
            </Button>
          </div>

          <AnimatePresence>
            {showFilters && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="grid gap-4 sm:grid-cols-3"
              >
                <div className="space-y-2">
                  <Label>Reward Type</Label>
                  <Select
                    value={selectedRewardType}
                    onValueChange={setSelectedRewardType}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Types</SelectItem>
                      <SelectItem value="discount">Discount</SelectItem>
                      <SelectItem value="product">Product</SelectItem>
                      <SelectItem value="experience">Experience</SelectItem>
                      <SelectItem value="shipping">Shipping</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Sort By</Label>
                  <Select value={sortBy} onValueChange={setSortBy}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="points_asc">
                        Points: Low to High
                      </SelectItem>
                      <SelectItem value="points_desc">
                        Points: High to Low
                      </SelectItem>
                      <SelectItem value="name">Name</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Max Points: {maxPoints[0].toLocaleString()}</Label>
                  <Slider
                    value={maxPoints}
                    onValueChange={setMaxPoints}
                    max={currentPoints}
                    step={100}
                    className="mt-2"
                  />
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </CardContent>
      </Card>

      {/* Rewards Grid/List */}
      {isLoading ? (
        <div className="flex justify-center py-12">
          <div className="text-center space-y-4">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto" />
            <p className="text-muted-foreground">Loading rewards...</p>
          </div>
        </div>
      ) : filteredRewards.length === 0 ? (
        <Card>
          <CardContent className="pt-12 pb-12 text-center space-y-4">
            <Gift className="h-12 w-12 text-muted-foreground mx-auto" />
            <div>
              <p className="font-medium">No rewards found</p>
              <p className="text-sm text-muted-foreground">
                Try adjusting your filters or search query
              </p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div
          className={cn(
            'grid gap-4',
            viewMode === 'grid'
              ? 'sm:grid-cols-2 lg:grid-cols-3'
              : 'grid-cols-1'
          )}
        >
          {filteredRewards.map((reward, index) => (
            <motion.div
              key={reward.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
            >
              <Card
                className={cn(
                  'h-full transition-shadow hover:shadow-lg',
                  reward.is_featured && 'border-primary'
                )}
              >
                <CardContent className="pt-6">
                  <div
                    className={cn(
                      'space-y-4',
                      viewMode === 'list' && 'flex gap-4 items-start'
                    )}
                  >
                    {/* Image placeholder */}
                    <div
                      className={cn(
                        'bg-gradient-to-br from-primary/10 to-primary/5 rounded-lg flex items-center justify-center',
                        viewMode === 'grid'
                          ? 'aspect-video'
                          : 'w-32 h-32 shrink-0'
                      )}
                    >
                      <Gift className="h-12 w-12 text-primary" />
                    </div>

                    {/* Content */}
                    <div className="flex-1 space-y-3">
                      <div className="space-y-1">
                        <div className="flex items-start justify-between gap-2">
                          <h3 className="font-semibold line-clamp-2">
                            {reward.name}
                          </h3>
                          {reward.is_featured && (
                            <Badge
                              variant="secondary"
                              className="shrink-0 gap-1 bg-primary/10 text-primary"
                            >
                              <Sparkles className="h-3 w-3" />
                              Featured
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground line-clamp-2">
                          {reward.description}
                        </p>
                      </div>

                      <div className="flex items-center justify-between">
                        <div>
                          <PointsDisplay
                            points={reward.points_cost}
                            animated={false}
                            variant="compact"
                            className="text-2xl"
                          />
                          <p className="text-xs text-muted-foreground">
                            points
                          </p>
                        </div>

                        {reward.stock_quantity !== undefined && (
                          <Badge variant="outline" className="text-xs">
                            {reward.stock_quantity > 0
                              ? `${reward.stock_quantity} left`
                              : 'Out of stock'}
                          </Badge>
                        )}
                      </div>

                      <Button
                        onClick={() => handleRedeem(reward)}
                        disabled={
                          reward.points_cost > currentPoints ||
                          reward.stock_quantity === 0 ||
                          redeemMutation.isPending
                        }
                        className="w-full gap-2"
                      >
                        {reward.points_cost > currentPoints ? (
                          <>
                            <AlertCircle className="h-4 w-4" />
                            Need{' '}
                            {(reward.points_cost - currentPoints).toLocaleString()}{' '}
                            more
                          </>
                        ) : reward.stock_quantity === 0 ? (
                          'Out of Stock'
                        ) : (
                          <>
                            <Gift className="h-4 w-4" />
                            Redeem
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      )}

      {/* Redemption Confirmation Dialog */}
      <Dialog
        open={!!selectedReward}
        onOpenChange={(open) => !open && setSelectedReward(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Redemption</DialogTitle>
            <DialogDescription>
              Are you sure you want to redeem this reward?
            </DialogDescription>
          </DialogHeader>

          {selectedReward && (
            <div className="space-y-4">
              <Card>
                <CardContent className="pt-6 space-y-3">
                  <div className="flex items-start gap-3">
                    <div className="bg-primary/10 p-3 rounded-lg">
                      <Gift className="h-6 w-6 text-primary" />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold">{selectedReward.name}</h3>
                      <p className="text-sm text-muted-foreground">
                        {selectedReward.description}
                      </p>
                    </div>
                  </div>

                  <Separator />

                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">
                      Points Cost
                    </span>
                    <span className="text-lg font-bold text-primary">
                      {selectedReward.points_cost.toLocaleString()}
                    </span>
                  </div>

                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">
                      Your Balance After
                    </span>
                    <span className="text-lg font-semibold">
                      {(currentPoints - selectedReward.points_cost).toLocaleString()}
                    </span>
                  </div>
                </CardContent>
              </Card>

              {selectedReward.terms && (
                <div className="text-xs text-muted-foreground bg-muted p-3 rounded-lg">
                  <p className="font-medium mb-1">Terms & Conditions:</p>
                  <p>{selectedReward.terms}</p>
                </div>
              )}
            </div>
          )}

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setSelectedReward(null)}
              disabled={redeemMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              onClick={confirmRedeem}
              disabled={redeemMutation.isPending}
              className="gap-2"
            >
              {redeemMutation.isPending ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
                  Redeeming...
                </>
              ) : (
                <>
                  <Check className="h-4 w-4" />
                  Confirm Redemption
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
