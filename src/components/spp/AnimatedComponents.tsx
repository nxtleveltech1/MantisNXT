/**
 * Animated components for SPP
 * Beautiful animations using Framer Motion
 */

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import confetti from 'canvas-confetti';

// Animation variants
export const fadeIn = {
  initial: { opacity: 0 },
  animate: { opacity: 1 },
  exit: { opacity: 0 },
  transition: { duration: 0.2 },
};

export const slideIn = {
  initial: { x: 20, opacity: 0 },
  animate: { x: 0, opacity: 1 },
  exit: { x: -20, opacity: 0 },
  transition: { duration: 0.3 },
};

export const slideUp = {
  initial: { y: 20, opacity: 0 },
  animate: { y: 0, opacity: 1 },
  exit: { y: -20, opacity: 0 },
  transition: { duration: 0.3 },
};

export const scaleIn = {
  initial: { scale: 0.95, opacity: 0 },
  animate: { scale: 1, opacity: 1 },
  exit: { scale: 0.95, opacity: 0 },
  transition: { duration: 0.2 },
};

// Animated container components
export function FadeInContainer({ children, ...props }: { children: React.ReactNode; [key: string]: unknown }) {
  return (
    <motion.div {...fadeIn} {...props}>
      {children}
    </motion.div>
  );
}

export function SlideInContainer({ children, ...props }: { children: React.ReactNode; [key: string]: unknown }) {
  return (
    <motion.div {...slideIn} {...props}>
      {children}
    </motion.div>
  );
}

export function SlideUpContainer({ children, ...props }: { children: React.ReactNode; [key: string]: unknown }) {
  return (
    <motion.div {...slideUp} {...props}>
      {children}
    </motion.div>
  );
}

export function ScaleInContainer({ children, ...props }: { children: React.ReactNode; [key: string]: unknown }) {
  return (
    <motion.div {...scaleIn} {...props}>
      {children}
    </motion.div>
  );
}

// Animated list
export function AnimatedList({ children }: { children: React.ReactNode[] }) {
  return (
    <AnimatePresence mode="popLayout">
      {React.Children.map(children, (child, index) => (
        <motion.div
          key={index}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, x: -20 }}
          transition={{ duration: 0.2, delay: index * 0.05 }}
        >
          {child}
        </motion.div>
      ))}
    </AnimatePresence>
  );
}

// Success confetti
export function triggerConfetti() {
  const count = 200;
  const defaults = {
    origin: { y: 0.7 },
    zIndex: 9999,
  };

  function fire(particleRatio: number, opts: confetti.Options) {
    confetti({
      ...defaults,
      ...opts,
      particleCount: Math.floor(count * particleRatio),
    });
  }

  fire(0.25, {
    spread: 26,
    startVelocity: 55,
  });

  fire(0.2, {
    spread: 60,
  });

  fire(0.35, {
    spread: 100,
    decay: 0.91,
    scalar: 0.8,
  });

  fire(0.1, {
    spread: 120,
    startVelocity: 25,
    decay: 0.92,
    scalar: 1.2,
  });

  fire(0.1, {
    spread: 120,
    startVelocity: 45,
  });
}

// Pulsing dot indicator
export function PulsingDot({ className }: { className?: string }) {
  return (
    <motion.span
      className={className}
      animate={{
        scale: [1, 1.2, 1],
        opacity: [1, 0.8, 1],
      }}
      transition={{
        duration: 2,
        repeat: Infinity,
        ease: 'easeInOut',
      }}
    />
  );
}

// Loading spinner
export function LoadingSpinner({ size = 'md' }: { size?: 'sm' | 'md' | 'lg' }) {
  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-6 h-6',
    lg: 'w-8 h-8',
  };

  return (
    <motion.div
      className={`${sizeClasses[size]} border-2 border-current border-t-transparent rounded-full`}
      animate={{ rotate: 360 }}
      transition={{
        duration: 1,
        repeat: Infinity,
        ease: 'linear',
      }}
    />
  );
}

// Progress bar with animation
export function AnimatedProgressBar({ value, className }: { value: number; className?: string }) {
  return (
    <div className={`h-2 bg-muted rounded-full overflow-hidden ${className}`}>
      <motion.div
        className="h-full bg-primary"
        initial={{ width: 0 }}
        animate={{ width: `${value}%` }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
      />
    </div>
  );
}

// Stagger children animation
export function StaggerContainer({ children, staggerDelay = 0.1 }: { children: React.ReactNode; staggerDelay?: number }) {
  return (
    <motion.div
      initial="hidden"
      animate="visible"
      variants={{
        visible: {
          transition: {
            staggerChildren: staggerDelay,
          },
        },
      }}
    >
      {React.Children.map(children, (child) => (
        <motion.div
          variants={{
            hidden: { opacity: 0, y: 20 },
            visible: { opacity: 1, y: 0 },
          }}
        >
          {child}
        </motion.div>
      ))}
    </motion.div>
  );
}

// Number counter animation
export function AnimatedNumber({ value, duration = 1 }: { value: number; duration?: number }) {
  const [displayValue, setDisplayValue] = React.useState(0);
  const lastDisplayValueRef = React.useRef(0);

  React.useEffect(() => {
    lastDisplayValueRef.current = displayValue;
  }, [displayValue]);

  React.useEffect(() => {
    let animationFrame: number;
    const startTime = Date.now();
    const startValue = lastDisplayValueRef.current;
    const difference = value - startValue;

    const updateValue = () => {
      const now = Date.now();
      const progress = Math.min((now - startTime) / (duration * 1000), 1);
      const easeOutQuad = 1 - (1 - progress) * (1 - progress);
      const currentValue = Math.floor(startValue + difference * easeOutQuad);

      setDisplayValue(currentValue);

      if (progress < 1) {
        animationFrame = requestAnimationFrame(updateValue);
      } else {
        setDisplayValue(value);
      }
    };

    animationFrame = requestAnimationFrame(updateValue);

    return () => {
      if (animationFrame) {
        cancelAnimationFrame(animationFrame);
      }
    };
  }, [value, duration]);

  return <span>{displayValue.toLocaleString()}</span>;
}

// Shimmer effect for loading states
export function ShimmerEffect({ className }: { className?: string }) {
  return (
    <div className={`relative overflow-hidden ${className}`}>
      <motion.div
        className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent"
        animate={{
          x: ['-100%', '100%'],
        }}
        transition={{
          duration: 1.5,
          repeat: Infinity,
          ease: 'linear',
        }}
      />
    </div>
  );
}
