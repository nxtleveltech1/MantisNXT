/**
 * Chart Utilities
 *
 * Provides color schemes, formatters, and utility functions for Recharts components
 * to ensure consistent styling across the dashboard
 */

// Chart color palette from CSS variables
export const CHART_COLORS = {
  primary: 'hsl(var(--chart-1))', // Green
  secondary: 'hsl(var(--chart-2))', // Purple
  tertiary: 'hsl(var(--chart-3))', // Blue
  quaternary: 'hsl(var(--chart-4))', // Amber
  quinary: 'hsl(var(--chart-5))', // Red
} as const;

// Format currency values
export const formatCurrency = (value: number): string => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
};

// Format compact numbers (e.g., 1.2K, 1.5M)
export const formatCompactNumber = (value: number): string => {
  return new Intl.NumberFormat('en-US', {
    notation: 'compact',
    compactDisplay: 'short',
    maximumFractionDigits: 1,
  }).format(value);
};

// Format percentage values
export const formatPercentage = (value: number, decimals: number = 1): string => {
  return `${value.toFixed(decimals)}%`;
};

// Custom tooltip styles for Recharts
export const tooltipStyles = {
  contentStyle: {
    backgroundColor: 'hsl(var(--card))',
    border: '1px solid hsl(var(--border))',
    borderRadius: '8px',
    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
  },
  labelStyle: {
    color: 'hsl(var(--foreground))',
    fontWeight: 600,
    marginBottom: '4px',
  },
  itemStyle: {
    color: 'hsl(var(--muted-foreground))',
  },
};

// Grid styles for Recharts
export const gridStyles = {
  stroke: 'hsl(var(--border))',
  strokeDasharray: '3 3',
  opacity: 0.5,
};

// Axis styles for Recharts
export const axisStyles = {
  tick: {
    fontSize: 12,
    fill: 'hsl(var(--muted-foreground))',
  },
  axisLine: {
    stroke: 'hsl(var(--border))',
  },
  tickLine: {
    stroke: 'hsl(var(--border))',
  },
};

// Generate gradient definitions for area charts
export const createGradient = (id: string, color: string, opacity: number = 0.3) => ({
  id,
  x1: '0',
  y1: '0',
  x2: '0',
  y2: '1',
  stops: [
    { offset: '5%', stopColor: color, stopOpacity: opacity },
    { offset: '95%', stopColor: color, stopOpacity: 0 },
  ],
});

// Common chart margins
export const chartMargins = {
  default: { top: 5, right: 5, left: 5, bottom: 5 },
  withAxis: { top: 5, right: 10, left: 0, bottom: 5 },
  large: { top: 20, right: 30, left: 20, bottom: 20 },
};

// Animation configuration
export const animationConfig = {
  duration: 300,
  easing: 'ease-in-out',
};

// Responsive breakpoints for charts
export const responsiveBreakpoints = {
  mobile: 640,
  tablet: 768,
  desktop: 1024,
  wide: 1280,
};

// Calculate trend percentage
export const calculateTrendPercentage = (current: number, previous: number): number => {
  if (previous === 0) return 0;
  return ((current - previous) / previous) * 100;
};

// Determine trend direction
export const getTrendDirection = (percentage: number): 'up' | 'down' | 'neutral' => {
  if (percentage > 0) return 'up';
  if (percentage < 0) return 'down';
  return 'neutral';
};

// Format trend display
export const formatTrend = (percentage: number): string => {
  const sign = percentage > 0 ? '+' : '';
  return `${sign}${percentage.toFixed(1)}%`;
};

// Get trend color class
export const getTrendColorClass = (trend: 'up' | 'down' | 'neutral'): string => {
  switch (trend) {
    case 'up':
      return 'text-green-600';
    case 'down':
      return 'text-red-600';
    case 'neutral':
      return 'text-muted-foreground';
  }
};

// Smooth data for better visualization
export const smoothData = <T extends Record<string, unknown>>(
  data: T[],
  key: keyof T,
  windowSize: number = 3
): T[] => {
  if (data.length < windowSize) return data;

  return data.map((item, index) => {
    const start = Math.max(0, index - Math.floor(windowSize / 2));
    const end = Math.min(data.length, index + Math.ceil(windowSize / 2));
    const window = data.slice(start, end);

    const sum = window.reduce((acc, curr) => acc + (curr[key] as number), 0);
    const average = sum / window.length;

    return { ...item, [key]: average };
  });
};

export default {
  CHART_COLORS,
  formatCurrency,
  formatCompactNumber,
  formatPercentage,
  tooltipStyles,
  gridStyles,
  axisStyles,
  chartMargins,
  animationConfig,
  responsiveBreakpoints,
  calculateTrendPercentage,
  getTrendDirection,
  formatTrend,
  getTrendColorClass,
  smoothData,
};
