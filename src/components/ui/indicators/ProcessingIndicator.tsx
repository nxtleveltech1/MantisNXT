'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useActivityStore } from '@/stores/activity-store';
import { cn } from '@/lib/utils';

interface ProcessingIndicatorProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
  /** Demo mode: simulates activity for testing */
  demoMode?: boolean;
}

// Particle class for the data flow effect
interface DataParticle {
  id: number;
  angle: number;
  radius: number;
  speed: number;
  size: number;
  opacity: number;
  hue: number;
}

export function ProcessingIndicator({
  className,
  size = 'md',
  showLabel = true,
  demoMode = false,
}: ProcessingIndicatorProps) {
  const { activityLevel, activeSources, requestsPerSecond, startActivity, endActivity } = useActivityStore();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>(0);
  const particlesRef = useRef<DataParticle[]>([]);
  const [isHovered, setIsHovered] = useState(false);
  const [displayLevel, setDisplayLevel] = useState(0);

  // Demo mode - simulate random activity
  useEffect(() => {
    if (!demoMode) return;
    
    const simulateActivity = () => {
      const activityId = `demo-${Date.now()}-${Math.random()}`;
      const types: Array<'api' | 'processing' | 'ai'> = ['api', 'processing', 'ai'];
      const type = types[Math.floor(Math.random() * types.length)];
      const duration = 500 + Math.random() * 2000;
      
      startActivity(activityId, type, 'demo');
      setTimeout(() => endActivity(activityId), duration);
    };

    // Initial burst
    for (let i = 0; i < 3; i++) {
      setTimeout(simulateActivity, i * 200);
    }

    const interval = setInterval(() => {
      if (Math.random() > 0.3) {
        simulateActivity();
      }
    }, 800);

    return () => clearInterval(interval);
  }, [demoMode, startActivity, endActivity]);

  // Dimensions based on size
  const dimensions = {
    sm: { width: 64, height: 64, arcRadius: 24, strokeWidth: 3 },
    md: { width: 80, height: 80, arcRadius: 30, strokeWidth: 4 },
    lg: { width: 100, height: 100, arcRadius: 38, strokeWidth: 5 },
  }[size];

  // Smooth the display level
  useEffect(() => {
    const interval = setInterval(() => {
      setDisplayLevel((prev) => {
        const diff = activityLevel - prev;
        const step = Math.sign(diff) * Math.max(0.5, Math.abs(diff) * 0.15);
        if (Math.abs(diff) < 0.5) return activityLevel;
        return prev + step;
      });
    }, 16);
    return () => clearInterval(interval);
  }, [activityLevel]);

  // Canvas animation for data particles
  const animate = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const { width, height, arcRadius } = dimensions;
    const centerX = width / 2;
    const centerY = height / 2;
    const dpr = window.devicePixelRatio || 1;

    // Clear canvas
    ctx.clearRect(0, 0, width * dpr, height * dpr);
    ctx.save();
    ctx.scale(dpr, dpr);

    // Add particles based on activity
    const particleChance = 0.02 + (displayLevel / 100) * 0.15;
    if (Math.random() < particleChance) {
      const baseHue = 180 + (displayLevel / 100) * 40; // Cyan to green shift
      particlesRef.current.push({
        id: Date.now() + Math.random(),
        angle: -Math.PI * 0.75 + Math.random() * Math.PI * 1.5,
        radius: arcRadius - 8 + Math.random() * 16,
        speed: 0.02 + (displayLevel / 100) * 0.04 + Math.random() * 0.02,
        size: 1 + Math.random() * 2,
        opacity: 0.4 + Math.random() * 0.6,
        hue: baseHue + Math.random() * 30 - 15,
      });
    }

    // Update and draw particles
    particlesRef.current = particlesRef.current.filter((particle) => {
      particle.angle += particle.speed;
      particle.opacity -= 0.008;
      particle.radius += (Math.random() - 0.5) * 0.3;

      if (particle.opacity <= 0 || particle.angle > Math.PI * 0.75) {
        return false;
      }

      const x = centerX + Math.cos(particle.angle) * particle.radius;
      const y = centerY + Math.sin(particle.angle) * particle.radius;

      // Glow effect
      const gradient = ctx.createRadialGradient(x, y, 0, x, y, particle.size * 3);
      gradient.addColorStop(0, `hsla(${particle.hue}, 100%, 60%, ${particle.opacity})`);
      gradient.addColorStop(0.5, `hsla(${particle.hue}, 100%, 50%, ${particle.opacity * 0.5})`);
      gradient.addColorStop(1, `hsla(${particle.hue}, 100%, 40%, 0)`);

      ctx.beginPath();
      ctx.arc(x, y, particle.size * 3, 0, Math.PI * 2);
      ctx.fillStyle = gradient;
      ctx.fill();

      // Core particle
      ctx.beginPath();
      ctx.arc(x, y, particle.size, 0, Math.PI * 2);
      ctx.fillStyle = `hsla(${particle.hue}, 100%, 80%, ${particle.opacity})`;
      ctx.fill();

      return true;
    });

    ctx.restore();
    animationRef.current = requestAnimationFrame(animate);
  }, [dimensions, displayLevel]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const dpr = window.devicePixelRatio || 1;
    canvas.width = dimensions.width * dpr;
    canvas.height = dimensions.height * dpr;
    canvas.style.width = `${dimensions.width}px`;
    canvas.style.height = `${dimensions.height}px`;

    animationRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animationRef.current);
  }, [animate, dimensions]);

  // Arc path calculation
  const arcPath = useCallback(() => {
    const { arcRadius } = dimensions;
    const startAngle = -225;
    const endAngle = 45;
    const sweepAngle = (endAngle - startAngle) * (displayLevel / 100);
    
    const startRad = (startAngle * Math.PI) / 180;
    const endRad = ((startAngle + sweepAngle) * Math.PI) / 180;
    
    const x1 = arcRadius + arcRadius * Math.cos(startRad);
    const y1 = arcRadius + arcRadius * Math.sin(startRad);
    const x2 = arcRadius + arcRadius * Math.cos(endRad);
    const y2 = arcRadius + arcRadius * Math.sin(endRad);
    
    const largeArc = sweepAngle > 180 ? 1 : 0;
    
    return `M ${x1} ${y1} A ${arcRadius} ${arcRadius} 0 ${largeArc} 1 ${x2} ${y2}`;
  }, [dimensions, displayLevel]);

  // Status color based on activity
  const getStatusColor = () => {
    if (displayLevel < 10) return 'from-slate-500/20 to-slate-600/20';
    if (displayLevel < 30) return 'from-cyan-500/30 to-blue-500/30';
    if (displayLevel < 60) return 'from-cyan-400/40 to-emerald-400/40';
    if (displayLevel < 85) return 'from-emerald-400/50 to-yellow-400/50';
    return 'from-yellow-400/60 to-orange-400/60';
  };

  const getGlowColor = () => {
    if (displayLevel < 10) return 'rgba(148, 163, 184, 0.1)';
    if (displayLevel < 30) return 'rgba(34, 211, 238, 0.2)';
    if (displayLevel < 60) return 'rgba(52, 211, 153, 0.3)';
    if (displayLevel < 85) return 'rgba(250, 204, 21, 0.3)';
    return 'rgba(251, 146, 60, 0.4)';
  };

  const getArcColor = () => {
    if (displayLevel < 10) return '#64748b';
    if (displayLevel < 30) return '#22d3ee';
    if (displayLevel < 60) return '#34d399';
    if (displayLevel < 85) return '#facc15';
    return '#fb923c';
  };

  const isActive = activeSources.size > 0 || displayLevel > 5;

  return (
    <motion.div
      className={cn(
        'fixed bottom-4 right-4 z-50',
        'flex flex-col items-center gap-1',
        className
      )}
      initial={{ opacity: 0, scale: 0.8, y: 20 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      transition={{ duration: 0.4, ease: 'easeOut' }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Main indicator container */}
      <div
        className={cn(
          'relative rounded-full',
          'bg-gradient-to-br from-slate-900/90 to-slate-800/90',
          'dark:from-slate-950/95 dark:to-slate-900/95',
          'backdrop-blur-xl border border-slate-700/50',
          'shadow-2xl',
          'transition-all duration-300',
          isHovered && 'scale-105'
        )}
        style={{
          width: dimensions.width,
          height: dimensions.height,
          boxShadow: `0 0 ${20 + displayLevel * 0.3}px ${getGlowColor()}, inset 0 1px 0 rgba(255,255,255,0.05)`,
        }}
      >
        {/* Background glow gradient */}
        <div
          className={cn(
            'absolute inset-2 rounded-full',
            'bg-gradient-to-br opacity-30',
            getStatusColor()
          )}
          style={{
            filter: `blur(${4 + displayLevel * 0.1}px)`,
          }}
        />

        {/* Canvas for particle effects */}
        <canvas
          ref={canvasRef}
          className="absolute inset-0 pointer-events-none"
          style={{ width: dimensions.width, height: dimensions.height }}
        />

        {/* SVG Arc gauge */}
        <svg
          className="absolute inset-0"
          viewBox={`0 0 ${dimensions.arcRadius * 2} ${dimensions.arcRadius * 2}`}
          style={{
            transform: 'translate(10%, 10%)',
            width: '80%',
            height: '80%',
          }}
        >
          {/* Background arc */}
          <path
            d={`M ${dimensions.arcRadius - dimensions.arcRadius * Math.cos(Math.PI * 0.75)} ${dimensions.arcRadius + dimensions.arcRadius * Math.sin(Math.PI * 0.75)} A ${dimensions.arcRadius} ${dimensions.arcRadius} 0 1 1 ${dimensions.arcRadius + dimensions.arcRadius * Math.cos(Math.PI * 0.25)} ${dimensions.arcRadius + dimensions.arcRadius * Math.sin(Math.PI * 0.25)}`}
            fill="none"
            stroke="rgba(100, 116, 139, 0.2)"
            strokeWidth={dimensions.strokeWidth}
            strokeLinecap="round"
          />

          {/* Active arc */}
          <motion.path
            d={arcPath()}
            fill="none"
            stroke={getArcColor()}
            strokeWidth={dimensions.strokeWidth}
            strokeLinecap="round"
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ duration: 0.3 }}
            style={{
              filter: `drop-shadow(0 0 ${3 + displayLevel * 0.05}px ${getArcColor()})`,
            }}
          />

          {/* Tick marks */}
          {[...Array(11)].map((_, i) => {
            const angle = -225 + (i * 270) / 10;
            const rad = (angle * Math.PI) / 180;
            const innerR = dimensions.arcRadius - 6;
            const outerR = dimensions.arcRadius - (i % 5 === 0 ? 2 : 4);
            const x1 = dimensions.arcRadius + innerR * Math.cos(rad);
            const y1 = dimensions.arcRadius + innerR * Math.sin(rad);
            const x2 = dimensions.arcRadius + outerR * Math.cos(rad);
            const y2 = dimensions.arcRadius + outerR * Math.sin(rad);
            
            const isPassed = (i / 10) * 100 <= displayLevel;
            
            return (
              <line
                key={i}
                x1={x1}
                y1={y1}
                x2={x2}
                y2={y2}
                stroke={isPassed ? getArcColor() : 'rgba(100, 116, 139, 0.3)'}
                strokeWidth={i % 5 === 0 ? 1.5 : 1}
                style={{
                  transition: 'stroke 0.2s',
                }}
              />
            );
          })}
        </svg>

        {/* Center display */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          {/* Digital readout */}
          <motion.div
            className={cn(
              'font-mono font-bold tabular-nums',
              'text-transparent bg-clip-text',
              size === 'sm' ? 'text-sm' : size === 'md' ? 'text-base' : 'text-lg'
            )}
            style={{
              backgroundImage: `linear-gradient(135deg, ${getArcColor()}, ${getArcColor()}dd)`,
              textShadow: `0 0 10px ${getGlowColor()}`,
            }}
            animate={{
              opacity: isActive ? [0.8, 1, 0.8] : 0.5,
            }}
            transition={{
              duration: 1.5,
              repeat: Infinity,
              ease: 'easeInOut',
            }}
          >
            {Math.round(displayLevel).toString().padStart(2, '0')}
          </motion.div>

          {/* Activity indicator dots */}
          <div className="flex gap-0.5 mt-0.5">
            {[...Array(3)].map((_, i) => (
              <motion.div
                key={i}
                className="rounded-full"
                style={{
                  width: size === 'sm' ? 2 : 3,
                  height: size === 'sm' ? 2 : 3,
                  backgroundColor: isActive ? getArcColor() : '#64748b',
                }}
                animate={
                  isActive
                    ? {
                        opacity: [0.3, 1, 0.3],
                        scale: [0.8, 1.2, 0.8],
                      }
                    : { opacity: 0.3 }
                }
                transition={{
                  duration: 0.6,
                  repeat: Infinity,
                  delay: i * 0.15,
                  ease: 'easeInOut',
                }}
              />
            ))}
          </div>
        </div>

        {/* Scanning line effect when active */}
        <AnimatePresence>
          {isActive && (
            <motion.div
              className="absolute inset-2 rounded-full overflow-hidden pointer-events-none"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <motion.div
                className="absolute inset-0"
                style={{
                  background: `conic-gradient(from 0deg, transparent 0deg, ${getGlowColor()} 20deg, transparent 40deg)`,
                }}
                animate={{ rotate: 360 }}
                transition={{
                  duration: Math.max(1, 4 - displayLevel * 0.03),
                  repeat: Infinity,
                  ease: 'linear',
                }}
              />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Idle breathing pulse */}
        {!isActive && (
          <motion.div
            className="absolute inset-0 rounded-full pointer-events-none"
            animate={{
              boxShadow: [
                'inset 0 0 10px rgba(100, 116, 139, 0.1)',
                'inset 0 0 20px rgba(100, 116, 139, 0.2)',
                'inset 0 0 10px rgba(100, 116, 139, 0.1)',
              ],
            }}
            transition={{
              duration: 3,
              repeat: Infinity,
              ease: 'easeInOut',
            }}
          />
        )}

        {/* Scanlines overlay */}
        <div
          className="absolute inset-0 rounded-full pointer-events-none opacity-20"
          style={{
            backgroundImage: `repeating-linear-gradient(
              0deg,
              transparent,
              transparent 2px,
              rgba(0, 0, 0, 0.1) 2px,
              rgba(0, 0, 0, 0.1) 4px
            )`,
          }}
        />

        {/* Outer ring glow */}
        <motion.div
          className="absolute -inset-1 rounded-full pointer-events-none"
          style={{
            border: `1px solid ${isActive ? getArcColor() : 'rgba(100, 116, 139, 0.2)'}`,
            opacity: isActive ? 0.5 : 0.2,
          }}
          animate={
            isActive
              ? {
                  scale: [1, 1.05, 1],
                  opacity: [0.3, 0.5, 0.3],
                }
              : {}
          }
          transition={{
            duration: 2,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
        />
      </div>

      {/* Hover tooltip */}
      <AnimatePresence>
        {isHovered && showLabel && (
          <motion.div
            className={cn(
              'absolute bottom-full mb-2 right-0',
              'px-3 py-2 rounded-lg',
              'bg-slate-900/95 dark:bg-slate-950/95',
              'backdrop-blur-xl border border-slate-700/50',
              'shadow-xl',
              'text-xs font-mono',
              'whitespace-nowrap'
            )}
            initial={{ opacity: 0, y: 10, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 5, scale: 0.95 }}
            transition={{ duration: 0.15 }}
          >
            <div className="flex flex-col gap-1">
              <div className="flex items-center justify-between gap-4">
                <span className="text-slate-400">Status</span>
                <span
                  className="font-semibold"
                  style={{ color: getArcColor() }}
                >
                  {displayLevel < 10
                    ? 'Idle'
                    : displayLevel < 30
                      ? 'Low'
                      : displayLevel < 60
                        ? 'Active'
                        : displayLevel < 85
                          ? 'Busy'
                          : 'High Load'}
                </span>
              </div>
              <div className="flex items-center justify-between gap-4">
                <span className="text-slate-400">Tasks</span>
                <span className="text-slate-200">{activeSources.size}</span>
              </div>
              {requestsPerSecond > 0 && (
                <div className="flex items-center justify-between gap-4">
                  <span className="text-slate-400">Rate</span>
                  <span className="text-slate-200">{requestsPerSecond.toFixed(1)}/s</span>
                </div>
              )}
            </div>

            {/* Tooltip arrow */}
            <div
              className={cn(
                'absolute -bottom-1 right-4',
                'w-2 h-2 rotate-45',
                'bg-slate-900/95 dark:bg-slate-950/95',
                'border-r border-b border-slate-700/50'
              )}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

export default ProcessingIndicator;

