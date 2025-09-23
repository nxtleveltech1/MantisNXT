/**
 * Currency Utilities Index
 * Central export for all South African Rand (ZAR) currency utilities
 */

// ZAR Formatter utilities
export * from './zar-formatter'

// ZAR Constants
export * from './constants'

// Re-export from main utils for backward compatibility
export { formatZAR, formatCompactZAR, getBEELevelColor, calculateVAT, addVAT, removeVAT } from '../zar-utils'