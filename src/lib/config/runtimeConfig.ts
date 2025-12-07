/**
 * Runtime Configuration Validator
 * Validates and provides safe defaults for pipeline environment configuration
 * December 2025
 */

import { logger } from '@/lib/utils/logger'

export interface RuntimeConfig {
  // Pipeline behavior flags
  DRY_RUN: boolean
  SIMULATION: boolean
  
  // Spending limits (USD)
  MAX_SPEND_PER_DAY: number
  MAX_SPEND_PER_DOMAIN: number
  MARGIN_THRESHOLD: number // Minimum expected ROI percentage
  
  // Domain filters
  ALLOWED_TLDS: string[]
  
  // Provider configuration
  REGISTRAR_PROVIDER: string // 'godaddy' | 'namecheap' | 'dropcatch'
  REGISTRAR_API_KEY?: string
  REGISTRAR_API_SECRET?: string
  
  // Marketplace channels
  MARKETPLACE_CHANNELS: string[] // ['sedo', 'afternic', 'flippa']
  
  // Escrow/Payments
  ESCROW_PROVIDER?: string
  ESCROW_API_KEY?: string
  PAYMENT_PROVIDER?: string
  PAYMENT_API_KEY?: string
  
  // Monitoring
  ALERT_WEBHOOK?: string
  HEALTH_CHECK_INTERVAL: number // milliseconds
  
  // Database
  SUPABASE_URL?: string
  SUPABASE_KEY?: string
}

const DEFAULT_CONFIG: RuntimeConfig = {
  DRY_RUN: true, // Safe default: no actual spending
  SIMULATION: true,
  MAX_SPEND_PER_DAY: 100,
  MAX_SPEND_PER_DOMAIN: 50,
  MARGIN_THRESHOLD: 50, // 50% minimum ROI
  ALLOWED_TLDS: ['com', 'net', 'org', 'io', 'ai'],
  REGISTRAR_PROVIDER: 'godaddy',
  MARKETPLACE_CHANNELS: ['sedo'],
  HEALTH_CHECK_INTERVAL: 60000, // 1 minute
}

/**
 * Parse boolean from environment variable
 */
function parseBoolean(value: string | undefined, defaultValue: boolean): boolean {
  if (!value) return defaultValue
  return value.toLowerCase() === 'true' || value === '1'
}

/**
 * Parse number from environment variable
 */
function parseNumber(value: string | undefined, defaultValue: number): number {
  if (!value) return defaultValue
  const parsed = parseFloat(value)
  return isNaN(parsed) ? defaultValue : parsed
}

/**
 * Parse comma-separated array from environment variable
 */
function parseArray(value: string | undefined, defaultValue: string[]): string[] {
  if (!value) return defaultValue
  return value.split(',').map(s => s.trim()).filter(Boolean)
}

/**
 * Load and validate runtime configuration from environment
 */
export function loadRuntimeConfig(): RuntimeConfig {
  const config: RuntimeConfig = {
    // Pipeline behavior
    DRY_RUN: parseBoolean(
      import.meta.env.VITE_DRY_RUN || import.meta.env.DRY_RUN,
      DEFAULT_CONFIG.DRY_RUN
    ),
    SIMULATION: parseBoolean(
      import.meta.env.VITE_SIMULATION || import.meta.env.SIMULATION,
      DEFAULT_CONFIG.SIMULATION
    ),
    
    // Spending limits
    MAX_SPEND_PER_DAY: parseNumber(
      import.meta.env.VITE_MAX_SPEND_PER_DAY || import.meta.env.MAX_SPEND_PER_DAY,
      DEFAULT_CONFIG.MAX_SPEND_PER_DAY
    ),
    MAX_SPEND_PER_DOMAIN: parseNumber(
      import.meta.env.VITE_MAX_SPEND_PER_DOMAIN || import.meta.env.MAX_SPEND_PER_DOMAIN,
      DEFAULT_CONFIG.MAX_SPEND_PER_DOMAIN
    ),
    MARGIN_THRESHOLD: parseNumber(
      import.meta.env.VITE_MARGIN_THRESHOLD || import.meta.env.MARGIN_THRESHOLD,
      DEFAULT_CONFIG.MARGIN_THRESHOLD
    ),
    
    // Domain filters
    ALLOWED_TLDS: parseArray(
      import.meta.env.VITE_ALLOWED_TLDS || import.meta.env.ALLOWED_TLDS,
      DEFAULT_CONFIG.ALLOWED_TLDS
    ),
    
    // Provider configuration
    REGISTRAR_PROVIDER: (
      import.meta.env.VITE_REGISTRAR_PROVIDER || 
      import.meta.env.REGISTRAR_PROVIDER ||
      DEFAULT_CONFIG.REGISTRAR_PROVIDER
    ).toLowerCase(),
    REGISTRAR_API_KEY: import.meta.env.VITE_GODADDY_API_KEY || 
                       import.meta.env.VITE_NAMECHEAP_API_KEY ||
                       import.meta.env.GODADDY_API_KEY ||
                       import.meta.env.NAMECHEAP_API_KEY,
    REGISTRAR_API_SECRET: import.meta.env.VITE_GODADDY_API_SECRET || 
                          import.meta.env.VITE_NAMECHEAP_API_SECRET ||
                          import.meta.env.GODADDY_API_SECRET ||
                          import.meta.env.NAMECHEAP_API_SECRET,
    
    // Marketplace channels
    MARKETPLACE_CHANNELS: parseArray(
      import.meta.env.VITE_MARKETPLACE_CHANNELS || import.meta.env.MARKETPLACE_CHANNELS,
      DEFAULT_CONFIG.MARKETPLACE_CHANNELS
    ),
    
    // Escrow/Payments
    ESCROW_PROVIDER: import.meta.env.VITE_ESCROW_PROVIDER || import.meta.env.ESCROW_PROVIDER,
    ESCROW_API_KEY: import.meta.env.VITE_ESCROW_API_KEY || import.meta.env.ESCROW_API_KEY,
    PAYMENT_PROVIDER: import.meta.env.VITE_PAYMENT_PROVIDER || import.meta.env.PAYMENT_PROVIDER,
    PAYMENT_API_KEY: import.meta.env.VITE_PAYMENT_API_KEY || import.meta.env.PAYMENT_API_KEY,
    
    // Monitoring
    ALERT_WEBHOOK: import.meta.env.VITE_ALERT_WEBHOOK || import.meta.env.ALERT_WEBHOOK,
    HEALTH_CHECK_INTERVAL: parseNumber(
      import.meta.env.VITE_HEALTH_CHECK_INTERVAL || import.meta.env.HEALTH_CHECK_INTERVAL,
      DEFAULT_CONFIG.HEALTH_CHECK_INTERVAL
    ),
    
    // Database
    SUPABASE_URL: import.meta.env.VITE_SUPABASE_URL || import.meta.env.SUPABASE_URL,
    SUPABASE_KEY: import.meta.env.VITE_SUPABASE_ANON_KEY || import.meta.env.SUPABASE_KEY,
  }
  
  // Log configuration warnings
  if (config.DRY_RUN) {
    logger.warn('CONFIG', '🔒 DRY_RUN mode enabled - no real purchases will be made')
  }
  
  if (!config.REGISTRAR_API_KEY) {
    logger.warn('CONFIG', '⚠️  No registrar API key configured - purchases will fail')
  }
  
  if (config.MAX_SPEND_PER_DAY < config.MAX_SPEND_PER_DOMAIN) {
    logger.warn(
      'CONFIG',
      '⚠️  MAX_SPEND_PER_DAY is less than MAX_SPEND_PER_DOMAIN - may limit purchasing'
    )
  }
  
  if (!config.SUPABASE_URL || !config.SUPABASE_KEY) {
    logger.warn('CONFIG', '⚠️  Supabase not configured - persistence will be limited')
  }
  
  logger.info('CONFIG', 'Runtime configuration loaded', {
    dryRun: config.DRY_RUN,
    simulation: config.SIMULATION,
    maxSpendPerDay: config.MAX_SPEND_PER_DAY,
    maxSpendPerDomain: config.MAX_SPEND_PER_DOMAIN,
    allowedTlds: config.ALLOWED_TLDS,
    registrarProvider: config.REGISTRAR_PROVIDER,
    marketplaceChannels: config.MARKETPLACE_CHANNELS,
  })
  
  return config
}

/**
 * Validate configuration before pipeline execution
 */
export function validateConfig(config: RuntimeConfig): { valid: boolean; errors: string[] } {
  const errors: string[] = []
  
  // Check spending limits are positive
  if (config.MAX_SPEND_PER_DAY <= 0) {
    errors.push('MAX_SPEND_PER_DAY must be positive')
  }
  
  if (config.MAX_SPEND_PER_DOMAIN <= 0) {
    errors.push('MAX_SPEND_PER_DOMAIN must be positive')
  }
  
  if (config.MARGIN_THRESHOLD < 0 || config.MARGIN_THRESHOLD > 1000) {
    errors.push('MARGIN_THRESHOLD must be between 0 and 1000')
  }
  
  // Check TLD list is not empty
  if (config.ALLOWED_TLDS.length === 0) {
    errors.push('ALLOWED_TLDS cannot be empty')
  }
  
  // Validate registrar provider
  const validRegistrars = ['godaddy', 'namecheap', 'dropcatch']
  if (!validRegistrars.includes(config.REGISTRAR_PROVIDER)) {
    errors.push(`REGISTRAR_PROVIDER must be one of: ${validRegistrars.join(', ')}`)
  }
  
  // Warn about missing API keys (not error, as DRY_RUN may not need them)
  if (!config.DRY_RUN && !config.REGISTRAR_API_KEY) {
    errors.push('REGISTRAR_API_KEY required when DRY_RUN is false')
  }
  
  // Check health check interval is reasonable
  if (config.HEALTH_CHECK_INTERVAL < 1000 || config.HEALTH_CHECK_INTERVAL > 3600000) {
    errors.push('HEALTH_CHECK_INTERVAL must be between 1 second and 1 hour')
  }
  
  return {
    valid: errors.length === 0,
    errors,
  }
}

/**
 * Get singleton runtime config instance
 */
let configInstance: RuntimeConfig | null = null

export function getRuntimeConfig(): RuntimeConfig {
  if (!configInstance) {
    configInstance = loadRuntimeConfig()
    const validation = validateConfig(configInstance)
    
    if (!validation.valid) {
      logger.error('CONFIG', 'Configuration validation failed', undefined, {
        errors: validation.errors,
      })
      validation.errors.forEach(error => {
        logger.error('CONFIG', `❌ ${error}`)
      })
      throw new Error(`Invalid configuration: ${validation.errors.join(', ')}`)
    }
  }
  
  return configInstance
}

/**
 * Reset config instance (for testing)
 */
export function resetConfig(): void {
  configInstance = null
}
