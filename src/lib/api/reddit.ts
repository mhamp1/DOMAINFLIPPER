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

/**
 * RedditAPI - DISABLED
 * Reddit API doesn't support browser CORS
 * Requires backend proxy to function
 */
class RedditAPI {
  private config: RedditConfig | null = null

  constructor(_config?: RedditConfig) {
    // DISABLED: Reddit doesn't support browser CORS
    console.log('[REDDIT] Reddit API disabled - requires backend proxy')
    this.config = null
  }

  isConfigured(): boolean {
    return false // Always return false since disabled
  }

  async searchPosts(_query: string): Promise<RedditPost[]> {
    console.log('[REDDIT] Search disabled - requires backend proxy')
    return []
  }

  async getSubredditPosts(_subreddit: string, _limit?: number): Promise<RedditPost[]> {
    console.log('[REDDIT] Subreddit fetch disabled - requires backend proxy')
    return []
  }

  async getTrendingTopics(): Promise<string[]> {
    console.log('[REDDIT] Trending topics disabled - requires backend proxy')
    return []
  }
}

// ============================================================================
// NOTE: Original Reddit API implementation has been removed
// ============================================================================
// Reddit API doesn't support CORS from browsers, so the original implementation
// that included OAuth authentication and subreddit searching has been disabled.
// To use Reddit functionality, implement a backend proxy service.
// ============================================================================

// Singleton instance
let redditAPIInstance: RedditAPI | null = null

export const getRedditAPI = (config?: RedditConfig): RedditAPI => {
  if (!redditAPIInstance) {
    redditAPIInstance = new RedditAPI(config)
  }
  return redditAPIInstance
}

export const redditAPI = getRedditAPI()
