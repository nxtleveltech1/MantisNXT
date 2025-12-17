'use client';

import { useEffect, useRef, useCallback } from 'react';
import { useAuth } from './auth-context';
import { toast } from 'sonner';

const INACTIVITY_TIMEOUT = 15 * 60 * 1000; // 15 minutes in milliseconds
const WARNING_TIME = 2 * 60 * 1000; // 2 minutes before logout to show warning

/**
 * Hook to automatically log out users after a period of inactivity
 * Tracks user activity (mouse, keyboard, scroll, touch, click) and resets timer
 * Shows a warning notification 2 minutes before logout
 */
export function useAutoLogout() {
  const { isAuthenticated, signOut } = useAuth();
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const warningTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastActivityRef = useRef<number>(Date.now());
  const warningShownRef = useRef<boolean>(false);

  // Reset the inactivity timer
  const resetTimer = useCallback(() => {
    if (!isAuthenticated) return;

    // Clear existing timeouts
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    if (warningTimeoutRef.current) {
      clearTimeout(warningTimeoutRef.current);
    }

    // Reset warning flag
    warningShownRef.current = false;

    // Update last activity time
    lastActivityRef.current = Date.now();

    // Set warning timeout (2 minutes before logout)
    warningTimeoutRef.current = setTimeout(() => {
      if (!warningShownRef.current) {
        warningShownRef.current = true;
        toast.warning('Session Timeout Warning', {
          description: 'You will be logged out in 2 minutes due to inactivity. Move your mouse or press a key to stay logged in.',
          duration: 120000, // Show for 2 minutes
        });
      }
    }, INACTIVITY_TIMEOUT - WARNING_TIME);

    // Set logout timeout
    timeoutRef.current = setTimeout(() => {
      console.log('Auto-logout: Inactivity timeout reached');
      toast.error('Session Expired', {
        description: 'You have been logged out due to inactivity.',
        duration: 5000,
      });
      signOut().catch(error => {
        console.error('Auto-logout: Error during sign out:', error);
      });
    }, INACTIVITY_TIMEOUT);
  }, [isAuthenticated, signOut]);

  // Handle user activity events
  const handleActivity = useCallback(() => {
    resetTimer();
  }, [resetTimer]);

  useEffect(() => {
    // Only set up activity tracking if user is authenticated
    if (!isAuthenticated) {
      // Clear timeout if user is not authenticated
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
      return;
    }

    // Initial timer setup
    resetTimer();

    // List of events that indicate user activity
    const events = [
      'mousedown',
      'mousemove',
      'keypress',
      'scroll',
      'touchstart',
      'click',
      'keydown',
    ];

    // Add event listeners with throttling to avoid excessive calls
    let throttleTimer: NodeJS.Timeout | null = null;
    const throttledHandleActivity = () => {
      if (throttleTimer) return;
      throttleTimer = setTimeout(() => {
        handleActivity();
        throttleTimer = null;
      }, 1000); // Throttle to once per second
    };

    events.forEach(event => {
      window.addEventListener(event, throttledHandleActivity, { passive: true });
    });

    // Cleanup function
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      if (warningTimeoutRef.current) {
        clearTimeout(warningTimeoutRef.current);
      }
      if (throttleTimer) {
        clearTimeout(throttleTimer);
      }
      events.forEach(event => {
        window.removeEventListener(event, throttledHandleActivity);
      });
    };
  }, [isAuthenticated, handleActivity, resetTimer]);
}

