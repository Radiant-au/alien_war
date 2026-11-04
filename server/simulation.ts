import { randomUUID } from 'node:crypto'
import { applyShotResult, createMatch, finishShot, fire, updateMatch, useSupport } from '../src/game/match.ts'
import { createWeaponShots, PROJECTILE_SPEED_MULTIPLIER, STEP_SECONDS, stepShot } from '../src/game/projectile.ts'
import { SPELLS, weaponBlast } from '../src/game/spells.ts'
import type { Command, Frame, VisualEvent } from '../shared/protocol.ts'

export class Simulation {
  id=randomUUID()
  match=createMatch(Math.floor(Math.random()*0xffffffff),2)
  tick=0
  turn=0
  spell=0
  shots:Frame['shots']=[]
  events:VisualEvent[]=[]
  private eventId=0
  private shotId=0
  private axis:-1|0|1=0
  private inputAt=0
  constructor(count:number,seed=Math.floor(Math.random()*0xffffffff)) { this.match=createMatch(seed,count) }
  event(event:Omit<VisualEvent,'id'>){this.events.push({...event,id:++this.eventId});this.events=this.events.slice(-128)}
  stop(){this.axis=0}
  command(slot:number,command:Command,now:number){
    const m=this.match,p=m.players[slot]
    if(command.matchId!==this.id||command.turn!==this.turn||slot!==m.active||m.phase!=='MovementAiming'||!p||p.health<=0)return false
    if(command.kind==='support'){
      const amount=useSupport(m,command.choice)
      if(!amount)return false
      this.event({kind:'support',player:slot,spell:this.spell,choice:command.choice,amount});return true
    }
    p.aimAngle=command.angle;p.power=command.power;this.spell=command.spell
    if(command.kind==='input'){this.axis=command.axis;this.inputAt=now;return true}
    if(!fire(m))return false
    this.axis=0
    this.shots=createWeaponShots(p,SPELLS[this.spell]).map(shot=>({id:++this.shotId,shot}))
    m.shot=this.shots[0].shot
    this.event({kind:'shot',player:slot,spell:this.spell});return true
  }
  step(now:number,waiting:boolean){
    const m=this.match
    // Finish the active volley and settling before pausing at a safe boundary.
    if(waiting&&!['ProjectileFlight','Impact','Settling'].includes(m.phase))return
    this.tick++
    if(m.phase==='ProjectileFlight'){
      for(let i=this.shots.length-1;i>=0;i--){
        const result=stepShot(this.shots[i].shot,m.terrain,m.players,STEP_SECONDS*PROJECTILE_SPEED_MULTIPLIER)
        if(!result)continue
        if(result.kind==='impact'){
          applyShotResult(m,result,weaponBlast(SPELLS[this.spell]))
          this.event({kind:'impact',player:m.active,spell:this.spell,x:result.x,target:result.target})
        }
        this.shots.splice(i,1)
      }
      if(this.shots.length)m.shot=this.shots[0].shot
      else finishShot(m)
    }
    const before=m.active
    updateMatch(m,STEP_SECONDS,waiting||now-this.inputAt>300?0:this.axis)
    if(before!==m.active){this.turn++;this.axis=0}
    for(const player of m.damageTicks)this.event({kind:'poison',player,spell:1})
    for(const player of m.burnTicks)this.event({kind:'burn',player,spell:2})
  }
  forfeit(slot:number){
    const p=this.match.players[slot];if(!p)return
    p.health=0;p.shield=0
    if(slot===this.match.active)this.stop()
    // Resolve the winner promptly even when a different player disconnected.
    if(this.match.phase==='MovementAiming'&&(slot===this.match.active||this.match.players.filter(p=>p.health>0).length<=1))this.match.phase='WinnerCheck'
  }
  frame(paused=false,terrain=true):Frame{
    const {terrain:map,pointerId:_pointer,viewWidth:_view,cameraX:_x,cameraZoom:_zoom,cameraFromX:_from,cameraToX:_to,cameraElapsed:_elapsed,...state}=this.match
    return structuredClone({matchId:this.id,tick:this.tick,turn:this.turn,paused,state,terrain:terrain?map:undefined,shots:this.shots,spell:this.spell,events:this.events})
  }
}
