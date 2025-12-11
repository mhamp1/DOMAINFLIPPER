/**
 * Internationalization System
 * Multi-language support for DomainFlipper
 * December 2025
 */

import { translations } from './translations'
import type { Language, TranslationKeys } from './translations'
import { logger } from '@/lib/utils/logger'

class I18n {
  private currentLanguage: Language = 'en'
  private listeners: ((language: Language) => void)[] = []

  constructor() {
    // Load saved language preference
    this.loadLanguage()
  }

  /**
   * Get current language
   */
  getCurrentLanguage(): Language {
    return this.currentLanguage
  }

  /**
   * Set language
   */
  setLanguage(language: Language): void {
    if (!translations[language]) {
      logger.warn('I18N', `Unsupported language: ${language}`)
      return
    }

    this.currentLanguage = language
    this.saveLanguage()
    this.notifyListeners()

    logger.info('I18N', `Language changed to: ${language}`)
  }

  /**
   * Get translated text
   */
  t(key: keyof TranslationKeys): string {
    const translation = translations[this.currentLanguage]
    return translation[key] || translations.en[key] || key
  }

  /**
   * Get translated text with interpolation
   */
  tInterpolated(key: keyof TranslationKeys, variables: Record<string, string | number>): string {
    let text = this.t(key)

    // Replace variables like {{variable}}
    Object.entries(variables).forEach(([varName, value]) => {
      text = text.replace(new RegExp(`{{${varName}}}`, 'g'), String(value))
    })

    return text
  }

  /**
   * Get all available languages
   */
  getAvailableLanguages(): { code: Language; name: string; nativeName: string }[] {
    return [
      { code: 'en', name: 'English', nativeName: 'English' },
      { code: 'es', name: 'Spanish', nativeName: 'Español' },
      { code: 'fr', name: 'French', nativeName: 'Français' },
      { code: 'de', name: 'German', nativeName: 'Deutsch' },
      { code: 'zh', name: 'Chinese', nativeName: '中文' },
      { code: 'ja', name: 'Japanese', nativeName: '日本語' },
      { code: 'ko', name: 'Korean', nativeName: '한국어' },
    ]
  }

  /**
   * Subscribe to language changes
   */
  onLanguageChange(listener: (language: Language) => void): () => void {
    this.listeners.push(listener)
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener)
    }
  }

  /**
   * Format currency with locale
   */
  formatCurrency(amount: number, currency: string = 'USD'): string {
    try {
      return new Intl.NumberFormat(this.getLocale(), {
        style: 'currency',
        currency: currency,
      }).format(amount)
    } catch (error) {
      // Fallback to simple formatting
      return `$${amount.toLocaleString()}`
    }
  }

  /**
   * Format number with locale
   */
  formatNumber(num: number): string {
    try {
      return new Intl.NumberFormat(this.getLocale()).format(num)
    } catch (error) {
      return num.toString()
    }
  }

  /**
   * Format date with locale
   */
  formatDate(date: Date): string {
    try {
      return new Intl.DateTimeFormat(this.getLocale()).format(date)
    } catch (error) {
      return date.toLocaleDateString()
    }
  }

  /**
   * Format relative time
   */
  formatRelativeTime(date: Date): string {
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffSeconds = Math.floor(diffMs / 1000)
    const diffMinutes = Math.floor(diffSeconds / 60)
    const diffHours = Math.floor(diffMinutes / 60)
    const diffDays = Math.floor(diffHours / 24)

    if (diffSeconds < 60) {
      return this.t('secondsAgo').replace('{{count}}', diffSeconds.toString())
    } else if (diffMinutes < 60) {
      return this.t('minutesAgo').replace('{{count}}', diffMinutes.toString())
    } else if (diffHours < 24) {
      return this.t('hoursAgo').replace('{{count}}', diffHours.toString())
    } else {
      return this.t('daysAgo').replace('{{count}}', diffDays.toString())
    }
  }

  /**
   * Get locale string for current language
   */
  private getLocale(): string {
    const localeMap: Record<Language, string> = {
      en: 'en-US',
      es: 'es-ES',
      fr: 'fr-FR',
      de: 'de-DE',
      zh: 'zh-CN',
      ja: 'ja-JP',
      ko: 'ko-KR',
    }
    return localeMap[this.currentLanguage] || 'en-US'
  }

  /**
   * Load language from storage
   */
  private loadLanguage(): void {
    try {
      const saved = localStorage.getItem('domainFlipper_language')
      if (saved && translations[saved as Language]) {
        this.currentLanguage = saved as Language
      }
    } catch (error) {
      logger.warn('I18N', 'Failed to load language from storage', error)
    }
  }

  /**
   * Save language to storage
   */
  private saveLanguage(): void {
    try {
      localStorage.setItem('domainFlipper_language', this.currentLanguage)
    } catch (error) {
      logger.warn('I18N', 'Failed to save language to storage', error)
    }
  }

  /**
   * Notify all listeners of language change
   */
  private notifyListeners(): void {
    this.listeners.forEach(listener => listener(this.currentLanguage))
  }
}


export const i18n = new I18n()
