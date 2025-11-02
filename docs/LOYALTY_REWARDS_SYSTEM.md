# Loyalty & Rewards System Documentation

## Overview

The MantisNXT Loyalty & Rewards System is a production-ready, B2B-focused loyalty platform designed to reward customers for purchases, referrals, and engagement. The system features tiered benefits, flexible point earning rules, a comprehensive reward catalog, and gamification elements.

## Architecture

### Database Schema

#### Core Tables

1. **loyalty_program**: Program configuration and rules
2. **customer_loyalty**: Customer enrollment and points balance
3. **loyalty_transaction**: Complete audit trail of points movement
4. **reward_catalog**: Available rewards for redemption
5. **reward_redemption**: Redemption history and fulfillment tracking
6. **loyalty_rule**: Automated rules for bonus points

#### Supporting Views

1. **loyalty_leaderboard**: Gamification rankings
2. **reward_analytics**: Business intelligence on reward performance

## Business Logic

### Points Calculation

#### Base Points Formula
```
base_points = FLOOR(order_amount * program.earn_rate)
```

**Example**: Order of $1,000 with earn_rate of 1.0 = 1,000 points

#### Tier Multipliers

Points are multiplied based on customer tier:

| Tier     | Multiplier | Threshold (Lifetime Points) |
|----------|------------|----------------------------|
| Bronze   | 1.0x       | 0                          |
| Silver   | 1.2x       | 1,000                      |
| Gold     | 1.5x       | 5,000                      |
| Platinum | 2.0x       | 15,000                     |
| Diamond  | 3.0x       | 50,000                     |

**Example**: Gold customer ordering $1,000:
```
base_points = 1,000
tier_bonus = 1,000 * (1.5 - 1.0) = 500
total = 1,500 points
```

#### Loyalty Rules

Additional points can be awarded through loyalty rules:

```sql
-- Example: Double points for orders over $5,000
{
  "conditions": {"min_order_amount": 5000},
  "points_multiplier": 2.0,
  "bonus_points": 0
}
```

**Final Calculation**:
```
final_points = FLOOR(base_points * tier_multiplier * rules_multiplier) + bonus_points
```

### Tier Progression

Tiers are based on **lifetime points earned** (not current balance):

1. Customer earns points from purchases
2. `total_points_earned` increases
3. System checks tier thresholds
4. If threshold crossed, tier upgraded automatically
5. Tier benefits apply immediately

**Important**: Redeeming points does NOT affect tier status.

### Points Expiry

Programs can configure points expiry:

```sql
-- Example: Points expire after 365 days
loyalty_program.points_expiry_days = 365
```

Process:
1. When points are earned, `expires_at` is set to `now() + points_expiry_days`
2. Scheduled job runs `expire_points()` function
3. Expired points create `expire` transaction type
4. Customer balance is reduced

## Core Functions

### calculate_points_for_order

Calculates points to award for an order with complete breakdown.

```sql
SELECT * FROM calculate_points_for_order(
    p_customer_id := '123e4567-e89b-12d3-a456-426614174000',
    p_order_amount := 1500.00,
    p_order_id := '123e4567-e89b-12d3-a456-426614174001',
    p_order_metadata := '{}'::jsonb
);
```

**Returns**:
```
points_awarded  | base_points | tier_bonus | rule_bonus | total_multiplier
----------------|-------------|------------|------------|------------------
2250            | 1500        | 750        | 0          | 1.5
```

**Usage Pattern**:
1. Order is placed and confirmed
2. Call function to calculate points
3. Create `loyalty_transaction` with type `earn`
4. Points automatically added to customer balance via trigger
5. Tier automatically checked and upgraded if needed

### redeem_reward

Processes a reward redemption with complete validation.

```sql
SELECT * FROM redeem_reward(
    p_customer_id := '123e4567-e89b-12d3-a456-426614174000',
    p_reward_id := '123e4567-e89b-12d3-a456-426614174002',
    p_redemption_expiry_days := 30
);
```

**Returns**:
```
success | redemption_id | redemption_code | error_message
--------|---------------|-----------------|---------------
true    | abc123...     | a1b2c3d4e5f6... | NULL
```

**Validation Checks**:
1. Customer enrolled in loyalty program
2. Reward is active and valid
3. Customer has sufficient points
4. Reward has stock available
5. Customer hasn't exceeded max redemptions

**Process**:
1. Validates all requirements
2. Creates redemption record with unique code
3. Deducts points via transaction
4. Updates customer balance
5. Decrements reward stock
6. Returns redemption code to customer

**Error Handling**:
```sql
-- Insufficient points
SELECT * FROM redeem_reward(...);
-- Returns: success=false, error_message='Insufficient points. Required: 500, Available: 250'

-- Out of stock
-- Returns: success=false, error_message='Reward out of stock'

-- Max redemptions reached
-- Returns: success=false, error_message='Maximum redemptions reached (3)'
```

### update_customer_tier

Evaluates and updates customer tier based on lifetime points.

```sql
SELECT * FROM update_customer_tier('123e4567-e89b-12d3-a456-426614174000');
```

**Returns**:
```
old_tier | new_tier | tier_changed
---------|----------|-------------
silver   | gold     | true
```

**Process**:
1. Retrieves customer's total lifetime points
2. Compares against tier thresholds
3. Determines appropriate tier
4. Updates if changed
5. Logs tier change in transaction history

**Automatic Triggering**:
- Called automatically after `earn` or `bonus` transactions
- Can be called manually for batch processing
- Used in reports to ensure current tier status

### expire_points

Batch process to expire old points.

```sql
SELECT * FROM expire_points();
```

**Returns**:
```
expired_count | total_points_expired
--------------|---------------------
47            | 12500
```

**Process**:
1. Finds all `earn` transactions with `expires_at <= now()`
2. For each expired transaction:
   - Creates `expire` transaction (negative points)
   - Updates customer balance
3. Returns summary statistics

**Recommended Schedule**: Daily cron job at midnight

### get_customer_rewards_summary

Comprehensive customer rewards summary.

```sql
SELECT * FROM get_customer_rewards_summary('123e4567-e89b-12d3-a456-426614174000');
```

**Returns**:
```json
{
  "customer_id": "123e4567-e89b-12d3-a456-426614174000",
  "current_tier": "gold",
  "points_balance": 5420,
  "points_pending": 250,
  "lifetime_value": 15000.00,
  "tier_benefits": {
    "multiplier": 1.5,
    "discount": 10,
    "free_shipping": true
  },
  "next_tier": "platinum",
  "points_to_next_tier": 9580,
  "available_rewards_count": 12,
  "recent_transactions": [...],
  "recent_redemptions": [...]
}
```

**Use Cases**:
- Customer dashboard
- Mobile app display
- Email summaries
- Customer service lookups

## Transaction Types

### earn
Points earned from purchases or activities.

```sql
INSERT INTO loyalty_transaction (
    org_id, customer_id, program_id,
    transaction_type, points_amount,
    reference_type, reference_id,
    description, expires_at
) VALUES (
    'org-uuid', 'customer-uuid', 'program-uuid',
    'earn', 1000,
    'order', 'order-uuid',
    'Points earned from order #12345',
    now() + INTERVAL '365 days'
);
```

### redeem
Points redeemed for rewards (negative amount).

```sql
INSERT INTO loyalty_transaction (
    org_id, customer_id, program_id,
    transaction_type, points_amount,
    reference_type, reference_id,
    description
) VALUES (
    'org-uuid', 'customer-uuid', 'program-uuid',
    'redeem', -500,
    'redemption', 'redemption-uuid',
    'Redeemed: 10% Discount Voucher'
);
```

### expire
Points expired due to time limit (negative amount).

```sql
-- Created automatically by expire_points() function
```

### adjust
Manual adjustment (positive or negative).

```sql
INSERT INTO loyalty_transaction (
    org_id, customer_id, program_id,
    transaction_type, points_amount,
    reference_type,
    description,
    created_by
) VALUES (
    'org-uuid', 'customer-uuid', 'program-uuid',
    'adjust', 500,
    'manual',
    'Goodwill credit for delayed shipment',
    auth.uid()
);
```

### bonus
Bonus points from promotions or special events.

```sql
INSERT INTO loyalty_transaction (
    org_id, customer_id, program_id,
    transaction_type, points_amount,
    reference_type,
    description
) VALUES (
    'org-uuid', 'customer-uuid', 'program-uuid',
    'bonus', 1000,
    'birthday',
    'Happy Birthday bonus points!'
);
```

## Reward Types

### points
Additional loyalty points.

```sql
INSERT INTO reward_catalog (
    org_id, name, reward_type,
    points_required, monetary_value,
    description
) VALUES (
    'org-uuid',
    '500 Bonus Points',
    'points',
    1000,
    5.00,
    'Redeem 1000 points to receive 500 bonus points'
);
```

### discount
Percentage or fixed discount on next order.

```json
{
  "terms_conditions": {
    "discount_type": "percentage",
    "discount_value": 10,
    "max_discount": 100,
    "valid_days": 30,
    "min_order_amount": 50
  }
}
```

### cashback
Cash credit to customer account.

```json
{
  "terms_conditions": {
    "credit_amount": 25.00,
    "valid_days": 90,
    "min_order_for_use": 100
  }
}
```

### free_shipping
Free shipping on next N orders.

```json
{
  "terms_conditions": {
    "shipment_count": 3,
    "valid_days": 60,
    "max_shipment_value": 50
  }
}
```

### upgrade
Tier upgrade or expedited service.

```json
{
  "terms_conditions": {
    "upgrade_type": "expedited_shipping",
    "valid_days": 30,
    "shipment_count": 1
  }
}
```

### gift
Physical or digital gift.

```json
{
  "terms_conditions": {
    "gift_description": "Premium branded water bottle",
    "shipping_included": true,
    "requires_address": true
  }
}
```

## Loyalty Rules

### Order-Based Rules

```sql
-- Double points for orders over $5,000
INSERT INTO loyalty_rule (
    org_id, program_id,
    name, description,
    trigger_type, conditions,
    points_multiplier, bonus_points,
    is_active, priority
) VALUES (
    'org-uuid', 'program-uuid',
    'High Value Order Bonus',
    'Double points for orders over $5,000',
    'order_placed',
    '{"min_order_amount": 5000}'::jsonb,
    2.0, 0,
    true, 10
);
```

### Referral Rules

```sql
-- 1,000 bonus points for successful referral
INSERT INTO loyalty_rule (
    org_id, program_id,
    name, description,
    trigger_type, conditions,
    points_multiplier, bonus_points,
    is_active, priority
) VALUES (
    'org-uuid', 'program-uuid',
    'Referral Bonus',
    '1,000 points for each successful referral',
    'referral',
    '{}'::jsonb,
    1.0, 1000,
    true, 5
);
```

### Birthday/Anniversary Rules

```sql
-- Birthday bonus
INSERT INTO loyalty_rule (
    org_id, program_id,
    name, description,
    trigger_type, conditions,
    points_multiplier, bonus_points,
    is_active, priority,
    valid_from, valid_until
) VALUES (
    'org-uuid', 'program-uuid',
    'Birthday Bonus',
    '500 bonus points on your birthday',
    'birthday',
    '{}'::jsonb,
    1.0, 500,
    true, 1,
    '2025-01-01', '2025-12-31'
);
```

## Analytics & Reporting

### Loyalty Leaderboard

```sql
-- Top 10 customers by tier and points
SELECT
    customer_name,
    company,
    current_tier,
    total_points_earned,
    points_balance,
    tier_rank,
    overall_rank,
    points_this_month,
    points_this_quarter
FROM loyalty_leaderboard
WHERE org_id = 'org-uuid'
ORDER BY overall_rank
LIMIT 10;
```

**Use Cases**:
- Monthly leaderboard emails
- Dashboard widgets
- Sales team insights
- Customer engagement campaigns

### Reward Analytics

```sql
-- Most popular rewards
SELECT
    reward_name,
    reward_type,
    total_redemptions,
    unique_customers,
    fulfilled_redemptions,
    total_points_spent,
    daily_redemption_rate,
    avg_fulfillment_hours
FROM reward_analytics
WHERE org_id = 'org-uuid'
AND is_active = true
ORDER BY total_redemptions DESC
LIMIT 10;
```

**Metrics**:
- **total_redemptions**: Total number of times redeemed
- **unique_customers**: Number of different customers
- **fulfilled_redemptions**: Successfully delivered
- **daily_redemption_rate**: Average redemptions per day
- **avg_fulfillment_hours**: Time to fulfill redemption

### Custom Reports

```sql
-- Points earned vs redeemed by month
SELECT
    date_trunc('month', created_at) as month,
    SUM(CASE WHEN transaction_type IN ('earn', 'bonus') THEN points_amount ELSE 0 END) as points_earned,
    ABS(SUM(CASE WHEN transaction_type = 'redeem' THEN points_amount ELSE 0 END)) as points_redeemed,
    COUNT(DISTINCT customer_id) as active_customers
FROM loyalty_transaction
WHERE org_id = 'org-uuid'
AND created_at >= date_trunc('year', CURRENT_DATE)
GROUP BY month
ORDER BY month;
```

```sql
-- Tier distribution
SELECT
    current_tier,
    COUNT(*) as customer_count,
    AVG(points_balance) as avg_points_balance,
    AVG(lifetime_value) as avg_lifetime_value,
    SUM(points_balance) as total_points_liability
FROM customer_loyalty
WHERE org_id = 'org-uuid'
GROUP BY current_tier
ORDER BY
    CASE current_tier
        WHEN 'diamond' THEN 5
        WHEN 'platinum' THEN 4
        WHEN 'gold' THEN 3
        WHEN 'silver' THEN 2
        WHEN 'bronze' THEN 1
    END DESC;
```

```sql
-- Redemption fulfillment performance
SELECT
    date_trunc('week', redeemed_at) as week,
    COUNT(*) as total_redemptions,
    COUNT(*) FILTER (WHERE status = 'fulfilled') as fulfilled,
    COUNT(*) FILTER (WHERE status = 'pending') as pending,
    AVG(EXTRACT(EPOCH FROM (fulfilled_at - redeemed_at)) / 3600) FILTER (WHERE fulfilled_at IS NOT NULL) as avg_fulfillment_hours
FROM reward_redemption
WHERE org_id = 'org-uuid'
AND redeemed_at >= CURRENT_DATE - INTERVAL '90 days'
GROUP BY week
ORDER BY week DESC;
```

## Integration Guide

### Order Processing Integration

```typescript
// When order is confirmed
async function processOrderLoyalty(orderId: string, customerId: string, orderAmount: number) {
    // 1. Calculate points
    const { data: pointsData } = await supabase.rpc('calculate_points_for_order', {
        p_customer_id: customerId,
        p_order_amount: orderAmount,
        p_order_id: orderId,
        p_order_metadata: {}
    });

    if (!pointsData || pointsData.length === 0) {
        console.log('Customer not enrolled in loyalty program');
        return;
    }

    const { points_awarded, base_points, tier_bonus, rule_bonus } = pointsData[0];

    // 2. Get customer's loyalty program
    const { data: customerLoyalty } = await supabase
        .from('customer_loyalty')
        .select('program_id, org_id')
        .eq('customer_id', customerId)
        .single();

    if (!customerLoyalty) return;

    // 3. Get program expiry settings
    const { data: program } = await supabase
        .from('loyalty_program')
        .select('points_expiry_days')
        .eq('id', customerLoyalty.program_id)
        .single();

    // 4. Create transaction
    const expiresAt = program?.points_expiry_days
        ? new Date(Date.now() + program.points_expiry_days * 24 * 60 * 60 * 1000)
        : null;

    const { error } = await supabase
        .from('loyalty_transaction')
        .insert({
            org_id: customerLoyalty.org_id,
            customer_id: customerId,
            program_id: customerLoyalty.program_id,
            transaction_type: 'earn',
            points_amount: points_awarded,
            reference_type: 'order',
            reference_id: orderId,
            description: `Points earned from order #${orderId}`,
            expires_at: expiresAt,
            metadata: {
                base_points,
                tier_bonus,
                rule_bonus,
                order_amount: orderAmount
            }
        });

    if (error) {
        console.error('Failed to create loyalty transaction:', error);
        return;
    }

    // Trigger automatically updates customer balance and checks tier
    console.log(`Awarded ${points_awarded} points to customer ${customerId}`);
}
```

### Reward Redemption Integration

```typescript
async function redeemCustomerReward(customerId: string, rewardId: string) {
    const { data, error } = await supabase.rpc('redeem_reward', {
        p_customer_id: customerId,
        p_reward_id: rewardId,
        p_redemption_expiry_days: 30
    });

    if (error) {
        throw new Error(`Redemption failed: ${error.message}`);
    }

    const result = data[0];

    if (!result.success) {
        throw new Error(result.error_message);
    }

    // Send confirmation email with redemption code
    await sendRedemptionEmail(customerId, {
        redemptionId: result.redemption_id,
        redemptionCode: result.redemption_code
    });

    return result;
}
```

### Customer Dashboard Integration

```typescript
async function getCustomerDashboardData(customerId: string) {
    const { data, error } = await supabase.rpc('get_customer_rewards_summary', {
        p_customer_id: customerId
    });

    if (error || !data || data.length === 0) {
        return null;
    }

    const summary = data[0];

    // Get available rewards
    const { data: availableRewards } = await supabase
        .from('reward_catalog')
        .select('*')
        .eq('is_active', true)
        .lte('points_required', summary.points_balance)
        .order('points_required', { ascending: true });

    return {
        ...summary,
        availableRewards
    };
}
```

## Security Considerations

### Row Level Security (RLS)

All tables have RLS enabled with the following policies:

1. **Organization Isolation**: Users can only access data from their organization
2. **Customer Privacy**: Customers can only view their own loyalty data
3. **Admin Controls**: Only admins can create/modify programs and rules
4. **Public Catalog**: Active rewards visible to all authenticated users

### Fraud Prevention

1. **Max Redemptions**: Limit redemptions per customer per reward
2. **Stock Management**: Prevent over-redemption of limited rewards
3. **Expiry Enforcement**: Automatic expiry of old points and redemptions
4. **Audit Trail**: Complete transaction history with user tracking
5. **Validation Triggers**: Pre-insert validation of redemptions

### Points Liability Management

Monitor total points liability:

```sql
-- Total points liability by tier
SELECT
    current_tier,
    SUM(points_balance) as total_points,
    SUM(points_balance * 0.01) as estimated_liability_usd
FROM customer_loyalty
WHERE org_id = 'org-uuid'
GROUP BY current_tier;
```

**Best Practices**:
1. Set points expiry to limit long-term liability
2. Monitor redemption rates vs earn rates
3. Reserve funds for point redemptions
4. Adjust earn rates if liability grows too high

## Maintenance Tasks

### Daily Tasks

```sql
-- Expire old points
SELECT * FROM expire_points();

-- Expire old redemptions
UPDATE reward_redemption
SET status = 'expired'
WHERE status = 'pending'
AND expires_at <= now();
```

### Weekly Tasks

```sql
-- Check tier progression for all customers
SELECT update_customer_tier(customer_id)
FROM customer_loyalty
WHERE updated_at < CURRENT_DATE - INTERVAL '7 days';

-- Monitor points liability
SELECT
    SUM(points_balance) as total_points_outstanding,
    SUM(points_balance * 0.01) as estimated_cost_usd
FROM customer_loyalty
WHERE org_id = 'org-uuid';
```

### Monthly Tasks

```sql
-- Generate leaderboard
SELECT * FROM loyalty_leaderboard
WHERE org_id = 'org-uuid'
ORDER BY overall_rank
LIMIT 100;

-- Analyze reward performance
SELECT * FROM reward_analytics
WHERE org_id = 'org-uuid'
ORDER BY total_redemptions DESC;

-- Identify inactive customers
SELECT
    c.id,
    c.name,
    cl.current_tier,
    cl.points_balance,
    MAX(lt.created_at) as last_activity
FROM customer c
JOIN customer_loyalty cl ON c.id = cl.customer_id
LEFT JOIN loyalty_transaction lt ON c.id = lt.customer_id
WHERE c.org_id = 'org-uuid'
GROUP BY c.id, c.name, cl.current_tier, cl.points_balance
HAVING MAX(lt.created_at) < CURRENT_DATE - INTERVAL '90 days'
ORDER BY cl.points_balance DESC;
```

## Performance Optimization

### Index Strategy

The system includes comprehensive indexes for:
- Organization and customer lookups
- Points balance queries
- Expiry processing
- Leaderboard generation
- Transaction history

### Query Optimization

```sql
-- Use indexes effectively
EXPLAIN ANALYZE
SELECT * FROM loyalty_transaction
WHERE customer_id = 'customer-uuid'
AND created_at >= CURRENT_DATE - INTERVAL '30 days'
ORDER BY created_at DESC;

-- Result should show Index Scan
```

### Batch Processing

```sql
-- Process birthday bonuses in batch
INSERT INTO loyalty_transaction (
    org_id, customer_id, program_id,
    transaction_type, points_amount,
    reference_type, description
)
SELECT
    c.org_id,
    c.id,
    cl.program_id,
    'bonus',
    500,
    'birthday',
    'Happy Birthday bonus points!'
FROM customer c
JOIN customer_loyalty cl ON c.id = cl.customer_id
WHERE EXTRACT(MONTH FROM c.metadata->>'birth_date') = EXTRACT(MONTH FROM CURRENT_DATE)
AND EXTRACT(DAY FROM c.metadata->>'birth_date') = EXTRACT(DAY FROM CURRENT_DATE)
AND NOT EXISTS (
    SELECT 1 FROM loyalty_transaction lt
    WHERE lt.customer_id = c.id
    AND lt.reference_type = 'birthday'
    AND lt.created_at >= CURRENT_DATE
);
```

## Troubleshooting

### Common Issues

#### Points Not Awarded
```sql
-- Check if customer enrolled
SELECT * FROM customer_loyalty
WHERE customer_id = 'customer-uuid';

-- Check if program active
SELECT * FROM loyalty_program
WHERE id = 'program-uuid'
AND is_active = true;

-- Check transaction history
SELECT * FROM loyalty_transaction
WHERE customer_id = 'customer-uuid'
ORDER BY created_at DESC
LIMIT 10;
```

#### Redemption Failed
```sql
-- Check points balance
SELECT points_balance FROM customer_loyalty
WHERE customer_id = 'customer-uuid';

-- Check reward availability
SELECT
    r.name,
    r.points_required,
    r.stock_quantity,
    r.is_active,
    r.valid_from,
    r.valid_until
FROM reward_catalog r
WHERE r.id = 'reward-uuid';
```

#### Tier Not Updating
```sql
-- Manually trigger tier update
SELECT * FROM update_customer_tier('customer-uuid');

-- Check tier thresholds
SELECT
    cl.total_points_earned,
    lp.tier_thresholds
FROM customer_loyalty cl
JOIN loyalty_program lp ON cl.program_id = lp.id
WHERE cl.customer_id = 'customer-uuid';
```

## Future Enhancements

### Planned Features

1. **Gamification Badges**: Achievement system for milestones
2. **Social Sharing**: Points for sharing on social media
3. **Partner Rewards**: Integration with partner programs
4. **Dynamic Tiers**: Auto-adjust thresholds based on customer distribution
5. **Predictive Analytics**: ML-based tier progression predictions
6. **Mobile Wallet**: Integration with Apple/Google Wallet
7. **Gift Points**: Transfer points between customers
8. **Charitable Donations**: Redeem points for charity donations

### API Endpoints

Future API endpoints to build:

- `POST /api/loyalty/enroll` - Enroll customer in program
- `GET /api/loyalty/customer/:id/summary` - Get customer summary
- `POST /api/loyalty/redeem` - Redeem reward
- `GET /api/loyalty/rewards` - List available rewards
- `GET /api/loyalty/leaderboard` - Get leaderboard
- `POST /api/loyalty/transfer` - Transfer points (future)
- `GET /api/loyalty/analytics` - Organization analytics

## Support

For issues or questions:
- Check trigger logs in `audit_log` table
- Review transaction history for customer
- Verify RLS policies are not blocking access
- Check function execution with `EXPLAIN ANALYZE`
- Monitor points liability regularly

---

**Version**: 1.0.0
**Last Updated**: 2025-11-02
**Migration**: 0015_loyalty_rewards.sql
