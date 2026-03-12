'use client';

/**
 * Theme toggle button — uncodixfy: solid fill, simple border, 8px radius, 150ms transition.
 * Prefer ThemeToggle in header for full Light/Dark/System; this is for inline use.
 */

import * as React from 'react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { Moon, Sun } from 'lucide-react';
import { useTheme } from '@/components/theme-provider';

interface SwitchButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'minimal';
  size?: 'sm' | 'default' | 'lg';
  showLabel?: boolean;
}

export default function SwitchButton({
  className,
  variant = 'minimal',
  size = 'default',
  showLabel = true,
  ...props
}: SwitchButtonProps) {
  const { setTheme, theme } = useTheme();
  const [resolved, setResolved] = React.useState<'light' | 'dark'>('light');

  React.useEffect(() => {
    if (theme === 'system') {
      const m = window.matchMedia('(prefers-color-scheme: dark)');
      setResolved(m.matches ? 'dark' : 'light');
      const h = () => setResolved(m.matches ? 'dark' : 'light');
      m.addEventListener('change', h);
      return () => m.removeEventListener('change', h);
    }
    setResolved(theme);
  }, [theme]);

  const toggle = () => setTheme(resolved === 'dark' ? 'light' : 'dark');

  const sizes = {
    sm: 'h-8 px-3 text-sm',
    default: 'h-10 px-4',
    lg: 'h-11 px-5',
  };

  return (
    <Button
      variant="outline"
      onClick={toggle}
      className={cn(
        'rounded-lg border-border bg-secondary text-foreground transition-colors duration-150 hover:bg-accent hover:text-accent-foreground',
        sizes[size],
        className
      )}
      {...props}
    >
      <div className="flex items-center gap-2">
        {resolved === 'dark' ? (
          <Moon className="h-4 w-4 shrink-0" />
        ) : (
          <Sun className="h-4 w-4 shrink-0" />
        )}
        {showLabel && (
          <span className="font-medium">{resolved === 'dark' ? 'Dark' : 'Light'}</span>
        )}
      </div>
    </Button>
  );
}
