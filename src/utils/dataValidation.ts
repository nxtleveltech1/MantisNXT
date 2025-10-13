/**
 * Bulletproof Data Validation and Sanitization Utilities
 * Handles malformed data, invalid timestamps, and provides safe fallbacks
 */

import { format, isValid, parseISO, formatDistanceToNow } from 'date-fns'

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

export interface ValidationResult<T> {
  isValid: boolean
  data: T | null
  errors: string[]
  warnings: string[]
  sanitized: boolean
}

export interface TimestampValidationOptions {
  allowNull?: boolean
  fallbackToNow?: boolean
  minDate?: Date
  maxDate?: Date
  formats?: string[]
}

export interface NumberValidationOptions {
  min?: number
  max?: number
  allowNull?: boolean
  fallback?: number
  decimals?: number
}

// ============================================================================
// TIMESTAMP VALIDATION & SANITIZATION
// ============================================================================

export class TimestampValidator {
  /**
   * Comprehensive timestamp validation and sanitization
   */
  static validate(
    value: any,
    options: TimestampValidationOptions = {}
  ): ValidationResult<Date> {
    const {
      allowNull = false,
      fallbackToNow = false,
      minDate = new Date('1970-01-01'),
      maxDate = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1 year from now
      formats = ['yyyy-MM-dd', 'yyyy-MM-dd HH:mm:ss', 'ISO 8601']
    } = options

    const result: ValidationResult<Date> = {
      isValid: false,
      data: null,
      errors: [],
      warnings: [],
      sanitized: false
    }

    // Handle null/undefined
    if (value === null || value === undefined || value === '') {
      if (allowNull) {
        result.isValid = true
        return result
      }

      if (fallbackToNow) {
        result.data = new Date()
        result.isValid = true
        result.sanitized = true
        result.warnings.push('Null timestamp replaced with current time')
        return result
      }

      result.errors.push('Timestamp is required but was null/undefined')
      return result
    }

    let date: Date | null = null

    try {
      // Handle Date objects
      if (value instanceof Date) {
        date = value
      }
      // Handle strings
      else if (typeof value === 'string') {
        // Try ISO parsing first
        if (value.includes('T') || value.includes('Z')) {
          date = parseISO(value)
        }
        // Try standard Date parsing
        else {
          date = new Date(value)
        }
      }
      // Handle numbers (Unix timestamps)
      else if (typeof value === 'number') {
        // Detect if it's seconds or milliseconds
        const timestamp = value > 1e10 ? value : value * 1000
        date = new Date(timestamp)
      }
      // Handle objects with timestamp-like properties
      else if (typeof value === 'object') {
        if (value._seconds && value._nanoseconds) {
          // Firestore timestamp
          date = new Date(value._seconds * 1000 + value._nanoseconds / 1000000)
        } else if (value.seconds) {
          // Other timestamp formats
          date = new Date(value.seconds * 1000)
        } else {
          result.errors.push(`Unsupported timestamp object format: ${JSON.stringify(value)}`)
          return result
        }
      }
      else {
        result.errors.push(`Unsupported timestamp type: ${typeof value}`)
        return result
      }

      // Validate the parsed date
      if (!date || !isValid(date)) {
        result.errors.push(`Invalid date: ${value}`)

        if (fallbackToNow) {
          result.data = new Date()
          result.isValid = true
          result.sanitized = true
          result.warnings.push('Invalid timestamp replaced with current time')
        }

        return result
      }

      // Check date range
      if (date < minDate) {
        result.warnings.push(`Date ${date.toISOString()} is before minimum allowed date ${minDate.toISOString()}`)

        if (fallbackToNow) {
          result.data = new Date()
          result.sanitized = true
        } else {
          result.data = minDate
          result.sanitized = true
        }
      } else if (date > maxDate) {
        result.warnings.push(`Date ${date.toISOString()} is after maximum allowed date ${maxDate.toISOString()}`)

        if (fallbackToNow) {
          result.data = new Date()
          result.sanitized = true
        } else {
          result.data = maxDate
          result.sanitized = true
        }
      } else {
        result.data = date
      }

      result.isValid = true

    } catch (error) {
      result.errors.push(`Failed to parse timestamp: ${error instanceof Error ? error.message : 'Unknown error'}`)

      if (fallbackToNow) {
        result.data = new Date()
        result.isValid = true
        result.sanitized = true
        result.warnings.push('Failed timestamp parsing, replaced with current time')
      }
    }

    return result
  }

  /**
   * Safe timestamp formatting with fallbacks
   */
  static formatSafe(
    value: any,
    formatString: string = 'MMM dd, yyyy',
    fallback: string = 'Invalid Date'
  ): string {
    const validation = this.validate(value, { fallbackToNow: false })

    if (!validation.isValid || !validation.data) {
      return fallback
    }

    try {
      return format(validation.data, formatString)
    } catch (error) {
      console.warn('Date formatting failed:', error)
      return fallback
    }
  }

  /**
   * Safe relative time formatting
   */
  static formatRelativeSafe(
    value: any,
    fallback: string = 'Unknown time'
  ): string {
    const validation = this.validate(value, { fallbackToNow: false })

    if (!validation.isValid || !validation.data) {
      return fallback
    }

    try {
      return formatDistanceToNow(validation.data, { addSuffix: true })
    } catch (error) {
      console.warn('Relative time formatting failed:', error)
      return fallback
    }
  }

  /**
   * Safe timestamp comparison for sorting
   */
  static compareSafe(a: any, b: any, direction: 'asc' | 'desc' = 'desc'): number {
    const aValidation = this.validate(a, { fallbackToNow: false, allowNull: true })
    const bValidation = this.validate(b, { fallbackToNow: false, allowNull: true })

    // Handle null values (put them at the end)
    if (!aValidation.isValid && !bValidation.isValid) return 0
    if (!aValidation.isValid) return direction === 'asc' ? 1 : -1
    if (!bValidation.isValid) return direction === 'asc' ? -1 : 1

    const aTime = aValidation.data!.getTime()
    const bTime = bValidation.data!.getTime()

    if (direction === 'asc') {
      return aTime - bTime
    } else {
      return bTime - aTime
    }
  }
}

// ============================================================================
// NUMBER VALIDATION & SANITIZATION
// ============================================================================

export class NumberValidator {
  static validate(
    value: any,
    options: NumberValidationOptions = {}
  ): ValidationResult<number> {
    const {
      min,
      max,
      allowNull = false,
      fallback = 0,
      decimals
    } = options

    const result: ValidationResult<number> = {
      isValid: false,
      data: null,
      errors: [],
      warnings: [],
      sanitized: false
    }

    // Handle null/undefined
    if (value === null || value === undefined || value === '') {
      if (allowNull) {
        result.isValid = true
        return result
      }

      result.data = fallback
      result.isValid = true
      result.sanitized = true
      result.warnings.push(`Null value replaced with fallback: ${fallback}`)
      return result
    }

    let num: number

    try {
      if (typeof value === 'number') {
        num = value
      } else if (typeof value === 'string') {
        // Clean the string (remove currency symbols, commas, etc.)
        const cleaned = value.replace(/[^\d.-]/g, '')
        num = parseFloat(cleaned)
      } else {
        result.errors.push(`Cannot convert ${typeof value} to number`)
        result.data = fallback
        result.sanitized = true
        return result
      }

      // Check if the result is a valid number
      if (isNaN(num) || !isFinite(num)) {
        result.errors.push(`Invalid number: ${value}`)
        result.data = fallback
        result.sanitized = true
        result.isValid = true
        return result
      }

      // Apply decimal precision
      if (decimals !== undefined) {
        const rounded = Math.round(num * Math.pow(10, decimals)) / Math.pow(10, decimals)
        if (rounded !== num) {
          result.sanitized = true
          result.warnings.push(`Number rounded to ${decimals} decimal places`)
        }
        num = rounded
      }

      // Check range
      if (min !== undefined && num < min) {
        result.warnings.push(`Number ${num} is below minimum ${min}`)
        num = min
        result.sanitized = true
      }

      if (max !== undefined && num > max) {
        result.warnings.push(`Number ${num} is above maximum ${max}`)
        num = max
        result.sanitized = true
      }

      result.data = num
      result.isValid = true

    } catch (error) {
      result.errors.push(`Failed to parse number: ${error instanceof Error ? error.message : 'Unknown error'}`)
      result.data = fallback
      result.sanitized = true
      result.isValid = true
    }

    return result
  }

  /**
   * Safe number formatting with fallbacks
   */
  static formatSafe(
    value: any,
    options: {
      style?: 'decimal' | 'currency' | 'percent'
      currency?: string
      minimumFractionDigits?: number
      maximumFractionDigits?: number
    } = {},
    fallback: string = '0'
  ): string {
    const validation = this.validate(value, { allowNull: false })

    if (!validation.isValid || validation.data === null) {
      return fallback
    }

    try {
      return new Intl.NumberFormat('en-US', options).format(validation.data)
    } catch (error) {
      console.warn('Number formatting failed:', error)
      return fallback
    }
  }
}

// ============================================================================
// STRING VALIDATION & SANITIZATION
// ============================================================================

export class StringValidator {
  static validate(
    value: any,
    options: {
      minLength?: number
      maxLength?: number
      pattern?: RegExp
      allowEmpty?: boolean
      trim?: boolean
      fallback?: string
    } = {}
  ): ValidationResult<string> {
    const {
      minLength,
      maxLength,
      pattern,
      allowEmpty = true,
      trim = true,
      fallback = ''
    } = options

    const result: ValidationResult<string> = {
      isValid: false,
      data: null,
      errors: [],
      warnings: [],
      sanitized: false
    }

    // Convert to string
    let str: string
    if (value === null || value === undefined) {
      str = fallback
      result.sanitized = true
    } else {
      str = String(value)
    }

    // Trim if requested
    if (trim && str !== str.trim()) {
      str = str.trim()
      result.sanitized = true
    }

    // Check empty
    if (str === '' && !allowEmpty) {
      result.errors.push('String cannot be empty')
      str = fallback
      result.sanitized = true
    }

    // Check length
    if (minLength !== undefined && str.length < minLength) {
      result.errors.push(`String too short (${str.length} < ${minLength})`)
    }

    if (maxLength !== undefined && str.length > maxLength) {
      result.warnings.push(`String too long (${str.length} > ${maxLength}), truncating`)
      str = str.substring(0, maxLength)
      result.sanitized = true
    }

    // Check pattern
    if (pattern && !pattern.test(str)) {
      result.errors.push(`String does not match required pattern`)
    }

    result.data = str
    result.isValid = result.errors.length === 0

    return result
  }
}

// ============================================================================
// ARRAY VALIDATION & SANITIZATION
// ============================================================================

export class ArrayValidator {
  static validate<T>(
    value: any,
    itemValidator?: (item: any, index: number) => ValidationResult<T>,
    options: {
      minLength?: number
      maxLength?: number
      allowEmpty?: boolean
      removeInvalid?: boolean
      fallback?: T[]
    } = {}
  ): ValidationResult<T[]> {
    const {
      minLength,
      maxLength,
      allowEmpty = true,
      removeInvalid = true,
      fallback = []
    } = options

    const result: ValidationResult<T[]> = {
      isValid: false,
      data: null,
      errors: [],
      warnings: [],
      sanitized: false
    }

    // Ensure we have an array
    let arr: any[]
    if (Array.isArray(value)) {
      arr = value
    } else if (value === null || value === undefined) {
      arr = fallback
      result.sanitized = true
    } else {
      // Try to convert single item to array
      arr = [value]
      result.sanitized = true
      result.warnings.push('Single value converted to array')
    }

    // Validate items if validator provided
    if (itemValidator) {
      const validatedItems: T[] = []
      let invalidCount = 0

      arr.forEach((item, index) => {
        const itemResult = itemValidator(item, index)
        if (itemResult.isValid && itemResult.data !== null) {
          validatedItems.push(itemResult.data)
          if (itemResult.sanitized) {
            result.sanitized = true
          }
        } else {
          invalidCount++
          if (!removeInvalid) {
            result.errors.push(`Invalid item at index ${index}: ${itemResult.errors.join(', ')}`)
          }
        }
      })

      if (invalidCount > 0) {
        if (removeInvalid) {
          result.warnings.push(`Removed ${invalidCount} invalid items`)
          result.sanitized = true
        }
      }

      arr = validatedItems
    }

    // Check length constraints
    if (!allowEmpty && arr.length === 0) {
      result.errors.push('Array cannot be empty')
    }

    if (minLength !== undefined && arr.length < minLength) {
      result.errors.push(`Array too short (${arr.length} < ${minLength})`)
    }

    if (maxLength !== undefined && arr.length > maxLength) {
      result.warnings.push(`Array too long (${arr.length} > ${maxLength}), truncating`)
      arr = arr.slice(0, maxLength)
      result.sanitized = true
    }

    result.data = arr as T[]
    result.isValid = result.errors.length === 0

    return result
  }
}

// ============================================================================
// COMPREHENSIVE DATA SANITIZER
// ============================================================================

export class DataSanitizer {
  /**
   * Sanitize activity/log data with timestamp handling
   */
  static sanitizeActivity(data: any): any {
    if (!data || typeof data !== 'object') {
      return {
        id: `fallback-${Date.now()}`,
        timestamp: new Date(),
        type: 'unknown',
        description: 'Invalid data entry',
        sanitized: true
      }
    }

    const timestampValidation = TimestampValidator.validate(
      data.timestamp || data.created_at || data.date,
      { fallbackToNow: true }
    )

    return {
      ...data,
      id: StringValidator.validate(data.id, { fallback: `item-${Date.now()}` }).data,
      timestamp: timestampValidation.data,
      type: StringValidator.validate(data.type, { fallback: 'general' }).data,
      description: StringValidator.validate(data.description, { fallback: 'No description' }).data,
      amount: NumberValidator.validate(data.amount, { fallback: 0, decimals: 2 }).data,
      quantity: NumberValidator.validate(data.quantity, { fallback: 0, decimals: 0 }).data,
      status: StringValidator.validate(data.status, { fallback: 'unknown' }).data,
      sanitized: timestampValidation.sanitized || false
    }
  }

  /**
   * Sanitize supplier data
   */
  static sanitizeSupplier(data: any): any {
    if (!data || typeof data !== 'object') return null

    return {
      ...data,
      id: StringValidator.validate(data.id, { fallback: `supplier-${Date.now()}` }).data,
      name: StringValidator.validate(data.name, { fallback: 'Unknown Supplier' }).data,
      email: StringValidator.validate(data.email, { allowEmpty: true }).data,
      phone: StringValidator.validate(data.phone, { allowEmpty: true }).data,
      rating: NumberValidator.validate(data.rating, { min: 0, max: 5, fallback: 0 }).data,
      created_at: TimestampValidator.validate(data.created_at, { fallbackToNow: true }).data,
      updated_at: TimestampValidator.validate(data.updated_at, { fallbackToNow: true }).data
    }
  }

  /**
   * Sanitize inventory item data
   */
  static sanitizeInventoryItem(data: any): any {
    if (!data || typeof data !== 'object') return null

    return {
      ...data,
      id: StringValidator.validate(data.id, { fallback: `item-${Date.now()}` }).data,
      name: StringValidator.validate(data.name, { fallback: 'Unknown Item' }).data,
      sku: StringValidator.validate(data.sku, { fallback: `SKU-${Date.now()}` }).data,
      quantity: NumberValidator.validate(data.quantity, { min: 0, fallback: 0 }).data,
      price: NumberValidator.validate(data.price, { min: 0, fallback: 0, decimals: 2 }).data,
      category: StringValidator.validate(data.category, { fallback: 'uncategorized' }).data,
      created_at: TimestampValidator.validate(data.created_at, { fallbackToNow: true }).data,
      updated_at: TimestampValidator.validate(data.updated_at, { fallbackToNow: true }).data
    }
  }

  /**
   * Sanitize array of data with item-specific sanitizer
   */
  static sanitizeArray<T>(
    data: any,
    itemSanitizer: (item: any) => T | null
  ): T[] {
    const arrayResult = ArrayValidator.validate(
      data,
      (item) => {
        const sanitized = itemSanitizer(item)
        return {
          isValid: sanitized !== null,
          data: sanitized,
          errors: sanitized === null ? ['Item sanitization failed'] : [],
          warnings: [],
          sanitized: false
        }
      },
      { removeInvalid: true }
    )

    return arrayResult.data || []
  }
}

// ============================================================================
// SAFE SORTING UTILITIES
// ============================================================================

export class SafeSorter {
  /**
   * Safe timestamp-based sorting that handles invalid dates
   */
  static byTimestamp<T>(
    items: T[],
    getTimestamp: (item: T) => any,
    direction: 'asc' | 'desc' = 'desc'
  ): T[] {
    return [...items].sort((a, b) => {
      return TimestampValidator.compareSafe(
        getTimestamp(a),
        getTimestamp(b),
        direction
      )
    })
  }

  /**
   * Safe numeric sorting
   */
  static byNumber<T>(
    items: T[],
    getNumber: (item: T) => any,
    direction: 'asc' | 'desc' = 'asc'
  ): T[] {
    return [...items].sort((a, b) => {
      const aVal = NumberValidator.validate(getNumber(a), { fallback: 0 }).data || 0
      const bVal = NumberValidator.validate(getNumber(b), { fallback: 0 }).data || 0

      if (direction === 'asc') {
        return aVal - bVal
      } else {
        return bVal - aVal
      }
    })
  }

  /**
   * Safe string sorting
   */
  static byString<T>(
    items: T[],
    getString: (item: T) => any,
    direction: 'asc' | 'desc' = 'asc'
  ): T[] {
    return [...items].sort((a, b) => {
      const aVal = StringValidator.validate(getString(a), { fallback: '' }).data || ''
      const bVal = StringValidator.validate(getString(b), { fallback: '' }).data || ''

      const comparison = aVal.localeCompare(bVal)
      return direction === 'asc' ? comparison : -comparison
    })
  }
}
