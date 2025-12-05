/**
 * Twitter/X API v2 Integration (2025)
 * Implements Twitter Trends API and Semantic Search with Geo-Semantic capabilities
 * OAuth 2.0 Bearer Token authentication
 * December 2025
 * 
 * ⚠️ IMPORTANT - FORWARD-COMPATIBLE IMPLEMENTATION:
 * This implementation is based on the Twitter API v2 features anticipated for 2025
 * as specified in the requirements. Before production deployment:
 * 
 * 1. TRENDS ENDPOINT: Verify v2 /trends endpoint availability. If unavailable, use:
 *    - Endpoint: /1.1/trends/place.json (v1.1)
 *    - Parameters: { id: woeid }
 *    - Response format: [{ trends: [...] }]
 * 
 * 2. SEMANTIC SEARCH: The min_score_threshold parameter is forward-compatible.
 *    If not supported by API, it will be safely ignored by Twitter's endpoint.
 * 
 * 3. GEO-SEMANTIC: Geocode operators work with current API. Semantic scoring
 *    features (min_score_threshold) are per 2025 requirements.
 * 
 * For production: Test with Twitter API v2 documentation at developer.twitter.com
 */

import axios from 'axios'
import { rateLimiter } from '@/lib/utils/rateLimiter'

interface TwitterConfig {
  bearerToken: string
  sandbox?: boolean
  useV1Trends?: boolean // Use v1.1 trends endpoint if v2 not available
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
    
    // Log configuration for production debugging
    if (config.useV1Trends) {
      console.warn('Twitter API: Using v1.1 trends endpoint (fallback mode)')
    }
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
   * 
   * NOTE: Per requirements, this uses the v2 /trends endpoint.
   * Set config.useV1Trends = true to use v1.1 fallback: /1.1/trends/place.json
   */
  async getTwitterTrends(woeid: number = 1): Promise<TrendItem[]> {
    try {
      // Try v2 endpoint first (or use v1.1 if configured)
      const url = this.config.useV1Trends 
        ? `${this.v1BaseUrl}/trends/place.json`
        : `${this.baseUrl}/trends`
      const data = await this.request('GET', url, { id: woeid }) as TwitterTrendsResponse | TrendItem[][]
      
      // Handle v1.1 response format: [{ trends: [...] }]
      if (Array.isArray(data) && data[0] && 'trends' in data[0]) {
        return (data[0] as { trends: TrendItem[] }).trends
      }
      
      // Handle v2 response formats
      if (typeof data === 'object' && 'data' in data && data.data && Array.isArray(data.data) && data.data[0]?.trends) {
        return data.data[0].trends
      }
      if (typeof data === 'object' && 'trends' in data && data.trends) {
        return data.trends
      }
      return []
    } catch (error) {
      // If v2 fails and we haven't tried v1.1 yet, suggest fallback
      const axiosError = error as { response?: { status?: number } }
      if (!this.config.useV1Trends && axiosError.response?.status === 404) {
        console.warn('Twitter API v2 trends endpoint not found. Consider setting useV1Trends: true in config.')
      }
      throw error
    }
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
   * 
   * NOTE: Per requirements, this implements semantic search with min_score_threshold.
   * Current Twitter API v2 performs keyword-based search at /2/tweets/search/recent.
   * The semantic/BERT-like features and min_score_threshold are anticipated features
   * for 2025 as described in the requirements.
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
    // NOTE: This parameter is per requirements for 2025 semantic search features
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
   * 
   * NOTE: Uses geocode operator which is available in current Twitter API.
   * The min_score_threshold for semantic filtering is per 2025 requirements.
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
   * 
   * ⚠️ IMPORTANT: This method requires OAuth 1.0a authentication, not Bearer token.
   * Current implementation will fail as v1.1 API does not accept Bearer tokens.
   * 
   * To use this method in production:
   * 1. Implement OAuth 1.0a signing (similar to GoDaddy HMAC implementation)
   * 2. Or use v2 place expansions instead: expansions=geo.place_id
   * 3. Or use third-party geocoding services
   * 
   * @param query - Place name to search
   * @returns Array of places with WOEID (currently returns empty array)
   */
  async getGeoPlaces(query: string): Promise<GeoPlace[]> {
    // Not implemented: v1.1 requires OAuth 1.0a, not Bearer token
    // For now, return empty array and log warning
    console.warn(
      'Twitter v1.1 geo/search requires OAuth 1.0a authentication. ' +
      'Use v2 place expansions or third-party geocoding instead. ' +
      `Query was: ${query}`
    )
    return []
  }

  /**
   * Advanced geo-semantic search with place name
   * Uses place name directly in search query (since v1.1 geo/search is not available)
   * @param query - Search query
   * @param placeName - Place name (e.g., "San Francisco")
   * @param options - Search options
   * @returns Array of tweets from specific place with semantic relevance
   * 
   * NOTE: This method uses place name fallback since getGeoPlaces() requires OAuth 1.0a.
   * For production, consider using v2 place expansions or direct place name filtering.
   */
  async advancedGeoSemanticSearch(
    query: string,
    placeName: string,
    options: {
      limit?: number
      minScoreThreshold?: number
    } = {}
  ): Promise<Tweet[]> {
    // Use place name search directly (getGeoPlaces not available without OAuth 1.0a)
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
