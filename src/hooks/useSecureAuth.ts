'use client';

import { useAuth } from '@/lib/auth/auth-context';
import { useEffect, useState } from 'react';

export interface SecureAuthState {
  isAuthenticated: boolean;
  isAdmin: boolean;
  isLoading: boolean;
  userRole: string | null;
  orgId: string | null;
}

/**
 * Secure authentication hook that provides enhanced security checks
 * - Validates authentication status
 * - Checks admin role for sensitive operations
 * - Manages organization context securely
 */
export function useSecureAuth() {
  const { user, isLoading, isAuthenticated } = useAuth();
  const [authState, setAuthState] = useState<SecureAuthState>({
    isAuthenticated: false,
    isAdmin: false,
    isLoading: true,
    userRole: null,
    orgId: null,
  });

  useEffect(() => {
    if (isLoading) {
      return;
    }

    if (!isAuthenticated || !user) {
      setAuthState({
        isAuthenticated: false,
        isAdmin: false,
        isLoading: false,
        userRole: null,
        orgId: null,
      });
      return;
    }

    // Validate user role and org ID
    const isAdmin = user.role === 'super_admin' || user.role === 'admin';
    const orgId = user.org_id;

    setAuthState({
      isAuthenticated: true,
      isAdmin,
      isLoading: false,
      userRole: user.role,
      orgId: orgId || null,
    });
  }, [user, isLoading, isAuthenticated]);

  return authState;
}

/**
 * Hook for admin-only operations with additional security checks
 */
export function useAdminAuth() {
  const auth = useSecureAuth();

  useEffect(() => {
    if (!auth.isLoading && !auth.isAdmin) {
      throw new Error('Insufficient permissions: Admin access required');
    }
  }, [auth.isLoading, auth.isAdmin]);

  return auth;
}

/**
 * Hook for validating organization context
 */
export function useOrgValidation() {
  const { orgId } = useSecureAuth();

  const validateOrgId = (providedOrgId: string | null): string => {
    // Validate UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

    if (!providedOrgId || !uuidRegex.test(providedOrgId)) {
      throw new Error('Invalid organization ID');
    }

    return providedOrgId;
  };

  return { orgId, validateOrgId };
}