/**
 * Twitter/X API v2 Integration (2025)
 * Implements Twitter Trends API and Semantic Search with Geo-Semantic capabilities
 * Real API client with OAuth 2.0 Bearer Token authentication
 * December 2025
 */

import axios from 'axios'
import { rateLimiter } from '@/lib/utils/rateLimiter'

interface TwitterConfig {
  bearerToken: string
  sandbox?: boolean
}

interface TrendItem {
  name: string
  tweet_volume?: number
  url?: string
  query?: string
}

interface TwitterTrendsResponse {
  data?: {
    trends: TrendItem[]
  }[]
  trends?: TrendItem[]
}

interface TweetMetrics {
  like_count: number
  retweet_count: number
  reply_count: number
  quote_count?: number
  impression_count?: number
}

interface GeoData {
  coordinates?: {
    type: string
    coordinates: number[]
  }
  place_id?: string
}

interface ContextAnnotation {
  domain: {
    id: string
    name: string
    description?: string
  }
  entity: {
    id: string
    name: string
    description?: string
  }
}

interface Tweet {
  id: string
  text: string
  author_id: string
  created_at?: string
  public_metrics?: TweetMetrics
  geo?: GeoData
  context_annotations?: ContextAnnotation[]
  lang?: string
}

interface SemanticSearchResponse {
  data?: Tweet[]
  meta?: {
    newest_id?: string
    oldest_id?: string
    result_count: number
    next_token?: string
  }
  includes?: {
    places?: Place[]
    users?: TwitterUser[]
  }
}

interface Place {
  id: string
  name: string
  full_name: string
  country?: string
  country_code?: string
  geo?: {
    type: string
    bbox?: number[]
    properties?: Record<string, unknown>
  }
  place_type?: string
}

interface TwitterUser {
  id: string
  name: string
  username: string
  verified?: boolean
  description?: string
  public_metrics?: {
    followers_count: number
    following_count: number
    tweet_count: number
  }
}

interface GeoPlace {
  name: string
  woeid: string
  country: string
  place_type?: string
  url?: string
}

export class TwitterAPI {
  private config: TwitterConfig
  private baseUrl: string
  private v1BaseUrl: string
  private retryCount = 3
  private retryDelay = 1000

  constructor(config: TwitterConfig) {
    this.config = config
    this.baseUrl = 'https://api.twitter.com/2'
    this.v1BaseUrl = 'https://api.twitter.com/1.1'
  }

  /**
   * Make authenticated request with retry logic
   */
  private async request(
    method: string,
    url: string,
    params?: Record<string, unknown>,
    retries = this.retryCount
  ): Promise<unknown> {
    // Respect rate limit
    await rateLimiter.waitIfNeeded('twitter')

    const headers: Record<string, string> = {
      'Authorization': `Bearer ${this.config.bearerToken}`,
      'Content-Type': 'application/json',
    }

    try {
      const response = await axios({
        method: method.toLowerCase() as 'get' | 'post' | 'put' | 'delete',
        url,
        headers,
        params,
        timeout: 30000,
      })

      return response.data
    } catch (error: unknown) {
      // Retry on rate limit or server errors
      const axiosError = error as { response?: { status?: number; data?: { detail?: string } }; message?: string }
      if (retries > 0 && (axiosError.response?.status === 429 || (axiosError.response?.status || 0) >= 500)) {
        const delay = axiosError.response?.status === 429 ? 1000 : this.retryDelay
        await new Promise(resolve => setTimeout(resolve, delay))
        return this.request(method, url, params, retries - 1)
      }

      throw new Error(
        `Twitter API Error: ${axiosError.response?.status || 'Network'} - ${axiosError.response?.data?.detail || axiosError.message || 'Unknown error'}`
      )
    }
  }

  /**
   * Get Twitter Trends by WOEID (World ID)
   * @param woeid - WOEID location (1 = worldwide, 23424977 = US, etc.)
   * @returns Array of trending topics with tweet volumes
   */
  async getTwitterTrends(woeid: number = 1): Promise<TrendItem[]> {
    const url = `${this.baseUrl}/trends`
    const data = await this.request('GET', url, { id: woeid }) as TwitterTrendsResponse
    
    // Handle different response formats
    if (data.data && Array.isArray(data.data) && data.data[0]?.trends) {
      return data.data[0].trends
    }
    if (data.trends) {
      return data.trends
    }
    return []
  }

  /**
   * Filter trends by minimum tweet volume
   * @param woeid - WOEID location
   * @param minVolume - Minimum tweet volume (e.g., 10000 for breakouts)
   * @returns Filtered trends with high volume
   */
  async getTrendingBreakouts(woeid: number = 1, minVolume: number = 10000): Promise<TrendItem[]> {
    const trends = await this.getTwitterTrends(woeid)
    return trends.filter(trend => (trend.tweet_volume || 0) >= minVolume)
  }

  /**
   * Twitter Semantic Search API (v2)
   * Finds posts relevant to a query using embeddings (BERT-like)
   * @param query - Search query
   * @param options - Search options (limit, start/end time, etc.)
   * @returns Array of semantically relevant tweets
   */
  async semanticSearch(
    query: string,
    options: {
      limit?: number
      startTime?: string
      endTime?: string
      minScoreThreshold?: number
      sortOrder?: 'recency' | 'relevancy'
    } = {}
  ): Promise<Tweet[]> {
    const url = `${this.baseUrl}/tweets/search/recent`
    
    const params: Record<string, string | number> = {
      query,
      max_results: Math.min(options.limit || 10, 100), // Max 100 per request
      tweet_fields: 'created_at,public_metrics,geo,context_annotations,lang',
      expansions: 'geo.place_id,author_id',
      'place.fields': 'full_name,country,country_code,geo,place_type',
      'user.fields': 'name,username,verified,description,public_metrics',
    }

    // Semantic relevance threshold (0-1, default 0.18)
    if (options.minScoreThreshold !== undefined) {
      params.min_score_threshold = options.minScoreThreshold
    }

    // Time filters
    if (options.startTime) {
      params.start_time = options.startTime
    }
    if (options.endTime) {
      params.end_time = options.endTime
    }

    // Sort order
    if (options.sortOrder) {
      params.sort_order = options.sortOrder
    }

    const data = await this.request('GET', url, params) as SemanticSearchResponse
    return data.data || []
  }

  /**
   * Geo-Semantic Search (2025 v2.1)
   * Combines geospatial data with semantic relevance
   * @param query - Search query
   * @param lat - Latitude
   * @param lng - Longitude
   * @param radius - Radius in km (default: 5km)
   * @param options - Additional search options
   * @returns Array of geo-relevant + semantically similar tweets
   */
  async geoSemanticSearch(
    query: string,
    lat: number,
    lng: number,
    radius: number = 5,
    options: {
      limit?: number
      minScoreThreshold?: number
      startTime?: string
      endTime?: string
    } = {}
  ): Promise<Tweet[]> {
    // Build geo-semantic query using geocode operator
    const geoQuery = `${query} geocode:${lat},${lng},${radius}km`
    
    const url = `${this.baseUrl}/tweets/search/recent`
    
    const params: Record<string, string | number> = {
      query: geoQuery,
      max_results: Math.min(options.limit || 10, 100),
      tweet_fields: 'created_at,public_metrics,geo,context_annotations,lang',
      expansions: 'geo.place_id,author_id',
      'place.fields': 'full_name,country,country_code,geo,place_type',
      'user.fields': 'name,username,verified,public_metrics',
      min_score_threshold: options.minScoreThreshold || 0.18, // Default semantic threshold
    }

    if (options.startTime) {
      params.start_time = options.startTime
    }
    if (options.endTime) {
      params.end_time = options.endTime
    }

    const data = await this.request('GET', url, params) as SemanticSearchResponse
    return data.data || []
  }

  /**
   * Search by place/location with semantic relevance
   * @param query - Search query
   * @param placeQuery - Place name or country code (e.g., "San Francisco", "US")
   * @param options - Search options
   * @returns Array of location-filtered semantically relevant tweets
   */
  async searchByPlace(
    query: string,
    placeQuery: string,
    options: {
      limit?: number
      minScoreThreshold?: number
      useCountryCode?: boolean
    } = {}
  ): Promise<Tweet[]> {
    // Build place-based query
    const placeOperator = options.useCountryCode ? 'place_country' : 'place'
    const fullQuery = `${query} ${placeOperator}:${placeQuery}`
    
    return this.semanticSearch(fullQuery, {
      limit: options.limit,
      minScoreThreshold: options.minScoreThreshold || 0.18,
    })
  }

  /**
   * Get geo places using Twitter v1.1 API (fallback for precise places)
   * Note: Requires OAuth 1.0a for v1.1 - this is a placeholder showing the pattern
   * @param query - Place name to search
   * @returns Array of places with WOEID
   */
  async getGeoPlaces(query: string): Promise<GeoPlace[]> {
    // Note: v1.1 requires OAuth 1.0a, not Bearer token
    // This is a placeholder for the pattern - actual implementation would need OAuth 1.0a
    try {
      const url = `${this.v1BaseUrl}/geo/search.json`
      const data = await this.request('GET', url, { query }) as { result?: { places?: GeoPlace[] } }
      return data.result?.places || []
    } catch (error) {
      // Fallback: return empty array if v1.1 not configured
      console.warn('Twitter v1.1 API not available for geo search:', error)
      return []
    }
  }

  /**
   * Advanced geo-semantic search with place ID
   * Combines v1.1 place lookup with v2 semantic search
   * @param query - Search query
   * @param placeName - Place name (e.g., "San Francisco")
   * @param options - Search options
   * @returns Array of tweets from specific place with semantic relevance
   */
  async advancedGeoSemanticSearch(
    query: string,
    placeName: string,
    options: {
      limit?: number
      minScoreThreshold?: number
    } = {}
  ): Promise<Tweet[]> {
    try {
      // Try to get place ID from v1.1
      const places = await this.getGeoPlaces(placeName)
      
      if (places.length > 0) {
        const placeId = places[0].woeid
        const placeQuery = `${query} place:${placeId}`
        return this.semanticSearch(placeQuery, {
          limit: options.limit,
          minScoreThreshold: options.minScoreThreshold || 0.18,
        })
      }
    } catch (error) {
      console.warn('Advanced geo-semantic search fallback to place name:', error)
    }

    // Fallback to place name search
    return this.searchByPlace(query, placeName, options)
  }

  /**
   * Local business search (geo-semantic use case)
   * @param businessType - Type of business (e.g., "coffee shop", "restaurant")
   * @param lat - Latitude
   * @param lng - Longitude
   * @param radius - Search radius in km
   * @returns Tweets about local businesses
   */
  async localBusinessSearch(
    businessType: string,
    lat: number,
    lng: number,
    radius: number = 5
  ): Promise<Tweet[]> {
    const query = `best ${businessType}`
    return this.geoSemanticSearch(query, lat, lng, radius, {
      limit: 20,
      minScoreThreshold: 0.18,
    })
  }

  /**
   * Event coverage search (geo-semantic use case)
   * @param eventType - Type of event (e.g., "protest", "concert", "conference")
   * @param location - Location name
   * @returns Tweets about the event with location context
   */
  async eventCoverageSearch(
    eventType: string,
    location: string
  ): Promise<Tweet[]> {
    const query = `${eventType} in ${location}`
    return this.searchByPlace(query, location, {
      limit: 50,
      minScoreThreshold: 0.18,
    })
  }

  /**
   * Travel recommendations search (geo-semantic use case)
   * @param query - What to search for (e.g., "hidden gems", "best restaurants")
   * @param location - Location name
   * @returns Tweets with travel recommendations
   */
  async travelRecommendationsSearch(
    query: string,
    location: string
  ): Promise<Tweet[]> {
    const searchQuery = `${query} in ${location}`
    return this.searchByPlace(searchQuery, location, {
      limit: 30,
      minScoreThreshold: 0.2, // Higher threshold for quality recommendations
    })
  }

  /**
   * Crisis response search (geo-semantic use case)
   * @param crisisType - Type of crisis (e.g., "earthquake", "flood", "fire")
   * @param lat - Latitude
   * @param lng - Longitude
   * @param radius - Search radius in km
   * @returns Recent crisis-related tweets from the area
   */
  async crisisResponseSearch(
    crisisType: string,
    lat: number,
    lng: number,
    radius: number = 10
  ): Promise<Tweet[]> {
    const now = new Date()
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000)
    
    return this.geoSemanticSearch(crisisType, lat, lng, radius, {
      limit: 100,
      minScoreThreshold: 0.15, // Lower threshold for crisis coverage
      startTime: oneDayAgo.toISOString(),
    })
  }

  /**
   * Marketing insights search (geo-semantic use case)
   * @param query - Marketing query (e.g., "viral spots", "trending venues")
   * @param location - Location name or country code
   * @param useCountryCode - Whether location is a country code
   * @returns Tweets with marketing insights
   */
  async marketingInsightsSearch(
    query: string,
    location: string,
    useCountryCode: boolean = false
  ): Promise<Tweet[]> {
    const searchQuery = `${query} ${useCountryCode ? '' : 'in ' + location}`
    return this.searchByPlace(
      searchQuery,
      location,
      {
        limit: 50,
        minScoreThreshold: 0.2,
        useCountryCode,
      }
    )
  }

  /**
   * Get tweet metrics summary from search results
   * @param tweets - Array of tweets
   * @returns Summary of engagement metrics
   */
  getTweetMetricsSummary(tweets: Tweet[]): {
    totalLikes: number
    totalRetweets: number
    totalReplies: number
    avgEngagement: number
    topTweet: Tweet | null
  } {
    if (tweets.length === 0) {
      return {
        totalLikes: 0,
        totalRetweets: 0,
        totalReplies: 0,
        avgEngagement: 0,
        topTweet: null,
      }
    }

    let totalLikes = 0
    let totalRetweets = 0
    let totalReplies = 0
    let topTweet = tweets[0]
    let maxEngagement = 0

    tweets.forEach(tweet => {
      if (tweet.public_metrics) {
        const likes = tweet.public_metrics.like_count || 0
        const retweets = tweet.public_metrics.retweet_count || 0
        const replies = tweet.public_metrics.reply_count || 0
        
        totalLikes += likes
        totalRetweets += retweets
        totalReplies += replies

        const engagement = likes + retweets + replies
        if (engagement > maxEngagement) {
          maxEngagement = engagement
          topTweet = tweet
        }
      }
    })

    return {
      totalLikes,
      totalRetweets,
      totalReplies,
      avgEngagement: Math.round((totalLikes + totalRetweets + totalReplies) / tweets.length),
      topTweet,
    }
  }
}

export const createTwitterClient = (config: TwitterConfig) => new TwitterAPI(config)
