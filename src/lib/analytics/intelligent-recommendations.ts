// Intelligent Recommendation Engine with Multi-Criteria Optimization
// Implements advanced recommendation algorithms for procurement, inventory, and supplier decisions

import { Pool } from 'pg';

// Types for Intelligent Recommendations
export interface MultiCriteriaWeights {
  cost: number;
  quality: number;
  delivery: number;
  sustainability: number;
  risk: number;
  innovation: number;
}

export interface RecommendationCriteria {
  weights: MultiCriteriaWeights;
  constraints: {
    maxBudget?: number;
    maxRisk?: number;
    minQuality?: number;
    deliveryTime?: number;
    sustainabilityRequired?: boolean;
  };
  preferences: {
    preferredSuppliers?: string[];
    avoidSuppliers?: string[];
    preferredCategories?: string[];
    mustHaveAttributes?: string[];
  };
}

export interface IntelligentRecommendation {
  id: string;
  type: 'supplier_selection' | 'inventory_optimization' | 'procurement_strategy' | 'cost_reduction' | 'risk_mitigation';
  priority: 'critical' | 'high' | 'medium' | 'low';
  title: string;
  description: string;
  rationale: string[];

  recommendation: {
    action: string;
    targets: Array<{
      id: string;
      type: 'supplier' | 'item' | 'category' | 'contract';
      name: string;
      currentScore: number;
      recommendedScore: number;
    }>;
    alternatives: Array<{
      option: string;
      score: number;
      tradeoffs: string[];
    }>;
  };

  impact: {
    financial: {
      costSavings: number;
      revenueIncrease: number;
      roi: number;
    };
    operational: {
      efficiencyGain: number;
      riskReduction: number;
      qualityImprovement: number;
    };
    strategic: {
      competitiveAdvantage: string;
      futureValue: number;
      alignment: number; // 0-1 with business goals
    };
  };

  implementation: {
    timeline: string;
    complexity: 'low' | 'medium' | 'high';
    resources: string[];
    steps: Array<{
      step: number;
      action: string;
      owner: string;
      duration: string;
      dependencies: string[];
    }>;
    risks: Array<{
      risk: string;
      probability: number;
      impact: number;
      mitigation: string;
    }>;
  };

  confidence: number;
  validUntil: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface OptimizationResult {
  objective: 'minimize_cost' | 'maximize_quality' | 'minimize_risk' | 'optimize_balance';
  solution: {
    selectedOptions: Array<{
      id: string;
      type: string;
      weight: number;
      score: number;
    }>;
    totalScore: number;
    constraintsSatisfied: boolean;
    tradeoffs: Record<string, number>;
  };
  alternatives: Array<{
    rank: number;
    score: number;
    description: string;
    keyDifferences: string[];
  }>;
  sensitivity: {
    criticalFactors: string[];
    robustness: number;
    recommendations: string[];
  };
}

// Multi-Criteria Decision Analysis Engine
export class MultiCriteriaDecisionEngine {
  private db: Pool;

  constructor(database: Pool) {
    this.db = database;
  }

  async evaluateSuppliers(
    criteria: RecommendationCriteria,
    candidates: string[]
  ): Promise<OptimizationResult> {
    try {
      // Get supplier data
      const suppliersData = await this.getSupplierData(candidates);

      // Calculate scores for each criterion
      const evaluatedSuppliers = await Promise.all(
        suppliersData.map(supplier => this.evaluateSupplier(supplier, criteria))
      );

      // Apply multi-criteria optimization
      const optimization = this.performTOPSISAnalysis(evaluatedSuppliers, criteria.weights);

      return {
        objective: 'optimize_balance',
        solution: {
          selectedOptions: optimization.ranking.slice(0, 3).map((item, index) => ({
            id: item.supplierId,
            type: 'supplier',
            weight: 1 / (index + 1),
            score: item.score
          })),
          totalScore: optimization.ranking[0]?.score || 0,
          constraintsSatisfied: this.checkConstraints(optimization.ranking[0], criteria.constraints),
          tradeoffs: this.calculateTradeoffs(optimization.ranking[0], criteria.weights)
        },
        alternatives: optimization.ranking.slice(1, 4).map((item, index) => ({
          rank: index + 2,
          score: item.score,
          description: `Alternative supplier with different strength profile`,
          keyDifferences: this.identifyKeyDifferences(optimization.ranking[0], item)
        })),
        sensitivity: {
          criticalFactors: this.identifyCriticalFactors(optimization, criteria.weights),
          robustness: this.calculateRobustness(optimization),
          recommendations: this.generateSensitivityRecommendations(optimization)
        }
      };

    } catch (error) {
      console.error('Supplier evaluation error:', error);
      throw new Error('Failed to evaluate suppliers');
    }
  }

  private async getSupplierData(supplierIds: string[]): Promise<any[]> {
    const query = `
      SELECT
        s.*,
        sp.overall_rating,
        sp.on_time_delivery_rate,
        sp.quality_acceptance_rate,
        sp.response_time_hours,
        sp.cost_competitiveness,
        COALESCE(sustainability.score, 50) as sustainability_score,
        COALESCE(innovation.score, 50) as innovation_score,
        COALESCE(financial.risk_score, 50) as financial_risk
      FROM suppliers s
      LEFT JOIN supplier_performance sp ON s.id = sp.supplier_id
      LEFT JOIN supplier_sustainability sustainability ON s.id = sustainability.supplier_id
      LEFT JOIN supplier_innovation innovation ON s.id = innovation.supplier_id
      LEFT JOIN supplier_financial_risk financial ON s.id = financial.supplier_id
      WHERE s.id = ANY($1)
    `;

    const result = await this.db.query(query, [supplierIds]);
    return result.rows;
  }

  private async evaluateSupplier(supplier: any, criteria: RecommendationCriteria): Promise<any> {
    // Normalize scores to 0-1 scale
    const scores = {
      cost: this.normalizeCostScore(supplier.cost_competitiveness || 50),
      quality: this.normalizeQualityScore(supplier.quality_acceptance_rate || 80),
      delivery: this.normalizeDeliveryScore(supplier.on_time_delivery_rate || 80),
      sustainability: this.normalizeSustainabilityScore(supplier.sustainability_score || 50),
      risk: this.normalizeRiskScore(100 - (supplier.financial_risk || 50)),
      innovation: this.normalizeInnovationScore(supplier.innovation_score || 50)
    };

    return {
      supplierId: supplier.id,
      name: supplier.name,
      scores,
      rawData: supplier
    };
  }

  // TOPSIS (Technique for Order Preference by Similarity to Ideal Solution) Analysis
  private performTOPSISAnalysis(suppliers: any[], weights: MultiCriteriaWeights): any {
    const criteria = Object.keys(weights);

    // Step 1: Create decision matrix
    const decisionMatrix = suppliers.map(supplier =>
      criteria.map(criterion => supplier.scores[criterion])
    );

    // Step 2: Normalize decision matrix
    const normalizedMatrix = this.normalizeDecisionMatrix(decisionMatrix);

    // Step 3: Apply weights
    const weightedMatrix = normalizedMatrix.map(row =>
      row.map((value, index) => value * weights[criteria[index] as keyof MultiCriteriaWeights])
    );

    // Step 4: Determine ideal and negative-ideal solutions
    const idealSolution = criteria.map((_, index) =>
      Math.max(...weightedMatrix.map(row => row[index]))
    );

    const negativeIdealSolution = criteria.map((_, index) =>
      Math.min(...weightedMatrix.map(row => row[index]))
    );

    // Step 5: Calculate distances and closeness coefficients
    const ranking = suppliers.map((supplier, supplierIndex) => {
      const distanceToIdeal = Math.sqrt(
        weightedMatrix[supplierIndex].reduce((sum, value, index) =>
          sum + Math.pow(value - idealSolution[index], 2), 0
        )
      );

      const distanceToNegativeIdeal = Math.sqrt(
        weightedMatrix[supplierIndex].reduce((sum, value, index) =>
          sum + Math.pow(value - negativeIdealSolution[index], 2), 0
        )
      );

      const closenessCoefficient = distanceToNegativeIdeal / (distanceToIdeal + distanceToNegativeIdeal);

      return {
        supplierId: supplier.supplierId,
        name: supplier.name,
        score: closenessCoefficient,
        scores: supplier.scores,
        distanceToIdeal,
        distanceToNegativeIdeal
      };
    }).sort((a, b) => b.score - a.score);

    return { ranking, idealSolution, negativeIdealSolution };
  }

  private normalizeDecisionMatrix(matrix: number[][]): number[][] {
    const columnSums = matrix[0].map((_, colIndex) =>
      Math.sqrt(matrix.reduce((sum, row) => sum + Math.pow(row[colIndex], 2), 0))
    );

    return matrix.map(row =>
      row.map((value, colIndex) => value / columnSums[colIndex])
    );
  }

  // Normalization functions for different criteria
  private normalizeCostScore(cost: number): number {
    // Lower cost is better, so invert the score
    return Math.max(0, Math.min(1, (100 - cost) / 100));
  }

  private normalizeQualityScore(quality: number): number {
    return Math.max(0, Math.min(1, quality / 100));
  }

  private normalizeDeliveryScore(delivery: number): number {
    return Math.max(0, Math.min(1, delivery / 100));
  }

  private normalizeSustainabilityScore(sustainability: number): number {
    return Math.max(0, Math.min(1, sustainability / 100));
  }

  private normalizeRiskScore(riskInverse: number): number {
    return Math.max(0, Math.min(1, riskInverse / 100));
  }

  private normalizeInnovationScore(innovation: number): number {
    return Math.max(0, Math.min(1, innovation / 100));
  }

  private checkConstraints(bestOption: any, constraints: any): boolean {
    if (!bestOption) return false;

    // Check various constraints
    if (constraints.minQuality && bestOption.scores.quality < constraints.minQuality) {
      return false;
    }

    if (constraints.maxRisk && (1 - bestOption.scores.risk) > constraints.maxRisk) {
      return false;
    }

    return true;
  }

  private calculateTradeoffs(option: any, weights: MultiCriteriaWeights): Record<string, number> {
    const tradeoffs: Record<string, number> = {};

    Object.keys(weights).forEach(criterion => {
      const score = option.scores[criterion];
      const weight = weights[criterion as keyof MultiCriteriaWeights];
      tradeoffs[criterion] = score * weight;
    });

    return tradeoffs;
  }

  private identifyKeyDifferences(best: any, alternative: any): string[] {
    const differences: string[] = [];

    Object.keys(best.scores).forEach(criterion => {
      const diff = Math.abs(best.scores[criterion] - alternative.scores[criterion]);
      if (diff > 0.1) {
        const better = best.scores[criterion] > alternative.scores[criterion] ? 'better' : 'worse';
        differences.push(`${criterion}: ${(diff * 100).toFixed(1)}% ${better}`);
      }
    });

    return differences;
  }

  private identifyCriticalFactors(optimization: any, weights: MultiCriteriaWeights): string[] {
    // Identify factors with high weights or high variance in scores
    return Object.entries(weights)
      .filter(([_, weight]) => weight > 0.15)
      .map(([criterion, _]) => criterion);
  }

  private calculateRobustness(optimization: any): number {
    if (optimization.ranking.length < 2) return 1;

    const topScore = optimization.ranking[0].score;
    const secondScore = optimization.ranking[1].score;

    // Robustness is higher when the top choice clearly dominates
    return Math.min(1, (topScore - secondScore) / topScore);
  }

  private generateSensitivityRecommendations(optimization: any): string[] {
    const recommendations: string[] = [];

    if (optimization.ranking.length > 1) {
      const scoreDiff = optimization.ranking[0].score - optimization.ranking[1].score;
      if (scoreDiff < 0.1) {
        recommendations.push('Consider evaluating additional criteria to differentiate top candidates');
      }
    }

    recommendations.push('Monitor supplier performance regularly to validate decision');
    recommendations.push('Consider pilot programs before full commitment');

    return recommendations;
  }
}

// Intelligent Recommendation Generator
export class IntelligentRecommendationEngine {
  private db: Pool;
  private decisionEngine: MultiCriteriaDecisionEngine;

  constructor(database: Pool) {
    this.db = database;
    this.decisionEngine = new MultiCriteriaDecisionEngine(database);
  }

  async generateRecommendations(
    organizationId: string,
    context: {
      focus?: 'cost_optimization' | 'risk_reduction' | 'quality_improvement' | 'sustainability';
      urgency?: 'immediate' | 'short_term' | 'long_term';
      scope?: 'supplier' | 'inventory' | 'procurement' | 'all';
    } = {}
  ): Promise<IntelligentRecommendation[]> {
    try {
      const recommendations: IntelligentRecommendation[] = [];

      // Generate different types of recommendations based on scope
      if (context.scope === 'supplier' || context.scope === 'all') {
        const supplierRecs = await this.generateSupplierRecommendations(organizationId, context);
        recommendations.push(...supplierRecs);
      }

      if (context.scope === 'inventory' || context.scope === 'all') {
        const inventoryRecs = await this.generateInventoryRecommendations(organizationId, context);
        recommendations.push(...inventoryRecs);
      }

      if (context.scope === 'procurement' || context.scope === 'all') {
        const procurementRecs = await this.generateProcurementRecommendations(organizationId, context);
        recommendations.push(...procurementRecs);
      }

      // Sort by priority and confidence
      return recommendations
        .sort((a, b) => {
          const priorityWeight = { critical: 4, high: 3, medium: 2, low: 1 };
          const aScore = priorityWeight[a.priority] * a.confidence;
          const bScore = priorityWeight[b.priority] * b.confidence;
          return bScore - aScore;
        })
        .slice(0, 20); // Limit to top 20 recommendations

    } catch (error) {
      console.error('Recommendation generation error:', error);
      throw new Error('Failed to generate recommendations');
    }
  }

  private async generateSupplierRecommendations(
    organizationId: string,
    context: any
  ): Promise<IntelligentRecommendation[]> {
    const recommendations: IntelligentRecommendation[] = [];

    // Get underperforming suppliers
    const underperformingQuery = `
      SELECT s.*, sp.overall_rating, sp.on_time_delivery_rate, sp.quality_acceptance_rate
      FROM suppliers s
      LEFT JOIN supplier_performance sp ON s.id = sp.supplier_id
      WHERE s.organization_id = $1
      AND s.status = 'active'
      AND (sp.overall_rating < 70 OR sp.on_time_delivery_rate < 85 OR sp.quality_acceptance_rate < 90)
      ORDER BY sp.overall_rating ASC
      LIMIT 10
    `;

    const underperformingResult = await this.db.query(underperformingQuery, [organizationId]);

    for (const supplier of underperformingResult.rows) {
      const recommendation: IntelligentRecommendation = {
        id: `supplier_improve_${supplier.id}_${Date.now()}`,
        type: 'supplier_selection',
        priority: supplier.overall_rating < 50 ? 'critical' : 'high',
        title: `Address performance issues with ${supplier.name}`,
        description: `Supplier showing concerning performance metrics that require immediate attention`,
        rationale: [
          `Overall rating: ${supplier.overall_rating || 'N/A'}/100`,
          `On-time delivery: ${supplier.on_time_delivery_rate || 'N/A'}%`,
          `Quality acceptance: ${supplier.quality_acceptance_rate || 'N/A'}%`
        ],

        recommendation: {
          action: 'Implement supplier improvement program or find alternatives',
          targets: [{
            id: supplier.id,
            type: 'supplier',
            name: supplier.name,
            currentScore: supplier.overall_rating || 0,
            recommendedScore: 85
          }],
          alternatives: [
            {
              option: 'Supplier development program',
              score: 0.7,
              tradeoffs: ['Time investment required', 'Potential for improvement']
            },
            {
              option: 'Find alternative suppliers',
              score: 0.8,
              tradeoffs: ['Switching costs', 'Reduced risk']
            }
          ]
        },

        impact: {
          financial: {
            costSavings: this.estimateCostSavings(supplier),
            revenueIncrease: 0,
            roi: 2.5
          },
          operational: {
            efficiencyGain: 0.15,
            riskReduction: 0.3,
            qualityImprovement: 0.2
          },
          strategic: {
            competitiveAdvantage: 'Improved supply chain reliability',
            futureValue: 0.8,
            alignment: 0.9
          }
        },

        implementation: {
          timeline: '3-6 months',
          complexity: 'medium',
          resources: ['Procurement manager', 'Quality team', 'Legal review'],
          steps: [
            {
              step: 1,
              action: 'Conduct detailed supplier audit',
              owner: 'procurement_manager',
              duration: '2 weeks',
              dependencies: []
            },
            {
              step: 2,
              action: 'Develop improvement plan or source alternatives',
              owner: 'procurement_team',
              duration: '4 weeks',
              dependencies: ['Step 1']
            },
            {
              step: 3,
              action: 'Implement changes and monitor progress',
              owner: 'procurement_manager',
              duration: '12 weeks',
              dependencies: ['Step 2']
            }
          ],
          risks: [
            {
              risk: 'Supplier may not improve',
              probability: 0.3,
              impact: 0.7,
              mitigation: 'Have backup suppliers ready'
            }
          ]
        },

        confidence: 0.85,
        validUntil: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
        createdAt: new Date(),
        updatedAt: new Date()
      };

      recommendations.push(recommendation);
    }

    return recommendations;
  }

  private async generateInventoryRecommendations(
    organizationId: string,
    context: any
  ): Promise<IntelligentRecommendation[]> {
    const recommendations: IntelligentRecommendation[] = [];

    // Find items with suboptimal inventory levels
    const inventoryQuery = `
      SELECT
        ii.*,
        COALESCE(movement_stats.outbound_30d, 0) as demand_30d,
        COALESCE(movement_stats.avg_daily_demand, 0) as avg_daily_demand
      FROM inventory_items ii
      LEFT JOIN (
        SELECT
          item_id,
          SUM(CASE WHEN type = 'outbound' THEN quantity ELSE 0 END) as outbound_30d,
          AVG(CASE WHEN type = 'outbound' THEN quantity ELSE 0 END) as avg_daily_demand
        FROM stock_movements
        WHERE timestamp >= NOW() - INTERVAL '30 days'
        GROUP BY item_id
      ) movement_stats ON ii.id = movement_stats.item_id
      WHERE ii.organization_id = $1
      AND (
        ii.current_stock <= ii.reorder_point OR
        ii.current_stock > ii.max_stock * 1.5 OR
        ii.current_stock = 0
      )
      ORDER BY
        CASE
          WHEN ii.current_stock = 0 THEN 1
          WHEN ii.current_stock <= ii.reorder_point THEN 2
          ELSE 3
        END,
        movement_stats.outbound_30d DESC
      LIMIT 15
    `;

    const inventoryResult = await this.db.query(inventoryQuery, [organizationId]);

    for (const item of inventoryResult.rows) {
      let recommendationType: 'critical' | 'high' | 'medium' | 'low' = 'medium';
      let action = '';
      let description = '';

      if (item.current_stock === 0) {
        recommendationType = 'critical';
        action = 'Emergency reorder required';
        description = 'Item is completely out of stock';
      } else if (item.current_stock <= item.reorder_point) {
        recommendationType = 'high';
        action = 'Reorder immediately';
        description = 'Stock level has reached reorder point';
      } else if (item.current_stock > item.max_stock * 1.5) {
        recommendationType = 'medium';
        action = 'Reduce stock levels';
        description = 'Excess inventory is tying up capital';
      }

      const recommendation: IntelligentRecommendation = {
        id: `inventory_${item.id}_${Date.now()}`,
        type: 'inventory_optimization',
        priority: recommendationType,
        title: `Optimize inventory for ${item.name}`,
        description,
        rationale: [
          `Current stock: ${item.current_stock} units`,
          `Reorder point: ${item.reorder_point} units`,
          `30-day demand: ${item.demand_30d || 0} units`,
          `Daily demand: ${(item.avg_daily_demand || 0).toFixed(1)} units`
        ],

        recommendation: {
          action,
          targets: [{
            id: item.id,
            type: 'item',
            name: item.name,
            currentScore: this.calculateInventoryScore(item),
            recommendedScore: 85
          }],
          alternatives: this.generateInventoryAlternatives(item)
        },

        impact: this.calculateInventoryImpact(item),

        implementation: {
          timeline: item.current_stock === 0 ? '1-3 days' : '1-2 weeks',
          complexity: 'low',
          resources: ['Purchasing agent', 'Inventory manager'],
          steps: this.generateInventorySteps(item),
          risks: [
            {
              risk: 'Supplier lead time delays',
              probability: 0.2,
              impact: 0.6,
              mitigation: 'Use expedited shipping if necessary'
            }
          ]
        },

        confidence: 0.9,
        validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        createdAt: new Date(),
        updatedAt: new Date()
      };

      recommendations.push(recommendation);
    }

    return recommendations;
  }

  private async generateProcurementRecommendations(
    organizationId: string,
    context: any
  ): Promise<IntelligentRecommendation[]> {
    const recommendations: IntelligentRecommendation[] = [];

    // Analyze procurement patterns for optimization opportunities
    const procurementQuery = `
      SELECT
        ii.category,
        COUNT(DISTINCT s.id) as supplier_count,
        AVG(spl.unit_price) as avg_price,
        SUM(po.total_amount) as total_spend,
        COUNT(po.id) as order_count
      FROM inventory_items ii
      JOIN supplier_price_lists spl ON ii.sku = spl.sku
      JOIN suppliers s ON spl.supplier_id = s.id
      LEFT JOIN purchase_orders po ON s.id = po.supplier_id
      WHERE ii.organization_id = $1
      AND po.order_date >= NOW() - INTERVAL '6 months'
      GROUP BY ii.category
      HAVING COUNT(DISTINCT s.id) > 3 AND SUM(po.total_amount) > 50000
      ORDER BY SUM(po.total_amount) DESC
      LIMIT 10
    `;

    const procurementResult = await this.db.query(procurementQuery, [organizationId]);

    for (const category of procurementResult.rows) {
      if (category.supplier_count > 5) {
        // Supplier consolidation opportunity
        const recommendation: IntelligentRecommendation = {
          id: `procurement_consolidate_${category.category}_${Date.now()}`,
          type: 'procurement_strategy',
          priority: 'medium',
          title: `Consolidate suppliers in ${category.category} category`,
          description: 'Multiple suppliers in category present consolidation opportunity',
          rationale: [
            `${category.supplier_count} suppliers in category`,
            `Total spend: $${parseFloat(category.total_spend).toLocaleString()}`,
            `${category.order_count} orders in last 6 months`
          ],

          recommendation: {
            action: 'Consolidate to 2-3 preferred suppliers',
            targets: [{
              id: category.category,
              type: 'category',
              name: category.category,
              currentScore: 50,
              recommendedScore: 80
            }],
            alternatives: [
              {
                option: 'Negotiate volume discounts with top 2 suppliers',
                score: 0.8,
                tradeoffs: ['Higher dependency risk', 'Significant cost savings']
              },
              {
                option: 'Strategic partnership with 1 primary supplier',
                score: 0.9,
                tradeoffs: ['Innovation benefits', 'Single point of failure']
              }
            ]
          },

          impact: {
            financial: {
              costSavings: parseFloat(category.total_spend) * 0.08, // 8% savings
              revenueIncrease: 0,
              roi: 4.2
            },
            operational: {
              efficiencyGain: 0.25,
              riskReduction: -0.1, // Slight increase in risk
              qualityImprovement: 0.1
            },
            strategic: {
              competitiveAdvantage: 'Stronger supplier relationships',
              futureValue: 0.7,
              alignment: 0.8
            }
          },

          implementation: {
            timeline: '4-6 months',
            complexity: 'high',
            resources: ['Procurement director', 'Category managers', 'Legal team'],
            steps: [
              {
                step: 1,
                action: 'Analyze supplier performance and spend',
                owner: 'procurement_analyst',
                duration: '3 weeks',
                dependencies: []
              },
              {
                step: 2,
                action: 'Negotiate with preferred suppliers',
                owner: 'procurement_manager',
                duration: '6 weeks',
                dependencies: ['Step 1']
              },
              {
                step: 3,
                action: 'Transition orders to consolidated suppliers',
                owner: 'procurement_team',
                duration: '8 weeks',
                dependencies: ['Step 2']
              }
            ],
            risks: [
              {
                risk: 'Supplier capacity constraints',
                probability: 0.3,
                impact: 0.5,
                mitigation: 'Verify capacity before commitment'
              }
            ]
          },

          confidence: 0.75,
          validUntil: new Date(Date.now() + 180 * 24 * 60 * 60 * 1000),
          createdAt: new Date(),
          updatedAt: new Date()
        };

        recommendations.push(recommendation);
      }
    }

    return recommendations;
  }

  // Utility methods
  private estimateCostSavings(supplier: any): number {
    const baseline = 100000; // Baseline annual spend
    const improvementPotential = (85 - (supplier.overall_rating || 50)) / 100;
    return baseline * improvementPotential * 0.1; // 10% of potential improvement
  }

  private calculateInventoryScore(item: any): number {
    if (item.current_stock === 0) return 0;
    if (item.current_stock <= item.reorder_point) return 30;
    if (item.current_stock > item.max_stock * 1.5) return 40;
    return 70; // Acceptable range
  }

  private generateInventoryAlternatives(item: any): any[] {
    const alternatives = [];

    if (item.current_stock <= item.reorder_point) {
      alternatives.push({
        option: 'Standard reorder',
        score: 0.8,
        tradeoffs: ['Normal lead time', 'Standard pricing']
      });
      alternatives.push({
        option: 'Expedited reorder',
        score: 0.9,
        tradeoffs: ['Higher cost', 'Faster delivery']
      });
    } else {
      alternatives.push({
        option: 'Promotional pricing',
        score: 0.7,
        tradeoffs: ['Reduced margin', 'Faster inventory turnover']
      });
      alternatives.push({
        option: 'Suspend reorders temporarily',
        score: 0.8,
        tradeoffs: ['Risk of stockout', 'Improved cash flow']
      });
    }

    return alternatives;
  }

  private calculateInventoryImpact(item: any): any {
    const stockValue = item.current_stock * item.unit_cost;
    const dailyDemandValue = (item.avg_daily_demand || 1) * item.unit_cost;

    return {
      financial: {
        costSavings: item.current_stock === 0 ? 0 : stockValue * 0.05,
        revenueIncrease: item.current_stock === 0 ? dailyDemandValue * 7 : 0,
        roi: 2.0
      },
      operational: {
        efficiencyGain: 0.1,
        riskReduction: item.current_stock === 0 ? 0.8 : 0.2,
        qualityImprovement: 0
      },
      strategic: {
        competitiveAdvantage: 'Improved service levels',
        futureValue: 0.6,
        alignment: 0.9
      }
    };
  }

  private generateInventorySteps(item: any): any[] {
    const baseSteps = [
      {
        step: 1,
        action: 'Review current inventory levels and demand forecast',
        owner: 'inventory_manager',
        duration: '1 day',
        dependencies: []
      }
    ];

    if (item.current_stock <= item.reorder_point) {
      baseSteps.push({
        step: 2,
        action: 'Create and approve purchase order',
        owner: 'purchasing_agent',
        duration: '1-2 days',
        dependencies: ['Step 1']
      });
      baseSteps.push({
        step: 3,
        action: 'Monitor delivery and update inventory',
        owner: 'warehouse_manager',
        duration: '3-7 days',
        dependencies: ['Step 2']
      });
    } else {
      baseSteps.push({
        step: 2,
        action: 'Implement inventory reduction strategy',
        owner: 'inventory_manager',
        duration: '2-4 weeks',
        dependencies: ['Step 1']
      });
    }

    return baseSteps;
  }

  async getRecommendationById(recommendationId: string): Promise<IntelligentRecommendation | null> {
    try {
      const result = await this.db.query(`
        SELECT * FROM intelligent_recommendations
        WHERE id = $1
      `, [recommendationId]);

      if (result.rows.length === 0) return null;

      const row = result.rows[0];
      return {
        id: row.id,
        type: row.type,
        priority: row.priority,
        title: row.title,
        description: row.description,
        rationale: JSON.parse(row.rationale),
        recommendation: JSON.parse(row.recommendation),
        impact: JSON.parse(row.impact),
        implementation: JSON.parse(row.implementation),
        confidence: parseFloat(row.confidence),
        validUntil: new Date(row.valid_until),
        createdAt: new Date(row.created_at),
        updatedAt: new Date(row.updated_at)
      };

    } catch (error) {
      console.error('Error fetching recommendation:', error);
      return null;
    }
  }

  async updateRecommendationStatus(
    recommendationId: string,
    status: 'accepted' | 'rejected' | 'implemented' | 'expired',
    userId: string,
    notes?: string
  ): Promise<boolean> {
    try {
      await this.db.query(`
        UPDATE intelligent_recommendations
        SET status = $1, updated_by = $2, updated_at = NOW(), notes = $3
        WHERE id = $4
      `, [status, userId, notes, recommendationId]);

      return true;
    } catch (error) {
      console.error('Error updating recommendation status:', error);
      return false;
    }
  }
}

// Export intelligent recommendation engine
export const intelligentRecommendations = {
  engine: (db: Pool) => new IntelligentRecommendationEngine(db),
  decisionEngine: (db: Pool) => new MultiCriteriaDecisionEngine(db)
};