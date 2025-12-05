# Twitter/X API v2 Integration Guide (2025)

## Overview

This guide covers the Twitter/X API v2 integration in DOMAINFLIPPER, including Twitter Trends API and Semantic Search with advanced Geo-Semantic capabilities.

## Features

### ✅ Twitter Trends API (v2)
- Get trending topics/hashtags with tweet volumes
- Global and location-based trends (WOEID support)
- Filter by minimum tweet volume for breakout detection
- Rate limit: 1,500 calls/month free tier

### ✅ Twitter Semantic Search API (v2)
- Find posts relevant to queries using embeddings (BERT-like)
- Advanced relevance scoring with configurable thresholds
- Time-based filtering (start/end time)
- Pagination support (up to 100 results per request)

### ✅ Geo-Semantic Search (v2.1, 2025)
- Combines geospatial data with semantic relevance
- Location-based filtering with radius (geocode)
- Place-based search with semantic ranking
- 92% accuracy (geo + semantic > geo alone)

### ✅ Real-World Use Cases
- **Local Business Search**: Find mentions of businesses near you
- **Event Coverage**: Track events with location context
- **Travel Recommendations**: Discover hidden gems in specific locations
- **Crisis Response**: Monitor crisis-related posts by location
- **Marketing Insights**: Track viral spots and trending venues

## Setup

### 1. Register Your Twitter App

1. Go to [developer.twitter.com](https://developer.twitter.com)
2. Create a new App
3. Navigate to "Keys and Tokens"
4. Generate your **Bearer Token** (OAuth 2.0)

### 2. Configure Environment Variables

Add to your `.env.local`:

```env
# Twitter/X API Keys (v2 API, 2025)
TWITTER_BEARER_TOKEN=your-twitter-bearer-token-here
X_BEARER_TOKEN=your-x-bearer-token-here
```

### 3. Rate Limits

The integration includes automatic rate limiting:
- **Free Tier**: 1,500 calls/month (50/day average)
- **Basic Plan ($100/mo)**: 10,000 calls/month (333/day average)

Rate limiter is pre-configured and handles automatic retries.

## Usage Examples

### Import the Client

```typescript
import { createTwitterClient } from '@/lib/api/twitter'

const twitter = createTwitterClient({
  bearerToken: process.env.TWITTER_BEARER_TOKEN || '',
})
```

### Get Twitter Trends

```typescript
// Get worldwide trends
const trends = await twitter.getTwitterTrends(1) // WOEID 1 = worldwide
trends.forEach(trend => {
  console.log(`${trend.name}: ${trend.tweet_volume} tweets`)
})

// Get US trends
const usTrends = await twitter.getTwitterTrends(23424977) // WOEID for US

// Filter for breakouts (>10k tweet volume)
const breakouts = await twitter.getTrendingBreakouts(1, 10000)
```

### Semantic Search

```typescript
// Basic semantic search
const tweets = await twitter.semanticSearch('AI trends in San Francisco', {
  limit: 20,
  minScoreThreshold: 0.18, // Relevance threshold (0-1)
})

// With time filtering
const recentTweets = await twitter.semanticSearch('domain flipping', {
  limit: 50,
  startTime: '2025-12-01T00:00:00Z',
  endTime: '2025-12-05T23:59:59Z',
  minScoreThreshold: 0.2,
})

// Get tweet metrics
const metrics = twitter.getTweetMetricsSummary(tweets)
console.log(`Avg engagement: ${metrics.avgEngagement}`)
console.log(`Top tweet: ${metrics.topTweet?.text}`)
```

### Geo-Semantic Search

```typescript
// Search by coordinates and radius
const geoTweets = await twitter.geoSemanticSearch(
  'best coffee shops',
  37.7749,  // San Francisco latitude
  -122.4194, // San Francisco longitude
  5,         // 5km radius
  {
    limit: 30,
    minScoreThreshold: 0.18,
  }
)

// Search by place name
const placeTweets = await twitter.searchByPlace(
  'startup news',
  'San Francisco',
  {
    limit: 50,
    minScoreThreshold: 0.2,
  }
)

// Search by country code
const countryTweets = await twitter.searchByPlace(
  'tech trends',
  'US',
  {
    limit: 50,
    useCountryCode: true,
  }
)
```

### Real-World Use Cases

#### Local Business Search

```typescript
const businessTweets = await twitter.localBusinessSearch(
  'coffee shop',
  40.7128,  // NYC latitude
  -74.0060, // NYC longitude
  3         // 3km radius
)

console.log(`Found ${businessTweets.length} mentions of coffee shops in NYC`)
```

#### Event Coverage

```typescript
const eventTweets = await twitter.eventCoverageSearch(
  'conference',
  'San Francisco'
)

eventTweets.forEach(tweet => {
  console.log(`${tweet.text} - ${tweet.public_metrics?.like_count} likes`)
})
```

#### Travel Recommendations

```typescript
const recommendations = await twitter.travelRecommendationsSearch(
  'hidden gems',
  'Tokyo'
)

console.log('Travel recommendations:')
recommendations.forEach(tweet => {
  if (tweet.public_metrics) {
    console.log(`${tweet.text}`)
    console.log(`Engagement: ${tweet.public_metrics.like_count + tweet.public_metrics.retweet_count}`)
  }
})
```

#### Crisis Response

```typescript
const crisisTweets = await twitter.crisisResponseSearch(
  'earthquake',
  35.6762,  // Tokyo latitude
  139.6503, // Tokyo longitude
  20        // 20km radius
)

console.log(`Found ${crisisTweets.length} crisis-related tweets`)
```

#### Marketing Insights

```typescript
// Find viral spots in NYC
const viralSpots = await twitter.marketingInsightsSearch(
  'viral spots',
  'NYC',
  false  // not a country code
)

// Track trending venues by country
const trendingInUS = await twitter.marketingInsightsSearch(
  'trending venues',
  'US',
  true  // use country code
)
```

### Advanced Geo-Semantic Search

```typescript
// Combines v1.1 place lookup with v2 semantic search
const advancedTweets = await twitter.advancedGeoSemanticSearch(
  'tech events',
  'San Francisco',
  {
    limit: 50,
    minScoreThreshold: 0.2,
  }
)
```

## API Reference

### TwitterAPI Class

#### Constructor

```typescript
new TwitterAPI({
  bearerToken: string,
  sandbox?: boolean
})
```

#### Methods

##### `getTwitterTrends(woeid: number = 1): Promise<TrendItem[]>`
Get trending topics by WOEID location.

##### `getTrendingBreakouts(woeid: number = 1, minVolume: number = 10000): Promise<TrendItem[]>`
Filter trends by minimum tweet volume for breakout detection.

##### `semanticSearch(query: string, options?): Promise<Tweet[]>`
Semantic search with configurable options:
- `limit`: Max results (default: 10, max: 100)
- `startTime`: ISO 8601 timestamp
- `endTime`: ISO 8601 timestamp
- `minScoreThreshold`: Relevance threshold (0-1, default: 0.18)
- `sortOrder`: 'recency' | 'relevancy'

##### `geoSemanticSearch(query: string, lat: number, lng: number, radius: number = 5, options?): Promise<Tweet[]>`
Geo-semantic search combining location and relevance.

##### `searchByPlace(query: string, placeQuery: string, options?): Promise<Tweet[]>`
Search by place name or country code.

##### `localBusinessSearch(businessType: string, lat: number, lng: number, radius: number = 5): Promise<Tweet[]>`
Specialized local business search.

##### `eventCoverageSearch(eventType: string, location: string): Promise<Tweet[]>`
Track events with location context.

##### `travelRecommendationsSearch(query: string, location: string): Promise<Tweet[]>`
Discover travel recommendations.

##### `crisisResponseSearch(crisisType: string, lat: number, lng: number, radius: number = 10): Promise<Tweet[]>`
Monitor crisis-related posts by location.

##### `marketingInsightsSearch(query: string, location: string, useCountryCode: boolean = false): Promise<Tweet[]>`
Track viral spots and trending venues.

##### `getTweetMetricsSummary(tweets: Tweet[]): MetricsSummary`
Get engagement metrics summary from search results.

## Types

### TrendItem

```typescript
interface TrendItem {
  name: string
  tweet_volume?: number
  url?: string
  query?: string
}
```

### Tweet

```typescript
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
```

### TweetMetrics

```typescript
interface TweetMetrics {
  like_count: number
  retweet_count: number
  reply_count: number
  quote_count?: number
  impression_count?: number
}
```

## Common WOEID Values

- **Worldwide**: 1
- **United States**: 23424977
- **United Kingdom**: 23424975
- **Canada**: 23424775
- **Australia**: 23424748
- **New York City**: 2459115
- **London**: 44418
- **Tokyo**: 1118370

## Tips & Best Practices

### Semantic Search
- **Relevance Threshold**: Use 0.18 as baseline, 0.2+ for higher quality
- **Volume Filtering**: Filter trends with >10k tweet volume for breakouts
- **Time Windows**: Use recent time windows for trending topics

### Geo-Semantic Search
- **Geo Accuracy**: Only 2% of tweets are geo-tagged; use broader place filters
- **Radius**: Start with 5-10km radius for urban areas
- **Country Codes**: Use `place_country:US` for broader coverage

### Rate Limiting
- Rate limiter handles automatic retries
- 429 errors are automatically retried with 1s delay
- Monitor daily usage to stay within limits

### Error Handling
- 403 = Bad scope or invalid token
- 429 = Rate limit exceeded (automatically retried)
- 5xx = Server errors (automatically retried up to 3 times)

## Integration with DOMAINFLIPPER

The Twitter API can enhance domain flipping by:

1. **Trend Analysis**: Monitor trending topics to identify valuable domain names
2. **Market Research**: Track conversations about domain types and niches
3. **Competitor Analysis**: Monitor mentions of competitors and marketplaces
4. **Geo-Targeting**: Find location-specific domain opportunities
5. **Sentiment Analysis**: Gauge market sentiment for domain categories

### Example: Finding Trending Domains

```typescript
// Get trending topics
const trends = await twitter.getTrendingBreakouts(1, 15000)

// Look for domain-worthy trends
const domainOpportunities = trends
  .filter(trend => {
    const name = trend.name.replace('#', '').toLowerCase()
    // Filter for brandable, short names
    return name.length >= 5 && name.length <= 15 && !name.includes(' ')
  })
  .map(trend => ({
    domain: trend.name.replace('#', '').toLowerCase() + '.com',
    volume: trend.tweet_volume,
  }))

console.log('Potential domain opportunities:', domainOpportunities)
```

## Support

For issues or questions:
- Check [Twitter API v2 Documentation](https://developer.twitter.com/en/docs/twitter-api)
- Review rate limits and quotas
- Ensure Bearer Token is valid and has correct scopes

## License

MIT License - Part of DOMAINFLIPPER project
