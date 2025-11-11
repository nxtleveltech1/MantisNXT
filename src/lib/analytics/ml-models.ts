// @ts-nocheck
// Machine Learning Models for MantisNXT Analytics
import type { SupplierPerformance, InventoryItem, StockMovement } from '@/types';

// Types for ML Analytics
export interface MLPrediction {
  prediction: number;
  confidence: number;
  factors: Record<string, number>;
  timestamp: Date;
}

export interface SupplierRiskScore {
  supplierId: string;
  riskScore: number; // 0-100, higher = riskier
  riskFactors: {
    deliveryReliability: number;
    qualityIssues: number;
    financialStability: number;
    communicationResponse: number;
    priceVolatility: number;
  };
  recommendation: 'maintain' | 'monitor' | 'review' | 'replace';
  confidence: number;
}

export interface DemandForecast {
  itemId: string;
  sku: string;
  predictions: {
    next7Days: number;
    next30Days: number;
    next90Days: number;
  };
  seasonality: {
    weeklyPattern: number[];
    monthlyPattern: number[];
    yearlyTrend: number;
  };
  confidence: number;
  lastUpdated: Date;
}

export interface PriceOptimization {
  itemId: string;
  currentPrice: number;
  optimizedPrice: number;
  expectedProfitIncrease: number;
  demandSensitivity: number;
  competitivePosition: 'low' | 'competitive' | 'premium';
  recommendation: string;
}

export interface InventoryOptimization {
  itemId: string;
  currentStock: number;
  optimalStock: number;
  reorderPoint: number;
  orderQuantity: number;
  carryingCost: number;
  stockoutRisk: number;
  recommendation: 'increase' | 'decrease' | 'maintain';
}

// Supplier Performance Prediction Model
export class SupplierPerformancePredictor {
  private weights = {
    deliveryHistory: 0.3,
    qualityMetrics: 0.25,
    responseTime: 0.15,
    priceStability: 0.15,
    financialHealth: 0.15
  };

  predictPerformance(
    supplierId: string,
    historicalData: SupplierPerformance[],
    recentMetrics: unknown
  ): MLPrediction {
    const features = this.extractFeatures(historicalData, recentMetrics);
    const score = this.calculatePerformanceScore(features);

    return {
      prediction: score,
      confidence: this.calculateConfidence(historicalData.length, features),
      factors: features,
      timestamp: new Date()
    };
  }

  private extractFeatures(history: SupplierPerformance[], recent: unknown) {
    const avgDeliveryRate = history.reduce((sum, p) => sum + p.metrics.onTimeDeliveryRate, 0) / history.length;
    const avgQualityRate = history.reduce((sum, p) => sum + p.metrics.qualityAcceptanceRate, 0) / history.length;
    const avgResponseTime = history.reduce((sum, p) => sum + p.metrics.responseTime, 0) / history.length;

    // Trend analysis
    const deliveryTrend = this.calculateTrend(history.map(h => h.metrics.onTimeDeliveryRate));
    const qualityTrend = this.calculateTrend(history.map(h => h.metrics.qualityAcceptanceRate));

    return {
      avgDeliveryRate: avgDeliveryRate / 100,
      avgQualityRate: avgQualityRate / 100,
      responseTimeScore: Math.max(0, 1 - (avgResponseTime / 48)), // Normalize to 48hr baseline
      deliveryTrend,
      qualityTrend,
      consistencyScore: this.calculateConsistency(history),
      recentPerformance: recent?.overallRating || 0.5
    };
  }

  private calculatePerformanceScore(features: Record<string, number>): number {
    return Math.min(1, Math.max(0,
      features.avgDeliveryRate * this.weights.deliveryHistory +
      features.avgQualityRate * this.weights.qualityMetrics +
      features.responseTimeScore * this.weights.responseTime +
      features.deliveryTrend * 0.1 +
      features.qualityTrend * 0.1 +
      features.consistencyScore * 0.15
    ));
  }

  private calculateTrend(values: number[]): number {
    if (values.length < 2) return 0;

    const n = values.length;
    const sumX = (n * (n - 1)) / 2;
    const sumY = values.reduce((sum, val) => sum + val, 0);
    const sumXY = values.reduce((sum, val, idx) => sum + (idx * val), 0);
    const sumX2 = (n * (n - 1) * (2 * n - 1)) / 6;

    const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
    return Math.max(-1, Math.min(1, slope / 10)); // Normalize slope
  }

  private calculateConsistency(history: SupplierPerformance[]): number {
    if (history.length < 2) return 1;

    const ratings = history.map(h => h.overallRating);
    const mean = ratings.reduce((sum, r) => sum + r, 0) / ratings.length;
    const variance = ratings.reduce((sum, r) => sum + Math.pow(r - mean, 2), 0) / ratings.length;
    const standardDeviation = Math.sqrt(variance);

    // Lower standard deviation = higher consistency
    return Math.max(0, 1 - (standardDeviation / 2));
  }

  private calculateConfidence(dataPoints: number, features: Record<string, number>): number {
    const dataSizeScore = Math.min(1, dataPoints / 10); // Full confidence at 10+ data points
    const featureQuality = Object.values(features).reduce((sum, val) => sum + (isNaN(val) ? 0 : 1), 0) / Object.keys(features).length;

    return (dataSizeScore * 0.6) + (featureQuality * 0.4);
  }
}

// Demand Forecasting Model
export class DemandForecaster {
  predictDemand(
    itemId: string,
    stockMovements: StockMovement[],
    seasonality: unknown = {}
  ): DemandForecast {
    const outboundMovements = stockMovements.filter(m => m.type === 'outbound');
    const dailyDemand = this.aggregateDailyDemand(outboundMovements);

    const weeklyPattern = this.calculateWeeklyPattern(dailyDemand);
    const monthlyPattern = this.calculateMonthlyPattern(dailyDemand);
    const trend = this.calculateTrend(Object.values(dailyDemand));

    return {
      itemId,
      sku: '', // Will be filled by caller
      predictions: {
        next7Days: this.forecastPeriod(dailyDemand, weeklyPattern, 7, trend),
        next30Days: this.forecastPeriod(dailyDemand, monthlyPattern, 30, trend),
        next90Days: this.forecastPeriod(dailyDemand, monthlyPattern, 90, trend)
      },
      seasonality: {
        weeklyPattern,
        monthlyPattern,
        yearlyTrend: trend
      },
      confidence: this.calculateForecastConfidence(dailyDemand),
      lastUpdated: new Date()
    };
  }

  private aggregateDailyDemand(movements: StockMovement[]): Record<string, number> {
    const dailyDemand: Record<string, number> = {};

    movements.forEach(movement => {
      const date = movement.timestamp.toISOString().split('T')[0];
      dailyDemand[date] = (dailyDemand[date] || 0) + movement.quantity;
    });

    return dailyDemand;
  }

  private calculateWeeklyPattern(dailyDemand: Record<string, number>): number[] {
    const weeklyTotals = new Array(7).fill(0);
    const weeklyCounts = new Array(7).fill(0);

    Object.entries(dailyDemand).forEach(([date, demand]) => {
      const dayOfWeek = new Date(date).getDay();
      weeklyTotals[dayOfWeek] += demand;
      weeklyCounts[dayOfWeek]++;
    });

    return weeklyTotals.map((total, idx) =>
      weeklyCounts[idx] > 0 ? total / weeklyCounts[idx] : 0
    );
  }

  private calculateMonthlyPattern(dailyDemand: Record<string, number>): number[] {
    const monthlyTotals = new Array(12).fill(0);
    const monthlyCounts = new Array(12).fill(0);

    Object.entries(dailyDemand).forEach(([date, demand]) => {
      const month = new Date(date).getMonth();
      monthlyTotals[month] += demand;
      monthlyCounts[month]++;
    });

    return monthlyTotals.map((total, idx) =>
      monthlyCounts[idx] > 0 ? total / monthlyCounts[idx] : 0
    );
  }

  private forecastPeriod(
    dailyDemand: Record<string, number>,
    pattern: number[],
    days: number,
    trend: number
  ): number {
    const recentAverage = this.getRecentAverage(dailyDemand, 14);
    const seasonalMultiplier = this.getSeasonalMultiplier(pattern, days);
    const trendAdjustment = 1 + (trend * days / 365);

    return Math.max(0, recentAverage * seasonalMultiplier * trendAdjustment * days);
  }

  private getRecentAverage(dailyDemand: Record<string, number>, days: number): number {
    const dates = Object.keys(dailyDemand).sort().slice(-days);
    const total = dates.reduce((sum, date) => sum + dailyDemand[date], 0);
    return dates.length > 0 ? total / dates.length : 0;
  }

  private getSeasonalMultiplier(pattern: number[], days: number): number {
    if (pattern.length === 7) {
      // Weekly pattern
      const avgDailyFromPattern = pattern.reduce((sum, val) => sum + val, 0) / 7;
      return avgDailyFromPattern > 0 ? avgDailyFromPattern / pattern[0] : 1;
    } else {
      // Monthly pattern
      const currentMonth = new Date().getMonth();
      return pattern[currentMonth] || 1;
    }
  }

  private calculateTrend(values: number[]): number {
    if (values.length < 2) return 0;

    const n = values.length;
    const sumX = (n * (n - 1)) / 2;
    const sumY = values.reduce((sum, val) => sum + val, 0);
    const sumXY = values.reduce((sum, val, idx) => sum + (idx * val), 0);
    const sumX2 = (n * (n - 1) * (2 * n - 1)) / 6;

    return (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX) || 0;
  }

  private calculateForecastConfidence(dailyDemand: Record<string, number>): number {
    const values = Object.values(dailyDemand);
    if (values.length < 7) return 0.3;

    const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
    const variance = values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length;
    const coefficientOfVariation = Math.sqrt(variance) / mean;

    // Lower CV = higher confidence
    return Math.max(0.3, Math.min(0.95, 1 - coefficientOfVariation));
  }
}

// Price Optimization Model
export class PriceOptimizer {
  optimizePrice(
    item: InventoryItem,
    demandElasticity: number = -1.5,
    competitorPrices: number[] = [],
    targetMargin: number = 0.3
  ): PriceOptimization {
    const currentPrice = item.unitPrice;
    const cost = item.unitCost;
    const currentMargin = (currentPrice - cost) / currentPrice;

    // Calculate optimal price based on demand elasticity
    const optimalPrice = this.calculateOptimalPrice(cost, demandElasticity, targetMargin);

    // Adjust for competitive positioning
    const competitivePrice = this.adjustForCompetition(optimalPrice, competitorPrices);

    const finalPrice = Math.max(cost * 1.1, competitivePrice); // Ensure minimum 10% margin

    return {
      itemId: item.id,
      currentPrice,
      optimizedPrice: finalPrice,
      expectedProfitIncrease: this.calculateProfitIncrease(currentPrice, finalPrice, cost),
      demandSensitivity: Math.abs(demandElasticity),
      competitivePosition: this.getCompetitivePosition(finalPrice, competitorPrices),
      recommendation: this.generateRecommendation(currentPrice, finalPrice, currentMargin, targetMargin)
    };
  }

  private calculateOptimalPrice(cost: number, elasticity: number, targetMargin: number): number {
    // Price optimization using margin and elasticity
    const markup = targetMargin / (1 - targetMargin);
    return cost * (1 + markup);
  }

  private adjustForCompetition(price: number, competitorPrices: number[]): number {
    if (competitorPrices.length === 0) return price;

    const avgCompetitorPrice = competitorPrices.reduce((sum, p) => sum + p, 0) / competitorPrices.length;
    const minCompetitorPrice = Math.min(...competitorPrices);
    const maxCompetitorPrice = Math.max(...competitorPrices);

    // Position slightly below average but above minimum
    const targetPrice = avgCompetitorPrice * 0.95;

    return Math.max(minCompetitorPrice * 1.05, Math.min(maxCompetitorPrice * 0.9, targetPrice));
  }

  private calculateProfitIncrease(currentPrice: number, newPrice: number, cost: number): number {
    const currentProfit = currentPrice - cost;
    const newProfit = newPrice - cost;

    return newProfit > currentProfit ? (newProfit - currentProfit) / currentProfit : 0;
  }

  private getCompetitivePosition(price: number, competitorPrices: number[]): 'low' | 'competitive' | 'premium' {
    if (competitorPrices.length === 0) return 'competitive';

    const avgPrice = competitorPrices.reduce((sum, p) => sum + p, 0) / competitorPrices.length;

    if (price < avgPrice * 0.9) return 'low';
    if (price > avgPrice * 1.1) return 'premium';
    return 'competitive';
  }

  private generateRecommendation(currentPrice: number, optimalPrice: number, currentMargin: number, targetMargin: number): string {
    const priceDiff = ((optimalPrice - currentPrice) / currentPrice) * 100;

    if (Math.abs(priceDiff) < 2) {
      return "Current pricing is optimal. No immediate changes needed.";
    } else if (priceDiff > 5) {
      return `Consider increasing price by ${priceDiff.toFixed(1)}% to improve margins.`;
    } else if (priceDiff < -5) {
      return `Consider decreasing price by ${Math.abs(priceDiff).toFixed(1)}% to improve competitiveness.`;
    } else {
      return `Minor price adjustment of ${priceDiff > 0 ? '+' : ''}${priceDiff.toFixed(1)}% recommended.`;
    }
  }
}

// Anomaly Detection System
export class AnomalyDetector {
  detectSupplierAnomalies(
    suppliers: unknown[],
    performance: SupplierPerformance[]
  ): Array<{
    supplierId: string;
    anomalyType: string;
    severity: 'low' | 'medium' | 'high';
    description: string;
    value: number;
    threshold: number;
  }> {
    const anomalies: Array<unknown> = [];

    // Detect performance drops
    performance.forEach(p => {
      if (p.metrics.onTimeDeliveryRate < 85) {
        anomalies.push({
          supplierId: p.supplierId,
          anomalyType: 'delivery_performance',
          severity: p.metrics.onTimeDeliveryRate < 70 ? 'high' : 'medium',
          description: 'On-time delivery rate below threshold',
          value: p.metrics.onTimeDeliveryRate,
          threshold: 85
        });
      }

      if (p.metrics.qualityAcceptanceRate < 90) {
        anomalies.push({
          supplierId: p.supplierId,
          anomalyType: 'quality_issues',
          severity: p.metrics.qualityAcceptanceRate < 80 ? 'high' : 'medium',
          description: 'Quality acceptance rate below threshold',
          value: p.metrics.qualityAcceptanceRate,
          threshold: 90
        });
      }
    });

    return anomalies;
  }

  detectInventoryAnomalies(
    items: InventoryItem[],
    movements: StockMovement[]
  ): Array<{
    itemId: string;
    anomalyType: string;
    severity: 'low' | 'medium' | 'high';
    description: string;
    value: number;
  }> {
    const anomalies: Array<unknown> = [];

    items.forEach(item => {
      // Stock level anomalies
      if (item.currentStock <= item.reorderPoint) {
        anomalies.push({
          itemId: item.id,
          anomalyType: 'low_stock',
          severity: item.currentStock === 0 ? 'high' : 'medium',
          description: 'Stock level at or below reorder point',
          value: item.currentStock
        });
      }

      if (item.currentStock > item.maxStock * 1.2) {
        anomalies.push({
          itemId: item.id,
          anomalyType: 'overstock',
          severity: 'medium',
          description: 'Stock level significantly above maximum',
          value: item.currentStock
        });
      }

      // Unusual price movements
      const recentMovements = movements
        .filter(m => m.itemId === item.id && m.timestamp > new Date(Date.now() - 30 * 24 * 60 * 60 * 1000))
        .filter(m => m.unitCost);

      if (recentMovements.length > 1) {
        const costs = recentMovements.map(m => m.unitCost!);
        const avgCost = costs.reduce((sum, cost) => sum + cost, 0) / costs.length;
        const maxDeviation = Math.max(...costs.map(cost => Math.abs(cost - avgCost)));

        if (maxDeviation > avgCost * 0.15) {
          anomalies.push({
            itemId: item.id,
            anomalyType: 'price_volatility',
            severity: 'medium',
            description: 'Unusual price volatility detected',
            value: maxDeviation / avgCost
          });
        }
      }
    });

    return anomalies;
  }
}

// Export ML Models
export const mlModels = {
  supplierPredictor: new SupplierPerformancePredictor(),
  demandForecaster: new DemandForecaster(),
  priceOptimizer: new PriceOptimizer(),
  anomalyDetector: new AnomalyDetector()
};