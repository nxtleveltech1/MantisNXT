/**
 * MantisNXT NEON Color Palette
 * Pure neon colors - vibrant, bright, electric
 * NO pastels, NO muted colors
 */

// PURE NEON colors - maximum saturation and brightness
export const MANTIS_COLORS = {
    // Primary NEON colors
    neonMagenta: '#FF00FF',   // Electric magenta
    neonPurple: '#BF00FF',    // Neon purple
    neonOrange: '#FF6600',    // Neon orange
    neonYellow: '#FFFF00',    // Electric yellow
    neonLime: '#39FF14',      // Neon lime green
    neonGreen: '#00FF00',     // Pure neon green
    neonCyan: '#00FFFF',      // Electric cyan
    neonBlue: '#00BFFF',      // Neon blue

    // Semantic aliases
    success: '#39FF14',       // Neon lime
    warning: '#FF6600',       // Neon orange
    error: '#FF00FF',         // Neon magenta
    info: '#00FFFF',          // Neon cyan
};

// Chart color array - ALL NEON
export const CHART_COLORS = [
    '#FF6600', // Neon Orange
    '#FFFF00', // Neon Yellow  
    '#39FF14', // Neon Lime
    '#00FFFF', // Neon Cyan
    '#00BFFF', // Neon Blue
    '#BF00FF', // Neon Purple
    '#FF00FF', // Neon Magenta
];

// Gradient pairs - NEON gradients
export const GRADIENT_PAIRS = {
    primary: { start: '#FF6600', end: '#FFFF00' },    // Orange to Yellow
    success: { start: '#39FF14', end: '#00FFFF' },    // Lime to Cyan
    info: { start: '#00FFFF', end: '#00BFFF' },       // Cyan to Blue
    warning: { start: '#FFFF00', end: '#FF6600' },    // Yellow to Orange
    danger: { start: '#FF00FF', end: '#BF00FF' },     // Magenta to Purple
    rainbow: { start: '#BF00FF', end: '#00FFFF' },    // Purple to Cyan
};

// KPI Card color schemes - ALL NEON
export const KPI_COLORS = {
    suppliers: '#00BFFF',     // Neon Blue
    inventory: '#39FF14',     // Neon Lime
    alerts: '#FF6600',        // Neon Orange
    products: '#BF00FF',      // Neon Purple
    salesTotal: '#00FFFF',    // Neon Cyan
    salesInStore: '#FF6600',  // Neon Orange
    salesOnline: '#39FF14',   // Neon Lime
    avgOrder: '#FFFF00',      // Neon Yellow
};

// Location colors - ALL NEON
export const LOCATION_COLORS = [
    '#FF6600', // Neon Orange
    '#39FF14', // Neon Lime
    '#00FFFF', // Neon Cyan
    '#BF00FF', // Neon Purple
    '#00BFFF', // Neon Blue
    '#FFFF00', // Neon Yellow
];

// Category colors - ALL NEON
export const CATEGORY_COLORS = [
    '#39FF14', // Neon Lime (primary)
    '#00FFFF', // Neon Cyan
    '#00BFFF', // Neon Blue
    '#BF00FF', // Neon Purple
    '#FF6600', // Neon Orange
    '#FFFF00', // Neon Yellow
    '#FF00FF', // Neon Magenta
];

// Sales chart colors - ALL NEON
export const SALES_COLORS = {
    total: '#39FF14',       // Neon Lime
    inStore: '#FF6600',     // Neon Orange  
    online: '#00FFFF',      // Neon Cyan
    trend: '#00BFFF',       // Neon Blue
    orders: '#BF00FF',      // Neon Purple
};

// CSS variable exports
export const CSS_COLORS = {
    '--chart-1': '#FF6600',
    '--chart-2': '#39FF14',
    '--chart-3': '#00FFFF',
    '--chart-4': '#BF00FF',
    '--chart-5': '#00BFFF',
};

export default CHART_COLORS;
