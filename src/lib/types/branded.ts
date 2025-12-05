/**
 * Branded Types - Type-safe identifiers and values
 * Prevents mixing up different ID types or currency values
 * December 2025
 */

// ==================== BRANDED TYPE HELPERS ====================

/**
 * Brand a type with a unique symbol
 * This prevents accidentally mixing up similar types
 */
declare const __brand: unique symbol
type Brand<T, B> = T & { [__brand]: B }

// ==================== ID TYPES ====================

/** Unique domain identifier */
export type DomainId = Brand<string, 'DomainId'>

/** Unique auction identifier */
export type AuctionId = Brand<string, 'AuctionId'>

/** Unique transaction identifier */
export type TransactionId = Brand<string, 'TransactionId'>

/** Unique bot identifier */
export type BotId = Brand<string, 'BotId'>

/** Unique strategy identifier */
export type StrategyId = Brand<string, 'StrategyId'>

/** Unique user/owner identifier */
export type OwnerId = Brand<string, 'OwnerId'>

// ==================== VALUE TYPES ====================

/** USD currency value (in dollars) */
export type USD = Brand<number, 'USD'>

/** Percentage value (0-100) */
export type Percentage = Brand<number, 'Percentage'>

/** AI Score (0-100) */
export type AIScore = Brand<number, 'AIScore'>

/** Confidence level (0-100) */
export type Confidence = Brand<number, 'Confidence'>

/** ROI multiplier (e.g., 5 = 500%) */
export type ROIMultiplier = Brand<number, 'ROIMultiplier'>

// ==================== TIMESTAMP TYPES ====================

/** Unix timestamp in milliseconds */
export type Timestamp = Brand<number, 'Timestamp'>

/** ISO date string */
export type ISODateString = Brand<string, 'ISODateString'>

// ==================== DOMAIN-SPECIFIC TYPES ====================

/** Valid TLD (e.g., '.com', '.io') */
export type TLD = Brand<string, 'TLD'>

/** Domain name without TLD */
export type DomainName = Brand<string, 'DomainName'>

/** Full domain (name + TLD) */
export type FullDomain = Brand<string, 'FullDomain'>

// ==================== CONSTRUCTOR FUNCTIONS ====================

/**
 * Create a DomainId from a string
 */
export function createDomainId(id: string): DomainId {
  if (!id || id.length === 0) throw new Error('Invalid DomainId: empty string')
  return id as DomainId
}

/**
 * Create an AuctionId from a string
 */
export function createAuctionId(id: string): AuctionId {
  if (!id || id.length === 0) throw new Error('Invalid AuctionId: empty string')
  return id as AuctionId
}

/**
 * Create a TransactionId from a string
 */
export function createTransactionId(id: string): TransactionId {
  if (!id || id.length === 0) throw new Error('Invalid TransactionId: empty string')
  return id as TransactionId
}

/**
 * Create a BotId from a string
 */
export function createBotId(id: string): BotId {
  if (!id || id.length === 0) throw new Error('Invalid BotId: empty string')
  return id as BotId
}

/**
 * Create USD from a number
 */
export function createUSD(amount: number): USD {
  if (amount < 0) throw new Error('Invalid USD: negative amount')
  if (!Number.isFinite(amount)) throw new Error('Invalid USD: not a finite number')
  return Math.round(amount * 100) / 100 as USD // Round to cents
}

/**
 * Create Percentage from a number (0-100)
 */
export function createPercentage(value: number): Percentage {
  if (value < 0 || value > 100) throw new Error('Invalid Percentage: must be 0-100')
  return Math.round(value * 10) / 10 as Percentage // Round to 1 decimal
}

/**
 * Create AIScore from a number (0-100)
 */
export function createAIScore(value: number): AIScore {
  const clamped = Math.max(0, Math.min(100, value))
  return Math.round(clamped) as AIScore
}

/**
 * Create Confidence from a number (0-100)
 */
export function createConfidence(value: number): Confidence {
  const clamped = Math.max(0, Math.min(100, value))
  return Math.round(clamped * 10) / 10 as Confidence
}

/**
 * Create Timestamp from Date or number
 */
export function createTimestamp(value: Date | number): Timestamp {
  const ms = value instanceof Date ? value.getTime() : value
  if (!Number.isFinite(ms) || ms < 0) throw new Error('Invalid Timestamp')
  return ms as Timestamp
}

/**
 * Create ISODateString from Date
 */
export function createISODateString(date: Date): ISODateString {
  return date.toISOString() as ISODateString
}

/**
 * Create TLD from string (validates format)
 */
export function createTLD(tld: string): TLD {
  const normalized = tld.startsWith('.') ? tld.toLowerCase() : `.${tld.toLowerCase()}`
  if (!/^\.[a-z]{2,10}$/.test(normalized)) {
    throw new Error(`Invalid TLD: ${tld}`)
  }
  return normalized as TLD
}

/**
 * Create FullDomain from string (validates format)
 */
export function createFullDomain(domain: string): FullDomain {
  const normalized = domain.toLowerCase().trim()
  if (!/^[a-z0-9]([a-z0-9-]*[a-z0-9])?\.[a-z]{2,10}$/.test(normalized)) {
    throw new Error(`Invalid domain: ${domain}`)
  }
  return normalized as FullDomain
}

// ==================== TYPE GUARDS ====================

/**
 * Check if a value is a valid percentage
 */
export function isValidPercentage(value: number): value is number {
  return value >= 0 && value <= 100 && Number.isFinite(value)
}

/**
 * Check if a value is a valid USD amount
 */
export function isValidUSD(value: number): value is number {
  return value >= 0 && Number.isFinite(value)
}

/**
 * Check if a string is a valid TLD
 */
export function isValidTLD(tld: string): boolean {
  const normalized = tld.startsWith('.') ? tld : `.${tld}`
  return /^\.[a-z]{2,10}$/i.test(normalized)
}

/**
 * Check if a string is a valid domain
 */
export function isValidDomain(domain: string): boolean {
  return /^[a-z0-9]([a-z0-9-]*[a-z0-9])?\.[a-z]{2,10}$/i.test(domain)
}

// ==================== UTILITY FUNCTIONS ====================

/**
 * Extract TLD from full domain
 */
export function extractTLD(domain: FullDomain): TLD {
  const match = domain.match(/\.[a-z]+$/)
  if (!match) throw new Error('Invalid domain format')
  return match[0] as TLD
}

/**
 * Extract name from full domain (without TLD)
 */
export function extractDomainName(domain: FullDomain): DomainName {
  return domain.replace(/\.[a-z]+$/, '') as DomainName
}

/**
 * Format USD for display
 */
export function formatUSD(amount: USD): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount)
}

/**
 * Format percentage for display
 */
export function formatPercentage(value: Percentage, decimals: number = 1): string {
  return `${value.toFixed(decimals)}%`
}

