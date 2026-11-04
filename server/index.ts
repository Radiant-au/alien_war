import { createServer } from 'node:http'
import { fileURLToPath } from 'node:url'
import { Server } from 'socket.io'
import { Rooms } from './rooms.ts'
import { STEP_SECONDS } from '../src/game/projectile.ts'
import type { Command, Reply } from '../shared/protocol.ts'

const integer=(v:unknown,min:number,max:number)=>typeof v==='number'&&Number.isSafeInteger(v)&&v>=min&&v<=max
const record=(v:unknown):v is Record<string,unknown>=>typeof v==='object'&&v!==null&&!Array.isArray(v)
export function validCommand(v:unknown):v is Command{
  if(!record(v)||!integer(v.seq,0,Number.MAX_SAFE_INTEGER)||!integer(v.turn,0,Number.MAX_SAFE_INTEGER)||typeof v.matchId!=='string'||v.matchId.length>64)return false
  if(v.kind==='support')return v.choice==='heal'||v.choice==='shield'
  if(v.kind!=='fire'&&v.kind!=='input')return false
  return typeof v.angle==='number'&&Number.isFinite(v.angle)&&Math.abs(v.angle)<=Math.PI*3&&typeof v.power==='number'&&Number.isFinite(v.power)&&v.power>=.15&&v.power<=1&&integer(v.spell,0,3)&&(v.kind!=='input'||integer(v.axis,-1,1))
}
export function createMultiplayerServer(origins:string[]=[]){
  const rooms=new Rooms()
  const http=createServer((req,res)=>{res.writeHead(req.url==='/health'?200:404,{'Content-Type':'application/json'});res.end(JSON.stringify(req.url==='/health'?{ok:true}: {error:'Not found'}))})
  const allowed=(origin:string|undefined)=>!origin||origins.includes(origin)
  const io=new Server(http,{cors:{origin:(origin,cb)=>cb(null,allowed(origin))},allowRequest:(req,cb)=>cb(null,allowed(req.headers.origin)),maxHttpBufferSize:16_384})
  io.on('connection',socket=>{
    let windowAt=Date.now(),count=0
    const action=(name:string,handler:(value:Record<string,unknown>)=>unknown)=>socket.on(name,(value:unknown,ack?: (r:Reply<unknown>)=>void)=>{
      const reply=typeof ack==='function'?ack:()=>{}
      try{
        if(Date.now()-windowAt>1000){windowAt=Date.now();count=0}if(++count>60)throw Error('Too many requests.')
        if(!record(value))throw Error('Invalid request.')
        reply({ok:true,data:handler(value)})
      }catch(e){reply({ok:false,error:e instanceof Error?e.message:'Request failed.'})}
    })
    const identity=(v:Record<string,unknown>)=>{
      if(typeof v.name!=='string'||!v.name.trim()||v.name.trim().length>20||!integer(v.ship,0,3))throw Error('Enter a nickname (1–20 characters) and choose a ship.')
      return {name:v.name.trim(),ship:v.ship as number}
    }
    const free=()=>{try{rooms.find(socket.id)}catch{return}throw Error('Leave your current room first.')}
    const publish=(code:string)=>{const r=rooms.rooms.get(code);if(r)io.to(code).emit('room',rooms.lobby(r));else io.to(code).emit('room-closed')}
    action('create',v=>{free();const p=identity(v);if(!integer(v.capacity,2,4))throw Error('Choose 2–4 players.');const w=rooms.create(p.name,v.capacity as number,p.ship,socket.id);socket.join(w.lobby.code);publish(w.lobby.code);return w})
    action('join',v=>{free();const p=identity(v);if(typeof v.code!=='string'||!/^[A-Z0-9]{6}$/i.test(v.code))throw Error('Enter a valid room code.');const w=rooms.join(v.code.toUpperCase(),p.name,p.ship,socket.id);socket.join(w.lobby.code);publish(w.lobby.code);return w})
    action('resume',v=>{free();if(typeof v.code!=='string'||typeof v.token!=='string'||v.token.length>128)throw Error('Invalid session.');const w=rooms.resume(v.code,v.token,socket.id);socket.join(w.lobby.code);publish(w.lobby.code);return w})
    action('ready',v=>{if(typeof v.ready!=='boolean'||!integer(v.ship,0,3))throw Error('Invalid ready selection.');const r=rooms.ready(socket.id,v.ready,v.ship as number);publish(r.code)})
    action('start',()=>{const r=rooms.start(socket.id);publish(r.code);io.to(r.code).emit('frame',r.simulation!.frame());r.revision=r.simulation!.match.terrain.revision})
    action('command',v=>{if(!validCommand(v))throw Error('Invalid command.');if(!rooms.command(socket.id,v))throw Error('Action unavailable or stale.');return undefined})
    action('leave',()=>{const r=rooms.leave(socket.id);socket.leave(r.code);publish(r.code)})
    action('lobby',()=>{const r=rooms.returnToLobby(socket.id);publish(r.code)})
    socket.on('disconnect',()=>{try{const r=rooms.disconnect(socket.id);publish(r.code)}catch{/* Not in a room. */}})
  })
  let last=performance.now(),accumulator=0,broadcast=0,sweep=0
  const timer=setInterval(()=>{
    const now=performance.now();accumulator+=Math.min(.1,(now-last)/1000);last=now
    while(accumulator>=STEP_SECONDS){for(const r of rooms.rooms.values())if(r.status==='playing')r.simulation!.step(Date.now(),rooms.waiting(r));accumulator-=STEP_SECONDS}
    if(now-sweep>1000){const before=new Map([...rooms.rooms].map(([code,r])=>[code,JSON.stringify(rooms.lobby(r))]));rooms.sweep();for(const [code,lobby]of before){const r=rooms.rooms.get(code);if(!r)io.to(code).emit('room-closed');else if(lobby!==JSON.stringify(rooms.lobby(r)))io.to(code).emit('room',rooms.lobby(r))}sweep=now}
    if(now-broadcast>=50){
      for(const r of rooms.rooms.values())if(r.simulation){
        if(r.status==='playing'&&r.simulation.match.phase==='GameOver'){r.status='finished';io.to(r.code).emit('room',rooms.lobby(r))}
        if(r.status==='lobby')continue
        const revision=r.simulation.match.terrain.revision
        io.to(r.code).emit('frame',r.simulation.frame(rooms.waiting(r),r.revision!==revision));r.revision=revision
      }
      broadcast=now
    }
  },8)
  return {http,io,rooms,close:()=>{clearInterval(timer);io.close()}}
}
if(process.argv[1]===fileURLToPath(import.meta.url)){
  const origins=(process.env.ALLOWED_ORIGINS??'http://localhost:5173').split(',').map(s=>s.trim())
  const server=createMultiplayerServer(origins)
  server.http.listen(Number(process.env.PORT??3001),'0.0.0.0',()=>console.log('Alien War multiplayer server ready'))
  for(const signal of ['SIGTERM','SIGINT'])process.once(signal,()=>{server.close()})
}
