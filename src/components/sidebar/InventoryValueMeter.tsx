/**
 * System Processing UV Meter
 * Horizontal circular lights that flash based on system processing load
 * Green (low) to Red (high) - 7 circular indicators
 */

'use client';

import React, { useState, useEffect } from 'react';

export function SystemProcessingMeter() {
  const [processingLoad, setProcessingLoad] = useState(0);
  const [flickerState, setFlickerState] = useState<boolean[]>(new Array(7).fill(false));

  // Calculate processing load - simulate based on system activity with rapid flickering
  useEffect(() => {
    // Simulate processing load that varies rapidly for flickering effect
    const interval = setInterval(() => {
      // Rapid variation for flickering effect (0-100%)
      const baseLoad = Math.random() * 50 + 30; // Base load between 30-80%
      const rapidVariation = Math.sin(Date.now() / 300) * 25; // Fast oscillation
      const randomSpike = Math.random() * 20; // Random spikes
      const load = Math.max(0, Math.min(100, baseLoad + rapidVariation + randomSpike));
      setProcessingLoad(load);

      // Update flicker state for each light
      setFlickerState(prev => prev.map((_, i) => Math.random() > 0.6));
    }, 100); // Update every 100ms for rapid flickering

    return () => clearInterval(interval);
  }, []);

  // 7 circular lights - colors from green (left) to red (right)
  const lights = [
    { color: '#22C55E', threshold: 0 }, // Green 1
    { color: '#4ADE80', threshold: 14 }, // Green 2
    { color: '#84CC16', threshold: 28 }, // Green 3
    { color: '#FCD34D', threshold: 42 }, // Yellow 1
    { color: '#FBBF24', threshold: 57 }, // Yellow 2
    { color: '#F97316', threshold: 71 }, // Orange
    { color: '#DC2626', threshold: 85 }, // Red
  ];

  // Calculate how many lights should be active
  const activeLights = lights.filter(light => processingLoad >= light.threshold).length;

  return (
    <div className="w-full space-y-2 px-2 pb-2">
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
        SYSTEM PROCESSING
      </p>

      {/* Horizontal UV Meter - 7 Circular Lights */}
      <div className="flex items-center justify-between gap-1.5">
        {lights.map((light, index) => {
          const isActive = index < activeLights;
          const shouldFlicker = isActive && flickerState[index];

          return (
            <div key={index} className="relative flex flex-1 justify-center">
              <div
                className={`h-4 w-4 rounded-full transition-all duration-100 ${
                  isActive ? 'opacity-100' : 'opacity-15'
                }`}
                style={{
                  backgroundColor: light.color,
                  boxShadow: isActive
                    ? `0 0 20px ${light.color}, 0 0 12px ${light.color}DD, 0 0 6px ${light.color}FF, inset 0 1px 3px rgba(255,255,255,0.7)`
                    : 'none',
                  filter: isActive
                    ? `brightness(1.5) drop-shadow(0 0 8px ${light.color})`
                    : 'brightness(0.3)',
                  animation: shouldFlicker ? 'flicker 0.12s ease-in-out infinite' : 'none',
                }}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}
