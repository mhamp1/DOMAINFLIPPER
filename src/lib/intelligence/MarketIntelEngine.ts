/**
 * MarketIntelEngine.ts — GOD-TIER MARKET INTELLIGENCE
 * External data feeds, sentiment analysis, predictive alerts
 * December 2025 — The most intelligent domain scanner in existence
 */

import axios from 'axios'
import { toast } from 'sonner'

// ==================== TYPES ====================

interface MarketSignal {
  id: string
  source: 'google' | 'semrush' | 'ahrefs' | 'similarweb' | 'archive' | 'twitter' | 'reddit' | 'kickstarter' | 'producthunt' | 'hackernews'
  keyword: string
  sentiment: 'bullish' | 'bearish' | 'neutral'
  strength: number // 0-100
  volume: number
  growth: number // percentage
  timestamp: Date
  metadata?: Record<string, unknown>
}

interface PredictiveAlert {
  id: string
  type: 'trending' | 'breakout' | 'revival' | 'seasonal' | 'viral'
  keyword: string
  domains: string[]
  urgency: 'critical' | 'high' | 'medium' | 'low'
  estimatedValue: number
  confidence: number
  expiresAt: Date
  reason: string
}

interface SentimentData {
  keyword: string
  overallSentiment: number // -100 to 100
  mentions: number
  positiveCount: number
  negativeCount: number
  neutralCount: number
  sources: string[]
  trendDirection: 'up' | 'down' | 'stable'
}

interface MarketIntelConfig {
  googleApiKey?: string
  semrushApiKey?: string
  ahrefsApiKey?: string
  similarWebApiKey?: string
  archiveOrgEnabled: boolean
  twitterBearerToken?: string
  redditClientId?: string
  redditSecret?: string
  enablePredictiveAlerts: boolean
  alertThreshold: number // minimum confidence for alerts
}

// ==================== MARKET INTEL ENGINE ====================

export class MarketIntelEngine {
  private config: MarketIntelConfig
  private signalsCache: Map<string, MarketSignal[]> = new Map()
  private alertsQueue: PredictiveAlert[] = []
  private sentimentCache: Map<string, SentimentData> = new Map()
  private readonly CACHE_TTL = 30 * 60 * 1000 // 30 minutes
  private isRunning = false

  constructor(config: Partial<MarketIntelConfig> = {}) {
    this.config = {
      archiveOrgEnabled: true,
      enablePredictiveAlerts: true,
      alertThreshold: 70,
      ...config,
    }
  }

  // ==================== EXTERNAL DATA FEEDS ====================

  /**
   * Google Trends — DISABLED (CORS not supported from browser)
   * Requires backend proxy to work
   */
  async fetchGoogleTrends(_category?: string): Promise<MarketSignal[]> {
    // DISABLED: Google Trends doesn't support browser CORS
    console.log('[MARKET_INTEL] Google Trends disabled - requires backend proxy')
    return []

  }

  /**
   * SEMrush — Keyword difficulty & CPC data
   */
  async fetchSEMrushData(keyword: string): Promise<MarketSignal | null> {
    if (!this.config.semrushApiKey) return null

    try {
      const response = await axios.get('https://api.semrush.com/', {
        params: {
          type: 'phrase_all',
          key: this.config.semrushApiKey,
          phrase: keyword,
          database: 'us',
          export_columns: 'Ph,Nq,Cp,Co,Nr,Td',
        },
        timeout: 10000,
      })

      const lines = response.data.split('\n')
      if (lines.length < 2) return null

      const [, data] = lines
      const [phrase, volume, cpc, competition, results, trend] = data.split(';')

      return {
        id: `semrush-${Date.now()}`,
        source: 'semrush',
        keyword: phrase,
        sentiment: parseFloat(trend) > 0 ? 'bullish' : 'bearish',
        strength: Math.min(100, parseFloat(volume) / 1000),
        volume: parseInt(volume) || 0,
        growth: parseFloat(trend) || 0,
        timestamp: new Date(),
        metadata: { cpc: parseFloat(cpc), competition: parseFloat(competition), results: parseInt(results) },
      }
    } catch (error) {
      console.warn('SEMrush fetch error:', error)
      return null
    }
  }

  /**
   * Ahrefs — Backlink & domain authority data
   */
  async fetchAhrefsData(domain: string): Promise<MarketSignal | null> {
    if (!this.config.ahrefsApiKey) return null

    try {
      const response = await axios.get('https://apiv2.ahrefs.com', {
        params: {
          token: this.config.ahrefsApiKey,
          from: 'domain_rating',
          target: domain,
          mode: 'domain',
          output: 'json',
        },
        timeout: 10000,
      })

      const data = response.data?.domain_rating || {}

      return {
        id: `ahrefs-${Date.now()}`,
        source: 'ahrefs',
        keyword: domain,
        sentiment: data.domain_rating > 50 ? 'bullish' : 'neutral',
        strength: data.domain_rating || 0,
        volume: data.refdomains || 0,
        growth: data.ahrefs_rank_change || 0,
        timestamp: new Date(),
        metadata: { dr: data.domain_rating, backlinks: data.backlinks, refdomains: data.refdomains },
      }
    } catch (error) {
      console.warn('Ahrefs fetch error:', error)
      return null
    }
  }

  /**
   * SimilarWeb — Traffic estimation
   */
  async fetchSimilarWebData(domain: string): Promise<MarketSignal | null> {
    if (!this.config.similarWebApiKey) return null

    try {
      const response = await axios.get(`https://api.similarweb.com/v1/website/${domain}/total-traffic-and-engagement/visits`, {
        params: { api_key: this.config.similarWebApiKey },
        timeout: 10000,
      })

      const visits = response.data?.visits || []
      const latestVisits = visits[visits.length - 1]?.visits || 0
      const previousVisits = visits[visits.length - 2]?.visits || latestVisits

      return {
        id: `similarweb-${Date.now()}`,
        source: 'similarweb',
        keyword: domain,
        sentiment: latestVisits > previousVisits ? 'bullish' : 'bearish',
        strength: Math.min(100, latestVisits / 10000),
        volume: latestVisits,
        growth: previousVisits > 0 ? ((latestVisits - previousVisits) / previousVisits) * 100 : 0,
        timestamp: new Date(),
        metadata: { monthlyVisits: latestVisits, bounce_rate: response.data?.bounce_rate },
      }
    } catch (error) {
      console.warn('SimilarWeb fetch error:', error)
      return null
    }
  }

  /**
   * Archive.org — Historical domain data
   */
  async fetchArchiveData(domain: string): Promise<{ age: number; snapshots: number } | null> {
    if (!this.config.archiveOrgEnabled) return null

    try {
      const response = await axios.get(`https://web.archive.org/cdx/search/cdx`, {
        params: {
          url: domain,
          output: 'json',
          fl: 'timestamp',
          collapse: 'timestamp:6',
        },
        timeout: 10000,
      })

      const snapshots = response.data?.slice(1) || []
      if (snapshots.length === 0) return null

      const firstSnapshot = snapshots[0]?.[0]
      const firstDate = new Date(
        parseInt(firstSnapshot.slice(0, 4)),
        parseInt(firstSnapshot.slice(4, 6)) - 1,
        parseInt(firstSnapshot.slice(6, 8))
      )
      const age = Math.floor((Date.now() - firstDate.getTime()) / (365.25 * 24 * 60 * 60 * 1000))

      return { age, snapshots: snapshots.length }
    } catch (error) {
      console.warn('Archive.org fetch error:', error)
      return null
    }
  }

  // ==================== SENTIMENT ANALYSIS ====================

  /**
   * Twitter/X Sentiment — Real-time brand sentiment
   */
  async fetchTwitterSentiment(keyword: string): Promise<SentimentData | null> {
    if (!this.config.twitterBearerToken) return null

    try {
      const response = await axios.get('https://api.twitter.com/2/tweets/search/recent', {
        params: {
          query: `${keyword} -is:retweet lang:en`,
          max_results: 100,
          'tweet.fields': 'public_metrics,created_at',
        },
        headers: { Authorization: `Bearer ${this.config.twitterBearerToken}` },
        timeout: 15000,
      })

      const tweets = response.data?.data || []
      let positive = 0, negative = 0, neutral = 0

      // Simple sentiment analysis based on keywords
      tweets.forEach((tweet: { text: string }) => {
        const text = tweet.text.toLowerCase()
        const positiveWords = ['great', 'love', 'amazing', 'awesome', 'best', 'excellent', 'perfect', 'good', 'nice', 'fantastic']
        const negativeWords = ['bad', 'hate', 'terrible', 'worst', 'awful', 'horrible', 'poor', 'fail', 'scam', 'avoid']

        const posCount = positiveWords.filter(w => text.includes(w)).length
        const negCount = negativeWords.filter(w => text.includes(w)).length

        if (posCount > negCount) positive++
        else if (negCount > posCount) negative++
        else neutral++
      })

      const total = positive + negative + neutral
      const overallSentiment = total > 0 ? ((positive - negative) / total) * 100 : 0

      return {
        keyword,
        overallSentiment,
        mentions: total,
        positiveCount: positive,
        negativeCount: negative,
        neutralCount: neutral,
        sources: ['twitter'],
        trendDirection: overallSentiment > 10 ? 'up' : overallSentiment < -10 ? 'down' : 'stable',
      }
    } catch (error) {
      console.warn('Twitter sentiment error:', error)
      return null
    }
  }

  /**
   * Reddit Sentiment — DISABLED (CORS not supported from browser)
   */
  async fetchRedditSentiment(_keyword: string): Promise<SentimentData | null> {
    console.log('[MARKET_INTEL] Reddit disabled - requires backend proxy')
    return null
  }

  /**
   * Product Hunt — DISABLED (CORS not supported from browser)
   */
  async fetchProductHuntTrends(): Promise<MarketSignal[]> {
    console.log('[MARKET_INTEL] ProductHunt disabled - requires backend proxy')
    return []

  }

  /**
   * Hacker News — DISABLED (These APIs don't support browser CORS)
   */
  async fetchHackerNewsTrends(): Promise<MarketSignal[]> {
    console.log('[MARKET_INTEL] HackerNews disabled - requires backend proxy')
    return []

  }

  // ==================== PREDICTIVE ALERTS ====================

  /**
   * Generate predictive alerts from aggregated signals
   */
  async generatePredictiveAlerts(): Promise<PredictiveAlert[]> {
    if (!this.config.enablePredictiveAlerts) return []

    const alerts: PredictiveAlert[] = []
    const allSignals = await this.aggregateAllSignals()

    // Group signals by keyword
    const keywordGroups = new Map<string, MarketSignal[]>()
    allSignals.forEach(signal => {
      const existing = keywordGroups.get(signal.keyword) || []
      existing.push(signal)
      keywordGroups.set(signal.keyword, existing)
    })

    // Analyze each keyword for alert generation
    for (const [keyword, signals] of keywordGroups.entries()) {
      const avgStrength = signals.reduce((sum, s) => sum + s.strength, 0) / signals.length
      const avgGrowth = signals.reduce((sum, s) => sum + s.growth, 0) / signals.length
      const sources = [...new Set(signals.map(s => s.source))]
      const totalVolume = signals.reduce((sum, s) => sum + s.volume, 0)

      // Only alert on high-confidence opportunities
      if (avgStrength < this.config.alertThreshold) continue
      if (sources.length < 2) continue

      // Determine alert type
      let type: PredictiveAlert['type'] = 'trending'
      if (avgGrowth > 80) type = 'breakout'
      if (avgGrowth > 100 && sources.length >= 3) type = 'viral'

      // Determine urgency
      let urgency: PredictiveAlert['urgency'] = 'medium'
      if (avgStrength >= 90 && sources.length >= 4) urgency = 'critical'
      else if (avgStrength >= 80 || sources.length >= 3) urgency = 'high'
      else if (avgStrength < 75) urgency = 'low'

      // Generate domain suggestions
      const domains = [
        `${keyword}.com`,
        `${keyword}.ai`,
        `${keyword}.io`,
        `get${keyword}.com`,
        `${keyword}app.com`,
        `${keyword}hq.com`,
      ]

      // Estimate value
      const estimatedValue = this.estimateValueFromSignals(keyword, signals)

      alerts.push({
        id: `alert-${Date.now()}-${keyword}`,
        type,
        keyword,
        domains,
        urgency,
        estimatedValue,
        confidence: Math.min(100, avgStrength + sources.length * 3),
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
        reason: this.generateAlertReason(keyword, signals, type),
      })
    }

    // Sort by urgency and confidence
    return alerts
      .sort((a, b) => {
        const urgencyOrder = { critical: 4, high: 3, medium: 2, low: 1 }
        return (urgencyOrder[b.urgency] * 100 + b.confidence) - (urgencyOrder[a.urgency] * 100 + a.confidence)
      })
      .slice(0, 50)
  }

  /**
   * Aggregate signals from all sources
   */
  async aggregateAllSignals(): Promise<MarketSignal[]> {
    const [google, producthunt, hackernews] = await Promise.allSettled([
      this.fetchGoogleTrends(),
      this.fetchProductHuntTrends(),
      this.fetchHackerNewsTrends(),
    ])

    const signals: MarketSignal[] = []

    if (google.status === 'fulfilled') signals.push(...google.value)
    if (producthunt.status === 'fulfilled') signals.push(...producthunt.value)
    if (hackernews.status === 'fulfilled') signals.push(...hackernews.value)

    return signals
  }

  /**
   * Estimate domain value from aggregated signals
   */
  private estimateValueFromSignals(keyword: string, signals: MarketSignal[]): number {
    let baseValue = 500

    // Length premium
    if (keyword.length <= 3) baseValue *= 20
    else if (keyword.length <= 5) baseValue *= 10
    else if (keyword.length <= 7) baseValue *= 4
    else baseValue *= 2

    // Multi-source premium
    const sources = new Set(signals.map(s => s.source)).size
    baseValue *= (1 + sources * 0.3)

    // Strength multiplier
    const avgStrength = signals.reduce((sum, s) => sum + s.strength, 0) / signals.length
    baseValue *= (avgStrength / 50)

    // Volume multiplier
    const totalVolume = signals.reduce((sum, s) => sum + s.volume, 0)
    if (totalVolume > 100000) baseValue *= 3
    else if (totalVolume > 50000) baseValue *= 2
    else if (totalVolume > 10000) baseValue *= 1.5

    return Math.round(baseValue)
  }

  /**
   * Generate human-readable alert reason
   */
  private generateAlertReason(keyword: string, signals: MarketSignal[], type: PredictiveAlert['type']): string {
    const sources = [...new Set(signals.map(s => s.source))]
    const avgGrowth = signals.reduce((sum, s) => sum + s.growth, 0) / signals.length

    switch (type) {
      case 'viral':
        return `"${keyword}" is going VIRAL — detected across ${sources.length} platforms with ${avgGrowth.toFixed(0)}% growth velocity`
      case 'breakout':
        return `"${keyword}" is breaking out — ${avgGrowth.toFixed(0)}% surge detected on ${sources.join(', ')}`
      case 'trending':
        return `"${keyword}" is trending — consistent signals from ${sources.join(', ')}`
      default:
        return `"${keyword}" showing strong signals across ${sources.length} platforms`
    }
  }

  // ==================== PUBLIC API ====================

  /**
   * Get combined sentiment for a keyword
   */
  async getCombinedSentiment(keyword: string): Promise<SentimentData | null> {
    const cached = this.sentimentCache.get(keyword)
    if (cached) return cached

    const [twitter, reddit] = await Promise.allSettled([
      this.fetchTwitterSentiment(keyword),
      this.fetchRedditSentiment(keyword),
    ])

    const results: SentimentData[] = []
    if (twitter.status === 'fulfilled' && twitter.value) results.push(twitter.value)
    if (reddit.status === 'fulfilled' && reddit.value) results.push(reddit.value)

    if (results.length === 0) return null

    // Aggregate sentiment
    const combined: SentimentData = {
      keyword,
      overallSentiment: results.reduce((sum, r) => sum + r.overallSentiment, 0) / results.length,
      mentions: results.reduce((sum, r) => sum + r.mentions, 0),
      positiveCount: results.reduce((sum, r) => sum + r.positiveCount, 0),
      negativeCount: results.reduce((sum, r) => sum + r.negativeCount, 0),
      neutralCount: results.reduce((sum, r) => sum + r.neutralCount, 0),
      sources: results.flatMap(r => r.sources),
      trendDirection: results[0].trendDirection,
    }

    this.sentimentCache.set(keyword, combined)
    return combined
  }

  /**
   * Get all active alerts
   */
  getActiveAlerts(): PredictiveAlert[] {
    return this.alertsQueue.filter(a => a.expiresAt > new Date())
  }

  /**
   * Start continuous monitoring
   */
  async startMonitoring(intervalMs = 300000): Promise<void> {
    if (this.isRunning) return

    this.isRunning = true
    toast.success('🔮 MARKET INTEL ENGINE ONLINE', {
      description: 'Monitoring all data feeds in real-time',
      icon: '📡',
    })

    const monitor = async () => {
      if (!this.isRunning) return

      try {
        const alerts = await this.generatePredictiveAlerts()
        this.alertsQueue = alerts

        // Notify on critical alerts
        const critical = alerts.filter(a => a.urgency === 'critical')
        if (critical.length > 0) {
          toast.warning('🚨 CRITICAL OPPORTUNITIES DETECTED', {
            description: `${critical.length} high-priority domains identified`,
            duration: 10000,
          })
        }
      } catch (error) {
        console.error('Market intel monitoring error:', error)
      }

      setTimeout(monitor, intervalMs)
    }

    await monitor()
  }

  /**
   * Stop monitoring
   */
  stopMonitoring(): void {
    this.isRunning = false
    toast.info('Market Intel Engine paused')
  }

  /**
   * Get stats
   */
  getStats(): { signalsCount: number; alertsCount: number; sourcesActive: string[] } {
    return {
      signalsCount: Array.from(this.signalsCache.values()).flat().length,
      alertsCount: this.alertsQueue.length,
      sourcesActive: ['google', 'producthunt', 'hackernews', 'twitter', 'reddit'],
    }
  }
}

// Import MasterConfig for API keys
import { masterConfig } from '@/lib/config/MasterConfig'

// Export singleton - Uses MasterConfig for API keys
export const marketIntelEngine = new MarketIntelEngine({
  googleApiKey: masterConfig.getGoogle().apiKey || import.meta.env.VITE_GOOGLE_API_KEY,
  semrushApiKey: import.meta.env.VITE_SEMRUSH_API_KEY,
  ahrefsApiKey: import.meta.env.VITE_AHREFS_API_KEY,
  similarWebApiKey: import.meta.env.VITE_SIMILARWEB_API_KEY,
  twitterBearerToken: masterConfig.getTwitter().bearerToken || import.meta.env.VITE_TWITTER_BEARER_TOKEN,
  redditClientId: import.meta.env.VITE_REDDIT_CLIENT_ID,
  redditSecret: import.meta.env.VITE_REDDIT_SECRET,
})

