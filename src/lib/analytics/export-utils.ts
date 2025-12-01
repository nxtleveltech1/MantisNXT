// Analytics Export Utilities
export interface ExportData {
  headers: string[];
  rows: (string | number)[][];
  filename: string;
  type: 'csv' | 'excel' | 'pdf';
}

export class AnalyticsExporter {
  static formatCurrency(value: number): string {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  }

  static formatPercent(value: number): string {
    return `${value.toFixed(1)}%`;
  }

  static formatDate(date: Date): string {
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    }).format(date);
  }

  static exportToCSV(data: ExportData): void {
    const csvContent = [
      data.headers.join(','),
      ...data.rows.map(row =>
        row
          .map(cell => (typeof cell === 'string' && cell.includes(',') ? `"${cell}"` : cell))
          .join(',')
      ),
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);

    link.setAttribute('href', url);
    link.setAttribute('download', `${data.filename}.csv`);
    link.style.visibility = 'hidden';

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  static exportSpendAnalysis(spendData: unknown[], period: string): void {
    const headers = ['Month', 'Current Year', 'Previous Year', 'Budget', 'Variance'];
    const rows = spendData.map(item => [
      item.month,
      this.formatCurrency(item.currentYear),
      this.formatCurrency(item.previousYear),
      this.formatCurrency(item.budget),
      this.formatCurrency(item.currentYear - item.budget),
    ]);

    this.exportToCSV({
      headers,
      rows,
      filename: `spend-analysis-${period}-${Date.now()}`,
      type: 'csv',
    });
  }

  static exportSupplierPerformance(supplierData: unknown[]): void {
    const headers = [
      'Supplier Name',
      'Rating',
      'On-Time Delivery %',
      'Quality Score %',
      'Cost Index',
      'Risk Level',
      'Annual Spend',
    ];
    const rows = supplierData.map(supplier => [
      supplier.name,
      supplier.rating,
      supplier.onTime,
      supplier.quality,
      supplier.cost,
      supplier.risk,
      this.formatCurrency(supplier.spend),
    ]);

    this.exportToCSV({
      headers,
      rows,
      filename: `supplier-performance-${Date.now()}`,
      type: 'csv',
    });
  }

  static exportSavingsReport(savingsData: unknown[]): void {
    const headers = [
      'Month',
      'Negotiated Savings',
      'Process Improvement',
      'Volume Discount',
      'Alternative Source',
      'Total Savings',
      'Target',
      'Achievement %',
    ];
    const rows = savingsData.map(item => {
      const totalSavings =
        item.negotiated + item.processImprovement + item.volumeDiscount + item.alternativeSource;
      const achievement = (totalSavings / item.target) * 100;

      return [
        item.month,
        this.formatCurrency(item.negotiated),
        this.formatCurrency(item.processImprovement),
        this.formatCurrency(item.volumeDiscount),
        this.formatCurrency(item.alternativeSource),
        this.formatCurrency(totalSavings),
        this.formatCurrency(item.target),
        this.formatPercent(achievement),
      ];
    });

    this.exportToCSV({
      headers,
      rows,
      filename: `savings-report-${Date.now()}`,
      type: 'csv',
    });
  }

  static exportRiskAnalysis(riskData: unknown[]): void {
    const headers = [
      'Risk Category',
      'Risk Score',
      'Trend',
      'Critical Issues',
      'High Issues',
      'Medium Issues',
      'Total Issues',
    ];
    const rows = riskData.map(risk => [
      risk.category,
      `${risk.score}/50`,
      this.formatPercent(risk.trend),
      risk.critical,
      risk.high,
      risk.medium,
      risk.critical + risk.high + risk.medium,
    ]);

    this.exportToCSV({
      headers,
      rows,
      filename: `risk-analysis-${Date.now()}`,
      type: 'csv',
    });
  }

  static exportKPIDashboard(kpiData: unknown): void {
    const headers = ['KPI', 'Current Value', 'Change', 'Status'];
    const rows = [
      [
        'Total Spend',
        this.formatCurrency(kpiData.totalSpend),
        this.formatPercent(kpiData.totalSpendChange),
        kpiData.totalSpendChange > 0 ? 'Increased' : 'Decreased',
      ],
      [
        'Average Savings',
        this.formatPercent(kpiData.avgSavings),
        this.formatPercent(kpiData.avgSavingsChange),
        kpiData.avgSavingsChange > 0 ? 'Improved' : 'Declined',
      ],
      [
        'Supplier Count',
        kpiData.supplierCount.toString(),
        this.formatPercent(kpiData.supplierCountChange),
        kpiData.supplierCountChange > 0 ? 'Increased' : 'Decreased',
      ],
      [
        'On-Time Delivery',
        this.formatPercent(kpiData.onTimeDelivery),
        this.formatPercent(kpiData.onTimeDeliveryChange),
        kpiData.onTimeDeliveryChange > 0 ? 'Improved' : 'Declined',
      ],
      [
        'Quality Score',
        this.formatPercent(kpiData.qualityScore),
        this.formatPercent(kpiData.qualityScoreChange),
        kpiData.qualityScoreChange > 0 ? 'Improved' : 'Declined',
      ],
      [
        'Cost Variance',
        this.formatPercent(kpiData.costVariance),
        this.formatPercent(kpiData.costVarianceChange),
        kpiData.costVariance < 0 ? 'Under Budget' : 'Over Budget',
      ],
      [
        'Risk Score',
        kpiData.riskScore.toString(),
        this.formatPercent(kpiData.riskScoreChange),
        kpiData.riskScoreChange < 0 ? 'Improved' : 'Worsened',
      ],
      [
        'Contract Compliance',
        this.formatPercent(kpiData.contractCompliance),
        this.formatPercent(kpiData.contractComplianceChange),
        kpiData.contractComplianceChange > 0 ? 'Improved' : 'Declined',
      ],
    ];

    this.exportToCSV({
      headers,
      rows,
      filename: `kpi-dashboard-${Date.now()}`,
      type: 'csv',
    });
  }
}
