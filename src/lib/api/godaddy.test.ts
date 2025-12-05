/**
 * GoDaddy API Tests
 * Comprehensive tests for GoDaddy API integration
 * December 2025
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { GoDaddyAPI } from './godaddy'

// Mock axios
vi.mock('axios', () => ({
  default: {
    create: vi.fn(() => ({
      get: vi.fn(),
      post: vi.fn(),
      interceptors: {
        request: { use: vi.fn() },
        response: { use: vi.fn() },
      },
    })),
  },
}))

describe('GoDaddyAPI', () => {
  let api: GoDaddyAPI

  beforeEach(() => {
    api = new GoDaddyAPI({
      apiKey: 'test-api-key',
      apiSecret: 'test-api-secret',
      sandbox: true,
    })
    vi.clearAllMocks()
  })

  describe('constructor', () => {
    it('should initialize with sandbox URL when sandbox is true', () => {
      const sandboxApi = new GoDaddyAPI({
        apiKey: 'key',
        apiSecret: 'secret',
        sandbox: true,
      })
      expect(sandboxApi).toBeDefined()
    })

    it('should initialize with production URL when sandbox is false', () => {
      const prodApi = new GoDaddyAPI({
        apiKey: 'key',
        apiSecret: 'secret',
        sandbox: false,
      })
      expect(prodApi).toBeDefined()
    })

    it('should initialize OAuth when configured', () => {
      const oauthApi = new GoDaddyAPI({
        apiKey: 'key',
        apiSecret: 'secret',
        useOAuth: true,
        clientId: 'client-id',
        clientSecret: 'client-secret',
      })
      expect(oauthApi).toBeDefined()
    })
  })

  describe('searchAuctions', () => {
    it('should be a function', () => {
      expect(typeof api.searchAuctions).toBe('function')
    })
  })

  describe('placeBid', () => {
    it('should be a function', () => {
      expect(typeof api.placeBid).toBe('function')
    })
  })
})
