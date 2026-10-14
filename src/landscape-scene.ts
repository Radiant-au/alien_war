import Phaser from 'phaser'
import { PLAYER_HEIGHT, WORLD_WIDTH } from './config.ts'
import { createMatch, fire, overviewScrollX, overviewZoom, resolveShot, updateMatch, type Match } from './match.ts'
import { createShot, STEP_SECONDS, stepShot, trajectory } from './projectile.ts'
import { surfaceAt, type Player } from './terrain.ts'
import { SPELLS, type Spell } from './spells.ts'

export interface BattleHud { match:Match; spell:number }
interface Crystal { x:number;y:number;color:number;size:number }

export class LandscapeScene extends Phaser.Scene {
  match=createMatch()
  selectedSpell=0
  private shotSpell:Spell=SPELLS[0]
  private terrainTexture?:Phaser.Textures.CanvasTexture
  private terrainCanvas!:HTMLCanvasElement
  private actors!:Phaser.GameObjects.Graphics
  private keys=new Set<string>()
  private held=new Map<number,-1|1>()
  private crystalGlows:Phaser.GameObjects.Image[]=[]
  private crystals:Crystal[]=[]
  private particles:Phaser.GameObjects.GameObject[]=[]
  private revision=-1
  private elapsed=0
  private stepAccumulator=0
  private moving=[false,false]
  private walk=[0,0]
  private previousX=[0,0]
  private trail:{x:number;y:number}[]=[]
  private baseScrollY=0
  private hud:(hud:BattleHud)=>void=()=>{}
  private resizeObserver?:ResizeObserver
  private reducedMotion=window.matchMedia('(prefers-reduced-motion: reduce)').matches
  constructor(){super('battlefield')}
  setHud(callback:(hud:BattleHud)=>void){this.hud=callback}
  create(){
    const halo=document.createElement('canvas');halo.width=halo.height=128
    const ctx=halo.getContext('2d')!,gradient=ctx.createRadialGradient(64,64,0,64,64,64)
    gradient.addColorStop(0,'rgba(255,255,255,.65)');gradient.addColorStop(.25,'rgba(255,255,255,.20)');gradient.addColorStop(1,'rgba(255,255,255,0)')
    ctx.fillStyle=gradient;ctx.fillRect(0,0,128,128);this.textures.addCanvas('halo',halo)
    this.terrainCanvas=document.createElement('canvas');this.terrainCanvas.width=WORLD_WIDTH;this.terrainCanvas.height=1600
    this.terrainTexture=this.textures.addCanvas('battle-terrain',this.terrainCanvas)!
    this.add.image(0,0,'battle-terrain').setOrigin(0).setDepth(0)
    this.actors=this.add.graphics().setDepth(3)
    window.addEventListener('keydown',this.keyDown);window.addEventListener('keyup',this.keyUp)
    this.cameras.main.setOrigin(0,0)
    this.generateCrystals();this.drawTerrain();this.resizeView()
    this.scale.on(Phaser.Scale.Events.RESIZE,this.resizeView,this)
    this.resizeObserver=new ResizeObserver(()=>this.resizeView());this.resizeObserver.observe(document.querySelector('.command-bar')!)
    this.previousX=this.match.players.map(p=>p.x)
    window.addEventListener('blur',this.clearInputs);window.addEventListener('pointerup',this.releasePointer);window.addEventListener('pointercancel',this.releasePointer)
    document.addEventListener('visibilitychange',this.visibility)
    this.events.once(Phaser.Scenes.Events.SHUTDOWN,()=>{
      window.removeEventListener('keydown',this.keyDown);window.removeEventListener('keyup',this.keyUp)
      this.resizeObserver?.disconnect();this.scale.off(Phaser.Scale.Events.RESIZE,this.resizeView,this)
      window.removeEventListener('blur',this.clearInputs);window.removeEventListener('pointerup',this.releasePointer);window.removeEventListener('pointercancel',this.releasePointer);document.removeEventListener('visibilitychange',this.visibility)
    })
  }
  selectSpell(index:number){if(this.match.phase==='MovementAiming')this.selectedSpell=Math.max(0,Math.min(SPELLS.length-1,index))}
  aim(elevation:number,power:number){
    if(this.match.phase!=='MovementAiming')return
    const player=this.match.players[this.match.active],angle=-elevation*Math.PI/180
    player.aimAngle=player.id===0?angle:Math.PI-angle;player.power=power/100
  }
  hold(pointer:number,axis:-1|1){if(this.match.phase==='MovementAiming')this.held.set(pointer,axis)}
  private releasePointer=(e:PointerEvent)=>{this.held.delete(e.pointerId)}
  private visibility=()=>{if(document.hidden)this.clearInputs()}
  private keyDown=(event:KeyboardEvent)=>{
    if(event.target instanceof HTMLInputElement)return
    if(['KeyA','KeyD','ArrowLeft','ArrowRight'].includes(event.code)){
      event.preventDefault();this.keys.add(event.code)
    }
  }
  private keyUp=(event:KeyboardEvent)=>{this.keys.delete(event.code)}
  private clearInputs=()=>{this.held.clear();this.keys.clear()}
  cast(){if(fire(this.match)){this.shotSpell=SPELLS[this.selectedSpell];this.trail=[];this.clearInputs()}}
  restart(){
    this.clearInputs();this.match=createMatch(Math.floor(Math.random()*0xffffffff));this.revision=-1;this.stepAccumulator=0;this.trail=[];this.walk=[0,0]
    this.previousX=this.match.players.map(p=>p.x);for(const p of this.particles){this.tweens.killTweensOf(p);p.destroy()}this.particles=[]
    if(this.actors){this.generateCrystals();this.drawTerrain();this.resizeView()}
  }
  private resizeView=()=>{
    if(!this.actors)return
    const height=this.scale.height-document.querySelector('.command-bar')!.getBoundingClientRect().height
    this.cameras.main.setViewport(0,0,this.scale.width,Math.max(1,height))
    this.match.viewWidth=960;this.match.cameraZoom=overviewZoom(this.match.players,960)
    this.match.cameraX=overviewScrollX(this.match.players,this.match.cameraZoom,960)
    this.match.cameraFromX=this.match.cameraToX=this.match.cameraX
    const zoom=this.scale.width/960*this.match.cameraZoom
    this.cameras.main.setZoom(zoom)
    this.baseScrollY=370-height*.65/zoom
    this.cameras.main.setScroll(this.match.cameraX,this.baseScrollY)
  }
  private positionCamera(){
    // Preserve vertical visibility for a high projectile without moving the sky layer.
    const cam=this.cameras.main,shot=this.match.shot
    let y=this.baseScrollY
    if(shot&&shot.y<y+70/cam.zoom)y=shot.y-70/cam.zoom
    cam.setScroll(this.match.cameraX,Phaser.Math.Linear(cam.scrollY,y,.08))
  }
  private generateCrystals(){
    for(const glow of this.crystalGlows){this.tweens.killTweensOf(glow);glow.destroy()}
    this.crystalGlows=[];this.crystals=[]
    for(let i=0;i<7;i++){
      const x=WORLD_WIDTH*(.06+i*.145),y=surfaceAt(this.match.terrain,x)+60+(i%3)*24,color=i%2?0xb45cf5:0x39daff
      this.crystals.push({x,y,color,size:12+(i%3)*3})
      const glow=this.add.image(x,y,'halo').setTint(color).setDisplaySize(120,120).setAlpha(.35).setDepth(1)
      this.crystalGlows.push(glow)
      if(!this.reducedMotion)this.tweens.add({targets:glow,alpha:.55,duration:1800+i*170,yoyo:true,repeat:-1,ease:'Sine.easeInOut'})
    }
  }
  private drawTerrain(){
    const ctx=this.terrainCanvas.getContext('2d')!,terrain=this.match.terrain
    ctx.clearRect(0,0,WORLD_WIDTH,1600)
    const path=()=>{ctx.beginPath();ctx.moveTo(0,1600);for(let x=0;x<=WORLD_WIDTH;x++)ctx.lineTo(x,terrain.heights[x]);ctx.lineTo(WORLD_WIDTH,1600);ctx.closePath()}
    path();const soil=ctx.createLinearGradient(0,280,0,650);soil.addColorStop(0,'#286367');soil.addColorStop(.45,'#1b4154');soil.addColorStop(1,'#101b35');ctx.fillStyle=soil;ctx.fill()
    ctx.save();path();ctx.clip();let seed=terrain.decorationSeed
    const random=()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296}
    for(let i=0;i<900;i++){
      const x=random()*WORLD_WIDTH,y=280+random()*600;ctx.fillStyle='#092c3c55';ctx.beginPath();ctx.arc(x,y,1+random()*2,0,Math.PI*2);ctx.fill()
    }
    for(let i=0;i<48;i++){
      const x=random()*WORLD_WIDTH,y=terrain.initialHeights[Math.round(x)]+25+random()*200,r=4+random()*12
      const points=Array.from({length:5},(_,j)=>[x+Math.cos(j*Math.PI*2/5)*r,y+Math.sin(j*Math.PI*2/5)*r*.8])
      this.polygon(ctx,points,i%2?'#2b3d57':'#355369');this.polygon(ctx,[points[0],points[1],[x,y]],'#ffffff0b')
    }
    this.crystals.forEach((item,i)=>{
      const alive=item.y-26>=surfaceAt(terrain,item.x)
      this.crystalGlows[i].setVisible(alive)
      if(!alive)return
      for(const [dx,dy,size]of [[0,0,1],[-15,12,.55],[16,10,.55],[0,27,.35]]){
        const x=item.x+dx,y=item.y+dy,r=item.size*size,h=r*1.7
        this.polygon(ctx,[[x,y-h],[x+r,y],[x,y+h],[x-r,y]],'#'+item.color.toString(16))
        this.polygon(ctx,[[x,y-h],[x+r,y],[x,y]],'#ffffff35')
      }
    });ctx.restore()
    // Only original supported surface retains grass; crater walls expose bare earth.
    ctx.strokeStyle='#89bc70';ctx.lineWidth=4;ctx.lineJoin='round';ctx.beginPath();let drawing=false
    for(let x=0;x<=WORLD_WIDTH;x++){
      if(terrain.heights[x]>terrain.initialHeights[x]+.5){drawing=false;continue}
      if(!drawing){ctx.moveTo(x,terrain.heights[x]);drawing=true}else ctx.lineTo(x,terrain.heights[x])
    }ctx.stroke()
    for(let x=22;x<WORLD_WIDTH;x+=62){
      if(terrain.heights[x]>terrain.initialHeights[x]+.5)continue
      const y=terrain.heights[x],slope=Math.atan2(surfaceAt(terrain,x+2)-surfaceAt(terrain,x-2),4)
      ctx.save();ctx.translate(x,y);ctx.rotate(slope);ctx.strokeStyle='#78a760';ctx.lineWidth=2
      for(const dx of[-6,0,6]){ctx.beginPath();ctx.moveTo(dx,0);ctx.lineTo(dx*1.3,-7-(x%5));ctx.stroke()}
      if(x%186===22){ctx.strokeStyle='#729855';ctx.beginPath();ctx.moveTo(0,0);ctx.lineTo(0,-16);ctx.stroke();for(let j=0;j<5;j++){const a=j*Math.PI*2/5;ctx.fillStyle='#f2f2dd';ctx.beginPath();ctx.arc(Math.cos(a)*4,-18+Math.sin(a)*4,2.5,0,Math.PI*2);ctx.fill()}ctx.fillStyle='#ffcb64';ctx.beginPath();ctx.arc(0,-18,2,0,Math.PI*2);ctx.fill()}
      ctx.restore()
    }
    this.terrainTexture!.refresh();this.revision=terrain.revision
  }
  private polygon(ctx:CanvasRenderingContext2D,points:number[][],color:string){ctx.beginPath();points.forEach(([x,y],i)=>i?ctx.lineTo(x,y):ctx.moveTo(x,y));ctx.closePath();ctx.fillStyle=color;ctx.fill()}
  update(_time:number,delta:number){
    this.elapsed+=Math.min(delta,100)/1000
    this.stepAccumulator=Math.min(this.stepAccumulator+Math.min(delta,100)/1000,STEP_SECONDS*12)
    const editing=document.activeElement instanceof HTMLInputElement
    const left=(!editing&&(this.keys.has('KeyA')||this.keys.has('ArrowLeft')))||[...this.held.values()].includes(-1)
    const right=(!editing&&(this.keys.has('KeyD')||this.keys.has('ArrowRight')))||[...this.held.values()].includes(1)
    const axis=left===right?0:left?-1:1
    const beforePhase=this.match.phase
    while(this.stepAccumulator>=STEP_SECONDS){
      if(this.match.phase==='ProjectileFlight'&&this.match.shot){
        const result=stepShot(this.match.shot,this.match.terrain,this.match.players)
        if(result){resolveShot(this.match,result,this.shotSpell);if(result.kind==='impact')this.impact(result.x,result.y,this.shotSpell);this.trail=[]}
      }
      updateMatch(this.match,STEP_SECONDS,axis);this.stepAccumulator-=STEP_SECONDS
    }
    if(beforePhase!==this.match.phase)this.clearInputs()
    this.match.players.forEach((p,i)=>{this.moving[i]=Math.abs(p.x-this.previousX[i])>.001;this.walk[i]+=Math.abs(p.x-this.previousX[i])*.2;this.previousX[i]=p.x})
    if(this.revision!==this.match.terrain.revision)this.drawTerrain()
    if(this.match.shot){this.trail.push({x:this.match.shot.x,y:this.match.shot.y});if(this.trail.length>18)this.trail.shift()}
    if(this.match.phase==='MovementAiming'){
      this.match.cameraZoom=overviewZoom(this.match.players,this.match.viewWidth)
      this.cameras.main.setZoom(this.scale.width/960*this.match.cameraZoom)
      this.baseScrollY=370-this.cameras.main.height*.65/this.cameras.main.zoom
    }
    this.positionCamera();this.drawActors();this.hud({match:this.match,spell:this.selectedSpell})
  }
  private drawWizard(p:Player){
    const g=this.actors,feet=p.y+PLAYER_HEIGHT/2,color=p.id===0?0x39cce8:0xf1a34b
    const bob=this.reducedMotion?0:(this.moving[p.id]?Math.sin(this.walk[p.id])*1.4:Math.sin(this.elapsed*2+p.id)*.6)
    const y=feet-24+bob,x=p.x,dir=p.id===0?1:-1
    g.fillStyle(0x08162b,.28);g.fillEllipse(x,feet,40,8)
    g.lineStyle(5,0x183052);g.lineBetween(x-7,y+17,x-8+(this.moving[p.id]?Math.sin(this.walk[p.id])*4:0),feet-2);g.lineBetween(x+7,y+17,x+8-(this.moving[p.id]?Math.sin(this.walk[p.id])*4:0),feet-2)
    g.fillStyle(color);g.fillTriangle(x,y-5,x-20,y+21,x+18,y+21)
    g.fillStyle(p.id===0?0x1689b8:0xc46a37);g.fillTriangle(x-3,y-2,x-18,y+21,x-4,y+21)
    g.fillStyle(0xffe0b9);g.fillCircle(x,y-8,10)
    g.fillStyle(0x152444);g.fillCircle(x+dir*3,y-9,1.8);g.fillCircle(x-dir*4,y-9,1.8)
    g.fillStyle(p.id===0?0x2dbadc:0xed973e);g.fillTriangle(x-15,y-17,x+12,y-17,x-dir*7,y-41)
    g.fillEllipse(x,y-17,44,8);g.lineStyle(2,p.id===0?0x97f2ff:0xffdb91);g.lineBetween(x-dir*5,y-34,x-dir*9,y-23)
    g.lineStyle(4,0x293949);g.lineBetween(x+dir*22,y+16,x+dir*28,y-22)
    g.fillStyle(0xffe0b9);g.fillCircle(x+dir*23,y+4,4)
    g.fillStyle(p.id===0?0x39daff:0xffc36a,.12);g.fillCircle(x+dir*28,y-24,13)
    g.fillStyle(p.id===0?0x80efff:0xffce79);g.fillCircle(x+dir*28,y-24,6)
    if(p.id===this.match.active&&this.match.phase==='MovementAiming'){
      g.fillStyle(0xc8fff0,.9);g.fillTriangle(x-5,y-54,x+5,y-54,x,y-48)
    }
  }
  private drawActors(){
    const g=this.actors;g.clear()
    for(const p of this.match.players)this.drawWizard(p)
    if(this.match.phase==='MovementAiming'){
      g.fillStyle(SPELLS[this.selectedSpell].color,.65)
      for(const point of trajectory(createShot(this.match.players[this.match.active]),this.match.terrain,this.match.players,1.5))g.fillCircle(point.x,point.y,2)
    }
    if(this.match.shot){
      this.trail.forEach((point,i)=>{g.fillStyle(this.shotSpell.color,i/this.trail.length*.5);g.fillCircle(point.x,point.y,2+i/this.trail.length*3)})
      const {x,y}=this.match.shot;g.fillStyle(this.shotSpell.color,.16);g.fillCircle(x,y,13)
      g.fillStyle(this.shotSpell.color);if(this.shotSpell===SPELLS[3])g.fillTriangle(x,y-9,x-5,y+5,x+5,y+5);else g.fillCircle(x,y,5)
      g.fillStyle(0xf5ffff);g.fillCircle(x,y,2)
    }
  }
  private impact(x:number,y:number,spell:Spell){
    if(!this.reducedMotion)this.cameras.main.shake(150,.0025)
    const burst=this.add.graphics().setPosition(x,y).setDepth(4)
    burst.fillStyle(spell.color,.25);burst.fillCircle(0,0,spell.radius*.6);burst.lineStyle(3,spell.color,.9);burst.strokeCircle(0,0,spell.radius*.6)
    this.animateEffect(burst,{scale:1.7,alpha:0,duration:550})
    for(let i=0;i<16;i++){
      const a=i*Math.PI*2/16,length=spell.radius*(.65+Math.random()*.7)
      const particle=this.add.graphics().setPosition(x,y).setDepth(4);particle.fillStyle(spell.color)
      if(spell===SPELLS[3])particle.fillTriangle(0,-5,-3,3,3,3);else particle.fillCircle(0,0,spell===SPELLS[1]?3:2)
      this.animateEffect(particle,{x:x+Math.cos(a)*length,y:y+Math.sin(a)*length,alpha:0,angle:120,duration:450+Math.random()*250})
    }
  }
  private animateEffect(target:Phaser.GameObjects.Graphics,options:Record<string,unknown>){
    this.particles.push(target);this.tweens.add({targets:target,...options,onComplete:()=>{this.particles=this.particles.filter(p=>p!==target);target.destroy()}})
  }
}
