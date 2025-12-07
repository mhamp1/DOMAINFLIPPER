/**
 * settingsService.ts - Runtime Pipeline Settings Service
 * Configurable knobs for pipeline operation with UI support
 * Backed by Supabase with fallback to safe defaults
 * December 2025
 */

import { z } from 'zod'
import { supabaseDB } from '@/lib/database/supabase'
import { logger } from '@/lib/utils/logger'
import { toast } from 'sonner'

// ==================== SCHEMA DEFINITIONS ====================

/**
 * TLD whitelist - only these extensions are allowed
 */
export const AllowedTLDSchema = z.enum(['.com', '.ai', '.io', '.net', '.org', '.co'])

/**
 * Registrar provider options
 */
export const RegistrarProviderSchema = z.enum(['GoDaddy', 'Namecheap', 'Auto'])

/**
 * Marketplace channel options
 */
export const MarketplaceChannelSchema = z.enum([
  'Afternic',
  'Dan',
  'Sedo',
  'Flippa',
  'GoDaddy',
])

/**
 * Complete pipeline settings schema with validation
 */
export const PipelineSettingsSchema = z.object({
  // Core toggles
  dryRun: z.boolean().default(true),
  
  // Provider configuration
  registrarProvider: RegistrarProviderSchema.default('GoDaddy'),
  marketplaceChannels: z.array(MarketplaceChannelSchema).min(1).default(['Afternic', 'Dan']),
  
  // Spending limits
  maxSpendPerDay: z.number().min(1).max(10000).default(200),
  maxSpendPerDomain: z.number().min(1).max(1000).default(20),
  
  // ROI requirements
  minMarginMultiplier: z.number().min(1.5).max(100).default(3.0),
  
  // Domain filters
  allowedTLDs: z.array(AllowedTLDSchema).min(1).default(['.com', '.ai', '.io']),
  
  // Alerting
  alertWebhookUrl: z.string().url().optional().or(z.literal('')),
  
  // Metadata
  lastUpdated: z.string().datetime().optional(),
  updatedBy: z.string().optional(),
})

export type PipelineSettings = z.infer<typeof PipelineSettingsSchema>
export type AllowedTLD = z.infer<typeof AllowedTLDSchema>
export type RegistrarProvider = z.infer<typeof RegistrarProviderSchema>
export type MarketplaceChannel = z.infer<typeof MarketplaceChannelSchema>

// ==================== DEFAULT SETTINGS ====================

/**
 * Safe defaults - DRY_RUN always on by default to prevent accidental spending
 */
export const DEFAULT_PIPELINE_SETTINGS: PipelineSettings = {
  dryRun: true,
  registrarProvider: 'GoDaddy',
  marketplaceChannels: ['Afternic', 'Dan'],
  maxSpendPerDay: 200,
  maxSpendPerDomain: 20,
  minMarginMultiplier: 3.0,
  allowedTLDs: ['.com', '.ai', '.io'],
  alertWebhookUrl: '',
  lastUpdated: new Date().toISOString(),
  updatedBy: 'system',
}

// ==================== SETTINGS SERVICE ====================

class SettingsService {
  private settings: PipelineSettings = { ...DEFAULT_PIPELINE_SETTINGS }
  private listeners: Array<(settings: PipelineSettings) => void> = []
  private initialized = false
  private readonly STORAGE_KEY = 'domainFlipper_pipelineSettings'
  private readonly DB_TABLE = 'pipeline_settings'

  constructor() {
    this.loadSettings()
  }

  /**
   * Load settings from Supabase or localStorage with fallback to defaults
   */
  private async loadSettings(): Promise<void> {
    try {
      // Try Supabase first if available
      if (!supabaseDB.isDemo()) {
        const client = supabaseDB.getClient()
        if (client) {
          const { data, error } = await client
            .from(this.DB_TABLE)
            .select('*')
            .order('last_updated', { ascending: false })
            .limit(1)
            .single()

          if (!error && data) {
            const parsed = this.parseSettingsFromDB(data)
            this.settings = parsed
            logger.info('SETTINGS', 'Loaded pipeline settings from Supabase')
            this.initialized = true
            this.notifyListeners()
            return
          }
        }
      }

      // Fallback to localStorage
      const saved = localStorage.getItem(this.STORAGE_KEY)
      if (saved) {
        const parsed = JSON.parse(saved)
        const validated = PipelineSettingsSchema.parse(parsed)
        this.settings = validated
        logger.info('SETTINGS', 'Loaded pipeline settings from localStorage')
      } else {
        logger.info('SETTINGS', 'Using default pipeline settings')
        this.settings = { ...DEFAULT_PIPELINE_SETTINGS }
      }

      this.initialized = true
      this.notifyListeners()
    } catch (error) {
      logger.error('SETTINGS', 'Failed to load settings, using defaults', error as Error)
      this.settings = { ...DEFAULT_PIPELINE_SETTINGS }
      this.initialized = true
    }
  }

  /**
   * Parse settings from database format to application format
   */
  private parseSettingsFromDB(data: any): PipelineSettings {
    return PipelineSettingsSchema.parse({
      dryRun: data.dry_run,
      registrarProvider: data.registrar_provider,
      marketplaceChannels: data.marketplace_channels || [],
      maxSpendPerDay: data.max_spend_per_day,
      maxSpendPerDomain: data.max_spend_per_domain,
      minMarginMultiplier: data.min_margin_multiplier,
      allowedTLDs: data.allowed_tlds || [],
      alertWebhookUrl: data.alert_webhook_url || '',
      lastUpdated: data.last_updated,
      updatedBy: data.updated_by || 'system',
    })
  }

  /**
   * Convert settings to database format
   */
  private settingsToDBFormat(settings: PipelineSettings, userId?: string) {
    return {
      dry_run: settings.dryRun,
      registrar_provider: settings.registrarProvider,
      marketplace_channels: settings.marketplaceChannels,
      max_spend_per_day: settings.maxSpendPerDay,
      max_spend_per_domain: settings.maxSpendPerDomain,
      min_margin_multiplier: settings.minMarginMultiplier,
      allowed_tlds: settings.allowedTLDs,
      alert_webhook_url: settings.alertWebhookUrl || null,
      last_updated: new Date().toISOString(),
      updated_by: userId || 'system',
    }
  }

  /**
   * Get current settings
   */
  getSettings(): PipelineSettings {
    return { ...this.settings }
  }

  /**
   * Update settings with validation
   * @param updates - Partial settings to update
   * @param userId - User ID making the change
   */
  async updateSettings(
    updates: Partial<PipelineSettings>,
    userId?: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      // Merge with current settings
      const newSettings = { ...this.settings, ...updates }

      // Validate against schema
      const validated = PipelineSettingsSchema.parse(newSettings)

      // Enforce guardrails
      const guardrailCheck = this.enforceGuardrails(validated)
      if (!guardrailCheck.valid) {
        return { success: false, error: guardrailCheck.error }
      }

      // Update timestamp
      validated.lastUpdated = new Date().toISOString()
      validated.updatedBy = userId || 'system'

      // Save to Supabase if available
      if (!supabaseDB.isDemo()) {
        const client = supabaseDB.getClient()
        if (client) {
          const dbData = this.settingsToDBFormat(validated, userId)
          
          // Try to update existing, or insert if not exists
          const { error: upsertError } = await client
            .from(this.DB_TABLE)
            .upsert(dbData, { onConflict: 'id' })

          if (upsertError) {
            logger.warn('SETTINGS', 'Failed to save to Supabase, using localStorage', upsertError)
          } else {
            logger.info('SETTINGS', 'Settings saved to Supabase')
          }
        }
      }

      // Always save to localStorage as backup
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(validated))

      // Update in-memory settings
      this.settings = validated

      // Notify listeners
      this.notifyListeners()

      logger.info('SETTINGS', 'Pipeline settings updated', validated)
      toast.success('Settings Updated', {
        description: 'Pipeline configuration saved successfully',
      })

      return { success: true }
    } catch (error) {
      if (error instanceof z.ZodError) {
        const errorMessage = error.issues.map(e => `${e.path.join('.')}: ${e.message}`).join(', ')
        logger.error('SETTINGS', 'Validation error', new Error(errorMessage))
        return { success: false, error: `Validation failed: ${errorMessage}` }
      }

      logger.error('SETTINGS', 'Failed to update settings', error as Error)
      return { success: false, error: 'Failed to update settings' }
    }
  }

  /**
   * Enforce guardrails on settings
   */
  private enforceGuardrails(settings: PipelineSettings): { valid: boolean; error?: string } {
    // Hard cap on daily spend
    if (settings.maxSpendPerDay > 10000) {
      return { valid: false, error: 'Daily spend cap cannot exceed $10,000' }
    }

    // Hard cap on per-domain spend
    if (settings.maxSpendPerDomain > 1000) {
      return { valid: false, error: 'Per-domain spend cap cannot exceed $1,000' }
    }

    // Minimum margin requirements
    if (settings.minMarginMultiplier < 1.5) {
      return { valid: false, error: 'Minimum margin must be at least 1.5x' }
    }

    // Must have at least one TLD
    if (settings.allowedTLDs.length === 0) {
      return { valid: false, error: 'At least one TLD must be allowed' }
    }

    // Must have at least one marketplace
    if (settings.marketplaceChannels.length === 0) {
      return { valid: false, error: 'At least one marketplace must be selected' }
    }

    // Validate webhook URL if provided
    if (settings.alertWebhookUrl && settings.alertWebhookUrl !== '') {
      try {
        new URL(settings.alertWebhookUrl)
      } catch {
        return { valid: false, error: 'Alert webhook URL is invalid' }
      }
    }

    return { valid: true }
  }

  /**
   * Reset to defaults
   */
  async resetToDefaults(userId?: string): Promise<{ success: boolean; error?: string }> {
    const defaults = { ...DEFAULT_PIPELINE_SETTINGS }
    defaults.lastUpdated = new Date().toISOString()
    defaults.updatedBy = userId || 'system'

    return this.updateSettings(defaults, userId)
  }

  /**
   * Check if DRY_RUN is enabled
   */
  isDryRun(): boolean {
    return this.settings.dryRun
  }

  /**
   * Check if a domain meets spending criteria
   */
  canPurchase(domain: string, price: number, estimatedValue: number): {
    allowed: boolean
    reason?: string
  } {
    // Check TLD
    const tld = domain.substring(domain.lastIndexOf('.'))
    if (!this.settings.allowedTLDs.includes(tld as AllowedTLD)) {
      return { allowed: false, reason: `TLD ${tld} not in allowed list` }
    }

    // Check per-domain cap
    if (price > this.settings.maxSpendPerDomain) {
      return {
        allowed: false,
        reason: `Price $${price} exceeds per-domain cap of $${this.settings.maxSpendPerDomain}`,
      }
    }

    // Check margin
    const margin = estimatedValue / price
    if (margin < this.settings.minMarginMultiplier) {
      return {
        allowed: false,
        reason: `Margin ${margin.toFixed(1)}x below minimum ${this.settings.minMarginMultiplier}x`,
      }
    }

    return { allowed: true }
  }

  /**
   * Get daily spending limit
   */
  getDailySpendLimit(): number {
    return this.settings.maxSpendPerDay
  }

  /**
   * Get selected registrar
   */
  getRegistrarProvider(): RegistrarProvider {
    return this.settings.registrarProvider
  }

  /**
   * Get marketplace channels
   */
  getMarketplaceChannels(): MarketplaceChannel[] {
    return [...this.settings.marketplaceChannels]
  }

  /**
   * Subscribe to settings changes
   */
  subscribe(listener: (settings: PipelineSettings) => void): () => void {
    this.listeners.push(listener)
    // Immediately notify with current settings
    if (this.initialized) {
      listener({ ...this.settings })
    }
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener)
    }
  }

  /**
   * Notify all listeners of settings change
   */
  private notifyListeners(): void {
    this.listeners.forEach(listener => {
      try {
        listener({ ...this.settings })
      } catch (error) {
        logger.error('SETTINGS', 'Error notifying listener', error as Error)
      }
    })
  }

  /**
   * Wait for initialization to complete
   */
  async waitForInitialization(): Promise<void> {
    if (this.initialized) return

    return new Promise(resolve => {
      const checkInit = setInterval(() => {
        if (this.initialized) {
          clearInterval(checkInit)
          resolve()
        }
      }, 100)
    })
  }
}

// ==================== SINGLETON EXPORT ====================

export const pipelineSettings = new SettingsService()

// Export for testing
export { SettingsService }
