import Phaser from 'phaser'

/** Normalized contour: broad opposing hills with an open central valley. */
export function landscapeSurface(x:number):number {
  return 0.76-0.19*Math.exp(-Math.pow((x-0.10)/0.19,2))-0.17*Math.exp(-Math.pow((x-0.91)/0.19,2))-0.024*Math.exp(-Math.pow((x-0.37)/0.07,2))
}

export class LandscapeScene extends Phaser.Scene {
  private landscape?:Phaser.GameObjects.Image
  private effects:Phaser.GameObjects.Image[]=[]
  private ready=false
  constructor(){super('landscape')}
  create(){
    const c=document.createElement('canvas');c.width=c.height=128
    const ctx=c.getContext('2d')!
    const glow=ctx.createRadialGradient(64,64,0,64,64,64)
    glow.addColorStop(0,'rgba(255,255,255,.6)');glow.addColorStop(.3,'rgba(255,255,255,.22)');glow.addColorStop(1,'rgba(255,255,255,0)')
    ctx.fillStyle=glow;ctx.fillRect(0,0,128,128);this.textures.addCanvas('halo',c)
    this.rebuild();this.scale.on(Phaser.Scale.Events.RESIZE,this.rebuild,this)
    this.events.once(Phaser.Scenes.Events.SHUTDOWN,()=>{this.scale.off(Phaser.Scale.Events.RESIZE,this.rebuild,this);this.clearEffects()})
    this.ready=true
  }
  private clearEffects(){for(const image of this.effects){this.tweens.killTweensOf(image);image.destroy()}this.effects=[]}
  private rebuild(){
    this.clearEffects();this.landscape?.destroy()
    if(this.textures.exists('landscape'))this.textures.remove('landscape')
    const width=this.scale.width
    const bar=document.querySelector('.command-bar')!.getBoundingClientRect().height
    const height=Math.max(1,this.scale.height-bar)
    const c=document.createElement('canvas');c.width=width;c.height=height
    const ctx=c.getContext('2d')!
    const surface=(x:number)=>landscapeSurface(x/width)*height
    const path=()=>{ctx.beginPath();ctx.moveTo(0,height);for(let x=0;x<=width;x+=2)ctx.lineTo(x,surface(x));ctx.lineTo(width,surface(width));ctx.lineTo(width,height);ctx.closePath()}
    path();const soil=ctx.createLinearGradient(0,height*.55,0,height)
    soil.addColorStop(0,'#286367');soil.addColorStop(.45,'#1b4154');soil.addColorStop(1,'#101b35')
    ctx.fillStyle=soil;ctx.fill();ctx.save();path();ctx.clip()
    let seed=1741
    const random=()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296}
    const unit=Math.min(width/1672,height/760)
    for(let i=0;i<Math.floor(width*height/2300);i++){
      const x=random()*width,y=height*.55+random()*height*.45
      ctx.fillStyle='#092c3c';ctx.globalAlpha=.22;ctx.beginPath();ctx.arc(x,y,(1+random()*3)*unit,0,Math.PI*2);ctx.fill()
    }
    ctx.globalAlpha=1
    for(let i=0;i<24;i++){
      const x=random()*width,y=surface(x)+30*unit+random()*(height-surface(x)-45*unit),r=(5+random()*17)*unit
      const vertices=Array.from({length:5},(_,j)=>{const a=j*Math.PI*2/5;return [x+Math.cos(a)*r,y+Math.sin(a)*r*.8]})
      this.polygon(ctx,vertices,i%2?'#2b3d57':'#355369')
      this.polygon(ctx,[vertices[0],vertices[1],[x,y]],'#ffffff0b')
    }
    ctx.restore()
    ctx.beginPath();for(let x=0;x<=width;x+=2){if(x===0)ctx.moveTo(x,surface(x));else ctx.lineTo(x,surface(x))}
    ctx.strokeStyle='#89bc70';ctx.lineWidth=Math.max(3,5*unit);ctx.lineJoin='round';ctx.stroke()
    for(let x=35*unit;x<width;x+=(50+random()*90)*unit){
      const y=surface(x),slope=Math.atan2(surface(x+2)-surface(x-2),4)
      ctx.save();ctx.translate(x,y);ctx.rotate(slope);ctx.strokeStyle='#78a760';ctx.lineWidth=Math.max(1.5,3*unit)
      for(const dx of [-9,0,9]){ctx.beginPath();ctx.moveTo(dx*unit,0);ctx.lineTo((dx+dx*.3)*unit,-(8+random()*8)*unit);ctx.stroke()}ctx.restore()
    }
    for(const fraction of [.22,.78]){
      const x=width*fraction,y=surface(x);ctx.strokeStyle='#729855';ctx.lineWidth=2*unit;ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(x,y-20*unit);ctx.stroke()
      for(let i=0;i<5;i++){const a=i*Math.PI*2/5;ctx.fillStyle='#f2f2dd';ctx.beginPath();ctx.arc(x+Math.cos(a)*5*unit,y-22*unit+Math.sin(a)*5*unit,3*unit,0,Math.PI*2);ctx.fill()}
      ctx.fillStyle='#ffcb64';ctx.beginPath();ctx.arc(x,y-22*unit,2.5*unit,0,Math.PI*2);ctx.fill()
    }
    const clusters=[{x:.10,d:.52,color:0x39daff},{x:.35,d:.67,color:0xb45cf5},{x:.66,d:.65,color:0x39daff},{x:.91,d:.50,color:0xb45cf5}]
    for(const item of clusters){
      const x=width*item.x,y=surface(x)+(height-surface(x))*item.d
      const color='#'+item.color.toString(16)
      for(const [dx,dy,size] of [[0,0,1],[-21,15,.55],[20,16,.55],[0,37,.35]]){
        const px=x+dx*unit,py=y+dy*unit,r=17*size*unit,h=29*size*unit
        this.polygon(ctx,[[px,py-h],[px+r,py],[px,py+h],[px-r,py]],color)
        this.polygon(ctx,[[px,py-h],[px+r,py],[px,py]],'#ffffff35')
        this.polygon(ctx,[[px-r,py],[px,py+h],[px,py]],'#07193633')
      }
      const image=this.add.image(x,y,'halo').setTint(item.color).setDisplaySize(140*unit,140*unit).setAlpha(.3).setDepth(1)
      this.effects.push(image);if(!window.matchMedia('(prefers-reduced-motion: reduce)').matches)this.tweens.add({targets:image,alpha:.55,duration:1800+item.x*1000,yoyo:true,repeat:-1,ease:'Sine.easeInOut'})
    }
    this.textures.addCanvas('landscape',c);this.landscape=this.add.image(0,0,'landscape').setOrigin(0).setDepth(0)
  }
  private polygon(ctx:CanvasRenderingContext2D,points:number[][],color:string){ctx.beginPath();points.forEach(([x,y],i)=>i?ctx.lineTo(x,y):ctx.moveTo(x,y));ctx.closePath();ctx.fillStyle=color;ctx.fill()}
  previewImpact(spell:number,power:number){
    if(!this.ready)return
    const height=this.scale.height-document.querySelector('.command-bar')!.getBoundingClientRect().height
    const x=this.scale.width*.52,y=landscapeSurface(.52)*height
    const ring=this.add.graphics().setDepth(2)
    ring.lineStyle(3,[0x39daff,0xffad42,0xb45cf5,0x80efff][spell]);ring.strokeCircle(0,0,12);ring.setPosition(x,y)
    this.tweens.add({targets:ring,scale:2+power/20,alpha:0,duration:650,onComplete:()=>ring.destroy()})
  }
}
