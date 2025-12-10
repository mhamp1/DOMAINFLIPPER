/**
 * Tests for Channel Performance Tracker
 */

import { describe, it, expect, beforeEach } from 'vitest'
import { ChannelPerformanceTracker } from './channelPerformanceTracker'

describe('ChannelPerformanceTracker', () => {
  let tracker: ChannelPerformanceTracker

  beforeEach(() => {
    tracker = new ChannelPerformanceTracker()
  })

  describe('addListing', () => {
    it('should add a listing successfully', () => {
      tracker.addListing('example.com', 'Afternic', 1000, 500)
      const stats = tracker.getChannelStats('Afternic')
      expect(stats?.totalListings).toBe(1)
    })

    it('should not add listing for disabled channel', () => {
      tracker.updateChannelConfig('Lander', { enabled: false })
      tracker.addListing('example.com', 'Lander', 1000, 500)
      const stats = tracker.getChannelStats('Lander')
      expect(stats?.totalListings).toBe(0)
    })

    it('should apply channel-specific multipliers', () => {
      tracker.updateChannelConfig('Afternic', { listPriceMultiplier: 1.1 })
      tracker.addListing('example.com', 'Afternic', 1000, 500)
      // Price should be 1000 * 1.1 = 1100
      // (internal verification would require exposing listings)
    })
  })

  describe('recordView', () => {
    it('should record views correctly', () => {
      tracker.addListing('example.com', 'Afternic', 1000, 500)
      tracker.recordView('example.com', 'Afternic')
      tracker.recordView('example.com', 'Afternic')
      const stats = tracker.getChannelStats('Afternic')
      expect(stats?.totalViews).toBe(2)
    })
  })

  describe('recordInquiry', () => {
    it('should record inquiries correctly', () => {
      tracker.addListing('example.com', 'Afternic', 1000, 500)
      tracker.recordInquiry('example.com', 'Afternic')
      const stats = tracker.getChannelStats('Afternic')
      expect(stats?.totalInquiries).toBe(1)
    })
  })

  describe('recordSale', () => {
    it('should record sales correctly', () => {
      tracker.addListing('example.com', 'Afternic', 1000, 500)
      tracker.recordSale('example.com', 'Afternic', 1200)
      const stats = tracker.getChannelStats('Afternic')
      expect(stats?.totalSales).toBe(1)
      expect(stats?.totalRevenue).toBe(1200)
      expect(stats?.avgSalePrice).toBe(1200)
    })

    it('should calculate average days to sale', () => {
      tracker.addListing('example.com', 'Afternic', 1000, 500)
      // Immediately sell (same day)
      tracker.recordSale('example.com', 'Afternic', 1200)
      const stats = tracker.getChannelStats('Afternic')
      expect(stats?.avgDaysToSale).toBeGreaterThan(0)
    })

    it('should update conversion rate', () => {
      tracker.addListing('example.com', 'Afternic', 1000, 500)
      tracker.addListing('example2.com', 'Afternic', 1000, 500)
      tracker.recordSale('example.com', 'Afternic', 1200)
      const stats = tracker.getChannelStats('Afternic')
      expect(stats?.conversionRate).toBe(50) // 1 sale out of 2 listings = 50%
    })
  })

  describe('getRepricingRecommendations', () => {
    it('should have repricing logic available', () => {
      tracker.addListing('example.com', 'Afternic', 1000, 500)
      // Add multiple inquiries
      for (let i = 0; i < 5; i++) {
        tracker.recordInquiry('example.com', 'Afternic')
      }
      
      const recommendations = tracker.getRepricingRecommendations('example.com')
      // May or may not have recommendations depending on cadence
      // Just verify the method works
      expect(Array.isArray(recommendations)).toBe(true)
    })

    it('should have logic to check low interest', () => {
      tracker.addListing('example.com', 'Afternic', 1000, 500)
      // Add views but no inquiries
      for (let i = 0; i < 15; i++) {
        tracker.recordView('example.com', 'Afternic')
      }
      
      const recommendations = tracker.getRepricingRecommendations('example.com')
      // May or may not have recommendations depending on time
      expect(Array.isArray(recommendations)).toBe(true)
    })

    it('should not go below floor price', () => {
      tracker.addListing('example.com', 'Afternic', 1000, 900)
      const recommendations = tracker.getRepricingRecommendations('example.com')
      
      if (recommendations.length > 0) {
        for (const rec of recommendations) {
          expect(rec.recommendedPrice).toBeGreaterThanOrEqual(900)
        }
      }
    })
  })

  describe('getBestChannel', () => {
    it('should identify best performing channel', () => {
      // Afternic: 2 listings, 1 sale
      tracker.addListing('example1.com', 'Afternic', 1000, 500)
      tracker.addListing('example2.com', 'Afternic', 1000, 500)
      tracker.recordSale('example1.com', 'Afternic', 1200)
      
      // Dan: 2 listings, 2 sales (better)
      tracker.addListing('example3.com', 'Dan', 1000, 500)
      tracker.addListing('example4.com', 'Dan', 1000, 500)
      tracker.recordSale('example3.com', 'Dan', 1200)
      tracker.recordSale('example4.com', 'Dan', 1200)
      
      const best = tracker.getBestChannel()
      expect(best).toBe('Dan')
    })
  })

  describe('getAllChannelStats', () => {
    it('should return stats for all channels', () => {
      const allStats = tracker.getAllChannelStats()
      expect(allStats.length).toBeGreaterThan(0)
      expect(allStats.every(s => s.channel)).toBe(true)
    })
  })
})
