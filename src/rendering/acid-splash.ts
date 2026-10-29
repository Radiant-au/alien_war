import type Phaser from 'phaser'
export const ACID_SPLASH='acid-splash-crown'
export const ACID_FRAMES=12
/** Bake a transparent, curved asymmetric splash once; playback follows simulation time. */
export function createAcidSplash(scene:Phaser.Scene){
 if(scene.textures.exists(ACID_SPLASH))return
 const canvas=document.createElement('canvas');canvas.width=192*ACID_FRAMES;canvas.height=128
 const ctx=canvas.getContext('2d')!
 for(let f=0;f<ACID_FRAMES;f++){
  const t=f/(ACID_FRAMES-1),rise=Math.sin(t*Math.PI)*.9+.1
  ctx.save();ctx.translate(f*192,0)
  const gradient=ctx.createLinearGradient(0,30,0,114);gradient.addColorStop(0,'#d6ff81');gradient.addColorStop(.5,'#98ef32');gradient.addColorStop(1,'#357e18')
  ctx.fillStyle=gradient;ctx.strokeStyle='#c9ff78';ctx.lineWidth=1.5
  ctx.beginPath();ctx.moveTo(20,112)
  ctx.bezierCurveTo(34,110,47,105,38,112-65*rise)
  ctx.bezierCurveTo(27,105-70*rise,50,106-83*rise,52,112-55*rise)
  ctx.bezierCurveTo(53,93,72,109,79,112-40*rise)
  ctx.bezierCurveTo(78,112-61*rise,93,112-62*rise,94,112-28*rise)
  ctx.bezierCurveTo(95,109,113,108,130,112-76*rise)
  ctx.bezierCurveTo(135,112-93*rise,154,112-80*rise,142,112-58*rise)
  ctx.bezierCurveTo(129,106,156,106,176,112)
  ctx.bezierCurveTo(145,125,50,124,20,112);ctx.closePath();ctx.fill();ctx.stroke()
  for(let i=0;i<7;i++){
   const x=96+(i-3)*(10+t*16),y=108-Math.sin(t*Math.PI)*(27+(i%3)*18)
   ctx.fillStyle=i%2?'#bcff69':'#89e82c';ctx.beginPath();ctx.ellipse(x,y,2.5,4+(1-t)*2,(i-3)*.2,0,Math.PI*2);ctx.fill()
  }
  ctx.restore()
 }
 const texture=scene.textures.addCanvas(ACID_SPLASH,canvas)!
 for(let f=0;f<ACID_FRAMES;f++)texture.add(f,0,f*192,0,192,128)
}
