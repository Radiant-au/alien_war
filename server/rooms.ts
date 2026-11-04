import { randomBytes, randomUUID } from 'node:crypto'
import { Simulation } from './simulation.ts'
import type { Command, Lobby, Member, Welcome } from '../shared/protocol.ts'
export const RECONNECT_MS=30_000
interface Session { token:string; member:Member; socketId?:string; disconnectedAt?:number; lastSeq:number }
export interface Room { code:string;capacity:number;host:string;status:Lobby['status'];sessions:Session[];simulation?:Simulation;updatedAt:number;revision:number }
export class Rooms {
  rooms=new Map<string,Room>()
  lobby(r:Room):Lobby{return {code:r.code,capacity:r.capacity,host:r.host,status:r.status,members:r.sessions.map(s=>({...s.member}))}}
  reset(r:Room){for(const s of r.sessions)s.member.ready=false;r.updatedAt=Date.now()}
  create(name:string,capacity:number,ship:number,socketId:string){
    if(this.rooms.size>=200)throw Error('Server is full. Try again later.')
    const alphabet='ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
    let code:string;do{code=[...randomBytes(6)].map(byte=>alphabet[byte%alphabet.length]).join('')}while(this.rooms.has(code))
    const r:Room={code,capacity,host:'',status:'lobby',sessions:[],updatedAt:Date.now(),revision:-1}
    this.rooms.set(code,r);const welcome=this.join(code,name,ship,socketId);r.host=welcome.memberId;welcome.lobby=this.lobby(r);return welcome
  }
  join(code:string,name:string,ship:number,socketId:string):Welcome{
    const r=this.rooms.get(code);if(!r)throw Error('Room not found or expired.')
    if(r.status!=='lobby')throw Error('This match has already started.')
    if(r.sessions.length>=r.capacity)throw Error('Room is full.')
    const slots=new Set(r.sessions.map(s=>s.member.slot));let slot=0;while(slots.has(slot))slot++
    const member:Member={id:randomUUID(),slot,name,ship,ready:false,connected:true}
    const token=randomBytes(32).toString('hex')
    r.sessions.push({token,member,socketId,lastSeq:-1});this.reset(r)
    return {token,nextSeq:0,memberId:member.id,lobby:this.lobby(r)}
  }
  resume(code:string,token:string,socketId:string,now=Date.now()):Welcome{
    const r=this.rooms.get(code),s=r?.sessions.find(s=>s.token===token)
    if(!r||!s||s.socketId||s.disconnectedAt!==undefined&&now-s.disconnectedAt>=RECONNECT_MS)throw Error('Session expired or already connected.')
    s.socketId=socketId;s.disconnectedAt=undefined;s.member.connected=true
    return {token,nextSeq:s.lastSeq+1,memberId:s.member.id,lobby:this.lobby(r),frame:r.simulation?.frame(this.waiting(r))}
  }
  find(socketId:string){for(const room of this.rooms.values()){const session=room.sessions.find(s=>s.socketId===socketId);if(session)return {room,session}}throw Error('Join a room first.')}
  ready(socketId:string,ready:boolean,ship:number){const {room:r,session:s}=this.find(socketId);if(r.status!=='lobby')throw Error('Match already started.');if(s.member.ship!==ship){this.reset(r);s.member.ship=ship}s.member.ready=ready;r.updatedAt=Date.now();return r}
  start(socketId:string){
    const {room:r,session:s}=this.find(socketId)
    if(s.member.id!==r.host)throw Error('Only the room creator can start.')
    if(r.status!=='lobby'||r.sessions.length!==r.capacity||r.sessions.some(s=>!s.member.ready||!s.member.connected))throw Error('Every slot must be filled and ready.')
    // Compact slots after lobby departures so simulation IDs always match.
    r.sessions.sort((a,b)=>a.member.slot-b.member.slot).forEach((s,i)=>{s.member.slot=i;s.lastSeq=-1})
    r.simulation=new Simulation(r.capacity);r.status='playing';r.revision=-1;r.updatedAt=Date.now();return r
  }
  command(socketId:string,c:Command,now=Date.now()){
    const {room:r,session:s}=this.find(socketId)
    if(r.status!=='playing'||!r.simulation||this.waiting(r)||c.seq<=s.lastSeq)return false
    // Consume a fresh sequence even when the command is rejected as stale.
    s.lastSeq=c.seq
    return r.simulation.command(s.member.slot,c,now)
  }
  waiting(r:Room){return r.status==='playing'&&r.sessions.some(s=>!s.member.connected&&s.disconnectedAt!==undefined&&r.simulation!.match.players[s.member.slot].health>0)}
  disconnect(socketId:string,now=Date.now()){
    const {room:r,session:s}=this.find(socketId);s.socketId=undefined;s.disconnectedAt=now;s.member.connected=false;s.member.ready=false;r.simulation?.stop();return r
  }
  leave(socketId:string){const {room,session}=this.find(socketId);this.remove(room,session);return room}
  private remove(r:Room,s:Session){
    if(r.status==='playing')r.simulation?.forfeit(s.member.slot)
    r.sessions=r.sessions.filter(x=>x!==s)
    if(!r.sessions.length){this.rooms.delete(r.code);return}
    if(r.host===s.member.id)r.host=(r.sessions.find(x=>x.member.connected)??r.sessions[0]).member.id
    this.reset(r)
  }
  returnToLobby(socketId:string){const {room:r}=this.find(socketId);if(r.status!=='finished')throw Error('The match is still running.');r.status='lobby';r.simulation=undefined;this.reset(r);return r}
  sweep(now=Date.now()){
    for(const r of this.rooms.values()){
      for(const s of [...r.sessions])if(s.disconnectedAt!==undefined&&now-s.disconnectedAt>=RECONNECT_MS)this.remove(r,s)
      if(r.status==='lobby'&&now-r.updatedAt>30*60_000)this.rooms.delete(r.code)
    }
  }
}
