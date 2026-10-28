import test from 'node:test'
import assert from 'node:assert/strict'
import { AudioMixer, volumeGain } from '../src/app/audio-mixer.ts'
import { defaults } from '../src/app/preferences.ts'

test('volume is linear with unity gain at 100 percent',()=>{
  assert.equal(volumeGain(0),0);assert.equal(volumeGain(100),1)
  assert.equal(volumeGain(50),.5)
  assert.equal(volumeGain(400),1);assert.equal(volumeGain(-4),0)
})
test('mixer routes recordings and synth cues, mutes, pauses and disposes cleanly',async()=>{
  const originals={Audio:globalThis.Audio,AudioContext:globalThis.AudioContext,document:globalThis.document,fetch:globalThis.fetch}
  const nodes=[],media=[],listeners=new Map(),recording=new Float32Array([1,-1,.5])
  const param=()=>({value:0,setValueAtTime(v){this.value=v},linearRampToValueAtTime(v){this.value=v},exponentialRampToValueAtTime(v){this.value=v},setTargetAtTime(v){this.value=v},cancelScheduledValues(){}})
  const node=kind=>{
    const n={kind,gain:param(),pan:param(),frequency:param(),threshold:param(),knee:param(),ratio:param(),attack:param(),release:param(),connect(to){this.to=to},disconnect(){},start(){this.started=true},stop(){this.stopped=true;this.onended?.()}}
    nodes.push(n);return n
  }
  class Audio {
    constructor(src){this.src=src;this.currentTime=0;this.volume=1;media.push(this)}
    play(){this.playing=true;return Promise.resolve()}
    pause(){this.playing=false}
  }
  class AudioContext {
    currentTime=0;destination={}
    createGain(){return node('gain')}
    createDynamicsCompressor(){return node('compressor')}
    createStereoPanner(){return node('panner')}
    createMediaElementSource(){return node('media')}
    createBufferSource(){return node('buffer')}
    createOscillator(){return node('oscillator')}
    resume(){return Promise.resolve()}
    close(){this.closed=true;return Promise.resolve()}
    decodeAudioData(){return Promise.resolve({numberOfChannels:1,getChannelData:()=>recording})}
  }
  globalThis.Audio=Audio;globalThis.AudioContext=AudioContext
  globalThis.document={hidden:false,addEventListener:(n,f)=>listeners.set(n,f),removeEventListener:n=>listeners.delete(n)}
  globalThis.fetch=async()=>({ok:true,arrayBuffer:async()=>new ArrayBuffer(4)})
  let mixer
  try{
    mixer=new AudioMixer({...defaults},{intro:'intro',menu:'menu',shot:'shot',electric:'electric',poison:'poison'})
    mixer.unlock();await new Promise(r=>setImmediate(r));mixer.setScene('battle')
    mixer.shot(.8);mixer.impact('fire',-.7);mixer.impact('ice',.4);mixer.turn();mixer.victory()
    const limiter=nodes.find(n=>n.kind==='compressor')
    assert.equal(limiter.threshold.value,-1)
    assert.equal(limiter.knee.value,0)
    assert.deepEqual([...recording],[1,-1,.5])
    mixer.update({...defaults,music:100,sfx:100})
    const gains=nodes.filter(n=>n.kind==='gain')
    assert.equal(gains[0].gain.value,1) // master
    assert.equal(gains[1].gain.value,1) // effects
    assert.equal(gains[2].gain.value,1.6) // boosted music
    assert.equal(gains[2].to,gains[0]) // music bypasses the effects limiter
    mixer.update({...defaults,music:100,sfx:100,musicBoost:false})
    assert.equal(gains[2].gain.value,1) // original level with boost disabled
    mixer.update({...defaults,music:100,sfx:100,musicBoost:true})
    mixer.shot(1)
    assert.equal(gains[2].gain.value,1.6) // no automatic music ducking
    assert.equal(nodes.find(n=>n.kind==='buffer').to.pan.value,0) // retain recorded stereo balance
    assert.equal(nodes.filter(n=>n.kind==='media').length,14)
    assert.ok(nodes.some(n=>n.kind==='buffer'&&n.started))
    assert.ok(nodes.some(n=>n.kind==='oscillator'&&n.started))
    mixer.tone(440,520,.1,.1,0,.7) // synthesized cues may still be positioned
    assert.ok(nodes.some(n=>n.kind==='panner'&&n.pan.value>0))
    mixer.tone(440,520,.1,.1,0,-.7)
    assert.ok(nodes.some(n=>n.kind==='panner'&&n.pan.value<0))
    mixer.update({...defaults,sound:false})
    assert.ok(media.every(a=>!a.playing))
    const count=nodes.length;mixer.shot();mixer.impact('fire');assert.equal(nodes.length,count)
    mixer.update({...defaults});globalThis.document.hidden=true;listeners.get('visibilitychange')()
    assert.ok(media.every(a=>!a.playing))
    globalThis.document.hidden=false;listeners.get('visibilitychange')()
    assert.ok(media.some(a=>a.playing))
    mixer.setScene('menu');const before=nodes.filter(n=>n.kind==='buffer').length
    mixer.shot();assert.equal(nodes.filter(n=>n.kind==='buffer').length,before)
    mixer.destroy();assert.equal(listeners.size,0);assert.ok(media.every(a=>!a.playing))
  }finally{mixer?.destroy();Object.assign(globalThis,originals)}
})
