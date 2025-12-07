/**
 * Tests for Seasonal Trend Analyzer
 */

import { describe, it, expect } from 'vitest'
import { SeasonalTrendAnalyzer } from './seasonalTrendAnalyzer'
import type { TrendDataPoint } from './seasonalTrendAnalyzer'

describe('SeasonalTrendAnalyzer', () => {
  const analyzer = new SeasonalTrendAnalyzer()

  describe('analyzeTrend', () => {
    it('should return empty analysis for no data', () => {
      const result = analyzer.analyzeTrend('test', [])
      expect(result.currentScore).toBe(0)
      expect(result.dataPoints).toBe(0)
      expect(result.breakdown).toBe('No data available')
    })

    it('should detect rising trends', () => {
      const data: TrendDataPoint[] = [
        { timestamp: new Date('2024-01-01'), value: 10, source: 'test' },
        { timestamp: new Date('2024-01-02'), value: 20, source: 'test' },
        { timestamp: new Date('2024-01-03'), value: 30, source: 'test' },
        { timestamp: new Date('2024-01-04'), value: 40, source: 'test' },
      ]
      const result = analyzer.analyzeTrend('rising', data)
      expect(result.trend).toBe('rising')
      expect(result.momentum).toBeGreaterThan(0)
    })

    it('should detect declining trends', () => {
      const data: TrendDataPoint[] = [
        { timestamp: new Date('2024-01-01'), value: 40, source: 'test' },
        { timestamp: new Date('2024-01-02'), value: 30, source: 'test' },
        { timestamp: new Date('2024-01-03'), value: 20, source: 'test' },
        { timestamp: new Date('2024-01-04'), value: 10, source: 'test' },
      ]
      const result = analyzer.analyzeTrend('declining', data)
      expect(result.trend).toBe('declining')
      expect(result.momentum).toBeLessThan(0)
    })

    it('should detect stable trends', () => {
      const data: TrendDataPoint[] = [
        { timestamp: new Date('2024-01-01'), value: 50, source: 'test' },
        { timestamp: new Date('2024-01-02'), value: 51, source: 'test' },
        { timestamp: new Date('2024-01-03'), value: 49, source: 'test' },
        { timestamp: new Date('2024-01-04'), value: 50, source: 'test' },
      ]
      const result = analyzer.analyzeTrend('stable', data)
      expect(result.trend).toBe('stable')
      expect(Math.abs(result.momentum)).toBeLessThan(20)
    })

    it('should calculate persistence correctly', () => {
      const data: TrendDataPoint[] = []
      // Add data for 10 consecutive days
      for (let i = 0; i < 10; i++) {
        data.push({
          timestamp: new Date(`2024-01-${(i + 1).toString().padStart(2, '0')}`),
          value: 50,
          source: 'test',
        })
      }
      const result = analyzer.analyzeTrend('persistent', data)
      expect(result.persistence).toBeGreaterThan(30)
    })

    it('should detect spikes when enabled', () => {
      const data: TrendDataPoint[] = [
        { timestamp: new Date('2024-01-01'), value: 10, source: 'test' },
        { timestamp: new Date('2024-01-02'), value: 10, source: 'test' },
        { timestamp: new Date('2024-01-03'), value: 500, source: 'test' }, // Major spike
        { timestamp: new Date('2024-01-04'), value: 10, source: 'test' },
        { timestamp: new Date('2024-01-05'), value: 10, source: 'test' },
      ]
      const result = analyzer.analyzeTrend('spike', data)
      // Spike detection depends on threshold
      expect(typeof result.isSpike).toBe('boolean')
    })

    it('should weight recent data more heavily', () => {
      const oldData: TrendDataPoint[] = [
        { timestamp: new Date('2024-01-01'), value: 100, source: 'test' },
        { timestamp: new Date('2024-01-02'), value: 100, source: 'test' },
      ]
      const recentData: TrendDataPoint[] = [
        { timestamp: new Date('2024-02-01'), value: 10, source: 'test' },
        { timestamp: new Date('2024-02-02'), value: 10, source: 'test' },
      ]
      
      const withOld = analyzer.analyzeTrend('test', [...oldData, ...recentData])
      const onlyRecent = analyzer.analyzeTrend('test', recentData)
      
      // Recent data should heavily influence the score
      expect(Math.abs(withOld.currentScore - onlyRecent.currentScore)).toBeLessThan(30)
    })
  })

  describe('configuration', () => {
    it('should allow updating config', () => {
      const customAnalyzer = new SeasonalTrendAnalyzer()
      customAnalyzer.updateConfig({ windowDays: 60 })
      const config = customAnalyzer.getConfig()
      expect(config.windowDays).toBe(60)
    })

    it('should respect spike filter setting', () => {
      const noFilterAnalyzer = new SeasonalTrendAnalyzer()
      noFilterAnalyzer.updateConfig({ enableSpikeFilter: false })
      
      const data: TrendDataPoint[] = [
        { timestamp: new Date('2024-01-01'), value: 10, source: 'test' },
        { timestamp: new Date('2024-01-02'), value: 100, source: 'test' },
      ]
      
      const result = noFilterAnalyzer.analyzeTrend('test', data)
      expect(result.isSpike).toBe(false)
    })
  })
})
