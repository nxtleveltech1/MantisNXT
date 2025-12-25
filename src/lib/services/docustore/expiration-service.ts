/**
 * Document Expiration Service
 * 
 * Service for managing document expiration, warnings, and auto-archiving.
 */

import { query } from '@/lib/database';
import type { Document } from './types';

export class ExpirationService {
  /**
   * Check for expired documents
   */
  static async getExpiredDocuments(orgId: string): Promise<Document[]> {
    const result = await query<Document>(
      `SELECT * FROM docustore.documents 
       WHERE org_id = $1 
       AND expires_at IS NOT NULL 
       AND expires_at < now() 
       AND status = 'active'
       ORDER BY expires_at ASC`,
      [orgId]
    );

    return result.rows;
  }

  /**
   * Get documents expiring soon (within specified days)
   */
  static async getExpiringSoonDocuments(
    orgId: string,
    daysBefore: number = 7
  ): Promise<Document[]> {
    const result = await query<Document>(
      `SELECT * FROM docustore.documents 
       WHERE org_id = $1 
       AND expires_at IS NOT NULL 
       AND expires_at > now() 
       AND expires_at <= now() + INTERVAL '${daysBefore} days'
       AND status = 'active'
       ORDER BY expires_at ASC`,
      [orgId]
    );

    return result.rows;
  }

  /**
   * Send expiration warnings
   */
  static async sendExpirationWarnings(
    orgId: string,
    daysBefore: number[] = [30, 14, 7, 1]
  ): Promise<void> {
    for (const days of daysBefore) {
      const expiringDocs = await this.getExpiringSoonDocuments(orgId, days);

      for (const doc of expiringDocs) {
        // TODO: Integrate with email service to send warnings
        // For now, just log
        console.log(`Document ${doc.id} expires in ${days} days`);
      }
    }
  }

  /**
   * Auto-archive expired documents
   */
  static async autoArchiveExpired(orgId: string): Promise<number> {
    const result = await query<{ count: string }>(
      `UPDATE docustore.documents 
       SET status = 'archived', updated_at = now()
       WHERE org_id = $1 
       AND expires_at IS NOT NULL 
       AND expires_at < now() 
       AND status = 'active'
       RETURNING id`,
      [orgId]
    );

    return result.rows.length;
  }

  /**
   * Get expiration notifications for a user
   */
  static async getExpirationNotifications(userId: string): Promise<Document[]> {
    // Get documents owned by user or shared with user that are expiring soon
    const result = await query<Document>(
      `SELECT d.* FROM docustore.documents d
       LEFT JOIN docustore.document_permissions p ON d.id = p.document_id
       WHERE (d.created_by = $1 OR p.user_id = $1)
       AND d.expires_at IS NOT NULL 
       AND d.expires_at > now() 
       AND d.expires_at <= now() + INTERVAL '7 days'
       AND d.status = 'active'
       ORDER BY d.expires_at ASC`,
      [userId]
    );

    return result.rows;
  }
}

