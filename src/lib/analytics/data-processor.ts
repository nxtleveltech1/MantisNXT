// @ts-nocheck
// Analytics Data Processing Utilities
export interface TimeSeriesData {
  period: string;
  value: number;
  change?: number;
  target?: number;
}

export interface ComparisonData {
  current: number;
  previous: number;
  target?: number;
  change: number;
  changePercent: number;
}

export class AnalyticsDataProcessor {
  static calculateGrowthRate(current: number, previous: number): number {
    if (previous === 0) return current > 0 ? 100 : 0;
    return ((current - previous) / previous) * 100;
  }

  static calculateVariance(actual: number, target: number): number {
    if (target === 0) return 0;
    return ((actual - target) / target) * 100;
  }

  static calculateMovingAverage(data: number[], window: number): number[] {
    const result: number[] = [];
    for (let i = 0; i < data.length; i++) {
      const start = Math.max(0, i - window + 1);
      const slice = data.slice(start, i + 1);
      const avg = slice.reduce((sum, val) => sum + val, 0) / slice.length;
      result.push(avg);
    }
    return result;
  }

  static calculateTrend(data: number[]): 'increasing' | 'decreasing' | 'stable' {
    if (data.length < 2) return 'stable';

    const changes = [];
    for (let i = 1; i < data.length; i++) {
      changes.push(data[i] - data[i - 1]);
    }

    const totalChange = changes.reduce((sum, change) => sum + change, 0);
    const threshold = Math.abs(data[0] * 0.05); // 5% threshold

    if (totalChange > threshold) return 'increasing';
    if (totalChange < -threshold) return 'decreasing';
    return 'stable';
  }

  static processSpendAnalysis(rawData: unknown[]): {
    monthlySpend: TimeSeriesData[];
    totalSpend: ComparisonData;
    topCategories: Array<{ category: string; amount: number; percentage: number }>;
    budgetVariance: number;
  } {
    const currentYearTotal = rawData.reduce((sum, item) => sum + item.currentYear, 0);
    const previousYearTotal = rawData.reduce((sum, item) => sum + item.previousYear, 0);
    const budgetTotal = rawData.reduce((sum, item) => sum + item.budget, 0);

    const monthlySpend = rawData.map(item => ({
      period: item.month,
      value: item.currentYear,
      change: this.calculateGrowthRate(item.currentYear, item.previousYear),
      target: item.budget,
    }));

    const totalSpend = {
      current: currentYearTotal,
      previous: previousYearTotal,
      target: budgetTotal,
      change: currentYearTotal - previousYearTotal,
      changePercent: this.calculateGrowthRate(currentYearTotal, previousYearTotal),
    };

    // Mock category data - in real implementation, this would come from actual category breakdown
    const topCategories = [
      { category: 'IT & Technology', amount: currentYearTotal * 0.32, percentage: 32 },
      { category: 'Manufacturing', amount: currentYearTotal * 0.25, percentage: 25 },
      { category: 'Services', amount: currentYearTotal * 0.2, percentage: 20 },
      { category: 'Raw Materials', amount: currentYearTotal * 0.13, percentage: 13 },
      { category: 'Logistics', amount: currentYearTotal * 0.1, percentage: 10 },
    ];

    const budgetVariance = this.calculateVariance(currentYearTotal, budgetTotal);

    return {
      monthlySpend,
      totalSpend,
      topCategories,
      budgetVariance,
    };
  }

  static processSupplierMetrics(supplierData: unknown[]): {
    averageRating: number;
    onTimePerformance: number;
    qualityScore: number;
    riskDistribution: { low: number; medium: number; high: number };
    topPerformers: unknown[];
    underperformers: unknown[];
  } {
    const totalSuppliers = supplierData.length;

    const averageRating = supplierData.reduce((sum, s) => sum + s.rating, 0) / totalSuppliers;
    const onTimePerformance = supplierData.reduce((sum, s) => sum + s.onTime, 0) / totalSuppliers;
    const qualityScore = supplierData.reduce((sum, s) => sum + s.quality, 0) / totalSuppliers;

    const riskCounts = supplierData.reduce(
      (acc, s) => {
        acc[s.risk.toLowerCase()]++;
        return acc;
      },
      { low: 0, medium: 0, high: 0 }
    );

    const riskDistribution = {
      low: (riskCounts.low / totalSuppliers) * 100,
      medium: (riskCounts.medium / totalSuppliers) * 100,
      high: (riskCounts.high / totalSuppliers) * 100,
    };

    // Top performers: rating > 4.5 AND on-time > 90% AND quality > 95%
    const topPerformers = supplierData
      .filter(s => s.rating > 4.5 && s.onTime > 90 && s.quality > 95)
      .sort((a, b) => b.rating - a.rating);

    // Underperformers: rating < 4.0 OR on-time < 85% OR quality < 90%
    const underperformers = supplierData
      .filter(s => s.rating < 4.0 || s.onTime < 85 || s.quality < 90)
      .sort((a, b) => a.rating - b.rating);

    return {
      averageRating,
      onTimePerformance,
      qualityScore,
      riskDistribution,
      topPerformers,
      underperformers,
    };
  }

  static processSavingsAnalysis(savingsData: unknown[]): {
    totalSavings: number;
    savingsByType: { [key: string]: number };
    targetAchievement: number;
    trend: 'increasing' | 'decreasing' | 'stable';
    projectedAnnualSavings: number;
  } {
    const totalSavings = savingsData.reduce(
      (sum, item) =>
        sum +
        item.negotiated +
        item.processImprovement +
        item.volumeDiscount +
        item.alternativeSource,
      0
    );

    const savingsByType = savingsData.reduce(
      (acc, item) => {
        acc.negotiated += item.negotiated;
        acc.processImprovement += item.processImprovement;
        acc.volumeDiscount += item.volumeDiscount;
        acc.alternativeSource += item.alternativeSource;
        return acc;
      },
      { negotiated: 0, processImprovement: 0, volumeDiscount: 0, alternativeSource: 0 }
    );

    const totalTarget = savingsData.reduce((sum, item) => sum + item.target, 0);
    const targetAchievement = (totalSavings / totalTarget) * 100;

    const monthlySavings = savingsData.map(
      item =>
        item.negotiated + item.processImprovement + item.volumeDiscount + item.alternativeSource
    );
    const trend = this.calculateTrend(monthlySavings);

    // Simple projection based on average monthly savings
    const avgMonthlySavings = totalSavings / savingsData.length;
    const projectedAnnualSavings = avgMonthlySavings * 12;

    return {
      totalSavings,
      savingsByType,
      targetAchievement,
      trend,
      projectedAnnualSavings,
    };
  }

  static processRiskAnalysis(riskData: unknown[]): {
    overallRiskScore: number;
    criticalRisks: number;
    riskTrends: { improving: number; stable: number; worsening: number };
    riskByCategory: { [key: string]: { score: number; trend: number } };
    priorityActions: string[];
  } {
    const totalScore = riskData.reduce((sum, risk) => sum + risk.score, 0);
    const overallRiskScore = totalScore / riskData.length;

    const criticalRisks = riskData.reduce((sum, risk) => sum + risk.critical, 0);

    const riskTrends = riskData.reduce(
      (acc, risk) => {
        if (risk.trend < -5) acc.improving++;
        else if (risk.trend > 5) acc.worsening++;
        else acc.stable++;
        return acc;
      },
      { improving: 0, stable: 0, worsening: 0 }
    );

    const riskByCategory = riskData.reduce(
      (acc, risk) => {
        acc[risk.category] = { score: risk.score, trend: risk.trend };
        return acc;
      },
      {} as { [key: string]: { score: number; trend: number } }
    );

    // Generate priority actions based on risk scores and trends
    const priorityActions = [];
    riskData.forEach(risk => {
      if (risk.score > 35) {
        priorityActions.push(
          `Address high ${risk.category.toLowerCase()} risk (Score: ${risk.score})`
        );
      }
      if (risk.trend > 10) {
        priorityActions.push(`Monitor worsening trend in ${risk.category.toLowerCase()}`);
      }
      if (risk.critical > 3) {
        priorityActions.push(
          `Urgent: Resolve ${risk.critical} critical ${risk.category.toLowerCase()} issues`
        );
      }
    });

    return {
      overallRiskScore,
      criticalRisks,
      riskTrends,
      riskByCategory,
      priorityActions: priorityActions.slice(0, 5), // Top 5 priority actions
    };
  }

  static generateInsights(data: unknown): string[] {
    const insights = [];

    // Spend insights
    if (data.spendData) {
      const variance = this.calculateVariance(
        data.spendData.totalSpend.current,
        data.spendData.totalSpend.target
      );
      if (variance > 10) {
        insights.push(
          `Spending is ${variance.toFixed(1)}% over budget - consider cost reduction initiatives`
        );
      } else if (variance < -5) {
        insights.push(
          `Spending is ${Math.abs(variance).toFixed(1)}% under budget - potential for strategic investments`
        );
      }
    }

    // Supplier insights
    if (data.supplierMetrics) {
      if (data.supplierMetrics.riskDistribution.high > 20) {
        insights.push(
          `${data.supplierMetrics.riskDistribution.high.toFixed(1)}% of suppliers are high-risk - diversification recommended`
        );
      }
      if (data.supplierMetrics.onTimePerformance < 90) {
        insights.push(
          `On-time delivery at ${data.supplierMetrics.onTimePerformance.toFixed(1)}% - supplier performance improvement needed`
        );
      }
    }

    // Savings insights
    if (data.savingsAnalysis) {
      if (data.savingsAnalysis.targetAchievement < 80) {
        insights.push(
          `Savings target achievement at ${data.savingsAnalysis.targetAchievement.toFixed(1)}% - enhance savings initiatives`
        );
      }
      if (data.savingsAnalysis.trend === 'decreasing') {
        insights.push(
          'Declining savings trend detected - review and optimize procurement strategies'
        );
      }
    }

    // Risk insights
    if (data.riskAnalysis) {
      if (data.riskAnalysis.overallRiskScore > 30) {
        insights.push(
          `Overall risk score of ${data.riskAnalysis.overallRiskScore.toFixed(1)} is elevated - implement risk mitigation measures`
        );
      }
      if (data.riskAnalysis.criticalRisks > 10) {
        insights.push(
          `${data.riskAnalysis.criticalRisks} critical risks identified - immediate action required`
        );
      }
    }

    return insights.slice(0, 6); // Return top 6 insights
  }
}
