import test from 'node:test'
import assert from 'node:assert/strict'
import { AudioMixer, volumeGain } from '../src/app/audio-mixer.ts'
import { defaults } from '../src/app/preferences.ts'

test('volume gain follows a bounded curve',()=>{
  assert.equal(volumeGain(0),0);assert.equal(volumeGain(100),1)
  assert.ok(volumeGain(50)>0&&volumeGain(50)<.5)
  assert.equal(volumeGain(400),1);assert.equal(volumeGain(-4),0)
})
test('mixer routes recordings and synth cues, mutes, pauses and disposes cleanly',async()=>{
  const originals={Audio:globalThis.Audio,AudioContext:globalThis.AudioContext,document:globalThis.document,fetch:globalThis.fetch}
  const nodes=[],media=[],listeners=new Map()
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
    decodeAudioData(){return Promise.resolve({numberOfChannels:1,getChannelData:()=>new Float32Array([1,-1,.5])})}
  }
  globalThis.Audio=Audio;globalThis.AudioContext=AudioContext
  globalThis.document={hidden:false,addEventListener:(n,f)=>listeners.set(n,f),removeEventListener:n=>listeners.delete(n)}
  globalThis.fetch=async()=>({ok:true,arrayBuffer:async()=>new ArrayBuffer(4)})
  let mixer
  try{
    mixer=new AudioMixer({...defaults},{intro:'intro',menu:'menu',shot:'shot',electric:'electric',poison:'poison'})
    mixer.unlock();await new Promise(r=>setImmediate(r));mixer.setScene('battle')
    mixer.shot(.8);mixer.impact('fire',-.7);mixer.impact('ice',.4);mixer.turn();mixer.victory()
    assert.ok(nodes.some(n=>n.kind==='compressor'))
    assert.equal(nodes.filter(n=>n.kind==='media').length,10)
    assert.ok(nodes.some(n=>n.kind==='buffer'&&n.started))
    assert.ok(nodes.some(n=>n.kind==='oscillator'&&n.started))
    assert.ok(nodes.some(n=>n.kind==='panner'&&n.pan.value>0))
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
