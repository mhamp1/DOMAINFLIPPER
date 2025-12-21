/**
 * ConfigValidator.ts — Comprehensive Configuration Validation
 * NO FALLBACKS - Tells user EXACTLY what's missing and where to fix it
 * December 2025
 */

import { masterConfig } from '@/lib/config/MasterConfig'
import { empireSettings } from '@/lib/config/EmpireSettings'
import { godaddyAPI } from '@/lib/api/godaddyReal'
import { namecheapAPI } from '@/lib/api/namecheapReal'
import { logger } from '@/lib/utils/logger'

export interface ValidationIssue {
  severity: 'critical' | 'warning' | 'info'
  component: string
  issue: string
  requiredAction: string
  location: string // Where to fix it (e.g., "Settings → API Setup → GoDaddy")
  details?: string
}

export interface ValidationResult {
  passed: boolean
  canStart: boolean
  issues: ValidationIssue[]
  summary: string
}

class ConfigValidator {
  /**
   * Validate entire configuration before bot can start
   * Returns detailed report of what's missing
   */
  validate(): ValidationResult {
    const issues: ValidationIssue[] = []

    // 1. Validate API Configuration
    this.validateAPIs(issues)

    // 2. Validate Empire Settings
    this.validateEmpireSettings(issues)

    // 3. Validate Financial Settings
    this.validateFinancialSettings(issues)

    // 4. Validate Environment
    this.validateEnvironment(issues)

    // Determine if bot can start
    const criticalIssues = issues.filter(i => i.severity === 'critical')
    const canStart = criticalIssues.length === 0

    // Generate summary
    const summary = this.generateSummary(issues, canStart)

    return {
      passed: issues.length === 0,
      canStart,
      issues,
      summary,
    }
  }

  /**
   * Validate API configurations
   */
  private validateAPIs(issues: ValidationIssue[]): void {
    const godaddyReady = godaddyAPI.isReady()
    const namecheapReady = namecheapAPI.isReady()

    // Check if at least ONE API is configured
    if (!godaddyReady && !namecheapReady) {
      issues.push({
        severity: 'critical',
        component: 'API Configuration',
        issue: 'No API sources configured',
        requiredAction: 'Configure at least one domain registrar API (GoDaddy or Namecheap)',
        location: 'Settings → API Setup',
        details: 'The bot cannot scan for domains without at least one API configured. Choose either GoDaddy or Namecheap and add your API credentials.',
      })
    }

    // Check GoDaddy specifically
    if (!godaddyReady) {
      const config = masterConfig.getGoDaddy()
      const missing: string[] = []
      
      if (!config.apiKey) missing.push('API Key')
      if (!config.apiSecret) missing.push('API Secret')

      if (missing.length > 0) {
        issues.push({
          severity: 'warning',
          component: 'GoDaddy API',
          issue: `GoDaddy API not configured: Missing ${missing.join(', ')}`,
          requiredAction: `Add your GoDaddy ${missing.join(' and ')}`,
          location: 'Settings → API Setup → GoDaddy',
          details: 'Get your API credentials from https://developer.godaddy.com/keys',
        })
      }
    }

    // Check Namecheap specifically
    if (!namecheapReady) {
      const config = masterConfig.getNamecheap()
      const missing: string[] = []
      
      if (!config.apiUser) missing.push('API Username')
      if (!config.apiKey) missing.push('API Key')
      if (!config.clientIp) missing.push('Client IP Address')

      if (missing.length > 0) {
        issues.push({
          severity: 'warning',
          component: 'Namecheap API',
          issue: `Namecheap API not configured: Missing ${missing.join(', ')}`,
          requiredAction: `Add your Namecheap ${missing.join(', ')}`,
          location: 'Settings → API Setup → Namecheap',
          details: 'Get your API credentials from https://namecheap.com/support/api and whitelist your IP address',
        })
      }
    }
  }

  /**
   * Validate empire settings
   */
  private validateEmpireSettings(issues: ValidationIssue[]): void {
    const empireConfig = masterConfig.getEmpire()

    // Check capital
    if (empireConfig.totalCapital < 10) {
      issues.push({
        severity: 'critical',
        component: 'Empire Settings',
        issue: 'Insufficient capital configured',
        requiredAction: `Set total capital to at least $10 (currently: $${empireConfig.totalCapital})`,
        location: 'Settings → Empire Settings → Total Capital',
        details: 'The bot needs a minimum capital allocation to operate. Recommended: Start with at least $100.',
      })
    }

    // Check daily budget
    if (empireConfig.dailyBudget < 1) {
      issues.push({
        severity: 'critical',
        component: 'Empire Settings',
        issue: 'Daily budget not set',
        requiredAction: `Set daily budget to at least $1 (currently: $${empireConfig.dailyBudget})`,
        location: 'Settings → Empire Settings → Daily Budget',
        details: 'Daily budget controls how much the bot can spend per day. Recommended: 10-20% of total capital.',
      })
    }

    // Check min ROI
    if (empireConfig.minROI < 1.5) {
      issues.push({
        severity: 'warning',
        component: 'Empire Settings',
        issue: 'Minimum ROI threshold is very low',
        requiredAction: `Consider increasing minROI from ${empireConfig.minROI}x to at least 2.5x`,
        location: 'Settings → Empire Settings → Min ROI',
        details: 'Low ROI thresholds increase risk. Recommended: 3x or higher for safer flips.',
      })
    }
  }

  /**
   * Validate financial settings
   */
  private validateFinancialSettings(issues: ValidationIssue[]): void {
    const availableCapital = empireSettings.getAvailableCapital()
    const empireConfig = masterConfig.getEmpire()

    if (availableCapital < 1) {
      issues.push({
        severity: 'critical',
        component: 'Financial Status',
        issue: 'No available capital',
        requiredAction: 'Add capital or reset daily budget',
        location: 'Settings → Empire Settings',
        details: `Total capital: $${empireConfig.totalCapital}, Available: $${availableCapital}. Check if daily budget has been exceeded.`,
      })
    }
  }

  /**
   * Validate environment setup
   */
  private validateEnvironment(issues: ValidationIssue[]): void {
    // Only check browser features if we're in a browser environment
    // Skip these checks in server-side/Node.js environments
    if (typeof window !== 'undefined') {
      // Check localStorage availability
      try {
        localStorage.setItem('test', 'test')
        localStorage.removeItem('test')
      } catch (e) {
        issues.push({
          severity: 'warning',
          component: 'Browser Storage',
          issue: 'localStorage not available',
          requiredAction: 'Enable cookies and storage in your browser',
          location: 'Browser Settings',
          details: 'The app uses localStorage to persist settings. Some features may not work correctly.',
        })
      }
    }
    // Note: Server-side environments (Node.js) will skip these checks
  }

  /**
   * Generate human-readable summary
   */
  private generateSummary(issues: ValidationIssue[], canStart: boolean): string {
    if (issues.length === 0) {
      return '✅ All systems configured correctly. Bot is ready to start.'
    }

    const critical = issues.filter(i => i.severity === 'critical').length
    const warnings = issues.filter(i => i.severity === 'warning').length
    const info = issues.filter(i => i.severity === 'info').length

    let summary = ''
    
    if (critical > 0) {
      summary += `❌ ${critical} CRITICAL issue${critical > 1 ? 's' : ''} preventing bot from starting.\n`
    }
    if (warnings > 0) {
      summary += `⚠️ ${warnings} warning${warnings > 1 ? 's' : ''} detected.\n`
    }
    if (info > 0) {
      summary += `ℹ️ ${info} informational message${info > 1 ? 's' : ''}.\n`
    }

    if (!canStart) {
      summary += '\n🛑 FIX CRITICAL ISSUES BEFORE STARTING THE BOT'
    }

    return summary
  }

  /**
   * Get detailed error report for logging/display
   */
  getDetailedReport(result: ValidationResult): string {
    let report = `\n${'='.repeat(70)}\n`
    report += `CONFIGURATION VALIDATION REPORT\n`
    report += `${'='.repeat(70)}\n\n`
    
    report += `Status: ${result.canStart ? '✅ READY' : '❌ NOT READY'}\n`
    report += `${result.summary}\n\n`

    if (result.issues.length > 0) {
      report += `ISSUES FOUND (${result.issues.length}):\n`
      report += `${'-'.repeat(70)}\n\n`

      result.issues.forEach((issue, index) => {
        const icon = issue.severity === 'critical' ? '❌' : issue.severity === 'warning' ? '⚠️' : 'ℹ️'
        report += `${index + 1}. ${icon} [${issue.severity.toUpperCase()}] ${issue.component}\n`
        report += `   Issue: ${issue.issue}\n`
        report += `   Action Required: ${issue.requiredAction}\n`
        report += `   Where to Fix: ${issue.location}\n`
        if (issue.details) {
          report += `   Details: ${issue.details}\n`
        }
        report += `\n`
      })
    }

    report += `${'='.repeat(70)}\n`
    return report
  }
}

export const configValidator = new ConfigValidator()
