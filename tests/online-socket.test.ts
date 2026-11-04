import test from 'node:test'
import assert from 'node:assert/strict'
import { io, type Socket } from 'socket.io-client'
import { createMultiplayerServer } from '../server/index.ts'
import type { Frame, Lobby, Reply, Welcome } from '../shared/protocol.ts'
function once<T>(socket:Socket,event:string):Promise<T>{return new Promise((resolve,reject)=>{const timer=setTimeout(()=>{socket.off(event,done);reject(Error(`Timed out: ${event}`))},5000);function done(v:T){clearTimeout(timer);resolve(v)}socket.once(event,done)})}
const request=<T>(s:Socket,event:string,data:unknown={})=>new Promise<Reply<T>>((resolve,reject)=>s.timeout(3000).emit(event,data,(e:Error|null,r:Reply<T>)=>e?reject(e):resolve(r)))
test('real sockets: create, invite join, ready/start, snapshots, reconnect, and room isolation',async()=>{
  const server=createMultiplayerServer()
  await new Promise<void>(resolve=>server.http.listen(0,'127.0.0.1',resolve))
  const address=server.http.address();assert.ok(address&&typeof address==='object')
  const url=`http://127.0.0.1:${address.port}`
  const sockets:Socket[]=[]
  const connect=async()=>{const s=io(url,{transports:['websocket'],forceNew:true,reconnection:false});sockets.push(s);await once(s,'connect');return s}
  try{
    const host=await connect(),guest=await connect(),other=await connect()
    assert.equal((await request(host,'create',{name:'Host',capacity:9,ship:0})).ok,false)
    const created=await request<Welcome>(host,'create',{name:'Host',capacity:2,ship:0});assert.ok(created.ok)
    const w=created.data!,joined=await request<Welcome>(guest,'join',{name:'Guest',code:w.lobby.code,ship:1});assert.ok(joined.ok)
    await request(other,'create',{name:'Other',capacity:2,ship:0})
    assert.equal((await request(guest,'start')).ok,false)
    assert.equal((await request(host,'start')).ok,false)
    await request(host,'ready',{ready:true,ship:0});await request(guest,'ready',{ready:true,ship:1})
    let leaked=false;other.on('frame',()=>{leaked=true})
    const initial=once<Frame>(guest,'frame')
    assert.equal((await request(host,'start')).ok,true)
    const frame=await initial;assert.ok(frame.terrain);assert.equal(frame.state.players.length,2)
    const roomChanged=once<Lobby>(guest,'room');host.disconnect();const lobby=await roomChanged
    assert.equal(lobby.members.find(m=>m.id===w.memberId)!.connected,false)
    const replacement=await connect();const resumed=await request<Welcome>(replacement,'resume',{code:w.lobby.code,token:w.token})
    assert.ok(resumed.ok);assert.ok(resumed.data!.frame!.terrain)
    assert.equal((await request(replacement,'command',{kind:'fire',power:Infinity})).ok,false)
    assert.equal(leaked,false)
    assert.equal((await request(replacement,'leave')).ok,true)
  }finally{for(const s of sockets)s.disconnect();server.close()}
})
