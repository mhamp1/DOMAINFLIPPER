// Sound effects for luxury interactions - subtle and high-quality
class SoundEngine {
  private audioContext: AudioContext | null = null
  private enabled: boolean = true

  constructor() {
    if (typeof window !== 'undefined') {
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)()
    }
  }

  private playTone(frequency: number, duration: number, volume: number = 0.1, type: OscillatorType = 'sine') {
    if (!this.enabled || !this.audioContext) return

    const oscillator = this.audioContext.createOscillator()
    const gainNode = this.audioContext.createGain()

    oscillator.connect(gainNode)
    gainNode.connect(this.audioContext.destination)

    oscillator.frequency.value = frequency
    oscillator.type = type

    gainNode.gain.setValueAtTime(volume, this.audioContext.currentTime)
    gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + duration)

    oscillator.start(this.audioContext.currentTime)
    oscillator.stop(this.audioContext.currentTime + duration)
  }

  // Subtle click for UI interactions
  click() {
    this.playTone(800, 0.05, 0.05)
  }

  // Elegant hover sound
  hover() {
    this.playTone(1200, 0.03, 0.03)
  }

  // Success chime for snipes and purchases
  success() {
    if (!this.audioContext) return
    
    this.playTone(523.25, 0.1, 0.08) // C5
    setTimeout(() => this.playTone(659.25, 0.1, 0.08), 50) // E5
    setTimeout(() => this.playTone(783.99, 0.15, 0.1), 100) // G5
  }

  // Gold shimmer for valuable domains
  goldShimmer() {
    if (!this.audioContext) return
    
    const frequencies = [2093, 2349, 2637, 2793]
    frequencies.forEach((freq, i) => {
      setTimeout(() => this.playTone(freq, 0.08, 0.04), i * 30)
    })
  }

  // Vault open sound for God Mode
  vaultOpen() {
    if (!this.audioContext) return
    
    this.playTone(130.81, 0.2, 0.12, 'triangle') // C3
    setTimeout(() => this.playTone(146.83, 0.2, 0.12, 'triangle'), 100) // D3
    setTimeout(() => this.playTone(164.81, 0.3, 0.15, 'triangle'), 200) // E3
  }

  // Auction countdown tick
  tick() {
    this.playTone(1000, 0.02, 0.04)
  }

  // Snipe alert - urgent but elegant
  snipeAlert() {
    if (!this.audioContext) return
    
    this.playTone(1046.5, 0.08, 0.1) // C6
    setTimeout(() => this.playTone(1318.51, 0.12, 0.12), 80) // E6
  }

  // Notification sound
  notification() {
    this.playTone(880, 0.1, 0.06)
    setTimeout(() => this.playTone(1046.5, 0.1, 0.06), 100)
  }

  // Error sound - soft and non-intrusive
  error() {
    this.playTone(220, 0.15, 0.08, 'triangle')
  }

  toggle(enabled: boolean) {
    this.enabled = enabled
  }

  isEnabled(): boolean {
    return this.enabled
  }
}

export const soundEngine = new SoundEngine()
