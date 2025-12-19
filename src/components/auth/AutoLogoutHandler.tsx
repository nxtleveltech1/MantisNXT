'use client';

import { useAutoLogout } from '@/lib/auth/use-auto-logout';

/**
 * Component that handles auto-logout after inactivity
 * Should be placed in the app layout to track user activity globally
 */
export function AutoLogoutHandler() {
  useAutoLogout();
  return null;
}




