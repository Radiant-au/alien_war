import Phaser from 'phaser'
import { explosionDamage, surfaceAt, type Player, type Terrain } from '../game/terrain.ts'

export const CRYO_SECONDS=2.5
export function cryoEnvelope(age:number){
  return {spread:Math.min(1,Math.max(0,age/.24)),alpha:Math.min(1,Math.max(0,age/.12),Math.max(0,(CRYO_SECONDS-age)/.55)),thaw:Math.min(1,Math.max(0,(age-1.95)/.55))}
}
interface Frost {x:number;y:number;radius:number;age:number;spike:Phaser.GameObjects.Image}
/** Presentation only: no health, movement, terrain or turn mutations. */
export class CryoEffect {
  private scene:Phaser.Scene
  private graphics:Phaser.GameObjects.Graphics
  private patches:Frost[]=[]
  private ships=new Map<number,number>()
  constructor(scene:Phaser.Scene){this.scene=scene;this.graphics=scene.add.graphics().setDepth(3);scene.events.once(Phaser.Scenes.Events.SHUTDOWN,()=>this.destroy())}
  clear(){for(const p of this.patches)p.spike.destroy();this.patches=[];this.ships.clear();this.graphics.clear()}
  impact(players:Player[],x:number,y:number,radius:number){
    const spike=this.scene.add.image(x,y,'cryo-spikes').setOrigin(.5,1).setDepth(2).setAlpha(0)
    this.patches.push({x,y,radius,age:0,spike})
    if(this.patches.length>8)this.patches.shift()!.spike.destroy()
    for(const player of players)if(player.health>0&&explosionDamage(player,x,y,radius,100)>0)this.ships.set(player.id,0)
  }
  update(dt:number,terrain:Terrain,reduced:boolean){
    this.patches=this.patches.filter(p=>{
      p.age+=dt
      if(p.age>=3){p.spike.destroy();return false}
      const rise=Math.min(1,p.age/.3),eased=1-(1-rise)**3
      const width=p.radius*2.3,height=width*p.spike.texture.getSourceImage().height/p.spike.texture.getSourceImage().width
      p.spike.setPosition(p.x,surfaceAt(terrain,p.x)+2)
      p.spike.setDisplaySize(width,height*(reduced?1:Math.max(.01,eased)))
      p.spike.setAlpha(Math.min(1,p.age/.08)*Math.max(0,Math.min(1,(3-p.age)/1.2)))
      return true
    })
    for(const [id,age] of this.ships){if(age+dt>=CRYO_SECONDS)this.ships.delete(id);else this.ships.set(id,age+dt)}
    const g=this.graphics;g.clear()
    for(const p of this.patches){
      const e=cryoEnvelope(p.age),width=p.radius*1.3*e.spread,ground=surfaceAt(terrain,p.x)
      // Re-sample every frame: the thin frost ribbon follows newly carved terrain too.
      g.fillStyle(0x99edff,.25*e.alpha);g.lineStyle(2,0xc4faff,.85*e.alpha)
      g.beginPath()
      for(let i=0;i<=24;i++){const x=p.x-width+i*width/12,y=surfaceAt(terrain,x)-1;if(i===0)g.moveTo(x,y);else g.lineTo(x,y)}
      g.strokePath()
      for(let i=24;i>=0;i--){const x=p.x-width+i*width/12;g.lineTo(x,surfaceAt(terrain,x)+5)}
      g.closePath();g.fillPath()
      for(let i=0;i<9;i++){
        const x=p.x+(i/8-.5)*width*2,y=surfaceAt(terrain,x),h=3+(i%3)*2
        g.lineStyle(1,0xe1fcff,.8*e.alpha);g.beginPath();g.moveTo(x-3,y);g.lineTo(x,y-h);g.lineTo(x+3,y);g.strokePath()
        g.beginPath();g.moveTo(x-4,y+2);g.lineTo(x+2,y+4);g.lineTo(x+6,y+2);g.strokePath()
      }
      if(p.age<.32){
        const t=p.age/.32,a=(1-t)*(reduced?.3:1)
        g.lineStyle(2,0xe7ffff,a);g.strokeEllipse(p.x,p.y,12+t*p.radius*1.6,5+t*p.radius*.35)
        for(let i=0;i<6;i++){const angle=i*Math.PI/3;const inner=4+t*12,outer=inner+12*(1-t);g.beginPath();g.moveTo(p.x+Math.cos(angle)*inner,p.y+Math.sin(angle)*inner);g.lineTo(p.x+Math.cos(angle)*outer,p.y+Math.sin(angle)*outer);g.strokePath()}
      }
      if(!reduced)for(let i=0;i<7;i++){
        const t=(p.age*.65+i*.137)%1,x=p.x+(i/6-.5)*p.radius*2,y=surfaceAt(terrain,x)-5-t*20
        g.fillStyle(0xb7f4ff,e.alpha*(1-t)*.25);g.fillEllipse(x,y,12+t*12,4+t*3)
      }
      // Small ice fragments accompany the large sprite as it emerges.
      if(!reduced&&p.age<.6)for(let i=0;i<5;i++){
        const t=p.age/.6,x=p.x+(i-2)*(7+t*12),y=ground-8-Math.sin(t*Math.PI)*24-i%2*5
        g.fillStyle(0xc6faff,(1-t)*.9);g.fillTriangle(x-2,y,x,y-5,x+3,y+1)
      }
    }
  }
  /** Called inside the exact hull transform so coating follows bob, slope and recoil. */
  drawShip(g:Phaser.GameObjects.Graphics,id:number,reduced:boolean){
    const age=this.ships.get(id);if(age===undefined)return
    const e=cryoEnvelope(age),a=e.alpha
    g.fillStyle(0x9beaff,a*.25);g.fillEllipse(0,1,55,20);g.fillEllipse(0,-8,32,25)
    g.lineStyle(1,0xd5ffff,a*.95);g.strokeEllipse(0,1,55,20);g.strokeEllipse(0,-8,32,25)
    // Crystal facets, with brighter separating cracks during the thaw.
    g.lineStyle(.8,0xffffff,a*(.35+e.thaw*.65))
    for(const points of [[-24,0,-13,-4,-5,4,5,0,15,5,25,1],[-9,-17,-3,-10,-7,-3,1,6],[7,-18,10,-9,5,-3,12,8]]){
      g.beginPath();g.moveTo(points[0],points[1]);for(let i=2;i<points.length;i+=2)g.lineTo(points[i],points[i+1]);g.strokePath()
    }
    g.lineStyle(1,0xd9ffff,a)
    for(let i=0;i<3;i++){const angle=i*Math.PI/3;g.beginPath();g.moveTo(Math.cos(angle)*-4,-29+Math.sin(angle)*-4);g.lineTo(Math.cos(angle)*4,-29+Math.sin(angle)*4);g.strokePath()}
    if(e.thaw>0&&!reduced)for(let i=0;i<5;i++){
      const x=(i-2)*(8+e.thaw*7),y=-8+e.thaw*(i%2?12:-16)
      g.fillStyle(0xd0faff,a*.8);g.fillTriangle(x-1,y,x+1,y-3,x+2,y+1)
    }
  }
  destroy(){this.clear();this.graphics.destroy()}
}
