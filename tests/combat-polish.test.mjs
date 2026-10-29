import test from 'node:test'
import assert from 'node:assert/strict'
import ts from 'typescript'
import {readFileSync} from 'node:fs'
import {createMatch} from '../src/game/match.ts'
// Exercise the actual renderer's state and draw calls with a minimal graphics adapter.
const source=readFileSync(new URL('../src/rendering/combat-polish.ts',import.meta.url),'utf8')
const code=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2023}}).outputText
 .replace('import Phaser from \'phaser\';',"const Phaser={Scenes:{Events:{SHUTDOWN:'shutdown'}}};")
 .replace("'../game/terrain.ts'",JSON.stringify(new URL('../src/game/terrain.ts',import.meta.url).href))
const {CombatPolish}=await import('data:text/javascript;base64,'+Buffer.from(code).toString('base64'))
function setup(){const calls=[];const g=new Proxy({}, {get:(_,name)=>(...args)=>{calls.push([name,...args]);return g}});const events=[];const images=[];const image=()=>{const im={active:true,setOrigin(){return this},setDepth(){return this},setPosition(){return this},setDisplaySize(){return this},setFrame(){return this},setAlpha(){return this},destroy(){this.active=false}};images.push(im);return im};const scene={textures:{exists:()=>true},add:{graphics:()=>g,image},events:{once:(event,fn)=>events.push(fn)}};const fx=new CombatPolish(scene),match=createMatch();fx.clear(match.players);return {fx,match,calls,events,g,images}}
test('weapon muzzle shapes expire, effects are bounded and reset clears all state',()=>{
 const {fx,match,calls}=setup()
 for(const effect of ['electric','poison','fire','ice'])fx.muzzle(100,100,-.7,effect)
 fx.acid(100,60,9);fx.debris(100,100);fx.update(.05,match.terrain,false)
 assert.ok(calls.some(c=>c[0]==='rotateCanvas'&&c[1]===-.7));assert.equal(fx.bursts.filter(b=>b.kind==='muzzle').length,4)
 fx.update(.2,match.terrain,false);assert.equal(fx.bursts.filter(b=>b.kind==='muzzle').length,0)
 for(let i=0;i<50;i++){fx.debris(i,100);fx.acid(i,60,9)}assert.equal(fx.bursts.length,36);assert.equal(fx.acids.length,8)
 fx.clear(match.players);assert.equal(fx.bursts.length+fx.acids.length+fx.reactions.size,0)
})
test('poison visuals last for their supplied damage lifetime and observe each death once',()=>{
 const {fx,match,g}=setup();fx.acid(100,60,9);fx.update(8.9,match.terrain,true);assert.equal(fx.acids.length,1);fx.update(.11,match.terrain,true);assert.equal(fx.acids.length,0)
 const p=match.players[0];p.health=90;fx.observe(match.players,'electric');assert.equal(fx.reactions.get(0).effect,'electric');fx.drawShip(g,0,false,1,true)
 p.health=0;fx.observe(match.players,'fire');fx.observe(match.players,'fire');assert.equal(fx.bursts.filter(b=>b.kind==='death').length,1)
 fx.update(.6,match.terrain,true);assert.equal(fx.bursts.length,0)
})
test('support effects follow the hull graphics and acid pools clear without creating splash sprites',()=>{
 const {fx,match,g,images,calls}=setup(),p=match.players[0]
 fx.support(0,'heal');fx.drawSupport(g,p,false,1,true)
 assert.ok(calls.some(c=>c[0]==='fillRect'))
 p.shield=20;fx.support(0,'shield');fx.drawSupport(g,p,false,1,false)
 assert.ok(calls.some(c=>c[0]==='strokeEllipse'))
 fx.acid(100,60,9);assert.equal(fx.acids.length,1);assert.equal(images.length,0);fx.clear(match.players)
 assert.ok(images.every(im=>!im.active));assert.equal(fx.supportPulses.size,0)
})
