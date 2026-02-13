/**
 * Twitter API Usage Examples
 * Demonstrates how to use the Twitter API integration in DOMAINFLIPPER
 */

import { createTwitterClient } from '@/lib/api/twitter'

// Initialize the Twitter client
const twitter = createTwitterClient({
  bearerToken: process.env.TWITTER_BEARER_TOKEN || '',
})

/**
 * Example 1: Get Trending Topics
 */
export async function exampleGetTrends() {
  console.log('=== Example 1: Get Trending Topics ===\n')
  
  try {
    // Get worldwide trends
    const trends = await twitter.getTwitterTrends(1) // WOEID 1 = worldwide
    
    console.log(`Found ${trends.length} trending topics worldwide:\n`)
    trends.slice(0, 10).forEach((trend, index) => {
      console.log(`${index + 1}. ${trend.name}`)
      if (trend.tweet_volume) {
        console.log(`   Volume: ${trend.tweet_volume.toLocaleString()} tweets`)
      }
    })
    
    return trends
  } catch (error) {
    console.error('Error fetching trends:', error)
    return []
  }
}

/**
 * Example 2: Find Breakout Trends (High Volume)
 */
export async function exampleFindBreakouts() {
  console.log('\n=== Example 2: Find Breakout Trends ===\n')
  
  try {
    // Get trends with >10k tweet volume
    const breakouts = await twitter.getTrendingBreakouts(1, 10000)
    
    console.log(`Found ${breakouts.length} breakout trends:\n`)
    breakouts.forEach((trend) => {
      console.log(`• ${trend.name}: ${trend.tweet_volume?.toLocaleString()} tweets`)
    })
    
    return breakouts
  } catch (error) {
    console.error('Error finding breakouts:', error)
    return []
  }
}

/**
 * Example 3: Semantic Search
 */
export async function exampleSemanticSearch() {
  console.log('\n=== Example 3: Semantic Search ===\n')
  
  try {
    const query = 'AI trends in technology'
    const tweets = await twitter.semanticSearch(query, {
      limit: 10,
      minScoreThreshold: 0.2, // Higher threshold for quality
    })
    
    console.log(`Found ${tweets.length} tweets about "${query}":\n`)
    tweets.forEach((tweet, index) => {
      console.log(`${index + 1}. ${tweet.text.substring(0, 100)}...`)
      if (tweet.public_metrics) {
        console.log(`   ❤️  ${tweet.public_metrics.like_count} | 🔄 ${tweet.public_metrics.retweet_count}`)
      }
    })
    
    // Get metrics summary
    const metrics = twitter.getTweetMetricsSummary(tweets)
    console.log(`\nTotal Engagement: ${metrics.totalLikes + metrics.totalRetweets} interactions`)
    console.log(`Average: ${metrics.avgEngagement} per tweet`)
    
    return tweets
  } catch (error) {
    console.error('Error in semantic search:', error)
    return []
  }
}

/**
 * Example 4: Geo-Semantic Search (Location + Relevance)
 */
export async function exampleGeoSemanticSearch() {
  console.log('\n=== Example 4: Geo-Semantic Search ===\n')
  
  try {
    // Search for coffee shops in San Francisco
    const tweets = await twitter.geoSemanticSearch(
      'best coffee shops',
      37.7749,  // San Francisco latitude
      -122.4194, // San Francisco longitude
      5,         // 5km radius
      {
        limit: 10,
        minScoreThreshold: 0.18,
      }
    )
    
    console.log(`Found ${tweets.length} tweets about coffee shops in SF:\n`)
    tweets.forEach((tweet, index) => {
      console.log(`${index + 1}. ${tweet.text.substring(0, 100)}...`)
      if (tweet.geo) {
        console.log(`   📍 Location data available`)
      }
    })
    
    return tweets
  } catch (error) {
    console.error('Error in geo-semantic search:', error)
    return []
  }
}

/**
 * Example 5: Local Business Search
 */
export async function exampleLocalBusinessSearch() {
  console.log('\n=== Example 5: Local Business Search ===\n')
  
  try {
    // Find restaurants in NYC
    const tweets = await twitter.localBusinessSearch(
      'restaurant',
      40.7128,  // NYC latitude
      -74.0060, // NYC longitude
      3         // 3km radius
    )
    
    console.log(`Found ${tweets.length} mentions of restaurants in NYC:\n`)
    tweets.slice(0, 5).forEach((tweet) => {
      console.log(`• ${tweet.text.substring(0, 80)}...`)
    })
    
    return tweets
  } catch (error) {
    console.error('Error in local business search:', error)
    return []
  }
}

/**
 * Example 6: Event Coverage
 */
export async function exampleEventCoverage() {
  console.log('\n=== Example 6: Event Coverage ===\n')
  
  try {
    const tweets = await twitter.eventCoverageSearch(
      'tech conference',
      'San Francisco'
    )
    
    console.log(`Found ${tweets.length} tweets about tech conferences in SF:\n`)
    tweets.slice(0, 5).forEach((tweet) => {
      console.log(`• ${tweet.text.substring(0, 80)}...`)
      if (tweet.public_metrics) {
        console.log(`  Engagement: ${tweet.public_metrics.like_count + tweet.public_metrics.retweet_count}`)
      }
    })
    
    return tweets
  } catch (error) {
    console.error('Error in event coverage:', error)
    return []
  }
}

/**
 * Example 7: Travel Recommendations
 */
export async function exampleTravelRecommendations() {
  console.log('\n=== Example 7: Travel Recommendations ===\n')
  
  try {
    const recommendations = await twitter.travelRecommendationsSearch(
      'hidden gems',
      'Tokyo'
    )
    
    console.log(`Found ${recommendations.length} travel recommendations for Tokyo:\n`)
    recommendations.slice(0, 5).forEach((tweet) => {
      console.log(`• ${tweet.text.substring(0, 80)}...`)
    })
    
    return recommendations
  } catch (error) {
    console.error('Error finding travel recommendations:', error)
    return []
  }
}

/**
 * Example 8: Marketing Insights (Viral Spots)
 */
export async function exampleMarketingInsights() {
  console.log('\n=== Example 8: Marketing Insights ===\n')
  
  try {
    const insights = await twitter.marketingInsightsSearch(
      'viral spots',
      'NYC',
      false
    )
    
    console.log(`Found ${insights.length} viral spots in NYC:\n`)
    insights.slice(0, 5).forEach((tweet) => {
      console.log(`• ${tweet.text.substring(0, 80)}...`)
      if (tweet.public_metrics) {
        const engagement = tweet.public_metrics.like_count + tweet.public_metrics.retweet_count
        console.log(`  🔥 ${engagement} total engagement`)
      }
    })
    
    return insights
  } catch (error) {
    console.error('Error finding marketing insights:', error)
    return []
  }
}

/**
 * Example 9: Domain Flipping Use Case
 * Find trending topics that could be valuable domain names
 */
export async function exampleDomainFlippingUseCase() {
  console.log('\n=== Example 9: Domain Flipping Use Case ===\n')
  
  try {
    // Get high-volume trends
    const trends = await twitter.getTrendingBreakouts(1, 15000)
    
    // Filter for domain-worthy names
    const domainOpportunities = trends
      .map(trend => {
        const name = trend.name.replace(/^#/, '').toLowerCase()
        // Filter: 5-15 chars, no spaces, alphanumeric
        if (name.length >= 5 && name.length <= 15 && /^[a-z0-9]+$/.test(name)) {
          return {
            domain: `${name}.com`,
            trendName: trend.name,
            volume: trend.tweet_volume || 0,
            potential: trend.tweet_volume ? Math.round((trend.tweet_volume / 1000) * 10) / 10 : 0,
          }
        }
        return null
      })
      .filter((item): item is NonNullable<typeof item> => item !== null)
      .sort((a, b) => b.volume - a.volume)
      .slice(0, 10)
    
    console.log('Potential Domain Opportunities:\n')
    domainOpportunities.forEach((opp, index) => {
      console.log(`${index + 1}. ${opp.domain}`)
      console.log(`   Trend: ${opp.trendName}`)
      console.log(`   Volume: ${opp.volume.toLocaleString()} tweets`)
      console.log(`   Potential Score: ${opp.potential}/10`)
      console.log('')
    })
    
    return domainOpportunities
  } catch (error) {
    console.error('Error in domain flipping use case:', error)
    return []
  }
}

/**
 * Run all examples
 */
export async function runAllExamples() {
  console.log('🚀 Twitter API Integration Examples\n')
  console.log('=' .repeat(50))
  
  try {
    await exampleGetTrends()
    await exampleFindBreakouts()
    await exampleSemanticSearch()
    await exampleGeoSemanticSearch()
    await exampleLocalBusinessSearch()
    await exampleEventCoverage()
    await exampleTravelRecommendations()
    await exampleMarketingInsights()
    await exampleDomainFlippingUseCase()
    
    console.log('\n' + '='.repeat(50))
    console.log('✅ All examples completed successfully!')
  } catch (error) {
    console.error('\n❌ Error running examples:', error)
  }
}

// Export for use in other modules
export { twitter }
