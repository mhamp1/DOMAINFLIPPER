import { describe, it, expect, beforeEach } from 'vitest'
import { TensorFlowModel } from './tensorflowModel'

describe('TensorFlowModel', () => {
  let model: TensorFlowModel

  beforeEach(() => {
    model = new TensorFlowModel()
  })

  describe('predict', () => {
    it('should return a prediction value', async () => {
      const features = {
        age: 10,
        backlinks: 5000,
        traffic: 1000,
        length: 8,
        brandScore: 85,
        seoScore: 80,
        trendScore: 75,
        tldScore: 90,
        sentimentScore: 80,
        keywordScore: 70,
      }

      const prediction = await model.predict(features)
      expect(prediction).toBeGreaterThan(0)
      expect(typeof prediction).toBe('number')
    })

    it('should return higher values for better features', async () => {
      const lowFeatures = {
        age: 1,
        backlinks: 100,
        traffic: 10,
        length: 15,
        brandScore: 40,
        seoScore: 30,
        trendScore: 35,
        tldScore: 40,
        sentimentScore: 45,
        keywordScore: 30,
      }

      const highFeatures = {
        age: 15,
        backlinks: 50000,
        traffic: 10000,
        length: 6,
        brandScore: 95,
        seoScore: 90,
        trendScore: 95,
        tldScore: 95,
        sentimentScore: 90,
        keywordScore: 85,
      }

      const lowPrediction = await model.predict(lowFeatures)
      const highPrediction = await model.predict(highFeatures)

      expect(highPrediction).toBeGreaterThan(lowPrediction)
    })
  })

  describe('batchPredict', () => {
    it('should handle batch predictions', async () => {
      const features = [
        {
          age: 5,
          backlinks: 1000,
          traffic: 500,
          length: 10,
          brandScore: 70,
          seoScore: 65,
          trendScore: 60,
          tldScore: 75,
          sentimentScore: 70,
          keywordScore: 60,
        },
        {
          age: 10,
          backlinks: 5000,
          traffic: 2000,
          length: 7,
          brandScore: 85,
          seoScore: 80,
          trendScore: 85,
          tldScore: 90,
          sentimentScore: 85,
          keywordScore: 80,
        },
      ]

      const predictions = await model.batchPredict(features)
      expect(predictions).toHaveLength(2)
      expect(predictions[0]).toBeGreaterThan(0)
      expect(predictions[1]).toBeGreaterThan(0)
      expect(predictions[1]).toBeGreaterThan(predictions[0])
    })
  })
})
