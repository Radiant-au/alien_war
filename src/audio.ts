import type { Preferences } from './preferences.ts'

/** Shared music and lightweight synth sound effects. */
export class GameAudio {
  private context?: AudioContext
  private effectsBus?: GainNode
  private music = new Audio('/assets/music/intro.mp3')
  private active = false
  private settings: Preferences
  constructor(settings: Preferences) {
    this.settings = settings
    this.music.loop = true
    this.music.preload = 'auto'
    document.addEventListener('visibilitychange', () => this.sync())
  }
  start() { this.active = true; this.sync() }
  unlock() {
    try {
      if (!this.context) {
        this.context = new AudioContext()
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
    if (this.effectsBus) this.effectsBus.gain.value = audible ? this.settings.sfx / 100 * .12 : 0
    this.music.volume = this.settings.music / 100
    if (audible && this.settings.music > 0) void this.music.play().catch(() => {})
    else this.music.pause()
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
