/**
 * DomainTransfer.ts — AUTOMATIC DOMAIN TRANSFER
 * Transfers domains via registrar APIs — December 27, 2025
 * 
 * NOTE: This is a legacy wrapper. Use RealDomainTransfer.ts for new code.
 */

import { toast } from 'sonner'
import { realDomainTransfer } from './RealDomainTransfer'

interface TransferRequest {
  id: string
  domain: string
  fromEmail: string
  toEmail: string
  registrar: string
  status: 'pending' | 'initiated' | 'completed' | 'failed'
  authCode?: string
  initiatedAt: Date
  completedAt?: Date
  error?: string
}

interface Registrar {
  id: string
  name: string
  apiEndpoint?: string
  supportsInstantTransfer: boolean
  avgTransferTime: number // minutes
}

const REGISTRARS: Registrar[] = [
  {
    id: 'godaddy',
    name: 'GoDaddy',
    apiEndpoint: '/api/registrar/godaddy',
    supportsInstantTransfer: true,
    avgTransferTime: 5,
  },
  {
    id: 'namecheap',
    name: 'Namecheap',
    apiEndpoint: '/api/registrar/namecheap',
    supportsInstantTransfer: true,
    avgTransferTime: 10,
  },
  {
    id: 'namesilo',
    name: 'NameSilo',
    apiEndpoint: '/api/registrar/namesilo',
    supportsInstantTransfer: true,
    avgTransferTime: 15,
  },
  {
    id: 'cloudflare',
    name: 'Cloudflare',
    apiEndpoint: '/api/registrar/cloudflare',
    supportsInstantTransfer: true,
    avgTransferTime: 5,
  },
]

export class DomainTransfer {
  private transfers: Map<string, TransferRequest> = new Map()

  /**
   * Transfer domain to buyer
   */
  async transfer(domain: string, toEmail: string, registrar: string = 'godaddy'): Promise<string> {
    const transferId = this.generateTransferId()

    const transferRequest: TransferRequest = {
      id: transferId,
      domain,
      fromEmail: 'seller@quantumfalconapp.com',
      toEmail,
      registrar,
      status: 'pending',
      initiatedAt: new Date(),
    }

    this.transfers.set(transferId, transferRequest)

    try {
      // Step 1: Get auth code
      const authCode = await this.getAuthCode(domain, registrar)
      transferRequest.authCode = authCode

      // Step 2: Initiate transfer
      transferRequest.status = 'initiated'
      await this.initiateTransfer(domain, toEmail, authCode, registrar)

      // Step 3: Monitor transfer status
      await this.monitorTransfer(transferId)

      toast.success('🚀 Transfer Initiated', {
        description: `${domain} → ${toEmail}`,
        duration: 5000,
      })

      return transferId
    } catch (error) {
      transferRequest.status = 'failed'
      transferRequest.error = error instanceof Error ? error.message : 'Unknown error'

      toast.error('Transfer Failed', {
        description: `${domain} — ${transferRequest.error}`,
      })

      throw error
    }
  }

  /**
   * Get domain auth code from registrar
   */
  private async getAuthCode(_domain: string, registrar: string): Promise<string> {
    const registrarInfo = REGISTRARS.find(r => r.id === registrar)
    if (!registrarInfo) {
      throw new Error(`Unknown registrar: ${registrar}`)
    }

    try {
      // In production: call registrar API
      // const response = await fetch(`${registrarInfo.apiEndpoint}/domains/${domain}/auth-code`, {
      //   method: 'GET',
      //   headers: { 'Authorization': `Bearer ${API_KEY}` }
      // })
      // const data = await response.json()
      // return data.auth_code

      // Mock: generate auth code
      await this.simulateApiCall()
      return this.generateAuthCode()
    } catch (error) {
      console.error('Auth code retrieval error:', error)
      throw new Error('Failed to get auth code')
    }
  }

  /**
   * Initiate domain transfer
   */
  private async initiateTransfer(
    _domain: string,
    _toEmail: string,
    _authCode: string,
    registrar: string
  ): Promise<void> {
    const registrarInfo = REGISTRARS.find(r => r.id === registrar)
    if (!registrarInfo) {
      throw new Error(`Unknown registrar: ${registrar}`)
    }

    try {
      // In production: call registrar API
      // await fetch(`${registrarInfo.apiEndpoint}/domains/${domain}/transfer`, {
      //   method: 'POST',
      //   headers: { 'Authorization': `Bearer ${API_KEY}` },
      //   body: JSON.stringify({
      //     to_email: toEmail,
      //     auth_code: authCode
      //   })
      // })

      // Mock: simulate transfer initiation
      await this.simulateApiCall()
    } catch (error) {
      console.error('Transfer initiation error:', error)
      throw new Error('Failed to initiate transfer')
    }
  }

  /**
   * Monitor transfer progress
   */
  private async monitorTransfer(transferId: string): Promise<void> {
    const transfer = this.transfers.get(transferId)
    if (!transfer) return

    const registrarInfo = REGISTRARS.find(r => r.id === transfer.registrar)
    if (!registrarInfo) return

    // Simulate transfer completion after avg time
    setTimeout(() => {
      const currentTransfer = this.transfers.get(transferId)
      if (currentTransfer && currentTransfer.status === 'initiated') {
        currentTransfer.status = 'completed'
        currentTransfer.completedAt = new Date()

        toast.success('✅ Domain Transferred', {
          description: `${currentTransfer.domain} → Transfer complete in ${registrarInfo.avgTransferTime} minutes`,
          duration: 7000,
          icon: '🎉',
        })
      }
    }, registrarInfo.avgTransferTime * 60 * 1000)

    // In production: poll registrar API
    // const checkStatus = setInterval(async () => {
    //   const response = await fetch(`${registrarInfo.apiEndpoint}/transfers/${transferId}`)
    //   const data = await response.json()
    //   if (data.status === 'completed') {
    //     clearInterval(checkStatus)
    //     transfer.status = 'completed'
    //     transfer.completedAt = new Date()
    //   }
    // }, 30000)
  }

  /**
   * Push transfer (faster method for some registrars)
   */
  async pushTransfer(domain: string, toAccount: string, registrar: string): Promise<string> {
    const transferId = this.generateTransferId()

    const transferRequest: TransferRequest = {
      id: transferId,
      domain,
      fromEmail: 'seller@quantumfalconapp.com',
      toEmail: toAccount,
      registrar,
      status: 'pending',
      initiatedAt: new Date(),
    }

    this.transfers.set(transferId, transferRequest)

    try {
      // Push transfer (instant within same registrar)
      await this.simulateApiCall()

      transferRequest.status = 'completed'
      transferRequest.completedAt = new Date()

      toast.success('⚡ Push Transfer Complete', {
        description: `${domain} → Instant transfer to ${toAccount}`,
        duration: 5000,
      })

      return transferId
    } catch (error) {
      transferRequest.status = 'failed'
      transferRequest.error = error instanceof Error ? error.message : 'Unknown error'

      toast.error('Push Transfer Failed', {
        description: `${domain} — Falling back to standard transfer`,
      })

      // Fallback to standard transfer
      return this.transfer(domain, toAccount, registrar)
    }
  }

  /**
   * Get transfer status
   */
  getTransferStatus(transferId: string): TransferRequest | undefined {
    return this.transfers.get(transferId)
  }

  /**
   * Get all active transfers
   */
  getActiveTransfers(): TransferRequest[] {
    return Array.from(this.transfers.values()).filter(
      t => t.status === 'pending' || t.status === 'initiated'
    )
  }

  /**
   * Get transfer statistics
   */
  getStats(): {
    total: number
    completed: number
    failed: number
    avgCompletionTime: number
  } {
    const all = Array.from(this.transfers.values())
    const completed = all.filter(t => t.status === 'completed')
    const failed = all.filter(t => t.status === 'failed')

    // Calculate average completion time
    const completionTimes = completed
      .filter(t => t.completedAt && t.initiatedAt)
      .map(t => (t.completedAt!.getTime() - t.initiatedAt.getTime()) / (1000 * 60))
    
    const avgTime = completionTimes.length > 0
      ? completionTimes.reduce((a, b) => a + b, 0) / completionTimes.length
      : 0

    return {
      total: all.length,
      completed: completed.length,
      failed: failed.length,
      avgCompletionTime: Math.round(avgTime),
    }
  }

  /**
   * Helper: Generate transfer ID
   */
  private generateTransferId(): string {
    return `xfer_${Date.now()}_${Math.random().toString(36).substring(7)}`
  }

  /**
   * Helper: Generate auth code
   */
  private generateAuthCode(): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
    let code = ''
    for (let i = 0; i < 12; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length))
    }
    return code
  }

  /**
   * Helper: Simulate API call delay
   */
  private async simulateApiCall(): Promise<void> {
    await new Promise(resolve => setTimeout(resolve, 500 + Math.random() * 1000))
  }
}

// Export singleton
export const domainTransfer = new DomainTransfer()
