/**
 * Compliance Reporting utilities for South African regulations
 * Generate reports for POPIA, BEE, VAT, and audit requirements
 */

import { POPIACompliance, PersonalInformation, ConsentRecord, DataBreach } from './popia';
import { FinancialCompliance, VATTransaction, BEESpend, AuditTrail } from './financial';

export interface ComplianceReport {
  id: string;
  reportType: 'popia' | 'bee' | 'vat' | 'audit' | 'comprehensive';
  period: {
    startDate: Date;
    endDate: Date;
  };
  generatedAt: Date;
  generatedBy: string;
  summary: Record<string, any>;
  details: Record<string, any>;
  recommendations: string[];
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  complianceScore: number;
  attachments?: string[];
}

export interface BEECertificateVerification {
  supplierId: string;
  certificateNumber: string;
  issuedBy: string;
  issueDate: Date;
  expiryDate: Date;
  beeLevel: number;
  verificationStatus: 'verified' | 'pending' | 'expired' | 'invalid';
  verificationDate?: Date;
  verificationMethod: 'manual' | 'api' | 'document';
}

export class ComplianceReporting {

  // POPIA Compliance Report
  static generatePOPIAReport(
    personalInfo: PersonalInformation[],
    consents: ConsentRecord[],
    breaches: DataBreach[],
    period: { startDate: Date; endDate: Date },
    generatedBy: string
  ): ComplianceReport {
    const popiaReport = POPIACompliance.generateComplianceReport(personalInfo, consents, breaches);

    const riskFactors = [
      breaches.length > 0 ? 20 : 0,
      popiaReport.summary.expiredRecords > 0 ? 15 : 0,
      popiaReport.summary.complianceScore < 80 ? 25 : 0
    ];

    const totalRisk = riskFactors.reduce((sum, risk) => sum + risk, 0);
    const riskLevel: 'low' | 'medium' | 'high' | 'critical' =
      totalRisk >= 40 ? 'critical' :
      totalRisk >= 25 ? 'high' :
      totalRisk >= 15 ? 'medium' : 'low';

    return {
      id: `popia_${Date.now()}`,
      reportType: 'popia',
      period,
      generatedAt: new Date(),
      generatedBy,
      summary: {
        ...popiaReport.summary,
        dataBreaches: breaches.length,
        highRiskProcessing: personalInfo.filter(p =>
          p.dataType === 'biometric' || p.dataType === 'health'
        ).length
      },
      details: popiaReport.details,
      recommendations: popiaReport.recommendations,
      riskLevel,
      complianceScore: popiaReport.summary.complianceScore
    };
  }

  // BEE Compliance Report
  static generateBEEReport(
    beeSpends: BEESpend[],
    certificates: BEECertificateVerification[],
    period: string,
    generatedBy: string
  ): ComplianceReport {
    const beeReport = FinancialCompliance.generateBEEReport(beeSpends, period);

    const expiredCertificates = certificates.filter(c =>
      c.expiryDate < new Date() && c.verificationStatus !== 'expired'
    );

    const unverifiedCertificates = certificates.filter(c =>
      c.verificationStatus === 'pending'
    );

    const recommendations = [...beeReport.recommendations];

    if (expiredCertificates.length > 0) {
      recommendations.push(`${expiredCertificates.length} supplier BEE certificates have expired`);
    }

    if (unverifiedCertificates.length > 0) {
      recommendations.push(`${unverifiedCertificates.length} BEE certificates require verification`);
    }

    const riskLevel: 'low' | 'medium' | 'high' | 'critical' =
      beeReport.beePercentage < 50 ? 'critical' :
      beeReport.beePercentage < 60 ? 'high' :
      beeReport.beePercentage < 70 ? 'medium' : 'low';

    return {
      id: `bee_${Date.now()}`,
      reportType: 'bee',
      period: {
        startDate: new Date(`${period}-01-01`),
        endDate: new Date(`${period}-12-31`)
      },
      generatedAt: new Date(),
      generatedBy,
      summary: {
        ...beeReport,
        totalCertificates: certificates.length,
        expiredCertificates: expiredCertificates.length,
        unverifiedCertificates: unverifiedCertificates.length
      },
      details: {
        breakdown: beeReport.breakdown,
        certificateStatus: {
          verified: certificates.filter(c => c.verificationStatus === 'verified').length,
          pending: unverifiedCertificates.length,
          expired: expiredCertificates.length,
          invalid: certificates.filter(c => c.verificationStatus === 'invalid').length
        },
        topSuppliers: this.getTopBEESuppliers(beeSpends, 10)
      },
      recommendations,
      riskLevel,
      complianceScore: Math.min(100, beeReport.recognizedPercentage)
    };
  }

  // VAT Compliance Report
  static generateVATReport(
    transactions: VATTransaction[],
    period: { month: number; year: number },
    generatedBy: string
  ): ComplianceReport {
    const vatReturn = FinancialCompliance.generateVATReturn(transactions, period);

    const invalidTransactions = transactions.filter(t => {
      const validation = FinancialCompliance.validateVATInvoice(t);
      return !validation.isValid;
    });

    const recommendations: string[] = [];

    if (invalidTransactions.length > 0) {
      recommendations.push(`${invalidTransactions.length} transactions have VAT validation errors`);
    }

    if (vatReturn.netVAT < 0) {
      recommendations.push('VAT refund due - ensure timely submission to SARS');
    }

    const complianceScore = Math.max(0, 100 - (invalidTransactions.length / transactions.length) * 100);

    const riskLevel: 'low' | 'medium' | 'high' | 'critical' =
      complianceScore < 70 ? 'high' :
      complianceScore < 85 ? 'medium' : 'low';

    return {
      id: `vat_${Date.now()}`,
      reportType: 'vat',
      period: {
        startDate: new Date(period.year, period.month - 1, 1),
        endDate: new Date(period.year, period.month, 0)
      },
      generatedAt: new Date(),
      generatedBy,
      summary: {
        ...vatReturn,
        totalTransactions: transactions.length,
        invalidTransactions: invalidTransactions.length,
        validationRate: complianceScore
      },
      details: {
        categoryBreakdown: vatReturn.summary,
        invalidTransactionDetails: invalidTransactions.map(t => ({
          id: t.id,
          invoiceNumber: t.invoiceNumber,
          amount: t.grossAmount,
          issues: FinancialCompliance.validateVATInvoice(t).errors
        }))
      },
      recommendations,
      riskLevel,
      complianceScore
    };
  }

  // Comprehensive Audit Report
  static generateAuditReport(
    auditTrail: AuditTrail[],
    period: { startDate: Date; endDate: Date },
    generatedBy: string
  ): ComplianceReport {
    const auditReport = FinancialCompliance.generateAuditReport(
      auditTrail,
      period.startDate,
      period.endDate
    );

    const riskLevel: 'low' | 'medium' | 'high' | 'critical' =
      auditReport.suspiciousActivity.length > 10 ? 'critical' :
      auditReport.suspiciousActivity.length > 5 ? 'high' :
      auditReport.suspiciousActivity.length > 0 ? 'medium' : 'low';

    const complianceScore = Math.max(0, 100 - (auditReport.suspiciousActivity.length / auditReport.totalActions) * 100);

    return {
      id: `audit_${Date.now()}`,
      reportType: 'audit',
      period,
      generatedAt: new Date(),
      generatedBy,
      summary: {
        ...auditReport,
        riskScore: auditReport.suspiciousActivity.length
      },
      details: {
        userActivity: auditReport.userActivity,
        entityActivity: auditReport.entityActivity,
        actionBreakdown: auditReport.actionBreakdown,
        suspiciousActivityDetails: auditReport.suspiciousActivity.map(activity => ({
          timestamp: activity.timestamp,
          userId: activity.userId,
          action: activity.action,
          entityType: activity.entityType,
          riskFactors: this.assessActivityRisk(activity)
        }))
      },
      recommendations: this.generateAuditRecommendations(auditReport),
      riskLevel,
      complianceScore
    };
  }

  // Comprehensive compliance report combining all areas
  static generateComprehensiveReport(
    personalInfo: PersonalInformation[],
    consents: ConsentRecord[],
    breaches: DataBreach[],
    vatTransactions: VATTransaction[],
    beeSpends: BEESpend[],
    auditTrail: AuditTrail[],
    period: { startDate: Date; endDate: Date },
    generatedBy: string
  ): ComplianceReport {
    const popiaReport = this.generatePOPIAReport(personalInfo, consents, breaches, period, generatedBy);
    const vatReport = this.generateVATReport(
      vatTransactions.filter(t =>
        t.transactionDate >= period.startDate && t.transactionDate <= period.endDate
      ),
      { month: period.startDate.getMonth() + 1, year: period.startDate.getFullYear() },
      generatedBy
    );
    const beeReport = this.generateBEEReport(
      beeSpends.filter(s =>
        s.spendDate >= period.startDate && s.spendDate <= period.endDate
      ),
      [], // BEE certificates would need to be passed separately
      period.startDate.getFullYear().toString(),
      generatedBy
    );
    const auditReport = this.generateAuditReport(auditTrail, period, generatedBy);

    const overallComplianceScore = (
      popiaReport.complianceScore * 0.3 +
      vatReport.complianceScore * 0.25 +
      beeReport.complianceScore * 0.25 +
      auditReport.complianceScore * 0.2
    );

    const highestRiskLevel = [popiaReport.riskLevel, vatReport.riskLevel, beeReport.riskLevel, auditReport.riskLevel]
      .reduce((highest, current) => {
        const levels = { low: 1, medium: 2, high: 3, critical: 4 };
        return levels[current] > levels[highest] ? current : highest;
      }, 'low' as 'low' | 'medium' | 'high' | 'critical');

    const allRecommendations = [
      ...popiaReport.recommendations,
      ...vatReport.recommendations,
      ...beeReport.recommendations,
      ...auditReport.recommendations
    ];

    return {
      id: `comprehensive_${Date.now()}`,
      reportType: 'comprehensive',
      period,
      generatedAt: new Date(),
      generatedBy,
      summary: {
        overallComplianceScore,
        popiaCompliance: popiaReport.complianceScore,
        vatCompliance: vatReport.complianceScore,
        beeCompliance: beeReport.complianceScore,
        auditCompliance: auditReport.complianceScore,
        totalRecommendations: allRecommendations.length,
        criticalIssues: allRecommendations.filter(r =>
          r.toLowerCase().includes('critical') ||
          r.toLowerCase().includes('urgent') ||
          r.toLowerCase().includes('overdue')
        ).length
      },
      details: {
        popia: popiaReport.summary,
        vat: vatReport.summary,
        bee: beeReport.summary,
        audit: auditReport.summary
      },
      recommendations: allRecommendations,
      riskLevel: highestRiskLevel,
      complianceScore: overallComplianceScore
    };
  }

  // BEE Certificate verification
  static verifyBEECertificate(
    certificate: BEECertificateVerification
  ): Promise<{ verified: boolean; details: any; errors?: string[] }> {
    // In a real implementation, this would integrate with SANAS or B-BBEE verification services
    return new Promise((resolve) => {
      setTimeout(() => {
        const isValid = certificate.expiryDate > new Date() &&
                       certificate.beeLevel >= 1 &&
                       certificate.beeLevel <= 8;

        resolve({
          verified: isValid,
          details: {
            certificateNumber: certificate.certificateNumber,
            issuer: certificate.issuedBy,
            level: certificate.beeLevel,
            status: isValid ? 'verified' : 'invalid'
          },
          errors: isValid ? undefined : ['Certificate expired or invalid level']
        });
      }, 1000); // Simulate API call delay
    });
  }

  // Export compliance report to various formats
  static exportReport(
    report: ComplianceReport,
    format: 'json' | 'csv' | 'pdf'
  ): string {
    switch (format) {
      case 'json':
        return JSON.stringify(report, null, 2);

      case 'csv':
        return this.convertToCSV(report);

      case 'pdf':
        return this.generatePDFContent(report);

      default:
        throw new Error(`Unsupported export format: ${format}`);
    }
  }

  // Helper methods
  private static getTopBEESuppliers(spends: BEESpend[], limit: number = 10): any[] {
    const supplierTotals = spends.reduce((acc, spend) => {
      if (!acc[spend.supplierId]) {
        acc[spend.supplierId] = {
          supplierId: spend.supplierId,
          supplierName: spend.supplierName,
          totalSpend: 0,
          beeLevel: spend.supplierBEELevel,
          recognition: 0
        };
      }
      acc[spend.supplierId].totalSpend += spend.spendAmount;
      acc[spend.supplierId].recognition += spend.spendAmount * spend.recognitionLevel / 100;
      return acc;
    }, {} as Record<string, any>);

    return Object.values(supplierTotals)
      .sort((a: any, b: any) => b.totalSpend - a.totalSpend)
      .slice(0, limit);
  }

  private static assessActivityRisk(activity: AuditTrail): string[] {
    const riskFactors: string[] = [];

    const hour = activity.timestamp.getHours();
    if (hour < 6 || hour > 22) {
      riskFactors.push('Outside business hours');
    }

    const isWeekend = activity.timestamp.getDay() === 0 || activity.timestamp.getDay() === 6;
    if (isWeekend) {
      riskFactors.push('Weekend activity');
    }

    if (activity.action === 'delete') {
      riskFactors.push('Data deletion');
    }

    if (activity.entityType === 'supplier' && activity.action === 'update') {
      riskFactors.push('Supplier data modification');
    }

    return riskFactors;
  }

  private static generateAuditRecommendations(auditReport: any): string[] {
    const recommendations: string[] = [];

    if (auditReport.suspiciousActivity.length > 0) {
      recommendations.push(`Review ${auditReport.suspiciousActivity.length} suspicious activities`);
    }

    const deletions = auditReport.actionBreakdown.delete || 0;
    if (deletions > auditReport.totalActions * 0.1) {
      recommendations.push('High volume of deletions detected - implement additional approval workflows');
    }

    return recommendations;
  }

  private static convertToCSV(report: ComplianceReport): string {
    const headers = ['Field', 'Value'];
    const rows = [
      ['Report ID', report.id],
      ['Report Type', report.reportType],
      ['Period Start', report.period.startDate.toISOString()],
      ['Period End', report.period.endDate.toISOString()],
      ['Generated At', report.generatedAt.toISOString()],
      ['Generated By', report.generatedBy],
      ['Compliance Score', report.complianceScore.toString()],
      ['Risk Level', report.riskLevel],
      ['Recommendations', report.recommendations.join('; ')]
    ];

    return [headers, ...rows]
      .map(row => row.map(field => `"${field}"`).join(','))
      .join('\n');
  }

  private static generatePDFContent(report: ComplianceReport): string {
    // This would integrate with a PDF generation library like PDFKit or jsPDF
    return `
COMPLIANCE REPORT

Report ID: ${report.id}
Type: ${report.reportType.toUpperCase()}
Period: ${report.period.startDate.toLocaleDateString()} - ${report.period.endDate.toLocaleDateString()}
Generated: ${report.generatedAt.toLocaleDateString()}
Generated By: ${report.generatedBy}

SUMMARY
Compliance Score: ${report.complianceScore}%
Risk Level: ${report.riskLevel.toUpperCase()}

RECOMMENDATIONS
${report.recommendations.map((rec, index) => `${index + 1}. ${rec}`).join('\n')}

DETAILS
${JSON.stringify(report.details, null, 2)}
    `.trim();
  }
}