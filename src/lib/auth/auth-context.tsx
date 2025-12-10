'use client';

import React, { createContext, useContext, useCallback, useMemo } from 'react';
import { useUser, useAuth as useClerkAuth, useClerk } from '@clerk/nextjs';
import type { User, Permission, UserPreferences, Address } from '@/types/auth';

// Extended Clerk user metadata types
interface ClerkUserPublicMetadata {
  role?: User['role'];
  org_id?: string;
  department?: string;
  permissions?: Permission[];
  phone?: string;
  mobile?: string;
  id_number?: string;
  employment_equity?: User['employment_equity'];
  bee_status?: string;
  address?: Address;
  preferences?: UserPreferences;
}

// Auth context type (preserved from original)
export interface AuthContext {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  signOut: () => Promise<void>;
  hasPermission: (permission: string) => boolean;
  hasRole: (roleName: string) => boolean;
  canAccess: (module: string, action: string) => boolean;
}

// Create context
const AuthContextProvider = createContext<AuthContext | null>(null);

// Helper to map Clerk user to our User type
function mapClerkUserToUser(clerkUser: ReturnType<typeof useUser>['user']): User | null {
  if (!clerkUser) return null;

  const metadata = (clerkUser.publicMetadata || {}) as ClerkUserPublicMetadata;

  // Default preferences
  const defaultPreferences: UserPreferences = {
    language: 'en',
    timezone: 'Africa/Johannesburg',
    date_format: 'dd/mm/yyyy',
    currency: 'ZAR',
    notifications: {
      email_notifications: true,
      sms_notifications: false,
      push_notifications: true,
      digest_frequency: 'daily',
    },
  };

  // Safely get dates with fallbacks
  const createdAt = new Date(clerkUser.createdAt);
  const lastSignIn = clerkUser.lastSignInAt ? new Date(clerkUser.lastSignInAt) : createdAt;
  const updatedAt = clerkUser.updatedAt ? new Date(clerkUser.updatedAt) : createdAt;

  return {
    id: clerkUser.id,
    email: clerkUser.primaryEmailAddress?.emailAddress || '',
    name: `${clerkUser.firstName || ''} ${clerkUser.lastName || ''}`.trim() || 'User',
    role: metadata.role || 'user',
    org_id: metadata.org_id || '',
    department: metadata.department || '',
    permissions: metadata.permissions || [],
    created_at: createdAt,
    last_login: lastSignIn,
    is_active: true,
    profile_image: clerkUser.imageUrl,
    id_number: metadata.id_number,
    employment_equity: metadata.employment_equity,
    phone: metadata.phone || '',
    mobile: metadata.mobile,
    address: metadata.address,
    preferences: metadata.preferences || defaultPreferences,
    two_factor_enabled: clerkUser.twoFactorEnabled,
    email_verified: clerkUser.primaryEmailAddress?.verification?.status === 'verified',
    password_changed_at: clerkUser.passwordEnabled ? updatedAt : createdAt,
  };
}

// Provider component
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const { user: clerkUser, isLoaded: isUserLoaded } = useUser();
  const { isLoaded: isAuthLoaded, isSignedIn } = useClerkAuth();
  const { signOut: clerkSignOut } = useClerk();

  // Map Clerk user to our User type
  const user = useMemo(() => mapClerkUserToUser(clerkUser), [clerkUser]);

  // Loading state
  const isLoading = !isUserLoaded || !isAuthLoaded;

  // Sign out method
  const signOut = useCallback(async (): Promise<void> => {
    try {
      await clerkSignOut();
    } catch (error) {
      console.error('Sign out error:', error);
      throw error;
    }
  }, [clerkSignOut]);

  // Permission checking utilities
  const hasPermission = useCallback(
    (permission: string): boolean => {
      if (!user) return false;

      // Admin roles have all permissions
      if (user.role === 'super_admin' || user.role === 'admin') {
        return true;
      }

      // Check if user has the specific permission
      return user.permissions.some(p => p.name === permission);
    },
    [user]
  );

  const hasRole = useCallback(
    (roleName: string): boolean => {
      if (!user) return false;
      return user.role === roleName;
    },
    [user]
  );

  const canAccess = useCallback(
    (module: string, action: string): boolean => {
      if (!user) return false;

      // Admin roles have access to everything
      if (user.role === 'super_admin' || user.role === 'admin') {
        return true;
      }

      // Manager role has elevated access
      if (user.role === 'manager') {
        // Managers can read and manage most things except admin-specific modules
        const adminOnlyModules = ['system', 'billing', 'organizations'];
        if (!adminOnlyModules.includes(module)) {
          return true;
        }
      }

      // Check specific permission
      const permissionName = `${module}.${action}`;
      return hasPermission(permissionName);
    },
    [user, hasPermission]
  );

  // Computed values
  const isAuthenticated = isSignedIn === true && user !== null;

  // Context value
  const contextValue: AuthContext = useMemo(
    () => ({
      user,
      isLoading,
      isAuthenticated,
      signOut,
      hasPermission,
      hasRole,
      canAccess,
    }),
    [user, isLoading, isAuthenticated, signOut, hasPermission, hasRole, canAccess]
  );

  return (
    <AuthContextProvider.Provider value={contextValue}>{children}</AuthContextProvider.Provider>
  );
}

// Hook to use auth context
export function useAuth(): AuthContext {
  const context = useContext(AuthContextProvider);

  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }

  return context;
}

// Hook for protected routes
export function useRequireAuth(): User {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    throw new Error('Auth is still loading');
  }

  if (!user) {
    throw new Error('Authentication required');
  }

  return user;
}

// Higher-order component for protected routes
export function withAuth<P extends object>(
  Component: React.ComponentType<P>
): React.ComponentType<P> {
  return function AuthenticatedComponent(props: P) {
    const { user, isLoading } = useAuth();

    if (isLoading) {
      return (
        <div className="flex min-h-screen items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-primary"></div>
        </div>
      );
    }

    if (!user) {
      // Redirect handled by Clerk middleware
      return (
        <div className="flex min-h-screen items-center justify-center">
          <div className="text-center">
            <h1 className="mb-4 text-2xl font-bold text-foreground">Authentication Required</h1>
            <p className="text-muted-foreground">Redirecting to sign in...</p>
          </div>
        </div>
      );
    }

    return <Component {...props} />;
  };
}

// Permission-based component wrapper
export function ProtectedComponent({
  children,
  permission,
  role,
  module,
  action,
  fallback,
}: {
  children: React.ReactNode;
  permission?: string;
  role?: string;
  module?: string;
  action?: string;
  fallback?: React.ReactNode;
}) {
  const { hasPermission, hasRole, canAccess } = useAuth();

  // Check permissions
  let hasAccess = true;

  if (permission && !hasPermission(permission)) {
    hasAccess = false;
  }

  if (role && !hasRole(role)) {
    hasAccess = false;
  }

  if (module && action && !canAccess(module, action)) {
    hasAccess = false;
  }

  if (!hasAccess) {
    return fallback || null;
  }

  return <>{children}</>;
}
