/**
 * Keyboard shortcuts hook for NXT-SPP
 *
 * Shortcuts:
 * - Ctrl+U: Open upload dialog
 * - Ctrl+S: Open selection wizard
 * - Ctrl+R: Refresh data
 * - Escape: Close modals
 */

import { useEffect, useCallback } from 'react';

interface KeyboardShortcutsOptions {
  onUpload?: () => void;
  onSelection?: () => void;
  onRefresh?: () => void;
  onEscape?: () => void;
  enabled?: boolean;
}

export function useKeyboardShortcuts({
  onUpload,
  onSelection,
  onRefresh,
  onEscape,
  enabled = true,
}: KeyboardShortcutsOptions) {
  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      // Ignore if typing in input fields
      const target = event.target as HTMLElement;
      if (
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.isContentEditable
      ) {
        // Only handle Escape in input fields
        if (event.key === 'Escape' && onEscape) {
          onEscape();
        }
        return;
      }

      // Handle keyboard shortcuts
      if ((event.ctrlKey || event.metaKey) && !event.shiftKey && !event.altKey) {
        switch (event.key.toLowerCase()) {
          case 'u':
            event.preventDefault();
            onUpload?.();
            break;
          case 's':
            event.preventDefault();
            onSelection?.();
            break;
          case 'r':
            event.preventDefault();
            onRefresh?.();
            break;
        }
      } else if (event.key === 'Escape' && onEscape) {
        onEscape();
      }
    },
    [onUpload, onSelection, onRefresh, onEscape]
  );

  useEffect(() => {
    if (!enabled) return;

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [handleKeyDown, enabled]);
}

/**
 * Hook for showing keyboard shortcut hints
 */
export function useKeyboardShortcutHints() {
  const shortcuts = [
    { key: 'Ctrl+U', description: 'Upload pricelist', mac: '⌘+U' },
    { key: 'Ctrl+S', description: 'Open selection wizard', mac: '⌘+S' },
    { key: 'Ctrl+R', description: 'Refresh data', mac: '⌘+R' },
    { key: 'Esc', description: 'Close dialog', mac: 'Esc' },
  ];

  const isMac = typeof window !== 'undefined' && navigator.platform.toUpperCase().indexOf('MAC') >= 0;

  return shortcuts.map(shortcut => ({
    key: isMac ? shortcut.mac : shortcut.key,
    description: shortcut.description,
  }));
}
