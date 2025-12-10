/**
 * Reddit API Integration
 * Search for domain flipping opportunities and market trends
 * December 2025
 */

import axios from 'axios'
import { logger } from '@/lib/utils/logger'
import { rateLimiter } from '@/lib/utils/rateLimiter'

export interface RedditConfig {
  clientId: string
  clientSecret: string
  username: string
  password: string
  userAgent: string
}

export interface RedditPost {
  id: string
  title: string
  content: string
  author: string
  subreddit: string
  url: string
  score: number
  createdAt: Date
  domains?: string[] // Extracted domain names
}

class RedditAPI {
  private config: RedditConfig | null = null
  private accessToken: string | null = null
  private tokenExpiry: Date | null = null
  private baseUrl = 'https://oauth.reddit.com'

  constructor(config?: RedditConfig) {
    if (config) {
      this.config = config
    } else {
      // Load from environment - Note: These should be server-side only in production
      // For browser use, Reddit API should be proxied through a backend service
      const clientId = import.meta.env.VITE_REDDIT_CLIENT_ID
      const clientSecret = import.meta.env.VITE_REDDIT_CLIENT_SECRET
      const username = import.meta.env.VITE_REDDIT_USERNAME
      const password = import.meta.env.VITE_REDDIT_PASSWORD
      const userAgent = import.meta.env.VITE_REDDIT_USER_AGENT || 'DomainFlipper:v1.0.0'

      if (clientId && clientSecret && username && password) {
        this.config = { clientId, clientSecret, username, password, userAgent }
      }
    }
  }

  /**
   * Authenticate with Reddit API
   */
  private async authenticate(): Promise<void> {
    if (!this.config) {
      throw new Error('Reddit API not configured')
    }

    // Check if token is still valid
    if (this.accessToken && this.tokenExpiry && this.tokenExpiry > new Date()) {
      return
    }

    await rateLimiter.waitIfNeeded('reddit')

    try {
      const auth = Buffer.from(`${this.config.clientId}:${this.config.clientSecret}`).toString('base64')
      
      const response = await axios.post(
        'https://www.reddit.com/api/v1/access_token',
        new URLSearchParams({
          grant_type: 'password',
          username: this.config.username,
          password: this.config.password,
        }),
        {
          headers: {
            'Authorization': `Basic ${auth}`,
            'Content-Type': 'application/x-www-form-urlencoded',
            'User-Agent': this.config.userAgent,
          },
        }
      )

      this.accessToken = response.data.access_token
      this.tokenExpiry = new Date(Date.now() + response.data.expires_in * 1000)
      
      logger.info('REDDIT', 'Successfully authenticated')
    } catch (error: any) {
      logger.error('REDDIT', `Authentication failed: ${error.message}`)
      throw error
    }
  }

  /**
   * Search subreddit for domain-related posts
   */
  async searchPosts(
    subreddit: string,
    query: string,
    options: {
      limit?: number
      sortBy?: 'relevance' | 'hot' | 'top' | 'new'
      timeFilter?: 'hour' | 'day' | 'week' | 'month' | 'year' | 'all'
    } = {}
  ): Promise<RedditPost[]> {
    await this.authenticate()
    await rateLimiter.waitIfNeeded('reddit')

    if (!this.accessToken) {
      throw new Error('Not authenticated')
    }

    try {
      const params: any = {
        q: query,
        limit: options.limit || 100,
        sort: options.sortBy || 'relevance',
        restrict_sr: true,
      }

      if (options.timeFilter) {
        params.t = options.timeFilter
      }

      const response = await axios.get(
        `${this.baseUrl}/r/${subreddit}/search`,
        {
          headers: {
            'Authorization': `Bearer ${this.accessToken}`,
            'User-Agent': this.config!.userAgent,
          },
          params,
        }
      )

      const posts: RedditPost[] = []

      response.data.data.children.forEach((child: any) => {
        const post = child.data
        
        // Extract domain names from title and content
        const text = `${post.title} ${post.selftext || ''}`
        const domainRegex = /\b([a-z0-9-]+\.(?:com|net|io|ai|co|org|app|dev))\b/gi
        const domains = text.match(domainRegex) || []

        posts.push({
          id: post.id,
          title: post.title,
          content: post.selftext || '',
          author: post.author,
          subreddit: post.subreddit,
          url: `https://reddit.com${post.permalink}`,
          score: post.score,
          createdAt: new Date(post.created_utc * 1000),
          domains: [...new Set(domains.map(d => d.toLowerCase()))],
        })
      })

      logger.info('REDDIT', `Found ${posts.length} posts in r/${subreddit}`)
      return posts
    } catch (error: any) {
      logger.error('REDDIT', `Search failed: ${error.message}`)
      return []
    }
  }

  /**
   * Find domain opportunities from popular domain subreddits
   */
  async findDomainOpportunities(): Promise<string[]> {
    const subreddits = ['Domains', 'Entrepreneur', 'Flipping', 'SideProject', 'startups']
    const queries = ['domain for sale', 'selling domain', 'domain available', 'premium domain']
    
    const allDomains: Set<string> = new Set()

    for (const subreddit of subreddits) {
      for (const query of queries) {
        try {
          const posts = await this.searchPosts(subreddit, query, {
            limit: 50,
            sortBy: 'new',
            timeFilter: 'week',
          })

          posts.forEach(post => {
            post.domains?.forEach(domain => allDomains.add(domain))
          })
        } catch (e) {
          // Continue with other searches
        }
      }
    }

    const domains = Array.from(allDomains)
    logger.info('REDDIT', `Found ${domains.length} domain mentions across subreddits`)
    
    return domains
  }

  /**
   * Check if Reddit API is configured
   */
  isConfigured(): boolean {
    return !!this.config
  }
}

// Singleton instance
let redditAPIInstance: RedditAPI | null = null

export const getRedditAPI = (config?: RedditConfig): RedditAPI => {
  if (!redditAPIInstance) {
    redditAPIInstance = new RedditAPI(config)
  }
  return redditAPIInstance
}

export const redditAPI = getRedditAPI()
