import { io, type Socket } from 'socket.io-client'
import type { Command, Frame, Lobby, Reply, Welcome } from '../../shared/protocol.ts'

export class OnlineClient {
  socket:Socket
  lobby?:Lobby
  memberId=''
  frame?:Frame
  connected=false
  private seq=0
  onRoom=(_room:Lobby)=>{}
  onFrame=(_frame:Frame,_initial:boolean)=>{}
  onStatus=(_message:string)=>{}
  onClosed=()=>{}
  constructor(){
    const url=import.meta.env.VITE_MULTIPLAYER_URL||(import.meta.env.DEV?'http://localhost:3001':undefined)
    this.socket=io(url,{autoConnect:false,timeout:8000})
    this.socket.on('connect',()=>{
      this.connected=true
      const saved=this.saved()
      if(saved)void this.request<Welcome>('resume',saved).then(w=>{this.accept(w);this.onStatus('Connected')}).catch(e=>{this.clear();this.onStatus(e.message);this.onClosed()})
      else this.onStatus('Connected')
    })
    this.socket.on('disconnect',()=>{this.connected=false;this.onStatus('Reconnecting… Your slot is reserved for 30 seconds.')})
    this.socket.on('connect_error',()=>this.onStatus('Cannot reach multiplayer server. Check your connection and try again.'))
    this.socket.on('room',(room:Lobby)=>{this.lobby=room;this.onRoom(room)})
    this.socket.on('frame',(frame:Frame)=>{
      const initial=this.frame?.matchId!==frame.matchId
      if(initial&&!frame.terrain)return
      if(!initial&&this.frame&&frame.tick<this.frame.tick)return
      this.frame=frame;this.onFrame(frame,initial)
    })
    this.socket.on('room-closed',()=>{this.clear();this.onStatus('Room expired or closed.');this.onClosed()})
  }
  private saved():{code:string;token:string}|undefined{try{const v=JSON.parse(sessionStorage.getItem('alien-online-session')??'null');return typeof v?.code==='string'&&typeof v?.token==='string'?v:undefined}catch{return}}
  private accept(w:Welcome){
    this.seq=Math.max(this.seq,w.nextSeq);this.memberId=w.memberId;this.lobby=w.lobby
    sessionStorage.setItem('alien-online-session',JSON.stringify({code:w.lobby.code,token:w.token}))
    this.onRoom(w.lobby)
    if(w.frame){this.frame=w.frame;this.onFrame(w.frame,true)}
  }
  connect(){if(!import.meta.env.DEV&&!import.meta.env.VITE_MULTIPLAYER_URL){this.onStatus('Online multiplayer is not configured on this deployment.');return}if(!this.socket.connected)this.socket.connect()}
  request<T=undefined>(event:string,value:unknown={}):Promise<T>{
    return new Promise((resolve,reject)=>this.socket.timeout(8000).emit(event,value,(error:Error|null,result:Reply<T>)=>{
      if(error)return reject(Error('Server did not respond. Try again.'))
      if(!result?.ok)return reject(Error(result?.error??'Request failed.'))
      resolve(result.data as T)
    }))
  }
  async enter(kind:'create'|'join',value:unknown){if(!this.connected)throw Error('Connecting to server. Try again in a moment.');const w=await this.request<Welcome>(kind,value);this.seq=0;this.accept(w)}
  send(command:Omit<Extract<Command,{kind:'input'}>,'seq'|'turn'|'matchId'>|Omit<Extract<Command,{kind:'fire'}>,'seq'|'turn'|'matchId'>|Omit<Extract<Command,{kind:'support'}>,'seq'|'turn'|'matchId'>){
    if(!this.connected||!this.frame||this.frame.paused)return
    const c={...command,seq:++this.seq,turn:this.frame.turn,matchId:this.frame.matchId}
    this.socket.emit('command',c)
  }
  clear(){sessionStorage.removeItem('alien-online-session');this.lobby=undefined;this.frame=undefined;this.memberId=''}
  async leave(){try{if(this.connected&&this.lobby)await this.request('leave')}finally{this.clear();this.socket.disconnect();this.connected=false}}
}
