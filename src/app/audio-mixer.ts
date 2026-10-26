import type { Preferences } from './preferences.ts'
export type SampleKind='shot'|'electric'|'poison'
export interface AudioTracks { intro:string; menu:string; shot:string; electric:string; poison:string }
export function volumeGain(percent:number){return Math.max(0,Math.min(100,percent))/100}

/** Shared buses let recorded sounds and synthesized cues obey the same mixer. */
export class AudioMixer {
  private context?:AudioContext
  private master?:GainNode
  private effects?:GainNode
  private musicBus?:GainNode
  private decks:HTMLAudioElement[]
  private deckGains:GainNode[]=[]
  private deck=0
  private track:string
  private scene:'loading'|'menu'|'battle'='loading'
  private active=false
  private settings:Preferences
  private urls:AudioTracks
  private pools:Record<SampleKind,HTMLAudioElement[]>
  private poolIndex={shot:0,electric:0,poison:0}
  private routes=new Map<HTMLAudioElement,StereoPannerNode>()
  private buffers=new Map<SampleKind,AudioBuffer>()
  private voices=new Set<AudioScheduledSourceNode>()
  private loading=false
  private fadeTimer?:ReturnType<typeof setTimeout>
  private visibility=()=>this.sync()
  constructor(settings:Preferences,urls:AudioTracks){
    this.settings={...settings};this.urls=urls;this.track=urls.intro
    this.decks=[new Audio(urls.intro),new Audio(urls.menu)]
    for(const deck of this.decks){deck.loop=true;deck.preload='auto'}
    this.pools={shot:[],electric:[],poison:[]}
    for(const kind of ['shot','electric','poison'] as const){
      this.pools[kind]=Array.from({length:kind==='shot'?4:2},()=>{const a=new Audio(urls[kind]);a.preload='auto';return a})
    }
    document.addEventListener('visibilitychange',this.visibility)
  }
  start(){this.active=true;this.sync()}
  finishLoading(){this.sync()}
  unlock(){
    this.active=true
    try{
      if(!this.context){
        const context=this.context=new AudioContext()
        this.master=context.createGain();this.master.gain.value=1
        const limiter=context.createDynamicsCompressor()
        limiter.threshold.value=-1;limiter.knee.value=0;limiter.ratio.value=20;limiter.attack.value=.003;limiter.release.value=.08
        this.effects=context.createGain();this.musicBus=context.createGain()
        this.effects.connect(limiter);limiter.connect(this.master);this.musicBus.connect(this.master)
        // Protect only near-full-scale mixed peaks; no fixed attenuation or broad compression.
        const output=context.createDynamicsCompressor()
        output.threshold.value=-.1;output.knee.value=0;output.ratio.value=20;output.attack.value=.001;output.release.value=.05
        this.master.connect(output);output.connect(context.destination)
        this.deckGains=this.decks.map((deck,i)=>{
          const gain=context.createGain();gain.gain.value=i===this.deck?1:0
          context.createMediaElementSource(deck).connect(gain);gain.connect(this.musicBus!);return gain
        })
        for(const pool of Object.values(this.pools))for(const sample of pool){
          const pan=context.createStereoPanner();context.createMediaElementSource(sample).connect(pan);pan.connect(this.effects);this.routes.set(sample,pan)
        }
      }
      void this.context.resume().catch(()=>{})
      void this.loadSamples()
    }catch{/* HTML audio fallback remains available when Web Audio is unavailable. */}
    this.sync()
  }
  private async loadSamples(){
    if(this.loading||!this.context)return
    this.loading=true
    await Promise.all((['shot','electric','poison'] as const).map(async kind=>{
      try{
        const response=await fetch(this.urls[kind],{signal:AbortSignal.timeout(15000)})
        if(!response.ok)return
        const buffer=await this.context!.decodeAudioData(await response.arrayBuffer())
        // Preserve the decoded recording, including its original channel data.
        this.buffers.set(kind,buffer)
      }catch{/* Recorded HTML audio pools remain the fallback. */}
    }))
  }
  update(settings:Preferences){this.settings={...settings};this.sync()}
  stop(){this.active=false;this.sync()}
  setScene(scene:'loading'|'menu'|'battle'){
    if(this.scene!==scene)this.stopSamples()
    this.scene=scene
    const track=scene==='menu'?this.urls.menu:this.urls.intro
    if(track!==this.track){
      clearTimeout(this.fadeTimer)
      const old=this.deck;this.deck=1-old;this.track=track
      const incoming=this.decks[this.deck];incoming.pause();incoming.src=track;incoming.currentTime=0
      if(this.context&&this.deckGains.length===2){
        const now=this.context.currentTime
        for(let i=0;i<2;i++){
          const param=this.deckGains[i].gain;param.cancelScheduledValues(now);param.setValueAtTime(param.value,now);param.linearRampToValueAtTime(i===this.deck?1:0,now+.4)
        }
        this.fadeTimer=setTimeout(()=>this.decks[old].pause(),450)
      }else this.decks[old].pause()
    }
    this.sync()
  }
  private audible(){return this.active&&this.settings.sound&&!document.hidden}
  private ramp(node:GainNode|undefined,value:number){
    if(!node||!this.context)return
    const now=this.context.currentTime;node.gain.cancelScheduledValues(now);node.gain.setTargetAtTime(value,now,.035)
  }
  private sync(){
    const audible=this.audible()
    this.ramp(this.effects,audible?volumeGain(this.settings.sfx):0)
    this.ramp(this.musicBus,audible?volumeGain(this.settings.music):0)
    for(const pool of Object.values(this.pools))for(const sample of pool)sample.volume=this.routes.has(sample)?1:audible?volumeGain(this.settings.sfx):0
    for(let i=0;i<2;i++){
      this.decks[i].volume=this.musicBus?1:audible&&i===this.deck?volumeGain(this.settings.music):0
      if(!audible||this.settings.music===0)this.decks[i].pause()
    }
    if(audible&&this.settings.music>0)void this.decks[this.deck].play().catch(()=>{})
    if(!audible)this.stopSamples()
  }
  private stopSamples(){
    for(const voice of this.voices){try{voice.stop()}catch{/* already ended */}}
    this.voices.clear()
    for(const pool of Object.values(this.pools))for(const sample of pool){sample.pause();sample.currentTime=0}
  }
  private playSample(kind:SampleKind,_position=0){
    if(!this.audible()||this.settings.sfx<=0||this.scene!=='battle')return
    const context=this.context,buffer=this.buffers.get(kind),pan=0
    if(context&&this.effects&&buffer){
      if(this.voices.size>=12){const oldest=this.voices.values().next().value!;oldest.stop();this.voices.delete(oldest)}
      const source=context.createBufferSource(),panner=context.createStereoPanner()
      source.buffer=buffer;panner.pan.value=pan;source.connect(panner);panner.connect(this.effects);this.voices.add(source)
      source.onended=()=>{this.voices.delete(source);source.disconnect();panner.disconnect()};source.start()
    }else{
      const pool=this.pools[kind],sample=pool[this.poolIndex[kind]++%pool.length]
      sample.pause();sample.currentTime=0
      const route=this.routes.get(sample);if(route)route.pan.value=pan
      sample.volume=route?1:volumeGain(this.settings.sfx)
      void sample.play().catch(()=>{})
    }
  }
  private tone(start:number,end:number,duration:number,level=.2,delay=0,position=0,type:OscillatorType='sine'){
    if(!this.context||!this.effects||!this.audible()||this.settings.sfx<=0)return
    if(this.voices.size>=12){const oldest=this.voices.values().next().value!;oldest.stop();this.voices.delete(oldest)}
    const context=this.context,osc=context.createOscillator(),env=context.createGain(),pan=context.createStereoPanner(),now=context.currentTime+delay
    pan.pan.value=Math.max(-.75,Math.min(.75,position*.75));osc.type=type
    osc.frequency.setValueAtTime(start,now);osc.frequency.exponentialRampToValueAtTime(Math.max(20,end),now+duration)
    env.gain.setValueAtTime(0,now);env.gain.linearRampToValueAtTime(level,now+.01);env.gain.exponentialRampToValueAtTime(.001,now+duration)
    osc.connect(env);env.connect(pan);pan.connect(this.effects);osc.start(now);osc.stop(now+duration)
    this.voices.add(osc)
    osc.onended=()=>{this.voices.delete(osc);osc.disconnect();env.disconnect();pan.disconnect()}
  }
  click(){this.tone(620,900,.065,.12)}
  character(){this.tone(260,680,.22,.18)}
  shot(pan=0){this.playSample('shot',pan)}
  electricImpact(){this.impact('electric')}
  poisonImpact(){this.impact('poison')}
  impact(effect:string,pan=0){
    if(this.scene!=='battle'||!this.audible()||this.settings.sfx<=0)return
    if(effect==='electric')this.playSample('electric',pan)
    else if(effect==='poison')this.playSample('poison',pan)
    else if(effect==='fire'){
      this.tone(130,28,.5,.4,0,pan,'triangle');this.tone(310,55,.23,.12,.025,pan,'sawtooth')
    }else{
      this.tone(1600,500,.24,.12,0,pan);this.tone(2200,900,.3,.08,.045,pan)
    }
  }
  turn(){if(this.scene==='battle'){this.tone(440,520,.1,.1);this.tone(660,740,.14,.1,.12)}}
  victory(){if(this.scene==='battle')for(const [i,note]of [523,659,784,1046].entries())this.tone(note,note,.28,.15,i*.14)}
  destroy(){
    this.stop();clearTimeout(this.fadeTimer);document.removeEventListener('visibilitychange',this.visibility)
    for(const deck of this.decks)deck.pause()
    void this.context?.close().catch(()=>{})
  }
}
