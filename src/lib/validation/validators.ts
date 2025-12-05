/**
 * Runtime Validation System
 * Type-safe validation with detailed error messages
 * December 2025
 */

import { logger } from '@/lib/utils/logger'

// ==================== VALIDATION RESULT ====================

export interface ValidationResult<T> {
  success: boolean
  data?: T
  errors: ValidationError[]
}

export interface ValidationError {
  field: string
  message: string
  code: string
  value?: unknown
}

// ==================== BASE VALIDATOR ====================

export type Validator<T> = (value: unknown) => ValidationResult<T>

/**
 * Create a successful validation result
 */
function success<T>(data: T): ValidationResult<T> {
  return { success: true, data, errors: [] }
}

/**
 * Create a failed validation result
 */
function failure<T>(errors: ValidationError[]): ValidationResult<T> {
  return { success: false, errors }
}

/**
 * Create a single error
 */
function error(field: string, message: string, code: string, value?: unknown): ValidationError {
  return { field, message, code, value }
}

// ==================== PRIMITIVE VALIDATORS ====================

/**
 * Validate string
 */
export function string(options?: {
  minLength?: number
  maxLength?: number
  pattern?: RegExp
  allowEmpty?: boolean
}): Validator<string> {
  return (value: unknown) => {
    if (typeof value !== 'string') {
      return failure([error('value', 'Must be a string', 'INVALID_TYPE', value)])
    }

    const errors: ValidationError[] = []

    if (!options?.allowEmpty && value.length === 0) {
      errors.push(error('value', 'Cannot be empty', 'EMPTY_STRING'))
    }

    if (options?.minLength && value.length < options.minLength) {
      errors.push(error('value', `Must be at least ${options.minLength} characters`, 'TOO_SHORT', value))
    }

    if (options?.maxLength && value.length > options.maxLength) {
      errors.push(error('value', `Must be at most ${options.maxLength} characters`, 'TOO_LONG', value))
    }

    if (options?.pattern && !options.pattern.test(value)) {
      errors.push(error('value', 'Invalid format', 'INVALID_FORMAT', value))
    }

    return errors.length > 0 ? failure(errors) : success(value)
  }
}

/**
 * Validate number
 */
export function number(options?: {
  min?: number
  max?: number
  integer?: boolean
  positive?: boolean
}): Validator<number> {
  return (value: unknown) => {
    if (typeof value !== 'number' || !Number.isFinite(value)) {
      return failure([error('value', 'Must be a valid number', 'INVALID_TYPE', value)])
    }

    const errors: ValidationError[] = []

    if (options?.integer && !Number.isInteger(value)) {
      errors.push(error('value', 'Must be an integer', 'NOT_INTEGER', value))
    }

    if (options?.positive && value <= 0) {
      errors.push(error('value', 'Must be positive', 'NOT_POSITIVE', value))
    }

    if (options?.min !== undefined && value < options.min) {
      errors.push(error('value', `Must be at least ${options.min}`, 'TOO_SMALL', value))
    }

    if (options?.max !== undefined && value > options.max) {
      errors.push(error('value', `Must be at most ${options.max}`, 'TOO_LARGE', value))
    }

    return errors.length > 0 ? failure(errors) : success(value)
  }
}

/**
 * Validate boolean
 */
export function boolean(): Validator<boolean> {
  return (value: unknown) => {
    if (typeof value !== 'boolean') {
      return failure([error('value', 'Must be a boolean', 'INVALID_TYPE', value)])
    }
    return success(value)
  }
}

// ==================== DOMAIN-SPECIFIC VALIDATORS ====================

/**
 * Validate domain name format
 */
export function domainName(): Validator<string> {
  return (value: unknown) => {
    const strResult = string({ minLength: 1, maxLength: 253 })(value)
    if (!strResult.success) return strResult

    const domain = (strResult.data as string).toLowerCase()
    
    // Check format: name.tld
    if (!/^[a-z0-9]([a-z0-9-]*[a-z0-9])?\.[a-z]{2,10}$/.test(domain)) {
      return failure([error('domain', 'Invalid domain format (e.g., example.com)', 'INVALID_DOMAIN', domain)])
    }

    return success(domain)
  }
}

/**
 * Validate TLD format
 */
export function tld(): Validator<string> {
  return (value: unknown) => {
    const strResult = string({ minLength: 2, maxLength: 11 })(value)
    if (!strResult.success) return strResult

    let normalized = strResult.data as string
    if (!normalized.startsWith('.')) normalized = `.${normalized}`
    normalized = normalized.toLowerCase()

    if (!/^\.[a-z]{2,10}$/.test(normalized)) {
      return failure([error('tld', 'Invalid TLD format (e.g., .com)', 'INVALID_TLD', normalized)])
    }

    return success(normalized)
  }
}

/**
 * Validate USD amount
 */
export function usdAmount(options?: { min?: number; max?: number }): Validator<number> {
  return (value: unknown) => {
    const numResult = number({ min: options?.min ?? 0, max: options?.max, positive: true })(value)
    if (!numResult.success) return numResult

    // Round to cents
    const rounded = Math.round((numResult.data as number) * 100) / 100
    return success(rounded)
  }
}

/**
 * Validate percentage (0-100)
 */
export function percentage(): Validator<number> {
  return number({ min: 0, max: 100 })
}

/**
 * Validate AI score (0-100)
 */
export function aiScore(): Validator<number> {
  return (value: unknown) => {
    const numResult = number({ min: 0, max: 100 })(value)
    if (!numResult.success) return numResult
    return success(Math.round(numResult.data as number))
  }
}

/**
 * Validate API key format
 */
export function apiKey(options?: { prefix?: string; minLength?: number }): Validator<string> {
  return (value: unknown) => {
    const strResult = string({ minLength: options?.minLength ?? 10 })(value)
    if (!strResult.success) return strResult

    const key = strResult.data as string

    if (options?.prefix && !key.startsWith(options.prefix)) {
      return failure([error('apiKey', `Must start with ${options.prefix}`, 'INVALID_PREFIX', key)])
    }

    // Check for suspicious values
    if (key.includes('your-') || key.includes('xxx') || key.includes('placeholder')) {
      return failure([error('apiKey', 'Please use a real API key', 'PLACEHOLDER_KEY', key)])
    }

    return success(key)
  }
}

/**
 * Validate email format
 */
export function email(): Validator<string> {
  return (value: unknown) => {
    const strResult = string()(value)
    if (!strResult.success) return strResult

    const emailStr = strResult.data as string
    
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailStr)) {
      return failure([error('email', 'Invalid email format', 'INVALID_EMAIL', emailStr)])
    }

    return success(emailStr.toLowerCase())
  }
}

/**
 * Validate URL format
 */
export function url(options?: { protocols?: string[] }): Validator<string> {
  return (value: unknown) => {
    const strResult = string()(value)
    if (!strResult.success) return strResult

    const urlStr = strResult.data as string
    
    try {
      const parsed = new URL(urlStr)
      
      if (options?.protocols && !options.protocols.includes(parsed.protocol.replace(':', ''))) {
        return failure([error('url', `Must use ${options.protocols.join(' or ')} protocol`, 'INVALID_PROTOCOL', urlStr)])
      }

      return success(urlStr)
    } catch {
      return failure([error('url', 'Invalid URL format', 'INVALID_URL', urlStr)])
    }
  }
}

// ==================== COMPOSITE VALIDATORS ====================

/**
 * Validate an object with a schema
 */
export function object<T extends Record<string, unknown>>(
  schema: { [K in keyof T]: Validator<T[K]> }
): Validator<T> {
  return (value: unknown) => {
    if (typeof value !== 'object' || value === null || Array.isArray(value)) {
      return failure([error('value', 'Must be an object', 'INVALID_TYPE', value)])
    }

    const obj = value as Record<string, unknown>
    const result: Record<string, unknown> = {}
    const errors: ValidationError[] = []

    for (const [key, validator] of Object.entries(schema)) {
      const fieldResult = (validator as Validator<unknown>)(obj[key])
      
      if (fieldResult.success) {
        result[key] = fieldResult.data
      } else {
        errors.push(...fieldResult.errors.map(e => ({
          ...e,
          field: `${key}${e.field !== 'value' ? `.${e.field}` : ''}`,
        })))
      }
    }

    return errors.length > 0 ? failure(errors) : success(result as T)
  }
}

/**
 * Validate an array
 */
export function array<T>(itemValidator: Validator<T>, options?: {
  minLength?: number
  maxLength?: number
}): Validator<T[]> {
  return (value: unknown) => {
    if (!Array.isArray(value)) {
      return failure([error('value', 'Must be an array', 'INVALID_TYPE', value)])
    }

    const errors: ValidationError[] = []

    if (options?.minLength && value.length < options.minLength) {
      errors.push(error('value', `Must have at least ${options.minLength} items`, 'TOO_FEW', value.length))
    }

    if (options?.maxLength && value.length > options.maxLength) {
      errors.push(error('value', `Must have at most ${options.maxLength} items`, 'TOO_MANY', value.length))
    }

    const results: T[] = []
    
    for (let i = 0; i < value.length; i++) {
      const itemResult = itemValidator(value[i])
      if (itemResult.success) {
        results.push(itemResult.data as T)
      } else {
        errors.push(...itemResult.errors.map(e => ({
          ...e,
          field: `[${i}]${e.field !== 'value' ? `.${e.field}` : ''}`,
        })))
      }
    }

    return errors.length > 0 ? failure(errors) : success(results)
  }
}

/**
 * Optional validator - allows undefined
 */
export function optional<T>(validator: Validator<T>): Validator<T | undefined> {
  return (value: unknown) => {
    if (value === undefined || value === null) {
      return success(undefined)
    }
    return validator(value)
  }
}

/**
 * One of multiple values
 */
export function oneOf<T extends string | number>(values: readonly T[]): Validator<T> {
  return (value: unknown) => {
    if (!values.includes(value as T)) {
      return failure([error('value', `Must be one of: ${values.join(', ')}`, 'INVALID_VALUE', value)])
    }
    return success(value as T)
  }
}

// ==================== VALIDATION UTILITIES ====================

/**
 * Validate and throw if invalid
 */
export function validateOrThrow<T>(validator: Validator<T>, value: unknown, context?: string): T {
  const result = validator(value)
  
  if (!result.success) {
    const errorMsg = result.errors.map(e => `${e.field}: ${e.message}`).join(', ')
    const fullMsg = context ? `${context}: ${errorMsg}` : errorMsg
    logger.error('VALIDATION', fullMsg, new Error(fullMsg), { value, errors: result.errors })
    throw new Error(fullMsg)
  }

  return result.data as T
}

/**
 * Validate and return null if invalid
 */
export function validateOrNull<T>(validator: Validator<T>, value: unknown): T | null {
  const result = validator(value)
  return result.success ? (result.data as T) : null
}

/**
 * Validate with default value
 */
export function validateOrDefault<T>(validator: Validator<T>, value: unknown, defaultValue: T): T {
  const result = validator(value)
  return result.success ? (result.data as T) : defaultValue
}

/**
 * Log validation errors
 */
export function logValidationErrors(result: ValidationResult<unknown>, context: string): void {
  if (!result.success && result.errors.length > 0) {
    logger.warn('VALIDATION', `${context}: ${result.errors.length} validation errors`, {
      errors: result.errors,
    })
  }
}

