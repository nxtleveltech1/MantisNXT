// @ts-nocheck
'use client';

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { AuthContext, AuthProvider as AuthProviderType, User, SignInCredentials, SignUpData, AuthResult } from '@/types/auth';
import { mockAuthProvider } from './mock-provider';

// Create context
const AuthContextProvider = createContext<AuthContext | null>(null);

// Provider component
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [authProvider] = useState<AuthProviderType>(mockAuthProvider);

  // Initialize auth state
  useEffect(() => {
    let mounted = true;

    const initializeAuth = async () => {
      try {
        setIsLoading(true);

        // Check if user is already signed in
        const currentUser = await authProvider.getCurrentUser();
        if (mounted) {
          setUser(currentUser);
        }
      } catch (error) {
        console.error('Auth initialization error:', error);
        if (mounted) {
          setUser(null);
        }
      } finally {
        if (mounted) {
          setIsLoading(false);
        }
      }
    };

    initializeAuth();

    return () => {
      mounted = false;
    };
  }, [authProvider]);

  // Sign in method
  const signIn = useCallback(async (credentials: SignInCredentials): Promise<AuthResult> => {
    try {
      setIsLoading(true);
      const result = await authProvider.signIn(credentials);

      if (result.success && result.user) {
        setUser(result.user);
      }

      return result;
    } catch (error) {
      console.error('Sign in error:', error);
      return {
        success: false,
        message: 'An unexpected error occurred',
        errors: [error instanceof Error ? error.message : 'Unknown error'],
      };
    } finally {
      setIsLoading(false);
    }
  }, [authProvider]);

  // Sign up method
  const signUp = useCallback(async (data: SignUpData): Promise<AuthResult> => {
    try {
      setIsLoading(true);
      const result = await authProvider.signUp(data);

      if (result.success && result.user) {
        setUser(result.user);
      }

      return result;
    } catch (error) {
      console.error('Sign up error:', error);
      return {
        success: false,
        message: 'An unexpected error occurred',
        errors: [error instanceof Error ? error.message : 'Unknown error'],
      };
    } finally {
      setIsLoading(false);
    }
  }, [authProvider]);

  // Sign out method
  const signOut = useCallback(async (): Promise<void> => {
    try {
      setIsLoading(true);
      await authProvider.signOut();
      setUser(null);
    } catch (error) {
      console.error('Sign out error:', error);
      // Even if signOut fails, clear local state
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  }, [authProvider]);

  // Update profile method
  const updateProfile = useCallback(async (data: Partial<User>): Promise<User> => {
    if (!user) {
      throw new Error('No user signed in');
    }

    try {
      const updatedUser = await authProvider.updateProfile(data);
      setUser(updatedUser);
      return updatedUser;
    } catch (error) {
      console.error('Update profile error:', error);
      throw error;
    }
  }, [authProvider, user]);

  // Permission checking utilities
  const hasPermission = useCallback((permission: string): boolean => {
    if (!user || !user.role) return false;

    // Check if user has the specific permission
    return user.role.permissions.some(p => p.name === permission) ||
           user.permissions.some(p => p.name === permission);
  }, [user]);

  const hasRole = useCallback((roleName: string): boolean => {
    if (!user || !user.role) return false;
    return user.role.name === roleName;
  }, [user]);

  const canAccess = useCallback((module: string, action: string): boolean => {
    if (!user) return false;

    // Admin role has access to everything
    if (user.role.name === 'super_admin' || user.role.name === 'org_admin') {
      return true;
    }

    // Check specific permission
    const permissionName = `${module}.${action}`;
    return hasPermission(permissionName);
  }, [user, hasPermission]);

  // Computed values
  const isAuthenticated = user !== null;

  // Context value
  const contextValue: AuthContext = {
    user,
    isLoading,
    isAuthenticated,
    signIn,
    signUp,
    signOut,
    updateProfile,
    hasPermission,
    hasRole,
    canAccess,
  };

  return (
    <AuthContextProvider.Provider value={contextValue}>
      {children}
    </AuthContextProvider.Provider>
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
        <div className="flex items-center justify-center min-h-screen">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      );
    }

    if (!user) {
      // In a real app, redirect to login page
      return (
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-gray-900 mb-4">Authentication Required</h1>
            <p className="text-gray-600">Please sign in to access this page.</p>
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