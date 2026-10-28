import Phaser from 'phaser'
import { surfaceAt, type Player, type Terrain } from '../game/terrain.ts'
import type { Spell } from '../game/spells.ts'
type Effect=Spell['effect']
interface Burst{x:number;y:number;age:number;duration:number;angle:number;effect:Effect;kind:'muzzle'|'soil'|'death'}
interface Acid{x:number;age:number;duration:number;radius:number}
/** Bounded, simulation-time cosmetics; pause/restart cannot leave background timers. */
export class CombatPolish{
 private g:Phaser.GameObjects.Graphics
 private bursts:Burst[]=[]
 private acids:Acid[]=[]
 private reactions=new Map<number,{effect:Effect;age:number}>()
 private health:number[]=[]
 private clock=0
 constructor(scene:Phaser.Scene){this.g=scene.add.graphics().setDepth(4);scene.events.once(Phaser.Scenes.Events.SHUTDOWN,()=>this.g.destroy())}
 clear(players:Player[]){this.clock=0;this.bursts=[];this.acids=[];this.reactions.clear();this.health=players.map(p=>p.health);this.g.clear()}
 muzzle(x:number,y:number,angle:number,effect:Effect){this.add({x,y,angle,effect,age:0,duration:.16,kind:'muzzle'})}
 debris(x:number,y:number){this.add({x,y,angle:0,effect:'ice',age:0,duration:.65,kind:'soil'})}
 acid(x:number,radius:number,duration:number){this.acids.push({x,radius,duration,age:0});if(this.acids.length>8)this.acids.shift()}
 private add(b:Burst){this.bursts.push(b);if(this.bursts.length>36)this.bursts.shift()}
 observe(players:Player[],effect:Effect){
  for(const p of players){const before=this.health[p.id]??p.health;if(p.health<before){this.reactions.set(p.id,{effect,age:0});if(p.health===0)this.add({x:p.x,y:p.y,angle:0,effect,age:0,duration:.55,kind:'death'})}this.health[p.id]=p.health}
 }
 poison(id:number){this.reactions.set(id,{effect:'poison',age:0})}
 update(dt:number,terrain:Terrain,reduced:boolean){
  const g=this.g;g.clear();this.clock+=dt
  if(!reduced)for(let i=0;i<4;i++){const x=(173+i*641+this.clock*3)%terrain.heights.length,y=surfaceAt(terrain,x)-18-Math.sin(this.clock*.5+i)*8;g.fillStyle(0xb4e6fa,.10);g.fillCircle(x,y,1)}
  this.bursts=this.bursts.filter(b=>(b.age+=dt)<b.duration)
  for(const [id,r]of this.reactions){r.age+=dt;if(r.age>2.4)this.reactions.delete(id)}
  for(const b of this.bursts){
   const t=b.age/b.duration,a=1-t
   g.save();g.translateCanvas(b.x,b.y);g.rotateCanvas(b.angle)
   if(b.kind==='muzzle'){
    const color={electric:0x74efff,poison:0x9aff48,fire:0xffa041,ice:0xc9fbff}[b.effect]
    g.lineStyle(2,color,a);g.fillStyle(color,a*.7)
    if(b.effect==='poison'){g.fillEllipse(8,0,14+t*15,9+t*10);g.fillCircle(17,-5,3)}
    else if(b.effect==='electric'){g.beginPath();g.moveTo(0,0);g.lineTo(8,-5);g.lineTo(12,3);g.lineTo(24,-2);g.strokePath()}
    else if(b.effect==='fire'){g.fillTriangle(0,-6,26,0,0,7);g.fillStyle(0xfff3b0,a);g.fillTriangle(0,-3,15,0,0,3)}
    else{for(let i=0;i<4;i++){const angle=i*Math.PI/4;g.beginPath();g.moveTo(10-Math.cos(angle)*9,-Math.sin(angle)*9);g.lineTo(10+Math.cos(angle)*9,Math.sin(angle)*9);g.strokePath()}}
   }else{
    g.lineStyle(2,b.kind==='death'?0xa9f5ff:0x70d7d2,a);if(b.kind==='death')g.strokeEllipse(0,0,12+t*70,10+t*45)
    for(let i=0;i<(reduced?3:8);i++){
     const angle=i*2.399,range=reduced?5:t*(b.kind==='death'?55:36),x=Math.cos(angle)*range,y=-Math.abs(Math.sin(angle))*range+t*t*24
     const color=b.kind==='death'?(i%2?0x7495ac:0x53dbec):(i%3===0?0xb586f5:0x369da6)
     g.fillStyle(color,a);g.fillTriangle(x-3,y+2,x+1,y-4,x+4,y+2)
    }
   }g.restore()
  }
  this.acids=this.acids.filter(p=>(p.age+=dt)<p.duration)
  for(const p of this.acids){
   const alpha=Math.min(1,(p.duration-p.age)/.65),y=surfaceAt(terrain,p.x)
   g.fillStyle(0x489c18,alpha*.65);g.lineStyle(2,0x9bf340,alpha*.8)
   g.beginPath();for(let i=0;i<=18;i++){const x=p.x+(i/18-.5)*p.radius*2,sy=surfaceAt(terrain,x);if(i===0)g.moveTo(x,sy);else g.lineTo(x,sy)}g.strokePath()
   for(let i=18;i>=0;i--){const x=p.x+(i/18-.5)*p.radius*2;g.lineTo(x,surfaceAt(terrain,x)+6)}g.closePath();g.fillPath()
   if(p.age<.35){const t=p.age/.35;g.fillStyle(0x8be82b,(1-t)*alpha);g.beginPath();g.moveTo(p.x-28,y);for(let i=0;i<7;i++)g.lineTo(p.x-25+i*9,y-(i%2?9:24)*(1-t*.6));g.lineTo(p.x+34,y);g.closePath();g.fillPath()}
   for(let i=0;i<(reduced?3:7);i++){
    const x=p.x+(i/6-.5)*p.radius*1.6,sy=surfaceAt(terrain,x),loop=(p.age*.8+i*.17)%1
    g.lineStyle(1.5,0xb0f76d,alpha*(1-loop)*.8);g.strokeCircle(x,sy-2-(reduced?0:loop*7),2+loop*3)
    if(!reduced&&p.age<.65){const t=p.age/.65,dx=(i-3)*t*15;g.fillStyle(0x92f244,1-t);g.fillEllipse(p.x+dx,y-Math.sin(t*Math.PI)*(15+i%3*9),4,6)}
   }
  }
 }
 drawShip(g:Phaser.GameObjects.Graphics,id:number,poisoned:boolean,time:number,reduced:boolean){
  const r=this.reactions.get(id)
  if(r&&r.age<.15){g.fillStyle(0xffffff,(1-r.age/.15)*.6);g.fillEllipse(0,0,53,20);g.fillEllipse(0,-9,30,23)}
  const effect=poisoned?'poison':r?.effect,age=r?.age??0
  if(effect==='poison'){g.fillStyle(0x9de837,.8);for(let i=0;i<3;i++){const t=reduced?.3:(time*1.5+i*.31)%1;g.fillEllipse(-17+i*16,5+t*9,2,3+t*2)}}
  if(effect==='electric'&&age<.6){g.lineStyle(1,0xa7faff,(1-age/.6)*.9);g.beginPath();g.moveTo(-25,0);g.lineTo(-12,-7);g.lineTo(-4,3);g.lineTo(7,-5);g.lineTo(22,2);g.strokePath()}
  if(effect==='fire'&&age<2.4){for(let i=0;i<3;i++){const h=10+(reduced?0:Math.sin(time*18+i*2)*3),x=-15+i*15;g.fillStyle(0xff7f39,.8*(1-age/2.4));g.fillTriangle(x-4,3,x+2,-h,x+5,3);g.fillStyle(0xffe8a0,.9*(1-age/2.4));g.fillTriangle(x-2,3,x+1,-h*.5,x+3,3)}}
  // Small exhaust stays under the hull and never crosses the aim line.
  if(!reduced){g.fillStyle(0x77e9ff,.12);g.fillEllipse(-9,12,4,3+Math.sin(time*8+id)*2);g.fillEllipse(9,12,4,3+Math.sin(time*8+id)*2)}
 }
}
