# Loyalty & Rewards System - Quick Start Guide

## Table of Contents
1. [Setup](#setup)
2. [Common Operations](#common-operations)
3. [API Examples](#api-examples)
4. [Frontend Integration](#frontend-integration)
5. [Troubleshooting](#troubleshooting)

## Setup

### 1. Run Migration

```bash
# Apply the loyalty & rewards migration
psql -d your_database -f migrations/0015_loyalty_rewards.sql

# Run tests to validate
psql -d your_database -f migrations/0015_loyalty_rewards_TESTS.sql
```

### 2. Create Initial Program

```sql
-- Create your first loyalty program
INSERT INTO loyalty_program (
    org_id,
    name,
    description,
    is_active,
    is_default,
    earn_rate,
    points_expiry_days
) VALUES (
    'your-org-id',
    'VIP Rewards Program',
    'Earn points on every purchase and redeem for exclusive rewards',
    true,
    true,
    1.0,  -- 1 point per dollar spent
    365   -- Points expire after 1 year
);
```

### 3. Enroll Customers

```sql
-- Enroll a customer in the default program
INSERT INTO customer_loyalty (
    org_id,
    customer_id,
    program_id
)
SELECT
    c.org_id,
    c.id,
    (SELECT id FROM loyalty_program WHERE org_id = c.org_id AND is_default = true)
FROM customer c
WHERE c.id = 'customer-uuid';
```

### 4. Add Rewards

```sql
-- Create reward catalog
INSERT INTO reward_catalog (
    org_id,
    name,
    description,
    reward_type,
    points_required,
    monetary_value,
    is_active
) VALUES
    ('your-org-id', '10% Discount', 'Save 10% on next order', 'discount', 500, 50.00, true),
    ('your-org-id', 'Free Shipping', 'Free shipping for 30 days', 'free_shipping', 1000, 75.00, true),
    ('your-org-id', '$50 Credit', 'Account credit', 'cashback', 5000, 50.00, true);
```

## Common Operations

### Award Points for Order

```typescript
// In your order processing code
async function processOrder(orderId: string, customerId: string, orderAmount: number) {
    // 1. Calculate points
    const { rows: points } = await pool.query(
        `SELECT * FROM loyalty.calculate_points_for_order($1, $2, $3, $4::jsonb)`,
        [customerId, orderAmount, orderId, {}]
    );

    if (points.length === 0) return;

    // 2. Get customer's program
    const { rows: customerLoyaltyRows } = await pool.query(
        `SELECT program_id, org_id FROM customer_loyalty WHERE customer_id = $1`,
        [customerId]
    );
    const customerLoyalty = customerLoyaltyRows[0];

    // 3. Get expiry settings
    const { rows: programRows } = await pool.query(
        `SELECT points_expiry_days FROM loyalty_program WHERE id = $1`,
        [customerLoyalty.program_id]
    );
    const program = programRows[0];

    // 4. Award points
    const expiresAt = program?.points_expiry_days
        ? new Date(Date.now() + program.points_expiry_days * 24 * 60 * 60 * 1000)
        : null;

    await pool.query(
        `
            INSERT INTO loyalty_transaction (
                org_id, customer_id, program_id, transaction_type,
                points_amount, reference_type, reference_id, description, expires_at
            )
            VALUES ($1, $2, $3, 'earn', $4, 'order', $5, $6, $7)
        `,
        [
            customerLoyalty.org_id,
            customerId,
            customerLoyalty.program_id,
            points[0].points_awarded,
            orderId,
            `Earned ${points[0].points_awarded} points from order`,
            expiresAt,
        ]
    );
}
```

### Redeem Reward

```typescript
async function redeemReward(customerId: string, rewardId: string) {
    const { rows } = await pool.query(
        `SELECT * FROM loyalty.redeem_reward($1, $2, $3)`,
        [customerId, rewardId, 30]
    );
    const result = rows[0];

    if (!result.success) {
        throw new Error(result.error_message);
    }

    // Send email with redemption code
    await sendEmail({
        to: customerEmail,
        subject: 'Your Reward Redemption',
        body: `Your redemption code: ${result.redemption_code}`
    });

    return result;
}
```

### Get Customer Dashboard Data

```typescript
async function getCustomerDashboard(customerId: string) {
    // Get summary
    const { rows: summary } = await pool.query(
        `SELECT * FROM loyalty.get_customer_rewards_summary($1)`,
        [customerId]
    );

    if (!summary || summary.length === 0) {
        return { enrolled: false };
    }

    const customerData = summary[0];

    // Get available rewards
    const { rows: rewards } = await pool.query(
        `
            SELECT *
              FROM reward_catalog
             WHERE is_active = TRUE
               AND points_required <= $1
             ORDER BY points_required
        `,
        [customerData.points_balance]
    );

    return {
        enrolled: true,
        tier: customerData.current_tier,
        points: customerData.points_balance,
        pointsPending: customerData.points_pending,
        nextTier: customerData.next_tier,
        pointsToNextTier: customerData.points_to_next_tier,
        benefits: customerData.tier_benefits,
        availableRewards: rewards,
        recentTransactions: customerData.recent_transactions,
        recentRedemptions: customerData.recent_redemptions
    };
}
```

### Manual Point Adjustment

```sql
-- Add bonus points (birthday, apology, etc.)
INSERT INTO loyalty_transaction (
    org_id,
    customer_id,
    program_id,
    transaction_type,
    points_amount,
    reference_type,
    description,
    created_by
) VALUES (
    'org-uuid',
    'customer-uuid',
    'program-uuid',
    'bonus',
    500,
    'birthday',
    'Happy Birthday! Enjoy 500 bonus points',
    auth.uid()
);

-- Deduct points (adjustment)
INSERT INTO loyalty_transaction (
    org_id,
    customer_id,
    program_id,
    transaction_type,
    points_amount,
    reference_type,
    description,
    created_by
) VALUES (
    'org-uuid',
    'customer-uuid',
    'program-uuid',
    'adjust',
    -200,
    'manual',
    'Adjustment for returned order',
    auth.uid()
);
```

## API Examples

### Next.js API Routes

```typescript
// app/api/loyalty/customer/[id]/summary/route.ts
import { NextResponse } from 'next/server';
import { pool } from '@/lib/db/pool';

export async function GET(
    request: Request,
    { params }: { params: { id: string } }
) {
    const { rows } = await pool.query(
        `SELECT * FROM loyalty.get_customer_rewards_summary($1)`,
        [params.id]
    );

    if (!rows.length) {
        return NextResponse.json({ error: 'Customer not enrolled' }, { status: 404 });
    }

    return NextResponse.json(rows[0]);
}
```

```typescript
// app/api/loyalty/redeem/route.ts
import { NextResponse } from 'next/server';
import { pool } from '@/lib/db/pool';

export async function POST(request: Request) {
    const { customerId, rewardId } = await request.json();

    const { rows } = await pool.query(
        `SELECT * FROM loyalty.redeem_reward($1, $2, $3)`,
        [customerId, rewardId, 30]
    );
    const result = rows[0];

    if (!result.success) {
        return NextResponse.json({ error: result.error_message }, { status: 400 });
    }

    return NextResponse.json({
        success: true,
        redemptionId: result.redemption_id,
        redemptionCode: result.redemption_code
    });
}
```

```typescript
// app/api/loyalty/rewards/available/route.ts
import { NextResponse } from 'next/server';
import { pool } from '@/lib/db/pool';

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const customerId = searchParams.get('customerId');

    const { rows: loyaltyRows } = await pool.query(
        `SELECT points_balance, org_id FROM customer_loyalty WHERE customer_id = $1`,
        [customerId]
    );
    const loyalty = loyaltyRows[0];

    if (!loyalty) {
        return NextResponse.json({ error: 'Customer not enrolled' }, { status: 404 });
    }

    const { rows: rewards } = await pool.query(
        `
            SELECT *
              FROM reward_catalog
             WHERE org_id = $1
               AND is_active = TRUE
               AND points_required <= $2
               AND valid_from <= NOW()
               AND (valid_until IS NULL OR valid_until > NOW())
             ORDER BY points_required
        `,
        [loyalty.org_id, loyalty.points_balance]
    );

    return NextResponse.json(rewards);
}
```

## Frontend Integration

### React Component - Loyalty Dashboard

```tsx
// components/loyalty/LoyaltyDashboard.tsx
import { useEffect, useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';

interface LoyaltyDashboardProps {
    customerId: string;
}

export function LoyaltyDashboard({ customerId }: LoyaltyDashboardProps) {
    const [data, setData] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function fetchData() {
            const response = await fetch(`/api/loyalty/customer/${customerId}/summary`);
            const summary = await response.json();
            setData(summary);
            setLoading(false);
        }
        fetchData();
    }, [customerId]);

    if (loading) return <div>Loading...</div>;
    if (!data) return <div>Not enrolled in loyalty program</div>;

    const tierColors = {
        bronze: 'bg-orange-700',
        silver: 'bg-gray-400',
        gold: 'bg-yellow-500',
        platinum: 'bg-purple-500',
        diamond: 'bg-blue-500'
    };

    const progressToNextTier = data.points_to_next_tier > 0
        ? ((data.points_balance / (data.points_balance + data.points_to_next_tier)) * 100)
        : 100;

    return (
        <div className="space-y-6">
            {/* Tier Status */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center justify-between">
                        <span>Loyalty Status</span>
                        <Badge className={tierColors[data.current_tier]}>
                            {data.current_tier.toUpperCase()}
                        </Badge>
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="space-y-4">
                        <div>
                            <div className="flex justify-between text-sm mb-2">
                                <span>{data.points_balance.toLocaleString()} points</span>
                                {data.next_tier && (
                                    <span className="text-muted-foreground">
                                        {data.points_to_next_tier.toLocaleString()} to {data.next_tier}
                                    </span>
                                )}
                            </div>
                            {data.next_tier && (
                                <Progress value={progressToNextTier} />
                            )}
                        </div>

                        {/* Benefits */}
                        <div className="pt-4 border-t">
                            <h4 className="font-semibold mb-2">Your Benefits</h4>
                            <ul className="space-y-1 text-sm">
                                <li>✓ {data.tier_benefits.multiplier}x points on purchases</li>
                                {data.tier_benefits.discount && (
                                    <li>✓ {data.tier_benefits.discount}% discount on all orders</li>
                                )}
                                {data.tier_benefits.free_shipping && (
                                    <li>✓ Free shipping on all orders</li>
                                )}
                                {data.tier_benefits.priority_support && (
                                    <li>✓ Priority customer support</li>
                                )}
                            </ul>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Available Rewards */}
            <Card>
                <CardHeader>
                    <CardTitle>Available Rewards ({data.available_rewards_count})</CardTitle>
                </CardHeader>
                <CardContent>
                    {/* Reward grid - implement as needed */}
                </CardContent>
            </Card>
        </div>
    );
}
```

### React Component - Reward Card

```tsx
// components/loyalty/RewardCard.tsx
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

interface RewardCardProps {
    reward: {
        id: string;
        name: string;
        description: string;
        reward_type: string;
        points_required: number;
        monetary_value: number;
        stock_quantity: number | null;
    };
    customerPoints: number;
    onRedeem: (rewardId: string) => void;
}

export function RewardCard({ reward, customerPoints, onRedeem }: RewardCardProps) {
    const canAfford = customerPoints >= reward.points_required;
    const inStock = reward.stock_quantity === null || reward.stock_quantity > 0;

    return (
        <Card className={!canAfford || !inStock ? 'opacity-50' : ''}>
            <CardHeader>
                <CardTitle className="flex items-center justify-between">
                    <span>{reward.name}</span>
                    <Badge variant="secondary">{reward.reward_type}</Badge>
                </CardTitle>
            </CardHeader>
            <CardContent>
                <p className="text-sm text-muted-foreground mb-4">
                    {reward.description}
                </p>
                <div className="flex justify-between items-center">
                    <div>
                        <div className="text-2xl font-bold">
                            {reward.points_required.toLocaleString()}
                        </div>
                        <div className="text-sm text-muted-foreground">points</div>
                    </div>
                    <div className="text-right">
                        <div className="text-lg">${reward.monetary_value}</div>
                        <div className="text-sm text-muted-foreground">value</div>
                    </div>
                </div>
            </CardContent>
            <CardFooter>
                <Button
                    onClick={() => onRedeem(reward.id)}
                    disabled={!canAfford || !inStock}
                    className="w-full"
                >
                    {!inStock ? 'Out of Stock' : !canAfford ? 'Not Enough Points' : 'Redeem'}
                </Button>
            </CardFooter>
        </Card>
    );
}
```

## Troubleshooting

### Issue: Points not awarded after order

**Check:**
1. Is customer enrolled in loyalty program?
   ```sql
   SELECT * FROM customer_loyalty WHERE customer_id = 'customer-uuid';
   ```

2. Is the program active?
   ```sql
   SELECT * FROM loyalty_program WHERE id = 'program-uuid' AND is_active = true;
   ```

3. Check transaction history
   ```sql
   SELECT * FROM loyalty_transaction
   WHERE customer_id = 'customer-uuid'
   ORDER BY created_at DESC
   LIMIT 10;
   ```

### Issue: Redemption failed

**Check:**
1. Customer points balance
   ```sql
   SELECT points_balance FROM customer_loyalty WHERE customer_id = 'customer-uuid';
   ```

2. Reward availability
   ```sql
   SELECT * FROM reward_catalog WHERE id = 'reward-uuid';
   ```

3. Recent failed redemptions in logs

### Issue: Tier not updating

**Manually trigger:**
```sql
SELECT * FROM update_customer_tier('customer-uuid');
```

**Check thresholds:**
```sql
SELECT
    cl.total_points_earned,
    cl.current_tier,
    lp.tier_thresholds
FROM customer_loyalty cl
JOIN loyalty_program lp ON cl.program_id = lp.id
WHERE cl.customer_id = 'customer-uuid';
```

### Issue: Points balance incorrect

**Recalculate:**
```sql
-- Check transaction totals
SELECT
    SUM(CASE WHEN transaction_type IN ('earn', 'bonus') THEN points_amount ELSE 0 END) as earned,
    ABS(SUM(CASE WHEN transaction_type IN ('redeem', 'expire') THEN points_amount ELSE 0 END)) as redeemed
FROM loyalty_transaction
WHERE customer_id = 'customer-uuid';

-- Compare with customer_loyalty record
SELECT total_points_earned, total_points_redeemed, points_balance
FROM customer_loyalty
WHERE customer_id = 'customer-uuid';
```

## Scheduled Tasks

### Daily Cron Job

```bash
# Expire old points
psql -d your_database -c "SELECT * FROM expire_points();"

# Expire old redemptions
psql -d your_database -c "
UPDATE reward_redemption
SET status = 'expired'
WHERE status = 'pending'
AND expires_at <= now();
"
```

### Weekly Analytics

```bash
# Generate leaderboard
psql -d your_database -c "
SELECT * FROM loyalty_leaderboard
WHERE org_id = 'your-org-id'
ORDER BY overall_rank
LIMIT 100;
"

# Monitor points liability
psql -d your_database -c "
SELECT
    current_tier,
    SUM(points_balance) as total_points,
    SUM(points_balance * 0.01) as estimated_cost_usd
FROM customer_loyalty
WHERE org_id = 'your-org-id'
GROUP BY current_tier;
"
```

## Support

For detailed documentation, see: `docs/LOYALTY_REWARDS_SYSTEM.md`

For issues:
- Check audit logs: `SELECT * FROM audit_log WHERE table_name LIKE 'loyalty%' OR table_name LIKE 'reward%' ORDER BY timestamp DESC;`
- Review transaction history for customer
- Verify RLS policies are not blocking access
- Monitor points liability regularly

---

**Version**: 1.0.0
**Migration**: 0015_loyalty_rewards.sql
