import { createShot, createSpreadShots, stepShot, type TerminalResult } from './projectile.ts'
import { explosionDamage, type Player, type Terrain } from './terrain.ts'
import { SPELLS } from './spells.ts'
import type { Match } from './match.ts'

export type GameMode = 'local' | 'ai'
export type Difficulty = 'easy' | 'normal' | 'hard'
export interface AiPlan { angle:number; power:number; spell:number; score:number }
export const AI_LEVELS = {
  easy:{angles:9,powers:7,errorAngle:6,errorPower:.07,think:.65,move:0},
  normal:{angles:17,powers:11,errorAngle:2.2,errorPower:.025,think:.85,move:.25},
  hard:{angles:27,powers:15,errorAngle:.45,errorPower:.008,think:1.05,move:.45},
} as const
export function computerTurn(mode:GameMode,active:number){return mode==='ai'&&active>0}

function scoreImpact(result:TerminalResult|undefined,shooter:Player,players:Player[],radius:number,damage:number){
  if(result?.kind!=='impact')return -10000
  const targets=players.filter(p=>p.id!==shooter.id&&p.health>0)
  const nearest=Math.min(...targets.map(p=>Math.hypot(p.x-result.x,p.y-result.y)))
  let score=-nearest*.035
  for(const p of players){
    if(p.health<=0)continue
    const hit=explosionDamage(p,result.x,result.y,radius,damage)
    score+=p.id===shooter.id?-hit*3:Math.min(hit,p.health)*2+(hit>=p.health?45:0)
  }
  return score
}

/** Yield within trajectories, so even a long high arc cannot block a render frame. */
export function* searchAiShot(terrain:Terrain,players:Player[],active:number,difficulty:Difficulty):Generator<void,AiPlan,void>{
  const shooter=players[active],level=AI_LEVELS[difficulty]
  const enemies=players.filter(p=>p.id!==shooter.id&&p.health>0)
  const directions=[...new Set(enemies.map(p=>p.x>=shooter.x?1:-1))]
  let best:AiPlan={angle:shooter.aimAngle,power:.65,spell:2,score:-Infinity}
  function* trial(angle:number,power:number):Generator<void,void,void>{
    const candidate={...shooter,aimAngle:angle,power}
    const shot=createShot(candidate)
    let result:TerminalResult|undefined
    for(let step=0;step<720;step++){
      result=stepShot(shot,terrain,players,1/60)
      if(result)break
      if(step%32===0)yield
    }
    for(let spell=0;spell<SPELLS.length;spell++){
      // Electric spreads three shots with one third damage per impact.
      if(SPELLS[spell].effect==='electric')continue
      const s=SPELLS[spell],score=scoreImpact(result,shooter,players,s.radius,s.damage)
      if(score>best.score)best={angle,power,spell,score}
    }
    yield
  }
  for(const direction of directions)for(let a=0;a<level.angles;a++)for(let p=0;p<level.powers;p++){
    const elevation=(8+a*77/(level.angles-1))*Math.PI/180
    yield* trial(direction===1?-elevation:-Math.PI+elevation,.18+p*.82/(level.powers-1))
  }
  if(difficulty==='hard'){
    const coarse={...best}
    for(const a of [-2,-1,0,1,2])for(const p of [-2,-1,0,1,2]){
      const angle=coarse.angle+a*Math.PI/180
      if(Math.sin(angle)>=0)continue
      yield* trial(angle,Math.max(.15,Math.min(1,coarse.power+p*.009)))
    }
    // Evaluate the electric volley explicitly, rather than assuming a single central hit.
    const shots=createSpreadShots({...shooter,aimAngle:best.angle,power:best.power})
    let total=0
    for(const shot of shots){
      let result:TerminalResult|undefined
      for(let step=0;step<720;step++){
        result=stepShot(shot,terrain,players,1/60)
        if(result)break
        if(step%32===0)yield
      }
      total+=scoreImpact(result,shooter,players,SPELLS[0].radius,SPELLS[0].damage/3)
    }
    if(total>best.score)best={...best,spell:0,score:total}
  }
  return best
}

export function imperfectAim(plan:AiPlan,difficulty:Difficulty,random=Math.random):AiPlan{
  const level=AI_LEVELS[difficulty]
  const angle=plan.angle+(random()-.5)*2*level.errorAngle*Math.PI/180
  return {...plan,angle:Math.max(-Math.PI+.025,Math.min(-.025,angle)),power:Math.max(.15,Math.min(1,plan.power+(random()-.5)*2*level.errorPower))}
}
export interface AiAction { axis:-1|0|1; plan?:AiPlan; fire?:boolean }
/** A turn-local scheduler: pause by not ticking; reset on restart or a phase change. */
export class AiController {
  private identity?:Player
  private elapsed=0
  private stage:'move'|'search'|'aim'|'fired'='move'
  private search?:Generator<void,AiPlan,void>
  private plan?:AiPlan
  private readyAt=0
  reset(){this.identity=undefined;this.search=undefined;this.plan=undefined;this.elapsed=0;this.stage='move'}
  tick(match:Match,difficulty:Difficulty,dt:number,random=Math.random):AiAction{
    if(match.phase!=='MovementAiming'||match.players[match.active].health<=0){this.reset();return {axis:0}}
    const player=match.players[match.active],level=AI_LEVELS[difficulty]
    if(this.identity!==player){this.reset();this.identity=player}
    this.elapsed+=Math.min(dt,.1)
    if(this.stage==='move'){
      const enemy=match.players.filter(p=>p.id!==player.id&&p.health>0).sort((a,b)=>Math.abs(a.x-player.x)-Math.abs(b.x-player.x))[0]
      if(!enemy){this.stage='fired';return {axis:0}}
      if(this.elapsed<level.move&&player.movementRemaining>0){
        const toward=enemy.x>player.x?1:-1
        return {axis:Math.abs(enemy.x-player.x)<240?(toward===1?-1:1):toward}
      }
      if(!player.grounded)return {axis:0}
      this.search=searchAiShot(match.terrain,match.players,match.active,difficulty);this.stage='search'
    }
    if(this.stage==='search'){
      const deadline=performance.now()+5
      for(let i=0;i<160&&performance.now()<deadline;i++){
        const next=this.search!.next()
        if(next.done){this.plan=imperfectAim(next.value,difficulty,random);this.readyAt=this.elapsed+.5;this.stage='aim';break}
      }
    }
    if(this.stage==='aim'){
      if(this.elapsed>=Math.max(level.think,this.readyAt)&&player.grounded){this.stage='fired';return {axis:0,plan:this.plan,fire:true}}
      return {axis:0,plan:this.plan}
    }
    return {axis:0}
  }
}
