/**
 * Document Permissions Service
 * 
 * Service for managing document access control and sharing.
 */

import { query } from '@/lib/database';
import type {
  DocumentPermission,
  DocumentShare,
  GrantPermissionInput,
  CreateShareLinkInput,
  PermissionType,
} from './permissions-types';
import { v4 as uuidv4 } from 'uuid';
import { randomBytes } from 'crypto';

export class PermissionsService {
  /**
   * Grant permission to user or role
   */
  static async grantPermission(input: GrantPermissionInput): Promise<DocumentPermission> {
    if (!input.user_id && !input.role_id) {
      throw new Error('Either user_id or role_id must be provided');
    }

    if (input.user_id && input.role_id) {
      throw new Error('Cannot specify both user_id and role_id');
    }

    // Validate user exists if provided
    if (input.user_id) {
      const userResult = await query<{ id: string }>(
        `SELECT id FROM auth.users_extended WHERE id = $1`,
        [input.user_id]
      );

      if (userResult.rows.length === 0) {
        throw new Error('User not found');
      }
    }

    // Validate role exists if provided
    if (input.role_id) {
      const roleResult = await query<{ id: string }>(
        `SELECT id FROM auth.roles WHERE id = $1`,
        [input.role_id]
      );

      if (roleResult.rows.length === 0) {
        throw new Error('Role not found');
      }
    }

    const permissionId = uuidv4();

    const result = await query<DocumentPermission>(
      `INSERT INTO docustore.document_permissions (
        id, document_id, user_id, role_id, permission_type, granted_by, expires_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *`,
      [
        permissionId,
        input.document_id,
        input.user_id || null,
        input.role_id || null,
        input.permission_type,
        input.granted_by || null,
        input.expires_at || null,
      ]
    );

    return result.rows[0];
  }

  /**
   * Revoke permission
   */
  static async revokePermission(permissionId: string): Promise<void> {
    await query(`DELETE FROM docustore.document_permissions WHERE id = $1`, [permissionId]);
  }

  /**
   * Check user permission
   */
  static async checkPermission(
    documentId: string,
    userId: string,
    permissionType: PermissionType
  ): Promise<boolean> {
    // Check direct user permission
    const userResult = await query<DocumentPermission>(
      `SELECT * FROM docustore.document_permissions 
       WHERE document_id = $1 AND user_id = $2 AND permission_type = $3
       AND (expires_at IS NULL OR expires_at > now())`,
      [documentId, userId, permissionType]
    );

    if (userResult.rows.length > 0) {
      return true;
    }

    // Check role-based permission
    const roleResult = await query<DocumentPermission>(
      `SELECT p.* FROM docustore.document_permissions p
       INNER JOIN auth.user_roles ur ON p.role_id = ur.role_id
       WHERE p.document_id = $1 AND ur.user_id = $2 AND p.permission_type = $3
       AND (p.expires_at IS NULL OR p.expires_at > now())`,
      [documentId, userId, permissionType]
    );

    return roleResult.rows.length > 0;
  }

  /**
   * Create shareable link
   */
  static async createShareLink(input: CreateShareLinkInput): Promise<DocumentShare> {
    const shareId = uuidv4();

    // Generate secure token
    const shareToken = randomBytes(32).toString('base64url');

    const result = await query<DocumentShare>(
      `INSERT INTO docustore.document_shares (
        id, document_id, share_token, access_level, expires_at, created_by
      ) VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *`,
      [
        shareId,
        input.document_id,
        shareToken,
        input.access_level || 'read',
        input.expires_at || null,
        input.created_by || null,
      ]
    );

    return result.rows[0];
  }

  /**
   * Revoke share link
   */
  static async revokeShareLink(shareId: string): Promise<void> {
    await query(`DELETE FROM docustore.document_shares WHERE id = $1`, [shareId]);
  }

  /**
   * Get all permissions for document
   */
  static async getDocumentPermissions(documentId: string): Promise<DocumentPermission[]> {
    const result = await query<DocumentPermission>(
      `SELECT * FROM docustore.document_permissions 
       WHERE document_id = $1
       ORDER BY created_at DESC`,
      [documentId]
    );

    return result.rows;
  }

  /**
   * Validate share token and check expiration
   */
  static async validateShareToken(token: string): Promise<DocumentShare | null> {
    const result = await query<DocumentShare>(
      `SELECT * FROM docustore.document_shares 
       WHERE share_token = $1
       AND (expires_at IS NULL OR expires_at > now())`,
      [token]
    );

    if (result.rows.length === 0) {
      return null;
    }

    return result.rows[0];
  }
}

