/**
 * Financial compliance utilities for South African regulations
 * VAT, BEE, SARS integration and audit requirements
 */

export interface VATTransaction {
  id: string;
  transactionDate: Date;
  supplierVATNumber?: string;
  customerVATNumber?: string;
  invoiceNumber: string;
  description: string;
  netAmount: number;
  vatAmount: number;
  grossAmount: number;
  vatRate: number;
  transactionType: 'purchase' | 'sale' | 'import' | 'export';
  vatCategory: 'standard' | 'zero' | 'exempt' | 'deemed';
  isCapitalItem: boolean;
  documentType: 'tax_invoice' | 'receipt' | 'debit_note' | 'credit_note';
  periodMonth: number;
  periodYear: number;
}

export interface BEESpend {
  id: string;
  supplierId: string;
  supplierName: string;
  supplierBEELevel: number;
  supplierBEECertificate?: string;
  isBlackOwned: boolean;
  isWomenOwned: boolean;
  isYouthOwned: boolean;
  isDisabledOwned: boolean;
  isQSE: boolean; // Qualifying Small Enterprise
  isEME: boolean; // Exempt Micro Enterprise
  spendAmount: number;
  spendDate: Date;
  category: 'goods' | 'services' | 'professional_services';
  recognitionLevel: number; // BEE recognition percentage
  period: string; // Financial year period
}

export interface SARSSubmission {
  id: string;
  submissionType: 'vat_return' | 'paye' | 'provisional_tax' | 'annual_return';
  period: string;
  submissionDate: Date;
  dueDate: Date;
  status: 'draft' | 'submitted' | 'accepted' | 'rejected';
  referenceNumber?: string;
  amount?: number;
  documentPath?: string;
  validationErrors?: string[];
}

export interface AuditTrail {
  id: string;
  entityType: 'transaction' | 'supplier' | 'invoice' | 'payment';
  entityId: string;
  action: 'create' | 'update' | 'delete' | 'approve' | 'reject';
  userId: string;
  timestamp: Date;
  changes: Record<string, { old: any; new: any }>;
  reason?: string;
  ipAddress?: string;
  userAgent?: string;
}

export class FinancialCompliance {

  // VAT Compliance
  static calculateVAT(netAmount: number, vatRate: number = 15): {
    netAmount: number;
    vatAmount: number;
    grossAmount: number;
  } {
    const vatAmount = Math.round((netAmount * vatRate / 100) * 100) / 100;
    const grossAmount = netAmount + vatAmount;

    return {
      netAmount,
      vatAmount,
      grossAmount
    };
  }

  static validateVATInvoice(transaction: VATTransaction): {
    isValid: boolean;
    errors: string[];
    warnings: string[];
  } {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Required fields validation
    if (!transaction.supplierVATNumber && transaction.grossAmount > 50) {
      errors.push('Supplier VAT number required for transactions over R50');
    }

    if (!transaction.invoiceNumber) {
      errors.push('Invoice number is required');
    }

    if (transaction.grossAmount < 0) {
      errors.push('Gross amount cannot be negative');
    }

    // VAT calculation validation
    const expectedVAT = this.calculateVAT(transaction.netAmount, transaction.vatRate);
    if (Math.abs(expectedVAT.vatAmount - transaction.vatAmount) > 0.01) {
      errors.push('VAT amount calculation is incorrect');
    }

    if (Math.abs(expectedVAT.grossAmount - transaction.grossAmount) > 0.01) {
      errors.push('Gross amount calculation is incorrect');
    }

    // Document type validation
    if (transaction.grossAmount > 5000 && transaction.documentType === 'receipt') {
      warnings.push('Tax invoice required for amounts over R5000');
    }

    // VAT number format validation
    if (transaction.supplierVATNumber && !/^\d{10}$/.test(transaction.supplierVATNumber)) {
      errors.push('Invalid VAT number format');
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  static generateVATReturn(
    transactions: VATTransaction[],
    period: { month: number; year: number }
  ): {
    period: string;
    totalSales: number;
    totalPurchases: number;
    outputVAT: number;
    inputVAT: number;
    netVAT: number;
    capitalItems: number;
    badDebts: number;
    summary: Record<string, number>;
  } {
    const periodTransactions = transactions.filter(t =>
      t.periodMonth === period.month && t.periodYear === period.year
    );

    const sales = periodTransactions.filter(t => t.transactionType === 'sale');
    const purchases = periodTransactions.filter(t => t.transactionType === 'purchase');
    const capitalItems = periodTransactions.filter(t => t.isCapitalItem);

    const totalSales = sales.reduce((sum, t) => sum + t.netAmount, 0);
    const totalPurchases = purchases.reduce((sum, t) => sum + t.netAmount, 0);
    const outputVAT = sales.reduce((sum, t) => sum + t.vatAmount, 0);
    const inputVAT = purchases.reduce((sum, t) => sum + t.vatAmount, 0);
    const capitalItemsVAT = capitalItems.reduce((sum, t) => sum + t.vatAmount, 0);

    return {
      period: `${period.year}-${period.month.toString().padStart(2, '0')}`,
      totalSales,
      totalPurchases,
      outputVAT,
      inputVAT,
      netVAT: outputVAT - inputVAT,
      capitalItems: capitalItemsVAT,
      badDebts: 0, // To be calculated separately
      summary: {
        'Standard Rated Sales': sales.filter(t => t.vatCategory === 'standard').reduce((sum, t) => sum + t.netAmount, 0),
        'Zero Rated Sales': sales.filter(t => t.vatCategory === 'zero').reduce((sum, t) => sum + t.netAmount, 0),
        'Exempt Sales': sales.filter(t => t.vatCategory === 'exempt').reduce((sum, t) => sum + t.netAmount, 0),
        'Standard Rated Purchases': purchases.filter(t => t.vatCategory === 'standard').reduce((sum, t) => sum + t.netAmount, 0),
        'Capital Item Purchases': capitalItems.reduce((sum, t) => sum + t.netAmount, 0)
      }
    };
  }

  // BEE Compliance
  static calculateBEERecognition(spend: BEESpend): number {
    let recognition = 0;

    // Base recognition based on BEE level
    switch (spend.supplierBEELevel) {
      case 1: recognition = 135; break;
      case 2: recognition = 125; break;
      case 3: recognition = 110; break;
      case 4: recognition = 100; break;
      case 5: recognition = 80; break;
      case 6: recognition = 60; break;
      case 7: recognition = 50; break;
      case 8: recognition = 10; break;
      default: recognition = 0;
    }

    // EME and QSE bonus
    if (spend.isEME) {
      recognition = Math.max(recognition, 135);
    } else if (spend.isQSE) {
      recognition = Math.max(recognition, 125);
    }

    // Ownership bonuses
    if (spend.isBlackOwned && recognition > 0) {
      recognition += 10;
    }

    return Math.min(recognition, 135); // Cap at 135%
  }

  static generateBEEReport(
    spends: BEESpend[],
    period: string
  ): {
    period: string;
    totalSpend: number;
    beeSpend: number;
    beePercentage: number;
    recognizedSpend: number;
    recognizedPercentage: number;
    breakdown: Record<string, any>;
    recommendations: string[];
  } {
    const periodSpends = spends.filter(s => s.period === period);
    const totalSpend = periodSpends.reduce((sum, s) => sum + s.spendAmount, 0);

    const beeSpends = periodSpends.filter(s => s.supplierBEELevel > 0 || s.isEME || s.isQSE);
    const beeSpend = beeSpends.reduce((sum, s) => sum + s.spendAmount, 0);

    const recognizedSpend = beeSpends.reduce((sum, s) => {
      const recognition = this.calculateBEERecognition(s);
      return sum + (s.spendAmount * recognition / 100);
    }, 0);

    const recommendations: string[] = [];

    if ((beeSpend / totalSpend) < 0.70) {
      recommendations.push('Increase BEE spend to achieve 70% target');
    }

    if ((recognizedSpend / totalSpend) < 0.40) {
      recommendations.push('Focus on higher BEE level suppliers for better recognition');
    }

    return {
      period,
      totalSpend,
      beeSpend,
      beePercentage: (beeSpend / totalSpend) * 100,
      recognizedSpend,
      recognizedPercentage: (recognizedSpend / totalSpend) * 100,
      breakdown: {
        'Level 1 Suppliers': beeSpends.filter(s => s.supplierBEELevel === 1).reduce((sum, s) => sum + s.spendAmount, 0),
        'Level 2 Suppliers': beeSpends.filter(s => s.supplierBEELevel === 2).reduce((sum, s) => sum + s.spendAmount, 0),
        'Level 3 Suppliers': beeSpends.filter(s => s.supplierBEELevel === 3).reduce((sum, s) => sum + s.spendAmount, 0),
        'Level 4+ Suppliers': beeSpends.filter(s => s.supplierBEELevel >= 4).reduce((sum, s) => sum + s.spendAmount, 0),
        'EME Suppliers': beeSpends.filter(s => s.isEME).reduce((sum, s) => sum + s.spendAmount, 0),
        'QSE Suppliers': beeSpends.filter(s => s.isQSE && !s.isEME).reduce((sum, s) => sum + s.spendAmount, 0),
        'Black Owned': beeSpends.filter(s => s.isBlackOwned).reduce((sum, s) => sum + s.spendAmount, 0),
        'Women Owned': beeSpends.filter(s => s.isWomenOwned).reduce((sum, s) => sum + s.spendAmount, 0),
        'Youth Owned': beeSpends.filter(s => s.isYouthOwned).reduce((sum, s) => sum + s.spendAmount, 0)
      },
      recommendations
    };
  }

  // Audit Trail Management
  static createAuditEntry(
    entityType: AuditTrail['entityType'],
    entityId: string,
    action: AuditTrail['action'],
    userId: string,
    changes: Record<string, { old: any; new: any }>,
    reason?: string,
    ipAddress?: string,
    userAgent?: string
  ): AuditTrail {
    return {
      id: crypto.randomUUID(),
      entityType,
      entityId,
      action,
      userId,
      timestamp: new Date(),
      changes,
      reason,
      ipAddress,
      userAgent
    };
  }

  static generateAuditReport(
    auditTrail: AuditTrail[],
    startDate: Date,
    endDate: Date
  ): {
    period: string;
    totalActions: number;
    userActivity: Record<string, number>;
    entityActivity: Record<string, number>;
    actionBreakdown: Record<string, number>;
    suspiciousActivity: AuditTrail[];
    summary: string;
  } {
    const periodTrail = auditTrail.filter(a =>
      a.timestamp >= startDate && a.timestamp <= endDate
    );

    const userActivity = periodTrail.reduce((acc, entry) => {
      acc[entry.userId] = (acc[entry.userId] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const entityActivity = periodTrail.reduce((acc, entry) => {
      acc[entry.entityType] = (acc[entry.entityType] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const actionBreakdown = periodTrail.reduce((acc, entry) => {
      acc[entry.action] = (acc[entry.action] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    // Detect suspicious activity
    const suspiciousActivity = periodTrail.filter(entry => {
      // Multiple deletes by same user
      const userDeletes = periodTrail.filter(a =>
        a.userId === entry.userId && a.action === 'delete'
      ).length;

      // Actions outside business hours
      const hour = entry.timestamp.getHours();
      const isOutsideHours = hour < 8 || hour > 18;

      // Weekend activity
      const isWeekend = entry.timestamp.getDay() === 0 || entry.timestamp.getDay() === 6;

      return userDeletes > 10 || (isOutsideHours && entry.action === 'delete') || isWeekend;
    });

    return {
      period: `${startDate.toISOString().split('T')[0]} to ${endDate.toISOString().split('T')[0]}`,
      totalActions: periodTrail.length,
      userActivity,
      entityActivity,
      actionBreakdown,
      suspiciousActivity,
      summary: `${periodTrail.length} total actions by ${Object.keys(userActivity).length} users. ${suspiciousActivity.length} suspicious activities detected.`
    };
  }

  // SARS Integration Helpers
  static validateSARSSubmission(submission: SARSSubmission): {
    isValid: boolean;
    errors: string[];
    warnings: string[];
  } {
    const errors: string[] = [];
    const warnings: string[] = [];

    if (!submission.period) {
      errors.push('Period is required');
    }

    if (submission.dueDate < new Date()) {
      warnings.push('Submission is overdue');
    }

    if (submission.submissionType === 'vat_return' && !submission.amount) {
      errors.push('Amount is required for VAT returns');
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  static generateComplianceScore(
    vatTransactions: VATTransaction[],
    beeSpends: BEESpend[],
    auditTrail: AuditTrail[]
  ): {
    overallScore: number;
    vatCompliance: number;
    beeCompliance: number;
    auditCompliance: number;
    recommendations: string[];
  } {
    let vatCompliance = 100;
    let beeCompliance = 100;
    let auditCompliance = 100;
    const recommendations: string[] = [];

    // VAT Compliance scoring
    const invalidVAT = vatTransactions.filter(t => {
      const validation = this.validateVATInvoice(t);
      return !validation.isValid;
    });

    if (invalidVAT.length > 0) {
      vatCompliance = Math.max(0, 100 - (invalidVAT.length / vatTransactions.length) * 100);
      recommendations.push(`${invalidVAT.length} VAT transactions have validation errors`);
    }

    // BEE Compliance scoring
    const currentPeriod = new Date().getFullYear().toString();
    const currentBEEReport = this.generateBEEReport(beeSpends, currentPeriod);

    if (currentBEEReport.beePercentage < 70) {
      beeCompliance = Math.max(0, currentBEEReport.beePercentage);
      recommendations.push('BEE spend below 70% target');
    }

    // Audit Compliance scoring
    const recentAudits = auditTrail.filter(a =>
      (Date.now() - a.timestamp.getTime()) < (30 * 24 * 60 * 60 * 1000) // 30 days
    );

    const suspiciousCount = recentAudits.filter(a => {
      const hour = a.timestamp.getHours();
      return hour < 8 || hour > 18 || a.timestamp.getDay() === 0 || a.timestamp.getDay() === 6;
    }).length;

    if (suspiciousCount > recentAudits.length * 0.1) {
      auditCompliance = Math.max(0, 100 - (suspiciousCount / recentAudits.length) * 100);
      recommendations.push('High volume of suspicious audit activity detected');
    }

    const overallScore = (vatCompliance + beeCompliance + auditCompliance) / 3;

    return {
      overallScore,
      vatCompliance,
      beeCompliance,
      auditCompliance,
      recommendations
    };
  }
}