/**
 * Simple toast hook for notifications
 * This is a basic implementation - can be replaced with a more sophisticated toast library
 */

export interface ToastOptions {
  title: string;
  description?: string;
  variant?: 'default' | 'destructive';
  duration?: number;
}

import { toast as sonnerToast } from 'sonner';

export function useToast() {
  const toast = (options: ToastOptions) => {
    if (options.variant === 'destructive') {
      sonnerToast.error(options.title, {
        description: options.description,
        duration: options.duration ?? 5000,
      });
    } else {
      sonnerToast(options.title, {
        description: options.description,
        duration: options.duration ?? 3500,
      });
    }
  };

  return { toast };
}
