// @ts-nocheck
/**
 * API-based Authentication Provider
 *
 * This provider calls the real API endpoints for authentication,
 * which in turn query the database for user data.
 */

import type {
  AuthProvider,
  User,
  LoginCredentials,
  RegistrationData,
  CreateUserData,
  AuthResult,
  TwoFactorSetup,
  BulkImportResult,
} from '@/types/auth';

export class ApiAuthProvider implements AuthProvider {
  private currentUser: User | null = null;
  private authToken: string | null = null;
  private readonly STORAGE_KEY = 'mantis_auth_token';

  constructor() {
    // Restore token from localStorage on initialization
    if (typeof window !== 'undefined') {
      try {
        const stored = localStorage.getItem(this.STORAGE_KEY);
        if (stored) {
          this.authToken = stored;
        }
      } catch (error) {
        console.error('Failed to restore auth token:', error);
        localStorage.removeItem(this.STORAGE_KEY);
      }
    }
  }

  private saveToken(token: string | null): void {
    if (typeof window !== 'undefined') {
      try {
        if (token) {
          localStorage.setItem(this.STORAGE_KEY, token);
        } else {
          localStorage.removeItem(this.STORAGE_KEY);
        }
      } catch (error) {
        console.error('Failed to save auth token:', error);
      }
    }
  }

  async login(credentials: LoginCredentials): Promise<AuthResult> {
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: credentials.email,
          password: credentials.password,
          remember_me: credentials.remember_me || false,
          two_factor_code: credentials.two_factor_code,
        }),
      });

      const result = await response.json();

      if (!result.success) {
        return {
          success: false,
          message: result.message || 'Login failed',
          errors: [result.error],
          requires_two_factor: result.requires_two_factor,
          two_factor_token: result.two_factor_token,
        };
      }

      // Map API response user to User type
      const user = this.mapApiUserToUser(result.data.user);
      this.currentUser = user;
      this.authToken = result.data.token;
      this.saveToken(result.data.token);

      return {
        success: true,
        user,
        token: result.data.token,
        message: result.message,
      };
    } catch (error) {
      console.error('Login error:', error);
      return {
        success: false,
        message: 'An error occurred during login',
        errors: [error instanceof Error ? error.message : 'Unknown error'],
      };
    }
  }

  async logout(): Promise<void> {
    try {
      if (this.authToken) {
        await fetch('/api/auth/logout', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${this.authToken}`,
          },
        });
      }
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      this.currentUser = null;
      this.authToken = null;
      this.saveToken(null);
    }
  }

  // Alias for logout - used by auth-context
  async signOut(): Promise<void> {
    return this.logout();
  }

  async register(data: RegistrationData): Promise<AuthResult> {
    // Registration is admin-only, so this should not be called
    return {
      success: false,
      message: 'Self-registration is not available. Contact an administrator.',
      errors: ['REGISTRATION_DISABLED'],
    };
  }

  async resetPassword(email: string): Promise<void> {
    const response = await fetch('/api/auth/forgot-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    });

    if (!response.ok) {
      const result = await response.json().catch(() => ({}));
      throw new Error(result.message || 'Password reset request failed');
    }
  }

  async verifyEmail(token: string): Promise<boolean> {
    const response = await fetch('/api/auth/verify-email', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token }),
    });

    const result = await response.json();
    return result.success === true;
  }

  async setupTwoFactor(): Promise<TwoFactorSetup> {
    if (!this.authToken) {
      throw new Error('Not authenticated');
    }

    const response = await fetch('/api/auth/2fa/setup', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.authToken}`,
      },
    });

    if (!response.ok) {
      throw new Error('Failed to setup 2FA');
    }

    return response.json();
  }

  async verifyTwoFactor(token: string, code: string): Promise<boolean> {
    const response = await fetch('/api/auth/2fa/verify', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ code }),
    });

    const result = await response.json();
    return result.success === true;
  }

  async disableTwoFactor(password: string): Promise<boolean> {
    if (!this.authToken) {
      throw new Error('Not authenticated');
    }

    const response = await fetch('/api/auth/2fa/disable', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.authToken}`,
      },
      body: JSON.stringify({ password }),
    });

    const result = await response.json();
    return result.success === true;
  }

  async getCurrentUser(): Promise<User | null> {
    // Return cached user if we have it and the token
    if (this.currentUser && this.authToken) {
      return this.currentUser;
    }

    // If we have a token but no user, fetch from API
    if (this.authToken) {
      try {
        const response = await fetch('/api/auth/login', {
          method: 'GET',
          headers: {
            Authorization: `Bearer ${this.authToken}`,
          },
        });

        if (!response.ok) {
          // Token is invalid, clear it
          this.authToken = null;
          this.saveToken(null);
          return null;
        }

        const result = await response.json();
        if (result.success && result.data?.user) {
          this.currentUser = this.mapApiUserToUser(result.data.user);
          return this.currentUser;
        }
      } catch (error) {
        console.error('Get current user error:', error);
        this.authToken = null;
        this.saveToken(null);
      }
    }

    return null;
  }

  async refreshToken(): Promise<string> {
    if (!this.authToken) {
      throw new Error('No token to refresh');
    }

    const response = await fetch('/api/auth/refresh', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.authToken}`,
      },
    });

    if (!response.ok) {
      throw new Error('Failed to refresh token');
    }

    const result = await response.json();
    this.authToken = result.token;
    this.saveToken(result.token);
    return result.token;
  }

  async changePassword(oldPassword: string, newPassword: string): Promise<void> {
    if (!this.authToken) {
      throw new Error('Not authenticated');
    }

    const response = await fetch('/api/auth/change-password', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.authToken}`,
      },
      body: JSON.stringify({ old_password: oldPassword, new_password: newPassword }),
    });

    if (!response.ok) {
      const result = await response.json().catch(() => ({}));
      throw new Error(result.message || 'Failed to change password');
    }
  }

  async updateProfile(data: Partial<User>): Promise<User> {
    if (!this.authToken || !this.currentUser) {
      throw new Error('Not authenticated');
    }

    const response = await fetch('/api/auth/profile', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.authToken}`,
      },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      const result = await response.json().catch(() => ({}));
      throw new Error(result.message || 'Failed to update profile');
    }

    const result = await response.json();
    if (result.success && result.data) {
      this.currentUser = this.mapApiUserToUser(result.data);
    }

    return this.currentUser;
  }

  async createUser(data: CreateUserData): Promise<User> {
    if (!this.authToken) {
      throw new Error('Not authenticated');
    }

    const response = await fetch('/api/v1/admin/users', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.authToken}`,
      },
      body: JSON.stringify({
        email: data.email,
        displayName: data.name,
        firstName: data.name.split(' ')[0],
        lastName: data.name.split(' ').slice(1).join(' '),
        role: data.role,
        department: data.department,
        phone: data.phone,
        password: data.password,
        sendInvitation: data.send_invitation,
      }),
    });

    if (!response.ok) {
      const result = await response.json().catch(() => ({}));
      throw new Error(result.message || 'Failed to create user');
    }

    const result = await response.json();
    return this.mapApiUserToUser(result.data);
  }

  async updateUser(id: string, data: Partial<User>): Promise<User> {
    if (!this.authToken) {
      throw new Error('Not authenticated');
    }

    const response = await fetch(`/api/v1/admin/users/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.authToken}`,
      },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      const result = await response.json().catch(() => ({}));
      throw new Error(result.message || 'Failed to update user');
    }

    const result = await response.json();
    return this.mapApiUserToUser(result.data);
  }

  async deleteUser(id: string): Promise<void> {
    if (!this.authToken) {
      throw new Error('Not authenticated');
    }

    const response = await fetch(`/api/v1/admin/users/${id}`, {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${this.authToken}`,
      },
    });

    if (!response.ok) {
      const result = await response.json().catch(() => ({}));
      throw new Error(result.message || 'Failed to delete user');
    }
  }

  async getUsersByOrganization(orgId: string): Promise<User[]> {
    if (!this.authToken) {
      throw new Error('Not authenticated');
    }

    const response = await fetch(`/api/v1/admin/users?org=${orgId}`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${this.authToken}`,
      },
    });

    if (!response.ok) {
      throw new Error('Failed to fetch users');
    }

    const result = await response.json();
    return (result.data || []).map((u: unknown) => this.mapApiUserToUser(u));
  }

  async bulkImportUsers(csvData: string): Promise<BulkImportResult> {
    if (!this.authToken) {
      throw new Error('Not authenticated');
    }

    const response = await fetch('/api/v1/admin/users/bulk-import', {
      method: 'POST',
      headers: {
        'Content-Type': 'text/csv',
        Authorization: `Bearer ${this.authToken}`,
      },
      body: csvData,
    });

    if (!response.ok) {
      throw new Error('Failed to import users');
    }

    return response.json();
  }

  // Helper to map API response user to User type
  private mapApiUserToUser(apiUser: any): User {
    return {
      id: apiUser.id,
      email: apiUser.email,
      name: apiUser.name || apiUser.displayName || `${apiUser.firstName || ''} ${apiUser.lastName || ''}`.trim(),
      role: apiUser.role || 'user',
      org_id: apiUser.organizationId || apiUser.org_id,
      department: apiUser.department || '',
      permissions: (apiUser.permissions || []).map((p: string | { name: string }) => {
        if (typeof p === 'string') {
          const parts = p.split('.');
          return {
            id: p,
            name: p,
            resource: parts[0] || p,
            action: (parts[1] || 'read') as 'create' | 'read' | 'update' | 'delete' | 'manage',
          };
        }
        return p;
      }),
      created_at: new Date(apiUser.createdAt || apiUser.created_at || Date.now()),
      last_login: new Date(apiUser.lastLogin || apiUser.last_login || Date.now()),
      is_active: apiUser.isActive !== undefined ? apiUser.isActive : true,
      profile_image: apiUser.avatarUrl || apiUser.profile_image,
      phone: apiUser.phone || '',
      mobile: apiUser.mobile,
      preferences: apiUser.preferences || {
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
      },
      two_factor_enabled: apiUser.twoFactorEnabled || false,
      email_verified: apiUser.emailVerified !== undefined ? apiUser.emailVerified : true,
      password_changed_at: new Date(apiUser.passwordChangedAt || Date.now()),
    };
  }
}

// Export singleton instance
export const apiAuthProvider = new ApiAuthProvider();