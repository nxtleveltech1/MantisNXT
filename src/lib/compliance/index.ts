/**
 * Compliance module index - Central exports for South African compliance
 * Combines POPIA, BEE, VAT, and audit compliance utilities
 */

// POPIA Compliance
export * from './popia';
export type {
  PersonalInformation,
  ConsentRecord,
  DataSubjectRequest,
  DataBreach
} from './popia';

// Financial Compliance
export * from './financial';
export type {
  VATTransaction,
  BEESpend,
  SARSSubmission,
  AuditTrail
} from './financial';

// Compliance Reporting
export * from './reporting';
export type {
  ComplianceReport,
  BEECertificateVerification
} from './reporting';

// Configuration and constants
export const COMPLIANCE_CONSTANTS = {
  POPIA: {
    DATA_RETENTION_PERIODS: {
      EMPLOYEE_RECORDS: 7 * 365, // 7 years in days
      CUSTOMER_DATA: 3 * 365, // 3 years
      FINANCIAL_RECORDS: 5 * 365, // 5 years
      MARKETING_DATA: 2 * 365, // 2 years
      SYSTEM_LOGS: 1 * 365, // 1 year
    },
    CONSENT_VALIDITY_PERIOD: 2 * 365, // 2 years
    DATA_BREACH_NOTIFICATION_PERIOD: 72, // hours
    DATA_SUBJECT_RESPONSE_PERIOD: 30, // days
  },
  BEE: {
    CERTIFICATE_VALIDITY_PERIOD: 1 * 365, // 1 year
    MINIMUM_BEE_SPEND_TARGET: 70, // percentage
    RECOGNITION_LEVELS: {
      LEVEL_1: 135,
      LEVEL_2: 125,
      LEVEL_3: 110,
      LEVEL_4: 100,
      LEVEL_5: 80,
      LEVEL_6: 60,
      LEVEL_7: 50,
      LEVEL_8: 10,
    },
    EME_THRESHOLD: 10000000, // R10 million
    QSE_THRESHOLD: 50000000, // R50 million
  },
  VAT: {
    STANDARD_RATE: 15, // percentage
    ZERO_RATE: 0,
    INVOICE_THRESHOLD: 50, // Rand
    TAX_INVOICE_THRESHOLD: 5000, // Rand
    RETURN_PERIODS: ['monthly', 'bimonthly'],
  },
  SARS: {
    COMPANY_REGISTRATION_FORMAT: /^\d{4}\/\d{6}\/\d{2}$/,
    VAT_NUMBER_FORMAT: /^\d{10}$/,
    PAYE_NUMBER_FORMAT: /^\d{10}$/,
  }
};

export const DATA_PROTECTION_LEVELS = {
  PUBLIC: 0,
  INTERNAL: 1,
  CONFIDENTIAL: 2,
  RESTRICTED: 3,
  SECRET: 4
} as const;

export const SOUTH_AFRICAN_HOLIDAYS = [
  // Fixed holidays
  { name: 'New Year\'s Day', date: '01-01' },
  { name: 'Human Rights Day', date: '03-21' },
  { name: 'Freedom Day', date: '04-27' },
  { name: 'Workers\' Day', date: '05-01' },
  { name: 'Youth Day', date: '06-16' },
  { name: 'National Women\'s Day', date: '08-09' },
  { name: 'Heritage Day', date: '09-24' },
  { name: 'Day of Reconciliation', date: '12-16' },
  { name: 'Christmas Day', date: '12-25' },
  { name: 'Day of Goodwill', date: '12-26' },
  // Variable holidays (would need calculation)
  // { name: 'Good Friday', date: 'variable' },
  // { name: 'Family Day', date: 'variable' }
];

// Utility functions
export function isSouthAfricanBusinessDay(date: Date): boolean {
  const dayOfWeek = date.getDay();
  const isWeekend = dayOfWeek === 0 || dayOfWeek === 6; // Sunday or Saturday

  if (isWeekend) return false;

  // Check against South African holidays
  const dateString = date.toISOString().slice(5, 10); // MM-DD format
  const isHoliday = SOUTH_AFRICAN_HOLIDAYS.some(holiday => holiday.date === dateString);

  return !isHoliday;
}

export function calculateBusinessDays(startDate: Date, endDate: Date): number {
  let count = 0;
  const current = new Date(startDate);

  while (current <= endDate) {
    if (isSouthAfricanBusinessDay(current)) {
      count++;
    }
    current.setDate(current.getDate() + 1);
  }

  return count;
}

export function addBusinessDays(startDate: Date, businessDays: number): Date {
  const result = new Date(startDate);
  let daysAdded = 0;

  while (daysAdded < businessDays) {
    result.setDate(result.getDate() + 1);
    if (isSouthAfricanBusinessDay(result)) {
      daysAdded++;
    }
  }

  return result;
}

// Currency formatting for South African Rand
export function formatZAR(amount: number): string {
  return new Intl.NumberFormat('en-ZA', {
    style: 'currency',
    currency: 'ZAR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(amount);
}

// Percentage formatting for BEE compliance
export function formatPercentage(value: number, decimals: number = 1): string {
  return new Intl.NumberFormat('en-ZA', {
    style: 'percent',
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals
  }).format(value / 100);
}

// Date formatting for South African locale
export function formatSADate(date: Date): string {
  return new Intl.DateTimeFormat('en-ZA', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).format(date);
}

export function formatSADateTime(date: Date): string {
  return new Intl.DateTimeFormat('en-ZA', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  }).format(date);
}

// Risk assessment utilities
export function calculateComplianceRisk(
  popiaScore: number,
  beeScore: number,
  vatScore: number,
  auditScore: number
): {
  overallRisk: 'low' | 'medium' | 'high' | 'critical';
  score: number;
  factors: string[];
} {
  const weights = {
    popia: 0.35,
    bee: 0.25,
    vat: 0.25,
    audit: 0.15
  };

  const weightedScore = (
    popiaScore * weights.popia +
    beeScore * weights.bee +
    vatScore * weights.vat +
    auditScore * weights.audit
  );

  const factors: string[] = [];

  if (popiaScore < 70) factors.push('POPIA compliance below threshold');
  if (beeScore < 60) factors.push('BEE spend below target');
  if (vatScore < 80) factors.push('VAT compliance issues detected');
  if (auditScore < 75) factors.push('Audit trail concerns');

  let overallRisk: 'low' | 'medium' | 'high' | 'critical';

  if (weightedScore >= 85) {
    overallRisk = 'low';
  } else if (weightedScore >= 70) {
    overallRisk = 'medium';
  } else if (weightedScore >= 50) {
    overallRisk = 'high';
  } else {
    overallRisk = 'critical';
  }

  return {
    overallRisk,
    score: Math.round(weightedScore),
    factors
  };
}

// Data classification utilities
export function classifyDataSensitivity(dataType: string): {
  level: keyof typeof DATA_PROTECTION_LEVELS;
  description: string;
  retentionPeriod: number;
  encryptionRequired: boolean;
} {
  const classifications: Record<string, unknown> = {
    identity: {
      level: 'RESTRICTED',
      description: 'Personal identity information including SA ID numbers',
      retentionPeriod: COMPLIANCE_CONSTANTS.POPIA.DATA_RETENTION_PERIODS.EMPLOYEE_RECORDS,
      encryptionRequired: true
    },
    financial: {
      level: 'CONFIDENTIAL',
      description: 'Financial and banking information',
      retentionPeriod: COMPLIANCE_CONSTANTS.POPIA.DATA_RETENTION_PERIODS.FINANCIAL_RECORDS,
      encryptionRequired: true
    },
    biometric: {
      level: 'SECRET',
      description: 'Biometric data including fingerprints and facial recognition',
      retentionPeriod: COMPLIANCE_CONSTANTS.POPIA.DATA_RETENTION_PERIODS.EMPLOYEE_RECORDS,
      encryptionRequired: true
    },
    health: {
      level: 'SECRET',
      description: 'Health and medical information',
      retentionPeriod: COMPLIANCE_CONSTANTS.POPIA.DATA_RETENTION_PERIODS.EMPLOYEE_RECORDS,
      encryptionRequired: true
    },
    contact: {
      level: 'CONFIDENTIAL',
      description: 'Contact information including email and phone numbers',
      retentionPeriod: COMPLIANCE_CONSTANTS.POPIA.DATA_RETENTION_PERIODS.CUSTOMER_DATA,
      encryptionRequired: false
    },
    employment: {
      level: 'CONFIDENTIAL',
      description: 'Employment and HR related information',
      retentionPeriod: COMPLIANCE_CONSTANTS.POPIA.DATA_RETENTION_PERIODS.EMPLOYEE_RECORDS,
      encryptionRequired: true
    },
    location: {
      level: 'RESTRICTED',
      description: 'Location and GPS tracking data',
      retentionPeriod: COMPLIANCE_CONSTANTS.POPIA.DATA_RETENTION_PERIODS.CUSTOMER_DATA,
      encryptionRequired: true
    },
    other: {
      level: 'INTERNAL',
      description: 'General business information',
      retentionPeriod: COMPLIANCE_CONSTANTS.POPIA.DATA_RETENTION_PERIODS.CUSTOMER_DATA,
      encryptionRequired: false
    }
  };

  return classifications[dataType] || classifications.other;
}

// Export main compliance class for easy access
export { POPIACompliance } from './popia';
export { FinancialCompliance } from './financial';
export { ComplianceReporting } from './reporting';