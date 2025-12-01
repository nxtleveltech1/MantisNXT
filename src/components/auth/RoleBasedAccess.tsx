'use client';

import React from 'react';
import { useAuth } from '@/lib/auth/auth-context';

interface RoleBasedAccessProps {
  children: React.ReactNode;
  requiredRole?: string;
  requiredRoles?: string[];
  requiredPermission?: string;
  requiredPermissions?: string[];
  fallback?: React.ReactNode;
  showFallback?: boolean;
}

export const RoleBasedAccess: React.FC<RoleBasedAccessProps> = ({
  children,
  requiredRole,
  requiredRoles,
  requiredPermission,
  requiredPermissions,
  fallback = null,
  showFallback = false,
}) => {
  const { user, isLoading } = useAuth();

  // Show loading state
  if (isLoading) {
    return (
      <div className="animate-pulse">
        <div className="mb-2 h-4 w-3/4 rounded bg-gray-200"></div>
        <div className="h-4 w-1/2 rounded bg-gray-200"></div>
      </div>
    );
  }

  // No user - show fallback or nothing
  if (!user) {
    return showFallback ? (
      <div className="py-8 text-center">
        <div className="text-gray-500">Authentication required</div>
      </div>
    ) : null;
  }

  // Check role requirements
  if (requiredRole && user.role?.name !== requiredRole) {
    return showFallback ? (
      <div className="py-8 text-center">
        <div className="text-gray-500">Insufficient role: {requiredRole} required</div>
      </div>
    ) : null;
  }

  if (requiredRoles && !requiredRoles.includes(user.role?.name || '')) {
    return showFallback ? (
      <div className="py-8 text-center">
        <div className="text-gray-500">
          Insufficient role: One of {requiredRoles.join(', ')} required
        </div>
      </div>
    ) : null;
  }

  // Check permission requirements
  if (requiredPermission && !hasPermission(user, requiredPermission)) {
    return showFallback ? (
      <div className="py-8 text-center">
        <div className="text-gray-500">Insufficient permission: {requiredPermission} required</div>
      </div>
    ) : null;
  }

  if (
    requiredPermissions &&
    !requiredPermissions.every(permission => hasPermission(user, permission))
  ) {
    return showFallback ? (
      <div className="py-8 text-center">
        <div className="text-gray-500">
          Insufficient permissions: {requiredPermissions.join(', ')} required
        </div>
      </div>
    ) : null;
  }

  // All checks passed - render children
  return <>{children}</>;
};

// Helper function to check permissions
function hasPermission(user: unknown, permission: string): boolean {
  if (!user) return false;

  // Check role permissions
  if (user.role?.permissions) {
    const rolePermissions = user.role.permissions.map((p: unknown) => p.name);
    if (rolePermissions.includes(permission)) return true;
  }

  // Check direct user permissions
  if (user.permissions) {
    const userPermissions = user.permissions.map((p: unknown) => p.name);
    if (userPermissions.includes(permission)) return true;
  }

  return false;
}

// Higher-order component for role-based access
export function withRoleAccess<P extends object>(
  Component: React.ComponentType<P>,
  accessConfig: {
    requiredRole?: string;
    requiredRoles?: string[];
    requiredPermission?: string;
    requiredPermissions?: string[];
    fallback?: React.ReactNode;
  }
) {
  return function RoleProtectedComponent(props: P) {
    return (
      <RoleBasedAccess {...accessConfig}>
        <Component {...props} />
      </RoleBasedAccess>
    );
  };
}

// Hook for checking permissions in components
export function usePermissions() {
  const { user } = useAuth();

  const hasPermission = React.useCallback(
    (permission: string): boolean => {
      if (!user) return false;

      // Check role permissions
      if (user.role?.permissions) {
        const rolePermissions = user.role.permissions.map((p: unknown) => p.name);
        if (rolePermissions.includes(permission)) return true;
      }

      // Check direct user permissions
      if (user.permissions) {
        const userPermissions = user.permissions.map((p: unknown) => p.name);
        if (userPermissions.includes(permission)) return true;
      }

      return false;
    },
    [user]
  );

  const hasRole = React.useCallback(
    (roleName: string): boolean => {
      if (!user) return false;
      return user.role?.name === roleName;
    },
    [user]
  );

  const hasAnyRole = React.useCallback(
    (roleNames: string[]): boolean => {
      if (!user) return false;
      return roleNames.includes(user.role?.name || '');
    },
    [user]
  );

  const hasAllPermissions = React.useCallback(
    (permissions: string[]): boolean => {
      if (!user) return false;
      return permissions.every(permission => hasPermission(permission));
    },
    [user, hasPermission]
  );

  const hasAnyPermission = React.useCallback(
    (permissions: string[]): boolean => {
      if (!user) return false;
      return permissions.some(permission => hasPermission(permission));
    },
    [user, hasPermission]
  );

  return {
    hasPermission,
    hasRole,
    hasAnyRole,
    hasAllPermissions,
    hasAnyPermission,
    user,
    permissions: user?.permissions || [],
    role: user?.role?.name || null,
  };
}

export default RoleBasedAccess;
