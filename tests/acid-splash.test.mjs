import test from 'node:test'
import assert from 'node:assert/strict'
import {createAcidSplash,ACID_FRAMES} from '../src/rendering/acid-splash.ts'
test('acid crown bakes twelve transparent animation frames only once',()=>{
 const original=globalThis.document,calls=[],frames=[]
 const ctx=new Proxy({}, {get:(_,name)=>name==='createLinearGradient'?()=>({addColorStop(){}}):(...args)=>calls.push([name,...args])})
 const canvas={width:0,height:0,getContext:()=>ctx};let exists=false
 globalThis.document={createElement:name=>{assert.equal(name,'canvas');return canvas}}
 const scene={textures:{exists:()=>exists,addCanvas:()=>{exists=true;return {add:(...args)=>frames.push(args)}}}}
 try{createAcidSplash(scene);createAcidSplash(scene);assert.equal(frames.length,ACID_FRAMES);assert.equal(canvas.width,192*ACID_FRAMES);assert.equal(canvas.height,128);assert.ok(calls.filter(c=>c[0]==='bezierCurveTo').length>60)}finally{globalThis.document=original}
})
