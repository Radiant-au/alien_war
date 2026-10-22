import type Phaser from 'phaser'
import type { Terrain } from './terrain.ts'
import { BURN_SECONDS, SCORCH_SECONDS, MAX_BURN_PATCHES, burnStrength, scorchStrength, burnSupported, createBurnPatch, type BurnPatch } from './terrain-burn.ts'

interface Flame { sprite:Phaser.GameObjects.Image; glow:Phaser.GameObjects.Image; index:number; phase:number; height:number }
interface FirePatch { burn:BurnPatch; flames:Flame[] }
const TEXTURE='terrain-flame-loop'
const FRAMES=12

/** Small reusable cartoon flame frames, generated locally with no asset download. */
function createFlameTexture(scene:Phaser.Scene){
  if(scene.textures.exists(TEXTURE))return
  const canvas=document.createElement('canvas');canvas.width=64*FRAMES;canvas.height=96
  const ctx=canvas.getContext('2d')!
  for(let i=0;i<FRAMES;i++){
    const phase=i/FRAMES*Math.PI*2,sway=Math.sin(phase)*7,tip=8+Math.cos(phase)*4
    ctx.save();ctx.translate(i*64,0)
    ctx.fillStyle='#ff5926';ctx.beginPath();ctx.moveTo(32,90)
    ctx.bezierCurveTo(5,91,8,68,17,51);ctx.quadraticCurveTo(15,66,25,64)
    ctx.bezierCurveTo(17,42,32+sway,31,38+sway,tip)
    ctx.bezierCurveTo(33+sway,42,55,49,49,68);ctx.quadraticCurveTo(62,91,32,90);ctx.fill()
    ctx.fillStyle='#ffab27';ctx.beginPath();ctx.moveTo(32,89)
    ctx.bezierCurveTo(15,87,20,68,29,57);ctx.quadraticCurveTo(25,68,34,65)
    ctx.quadraticCurveTo(40+sway*.4,52,38+sway*.4,43)
    ctx.bezierCurveTo(53,69,50,88,32,89);ctx.fill()
    ctx.fillStyle='#ffe77a';ctx.beginPath();ctx.moveTo(32,89)
    ctx.bezierCurveTo(24,86,28,77,34,69);ctx.quadraticCurveTo(32,79,39,78)
    ctx.quadraticCurveTo(44,89,32,89);ctx.fill();ctx.restore()
  }
  const texture=scene.textures.addCanvas(TEXTURE,canvas)!
  for(let i=0;i<FRAMES;i++)texture.add(i,0,i*64,0,64,96)
}

/** Bounded cosmetic effects; no collision, health, or turn-state mutations. */
export class TerrainFire {
  private patches:FirePatch[]=[]
  private ground:Phaser.GameObjects.Graphics
  private air:Phaser.GameObjects.Graphics
  private scene:Phaser.Scene
  private reducedMotion:boolean
  constructor(scene:Phaser.Scene,reducedMotion:boolean){
    this.scene=scene;this.reducedMotion=reducedMotion
    createFlameTexture(scene)
    this.ground=scene.add.graphics().setDepth(1.5)
    this.air=scene.add.graphics().setDepth(2.5)
  }
  add(terrain:Terrain,x:number,radius:number){
    if(this.patches.length>=MAX_BURN_PATCHES)this.remove(this.patches.shift()!)
    const burn=createBurnPatch(terrain,x,radius)
    const count=Math.max(5,Math.min(9,Math.round(radius/12)))
    const flames=Array.from({length:count},(_,i)=>{
      const index=Math.round((i+.5)/count*(burn.points.length-1)),point=burn.points[index]
      const phase=i*2.399+point.x*.017,height=29+(Math.sin(phase)+1)*12
      const sprite=this.scene.add.image(point.x,point.y+2,TEXTURE,0).setOrigin(.5,90/96).setDepth(2.2)
      const glow=this.scene.add.image(point.x,point.y-7,'halo').setTint(0xff7926).setDepth(1.6).setBlendMode(1)
      return {sprite,glow,index,phase,height}
    })
    this.patches.push({burn,flames})
  }
  update(dt:number,terrain:Terrain){
    this.ground.clear();this.air.clear()
    for(let n=this.patches.length-1;n>=0;n--){
      const patch=this.patches[n],burn=patch.burn;burn.age+=dt
      if(burn.age>=SCORCH_SECONDS){this.remove(patch);this.patches.splice(n,1);continue}
      const heat=burnStrength(burn.age),scorch=scorchStrength(burn.age),g=this.ground
      // Short separate strips avoid bridging gaps where subsequent shots removed fuel.
      for(let i=1;i<burn.points.length;i++){
        const a=burn.points[i-1],b=burn.points[i]
        if(!burnSupported(terrain,a)||!burnSupported(terrain,b))continue
        g.fillStyle(0x111729,.86*scorch)
        g.beginPath();g.moveTo(a.x,a.y);g.lineTo(b.x,b.y);g.lineTo(b.x,b.y+9);g.lineTo(a.x,a.y+9);g.closePath();g.fillPath()
        if(i%2===0){
          g.lineStyle(1.3,0xff8a32,heat*.75);g.lineBetween(a.x,a.y+2,b.x,b.y+4)
          g.lineBetween(b.x,b.y+4,b.x-2,b.y+7)
        }
      }
      for(const f of patch.flames){
        const p=burn.points[f.index],alive=heat>0&&burnSupported(terrain,p)
        f.sprite.setVisible(alive);f.glow.setVisible(alive)
        if(!alive)continue
        const time=this.reducedMotion?f.phase:burn.age
        const flicker=this.reducedMotion?1:1+Math.sin(time*13+f.phase)*.07
        const scale=heat*flicker
        f.sprite.setFrame(this.reducedMotion?3:Math.floor(time*14+f.phase*2)%FRAMES)
        f.sprite.setDisplaySize(f.height*.62*scale,f.height*scale).setAlpha(Math.min(1,heat*2))
        f.glow.setDisplaySize(f.height*2.1*scale,f.height*1.4*scale).setAlpha(.25*heat)
        if(this.reducedMotion)continue
        // Analytic particle cycles keep smoke/embers bounded without per-frame allocations.
        for(let i=0;i<2;i++){
          const life=((burn.age*.65+f.phase*.13+i*.5)%1+1)%1
          const start=Math.floor((burn.age*.65+f.phase*.13+i*.5))/.65
          if(start>BURN_SECONDS-1.5)continue
          const drift=Math.sin(f.phase+i)*life*19
          this.air.fillStyle(0x252239,(1-life)*.16*heat)
          this.air.fillCircle(p.x+drift,p.y-12-life*65,5+life*12)
          this.air.fillStyle(i?0xffc34d:0xff782a,(1-life)*heat)
          this.air.fillCircle(p.x+drift*1.3,p.y-7-life*53,1.5*(1-life)+.4)
        }
      }
      if(burn.age>=BURN_SECONDS&&patch.flames.length){
        for(const f of patch.flames){f.sprite.destroy();f.glow.destroy()}
        patch.flames=[]
      }
    }
  }
  private remove(patch:FirePatch){for(const f of patch.flames){f.sprite.destroy();f.glow.destroy()}}
  clear(){for(const patch of this.patches)this.remove(patch);this.patches=[];this.ground.clear();this.air.clear()}
  destroy(){this.clear();this.ground.destroy();this.air.destroy()}
}
