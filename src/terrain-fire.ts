import type Phaser from 'phaser'
import type { Terrain } from './terrain.ts'
import { BURN_SECONDS, SCORCH_SECONDS, MAX_BURN_PATCHES, burnStrength, scorchStrength, burnSupported, createBurnPatch, type BurnPatch } from './terrain-burn.ts'

interface Flame { sprite:Phaser.GameObjects.Image; glow:Phaser.GameObjects.Image; index:number; phase:number; height:number }
interface FirePatch { burn:BurnPatch; flames:Flame[] }
const TEXTURE='terrain-flame-loop'
const FRAMES=32

/** Gradient tongues have independent periodic turbulence for a seamless baked loop. */
function createFlameTexture(scene:Phaser.Scene){
  if(scene.textures.exists(TEXTURE))return
  const canvas=document.createElement('canvas');canvas.width=64*FRAMES;canvas.height=96
  const ctx=canvas.getContext('2d')!
  for(let i=0;i<FRAMES;i++){
    const phase=i/FRAMES*Math.PI*2
    ctx.save();ctx.translate(i*64,0)
    const outer=ctx.createLinearGradient(0,90,0,8)
    outer.addColorStop(0,'#fff0a3');outer.addColorStop(.24,'#ffc35c')
    outer.addColorStop(.62,'#ff913d');outer.addColorStop(1,'rgba(245,82,35,0)')
    // Several narrow, independently moving tongues read as fire rather than one icon.
    for(let j=0;j<3;j++){
      const x=22+j*10,h=44+j%2*30+Math.sin(phase*2+j*2)*7
      const sway=Math.sin(phase+j*2)*6+Math.sin(phase*3+j)*2
      ctx.fillStyle=outer;ctx.shadowColor='#ff7d32';ctx.shadowBlur=3
      ctx.beginPath();ctx.moveTo(x-10,90)
      ctx.bezierCurveTo(x-16,73,x-5+sway,90-h*.65,x+sway,90-h)
      ctx.bezierCurveTo(x-4+sway,90-h*.5,x+18,75,x+9,90)
      ctx.closePath();ctx.fill()
    }
    ctx.shadowBlur=0
    const core=ctx.createLinearGradient(0,90,0,43)
    core.addColorStop(0,'#fffbea');core.addColorStop(.3,'#ffe9a0')
    core.addColorStop(1,'rgba(255,181,70,0)');ctx.fillStyle=core
    const sway=Math.sin(phase*2)*4
    ctx.beginPath();ctx.moveTo(20,90)
    ctx.bezierCurveTo(17,77,30+sway,69,31+sway,45)
    ctx.bezierCurveTo(37,66,49,79,44,90);ctx.closePath();ctx.fill()
    ctx.restore()
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
    this.update(0,terrain)
  }
  update(dt:number,terrain:Terrain){
    this.ground.clear();this.air.clear()
    for(let n=this.patches.length-1;n>=0;n--){
      const patch=this.patches[n],burn=patch.burn;burn.age+=dt
      if(burn.age>=SCORCH_SECONDS){this.remove(patch);this.patches.splice(n,1);continue}
      // A short upward fire bloom replaces the old raster explosion completely.
      if(!this.reducedMotion&&burn.age<.55){
        const t=burn.age/.55,origin=burn.points[Math.floor(burn.points.length/2)]
        if(burnSupported(terrain,origin))for(let i=0;i<11;i++){
          const angle=Math.PI+(i+.5)/11*Math.PI
          const distance=burn.radius*t*(.55+(i%3)*.15)
          this.air.fillStyle(i%3?0xffa13c:0xffe9ad,(1-t)*.7)
          this.air.fillCircle(origin.x+Math.cos(angle)*distance,origin.y+Math.sin(angle)*distance,
            (4+(i%3)*2)*(1-t)+1)
        }
      }
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
        const flicker=this.reducedMotion?1:1+Math.sin(time*11+f.phase)*.07
        const scale=heat*flicker
        f.sprite.setFrame(this.reducedMotion?3:Math.floor(time*32+f.phase*5)%FRAMES)
        f.sprite.setRotation(this.reducedMotion?0:Math.sin(time*5+f.phase)*.045)
        f.sprite.setDisplaySize(f.height*.62*scale,f.height*scale).setAlpha(Math.min(1,heat*2))
        f.glow.setDisplaySize(f.height*2.1*scale,f.height*1.4*scale).setAlpha(.25*heat)
        if(this.reducedMotion)continue
        // Analytic particle cycles keep smoke/embers bounded without per-frame allocations.
        for(let i=0;i<2;i++){
          const life=((burn.age*.65+f.phase*.13+i*.5)%1+1)%1
          const drift=Math.sin(f.phase+i)*life*19
          this.air.fillStyle(0x202a40,(1-life)*.18*heat)
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
