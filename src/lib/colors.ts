/**
 * MantisNXT Color Palette
 * Colors from admin Color Palette settings
 */

// Chart colors from admin settings
export const MANTIS_COLORS = {
    chart1: '#7F00FF',    // Purple
    chart2: '#00E5FF',    // Cyan/Aqua
    chart3: '#00FF66',    // Green
    chart4: '#FFFF00',    // Yellow
    chart5: '#FF6600',    // Orange

    // Semantic aliases
    primary: '#7F00FF',
    success: '#00FF66',
    warning: '#FFFF00',
    error: '#FF6600',
    info: '#00E5FF',
};

// Chart color array (matches CSS --chart-1 through --chart-5)
export const CHART_COLORS = [
    '#7F00FF', // Chart 1 - Purple
    '#00E5FF', // Chart 2 - Cyan/Aqua
    '#00FF66', // Chart 3 - Green
    '#FFFF00', // Chart 4 - Yellow
    '#FF6600', // Chart 5 - Orange
];

// Gradient pairs
export const GRADIENT_PAIRS = {
    primary: { start: '#7F00FF', end: '#00E5FF' },
    success: { start: '#00FF66', end: '#00E5FF' },
    info: { start: '#00E5FF', end: '#FFFF00' },
    warning: { start: '#FFFF00', end: '#FF6600' },
    danger: { start: '#FF6600', end: '#7F00FF' },
    rainbow: { start: '#7F00FF', end: '#FF6600' },
};

// KPI Card color schemes
export const KPI_COLORS = {
    suppliers: '#00E5FF',
    inventory: '#00FF66',
    alerts: '#FF6600',
    products: '#FFFF00',
    salesTotal: '#00FF66',
    salesInStore: '#FF6600',
    salesOnline: '#00E5FF',
    avgOrder: '#FFFF00',
};

// Location colors
export const LOCATION_COLORS = [
    '#7F00FF',
    '#00FF66',
    '#00E5FF',
    '#FFFF00',
    '#FF6600',
];

// Category colors
export const CATEGORY_COLORS = [
    '#7F00FF',
    '#00FF66',
    '#00E5FF',
    '#FFFF00',
    '#FF6600',
];

// Sales chart colors
export const SALES_COLORS = {
    total: '#00FF66',
    inStore: '#FF6600',
    online: '#00E5FF',
    trend: '#FFFF00',
    orders: '#7F00FF',
};

// CSS variable exports (matches globals.css)
export const CSS_COLORS = {
    '--chart-1': '#7F00FF',
    '--chart-2': '#00E5FF',
    '--chart-3': '#00FF66',
    '--chart-4': '#FFFF00',
    '--chart-5': '#FF6600',
};

export default CHART_COLORS;
