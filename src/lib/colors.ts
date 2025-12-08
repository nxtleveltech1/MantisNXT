/**
 * MantisNXT Color Palette
 * Professional subdued purple-gray theme from tweakcn
 */

// Chart colors - Professional purple/indigo palette (from tweakcn theme)
export const MANTIS_COLORS = {
    chart1: '#7C7C8A',    // Gray-blue (muted)
    chart2: '#6366F1',    // Indigo
    chart3: '#8B5CF6',    // Violet
    chart4: '#7C3AED',    // Purple
    chart5: '#5B21B6',    // Deep purple

    // Semantic aliases
    primary: '#6366F1',
    success: '#22C55E',
    warning: '#F59E0B',
    error: '#EF4444',
    info: '#3B82F6',
};

// Chart color array (matches CSS --chart-1 through --chart-5)
export const CHART_COLORS = [
    '#7C7C8A', // Chart 1 - Gray-blue (muted)
    '#6366F1', // Chart 2 - Indigo
    '#8B5CF6', // Chart 3 - Violet
    '#7C3AED', // Chart 4 - Purple
    '#5B21B6', // Chart 5 - Deep purple
];

// Gradient pairs - subtle professional gradients
export const GRADIENT_PAIRS = {
    primary: { start: '#6366F1', end: '#8B5CF6' },
    success: { start: '#22C55E', end: '#10B981' },
    info: { start: '#3B82F6', end: '#6366F1' },
    warning: { start: '#F59E0B', end: '#EF4444' },
    danger: { start: '#EF4444', end: '#DC2626' },
    rainbow: { start: '#6366F1', end: '#8B5CF6' },
};

// KPI Card color schemes
export const KPI_COLORS = {
    suppliers: '#6366F1',
    inventory: '#22C55E',
    alerts: '#F59E0B',
    products: '#3B82F6',
    salesTotal: '#22C55E',
    salesInStore: '#6366F1',
    salesOnline: '#8B5CF6',
    avgOrder: '#F59E0B',
};

// Location colors - professional palette
export const LOCATION_COLORS = [
    '#6366F1', // In-Store - Indigo
    '#22C55E', // Online - Green
    '#3B82F6', // Warehouse - Blue
    '#F59E0B', // Supplier - Amber
    '#8B5CF6', // Other - Violet
];

// Category colors
export const CATEGORY_COLORS = [
    '#6366F1',
    '#8B5CF6',
    '#3B82F6',
    '#22C55E',
    '#F59E0B',
];

// Sales chart colors
export const SALES_COLORS = {
    total: '#22C55E',
    inStore: '#6366F1',
    online: '#8B5CF6',
    trend: '#F59E0B',
    orders: '#3B82F6',
};

// CSS variable exports (matches globals.css)
export const CSS_COLORS = {
    '--chart-1': '#7C7C8A',
    '--chart-2': '#6366F1',
    '--chart-3': '#8B5CF6',
    '--chart-4': '#7C3AED',
    '--chart-5': '#5B21B6',
};

export default CHART_COLORS;
