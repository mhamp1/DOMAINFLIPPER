/**
 * Multi-Channel Sync Safeguards
 * Ensures price/floor consistency across channels
 * Propagates updates and fails closed on errors
 */

import { toast } from 'sonner'
import { logger } from '@/lib/utils/logger'

export interface ChannelListing {
  channel: string
  listingId: string
  domain: string
  price: number
  floorPrice: number
  status: 'active' | 'pending' | 'paused' | 'error' | 'cancelled'
  lastSync: Date
  lastError?: string
  metadata?: Record<string, unknown>
}

export interface SyncResult {
  channel: string
  success: boolean
  error?: string
  previousPrice?: number
  newPrice?: number
}

export interface MultiChannelStatus {
  domain: string
  channels: ChannelListing[]
  isConsistent: boolean
  inconsistencies: string[]
  lastFullSync: Date
}

/**
 * Available marketplace channels
 */
export const MARKETPLACE_CHANNELS = [
  'afternic',
  'sedo',
  'flippa',
  'godaddy',
  'namecheap',
] as const

export type MarketplaceChannel = typeof MARKETPLACE_CHANNELS[number]

/**
 * Sync price across all channels with safeguards
 */
export async function syncPriceAcrossChannels(
  domain: string,
  newPrice: number,
  floorPrice: number,
  channels: ChannelListing[]
): Promise<{
  success: boolean
  results: SyncResult[]
  failedChannels: string[]
}> {
  const results: SyncResult[] = []
  const failedChannels: string[] = []
  
  logger.info('SYNC', `Syncing price for ${domain} to $${newPrice}`, {
    channels: channels.map(c => c.channel),
  })
  
  // Validate inputs
  if (newPrice < floorPrice) {
    logger.error('SYNC', 'Price validation failed', new Error('Price below floor'), {
      domain,
      price: newPrice,
      floor: floorPrice,
    })
    
    toast.error('Price Sync Failed', {
      description: `Price ($${newPrice}) cannot be below floor ($${floorPrice})`,
    })
    
    return {
      success: false,
      results: [],
      failedChannels: channels.map(c => c.channel),
    }
  }
  
  // Update each channel
  for (const channel of channels) {
    try {
      const result = await updateChannelPrice(channel, newPrice, floorPrice)
      results.push(result)
      
      if (!result.success) {
        failedChannels.push(channel.channel)
      }
    } catch (error: any) {
      logger.error('SYNC', `Channel update failed: ${channel.channel}`, error, {
        domain,
        channel: channel.channel,
      })
      
      results.push({
        channel: channel.channel,
        success: false,
        error: error.message,
      })
      
      failedChannels.push(channel.channel)
    }
  }
  
  // Fail closed if any channel errors
  const allSucceeded = failedChannels.length === 0
  
  if (!allSucceeded) {
    logger.warn('SYNC', `Partial sync failure for ${domain}`, {
      succeeded: results.filter(r => r.success).length,
      failed: failedChannels.length,
      failedChannels,
    })
    
    toast.error('Multi-Channel Sync Error', {
      description: `${failedChannels.length} channel(s) failed: ${failedChannels.join(', ')}`,
      duration: 10000,
    })
    
    // Rollback on failure (fail closed)
    await rollbackPriceChanges(domain, channels, results)
  } else {
    logger.info('SYNC', `Successfully synced ${domain} across all channels`, {
      channels: channels.length,
      newPrice,
    })
    
    toast.success('Price Synced', {
      description: `${domain} updated to $${newPrice.toLocaleString()} on ${channels.length} channels`,
    })
  }
  
  return {
    success: allSucceeded,
    results,
    failedChannels,
  }
}

/**
 * Update price on a single channel
 */
async function updateChannelPrice(
  channel: ChannelListing,
  newPrice: number,
  floorPrice: number
): Promise<SyncResult> {
  const previousPrice = channel.price
  
  try {
    // Call channel-specific API
    await updateChannelAPI(channel.channel, channel.listingId, newPrice, floorPrice)
    
    logger.info('SYNC', `Updated ${channel.channel}`, {
      domain: channel.domain,
      oldPrice: previousPrice,
      newPrice,
    })
    
    return {
      channel: channel.channel,
      success: true,
      previousPrice,
      newPrice,
    }
  } catch (error: any) {
    logger.error('SYNC', `Failed to update ${channel.channel}`, error, {
      domain: channel.domain,
      listingId: channel.listingId,
    })
    
    return {
      channel: channel.channel,
      success: false,
      error: error.message,
      previousPrice,
    }
  }
}

/**
 * Update channel via API (placeholder - integrate with actual APIs)
 */
async function updateChannelAPI(
  channel: string,
  listingId: string,
  price: number,
  floorPrice: number
): Promise<void> {
  // Simulate API call delay
  await new Promise(resolve => setTimeout(resolve, 100))
  
  // Simulate occasional failures for testing (only in development)
  if (import.meta.env.DEV && Math.random() < 0.05) { // 5% failure rate in dev only
    throw new Error(`${channel} API temporarily unavailable`)
  }
  
  // In production, call actual marketplace APIs
  logger.info('SYNC', `API call to ${channel}`, {
    listingId,
    price,
    floorPrice,
  })
}

/**
 * Rollback price changes on failure (fail closed)
 */
async function rollbackPriceChanges(
  domain: string,
  channels: ChannelListing[],
  results: SyncResult[]
): Promise<void> {
  logger.warn('SYNC', `Rolling back price changes for ${domain}`, {
    channels: channels.length,
  })
  
  // Revert successful updates
  for (const result of results) {
    if (result.success && result.previousPrice !== undefined) {
      const channel = channels.find(c => c.channel === result.channel)
      if (channel) {
        try {
          await updateChannelAPI(
            channel.channel,
            channel.listingId,
            result.previousPrice,
            channel.floorPrice
          )
          
          logger.info('SYNC', `Rolled back ${channel.channel}`, {
            domain,
            restoredPrice: result.previousPrice,
          })
        } catch (error: any) {
          logger.error('SYNC', `Rollback failed for ${channel.channel}`, error, {
            domain,
          })
        }
      }
    }
  }
  
  toast.warning('Price Sync Rolled Back', {
    description: `${domain} prices restored due to sync failure`,
  })
}

/**
 * Cancel listing across all channels
 */
export async function cancelListingAcrossChannels(
  domain: string,
  channels: ChannelListing[]
): Promise<{
  success: boolean
  results: SyncResult[]
  failedChannels: string[]
}> {
  const results: SyncResult[] = []
  const failedChannels: string[] = []
  
  logger.info('SYNC', `Cancelling listing for ${domain}`, {
    channels: channels.map(c => c.channel),
  })
  
  for (const channel of channels) {
    try {
      await cancelChannelListing(channel)
      
      results.push({
        channel: channel.channel,
        success: true,
      })
    } catch (error: any) {
      logger.error('SYNC', `Failed to cancel ${channel.channel}`, error, {
        domain,
        channel: channel.channel,
      })
      
      results.push({
        channel: channel.channel,
        success: false,
        error: error.message,
      })
      
      failedChannels.push(channel.channel)
    }
  }
  
  const allSucceeded = failedChannels.length === 0
  
  if (!allSucceeded) {
    toast.error('Cancellation Error', {
      description: `Failed to cancel on: ${failedChannels.join(', ')}`,
    })
  } else {
    toast.success('Listing Cancelled', {
      description: `${domain} removed from ${channels.length} channels`,
    })
  }
  
  return {
    success: allSucceeded,
    results,
    failedChannels,
  }
}

/**
 * Cancel listing on a single channel
 */
async function cancelChannelListing(channel: ChannelListing): Promise<void> {
  // Simulate API call
  await new Promise(resolve => setTimeout(resolve, 100))
  
  logger.info('SYNC', `Cancelled listing on ${channel.channel}`, {
    domain: channel.domain,
    listingId: channel.listingId,
  })
}

/**
 * Check consistency across all channels
 */
export function checkChannelConsistency(
  domain: string,
  channels: ChannelListing[]
): MultiChannelStatus {
  const inconsistencies: string[] = []
  
  if (channels.length === 0) {
    return {
      domain,
      channels: [],
      isConsistent: true,
      inconsistencies: [],
      lastFullSync: new Date(),
    }
  }
  
  // Check price consistency
  const prices = channels.map(c => c.price)
  const uniquePrices = [...new Set(prices)]
  
  if (uniquePrices.length > 1) {
    inconsistencies.push(
      `Price mismatch: ${uniquePrices.map(p => `$${p}`).join(', ')}`
    )
  }
  
  // Check floor price consistency
  const floorPrices = channels.map(c => c.floorPrice)
  const uniqueFloors = [...new Set(floorPrices)]
  
  if (uniqueFloors.length > 1) {
    inconsistencies.push(
      `Floor mismatch: ${uniqueFloors.map(p => `$${p}`).join(', ')}`
    )
  }
  
  // Check for error states
  const errorChannels = channels.filter(c => c.status === 'error')
  if (errorChannels.length > 0) {
    inconsistencies.push(
      `Error states: ${errorChannels.map(c => c.channel).join(', ')}`
    )
  }
  
  // Check for stale syncs (> 24 hours)
  const staleChannels = channels.filter(c => {
    const hoursSinceSync = (Date.now() - c.lastSync.getTime()) / (1000 * 60 * 60)
    return hoursSinceSync > 24
  })
  
  if (staleChannels.length > 0) {
    inconsistencies.push(
      `Stale sync (>24h): ${staleChannels.map(c => c.channel).join(', ')}`
    )
  }
  
  return {
    domain,
    channels,
    isConsistent: inconsistencies.length === 0,
    inconsistencies,
    lastFullSync: new Date(),
  }
}

/**
 * Get channel status summary
 */
export function getChannelStatusSummary(
  channels: ChannelListing[]
): {
  total: number
  active: number
  pending: number
  error: number
  cancelled: number
  statusBreakdown: Record<string, number>
} {
  const statusBreakdown: Record<string, number> = {
    active: 0,
    pending: 0,
    paused: 0,
    error: 0,
    cancelled: 0,
  }
  
  channels.forEach(channel => {
    statusBreakdown[channel.status]++
  })
  
  return {
    total: channels.length,
    active: statusBreakdown.active,
    pending: statusBreakdown.pending,
    error: statusBreakdown.error,
    cancelled: statusBreakdown.cancelled,
    statusBreakdown,
  }
}

/**
 * Reconcile channel listings (fix inconsistencies)
 */
export async function reconcileChannels(
  domain: string,
  channels: ChannelListing[],
  targetPrice: number,
  targetFloor: number
): Promise<{
  success: boolean
  fixedChannels: string[]
  remainingIssues: string[]
}> {
  logger.info('SYNC', `Reconciling channels for ${domain}`, {
    targetPrice,
    targetFloor,
  })
  
  const fixedChannels: string[] = []
  const remainingIssues: string[] = []
  
  // Sync all to target price
  const syncResult = await syncPriceAcrossChannels(
    domain,
    targetPrice,
    targetFloor,
    channels
  )
  
  syncResult.results.forEach(result => {
    if (result.success) {
      fixedChannels.push(result.channel)
    } else {
      remainingIssues.push(`${result.channel}: ${result.error || 'unknown error'}`)
    }
  })
  
  const success = remainingIssues.length === 0
  
  if (success) {
    toast.success('Channels Reconciled', {
      description: `${domain} synchronized across all channels`,
    })
  } else {
    toast.warning('Partial Reconciliation', {
      description: `${fixedChannels.length} fixed, ${remainingIssues.length} issues remain`,
    })
  }
  
  return {
    success,
    fixedChannels,
    remainingIssues,
  }
}
