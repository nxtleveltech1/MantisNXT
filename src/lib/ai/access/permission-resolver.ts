/**
 * Permission Resolver
 * Handles permission resolution and access control logic
 */

import { EventEmitter } from 'events';
import {
  AccessLevel,
  AccessPolicy,
  Permission,
  ResourceType,
  AccessContext,
  accessPolicySchema,
  AccessDeniedError,
} from './types';
import { ToolDefinition } from '../tools/types';

export class PermissionResolver extends EventEmitter {
  private policies = new Map<string, AccessPolicy>();
  private defaultPolicy: AccessPolicy;

  constructor(defaultPolicy?: AccessPolicy) {
    super();

    // Set up default policy for basic read-only access
    this.defaultPolicy = defaultPolicy || {
      userId: 'default',
      orgId: 'default',
      permissions: [
        { resource: 'inventory', level: 'read-only' },
        { resource: 'suppliers', level: 'read-only' },
        { resource: 'orders', level: 'read-only' },
        { resource: 'customers', level: 'read-only' },
        { resource: 'analytics', level: 'read-only' },
        { resource: 'settings', level: 'read-only' },
      ],
      createdAt: new Date(),
      updatedAt: new Date(),
    };
  }

  /**
   * Resolve permission level for a specific user, org, resource, and action
   */
  resolvePermission(
    userId: string,
    orgId: string,
    resource: ResourceType,
    action?: string
  ): AccessLevel {
    const effectivePermissions = this.getEffectivePermissions(userId, orgId);
    const resourcePermission = effectivePermissions.find(p => p.resource === resource);

    if (!resourcePermission) {
      return 'read-only'; // Default to most restrictive
    }

    // For read-only resources, action doesn't matter
    if (resourcePermission.level === 'read-only') {
      return 'read-only';
    }

    // For read-write-approval, check if action requires approval
    if (resourcePermission.level === 'read-write-approval') {
      // Actions like 'create', 'update', 'delete' require approval
      // 'read' actions are allowed
      if (action && ['create', 'update', 'delete'].includes(action)) {
        return 'read-write-approval';
      }
      return 'read-only';
    }

    // Autonomous access
    return 'autonomous';
  }

  /**
   * Check if a tool can be executed in the given context
   */
  canExecute(context: AccessContext, tool: ToolDefinition): boolean {
    const requiredLevel = this.resolvePermission(
      context.userId,
      context.orgId,
      context.requestedResource,
      context.requestedAction
    );

    // Map tool access level to our access levels
    const toolLevel = this.mapToolAccessLevel(tool.accessLevel);

    return this.isLevelSufficient(requiredLevel, toolLevel);
  }

  /**
   * Get all effective permissions for a user in an org
   */
  getEffectivePermissions(userId: string, orgId: string): Permission[] {
    const userPolicy = this.loadUserPolicy(userId);
    const orgPolicy = this.loadOrgPolicy(orgId);

    return this.mergePermissions(userPolicy.permissions, orgPolicy.permissions);
  }

  /**
   * Load user-specific access policy
   * In production, this would fetch from database
   */
  loadUserPolicy(userId: string): AccessPolicy {
    // Check cache first
    if (this.policies.has(`user:${userId}`)) {
      return this.policies.get(`user:${userId}`)!;
    }

    // TODO: Fetch from database
    // For now, return default policy
    const policy = { ...this.defaultPolicy, userId };
    this.policies.set(`user:${userId}`, policy);
    return policy;
  }

  /**
   * Load organization-wide access policy
   * In production, this would fetch from database
   */
  loadOrgPolicy(orgId: string): AccessPolicy {
    // Check cache first
    if (this.policies.has(`org:${orgId}`)) {
      return this.policies.get(`org:${orgId}`)!;
    }

    // TODO: Fetch from database
    // For now, return default policy
    const policy = { ...this.defaultPolicy, orgId };
    this.policies.set(`org:${orgId}`, policy);
    return policy;
  }

  /**
   * Merge user and org permissions
   * User permissions take precedence over org permissions
   */
  mergePermissions(userPermissions: Permission[], orgPermissions: Permission[]): Permission[] {
    const merged = new Map<ResourceType, Permission>();

    // Add org permissions first
    orgPermissions.forEach(permission => {
      merged.set(permission.resource, permission);
    });

    // Override with user permissions
    userPermissions.forEach(permission => {
      merged.set(permission.resource, permission);
    });

    return Array.from(merged.values());
  }

  /**
   * Validate and set a user policy
   */
  setUserPolicy(userId: string, policy: AccessPolicy): void {
    const validatedPolicy = accessPolicySchema.parse(policy);
    this.policies.set(`user:${userId}`, validatedPolicy);
    this.emit('policyUpdated', { type: 'user', id: userId, policy: validatedPolicy });
  }

  /**
   * Validate and set an org policy
   */
  setOrgPolicy(orgId: string, policy: AccessPolicy): void {
    const validatedPolicy = accessPolicySchema.parse(policy);
    this.policies.set(`org:${orgId}`, validatedPolicy);
    this.emit('policyUpdated', { type: 'org', id: orgId, policy: validatedPolicy });
  }

  /**
   * Clear policy cache for a specific user/org
   */
  clearCache(identifier: string): void {
    const keysToDelete = Array.from(this.policies.keys()).filter(key =>
      key.endsWith(`:${identifier}`)
    );
    keysToDelete.forEach(key => this.policies.delete(key));
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): { size: number; keys: string[] } {
    return {
      size: this.policies.size,
      keys: Array.from(this.policies.keys()),
    };
  }

  /**
   * Map ToolAccessLevel to our AccessLevel
   */
  private mapToolAccessLevel(toolLevel: string): AccessLevel {
    switch (toolLevel) {
      case 'read-only':
        return 'read-only';
      case 'read-write-approval':
        return 'read-write-approval';
      case 'autonomous':
        return 'autonomous';
      default:
        return 'read-only'; // Default to most restrictive
    }
  }

  /**
   * Check if required level is sufficient for requested level
   */
  private isLevelSufficient(required: AccessLevel, requested: AccessLevel): boolean {
    const levelHierarchy: Record<AccessLevel, number> = {
      'read-only': 1,
      'read-write-approval': 2,
      'autonomous': 3,
    };

    return levelHierarchy[required] >= levelHierarchy[requested];
  }

  /**
   * Check access and throw error if denied
   */
  checkAccess(context: AccessContext, tool: ToolDefinition): void {
    if (!this.canExecute(context, tool)) {
      const requiredLevel = this.resolvePermission(
        context.userId,
        context.orgId,
        context.requestedResource,
        context.requestedAction
      );

      throw new AccessDeniedError(
        `Access denied for ${context.requestedAction} on ${context.requestedResource}`,
        context.requestedResource,
        requiredLevel,
        tool.accessLevel as AccessLevel
      );
    }
  }
}

// Default instance
export const permissionResolver = new PermissionResolver();