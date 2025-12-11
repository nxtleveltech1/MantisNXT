/**
 * System Processing UV Meter
 * Horizontal circular lights that flash based on system processing load
 * Green (low) to Red (high) - 7 circular indicators
 */

'use client';

import React, { useState, useEffect } from 'react';

export function SystemProcessingMeter() {
  const [processingLoad, setProcessingLoad] = useState(0);

  // Calculate processing load - simulate based on system activity
  useEffect(() => {
    // Simulate processing load that varies over time
    // In a real implementation, this would use actual system metrics
    const interval = setInterval(() => {
      // Simulate varying load (0-100%)
      const baseLoad = Math.random() * 40 + 20; // Base load between 20-60%
      const variation = Math.sin(Date.now() / 2000) * 15; // Oscillating variation
      const load = Math.max(0, Math.min(100, baseLoad + variation));
      setProcessingLoad(load);
    }, 500); // Update every 500ms for smooth animation

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
      <div className="flex items-center justify-between gap-1">
        {lights.map((light, index) => {
          const isActive = index < activeLights;
          const shouldFlash = isActive && processingLoad > light.threshold;

          return (
            <div key={index} className="relative flex-1">
              <div
                className={`h-3 w-3 rounded-full transition-all duration-300 ${
                  isActive ? 'opacity-100' : 'opacity-20'
                } ${shouldFlash ? 'animate-pulse' : ''}`}
                style={{
                  backgroundColor: light.color,
                  boxShadow: isActive
                    ? `0 0 8px ${light.color}80, 0 0 4px ${light.color}60, inset 0 1px 2px rgba(255,255,255,0.4)`
                    : 'none',
                }}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}
