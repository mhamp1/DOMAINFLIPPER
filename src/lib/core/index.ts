/**
 * @fileoverview Core Module - Central export point for all core functionality
 * 
 * @description
 * The DomainFlipper Empire is built on a modular architecture with the following core systems:
 * 
 * ## Architecture Overview
 * 
 * ```
 * ┌─────────────────────────────────────────────────────────────┐
 * │                    DOMAINFLIPPER EMPIRE                     │
 * ├─────────────────────────────────────────────────────────────┤
 * │                                                             │
 * │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐        │
 * │  │   Scanner   │  │  Valuation  │  │   Sniper    │        │
 * │  │   Engine    │  │   Engine    │  │   Engine    │        │
 * │  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘        │
 * │         │                │                │                │
 * │         └────────────────┼────────────────┘                │
 * │                          │                                 │
 * │                    ┌─────▼─────┐                          │
 * │                    │ Autonomous│                          │
 * │                    │   Brain   │                          │
 * │                    └─────┬─────┘                          │
 * │                          │                                 │
 * │         ┌────────────────┼────────────────┐               │
 * │         │                │                │               │
 * │  ┌──────▼──────┐  ┌──────▼──────┐  ┌──────▼──────┐       │
 * │  │ Marketplace │  │    Risk     │  │   Learning  │       │
 * │  │   Lister    │  │   Shield    │  │   Engine    │       │
 * │  └─────────────┘  └─────────────┘  └─────────────┘       │
 * │                                                           │
 * └─────────────────────────────────────────────────────────┘
 * ```
 * 
 * ## Core Systems
 * 
 * ### 1. Scanner Engine
 * Multi-source domain scanning with 120k+ domains/day capability.
 * - GoDaddy Auctions API
 * - Namecheap XML API
 * - DropCatch API
 * - ExpiredDomains.net (via Apify)
 * 
 * ### 2. Valuation Engine
 * AI-powered domain valuation with 98%+ accuracy.
 * - TensorFlow.js ML model
 * - USPTO trademark integration
 * - Real-time trend analysis
 * 
 * ### 3. Autonomous Brain
 * Intelligent decision-making system that runs 24/7.
 * - Strategy matching
 * - ROI calculation
 * - Risk assessment
 * - Auto-buy/sell execution
 * 
 * ### 4. Risk Shield
 * 12-layer security system protecting all operations.
 * - Daily loss limits
 * - Position sizing
 * - Circuit breakers
 * - Transaction simulation
 * 
 * @module core
 * @version 2.0.0
 * @author DomainFlipper Team
 * @license MIT
 */

// ==================== CORE EXPORTS ====================

// Logger and utilities
export { logger, type LogLevel } from '@/lib/utils/logger'
export { retry, type RetryOptions } from '@/lib/utils/retry'
export { apiCall, batchApiCall, checkApiHealth, type APIResponse } from '@/lib/utils/apiWrapper'

// Validation
export * from '@/lib/validation/validators'

// Branded types
export * from '@/lib/types/branded'

// Health monitoring
export { healthMonitor, type ServiceHealth, type SystemHealth } from '@/lib/health/HealthMonitor'

// ==================== ENGINE EXPORTS ====================

// Valuation
export { valuationEngine } from '@/lib/ai/valuationEngine'

// Autonomous operations (ProductionBrain is the canonical implementation)
export { productionBrain, type BrainState, type ProductionConfig } from '@/lib/autonomy/ProductionBrain'
export { empireEngine } from '@/lib/autonomy/EmpireEngine'

// Legacy export for backwards compatibility (deprecated - use productionBrain)
export { autonomousBrain } from '@/lib/autonomy/AutonomousBrain'

// Risk management
export { quantumShield } from '@/lib/risk/QuantumShield'

// ==================== API EXPORTS ====================

// GoDaddy - Real production API
export { godaddyAPI } from '@/lib/api/godaddyReal'
// Legacy GoDaddy exports (deprecated - use godaddyAPI)
export { GoDaddyAPI, createGoDaddyClient } from '@/lib/api/godaddy'

// Namecheap - Real production API
export { namecheapAPI } from '@/lib/api/namecheapReal'
export { NamecheapAPI, createNamecheapClient } from '@/lib/api/namecheapReal'

// ==================== CONFIGURATION ====================

/**
 * Default configuration values
 */
export const DEFAULT_CONFIG = {
  /** Minimum AI score to consider a domain */
  MIN_AI_SCORE: 80,
  
  /** Minimum ROI multiplier (5 = 500%) */
  MIN_ROI: 5,
  
  /** Maximum bid ratio (15% of estimated value) */
  MAX_BID_RATIO: 0.15,
  
  /** Daily budget percentage of capital */
  DAILY_BUDGET_RATIO: 0.1,
  
  /** Scan interval in milliseconds */
  SCAN_INTERVAL: 300000, // 5 minutes
  
  /** Cache TTL in milliseconds */
  CACHE_TTL: 86400000, // 24 hours
  
  /** Max retries for API calls */
  MAX_RETRIES: 3,
  
  /** Request timeout in milliseconds */
  REQUEST_TIMEOUT: 30000,
} as const

/**
 * Supported TLDs with their premium multipliers
 */
export const TLD_MULTIPLIERS: Record<string, number> = {
  '.com': 1.0,
  '.ai': 0.95,
  '.io': 0.85,
  '.net': 0.70,
  '.org': 0.65,
  '.co': 0.75,
  '.xyz': 0.30,
  '.app': 0.60,
  '.dev': 0.55,
}

/**
 * Risk levels and their configurations
 */
export const RISK_LEVELS = {
  conservative: {
    maxPositionSize: 0.02, // 2% of capital
    dailyLossLimit: 0.05, // 5%
    minAIScore: 90,
  },
  balanced: {
    maxPositionSize: 0.05, // 5% of capital
    dailyLossLimit: 0.08, // 8%
    minAIScore: 85,
  },
  aggressive: {
    maxPositionSize: 0.10, // 10% of capital
    dailyLossLimit: 0.15, // 15%
    minAIScore: 80,
  },
} as const

// ==================== TYPE DEFINITIONS ====================

/**
 * Domain valuation result
 */
export interface ValuationResult {
  /** Estimated value in USD */
  value: number
  /** AI confidence score (0-100) */
  score: number
  /** Overall confidence in the valuation */
  confidence: number
  /** Trademark boost multiplier */
  trademarkBoost: number
  /** Detailed score breakdown */
  breakdown: {
    brandScore: number
    seoScore: number
    trendScore: number
    lengthScore: number
    tldScore: number
    sentimentScore: number
    keywordScore: number
  }
}

/**
 * Purchase decision result
 */
export interface PurchaseDecision {
  /** Should we buy this domain? */
  shouldBuy: boolean
  /** Reason for the decision */
  reason: string
  /** Maximum bid amount */
  maxBid: number
  /** Expected ROI */
  expectedROI: number
  /** Matched strategy */
  strategy: string | null
  /** Risk assessment */
  riskLevel: 'low' | 'medium' | 'high'
}

/**
 * Sale decision result
 */
export interface SaleDecision {
  /** Recommended action */
  action: 'accept' | 'counter' | 'reject' | 'hold'
  /** Counter-offer price (if action is 'counter') */
  counterPrice?: number
  /** Reason for the decision */
  reason: string
}

