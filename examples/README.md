# Twitter API Examples

This directory contains usage examples for the Twitter API v2 integration in DOMAINFLIPPER.

## Files

- **twitter-api-example.ts** - Comprehensive examples demonstrating all Twitter API features

## Running Examples

To use these examples in your project:

1. Ensure you have set up your Twitter API credentials in `.env.local`:
   ```env
   TWITTER_BEARER_TOKEN=your-bearer-token-here
   ```

2. Import and use the example functions:
   ```typescript
   import { exampleGetTrends, exampleSemanticSearch } from './examples/twitter-api-example'
   
   // Run a specific example
   await exampleGetTrends()
   
   // Or run all examples
   import { runAllExamples } from './examples/twitter-api-example'
   await runAllExamples()
   ```

## Available Examples

### 1. Get Trending Topics
Fetches worldwide trending topics with tweet volumes.

### 2. Find Breakout Trends
Identifies high-volume trends (>10k tweets) for breakout detection.

### 3. Semantic Search
Demonstrates semantic search with relevance scoring and engagement metrics.

### 4. Geo-Semantic Search
Shows location-based search with semantic relevance (lat/lng/radius).

### 5. Local Business Search
Finds mentions of local businesses within a specific radius.

### 6. Event Coverage
Tracks events with location context and engagement metrics.

### 7. Travel Recommendations
Discovers travel recommendations for specific locations.

### 8. Marketing Insights
Finds viral spots and trending venues with engagement data.

### 9. Domain Flipping Use Case
**Special example** showing how to use Twitter trends to identify valuable domain names:
- Filters trends for domain-worthy names (5-15 chars, alphanumeric)
- Calculates potential scores based on tweet volume
- Ranks opportunities by popularity

## Notes

- All examples include proper error handling
- Rate limiting is handled automatically by the Twitter API client
- Examples demonstrate both basic and advanced features
- Each example returns data that can be used in your application

For full documentation, see [TWITTER_API_GUIDE.md](../TWITTER_API_GUIDE.md)
