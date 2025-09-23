// Analytics Recommendations API Endpoint
import { NextRequest, NextResponse } from 'next/server';
import { Pool } from 'pg';
import { createAnalyticsService } from '@/lib/analytics/analytics-service';

// Database connection
const db = new Pool({
  host: process.env.DB_HOST,
  port: parseInt(process.env.DB_PORT || '5432'),
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  ssl: false,
  max: parseInt(process.env.DB_POOL_MAX || '50'),
  min: parseInt(process.env.DB_POOL_MIN || '10'),
  idleTimeoutMillis: parseInt(process.env.DB_POOL_IDLE_TIMEOUT || '30000'),
  connectionTimeoutMillis: parseInt(process.env.DB_POOL_CONNECTION_TIMEOUT || '5000'),
});

const analyticsService = createAnalyticsService(db);

// Recommendation Types
interface Recommendation {
  id: string;
  type: 'supplier_optimization' | 'inventory_reorder' | 'price_adjustment' | 'risk_mitigation' | 'cost_reduction' | 'process_improvement';
  priority: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  description: string;
  expectedImpact: string;
  confidence: number;
  timeframe: string;
  category: 'procurement' | 'inventory' | 'financial' | 'operational' | 'strategic';
  targetEntity: {
    type: 'supplier' | 'inventory_item' | 'category' | 'organization';
    id: string;
    name: string;
  };
  metrics: {
    currentValue: number;
    targetValue: number;
    improvementPotential: number;
    roi?: number;
  };
  actions: Array<{
    step: number;
    action: string;
    owner: string;
    deadline: string;
    status: 'pending' | 'in_progress' | 'completed';
  }>;
  createdAt: Date;
  expiresAt?: Date;
}

// Intelligent Recommendation Engine
class RecommendationEngine {
  private db: Pool;

  constructor(database: Pool) {
    this.db = database;
  }

  async generateSupplierRecommendations(organizationId: string): Promise<Recommendation[]> {
    // Get supplier analytics data
    const supplierAnalytics = await analyticsService.analyzeSupplierPerformance(undefined, organizationId);
    const recommendations: Recommendation[] = [];

    // Supplier performance recommendations
    supplierAnalytics.riskScores.forEach((riskScore, index) => {
      if (riskScore.riskScore > 70) {
        recommendations.push({
          id: `supplier-risk-${riskScore.supplierId}`,
          type: 'risk_mitigation',
          priority: 'high',
          title: `High-risk supplier requires immediate attention`,
          description: `Supplier has a risk score of ${riskScore.riskScore.toFixed(1)}/100. Primary concerns: delivery reliability and quality issues.`,
          expectedImpact: 'Reduce supply chain disruptions by 40-60%',
          confidence: riskScore.confidence,
          timeframe: '30 days',
          category: 'procurement',
          targetEntity: {
            type: 'supplier',
            id: riskScore.supplierId,
            name: `Supplier ${riskScore.supplierId}`
          },
          metrics: {
            currentValue: riskScore.riskScore,
            targetValue: 30,
            improvementPotential: riskScore.riskScore - 30,
            roi: 2.5
          },
          actions: [
            {
              step: 1,
              action: 'Conduct supplier audit and performance review',
              owner: 'procurement_manager',
              deadline: '7 days',
              status: 'pending'
            },
            {
              step: 2,
              action: 'Develop corrective action plan with supplier',
              owner: 'procurement_manager',
              deadline: '14 days',
              status: 'pending'
            },
            {
              step: 3,
              action: 'Identify backup suppliers for critical items',
              owner: 'sourcing_team',
              deadline: '21 days',
              status: 'pending'
            }
          ],
          createdAt: new Date(),
          expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
        });
      }

      // Supplier optimization opportunities
      if (riskScore.riskScore < 50 && riskScore.confidence > 0.8) {
        recommendations.push({
          id: `supplier-optimize-${riskScore.supplierId}`,
          type: 'supplier_optimization',
          priority: 'medium',
          title: 'Expand relationship with high-performing supplier',
          description: `Supplier shows excellent performance (risk score: ${riskScore.riskScore.toFixed(1)}/100). Consider increasing order volume.`,
          expectedImpact: 'Improve overall supplier portfolio performance',
          confidence: riskScore.confidence,
          timeframe: '60 days',
          category: 'strategic',
          targetEntity: {
            type: 'supplier',
            id: riskScore.supplierId,
            name: `Supplier ${riskScore.supplierId}`
          },
          metrics: {
            currentValue: riskScore.riskScore,
            targetValue: riskScore.riskScore,
            improvementPotential: 0,
            roi: 1.8
          },
          actions: [
            {
              step: 1,
              action: 'Negotiate volume discounts and improved terms',
              owner: 'procurement_manager',
              deadline: '30 days',
              status: 'pending'
            },
            {
              step: 2,
              action: 'Gradually increase order allocation',
              owner: 'procurement_team',
              deadline: '60 days',
              status: 'pending'
            }
          ],
          createdAt: new Date()
        });
      }
    });

    return recommendations;
  }

  async generateInventoryRecommendations(organizationId: string): Promise<Recommendation[]> {
    const recommendations: Recommendation[] = [];

    // Get inventory data
    const inventoryQuery = `
      SELECT
        ii.*,
        COALESCE(recent_movements.outbound_30d, 0) as outbound_30d,
        COALESCE(recent_movements.avg_daily_demand, 0) as avg_daily_demand
      FROM inventory_items ii
      LEFT JOIN (
        SELECT
          item_id,
          SUM(CASE WHEN type = 'outbound' THEN quantity ELSE 0 END) as outbound_30d,
          SUM(CASE WHEN type = 'outbound' THEN quantity ELSE 0 END) / 30.0 as avg_daily_demand
        FROM stock_movements
        WHERE timestamp >= NOW() - INTERVAL '30 days'
        GROUP BY item_id
      ) recent_movements ON ii.id = recent_movements.item_id
      WHERE ii.organization_id = $1
    `;

    const inventoryResult = await this.db.query(inventoryQuery, [organizationId]);

    inventoryResult.rows.forEach(item => {
      // Reorder recommendations
      if (item.current_stock <= item.reorder_point) {
        const urgency = item.current_stock === 0 ? 'critical' : 'high';
        const daysOfStock = item.avg_daily_demand > 0 ? item.current_stock / item.avg_daily_demand : 0;

        recommendations.push({
          id: `reorder-${item.id}`,
          type: 'inventory_reorder',
          priority: urgency,
          title: `${item.name} requires immediate reordering`,
          description: `Current stock: ${item.current_stock} units (${daysOfStock.toFixed(1)} days supply). Reorder point: ${item.reorder_point} units.`,
          expectedImpact: 'Prevent stockouts and maintain service levels',
          confidence: 0.95,
          timeframe: urgency === 'critical' ? '1 day' : '3 days',
          category: 'operational',
          targetEntity: {
            type: 'inventory_item',
            id: item.id,
            name: item.name
          },
          metrics: {
            currentValue: item.current_stock,
            targetValue: item.max_stock || item.reorder_point * 2,
            improvementPotential: (item.max_stock || item.reorder_point * 2) - item.current_stock
          },
          actions: [
            {
              step: 1,
              action: `Place purchase order for ${item.name}`,
              owner: 'purchasing_agent',
              deadline: urgency === 'critical' ? '4 hours' : '1 day',
              status: 'pending'
            },
            {
              step: 2,
              action: 'Review and optimize reorder parameters',
              owner: 'inventory_manager',
              deadline: '1 week',
              status: 'pending'
            }
          ],
          createdAt: new Date(),
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
        });
      }

      // Overstock recommendations
      if (item.current_stock > (item.max_stock || item.reorder_point * 3) * 1.5) {
        recommendations.push({
          id: `overstock-${item.id}`,
          type: 'cost_reduction',
          priority: 'medium',
          title: `${item.name} has excess inventory`,
          description: `Current stock: ${item.current_stock} units, significantly above optimal levels. Consider reducing orders or promotional activities.`,
          expectedImpact: 'Reduce carrying costs by 15-25%',
          confidence: 0.8,
          timeframe: '30 days',
          category: 'financial',
          targetEntity: {
            type: 'inventory_item',
            id: item.id,
            name: item.name
          },
          metrics: {
            currentValue: item.current_stock,
            targetValue: item.max_stock || item.reorder_point * 2,
            improvementPotential: item.current_stock - (item.max_stock || item.reorder_point * 2),
            roi: 1.5
          },
          actions: [
            {
              step: 1,
              action: 'Suspend new orders temporarily',
              owner: 'purchasing_agent',
              deadline: '1 day',
              status: 'pending'
            },
            {
              step: 2,
              action: 'Develop promotion or discount strategy',
              owner: 'sales_manager',
              deadline: '7 days',
              status: 'pending'
            }
          ],
          createdAt: new Date()
        });
      }
    });

    return recommendations;
  }

  async generatePricingRecommendations(organizationId: string): Promise<Recommendation[]> {
    const priceOptimizations = await analyticsService.optimizePricing(undefined, organizationId);
    const recommendations: Recommendation[] = [];

    priceOptimizations.forEach(opt => {
      if (opt.expectedProfitIncrease > 0.05) {
        recommendations.push({
          id: `price-opt-${opt.itemId}`,
          type: 'price_adjustment',
          priority: opt.expectedProfitIncrease > 0.2 ? 'high' : 'medium',
          title: 'Price optimization opportunity identified',
          description: `Item can be repriced from $${opt.currentPrice.toFixed(2)} to $${opt.optimizedPrice.toFixed(2)} for ${(opt.expectedProfitIncrease * 100).toFixed(1)}% profit increase.`,
          expectedImpact: `Increase profit margin by ${(opt.expectedProfitIncrease * 100).toFixed(1)}%`,
          confidence: 0.75,
          timeframe: '14 days',
          category: 'financial',
          targetEntity: {
            type: 'inventory_item',
            id: opt.itemId,
            name: `Item ${opt.itemId}`
          },
          metrics: {
            currentValue: opt.currentPrice,
            targetValue: opt.optimizedPrice,
            improvementPotential: opt.expectedProfitIncrease,
            roi: opt.expectedProfitIncrease + 1
          },
          actions: [
            {
              step: 1,
              action: 'Review pricing analysis and market conditions',
              owner: 'pricing_analyst',
              deadline: '3 days',
              status: 'pending'
            },
            {
              step: 2,
              action: 'Implement price adjustment',
              owner: 'pricing_manager',
              deadline: '7 days',
              status: 'pending'
            },
            {
              step: 3,
              action: 'Monitor demand response and adjust if needed',
              owner: 'pricing_analyst',
              deadline: '14 days',
              status: 'pending'
            }
          ],
          createdAt: new Date(),
          expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
        });
      }
    });

    return recommendations;
  }

  async generateProcessRecommendations(organizationId: string): Promise<Recommendation[]> {
    const recommendations: Recommendation[] = [];

    // Analyze process inefficiencies
    const processAnalysisQuery = `
      SELECT
        'slow_approvals' as issue_type,
        COUNT(*) as count,
        AVG(EXTRACT(EPOCH FROM (approved_at - created_at))/3600) as avg_hours
      FROM purchase_orders
      WHERE organization_id = $1
      AND approved_at IS NOT NULL
      AND created_at >= NOW() - INTERVAL '30 days'
      HAVING AVG(EXTRACT(EPOCH FROM (approved_at - created_at))/3600) > 24

      UNION ALL

      SELECT
        'manual_processes' as issue_type,
        COUNT(*) as count,
        0 as avg_hours
      FROM stock_movements sm
      JOIN inventory_items ii ON sm.item_id = ii.id
      WHERE ii.organization_id = $1
      AND sm.timestamp >= NOW() - INTERVAL '7 days'
      AND sm.reference_type = 'manual'
    `;

    try {
      const processResult = await this.db.query(processAnalysisQuery, [organizationId]);

      processResult.rows.forEach(issue => {
        if (issue.issue_type === 'slow_approvals' && issue.avg_hours > 24) {
          recommendations.push({
            id: `process-approval-${Date.now()}`,
            type: 'process_improvement',
            priority: 'medium',
            title: 'Purchase order approval process is slow',
            description: `Average approval time is ${issue.avg_hours.toFixed(1)} hours. Consider automating routine approvals.`,
            expectedImpact: 'Reduce approval time by 50-70%',
            confidence: 0.85,
            timeframe: '45 days',
            category: 'operational',
            targetEntity: {
              type: 'organization',
              id: organizationId,
              name: 'Approval Process'
            },
            metrics: {
              currentValue: issue.avg_hours,
              targetValue: 8,
              improvementPotential: issue.avg_hours - 8
            },
            actions: [
              {
                step: 1,
                action: 'Implement automated approval rules for routine orders',
                owner: 'process_manager',
                deadline: '30 days',
                status: 'pending'
              },
              {
                step: 2,
                action: 'Train staff on new approval workflow',
                owner: 'training_manager',
                deadline: '45 days',
                status: 'pending'
              }
            ],
            createdAt: new Date()
          });
        }
      });
    } catch (error) {
      console.error('Error analyzing processes:', error);
    }

    return recommendations;
  }

  async generateAllRecommendations(organizationId: string): Promise<Recommendation[]> {
    const [
      supplierRecs,
      inventoryRecs,
      pricingRecs,
      processRecs
    ] = await Promise.all([
      this.generateSupplierRecommendations(organizationId),
      this.generateInventoryRecommendations(organizationId),
      this.generatePricingRecommendations(organizationId),
      this.generateProcessRecommendations(organizationId)
    ]);

    const allRecommendations = [
      ...supplierRecs,
      ...inventoryRecs,
      ...pricingRecs,
      ...processRecs
    ];

    // Sort by priority and confidence
    return allRecommendations.sort((a, b) => {
      const priorityWeight = { 'critical': 4, 'high': 3, 'medium': 2, 'low': 1 };
      const aWeight = priorityWeight[a.priority] * a.confidence;
      const bWeight = priorityWeight[b.priority] * b.confidence;
      return bWeight - aWeight;
    });
  }
}

const recommendationEngine = new RecommendationEngine(db);

// GET /api/analytics/recommendations - Get intelligent recommendations
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const organizationId = searchParams.get('organizationId') || '1';
    const type = searchParams.get('type'); // 'supplier' | 'inventory' | 'pricing' | 'process' | 'all'
    const priority = searchParams.get('priority'); // 'critical' | 'high' | 'medium' | 'low'
    const limit = parseInt(searchParams.get('limit') || '50');

    const startTime = Date.now();

    let recommendations: Recommendation[] = [];

    switch (type) {
      case 'supplier':
        recommendations = await recommendationEngine.generateSupplierRecommendations(organizationId);
        break;
      case 'inventory':
        recommendations = await recommendationEngine.generateInventoryRecommendations(organizationId);
        break;
      case 'pricing':
        recommendations = await recommendationEngine.generatePricingRecommendations(organizationId);
        break;
      case 'process':
        recommendations = await recommendationEngine.generateProcessRecommendations(organizationId);
        break;
      case 'all':
      default:
        recommendations = await recommendationEngine.generateAllRecommendations(organizationId);
        break;
    }

    // Filter by priority if specified
    if (priority) {
      recommendations = recommendations.filter(rec => rec.priority === priority);
    }

    // Limit results
    recommendations = recommendations.slice(0, limit);

    // Store recommendations for tracking
    for (const rec of recommendations) {
      await db.query(`
        INSERT INTO analytics_recommendations (
          id, type, priority, title, description, expected_impact,
          confidence, timeframe, category, target_entity, metrics,
          actions, organization_id, created_at, expires_at
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
        ON CONFLICT (id) DO UPDATE SET updated_at = NOW()
      `, [
        rec.id, rec.type, rec.priority, rec.title, rec.description,
        rec.expectedImpact, rec.confidence, rec.timeframe, rec.category,
        JSON.stringify(rec.targetEntity), JSON.stringify(rec.metrics),
        JSON.stringify(rec.actions), organizationId, rec.createdAt, rec.expiresAt
      ]);
    }

    const processingTime = Date.now() - startTime;

    return NextResponse.json({
      success: true,
      data: {
        recommendations,
        summary: {
          total: recommendations.length,
          critical: recommendations.filter(r => r.priority === 'critical').length,
          high: recommendations.filter(r => r.priority === 'high').length,
          medium: recommendations.filter(r => r.priority === 'medium').length,
          low: recommendations.filter(r => r.priority === 'low').length,
          categories: {
            procurement: recommendations.filter(r => r.category === 'procurement').length,
            inventory: recommendations.filter(r => r.category === 'operational').length,
            financial: recommendations.filter(r => r.category === 'financial').length,
            strategic: recommendations.filter(r => r.category === 'strategic').length
          }
        }
      },
      metadata: {
        organizationId,
        type,
        priority,
        limit,
        processingTime,
        timestamp: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('Recommendations error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to generate recommendations',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

// POST /api/analytics/recommendations - Update recommendation status
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { recommendationId, action, userId, notes } = body;

    if (!recommendationId || !action) {
      return NextResponse.json(
        { success: false, error: 'Missing recommendationId or action' },
        { status: 400 }
      );
    }

    let updateQuery = '';
    const updateParams: any[] = [recommendationId];

    switch (action) {
      case 'accept':
        updateQuery = `
          UPDATE analytics_recommendations
          SET status = 'accepted', accepted_by = $2, accepted_at = NOW(), notes = $3
          WHERE id = $1
        `;
        updateParams.push(userId, notes);
        break;
      case 'reject':
        updateQuery = `
          UPDATE analytics_recommendations
          SET status = 'rejected', rejected_by = $2, rejected_at = NOW(), notes = $3
          WHERE id = $1
        `;
        updateParams.push(userId, notes);
        break;
      case 'implement':
        updateQuery = `
          UPDATE analytics_recommendations
          SET status = 'implemented', implemented_by = $2, implemented_at = NOW(), notes = $3
          WHERE id = $1
        `;
        updateParams.push(userId, notes);
        break;
      default:
        return NextResponse.json(
          { success: false, error: 'Invalid action' },
          { status: 400 }
        );
    }

    const result = await db.query(updateQuery, updateParams);

    return NextResponse.json({
      success: true,
      message: `Recommendation ${action}ed successfully`,
      data: { recommendationId, action, userId, affected: result.rowCount }
    });

  } catch (error) {
    console.error('Recommendation update error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to update recommendation',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}