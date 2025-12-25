/**
 * Scheduled Document Generation Service
 * 
 * Service for scheduled document generation (daily, weekly, monthly reports).
 */

import { DocumentGenerator } from './document-generator';
import { DOCUMENT_TYPES } from './document-types';

export class ScheduledGenerationService {
  /**
   * Generate daily reports
   */
  static async generateDailyReports(orgId: string, userId?: string): Promise<void> {
    // AR Aging Report
    try {
      await DocumentGenerator.generate({
        documentType: DOCUMENT_TYPES.AR_AGING_REPORT,
        entityType: 'report',
        entityId: `ar-aging-${new Date().toISOString().split('T')[0]}`,
        orgId,
        userId,
        metadata: {
          report_date: new Date().toISOString(),
          auto_generated: true,
          schedule: 'daily',
        },
      });
    } catch (error) {
      console.error('Error generating AR Aging report:', error);
    }

    // AP Aging Report
    try {
      await DocumentGenerator.generate({
        documentType: DOCUMENT_TYPES.AP_AGING_REPORT,
        entityType: 'report',
        entityId: `ap-aging-${new Date().toISOString().split('T')[0]}`,
        orgId,
        userId,
        metadata: {
          report_date: new Date().toISOString(),
          auto_generated: true,
          schedule: 'daily',
        },
      });
    } catch (error) {
      console.error('Error generating AP Aging report:', error);
    }
  }

  /**
   * Generate weekly reports
   */
  static async generateWeeklyReports(orgId: string, userId?: string): Promise<void> {
    // Inventory Report
    try {
      await DocumentGenerator.generate({
        documentType: DOCUMENT_TYPES.INVENTORY_REPORT,
        entityType: 'report',
        entityId: `inventory-${new Date().toISOString().split('T')[0]}`,
        orgId,
        userId,
        metadata: {
          report_date: new Date().toISOString(),
          auto_generated: true,
          schedule: 'weekly',
        },
      });
    } catch (error) {
      console.error('Error generating Inventory report:', error);
    }

    // Logistics Report
    try {
      await DocumentGenerator.generate({
        documentType: DOCUMENT_TYPES.DELIVERY_NOTE,
        entityType: 'report',
        entityId: `logistics-${new Date().toISOString().split('T')[0]}`,
        orgId,
        userId,
        metadata: {
          report_date: new Date().toISOString(),
          auto_generated: true,
          schedule: 'weekly',
        },
      });
    } catch (error) {
      console.error('Error generating Logistics report:', error);
    }
  }

  /**
   * Generate monthly reports
   */
  static async generateMonthlyReports(orgId: string, userId?: string): Promise<void> {
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    // Balance Sheet
    try {
      await DocumentGenerator.generate({
        documentType: DOCUMENT_TYPES.BALANCE_SHEET,
        entityType: 'report',
        entityId: `balance-sheet-${monthStart.toISOString().split('T')[0]}`,
        orgId,
        userId,
        metadata: {
          report_date: monthStart.toISOString(),
          auto_generated: true,
          schedule: 'monthly',
        },
      });
    } catch (error) {
      console.error('Error generating Balance Sheet:', error);
    }

    // Income Statement
    try {
      await DocumentGenerator.generate({
        documentType: DOCUMENT_TYPES.INCOME_STATEMENT,
        entityType: 'report',
        entityId: `income-statement-${monthStart.toISOString().split('T')[0]}`,
        orgId,
        userId,
        metadata: {
          report_date: monthStart.toISOString(),
          auto_generated: true,
          schedule: 'monthly',
        },
      });
    } catch (error) {
      console.error('Error generating Income Statement:', error);
    }

    // Tax Reports
    try {
      await DocumentGenerator.generate({
        documentType: DOCUMENT_TYPES.TAX_RETURN,
        entityType: 'report',
        entityId: `tax-return-${monthStart.toISOString().split('T')[0]}`,
        orgId,
        userId,
        metadata: {
          report_date: monthStart.toISOString(),
          auto_generated: true,
          schedule: 'monthly',
        },
      });
    } catch (error) {
      console.error('Error generating Tax Return:', error);
    }
  }

  /**
   * Run all scheduled generations
   */
  static async runScheduledGenerations(orgId: string, userId?: string): Promise<void> {
    const now = new Date();
    const dayOfWeek = now.getDay(); // 0 = Sunday, 6 = Saturday
    const dayOfMonth = now.getDate();

    // Daily reports (every day)
    await this.generateDailyReports(orgId, userId);

    // Weekly reports (every Monday)
    if (dayOfWeek === 1) {
      await this.generateWeeklyReports(orgId, userId);
    }

    // Monthly reports (1st of month)
    if (dayOfMonth === 1) {
      await this.generateMonthlyReports(orgId, userId);
    }
  }
}

