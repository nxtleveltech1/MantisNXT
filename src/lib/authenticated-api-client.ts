// @ts-nocheck
/**
 * Authenticated API Client
 *
 * Wraps the base apiClient with automatic JWT token injection
 * for authenticated API requests.
 */

import { apiClient } from './api-client';
import { apiAuthProvider } from './auth/api-auth-provider';

class AuthenticatedApiClient {
  private getAuthToken = () => apiAuthProvider['authToken'];

  async get<T = unknown>(endpoint: string, options?: RequestInit) {
    return this.request<T>(endpoint, { ...options, method: 'GET' });
  }

  async post<T = unknown>(endpoint: string, data?: unknown, options?: RequestInit) {
    return this.request<T>(endpoint, {
      ...options,
      method: 'POST',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  async put<T = unknown>(endpoint: string, data?: unknown, options?: RequestInit) {
    return this.request<T>(endpoint, {
      ...options,
      method: 'PUT',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  async patch<T = unknown>(endpoint: string, data?: unknown, options?: RequestInit) {
    return this.request<T>(endpoint, {
      ...options,
      method: 'PATCH',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  async delete<T = unknown>(endpoint: string, options?: RequestInit) {
    return this.request<T>(endpoint, { ...options, method: 'DELETE' });
  }

  private async request<T = unknown>(endpoint: string, options: RequestInit = {}) {
    const token = this.getAuthToken();

    const authHeaders: Record<string, string> = {};
    if (token) {
      authHeaders['Authorization'] = `Bearer ${token}`;
    }

    return apiClient.request<T>(endpoint, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...authHeaders,
        ...options.headers,
      },
    });
  }
}

// Export singleton instance
export const authenticatedApiClient = new AuthenticatedApiClient();