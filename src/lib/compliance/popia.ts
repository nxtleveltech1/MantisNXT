// @ts-nocheck

/**
 * POPIA (Protection of Personal Information Act) Compliance utilities
 * South African data protection implementation
 */

export interface PersonalInformation {
  id: string;
  dataSubjectId: string;
  dataType:
    | 'identity'
    | 'contact'
    | 'financial'
    | 'biometric'
    | 'location'
    | 'employment'
    | 'health'
    | 'other';
  data: unknown;
  purpose: string;
  legalBasis:
    | 'consent'
    | 'contract'
    | 'legal_obligation'
    | 'vital_interests'
    | 'public_task'
    | 'legitimate_interests';
  consentGiven: boolean;
  consentDate?: Date;
  retentionPeriod: number; // in days
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date;
  isMinorData: boolean;
  parentalConsent?: boolean;
  source: string;
  processor?: string;
}

export interface ConsentRecord {
  id: string;
  dataSubjectId: string;
  purpose: string;
  dataTypes: string[];
  consentGiven: boolean;
  consentDate: Date;
  withdrawalDate?: Date;
  consentMethod: 'explicit' | 'implied' | 'opt_in' | 'opt_out';
  consentText: string;
  ipAddress?: string;
  userAgent?: string;
  version: number;
  isActive: boolean;
}

export interface DataSubjectRequest {
  id: string;
  dataSubjectId: string;
  requestType: 'access' | 'rectification' | 'erasure' | 'portability' | 'restriction' | 'objection';
  requestDate: Date;
  description: string;
  status: 'pending' | 'in_progress' | 'completed' | 'rejected';
  responseDate?: Date;
  responseDetails?: string;
  verificationMethod: string;
  documents?: string[];
}

export interface DataBreach {
  id: string;
  incidentDate: Date;
  reportedDate: Date;
  description: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  affectedDataSubjects: number;
  dataTypesAffected: string[];
  cause: string;
  containmentMeasures: string;
  notificationRequired: boolean;
  regulatorNotified: boolean;
  regulatorNotificationDate?: Date;
  dataSubjectsNotified: boolean;
  dataSubjectNotificationDate?: Date;
  status: 'investigating' | 'contained' | 'resolved';
  followUpActions: string[];
}

export class POPIACompliance {
  // Consent Management
  static recordConsent(
    dataSubjectId: string,
    purpose: string,
    dataTypes: string[],
    consentMethod: 'explicit' | 'implied' | 'opt_in' | 'opt_out',
    consentText: string,
    ipAddress?: string,
    userAgent?: string
  ): ConsentRecord {
    return {
      id: crypto.randomUUID(),
      dataSubjectId,
      purpose,
      dataTypes,
      consentGiven: true,
      consentDate: new Date(),
      consentMethod,
      consentText,
      ipAddress,
      userAgent,
      version: 1,
      isActive: true,
    };
  }

  static withdrawConsent(consentId: string): Partial<ConsentRecord> {
    return {
      consentGiven: false,
      withdrawalDate: new Date(),
      isActive: false,
    };
  }

  static validateConsent(consent: ConsentRecord, purpose: string): boolean {
    return (
      consent.isActive &&
      consent.consentGiven &&
      consent.purpose === purpose &&
      !consent.withdrawalDate
    );
  }

  // Data Retention Management
  static calculateRetentionExpiry(createdAt: Date, retentionPeriod: number): Date {
    const expiryDate = new Date(createdAt);
    expiryDate.setDate(expiryDate.getDate() + retentionPeriod);
    return expiryDate;
  }

  static isRetentionExpired(personalInfo: PersonalInformation): boolean {
    const expiryDate = this.calculateRetentionExpiry(
      personalInfo.createdAt,
      personalInfo.retentionPeriod
    );
    return new Date() > expiryDate;
  }

  static getExpiringData(
    data: PersonalInformation[],
    daysThreshold: number = 30
  ): PersonalInformation[] {
    const threshold = new Date();
    threshold.setDate(threshold.getDate() + daysThreshold);

    return data.filter(item => {
      const expiryDate = this.calculateRetentionExpiry(item.createdAt, item.retentionPeriod);
      return expiryDate <= threshold && !item.deletedAt;
    });
  }

  // Data Subject Rights
  static processAccessRequest(dataSubjectId: string, data: PersonalInformation[]): unknown {
    const subjectData = data.filter(
      item => item.dataSubjectId === dataSubjectId && !item.deletedAt
    );

    return {
      dataSubjectId,
      requestDate: new Date(),
      personalInformation: subjectData.map(item => ({
        dataType: item.dataType,
        purpose: item.purpose,
        legalBasis: item.legalBasis,
        retentionPeriod: item.retentionPeriod,
        source: item.source,
        processor: item.processor,
        createdAt: item.createdAt,
        updatedAt: item.updatedAt,
      })),
      totalRecords: subjectData.length,
    };
  }

  static processPortabilityRequest(dataSubjectId: string, data: PersonalInformation[]): unknown {
    const subjectData = data.filter(
      item =>
        item.dataSubjectId === dataSubjectId &&
        !item.deletedAt &&
        (item.legalBasis === 'consent' || item.legalBasis === 'contract')
    );

    return {
      dataSubjectId,
      exportDate: new Date(),
      format: 'JSON',
      data: subjectData.map(item => ({
        dataType: item.dataType,
        data: item.data,
        createdAt: item.createdAt,
      })),
    };
  }

  static processErasureRequest(dataSubjectId: string): Partial<PersonalInformation> {
    return {
      deletedAt: new Date(),
      data: null, // Anonymize the data
    };
  }

  // Data Breach Management
  static assessBreachRisk(breach: Partial<DataBreach>): {
    riskLevel: 'low' | 'medium' | 'high' | 'critical';
    notificationRequired: boolean;
    timeframe: string;
  } {
    let riskLevel: 'low' | 'medium' | 'high' | 'critical' = 'low';
    let notificationRequired = false;
    let timeframe = '72 hours';

    // Risk assessment criteria
    if (breach.affectedDataSubjects && breach.affectedDataSubjects > 1000) {
      riskLevel = 'high';
      notificationRequired = true;
    }

    if (
      breach.dataTypesAffected?.includes('financial') ||
      breach.dataTypesAffected?.includes('identity') ||
      breach.dataTypesAffected?.includes('biometric')
    ) {
      riskLevel = 'critical';
      notificationRequired = true;
      timeframe = '24 hours';
    }

    if (breach.severity === 'critical') {
      notificationRequired = true;
      timeframe = '24 hours';
    }

    return { riskLevel, notificationRequired, timeframe };
  }

  static createBreachReport(breach: DataBreach): string {
    return `
POPIA Data Breach Report
========================

Incident ID: ${breach.id}
Date of Incident: ${breach.incidentDate.toISOString()}
Date Reported: ${breach.reportedDate.toISOString()}

Description: ${breach.description}
Severity: ${breach.severity.toUpperCase()}

Affected Data Subjects: ${breach.affectedDataSubjects}
Data Types Affected: ${breach.dataTypesAffected.join(', ')}

Cause: ${breach.cause}
Containment Measures: ${breach.containmentMeasures}

Regulator Notification Required: ${breach.notificationRequired ? 'Yes' : 'No'}
${breach.regulatorNotified ? `Regulator Notified: ${breach.regulatorNotificationDate?.toISOString()}` : ''}

Data Subjects Notification Required: ${breach.notificationRequired ? 'Yes' : 'No'}
${breach.dataSubjectsNotified ? `Data Subjects Notified: ${breach.dataSubjectNotificationDate?.toISOString()}` : ''}

Status: ${breach.status.toUpperCase()}

Follow-up Actions:
${breach.followUpActions.map(action => `- ${action}`).join('\n')}
    `.trim();
  }

  // Privacy Impact Assessment
  static conductPIA(processing: {
    purpose: string;
    dataTypes: string[];
    dataSubjects: string[];
    legalBasis: string;
    retentionPeriod: number;
    thirdPartySharing: boolean;
    crossBorderTransfer: boolean;
  }): {
    riskScore: number;
    risks: string[];
    recommendations: string[];
    approved: boolean;
  } {
    const risks: string[] = [];
    const recommendations: string[] = [];
    let riskScore = 0;

    // Assess data sensitivity
    if (processing.dataTypes.includes('biometric') || processing.dataTypes.includes('financial')) {
      riskScore += 30;
      risks.push('Processing highly sensitive personal information');
      recommendations.push('Implement additional encryption and access controls');
    }

    if (processing.dataTypes.includes('identity')) {
      riskScore += 20;
      risks.push('Processing identity information');
      recommendations.push('Ensure strong authentication for access');
    }

    // Assess scale and scope
    if (processing.dataSubjects.includes('children')) {
      riskScore += 25;
      risks.push("Processing children's personal information");
      recommendations.push('Obtain parental consent and implement additional safeguards');
    }

    // Assess retention period
    if (processing.retentionPeriod > 2555) {
      // 7 years
      riskScore += 15;
      risks.push('Long retention period increases risk');
      recommendations.push('Review and justify retention period');
    }

    // Assess third party sharing
    if (processing.thirdPartySharing) {
      riskScore += 20;
      risks.push('Third party data sharing increases risk');
      recommendations.push('Ensure data processing agreements are in place');
    }

    // Assess cross-border transfers
    if (processing.crossBorderTransfer) {
      riskScore += 25;
      risks.push('Cross-border data transfer increases risk');
      recommendations.push('Ensure adequate protection in destination country');
    }

    const approved = riskScore < 70;

    if (!approved) {
      recommendations.push('High risk processing - requires additional approval and safeguards');
    }

    return {
      riskScore,
      risks,
      recommendations,
      approved,
    };
  }

  // Compliance Monitoring
  static generateComplianceReport(
    personalInfo: PersonalInformation[],
    consents: ConsentRecord[],
    breaches: DataBreach[]
  ): {
    summary: unknown;
    details: unknown;
    recommendations: string[];
  } {
    const now = new Date();
    const activeData = personalInfo.filter(item => !item.deletedAt);
    const expiredData = personalInfo.filter(
      item => this.isRetentionExpired(item) && !item.deletedAt
    );
    const activeConsents = consents.filter(c => c.isActive);
    const recentBreaches = breaches.filter(
      b => now.getTime() - b.incidentDate.getTime() < 90 * 24 * 60 * 60 * 1000 // 90 days
    );

    const recommendations: string[] = [];

    if (expiredData.length > 0) {
      recommendations.push(
        `${expiredData.length} records have exceeded retention period and should be deleted`
      );
    }

    if (activeData.some(item => item.isMinorData && !item.parentalConsent)) {
      recommendations.push('Some minor data lacks parental consent');
    }

    if (recentBreaches.length > 0) {
      recommendations.push(
        `${recentBreaches.length} data breaches in the last 90 days require follow-up`
      );
    }

    return {
      summary: {
        totalPersonalInfo: personalInfo.length,
        activeRecords: activeData.length,
        expiredRecords: expiredData.length,
        totalConsents: consents.length,
        activeConsents: activeConsents.length,
        recentBreaches: recentBreaches.length,
        complianceScore: Math.max(0, 100 - expiredData.length * 2 - recentBreaches.length * 10),
      },
      details: {
        dataTypeBreakdown: this.getDataTypeBreakdown(activeData),
        legalBasisBreakdown: this.getLegalBasisBreakdown(activeData),
        retentionAnalysis: this.getRetentionAnalysis(activeData),
        consentAnalysis: this.getConsentAnalysis(activeConsents),
      },
      recommendations,
    };
  }

  private static getDataTypeBreakdown(data: PersonalInformation[]): Record<string, number> {
    return data.reduce(
      (acc, item) => {
        acc[item.dataType] = (acc[item.dataType] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>
    );
  }

  private static getLegalBasisBreakdown(data: PersonalInformation[]): Record<string, number> {
    return data.reduce(
      (acc, item) => {
        acc[item.legalBasis] = (acc[item.legalBasis] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>
    );
  }

  private static getRetentionAnalysis(data: PersonalInformation[]): unknown {
    const periods = data.map(item => item.retentionPeriod);
    return {
      averageRetention: periods.reduce((a, b) => a + b, 0) / periods.length,
      maxRetention: Math.max(...periods),
      minRetention: Math.min(...periods),
    };
  }

  private static getConsentAnalysis(consents: ConsentRecord[]): unknown {
    return {
      explicitConsents: consents.filter(c => c.consentMethod === 'explicit').length,
      impliedConsents: consents.filter(c => c.consentMethod === 'implied').length,
      optInConsents: consents.filter(c => c.consentMethod === 'opt_in').length,
      optOutConsents: consents.filter(c => c.consentMethod === 'opt_out').length,
    };
  }
}
