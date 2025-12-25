/**
 * Signing Workflow Service
 * 
 * Service for managing document signing workflows, signers, and signatures.
 */

import { query } from '@/lib/database';
import type {
  SigningWorkflow,
  DocumentSigner,
  DocumentSignature,
  SigningRecipient,
  CreateWorkflowInput,
  SignerInput,
  RecipientInput,
  SignatureMetadata,
  WorkflowStatus,
  SignerStatus,
} from './signing-types';
import { v4 as uuidv4 } from 'uuid';

export class SigningWorkflowService {
  /**
   * Create a new signing workflow
   */
  static async createWorkflow(input: CreateWorkflowInput): Promise<SigningWorkflow> {
    const workflowId = uuidv4();

    const result = await query<SigningWorkflow>(
      `INSERT INTO docustore.signing_workflows (
        id, document_id, status, expires_at, reminder_settings, created_by
      ) VALUES ($1, $2, 'draft', $3, $4, $5)
      RETURNING *`,
      [
        workflowId,
        input.document_id,
        input.expires_at || null,
        JSON.stringify(input.reminder_settings || {}),
        input.created_by || null,
      ]
    );

    const workflow = result.rows[0];

    // Update document with signing_workflow_id
    await query(
      `UPDATE docustore.documents 
       SET signing_workflow_id = $1, updated_at = now()
       WHERE id = $2`,
      [workflowId, input.document_id]
    );

    // Log event
    await query(
      `SELECT docustore.log_document_event($1, 'metadata_updated', $2, $3::jsonb)`,
      [
        input.document_id,
        input.created_by || null,
        JSON.stringify({ signing_workflow_created: workflowId }),
      ]
    );

    return workflow;
  }

  /**
   * Add a signer to a workflow
   */
  static async addSigner(workflowId: string, signer: SignerInput): Promise<DocumentSigner> {
    const signerId = uuidv4();

    // Validate email format
    const emailRegex = /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/i;
    if (!emailRegex.test(signer.email)) {
      throw new Error('Invalid email address');
    }

    const result = await query<DocumentSigner>(
      `INSERT INTO docustore.document_signers (
        id, workflow_id, user_id, email, name, role, "order", status
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, 'pending')
      RETURNING *`,
      [
        signerId,
        workflowId,
        signer.user_id || null,
        signer.email,
        signer.name,
        signer.role || null,
        signer.order,
      ]
    );

    return result.rows[0];
  }

  /**
   * Add a recipient (CC/BCC) to a workflow
   */
  static async addRecipient(workflowId: string, recipient: RecipientInput): Promise<SigningRecipient> {
    const recipientId = uuidv4();

    // Validate email format
    const emailRegex = /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/i;
    if (!emailRegex.test(recipient.email)) {
      throw new Error('Invalid email address');
    }

    const result = await query<SigningRecipient>(
      `INSERT INTO docustore.signing_recipients (
        id, workflow_id, email, name, type
      ) VALUES ($1, $2, $3, $4, $5)
      RETURNING *`,
      [
        recipientId,
        workflowId,
        recipient.email,
        recipient.name || null,
        recipient.type,
      ]
    );

    return result.rows[0];
  }

  /**
   * Update signer status
   */
  static async updateSignerStatus(signerId: string, status: SignerStatus): Promise<void> {
    const updates: string[] = ['status = $1', 'updated_at = now()'];

    if (status === 'viewed') {
      updates.push('viewed_at = now()');
    } else if (status === 'signed') {
      updates.push('signed_at = now()');
    } else if (status === 'declined') {
      updates.push('declined_at = now()');
    }

    await query(
      `UPDATE docustore.document_signers 
       SET ${updates.join(', ')}
       WHERE id = $2`,
      [status, signerId]
    );

    // Check if workflow should be updated
    const signerResult = await query<DocumentSigner>(
      `SELECT workflow_id FROM docustore.document_signers WHERE id = $1`,
      [signerId]
    );

    if (signerResult.rows.length > 0) {
      const workflowId = signerResult.rows[0].workflow_id;
      await this.checkAndUpdateWorkflowStatus(workflowId);
    }
  }

  /**
   * Record a signature
   */
  static async recordSignature(
    signerId: string,
    signatureData: string,
    metadata: SignatureMetadata
  ): Promise<DocumentSignature> {
    const signatureId = uuidv4();

    // Validate signature data is base64
    if (!signatureData || signatureData.length === 0) {
      throw new Error('Signature data is required');
    }

    const result = await query<DocumentSignature>(
      `INSERT INTO docustore.document_signatures (
        id, signer_id, signature_data, ip_address, user_agent
      ) VALUES ($1, $2, $3, $4, $5)
      RETURNING *`,
      [
        signatureId,
        signerId,
        signatureData,
        metadata.ip_address || null,
        metadata.user_agent || null,
      ]
    );

    // Update signer status
    await this.updateSignerStatus(signerId, 'signed');

    return result.rows[0];
  }

  /**
   * Send reminder to a signer
   */
  static async sendReminder(signerId: string, message?: string): Promise<void> {
    await query(
      `UPDATE docustore.document_signers 
       SET reminder_sent_at = now(), updated_at = now()
       WHERE id = $1`,
      [signerId]
    );

    // TODO: Integrate with email service to send actual reminder
    // For now, just update the timestamp
  }

  /**
   * Get workflow status with all signers
   */
  static async getWorkflowStatus(workflowId: string): Promise<WorkflowStatus> {
    // Get workflow
    const workflowResult = await query<SigningWorkflow>(
      `SELECT * FROM docustore.signing_workflows WHERE id = $1`,
      [workflowId]
    );

    if (workflowResult.rows.length === 0) {
      throw new Error('Workflow not found');
    }

    const workflow = workflowResult.rows[0];

    // Get signers
    const signersResult = await query<DocumentSigner>(
      `SELECT * FROM docustore.document_signers 
       WHERE workflow_id = $1 
       ORDER BY "order" ASC`,
      [workflowId]
    );

    const signers = signersResult.rows;

    // Get signatures
    const signaturesResult = await query<DocumentSignature>(
      `SELECT s.* FROM docustore.document_signatures s
       INNER JOIN docustore.document_signers ds ON s.signer_id = ds.id
       WHERE ds.workflow_id = $1`,
      [workflowId]
    );

    const signatures = signaturesResult.rows;

    // Get recipients
    const recipientsResult = await query<SigningRecipient>(
      `SELECT * FROM docustore.signing_recipients 
       WHERE workflow_id = $1`,
      [workflowId]
    );

    const recipients = recipientsResult.rows;

    // Find current signer (first pending signer)
    const currentSigner = signers.find((s) => s.status === 'pending' || s.status === 'sent') || null;

    // Check if complete
    const isComplete = signers.every((s) => s.status === 'signed');

    // Check if expired
    const isExpired =
      workflow.expires_at !== null &&
      workflow.expires_at !== undefined &&
      new Date(workflow.expires_at) < new Date();

    return {
      workflow,
      signers,
      signatures,
      recipients,
      current_signer: currentSigner,
      is_complete: isComplete,
      is_expired: isExpired,
    };
  }

  /**
   * Complete workflow when all signers have signed
   */
  static async completeWorkflow(workflowId: string): Promise<void> {
    await query(
      `UPDATE docustore.signing_workflows 
       SET status = 'completed', completed_at = now(), updated_at = now()
       WHERE id = $1`,
      [workflowId]
    );
  }

  /**
   * Void a workflow
   */
  static async voidWorkflow(workflowId: string, reason?: string): Promise<void> {
    await query(
      `UPDATE docustore.signing_workflows 
       SET status = 'voided', voided_at = now(), voided_reason = $1, updated_at = now()
       WHERE id = $2`,
      [reason || null, workflowId]
    );

    // TODO: Notify signers that workflow has been voided
  }

  /**
   * Check and update workflow status based on signer statuses
   */
  private static async checkAndUpdateWorkflowStatus(workflowId: string): Promise<void> {
    const status = await this.getWorkflowStatus(workflowId);

    if (status.is_complete && status.workflow.status !== 'completed') {
      await this.completeWorkflow(workflowId);
    } else if (status.workflow.status === 'draft' && status.signers.length > 0) {
      // Move to pending when first signer is added
      await query(
        `UPDATE docustore.signing_workflows 
         SET status = 'pending', updated_at = now()
         WHERE id = $1`,
        [workflowId]
      );
    } else if (
      status.workflow.status === 'pending' &&
      status.signers.some((s) => s.status === 'signed' || s.status === 'viewed')
    ) {
      // Move to in_progress when first signer views or signs
      await query(
        `UPDATE docustore.signing_workflows 
         SET status = 'in_progress', updated_at = now()
         WHERE id = $1`,
        [workflowId]
      );
    }
  }
}

