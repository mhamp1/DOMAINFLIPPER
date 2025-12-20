/**
 * LeadScanner.ts — Active Online Lead Scanner
 * Continuously scans Kickstarter, GitHub, Twitter, USPTO for domain opportunities
 * Turns manual research into autonomous sniping
 * December 2025
 */

import axios from 'axios'
import { toast } from 'sonner'
import { logger } from '@/lib/utils/logger'
import { apiCall } from '@/lib/utils/apiWrapper'

// ==================== TYPES ====================

export interface Lead {
  name: string
  source: 'kickstarter' | 'indiegogo' | 'github' | 'twitter' | 'reddit' | 'uspto' | 'producthunt' | 'ycombinator'
  confidence: number // 0-100
  potentialValue: number
  timestamp: Date
  url?: string
  metadata?: Record<string, unknown>
}

export interface LeadScanResult {
  leads: Lead[]
  scannedAt: Date
  sources: string[]
  errors: string[]
}

// ==================== LEAD SCANNER CLASS ====================

class LeadScanner {
  private scanInterval: ReturnType<typeof setInterval> | null = null
  private leads: Lead[] = []
  private isRunning = false
  private lastScan: Date | null = null

  /**
   * Start continuous lead scanning
   */
  startScanning(intervalMs: number = 5 * 60 * 1000): void {
    if (this.isRunning) return

    this.isRunning = true
    logger.info('LEAD_SCANNER', 'Starting continuous lead scanning', { interval: `${intervalMs / 1000}s` })

    // Initial scan
    this.scan()

    // Schedule periodic scans
    this.scanInterval = setInterval(() => this.scan(), intervalMs)
  }

  /**
   * Stop scanning
   */
  stopScanning(): void {
    if (this.scanInterval) {
      clearInterval(this.scanInterval)
      this.scanInterval = null
    }
    this.isRunning = false
    logger.info('LEAD_SCANNER', 'Lead scanning stopped')
  }

  /**
   * Perform a full scan of all sources
   * NOTE: External APIs (Reddit, Google Trends, USPTO, etc.) don't support CORS
   * These require a backend proxy to work - returning empty for now
   */
  async scan(): Promise<LeadScanResult> {
    // DISABLED: External APIs don't support browser CORS
    // These need backend proxy functions to work
    logger.info('LEAD_SCANNER', 'Lead scanning disabled - requires backend proxy for external APIs')
    
    this.lastScan = new Date()
    return {
      leads: [],
      scannedAt: this.lastScan,
      sources: [],
      errors: ['External APIs require backend proxy - scanning disabled']
    }

  }

  /**
   * Scan GitHub trending repos for domain opportunities
   */
  private async scanGitHub(): Promise<Lead[]> {
    const leads: Lead[] = []

    try {
      // Search for newly created repos with high star velocity
      const response = await apiCall(
        () => axios.get('https://api.github.com/search/repositories', {
          params: {
            q: `created:>${this.getDateNDaysAgo(7)} stars:>50`,
            sort: 'stars',
            order: 'desc',
            per_page: 50,
          },
          headers: {
            Accept: 'application/vnd.github.v3+json',
          },
          timeout: 15000,
        }),
        { service: 'github', action: 'searchRepos' }
      )

      if (response.success && response.data?.data?.items) {
        for (const repo of response.data.data.items) {
          const name = this.cleanName(repo.name)
          if (this.isValidDomainName(name)) {
            const starVelocity = repo.stargazers_count / Math.max(1, this.daysSinceCreation(repo.created_at))
            
            leads.push({
              name,
              source: 'github',
              confidence: Math.min(95, 50 + starVelocity * 2),
              potentialValue: this.estimateGitHubValue(repo),
              timestamp: new Date(),
              url: repo.html_url,
              metadata: {
                stars: repo.stargazers_count,
                forks: repo.forks_count,
                language: repo.language,
                description: repo.description,
              },
            })
          }
        }
      }
    } catch (error) {
      logger.warn('LEAD_SCANNER', 'GitHub scan failed', { error })
    }

    return leads
  }

  /**
   * Scan Product Hunt for new product names
   */
  private async scanProductHunt(): Promise<Lead[]> {
    const leads: Lead[] = []

    try {
      // Product Hunt doesn't have a public API, use RSS/alternative
      const response = await apiCall(
        () => axios.get('https://api.producthunt.com/v2/api/graphql', {
          headers: {
            Authorization: `Bearer ${import.meta.env.VITE_PRODUCTHUNT_TOKEN || ''}`,
            'Content-Type': 'application/json',
          },
          data: {
            query: `{ posts(first: 30) { edges { node { name tagline votesCount website } } } }`,
          },
          timeout: 15000,
        }),
        { service: 'producthunt', action: 'getPosts' }
      )

      if (response.success && response.data?.data?.data?.posts?.edges) {
        for (const edge of response.data.data.data.posts.edges) {
          const post = edge.node
          const name = this.cleanName(post.name)
          
          if (this.isValidDomainName(name) && post.votesCount > 100) {
            leads.push({
              name,
              source: 'producthunt',
              confidence: Math.min(90, 60 + post.votesCount / 10),
              potentialValue: post.votesCount * 50, // $50 per vote estimate
              timestamp: new Date(),
              url: post.website,
              metadata: {
                tagline: post.tagline,
                votes: post.votesCount,
              },
            })
          }
        }
      }
    } catch (error) {
      // Product Hunt API may not be available, silently continue
      logger.debug('LEAD_SCANNER', 'Product Hunt scan skipped (no API key)')
    }

    return leads
  }

  /**
   * Scan USPTO for new trademark filings
   */
  private async scanUSPTO(): Promise<Lead[]> {
    const leads: Lead[] = []

    try {
      // USPTO API for recent trademark filings
      const response = await apiCall(
        () => axios.get('https://tsdr.uspto.gov/listedstatus', {
          params: {
            format: 'json',
            start: 0,
            rows: 50,
          },
          timeout: 15000,
        }),
        { service: 'uspto', action: 'searchTrademarks' }
      )

      if (response.success && response.data?.data?.response?.docs) {
        for (const doc of response.data.data.response.docs) {
          const name = this.cleanName(doc.markText || doc.wordMark || '')
          
          if (this.isValidDomainName(name)) {
            leads.push({
              name,
              source: 'uspto',
              confidence: 75, // Trademark filings are high confidence
              potentialValue: 50000, // Trademarks = high value
              timestamp: new Date(),
              metadata: {
                serialNumber: doc.serialNumber,
                status: doc.status,
                filingDate: doc.filingDate,
              },
            })
          }
        }
      }
    } catch (error) {
      logger.debug('LEAD_SCANNER', 'USPTO scan failed (may need API key)')
    }

    return leads
  }

  /**
   * Scan Y Combinator for new batch companies
   */
  private async scanYCombinator(): Promise<Lead[]> {
    const leads: Lead[] = []

    try {
      // YC company API
      const response = await apiCall(
        () => axios.get('https://api.ycombinator.com/v0.1/companies', {
          params: {
            batch: `W${new Date().getFullYear()}`, // Current batch
          },
          timeout: 15000,
        }),
        { service: 'ycombinator', action: 'getCompanies' }
      )

      if (response.success && Array.isArray(response.data?.data)) {
        for (const company of response.data.data) {
          const name = this.cleanName(company.name)
          
          if (this.isValidDomainName(name)) {
            leads.push({
              name,
              source: 'ycombinator',
              confidence: 85, // YC companies are premium
              potentialValue: 100000, // YC = high value
              timestamp: new Date(),
              url: company.website,
              metadata: {
                batch: company.batch,
                description: company.description,
                industry: company.industry,
              },
            })
          }
        }
      }
    } catch (error) {
      logger.debug('LEAD_SCANNER', 'YC scan skipped')
    }

    return leads
  }

  /**
   * Scan Reddit r/startups for mentions
   */
  private async scanRedditStartups(): Promise<Lead[]> {
    const leads: Lead[] = []

    try {
      // Use CORS-safe approach - remove User-Agent header which triggers preflight
      const response = await apiCall(
        () => axios.get('https://www.reddit.com/r/startups/new.json', {
          params: { limit: 50, raw_json: 1 },
          timeout: 15000,
        }),
        { service: 'reddit', action: 'getStartups' }
      )

      if (response.success && response.data?.data?.data?.children) {
        for (const child of response.data.data.data.children) {
          const post = child.data
          const title = post.title || ''
          
          // Extract potential company names from titles
          const nameMatch = title.match(/(?:launched|introducing|announcing|built)\s+([A-Z][a-zA-Z0-9]+)/i)
          if (nameMatch) {
            const name = this.cleanName(nameMatch[1])
            
            if (this.isValidDomainName(name)) {
              leads.push({
                name,
                source: 'reddit',
                confidence: 50 + Math.min(40, post.score / 10),
                potentialValue: Math.max(5000, post.score * 100),
                timestamp: new Date(),
                url: `https://reddit.com${post.permalink}`,
                metadata: {
                  title: post.title,
                  score: post.score,
                  comments: post.num_comments,
                },
              })
            }
          }
        }
      }
    } catch (error) {
      logger.debug('LEAD_SCANNER', 'Reddit scan failed')
    }

    return leads
  }

  // ==================== HELPER METHODS ====================

  private cleanName(name: string): string {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '')
      .slice(0, 63) // Max domain length
  }

  private isValidDomainName(name: string): boolean {
    return (
      name.length >= 3 &&
      name.length <= 20 &&
      /^[a-z][a-z0-9]*$/.test(name) &&
      !['www', 'http', 'https', 'ftp', 'mail'].includes(name)
    )
  }

  private getDateNDaysAgo(days: number): string {
    const date = new Date()
    date.setDate(date.getDate() - days)
    return date.toISOString().split('T')[0]
  }

  private daysSinceCreation(dateStr: string): number {
    return (Date.now() - new Date(dateStr).getTime()) / (24 * 60 * 60 * 1000)
  }

  private estimateGitHubValue(repo: any): number {
    let value = 10000 // Base value
    value += repo.stargazers_count * 20 // $20 per star
    value += repo.forks_count * 50 // $50 per fork
    if (repo.language === 'TypeScript' || repo.language === 'Python') value *= 1.2
    return Math.round(value)
  }

  private deduplicateLeads(leads: Lead[]): Lead[] {
    const seen = new Map<string, Lead>()
    
    for (const lead of leads) {
      const existing = seen.get(lead.name)
      if (!existing || lead.confidence > existing.confidence) {
        seen.set(lead.name, lead)
      }
    }

    return Array.from(seen.values())
  }

  // ==================== PUBLIC GETTERS ====================

  getLeads(): Lead[] {
    return [...this.leads]
  }

  getTopLeads(count: number = 10): Lead[] {
    return [...this.leads]
      .sort((a, b) => b.potentialValue - a.potentialValue)
      .slice(0, count)
  }

  getLastScan(): Date | null {
    return this.lastScan
  }

  isActive(): boolean {
    return this.isRunning
  }
}

// Export singleton
export const leadScanner = new LeadScanner()

