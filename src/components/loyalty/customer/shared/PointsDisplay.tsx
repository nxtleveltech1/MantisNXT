/**
 * PointsDisplay - Animated points counter
 *
 * Usage:
 * <PointsDisplay points={1250} animated className="text-4xl" />
 *
 * Features:
 * - Smooth count-up animation
 * - Configurable text size
 * - Optional animation toggle
 */

'use client';

import { motion, useSpring, useTransform } from 'framer-motion';
import { useEffect } from 'react';
import { cn } from '@/lib/utils';

interface PointsDisplayProps {
  points: number;
  animated?: boolean;
  className?: string;
  showLabel?: boolean;
  variant?: 'default' | 'compact';
}

export function PointsDisplay({
  points,
  animated = true,
  className,
  showLabel = true,
  variant = 'default',
}: PointsDisplayProps) {
  const spring = useSpring(0, {
    stiffness: 100,
    damping: 30,
    mass: 1,
  });

  const display = useTransform(spring, (current) =>
    Math.round(current).toLocaleString()
  );

  useEffect(() => {
    if (animated) {
      spring.set(points);
    }
  }, [points, spring, animated]);

  if (!animated) {
    return (
      <div className={cn('font-bold text-primary', className)}>
        {variant === 'compact' ? (
          <span>{points.toLocaleString()}</span>
        ) : (
          <div className="flex items-baseline gap-2">
            <span className="text-5xl">{points.toLocaleString()}</span>
            {showLabel && (
              <span className="text-lg text-muted-foreground">points</span>
            )}
          </div>
        )}
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      className={cn('font-bold text-primary', className)}
    >
      {variant === 'compact' ? (
        <motion.span>{display}</motion.span>
      ) : (
        <div className="flex items-baseline gap-2">
          <motion.span className="text-5xl">{display}</motion.span>
          {showLabel && (
            <span className="text-lg text-muted-foreground">points</span>
          )}
        </div>
      )}
    </motion.div>
  );
}
