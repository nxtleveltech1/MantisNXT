/**
 * Email Service
 *
 * Production-ready email service using Resend as primary provider
 * with nodemailer SMTP fallback for reliability.
 * 
 * Configuration is loaded from database via EmailSettingsService.
 *
 * @module services/EmailService
 */

import { Resend } from 'resend';
import nodemailer from 'nodemailer';
import type { Transporter } from 'nodemailer';
import { EmailSettingsService, type EmailSettings } from './EmailSettingsService';

// ============================================================================
// TYPES AND INTERFACES
// ============================================================================

export interface EmailOptions {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
  replyTo?: string;
  cc?: string | string[];
  bcc?: string | string[];
  tags?: { name: string; value: string }[];
}

export interface EmailResult {
  success: boolean;
  messageId?: string;
  error?: string;
  provider: 'resend' | 'smtp';
}

export interface PasswordResetEmailData {
  email: string;
  name?: string;
  resetToken: string;
  expiresIn?: string;
}

export interface WelcomeEmailData {
  email: string;
  name: string;
  loginUrl?: string;
}

export interface InvitationEmailData {
  email: string;
  name: string;
  inviterName: string;
  tempPassword?: string;
  setupUrl?: string;
  role?: string;
}

export interface POApprovalEmailData {
  email: string;
  approverName: string;
  poNumber: string;
  supplierName: string;
  amount: string;
  approvalUrl: string;
}

export interface InvoiceReminderEmailData {
  email: string;
  recipientName: string;
  invoiceNumber: string;
  amount: string;
  dueDate: string;
  paymentUrl?: string;
}

export interface TestEmailData {
  email: string;
}

// ============================================================================
// EMAIL SERVICE CLASS
// ============================================================================

export class EmailService {
  private orgId: string;
  private settings: EmailSettings | null = null;
  private resend: Resend | null = null;
  private smtpTransporter: Transporter | null = null;
  private appUrl: string;
  private initialized = false;

  constructor(orgId: string) {
    this.orgId = orgId;
    this.appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  }

  /**
   * Initialize the email service with settings from database
   */
  private async initialize(): Promise<void> {
    if (this.initialized) return;

    try {
      this.settings = await EmailSettingsService.getSettings(this.orgId);

      // Initialize Resend if API key is configured
      if (this.settings.resendApiKey) {
        this.resend = new Resend(this.settings.resendApiKey);
        console.log(`✓ Email service initialized with Resend for org ${this.orgId}`);
      }

      // Initialize SMTP if configured
      if (this.settings.smtpHost && this.settings.smtpUser) {
        this.smtpTransporter = nodemailer.createTransport({
          host: this.settings.smtpHost,
          port: this.settings.smtpPort || 587,
          secure: this.settings.smtpSecure || false,
          auth: {
            user: this.settings.smtpUser,
            pass: this.settings.smtpPassword,
          },
        });
        console.log(`✓ Email service initialized with SMTP for org ${this.orgId}`);
      }

      this.initialized = true;

      if (!this.resend && !this.smtpTransporter) {
        console.warn(`⚠️  Email service not configured for org ${this.orgId}`);
      }
    } catch (error) {
      console.error('Failed to initialize email service:', error);
      this.initialized = true; // Mark as initialized to prevent retry loop
    }
  }

  /**
   * Reload settings from database
   */
  async reload(): Promise<void> {
    this.initialized = false;
    this.resend = null;
    this.smtpTransporter = null;
    await this.initialize();
  }

  // ============================================================================
  // CORE SEND METHOD
  // ============================================================================

  /**
   * Send an email using Resend (primary) or SMTP (fallback)
   */
  async send(options: EmailOptions): Promise<EmailResult> {
    await this.initialize();

    if (!this.settings?.enabled) {
      return {
        success: false,
        error: 'Email service is disabled',
        provider: 'resend',
      };
    }

    const from = `${this.settings.fromName} <${this.settings.fromEmail}>`;
    const replyTo = options.replyTo || this.settings.replyToEmail;

    // Determine which provider to use
    const useResend = this.settings.provider === 'resend' || 
      (this.settings.provider === 'auto' && this.resend);

    // Try Resend first
    if (useResend && this.resend) {
      try {
        const result = await this.resend.emails.send({
          from,
          to: Array.isArray(options.to) ? options.to : [options.to],
          subject: options.subject,
          html: options.html,
          text: options.text,
          replyTo: replyTo,
          cc: options.cc ? (Array.isArray(options.cc) ? options.cc : [options.cc]) : undefined,
          bcc: options.bcc ? (Array.isArray(options.bcc) ? options.bcc : [options.bcc]) : undefined,
          tags: options.tags,
        });

        if (result.error) {
          throw new Error(result.error.message);
        }

        return {
          success: true,
          messageId: result.data?.id,
          provider: 'resend',
        };
      } catch (error) {
        console.error('Resend email failed:', error);
        // Fall through to SMTP if available and provider is 'auto'
        if (this.settings.provider !== 'auto' || !this.smtpTransporter) {
          return {
            success: false,
            error: error instanceof Error ? error.message : 'Failed to send email via Resend',
            provider: 'resend',
          };
        }
      }
    }

    // Try SMTP
    if (this.smtpTransporter) {
      try {
        const result = await this.smtpTransporter.sendMail({
          from,
          to: Array.isArray(options.to) ? options.to.join(', ') : options.to,
          subject: options.subject,
          html: options.html,
          text: options.text,
          replyTo: replyTo,
          cc: options.cc
            ? Array.isArray(options.cc)
              ? options.cc.join(', ')
              : options.cc
            : undefined,
          bcc: options.bcc
            ? Array.isArray(options.bcc)
              ? options.bcc.join(', ')
              : options.bcc
            : undefined,
        });

        return {
          success: true,
          messageId: result.messageId,
          provider: 'smtp',
        };
      } catch (error) {
        console.error('SMTP email failed:', error);
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Failed to send email via SMTP',
          provider: 'smtp',
        };
      }
    }

    return {
      success: false,
      error: 'Email service not configured',
      provider: 'resend',
    };
  }

  // ============================================================================
  // EMAIL TEMPLATES
  // ============================================================================

  /**
   * Send password reset email
   */
  async sendPasswordReset(data: PasswordResetEmailData): Promise<EmailResult> {
    await this.initialize();
    
    if (!this.settings?.passwordResetEnabled) {
      return { success: false, error: 'Password reset emails are disabled', provider: 'resend' };
    }

    const resetUrl = `${this.appUrl}/auth/reset-password?token=${data.resetToken}`;
    const expiresIn = data.expiresIn || '1 hour';

    const html = this.getPasswordResetTemplate({
      name: data.name || 'User',
      resetUrl,
      expiresIn,
    });

    return this.send({
      to: data.email,
      subject: 'Reset Your Password - MantisNXT',
      html,
      text: `Reset your password by visiting: ${resetUrl}\n\nThis link expires in ${expiresIn}.`,
      tags: [{ name: 'type', value: 'password-reset' }],
    });
  }

  /**
   * Send welcome email to new users
   */
  async sendWelcome(data: WelcomeEmailData): Promise<EmailResult> {
    await this.initialize();
    
    if (!this.settings?.welcomeEmailEnabled) {
      return { success: false, error: 'Welcome emails are disabled', provider: 'resend' };
    }

    const loginUrl = data.loginUrl || `${this.appUrl}/auth/login`;

    const html = this.getWelcomeTemplate({
      name: data.name,
      loginUrl,
    });

    return this.send({
      to: data.email,
      subject: 'Welcome to MantisNXT',
      html,
      text: `Welcome to MantisNXT, ${data.name}!\n\nYour account has been created successfully.\n\nLogin at: ${loginUrl}`,
      tags: [{ name: 'type', value: 'welcome' }],
    });
  }

  /**
   * Send invitation email to new users
   */
  async sendInvitation(data: InvitationEmailData): Promise<EmailResult> {
    await this.initialize();
    
    if (!this.settings?.invitationEmailEnabled) {
      return { success: false, error: 'Invitation emails are disabled', provider: 'resend' };
    }

    const setupUrl = data.setupUrl || `${this.appUrl}/auth/login`;

    const html = this.getInvitationTemplate({
      name: data.name,
      inviterName: data.inviterName,
      tempPassword: data.tempPassword,
      setupUrl,
      role: data.role,
    });

    const textContent = data.tempPassword
      ? `You've been invited to MantisNXT by ${data.inviterName}.\n\nYour temporary password: ${data.tempPassword}\n\nPlease login and change your password immediately.`
      : `You've been invited to MantisNXT by ${data.inviterName}.\n\nSet up your account at: ${setupUrl}`;

    return this.send({
      to: data.email,
      subject: `You've been invited to MantisNXT`,
      html,
      text: textContent,
      tags: [{ name: 'type', value: 'invitation' }],
    });
  }

  /**
   * Send purchase order approval request
   */
  async sendPOApproval(data: POApprovalEmailData): Promise<EmailResult> {
    await this.initialize();
    
    if (!this.settings?.poApprovalEnabled) {
      return { success: false, error: 'PO approval emails are disabled', provider: 'resend' };
    }

    const html = this.getPOApprovalTemplate(data);

    return this.send({
      to: data.email,
      subject: `Purchase Order #${data.poNumber} Requires Approval`,
      html,
      text: `A purchase order requires your approval:\n\nPO Number: ${data.poNumber}\nSupplier: ${data.supplierName}\nAmount: ${data.amount}\n\nApprove at: ${data.approvalUrl}`,
      tags: [{ name: 'type', value: 'po-approval' }],
    });
  }

  /**
   * Send invoice payment reminder
   */
  async sendInvoiceReminder(data: InvoiceReminderEmailData): Promise<EmailResult> {
    await this.initialize();
    
    if (!this.settings?.invoiceReminderEnabled) {
      return { success: false, error: 'Invoice reminder emails are disabled', provider: 'resend' };
    }

    const html = this.getInvoiceReminderTemplate(data);

    return this.send({
      to: data.email,
      subject: `Payment Reminder - Invoice #${data.invoiceNumber}`,
      html,
      text: `This is a reminder that Invoice #${data.invoiceNumber} is due for payment.\n\nDue Date: ${data.dueDate}\nAmount: ${data.amount}`,
      tags: [{ name: 'type', value: 'invoice-reminder' }],
    });
  }

  /**
   * Send test email
   */
  async sendTestEmail(data: TestEmailData): Promise<EmailResult> {
    await this.initialize();

    const html = this.getTestEmailTemplate();

    const result = await this.send({
      to: data.email,
      subject: 'Test Email - MantisNXT',
      html,
      text: 'This is a test email from MantisNXT. If you received this, your email configuration is working correctly.',
      tags: [{ name: 'type', value: 'test' }],
    });

    // Update test results in database
    await EmailSettingsService.updateTestResults(
      this.orgId,
      result.success,
      result.error
    );

    return result;
  }

  // ============================================================================
  // HTML TEMPLATES
  // ============================================================================

  private getBaseTemplate(content: string): string {
    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>MantisNXT</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      line-height: 1.6;
      color: #333;
      margin: 0;
      padding: 0;
      background-color: #f5f5f5;
    }
    .container {
      max-width: 600px;
      margin: 0 auto;
      padding: 20px;
    }
    .card {
      background: #ffffff;
      border-radius: 8px;
      box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
      padding: 32px;
      margin: 20px 0;
    }
    .logo {
      text-align: center;
      margin-bottom: 24px;
    }
    .logo h1 {
      color: #0066cc;
      font-size: 28px;
      margin: 0;
    }
    .button {
      display: inline-block;
      background-color: #0066cc;
      color: #ffffff !important;
      text-decoration: none;
      padding: 12px 24px;
      border-radius: 6px;
      font-weight: 600;
      margin: 16px 0;
    }
    .button:hover {
      background-color: #0052a3;
    }
    .footer {
      text-align: center;
      color: #666;
      font-size: 12px;
      margin-top: 24px;
      padding-top: 16px;
      border-top: 1px solid #eee;
    }
    .highlight {
      background-color: #f0f7ff;
      padding: 16px;
      border-radius: 6px;
      margin: 16px 0;
    }
    .code {
      font-family: monospace;
      background-color: #f5f5f5;
      padding: 4px 8px;
      border-radius: 4px;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="card">
      <div class="logo">
        <h1>MantisNXT</h1>
      </div>
      ${content}
      <div class="footer">
        <p>&copy; ${new Date().getFullYear()} MantisNXT. All rights reserved.</p>
        <p>This is an automated message. Please do not reply directly to this email.</p>
      </div>
    </div>
  </div>
</body>
</html>`;
  }

  private getPasswordResetTemplate(data: {
    name: string;
    resetUrl: string;
    expiresIn: string;
  }): string {
    return this.getBaseTemplate(`
      <h2>Reset Your Password</h2>
      <p>Hi ${data.name},</p>
      <p>We received a request to reset your password. Click the button below to create a new password:</p>
      <p style="text-align: center;">
        <a href="${data.resetUrl}" class="button">Reset Password</a>
      </p>
      <p class="highlight">
        <strong>Note:</strong> This link will expire in ${data.expiresIn}. If you didn't request this reset, you can safely ignore this email.
      </p>
      <p style="font-size: 12px; color: #666;">
        If the button doesn't work, copy and paste this link into your browser:<br>
        <span class="code">${data.resetUrl}</span>
      </p>
    `);
  }

  private getWelcomeTemplate(data: { name: string; loginUrl: string }): string {
    return this.getBaseTemplate(`
      <h2>Welcome to MantisNXT!</h2>
      <p>Hi ${data.name},</p>
      <p>Your account has been created successfully. You now have access to our supply chain management platform.</p>
      <p style="text-align: center;">
        <a href="${data.loginUrl}" class="button">Login to Your Account</a>
      </p>
      <div class="highlight">
        <strong>Getting Started:</strong>
        <ul>
          <li>Complete your profile settings</li>
          <li>Explore the dashboard</li>
          <li>Review available features</li>
        </ul>
      </div>
      <p>If you have any questions, our support team is here to help.</p>
    `);
  }

  private getInvitationTemplate(data: {
    name: string;
    inviterName: string;
    tempPassword?: string;
    setupUrl: string;
    role?: string;
  }): string {
    const passwordSection = data.tempPassword
      ? `
        <div class="highlight">
          <strong>Your temporary password:</strong><br>
          <span class="code">${data.tempPassword}</span><br>
          <small>Please change this after your first login.</small>
        </div>
      `
      : '';

    const roleSection = data.role ? `<p>You have been assigned the role: <strong>${data.role}</strong></p>` : '';

    return this.getBaseTemplate(`
      <h2>You've Been Invited!</h2>
      <p>Hi ${data.name},</p>
      <p><strong>${data.inviterName}</strong> has invited you to join MantisNXT, our supply chain management platform.</p>
      ${roleSection}
      ${passwordSection}
      <p style="text-align: center;">
        <a href="${data.setupUrl}" class="button">Set Up Your Account</a>
      </p>
      <p>If you have any questions, please contact your administrator.</p>
    `);
  }

  private getPOApprovalTemplate(data: POApprovalEmailData): string {
    return this.getBaseTemplate(`
      <h2>Purchase Order Approval Required</h2>
      <p>Hi ${data.approverName},</p>
      <p>A new purchase order requires your approval:</p>
      <div class="highlight">
        <table style="width: 100%; border-collapse: collapse;">
          <tr>
            <td style="padding: 8px 0;"><strong>PO Number:</strong></td>
            <td style="padding: 8px 0;">${data.poNumber}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0;"><strong>Supplier:</strong></td>
            <td style="padding: 8px 0;">${data.supplierName}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0;"><strong>Amount:</strong></td>
            <td style="padding: 8px 0;">${data.amount}</td>
          </tr>
        </table>
      </div>
      <p style="text-align: center;">
        <a href="${data.approvalUrl}" class="button">Review & Approve</a>
      </p>
    `);
  }

  private getInvoiceReminderTemplate(data: InvoiceReminderEmailData): string {
    return this.getBaseTemplate(`
      <h2>Payment Reminder</h2>
      <p>Hi ${data.recipientName},</p>
      <p>This is a friendly reminder that the following invoice is due for payment:</p>
      <div class="highlight">
        <table style="width: 100%; border-collapse: collapse;">
          <tr>
            <td style="padding: 8px 0;"><strong>Invoice Number:</strong></td>
            <td style="padding: 8px 0;">${data.invoiceNumber}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0;"><strong>Amount Due:</strong></td>
            <td style="padding: 8px 0;">${data.amount}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0;"><strong>Due Date:</strong></td>
            <td style="padding: 8px 0;">${data.dueDate}</td>
          </tr>
        </table>
      </div>
      ${data.paymentUrl ? `<p style="text-align: center;"><a href="${data.paymentUrl}" class="button">Make Payment</a></p>` : ''}
      <p>Please process this payment at your earliest convenience.</p>
    `);
  }

  private getTestEmailTemplate(): string {
    return this.getBaseTemplate(`
      <h2>Test Email</h2>
      <p>This is a test email from MantisNXT.</p>
      <div class="highlight">
        <p><strong>✓ Email configuration is working correctly!</strong></p>
        <p>Sent at: ${new Date().toISOString()}</p>
      </div>
      <p>If you received this email, your email settings are properly configured.</p>
    `);
  }

  // ============================================================================
  // UTILITY METHODS
  // ============================================================================

  /**
   * Check if email service is configured
   */
  async isConfigured(): Promise<boolean> {
    await this.initialize();
    return (this.resend !== null || this.smtpTransporter !== null) && (this.settings?.enabled ?? false);
  }

  /**
   * Get current provider status
   */
  async getProviderStatus(): Promise<{ resend: boolean; smtp: boolean; enabled: boolean }> {
    await this.initialize();
    return {
      resend: this.resend !== null,
      smtp: this.smtpTransporter !== null,
      enabled: this.settings?.enabled ?? false,
    };
  }

  /**
   * Get settings (for API responses)
   */
  async getSettings(): Promise<EmailSettings | null> {
    await this.initialize();
    return this.settings;
  }
}

// ============================================================================
// FACTORY FUNCTION
// ============================================================================

const emailServiceCache = new Map<string, EmailService>();

/**
 * Get or create an EmailService instance for an organization
 */
export function getEmailService(orgId: string): EmailService {
  if (!emailServiceCache.has(orgId)) {
    emailServiceCache.set(orgId, new EmailService(orgId));
  }
  return emailServiceCache.get(orgId)!;
}

/**
 * Clear cached email service (useful after settings change)
 */
export function clearEmailServiceCache(orgId?: string): void {
  if (orgId) {
    emailServiceCache.delete(orgId);
  } else {
    emailServiceCache.clear();
  }
}

// Default export
export default EmailService;
