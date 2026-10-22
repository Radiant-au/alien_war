import Phaser from 'phaser'
import { TerrainFire } from './terrain-fire.ts'
import { aimFeedbackAlpha, dragAim } from './aim.ts'
import { WORLD_WIDTH } from './config.ts'
import { applyShotResult, createMatch, finishShot, fire, overviewScrollX, overviewZoom, updateMatch, type Match } from './match.ts'
import { createShot, createSpreadShots, PROJECTILE_SPEED_MULTIPLIER, STEP_SECONDS, stepShot, trajectory, type Shot } from './projectile.ts'
import { nextTerrainVariant, surfaceAt, type Player } from './terrain.ts'
import { SPELLS, type Spell } from './spells.ts'
import { drawShip, SHIPS } from './ships.ts'
import { shipPose, shotRecoil } from './ship-motion.ts'

export interface BattleHud {
  match:Match; spell:number
  aimFeedback:{alpha:number;x:number;y:number;angle:number;power:number}
}
interface Crystal { x:number;y:number;color:number;size:number }
interface TerrainPatch {
  graphic:Phaser.GameObjects.Graphics;x:number;radius:number;fillColor:number;fillAlpha:number
  strokeColor:number;strokeAlpha:number;strokeWidth:number;thickness:number
}
const MISSILE_TEXTURES:Record<Spell['effect'],string>={
  ice:'missile-ice',poison:'missile-poison',electric:'missile-electric',fire:'missile-fire',
}

export class LandscapeScene extends Phaser.Scene {
  gameplayEnabled=false
  shipKinds=[0,1,2,3]
  onStartupReady=()=>{}
  onStartupError=(_error:unknown)=>{}
  match=createMatch(0x51a7,4)
  private terrainVariants=new Map<number,number>()
  selectedSpell=0
  private shotSpell:Spell=SPELLS[0]
  private terrainTexture?:Phaser.Textures.CanvasTexture
  private terrainCanvas!:HTMLCanvasElement
  private actors!:Phaser.GameObjects.Graphics
  private keys=new Set<string>()
  private held=new Map<number,-1|1>()
  private crystalGlows:Phaser.GameObjects.Image[]=[]
  private crystals:Crystal[]=[]
  private terrainFire?:TerrainFire
  private burningUntil=new Map<number,number>()
  private particles:Phaser.GameObjects.GameObject[]=[]
  private volleyShots:Shot[]=[]
  private volleyMissiles:Phaser.GameObjects.Sprite[]=[]
  private terrainAnchors=new Map<Phaser.GameObjects.GameObject,{x:number;offsetY:number}>()
  private terrainPatches:TerrainPatch[]=[]
  private revision=-1
  private recoil=new Map<number,{time:number;angle:number;power:number}>()
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
  preload(){
    this.load.spritesheet('electric-impact','/assets/electric_weapon_16.png',{frameWidth:256,frameHeight:256})
    for(const type of ['ice','poison','electric','fire'])this.load.spritesheet(`missile-${type}`,`/assets/${type}_missile_spritesheet.svg`,{frameWidth:128,frameHeight:64})
  }
  create(){
    try { this.createArena(); this.onStartupReady() }
    catch(error) { this.onStartupError(error); console.error('Arena startup failed',error) }
  }
  private createArena(){
    if(!this.anims.exists('electric-impact-animation'))this.anims.create({key:'electric-impact-animation',frames:this.anims.generateFrameNumbers('electric-impact',{start:0,end:15}),frameRate:18,repeat:0})
    for(const type of ['ice','poison','electric','fire']){
      const key=`missile-${type}-travel`
      if(!this.anims.exists(key))this.anims.create({key,frames:this.anims.generateFrameNumbers(`missile-${type}`,{start:0,end:3}),frameRate:type==='electric'?16:14,repeat:-1})
    }
    const halo=document.createElement('canvas');halo.width=halo.height=128
    const ctx=halo.getContext('2d')!,gradient=ctx.createRadialGradient(64,64,0,64,64,64)
    gradient.addColorStop(0,'rgba(255,255,255,.65)');gradient.addColorStop(.25,'rgba(255,255,255,.20)');gradient.addColorStop(1,'rgba(255,255,255,0)')
    ctx.fillStyle=gradient;ctx.fillRect(0,0,128,128);this.textures.addCanvas('halo',halo)
    this.terrainFire=new TerrainFire(this,this.reducedMotion)
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
      this.terrainFire?.destroy();this.terrainFire=undefined
      this.clearMissile()
      for(const particle of this.particles){this.tweens.killTweensOf(particle);particle.destroy()}
      this.particles=[];this.terrainAnchors.clear();this.terrainPatches=[]
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
    if(!this.gameplayEnabled)return
    if(event.target instanceof HTMLElement&&event.target.closest('input,select,button'))return
    if(['KeyA','KeyD','ArrowLeft','ArrowRight'].includes(event.code)){
      event.preventDefault();this.keys.add(event.code)
    }
  }
  private keyUp=(event:KeyboardEvent)=>{this.keys.delete(event.code)}
  private clearInputs=()=>{this.held.clear();this.keys.clear();this.match.pointerId=undefined;this.lastAimTime=-Infinity}
  setGameplayEnabled(enabled:boolean){
    this.gameplayEnabled=enabled
    if(!enabled)this.clearInputs()
  }
  cast(){
    if(!this.gameplayEnabled)return
    if(!fire(this.match))return
    window.dispatchEvent(new Event('alien-war-shot'))
    const shooter=this.match.players[this.match.active]
    this.recoil.set(shooter.id,{time:this.elapsed,angle:shooter.aimAngle,power:shooter.power})
    this.shotSpell=SPELLS[this.selectedSpell];this.trail=[];this.clearInputs()
    this.volleyShots=this.shotSpell.effect==='electric'?createSpreadShots(shooter):[this.match.shot!]
    this.match.shot=this.volleyShots[Math.floor(this.volleyShots.length/2)]
    const texture=MISSILE_TEXTURES[this.shotSpell.effect]
    this.volleyMissiles=this.volleyShots.map(shot=>this.add.sprite(shot.x,shot.y,texture).setDisplaySize(84,42).setDepth(5).play(`missile-${this.shotSpell.effect}-travel`))
    this.syncMissile()
  }
  restart(count=this.match.players.length){
    this.terrainFire?.clear()
    const variant=nextTerrainVariant(this.terrainVariants.get(count))
    this.terrainVariants.set(count,variant)
    this.clearInputs();this.clearMissile();this.burningUntil.clear();this.recoil.clear();this.match=createMatch(Math.floor(Math.random()*0xffffffff),count,variant);this.revision=-1;this.stepAccumulator=0;this.trail=[];this.moving=[];this.tilts=[]
    this.previousX=this.match.players.map(p=>p.x);for(const p of this.particles){this.tweens.killTweensOf(p);p.destroy()}this.particles=[];this.terrainAnchors.clear();this.terrainPatches=[]
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
      const glow=this.add.image(x,y,'halo').setTint(color).setDisplaySize(145,145).setAlpha(.42).setDepth(1)
      this.crystalGlows.push(glow)
      if(!this.reducedMotion)this.tweens.add({targets:glow,alpha:.8,scale:1.2,y:y-12,duration:1700+i*110,yoyo:true,repeat:-1,ease:'Sine.easeInOut'})
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
      if(this.match.phase==='ProjectileFlight'&&this.volleyShots.length){
        for(let i=this.volleyShots.length-1;i>=0;i--){
          const result=stepShot(this.volleyShots[i],this.match.terrain,this.match.players,STEP_SECONDS*PROJECTILE_SPEED_MULTIPLIER)
          if(!result)continue
          if(result.kind==='impact'){
            const blast=this.shotSpell.effect==='electric'?{...this.shotSpell,damage:this.shotSpell.damage/3}:this.shotSpell
            applyShotResult(this.match,result,blast);this.impact(result.x,this.shotSpell,result.target)
          }
          this.volleyShots.splice(i,1);this.volleyMissiles.splice(i,1)[0]?.destroy()
        }
        if(this.volleyShots.length)this.match.shot=this.volleyShots[0]
        else {finishShot(this.match);this.trail=[];this.clearMissile()}
      }
      updateMatch(this.match,STEP_SECONDS,axis);this.stepAccumulator-=STEP_SECONDS
    }
    if(beforePhase!==this.match.phase)this.clearInputs()
    this.match.players.forEach((p,i)=>{this.moving[i]=Math.abs(p.x-this.previousX[i])>.001;this.previousX[i]=p.x})
    if(this.revision!==this.match.terrain.revision){this.drawTerrain();this.refreshTerrainEffects()}
    if(this.match.shot){this.trail.push({x:this.match.shot.x,y:this.match.shot.y});if(this.trail.length>18)this.trail.shift()}
    this.syncMissile()
    if(this.match.phase==='MovementAiming'){
      this.match.cameraZoom=overviewZoom(this.match.players,this.match.viewWidth)
      this.cameras.main.setZoom(this.scale.width/960*this.match.cameraZoom)
      this.baseScrollY=300-this.cameras.main.height*.72/this.cameras.main.zoom
    }
    this.terrainFire?.update(Math.min(delta,100)/1000,this.match.terrain)
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
    const kind=this.shipKinds[player.id],dir=Math.cos(player.aimAngle)>=0?1:-1,color=SHIPS[kind].color
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
      g.fillStyle(color,this.reducedMotion?.16:.16+Math.sin(this.elapsed*4+kind)*.08)
      g.fillEllipse(pose.x,pose.y+18,42,13)
    }
    const fired=this.recoil.get(player.id)
    const recoil=fired?shotRecoil(this.elapsed-fired.time,fired.angle,fired.power,this.reducedMotion):{x:0,y:0,angle:0}
    if(fired&&this.elapsed-fired.time>=.65)this.recoil.delete(player.id)
    g.save();g.translateCanvas(pose.x+recoil.x,pose.y+recoil.y);g.rotateCanvas(tilt+recoil.angle);g.scaleCanvas(dir*1.5,1.5)
    const thrust=this.moving[kind]&&!this.reducedMotion?.5+Math.sin(this.elapsed*18)*.25:0
    drawShip(g,kind,thrust);g.restore()
    if((this.burningUntil.get(kind)??0)>this.elapsed){
      const flicker=this.reducedMotion?0:Math.sin(this.elapsed*19+kind*3),top=pose.y-24+flicker*2
      g.fillStyle(0xff6029,.85);g.fillTriangle(pose.x-20,top+21,pose.x-10,top-4-Math.abs(flicker)*3,pose.x-3,top+22)
      g.fillTriangle(pose.x+3,top+22,pose.x+11,top-2+flicker*2,pose.x+20,top+21)
      g.fillStyle(0xffce54,.95);g.fillTriangle(pose.x-15,top+19,pose.x-10,top+5,pose.x-6,top+20)
      g.fillTriangle(pose.x+7,top+20,pose.x+12,top+4-flicker*2,pose.x+16,top+19)
    }
    // The weapon keeps the world-space aim angle while the hull follows the slope.
    g.save();g.translateCanvas(player.x+recoil.x,pose.y+4+recoil.y);g.rotateCanvas(player.aimAngle);g.scaleCanvas(1.3,1.3)
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
    }
  }
  private syncMissile(){
    this.volleyShots.forEach((shot,i)=>this.volleyMissiles[i]?.setPosition(shot.x,shot.y).setRotation(Math.atan2(shot.vy,shot.vx)))
  }
  private clearMissile(){for(const missile of this.volleyMissiles)missile.destroy();this.volleyMissiles=[];this.volleyShots=[]}
  private impact(x:number,spell:Spell,target:'terrain'|number){
    if(spell.effect==='fire'&&target!=='terrain'&&this.match.players[target]?.health>0)this.burningUntil.set(target,this.elapsed+2.4)
    if(!this.reducedMotion)this.cameras.main.shake(150,spell.effect==='electric'?.006:.004)
    const radius=spell.radius,depth=2
    const groundY=surfaceAt(this.match.terrain,x)
    const flash=this.add.circle(x,groundY,radius*.16,0xffffff,.8).setDepth(depth).setBlendMode(Phaser.BlendModes.ADD)
    this.animateEffect(flash,{radius:radius*1.3,alpha:0,duration:this.reducedMotion?140:250,ease:'Cubic.Out'})
    const ring=this.add.graphics().setPosition(x,groundY).setDepth(depth)
    ring.lineStyle(4,spell.effect==='fire'?0xffa13c:spell.color,.95);ring.strokeCircle(0,0,radius*.32)
    this.animateEffect(ring,{scale:2.2,alpha:0,duration:this.reducedMotion?220:520,ease:'Cubic.Out'})
    if(spell.effect==='fire'){
      this.terrainFire?.add(this.match.terrain,x,radius)
      if(!this.reducedMotion)for(let i=0;i<5;i++)this.risingParticle(x+(Math.random()-.5)*radius,groundY,0xff8a2b,radius)
    }else if(spell.effect==='electric'){
      window.dispatchEvent(new Event('alien-war-electric-impact'))
      const pulse=this.add.sprite(x,groundY-radius*.25,'electric-impact').setDisplaySize(radius*2.7,radius*2.7).setDepth(depth)
      this.anchorToTerrain(pulse,x,-radius*.25)
      this.trackEffect(pulse);pulse.once(Phaser.Animations.Events.ANIMATION_COMPLETE,()=>this.removeEffect(pulse));pulse.play({key:'electric-impact-animation',frameRate:this.reducedMotion?30:18})
      const scorch=this.surfacePatch(x,groundY,radius*.9,0x061b27,.72,0x00e5ff,.8,2,5,true).setDepth(depth-1)
      this.animateEffect(scorch,{alpha:0,scale:.85,duration:this.reducedMotion?300:1100})
      if(!this.reducedMotion)for(let i=0;i<7;i++)this.risingParticle(x+(Math.random()-.5)*radius,groundY,0x6ffaff,radius*.8)
    }else if(spell.effect==='poison'){
      window.dispatchEvent(new Event('alien-war-poison-impact'))
      const puddle=this.surfacePatch(x,groundY,radius*1.3,0x1d3a12,.96,0x39ff14,1,4,20,true).setDepth(depth)
      this.animateEffect(puddle,{alpha:0,scale:.94,duration:this.reducedMotion?500:4800,delay:this.reducedMotion?0:2500})
      if(!this.reducedMotion)for(let i=0;i<20;i++){
        const bubbleX=x+(Math.random()-.5)*radius*2
        this.risingParticle(bubbleX,surfaceAt(this.match.terrain,bubbleX),0x39ff14,radius,Math.floor(i/2)*260,4+Math.random()*3)
      }
    }else{
      const frost=this.surfacePatch(x,groundY,radius*.9,0x80e5ff,.35,0x1a5e7a,.9,2,8,true).setDepth(depth-1)
      this.animateEffect(frost,{alpha:0,scaleY:.7,duration:this.reducedMotion?350:3300,delay:this.reducedMotion?0:2200})
      for(let i=0;i<8;i++){
        const height=radius*(.9+Math.random()*.75),offset=(i/7-.5)*radius*1.8
        const shardX=x+offset,shardY=surfaceAt(this.match.terrain,shardX)
        const shard=this.add.graphics().setPosition(shardX,shardY).setDepth(depth)
        this.anchorToTerrain(shard,shardX,0)
        shard.fillStyle(0x99f2ff,.98);shard.lineStyle(3,0x1a5e7a,1);shard.beginPath();shard.moveTo(0,-height);shard.lineTo(height*.34,0);shard.lineTo(-height*.34,0);shard.closePath();shard.fillPath();shard.strokePath();shard.setScale(1,.01)
        this.animateEffect(shard,{scaleY:1,alpha:0,delay:this.reducedMotion?0:i*65+(this.reducedMotion?0:1900),duration:this.reducedMotion?180:500})
      }
      if(!this.reducedMotion)for(let i=0;i<5;i++)this.risingParticle(x+(Math.random()-.5)*radius,groundY,0xb3f6ff,radius*.8)
    }
  }
  private surfacePatch(x:number,y:number,radius:number,fillColor:number,fillAlpha:number,strokeColor:number,strokeAlpha:number,strokeWidth:number,thickness:number,followTerrain:boolean){
    const graphic=this.add.graphics().setPosition(x,y)
    const patch={graphic,x,radius,fillColor,fillAlpha,strokeColor,strokeAlpha,strokeWidth,thickness}
    if(followTerrain)this.terrainPatches.push(patch)
    this.drawSurfacePatch(patch,followTerrain)
    return graphic
  }
  private drawSurfacePatch(patch:TerrainPatch,followTerrain:boolean){
    const {graphic,x,radius,fillColor,fillAlpha,strokeColor,strokeAlpha,strokeWidth,thickness}=patch
    const centerY=followTerrain?surfaceAt(this.match.terrain,x):graphic.y
    if(followTerrain)graphic.setPosition(x,centerY)
    const points=Array.from({length:13},(_,i)=>{
      const dx=-radius+radius*2*i/12
      return {x:dx,y:followTerrain?surfaceAt(this.match.terrain,x+dx)-centerY:0}
    })
    graphic.clear();graphic.fillStyle(fillColor,fillAlpha);graphic.lineStyle(strokeWidth,strokeColor,strokeAlpha)
    graphic.beginPath();points.forEach((point,i)=>i?graphic.lineTo(point.x,point.y):graphic.moveTo(point.x,point.y))
    graphic.strokePath()
    for(let i=points.length-1;i>=0;i--)graphic.lineTo(points[i].x,points[i].y+thickness)
    graphic.closePath();graphic.fillPath()
  }
  private anchorToTerrain(target:Phaser.GameObjects.GameObject&{setY:(y:number)=>unknown},x:number,offsetY:number){
    this.terrainAnchors.set(target,{x,offsetY});target.setY(surfaceAt(this.match.terrain,x)+offsetY)
  }
  private refreshTerrainEffects(){
    for(const [target,anchor]of this.terrainAnchors)if(target.active&&'setY'in target&&typeof target.setY==='function')target.setY(surfaceAt(this.match.terrain,anchor.x)+anchor.offsetY)
    for(const patch of this.terrainPatches)if(patch.graphic.active)this.drawSurfacePatch(patch,true)
  }
  private risingParticle(x:number,y:number,color:number,spread:number,delay=0,size=2+Math.random()*2){
    const particle=this.add.graphics().setPosition(x,y).setDepth(2);particle.fillStyle(color);particle.fillCircle(0,0,size)
    this.animateEffect(particle,{x:x+(Math.random()-.5)*spread,y:y-spread*(.3+Math.random()*.7),alpha:0,scale:.2,delay,duration:650+Math.random()*500})
  }
  private trackEffect(target:Phaser.GameObjects.GameObject){this.particles.push(target)}
  private removeEffect(target:Phaser.GameObjects.GameObject){this.particles=this.particles.filter(p=>p!==target);this.terrainAnchors.delete(target);this.terrainPatches=this.terrainPatches.filter(patch=>patch.graphic!==target);target.destroy()}
  private animateEffect(target:Phaser.GameObjects.GameObject,options:Record<string,unknown>){
    this.trackEffect(target);this.tweens.add({targets:target,...options,onComplete:()=>this.removeEffect(target)})
  }
}




