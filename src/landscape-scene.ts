import Phaser from 'phaser'
import { aimFeedbackAlpha, dragAim } from './aim.ts'
import { WORLD_WIDTH } from './config.ts'
import { createMatch, fire, overviewScrollX, overviewZoom, resolveShot, updateMatch, type Match } from './match.ts'
import { createShot, STEP_SECONDS, stepShot, trajectory } from './projectile.ts'
import { surfaceAt, type Player } from './terrain.ts'
import { SPELLS, type Spell } from './spells.ts'
import { drawShip, SHIPS } from './ships.ts'
import { shipPose } from './ship-motion.ts'

export interface BattleHud {
  match:Match; spell:number
  aimFeedback:{alpha:number;x:number;y:number;angle:number;power:number}
}
interface Crystal { x:number;y:number;color:number;size:number }

export class LandscapeScene extends Phaser.Scene {
  match=createMatch(0x51a7,4)
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
  private moving:boolean[]=[]
  private tilts:number[]=[]
  private previousX:number[]=[]
  private trail:{x:number;y:number}[]=[]
  private baseScrollY=0
  private lastAimTime=-Infinity
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
    this.terrainCanvas=document.createElement('canvas');this.terrainCanvas.width=WORLD_WIDTH;this.terrainCanvas.height=2400
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
    player.aimAngle=Math.cos(player.aimAngle)>=0?angle:Math.PI-angle;player.power=power/100;this.lastAimTime=this.elapsed
  }
  beginAim(pointer:number){
    if(this.match.phase!=='MovementAiming'||this.match.pointerId!==undefined)return false
    this.match.pointerId=pointer;this.lastAimTime=this.elapsed
    return true
  }
  dragWheel(dx:number,dy:number,reach:number){
    if(this.match.phase!=='MovementAiming'||this.match.pointerId===undefined)return
    this.lastAimTime=this.elapsed
    // A center tap reveals the values without changing the previous shot setup.
    if(Math.hypot(dx,dy)<6)return
    const next=dragAim(dx,dy,reach),player=this.match.players[this.match.active]
    player.aimAngle=next.angle;player.power=next.power
  }
  endAim(){
    if(this.match.pointerId!==undefined)this.lastAimTime=this.elapsed
    this.match.pointerId=undefined
  }
  flipAim(){
    if(this.match.phase==='MovementAiming'){
      const player=this.match.players[this.match.active];player.aimAngle=Math.PI-player.aimAngle;this.lastAimTime=this.elapsed
    }
  }
  hold(pointer:number,axis:-1|1){if(this.match.phase==='MovementAiming')this.held.set(pointer,axis)}
  private releasePointer=(e:PointerEvent)=>{this.held.delete(e.pointerId)}
  private visibility=()=>{if(document.hidden)this.clearInputs()}
  private keyDown=(event:KeyboardEvent)=>{
    if(event.target instanceof HTMLElement&&event.target.closest('input,select,button'))return
    if(['KeyA','KeyD','ArrowLeft','ArrowRight'].includes(event.code)){
      event.preventDefault();this.keys.add(event.code)
    }
  }
  private keyUp=(event:KeyboardEvent)=>{this.keys.delete(event.code)}
  private clearInputs=()=>{this.held.clear();this.keys.clear();this.match.pointerId=undefined;this.lastAimTime=-Infinity}
  cast(){if(fire(this.match)){this.shotSpell=SPELLS[this.selectedSpell];this.trail=[];this.clearInputs()}}
  restart(count=this.match.players.length){
    this.clearInputs();this.match=createMatch(Math.floor(Math.random()*0xffffffff),count);this.revision=-1;this.stepAccumulator=0;this.trail=[];this.moving=[];this.tilts=[]
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
    this.baseScrollY=300-height*.72/zoom
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
    for(let i=0;i<14;i++){
      const x=WORLD_WIDTH*(.035+i*.071),y=surfaceAt(this.match.terrain,x)+48+(i%4)*36,color=i%2?0xb45cf5:0x39daff
      this.crystals.push({x,y,color,size:12+(i%3)*3})
      const glow=this.add.image(x,y,'halo').setTint(color).setDisplaySize(120,120).setAlpha(.35).setDepth(1)
      this.crystalGlows.push(glow)
      if(!this.reducedMotion)this.tweens.add({targets:glow,alpha:.55,duration:1800+i*170,yoyo:true,repeat:-1,ease:'Sine.easeInOut'})
    }
  }
  private drawTerrain(){
    const ctx=this.terrainCanvas.getContext('2d')!,terrain=this.match.terrain
    ctx.clearRect(0,0,WORLD_WIDTH,2400)
    const path=()=>{ctx.beginPath();ctx.moveTo(0,2400);for(let x=0;x<=WORLD_WIDTH;x++)ctx.lineTo(x,terrain.heights[x]);ctx.lineTo(WORLD_WIDTH,2400);ctx.closePath()}
    path();const soil=ctx.createLinearGradient(0,100,0,850);soil.addColorStop(0,'#28b9ac');soil.addColorStop(.35,'#197ca7');soil.addColorStop(.65,'#263f8e');soil.addColorStop(1,'#111c45');ctx.fillStyle=soil;ctx.fill()
    ctx.save();path();ctx.clip()
    // A thin translucent surface band follows surviving ground and new craters.
    ctx.fillStyle='#6ad7bd18'
    for(let x=0;x<WORLD_WIDTH;x++)ctx.fillRect(x,terrain.heights[x],1,18)
    // Depth bands are clipped by the same destructible mask as the soil.
    for(const [depth,color] of [[38,'#087ba833'],[100,'#2448a544'],[185,'#272a7244']] as const){
      ctx.beginPath();ctx.moveTo(0,2400)
      for(let x=0;x<=WORLD_WIDTH;x+=12)ctx.lineTo(x,terrain.initialHeights[x]+depth+Math.sin(x*.037+depth)*10)
      ctx.lineTo(WORLD_WIDTH,2400);ctx.closePath();ctx.fillStyle=color;ctx.fill()
    }
    let seed=terrain.decorationSeed
    const random=()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296}
    for(let i=0;i<900;i++){
      const x=random()*WORLD_WIDTH,y=280+random()*600;ctx.fillStyle='#092c3c55';ctx.beginPath();ctx.arc(x,y,1+random()*2,0,Math.PI*2);ctx.fill()
    }
    // Broad geological facets add color without heavy bitmap textures.
    for(let i=0;i<36;i++){
      const x=random()*WORLD_WIDTH,y=terrain.initialHeights[Math.round(x)]+65+random()*240,r=32+random()*50
      this.polygon(ctx,[[x-r,y-r*.5],[x+r*.25,y-r],[x+r,y+r*.3],[x,y+r]],['#174a7280','#263b7780','#317e981f'][i%3])
      this.polygon(ctx,[[x-r,y-r*.5],[x+r*.25,y-r],[x,y+r]],'#081e4940')
    }
    for(let i=0;i<64;i++){
      const x=random()*WORLD_WIDTH,y=terrain.initialHeights[Math.round(x)]+25+random()*200,r=4+random()*12
      const points=Array.from({length:5},(_,j)=>[x+Math.cos(j*Math.PI*2/5)*r,y+Math.sin(j*Math.PI*2/5)*r*.8])
      this.polygon(ctx,points,i%2?'#163256':'#205273');this.polygon(ctx,[points[0],points[1],[x,y]],'#ffffff0b')
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
    ctx.strokeStyle='#87e6ab';ctx.lineWidth=5;ctx.lineJoin='round';ctx.beginPath();let drawing=false
    for(let x=0;x<=WORLD_WIDTH;x++){
      if(terrain.heights[x]>terrain.initialHeights[x]+.5){drawing=false;continue}
      if(!drawing){ctx.moveTo(x,terrain.heights[x]);drawing=true}else ctx.lineTo(x,terrain.heights[x])
    }ctx.stroke()
    for(let x=22;x<WORLD_WIDTH;x+=62){
      if(terrain.heights[x]>terrain.initialHeights[x]+.5)continue
      const y=terrain.heights[x],slope=Math.atan2(surfaceAt(terrain,x+2)-surfaceAt(terrain,x-2),4)
      ctx.save();ctx.translate(x,y);ctx.rotate(slope);ctx.strokeStyle='#72c998';ctx.lineWidth=2
      for(const dx of[-6,0,6]){ctx.beginPath();ctx.moveTo(dx,0);ctx.lineTo(dx*1.3,-7-(x%5));ctx.stroke()}
      if(x%186===22){
        for(let j=0;j<3;j++){
          const stemX=(j-1)*8,top=-11-j*5
          ctx.strokeStyle=j%2?'#7ce6c2':'#9e83da';ctx.beginPath();ctx.moveTo(stemX,0);ctx.lineTo(stemX,top);ctx.stroke()
          ctx.fillStyle=j%2?'#8ef2ca':'#b194f2';ctx.beginPath();ctx.arc(stemX,top,3,0,Math.PI*2);ctx.fill()
        }
      }
      ctx.restore()
    }
    this.terrainTexture!.refresh();this.revision=terrain.revision
  }
  private polygon(ctx:CanvasRenderingContext2D,points:number[][],color:string){ctx.beginPath();points.forEach(([x,y],i)=>i?ctx.lineTo(x,y):ctx.moveTo(x,y));ctx.closePath();ctx.fillStyle=color;ctx.fill()}
  update(_time:number,delta:number){
    this.elapsed+=Math.min(delta,100)/1000
    this.stepAccumulator=Math.min(this.stepAccumulator+Math.min(delta,100)/1000,STEP_SECONDS*12)
    const editing=document.activeElement instanceof HTMLInputElement||document.activeElement instanceof HTMLSelectElement
    const left=(!editing&&(this.keys.has('KeyA')||this.keys.has('ArrowLeft')))||[...this.held.values()].includes(-1)
    const right=(!editing&&(this.keys.has('KeyD')||this.keys.has('ArrowRight')))||[...this.held.values()].includes(1)
    const axis=this.match.pointerId!==undefined||left===right?0:left?-1:1
    const beforePhase=this.match.phase
    while(this.stepAccumulator>=STEP_SECONDS){
      if(this.match.phase==='ProjectileFlight'&&this.match.shot){
        const result=stepShot(this.match.shot,this.match.terrain,this.match.players)
        if(result){resolveShot(this.match,result,this.shotSpell);if(result.kind==='impact')this.impact(result.x,result.y,this.shotSpell);this.trail=[]}
      }
      updateMatch(this.match,STEP_SECONDS,axis);this.stepAccumulator-=STEP_SECONDS
    }
    if(beforePhase!==this.match.phase)this.clearInputs()
    this.match.players.forEach((p,i)=>{this.moving[i]=Math.abs(p.x-this.previousX[i])>.001;this.previousX[i]=p.x})
    if(this.revision!==this.match.terrain.revision)this.drawTerrain()
    if(this.match.shot){this.trail.push({x:this.match.shot.x,y:this.match.shot.y});if(this.trail.length>18)this.trail.shift()}
    if(this.match.phase==='MovementAiming'){
      this.match.cameraZoom=overviewZoom(this.match.players,this.match.viewWidth)
      this.cameras.main.setZoom(this.scale.width/960*this.match.cameraZoom)
      this.baseScrollY=300-this.cameras.main.height*.72/this.cameras.main.zoom
    }
    this.positionCamera();this.drawActors(Math.min(delta,100)/1000);this.hud({match:this.match,spell:this.selectedSpell,aimFeedback:this.aimFeedback()})
  }
  private aimFeedback(){
    const p=this.match.players[this.match.active],cam=this.cameras.main
    const alpha=this.match.phase==='MovementAiming'?aimFeedbackAlpha(this.elapsed,this.lastAimTime,this.match.pointerId!==undefined):0
    const pose=shipPose(this.match.terrain,p,this.elapsed,this.reducedMotion)
    return {alpha,x:(p.x-cam.scrollX)*cam.zoom,y:(pose.y-cam.scrollY)*cam.zoom,
      angle:Math.round(Math.atan2(-Math.sin(p.aimAngle),Math.abs(Math.cos(p.aimAngle)))*180/Math.PI),power:Math.round(p.power*100)}
  }
  private drawAlien(player:Player,dt:number){
    if(player.health<=0)return
    const g=this.actors,pose=shipPose(this.match.terrain,player,this.elapsed,this.reducedMotion)
    const kind=player.id,dir=Math.cos(player.aimAngle)>=0?1:-1,color=SHIPS[kind].color
    const previous=this.tilts[kind]??pose.angle
    const tilt=this.reducedMotion?pose.angle:previous+(pose.angle-previous)*(1-Math.exp(-dt*10))
    this.tilts[kind]=tilt
    if(player.grounded){
      g.save();g.translateCanvas(player.x,pose.groundY);g.rotateCanvas(tilt)
      g.fillStyle(0x08162b,.22);g.fillEllipse(0,0,48,7)
      for(let i=0;i<2;i++){
        const pulse=(pose.pulse+i*.5)%1
        g.lineStyle(1.5,color,(1-pulse)*.40);g.strokeEllipse(0,-1,44+pulse*64,6+pulse*12)
      }
      g.restore()
    }
    g.save();g.translateCanvas(pose.x,pose.y);g.rotateCanvas(tilt);g.scaleCanvas(dir*1.5,1.5)
    const thrust=this.moving[kind]&&!this.reducedMotion?.5+Math.sin(this.elapsed*18)*.25:0
    drawShip(g,kind,thrust);g.restore()
    // The weapon keeps the world-space aim angle while the hull follows the slope.
    g.save();g.translateCanvas(player.x,pose.y+4);g.rotateCanvas(player.aimAngle);g.scaleCanvas(1.3,1.3)
    g.fillStyle(0x172941);g.fillRoundedRect(5,-4,24,8,3)
    g.fillStyle(color);g.fillRect(9,-2,21,4);g.fillStyle(0xdfffff);g.fillEllipse(29,0,3,7)
    g.restore()
    if(player.id===this.match.active&&this.match.phase==='MovementAiming'){
      g.fillStyle(color,.9);g.fillTriangle(player.x-5,pose.y-38,player.x+5,pose.y-38,player.x,pose.y-32)
    }
  }
  private drawActors(dt:number){
    const g=this.actors;g.clear()
    for(const p of this.match.players)this.drawAlien(p,dt)
    if(this.match.phase==='MovementAiming'){
      const points=trajectory(createShot(this.match.players[this.match.active]),this.match.terrain,this.match.players,.55)
      const zoom=this.cameras.main.zoom
      points.forEach((point,i)=>{
        g.fillStyle(0xe8ffff,.8*(1-i/(points.length+2)))
        g.fillCircle(point.x,point.y,Math.max(1.1,2-i*.12)/zoom)
      })
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
