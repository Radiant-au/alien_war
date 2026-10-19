import type { Preferences } from './preferences.ts'

/** Lightweight original synth cues; no third-party audio files or autoplay. */
export class GameAudio {
  private context?: AudioContext
  private musicBus?: GainNode
  private effectsBus?: GainNode
  private timer?: number
  private step = 0
  private active = false
  private settings: Preferences
  constructor(settings: Preferences) {
    this.settings = settings
    document.addEventListener('visibilitychange', () => this.sync())
  }
  unlock() {
    try {
      if (!this.context) {
        this.context = new AudioContext()
        this.musicBus = this.context.createGain(); this.musicBus.connect(this.context.destination)
        this.effectsBus = this.context.createGain(); this.effectsBus.connect(this.context.destination)
      }
      void this.context.resume().catch(() => {})
      this.active = true; this.sync()
    } catch { /* Audio support is optional; the game remains playable. */ }
  }
  update(settings: Preferences) { this.settings = settings; this.sync() }
  stop() { this.active = false; this.sync() }
  private sync() {
    const audible = this.active && this.settings.sound && !document.hidden
    if (this.musicBus) this.musicBus.gain.value = audible ? this.settings.music / 100 * .07 : 0
    if (this.effectsBus) this.effectsBus.gain.value = audible ? this.settings.sfx / 100 * .12 : 0
    if (this.timer !== undefined) window.clearInterval(this.timer)
    this.timer = undefined
    if (audible && this.context) this.timer = window.setInterval(() => {
      this.tone([130.81,196,164.81,261.63,196,164.81,146.83,196][this.step++ % 8], .55, this.musicBus!)
    }, 650)
  }
  private tone(frequency: number, duration: number, bus: GainNode, end = frequency) {
    const context = this.context!
    const oscillator = context.createOscillator(), envelope = context.createGain(), now = context.currentTime
    oscillator.type = 'sine'; oscillator.frequency.setValueAtTime(frequency, now)
    oscillator.frequency.exponentialRampToValueAtTime(end, now + duration)
    envelope.gain.setValueAtTime(0, now); envelope.gain.linearRampToValueAtTime(1, now + .015)
    envelope.gain.exponentialRampToValueAtTime(.001, now + duration)
    oscillator.connect(envelope); envelope.connect(bus); oscillator.start(now); oscillator.stop(now + duration)
    oscillator.onended = () => { oscillator.disconnect(); envelope.disconnect() }
  }
  click() { if(this.context && this.effectsBus && this.settings.sound && this.active) this.tone(620,.08,this.effectsBus,900) }
  shot() { if(this.context && this.effectsBus && this.settings.sound && this.active) this.tone(420,.3,this.effectsBus,65) }
}
