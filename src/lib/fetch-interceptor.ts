/**
 * Global fetch interceptor for handling authentication errors
 * Redirects to login on 401 responses
 */

if (typeof window !== 'undefined') {
  const originalFetch = window.fetch;

  window.fetch = async function (...args) {
    const response = await originalFetch(...args);

    // Handle 401 Unauthorized - redirect to login
    if (response.status === 401) {
      const url = new URL(response.url);
      // Don't redirect for auth endpoints to avoid loops
      if (!url.pathname.startsWith('/api/auth')) {
        // Check if we're already on login page
        if (window.location.pathname !== '/auth/login') {
          // Store the attempted URL for redirect after login
          sessionStorage.setItem('redirectAfterLogin', window.location.pathname);
          window.location.href = '/auth/login';
        }
      }
    }

    return response;
  };
}

export {};
