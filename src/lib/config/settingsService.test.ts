/**
 * settingsService.test.ts - Tests for Pipeline Settings Service
 */

import { describe, it, expect, beforeEach } from 'vitest'
import { PipelineSettingsSchema, DEFAULT_PIPELINE_SETTINGS } from './settingsService'

describe('PipelineSettingsSchema', () => {
  it('should validate default settings', () => {
    const result = PipelineSettingsSchema.safeParse(DEFAULT_PIPELINE_SETTINGS)
    expect(result.success).toBe(true)
  })

  it('should enforce DRY_RUN default to true', () => {
    const settings = { ...DEFAULT_PIPELINE_SETTINGS }
    expect(settings.dryRun).toBe(true)
  })

  it('should reject invalid registrar provider', () => {
    const invalid = {
      ...DEFAULT_PIPELINE_SETTINGS,
      registrarProvider: 'InvalidProvider',
    }
    const result = PipelineSettingsSchema.safeParse(invalid)
    expect(result.success).toBe(false)
  })

  it('should reject spend exceeding daily cap', () => {
    const invalid = {
      ...DEFAULT_PIPELINE_SETTINGS,
      maxSpendPerDay: 15000, // Over 10k limit
    }
    const result = PipelineSettingsSchema.safeParse(invalid)
    expect(result.success).toBe(false)
  })

  it('should reject spend below minimum', () => {
    const invalid = {
      ...DEFAULT_PIPELINE_SETTINGS,
      maxSpendPerDay: 0,
    }
    const result = PipelineSettingsSchema.safeParse(invalid)
    expect(result.success).toBe(false)
  })

  it('should reject invalid TLD', () => {
    const invalid = {
      ...DEFAULT_PIPELINE_SETTINGS,
      allowedTLDs: ['.xyz' as any], // Not in enum
    }
    const result = PipelineSettingsSchema.safeParse(invalid)
    expect(result.success).toBe(false)
  })

  it('should accept valid TLDs', () => {
    const valid = {
      ...DEFAULT_PIPELINE_SETTINGS,
      allowedTLDs: ['.com', '.ai', '.io'],
    }
    const result = PipelineSettingsSchema.safeParse(valid)
    expect(result.success).toBe(true)
  })

  it('should reject empty marketplace channels', () => {
    const invalid = {
      ...DEFAULT_PIPELINE_SETTINGS,
      marketplaceChannels: [],
    }
    const result = PipelineSettingsSchema.safeParse(invalid)
    expect(result.success).toBe(false)
  })

  it('should accept valid marketplace channels', () => {
    const valid = {
      ...DEFAULT_PIPELINE_SETTINGS,
      marketplaceChannels: ['Afternic', 'Dan', 'Sedo'],
    }
    const result = PipelineSettingsSchema.safeParse(valid)
    expect(result.success).toBe(true)
  })

  it('should enforce minimum margin multiplier', () => {
    const invalid = {
      ...DEFAULT_PIPELINE_SETTINGS,
      minMarginMultiplier: 1.0, // Below 1.5 minimum
    }
    const result = PipelineSettingsSchema.safeParse(invalid)
    expect(result.success).toBe(false)
  })

  it('should accept valid margin multiplier', () => {
    const valid = {
      ...DEFAULT_PIPELINE_SETTINGS,
      minMarginMultiplier: 3.0,
    }
    const result = PipelineSettingsSchema.safeParse(valid)
    expect(result.success).toBe(true)
  })

  it('should allow empty webhook URL', () => {
    const valid = {
      ...DEFAULT_PIPELINE_SETTINGS,
      alertWebhookUrl: '',
    }
    const result = PipelineSettingsSchema.safeParse(valid)
    expect(result.success).toBe(true)
  })

  it('should validate webhook URL format', () => {
    const invalid = {
      ...DEFAULT_PIPELINE_SETTINGS,
      alertWebhookUrl: 'not-a-url',
    }
    const result = PipelineSettingsSchema.safeParse(invalid)
    expect(result.success).toBe(false)
  })

  it('should accept valid webhook URL', () => {
    const valid = {
      ...DEFAULT_PIPELINE_SETTINGS,
      alertWebhookUrl: 'https://hooks.slack.com/services/ABC123',
    }
    const result = PipelineSettingsSchema.safeParse(valid)
    expect(result.success).toBe(true)
  })

  it('should have correct default values', () => {
    expect(DEFAULT_PIPELINE_SETTINGS).toEqual({
      dryRun: true,
      registrarProvider: 'GoDaddy',
      marketplaceChannels: ['Afternic', 'Dan'],
      maxSpendPerDay: 200,
      maxSpendPerDomain: 20,
      minMarginMultiplier: 3.0,
      allowedTLDs: ['.com', '.ai', '.io'],
      alertWebhookUrl: '',
      lastUpdated: expect.any(String),
      updatedBy: 'system',
    })
  })
})
