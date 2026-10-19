import type { Preferences } from './preferences.ts'
import introTrack from '../assets/music/intro.mp3?url'
import menuTrack from '../assets/music/main_menu.mp3?url'
import shootSound from '../assets/Sfx/shoot.mp3?url'
import electricSound from '../assets/Sfx/electric.ogg?url'

export const SFX_ASSETS = [shootSound, electricSound]

/** Shared music and lightweight synth sound effects. */
export class GameAudio {
  private context?: AudioContext
  private effectsBus?: GainNode
  private music = new Audio(introTrack)
  private currentTrack = introTrack
  private scene: 'loading' | 'menu' | 'battle' = 'loading'
  private samples = {
    shot: Array.from({length:4},()=>new Audio(shootSound)),
    electric: Array.from({length:2},()=>new Audio(electricSound)),
  }
  private sampleIndex = {shot:0,electric:0}
  private active = false
  private settings: Preferences
  constructor(settings: Preferences) {
    this.settings = settings
    this.music.loop = true
    this.music.preload = 'metadata'
    document.addEventListener('visibilitychange', () => this.sync())
  }
  start() { this.active = true; this.sync() }
  finishLoading() { this.sync() }
  setScene(scene: 'loading' | 'menu' | 'battle') {
    if(this.scene!==scene)this.stopSamples()
    this.scene = scene
    const track = scene === 'menu' ? menuTrack : introTrack
    if (this.currentTrack !== track) {
      this.currentTrack = track
      this.music.src = track
      this.music.currentTime = 0
    }
    this.sync()
  }
  unlock() {
    this.active = true
    try {
      if (!this.context) {
        this.context = new AudioContext()
        this.effectsBus = this.context.createGain(); this.effectsBus.connect(this.context.destination)
      }
      void this.context.resume().catch(() => {})
    } catch { /* Synth effects are optional; music can still play. */ }
    // Call play synchronously inside the real user gesture, even without Web Audio.
    this.sync()
  }
  update(settings: Preferences) { this.settings = settings; this.sync() }
  stop() { this.active = false; this.sync() }
  private sync() {
    const audible = this.active && this.settings.sound && !document.hidden
    if (this.effectsBus) this.effectsBus.gain.value = audible ? this.settings.sfx / 100 * .12 : 0
    for(const pool of Object.values(this.samples))for(const sample of pool)sample.volume=audible?this.settings.sfx/100:0
    if(!audible)this.stopSamples()
    this.music.volume = Math.min(1, this.settings.music / 100 * (this.scene === 'loading' ? 1.5 : this.scene === 'menu' ? .65 : .2))
    if (audible && this.settings.music > 0) void this.music.play().catch(() => {})
    else this.music.pause()
  }
  private tone(frequency: number, duration: number, bus: GainNode, end = frequency, level = 1) {
    const context = this.context!
    const oscillator = context.createOscillator(), envelope = context.createGain(), now = context.currentTime
    oscillator.type = 'sine'; oscillator.frequency.setValueAtTime(frequency, now)
    oscillator.frequency.exponentialRampToValueAtTime(end, now + duration)
    envelope.gain.setValueAtTime(0, now); envelope.gain.linearRampToValueAtTime(level, now + .015)
    envelope.gain.exponentialRampToValueAtTime(.001, now + duration)
    oscillator.connect(envelope); envelope.connect(bus); oscillator.start(now); oscillator.stop(now + duration)
    oscillator.onended = () => { oscillator.disconnect(); envelope.disconnect() }
  }
  click() { if(this.context && this.effectsBus && this.settings.sound && this.active) this.tone(620,.08,this.effectsBus,900) }
  character() { if(this.context && this.effectsBus && this.settings.sound && this.active) this.tone(260,.3,this.effectsBus,680,3) }
  private stopSamples() {
    for(const pool of Object.values(this.samples))for(const sample of pool){sample.pause();sample.currentTime=0}
  }
  private playSample(kind:'shot'|'electric') {
    if(!this.active||!this.settings.sound||this.settings.sfx<=0||document.hidden||this.scene!=='battle')return
    const pool=this.samples[kind],sample=pool[this.sampleIndex[kind]++%pool.length]
    sample.pause();sample.currentTime=0;sample.volume=this.settings.sfx/100
    void sample.play().catch(()=>{})
  }
  shot() { this.playSample('shot') }
  electricImpact() { this.playSample('electric') }
}



