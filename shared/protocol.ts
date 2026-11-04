import type { Match, SupportChoice } from '../src/game/match.ts'
import type { Shot } from '../src/game/projectile.ts'
import type { Terrain } from '../src/game/terrain.ts'

export interface Member { id:string; slot:number; name:string; ship:number; ready:boolean; connected:boolean }
export interface Lobby { code:string; capacity:number; host:string; status:'lobby'|'playing'|'finished'; members:Member[] }
export type CombatState = Omit<Match,'terrain'|'pointerId'|'viewWidth'|'cameraX'|'cameraZoom'|'cameraFromX'|'cameraToX'|'cameraElapsed'>
export type VisualEvent = { id:number; kind:'shot'|'impact'|'support'|'poison'|'burn'; player:number; spell:number; x?:number; target?:'terrain'|number; choice?:SupportChoice; amount?:number }
export interface Frame { matchId:string; tick:number; turn:number; paused:boolean; state:CombatState; terrain?:Terrain; shots:{id:number;shot:Shot}[]; spell:number; events:VisualEvent[] }
export type Command = {seq:number;turn:number;matchId:string} & (
  | {kind:'input';axis:-1|0|1;angle:number;power:number;spell:number}
  | {kind:'fire';angle:number;power:number;spell:number}
  | {kind:'support';choice:SupportChoice}
)
export interface Welcome { token:string; nextSeq:number; memberId:string; lobby:Lobby; frame?:Frame }
export interface Reply<T=undefined> { ok:boolean; data?:T; error?:string }
