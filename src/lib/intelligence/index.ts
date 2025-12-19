/**
 * Intelligence Module Exports
 * 
 * Central export for all intelligence-related functionality
 */

// INTELLIGENCE CORE — Unified Learning & Market Analysis System
// This is the CANONICAL intelligence layer for ProductionBrain
export { 
  intelligenceCore,
  type MarketPhase,
  type MoodType,
  type EvolutionLevel,
  type FlipMemory,
  type CompetitorProfile,
  type IntelligenceState,
  type StrategicPriority,
  type PortfolioStrategy,
  type ResourceAllocation as IntelligenceResourceAllocation,
} from './IntelligenceCore'

// CEO Brain - Executive Strategic Intelligence (optional strategic layer)
export { ceoBrain } from './CEOBrain'
export type { CEOState, ExecutiveDecision, MarketCondition, StrategicInsight, ResourceAllocation } from './CEOBrain'

// Strategic Thinking - Advanced Reasoning Engine
export { strategicThinking } from './StrategicThinking'
export type { ThoughtProcess, Scenario, CompetitivePosition, TradeoffAnalysis } from './StrategicThinking'

// Market Intelligence
export { marketIntelEngine } from './MarketIntelEngine'

// Lead Scanner
export { leadScanner } from './LeadScanner'

// God Vision - Pre-emptive Intelligence
export { godVision } from './GodVision'

// Intelligence Engine
export { intelligenceEngine } from './intelligenceEngine'

// Filters
export { applyFilters, checkProfanity, checkTrademarkRisk, checkScamRisk, calculateMomentumScore, DEFAULT_FILTER_SETTINGS } from './filters'
export type { FilterResult, FilterSettings, MomentumScore } from './filters'

// Brandability Scorer
export { brandabilityScorer, DEFAULT_BRANDABILITY_CONFIG } from './brandabilityScorer'
export type { BrandabilityScore, BrandabilityConfig } from './brandabilityScorer'

// Seasonal Trend Analyzer
export { seasonalTrendAnalyzer } from './seasonalTrendAnalyzer'

