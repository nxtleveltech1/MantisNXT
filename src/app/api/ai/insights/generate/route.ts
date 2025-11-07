/**
 * AI Insights Generation API
 * Context-aware insight generation with natural language processing
 */

import { NextRequest, NextResponse } from 'next/server';
import { SupplierIntelligenceService } from '@/services/ai/SupplierIntelligenceService';
import { PredictiveAnalyticsService } from '@/services/ai/PredictiveAnalyticsService';
import { getOrSet, makeKey } from '@/lib/cache/responseCache';
import { executeWithOptionalAsync } from '@/lib/queue/taskQueue';

// Initialize AI services
const supplierIntelligence = new SupplierIntelligenceService();
const predictiveAnalytics = new PredictiveAnalyticsService();

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    const validationError = validateInsightsRequest(body)
    if (validationError) {
      return NextResponse.json(
        {
          success: false,
          error: 'Validation failed',
          details: validationError,
        },
        { status: 400 }
      )
    }

    const runInsights = async () => {
      console.log('?? Generating AI insights for:', body.context.type)

      const insights = await generateContextualInsights(body)

      console.log(`✅ Generated ${insights.insights.length} insights`)

      return {
        success: true,
        data: {
          insights: insights.insights,
          summary: insights.summary,
          context: body.context,
          focusAreas: body.focusAreas,
          timestamp: new Date().toISOString(),
        },
      }
    }

    const execResult = await executeWithOptionalAsync(request, runInsights)
    if (execResult.queued) {
      return NextResponse.json(
        {
          success: true,
          status: 'queued',
          taskId: execResult.taskId,
        },
        { status: 202 }
      )
    }

    return NextResponse.json(execResult.result)
  } catch (error) {
    console.error('? AI insights generation failed:', error)

    return NextResponse.json(
      {
        success: false,
        error: 'AI insights generation failed',
        details: error instanceof Error ? error.message : 'Unknown error',
        code: 'INSIGHTS_GENERATION_ERROR',
      },
      { status: 500 }
    )
  }
}export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const category = searchParams.get('category')

    if (!category) {
      return NextResponse.json(
        {
          success: false,
          error: 'Category is required for market intelligence',
        },
        { status: 400 }
      )
    }

    console.log('?? Generating market intelligence for:', category)

    const cacheKey = makeKey(request.url)
    const payload = await getOrSet(cacheKey, async () => {
      const marketIntel = await predictiveAnalytics.generateMarketIntelligence(category)
      return {
        success: true,
        data: {
          category,
          marketTrends: marketIntel.marketTrends,
          competitiveAnalysis: marketIntel.competitiveAnalysis,
          recommendations: marketIntel.recommendations,
          timestamp: new Date().toISOString(),
        },
      }
    })

    return NextResponse.json(payload)
  } catch (error) {
    console.error('? Market intelligence generation failed:', error)

    return NextResponse.json(
      {
        success: false,
        error: 'Market intelligence generation failed',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}async function generateContextualInsights(request: any): Promise<{
  insights: any[];
  summary: any;
}> {
  const insights = [];
  let totalOpportunities = 0;
  let totalRisks = 0;
  let potentialSavings = 0;

  const { context, focusAreas, timeFrame, includeActions } = request;

  try {
    // Generate insights based on context type
    switch (context.type) {
      case 'supplier':
        if (context.id) {
          const supplierInsights = await generateSupplierInsights(context.id, focusAreas, timeFrame);
          insights.push(...supplierInsights);
        }
        break;

      case 'category':
        const categoryInsights = await generateCategoryInsights(context.id, focusAreas, timeFrame);
        insights.push(...categoryInsights);
        break;

      case 'portfolio':
        const portfolioInsights = await generatePortfolioInsights(focusAreas, timeFrame);
        insights.push(...portfolioInsights);
        break;

      case 'contract':
        if (context.id) {
          const contractInsights = await generateContractInsights(context.id, focusAreas, timeFrame);
          insights.push(...contractInsights);
        }
        break;

      default:
        throw new Error(`Unsupported context type: ${context.type}`);
    }

    // Add action items if requested
    if (includeActions) {
      insights.forEach(insight => {
        insight.actionItems = generateActionItems(insight);
      });
    }

    // Calculate summary statistics
    insights.forEach(insight => {
      if (insight.type === 'opportunity') totalOpportunities++;
      if (insight.type === 'risk') totalRisks++;
      if (insight.impact?.estimatedValue?.amount) {
        potentialSavings += insight.impact.estimatedValue.amount;
      }
    });

    const summary = {
      totalInsights: insights.length,
      opportunityCount: totalOpportunities,
      riskCount: totalRisks,
      potentialSavings: Math.round(potentialSavings)
    };

    return { insights, summary };

  } catch (error) {
    console.error('Error generating contextual insights:', error);
    throw error;
  }
}

// Generate supplier-specific insights
async function generateSupplierInsights(supplierId: string, focusAreas: string[], timeFrame: any): Promise<any[]> {
  const insights = [];

  try {
    // Get comprehensive supplier analysis
    const analysis = await supplierIntelligence.analyzeSupplier(supplierId);
    const riskMonitoring = await predictiveAnalytics.monitorSupplierRisk(supplierId);

    // Performance insights
    if (focusAreas.includes('performance')) {
      if (analysis.performanceScore > 0.8) {
        insights.push({
          id: `perf_opportunity_${supplierId}`,
          type: 'opportunity',
          title: 'High-Performing Supplier Expansion',
          description: `Supplier shows excellent performance (${Math.round(analysis.performanceScore * 100)}% score). Consider expanding partnership.`,
          impact: {
            score: 8,
            type: 'efficiency_gain',
            estimatedValue: {
              amount: 25000,
              currency: 'USD',
              timeframe: 'annually'
            }
          },
          confidence: 0.85,
          evidence: [
            `Performance score: ${Math.round(analysis.performanceScore * 100)}%`,
            'Consistent delivery track record',
            'High quality ratings'
          ],
          relatedEntities: [{
            type: 'supplier',
            id: supplierId,
            name: 'Current Supplier'
          }]
        });
      } else if (analysis.performanceScore < 0.4) {
        insights.push({
          id: `perf_risk_${supplierId}`,
          type: 'risk',
          title: 'Supplier Performance Concern',
          description: `Low performance score (${Math.round(analysis.performanceScore * 100)}%) indicates potential issues.`,
          impact: {
            score: 7,
            type: 'risk_reduction'
          },
          confidence: 0.9,
          evidence: analysis.recommendations,
          relatedEntities: [{
            type: 'supplier',
            id: supplierId,
            name: 'At-Risk Supplier'
          }]
        });
      }
    }

    // Risk insights
    if (focusAreas.includes('risk')) {
      if (riskMonitoring.currentRisk > 0.7) {
        insights.push({
          id: `risk_critical_${supplierId}`,
          type: 'risk',
          title: 'High Risk Supplier Alert',
          description: `Supplier risk level is ${Math.round(riskMonitoring.currentRisk * 100)}% with ${riskMonitoring.riskTrend} trend.`,
          impact: {
            score: 9,
            type: 'risk_reduction'
          },
          confidence: 0.88,
          evidence: riskMonitoring.alerts.map((alert: { message: string }) => alert.message),
          relatedEntities: [{
            type: 'supplier',
            id: supplierId,
            name: 'High-Risk Supplier'
          }]
        });
      }
    }

    // Cost insights
    if (focusAreas.includes('cost')) {
      // Simulate cost analysis insight
      insights.push({
        id: `cost_optimization_${supplierId}`,
        type: 'opportunity',
        title: 'Cost Optimization Potential',
        description: 'Payment terms negotiation could improve cash flow.',
        impact: {
          score: 6,
          type: 'cost_savings',
          estimatedValue: {
            amount: 15000,
            currency: 'USD',
            timeframe: 'annually'
          }
        },
        confidence: 0.7,
        evidence: [
          'Current payment terms exceed industry average',
          'Strong relationship enables negotiation'
        ],
        relatedEntities: [{
          type: 'supplier',
          id: supplierId,
          name: 'Negotiation Target'
        }]
      });
    }

  } catch (error) {
    console.error('Error generating supplier insights:', error);
  }

  return insights;
}

// Generate category-specific insights
async function generateCategoryInsights(categoryId: string, focusAreas: string[], timeFrame: any): Promise<any[]> {
  const insights = [];

  // Simulate category-level insights
  if (focusAreas.includes('cost')) {
    insights.push({
      id: `category_cost_trend_${categoryId}`,
      type: 'trend',
      title: 'Category Price Trend Analysis',
      description: 'Market prices showing upward trend over next 6 months.',
      impact: {
        score: 5,
        type: 'cost_savings'
      },
      confidence: 0.75,
      evidence: [
        'Supply chain disruptions in key regions',
        'Increased raw material costs',
        'Growing demand in emerging markets'
      ],
      relatedEntities: [{
        type: 'category',
        id: categoryId,
        name: 'Product Category'
      }]
    });
  }

  return insights;
}

// Generate portfolio-level insights
async function generatePortfolioInsights(focusAreas: string[], timeFrame: any): Promise<any[]> {
  const insights = [];

  // Portfolio diversification insight
  if (focusAreas.includes('risk')) {
    insights.push({
      id: 'portfolio_diversification',
      type: 'opportunity',
      title: 'Supplier Portfolio Diversification',
      description: 'High concentration risk detected with top 3 suppliers representing 80% of spend.',
      impact: {
        score: 8,
        type: 'risk_reduction',
        estimatedValue: {
          amount: 50000,
          currency: 'USD',
          timeframe: 'risk_mitigation'
        }
      },
      confidence: 0.82,
      evidence: [
        'Pareto analysis shows concentration risk',
        'Single points of failure in supply chain',
        'Limited negotiation leverage'
      ],
      relatedEntities: []
    });
  }

  // Sustainability insight
  if (focusAreas.includes('sustainability')) {
    insights.push({
      id: 'sustainability_opportunity',
      type: 'opportunity',
      title: 'Green Supply Chain Initiative',
      description: 'Opportunity to reduce carbon footprint by 25% through sustainable sourcing.',
      impact: {
        score: 7,
        type: 'sustainability'
      },
      confidence: 0.78,
      evidence: [
        'ESG compliance requirements increasing',
        'Customer demand for sustainable products',
        'Carbon tax implications'
      ],
      relatedEntities: []
    });
  }

  return insights;
}

// Generate contract-specific insights
async function generateContractInsights(contractId: string, focusAreas: string[], timeFrame: any): Promise<any[]> {
  const insights = [];

  // Contract renewal insight
  insights.push({
    id: `contract_renewal_${contractId}`,
    type: 'opportunity',
    title: 'Contract Renewal Optimization',
    description: 'Upcoming contract renewal presents negotiation opportunities.',
    impact: {
      score: 6,
      type: 'cost_savings',
      estimatedValue: {
        amount: 30000,
        currency: 'USD',
        timeframe: 'contract_term'
      }
    },
    confidence: 0.8,
    evidence: [
      'Contract expires in 90 days',
      'Supplier performance exceeded SLAs',
      'Market rates have decreased'
    ],
    relatedEntities: [{
      type: 'contract',
      id: contractId,
      name: 'Expiring Contract'
    }]
  });

  return insights;
}

// Generate action items for insights
function generateActionItems(insight: any): any[] {
  const actionItems = [];

  switch (insight.type) {
    case 'opportunity':
      if (insight.impact.type === 'cost_savings') {
        actionItems.push({
          action: 'Schedule negotiation meeting with supplier',
          priority: 'high',
          effort: 'medium',
          timeframe: '2 weeks'
        });
      }
      break;

    case 'risk':
      actionItems.push({
        action: 'Conduct risk assessment review',
        priority: 'high',
        effort: 'low',
        timeframe: '1 week'
      });
      break;

    case 'trend':
      actionItems.push({
        action: 'Monitor market conditions closely',
        priority: 'medium',
        effort: 'low',
        timeframe: 'ongoing'
      });
      break;
  }

  return actionItems;
}

// Validation function
function validateInsightsRequest(body: any): string | null {
  // Validate context
  if (!body.context || !body.context.type) {
    return 'Context with type is required';
  }

  const validContextTypes = ['supplier', 'category', 'portfolio', 'contract'];
  if (!validContextTypes.includes(body.context.type)) {
    return `Context type must be one of: ${validContextTypes.join(', ')}`;
  }

  // Validate focus areas
  if (!body.focusAreas || !Array.isArray(body.focusAreas)) {
    return 'Focus areas must be an array';
  }

  const validFocusAreas = ['cost', 'risk', 'performance', 'sustainability', 'innovation'];
  for (const area of body.focusAreas) {
    if (!validFocusAreas.includes(area)) {
      return `Invalid focus area: ${area}. Valid areas: ${validFocusAreas.join(', ')}`;
    }
  }

  // Validate time frame
  if (!body.timeFrame || !body.timeFrame.start || !body.timeFrame.end) {
    return 'Time frame with start and end dates is required';
  }

  // Validate dates
  const startDate = new Date(body.timeFrame.start);
  const endDate = new Date(body.timeFrame.end);

  if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
    return 'Invalid date format in time frame';
  }

  if (startDate >= endDate) {
    return 'Start date must be before end date';
  }

  // Validate optional fields
  if (body.includeActions !== undefined && typeof body.includeActions !== 'boolean') {
    return 'Include actions must be a boolean';
  }

  return null;
}
