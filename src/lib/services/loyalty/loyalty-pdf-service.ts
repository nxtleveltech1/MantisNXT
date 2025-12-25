// UPDATE: [2025-12-25] Created Loyalty PDF service with DocuStore integration

/**
 * Loyalty PDF Service
 * 
 * Handles PDF generation for loyalty program documents:
 * - Redemption Receipts
 * - Reward Certificates
 * - Points Statements
 */

import { DocumentGenerator, DOCUMENT_TYPES, formatDate, formatCurrency } from '@/lib/services/docustore';
import { renderHtmlToPdfBuffer } from '@/lib/services/pdf/html-to-pdf';
import { generateBaseDocument } from '@/lib/services/docustore/templates';

export interface RedemptionReceiptData {
  redemptionId: string;
  redemptionNumber: string;
  orgId: string;
  customerId: string;
  customer: {
    name: string;
    email?: string;
    membershipNumber: string;
  };
  redemptionDate: string;
  pointsRedeemed: number;
  pointsRemaining: number;
  reward: {
    name: string;
    description?: string;
    value?: number;
  };
  expiryDate?: string;
}

export interface RewardCertificateData {
  certificateId: string;
  certificateNumber: string;
  orgId: string;
  customerId: string;
  customer: {
    name: string;
    membershipNumber: string;
  };
  issuedDate: string;
  expiryDate: string;
  reward: {
    name: string;
    description?: string;
    value?: number;
    terms?: string;
  };
  pointsValue: number;
}

export class LoyaltyPDFService {
  /**
   * Generate redemption receipt PDF
   */
  static async generateRedemptionReceipt(
    data: RedemptionReceiptData,
    userId?: string
  ): Promise<{ documentId: string; artifactId: string; pdfBuffer: Buffer }> {
    const htmlContent = this.generateRedemptionReceiptHTML(data);
    
    const fullHtml = await generateBaseDocument({
      title: 'Redemption Receipt',
      documentNumber: data.redemptionNumber,
      companyName: 'NXT Level Tech',
    }, htmlContent);
    
    const pdfBuffer = await renderHtmlToPdfBuffer({ html: fullHtml });
    
    const result = await DocumentGenerator.generate({
      orgId: data.orgId,
      documentType: DOCUMENT_TYPES.REDEMPTION_RECEIPT,
      title: `Redemption Receipt ${data.redemptionNumber}`,
      description: `Points redemption for ${data.customer.name}`,
      documentNumber: data.redemptionNumber,
      htmlContent,
      tags: ['loyalty', 'redemption', 'receipt'],
      metadata: {
        redemption_id: data.redemptionId,
        customer_id: data.customerId,
        points_redeemed: data.pointsRedeemed,
        reward_name: data.reward.name,
        redemption_date: data.redemptionDate,
      },
      entityLinks: [
        { entityType: 'redemption', entityId: data.redemptionId, linkType: 'primary' },
        { entityType: 'customer', entityId: data.customerId, linkType: 'related' },
      ],
      generatedBy: userId,
      companyInfo: {
        name: 'NXT Level Tech',
      },
    });
    
    return {
      documentId: result.documentId,
      artifactId: result.artifactId,
      pdfBuffer,
    };
  }
  
  /**
   * Generate reward certificate PDF
   */
  static async generateRewardCertificate(
    data: RewardCertificateData,
    userId?: string
  ): Promise<{ documentId: string; artifactId: string; pdfBuffer: Buffer }> {
    const htmlContent = this.generateRewardCertificateHTML(data);
    
    const fullHtml = await generateBaseDocument({
      title: 'Reward Certificate',
      documentNumber: data.certificateNumber,
      companyName: 'NXT Level Tech',
    }, htmlContent);
    
    const pdfBuffer = await renderHtmlToPdfBuffer({ html: fullHtml });
    
    const result = await DocumentGenerator.generate({
      orgId: data.orgId,
      documentType: DOCUMENT_TYPES.REWARD_CERTIFICATE,
      title: `Reward Certificate ${data.certificateNumber}`,
      description: `Reward certificate for ${data.customer.name}`,
      documentNumber: data.certificateNumber,
      htmlContent,
      tags: ['loyalty', 'reward', 'certificate'],
      metadata: {
        certificate_id: data.certificateId,
        customer_id: data.customerId,
        reward_name: data.reward.name,
        points_value: data.pointsValue,
        issued_date: data.issuedDate,
        expiry_date: data.expiryDate,
      },
      entityLinks: [
        { entityType: 'certificate', entityId: data.certificateId, linkType: 'primary' },
        { entityType: 'customer', entityId: data.customerId, linkType: 'related' },
      ],
      generatedBy: userId,
      companyInfo: {
        name: 'NXT Level Tech',
      },
    });
    
    return {
      documentId: result.documentId,
      artifactId: result.artifactId,
      pdfBuffer,
    };
  }
  
  /**
   * Generate redemption receipt HTML
   */
  private static generateRedemptionReceiptHTML(data: RedemptionReceiptData): string {
    return `
      <div class="certificate-header" style="text-align: center; margin-bottom: 32px;">
        <h1 style="font-size: 28px; color: #059669; margin-bottom: 8px;">REDEMPTION CONFIRMED</h1>
        <p style="color: #6b7280;">Thank you for being a valued member</p>
      </div>
      
      <div class="highlight-box success" style="text-align: center; padding: 24px;">
        <div style="font-size: 20px; font-weight: bold; margin-bottom: 8px;">${data.reward.name}</div>
        ${data.reward.description ? `<div style="color: #6b7280;">${data.reward.description}</div>` : ''}
      </div>
      
      <div class="details-grid" style="display: grid; grid-template-columns: 1fr 1fr; gap: 24px; margin: 32px 0;">
        <div class="detail-block">
          <div class="detail-label" style="color: #6b7280; font-size: 12px; text-transform: uppercase;">Member</div>
          <div class="detail-value" style="font-size: 16px; font-weight: 500;">${data.customer.name}</div>
          <div style="color: #6b7280;">ID: ${data.customer.membershipNumber}</div>
        </div>
        <div class="detail-block">
          <div class="detail-label" style="color: #6b7280; font-size: 12px; text-transform: uppercase;">Redemption Date</div>
          <div class="detail-value" style="font-size: 16px; font-weight: 500;">${formatDate(data.redemptionDate)}</div>
        </div>
        <div class="detail-block">
          <div class="detail-label" style="color: #6b7280; font-size: 12px; text-transform: uppercase;">Points Redeemed</div>
          <div class="detail-value" style="font-size: 24px; font-weight: bold; color: #dc2626;">${data.pointsRedeemed.toLocaleString()}</div>
        </div>
        <div class="detail-block">
          <div class="detail-label" style="color: #6b7280; font-size: 12px; text-transform: uppercase;">Remaining Balance</div>
          <div class="detail-value" style="font-size: 24px; font-weight: bold; color: #059669;">${data.pointsRemaining.toLocaleString()}</div>
        </div>
      </div>
      
      ${data.expiryDate ? `
      <div class="notice" style="background: #fef3c7; border-left: 4px solid #f59e0b; padding: 12px 16px; margin-top: 24px;">
        <strong>Note:</strong> This reward expires on ${formatDate(data.expiryDate)}
      </div>
      ` : ''}
    `;
  }
  
  /**
   * Generate reward certificate HTML
   */
  private static generateRewardCertificateHTML(data: RewardCertificateData): string {
    return `
      <div class="certificate" style="border: 4px double #8b5cf6; padding: 40px; text-align: center;">
        <div style="font-size: 14px; text-transform: uppercase; letter-spacing: 4px; color: #6b7280; margin-bottom: 16px;">
          Certificate of Reward
        </div>
        
        <div style="font-size: 36px; font-weight: bold; color: #8b5cf6; margin-bottom: 16px;">
          ${data.reward.name}
        </div>
        
        ${data.reward.value ? `
        <div style="font-size: 48px; font-weight: bold; margin-bottom: 16px;">
          ${formatCurrency(data.reward.value)}
        </div>
        ` : ''}
        
        <div style="font-size: 18px; margin-bottom: 32px;">
          This certificate is presented to
        </div>
        
        <div style="font-size: 24px; font-weight: bold; margin-bottom: 8px; border-bottom: 2px solid #e5e7eb; padding-bottom: 8px; display: inline-block; min-width: 300px;">
          ${data.customer.name}
        </div>
        
        <div style="color: #6b7280; margin-bottom: 32px;">
          Member ID: ${data.customer.membershipNumber}
        </div>
        
        ${data.reward.description ? `
        <div style="font-style: italic; color: #6b7280; margin-bottom: 24px; max-width: 400px; margin-left: auto; margin-right: auto;">
          ${data.reward.description}
        </div>
        ` : ''}
        
        <div style="display: flex; justify-content: space-between; margin-top: 32px; padding-top: 24px; border-top: 1px solid #e5e7eb;">
          <div>
            <div style="font-size: 12px; color: #6b7280;">Issued</div>
            <div style="font-weight: 500;">${formatDate(data.issuedDate)}</div>
          </div>
          <div>
            <div style="font-size: 12px; color: #6b7280;">Certificate No.</div>
            <div style="font-weight: 500;">${data.certificateNumber}</div>
          </div>
          <div>
            <div style="font-size: 12px; color: #6b7280;">Valid Until</div>
            <div style="font-weight: 500;">${formatDate(data.expiryDate)}</div>
          </div>
        </div>
      </div>
      
      ${data.reward.terms ? `
      <div class="terms" style="margin-top: 24px; font-size: 10px; color: #9ca3af;">
        <strong>Terms & Conditions:</strong> ${data.reward.terms}
      </div>
      ` : ''}
    `;
  }
}

