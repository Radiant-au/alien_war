import Phaser from 'phaser'
import './style.css'
import { backgroundMarkup } from './background.ts'
import { SPELLS } from './spells.ts'
import { SHIPS } from './ships.ts'
import { MOVEMENT_ALLOWANCE } from './config.ts'
import { LandscapeScene } from './landscape-scene.ts'

const icons = [
  '<path d="M8 34 35 7 29 24 42 21 15 44 21 28Z" fill="#35d8ff"/><circle cx="36" cy="12" r="8" fill="#e5fbff"/>',
  '<path d="M25 4C30 18 42 20 38 34S12 47 11 31c-1-8 6-13 8-19 0 8 4 9 6-8Z" fill="#ff9b32"/><path d="M26 23c9 9 5 18-2 18s-10-7 2-18Z" fill="#ffdc70"/>',
  '<path d="M38 17C27-1 4 17 12 33s31 9 27-3-21-12-19-2 11 8 11 2" fill="none" stroke="#b663f8" stroke-width="6" stroke-linecap="round"/>',
  '<path d="m24 4 9 22-9 19-9-19ZM8 23l7 13-7 9-6-9Zm32-5 7 17-7 10-6-10Z" fill="#56e4ff"/>'
]
const spells = SPELLS.map(spell => spell.name)
const app = document.querySelector<HTMLDivElement>('#app')!
app.innerHTML = `${backgroundMarkup()}<main id="game-area" aria-label="Alien artillery battlefield"></main>
<header class="hud" data-count="4">
${SHIPS.map((ship,i)=>`<div class="health-card" data-player="${i}" style="--ship-color:#${ship.color.toString(16)}"><span class="player-name" title="${ship.name}">P${i+1}</span><div class="health-track" role="progressbar" aria-label="${ship.name} health" aria-valuemin="0" aria-valuemax="100" aria-valuenow="100"><i id="health-${i}-bar"></i></div><strong id="health-${i}">100</strong></div>`).join('')}
<div class="brand"><h1><span>Crater</span><br><b>Clash</b></h1><p id="turn-status" role="status">Preparing arena</p></div></header>
<nav class="utilities" aria-label="Match options"><label for="player-count">LOCAL</label><select id="player-count" aria-label="Local player count"><option value="2">2 players</option><option value="3">3 players</option><option value="4" selected>4 players</option></select><button id="restart">↻ New match</button><button id="fullscreen" aria-label="Fullscreen">⛶</button></nav>
<section class="field-controls" aria-label="Battlefield controls">
  <button id="aim-wheel" aria-label="Drag aim wheel: farther increases power; direction changes angle. Arrow keys adjust; X reverses." title="Drag the wheel: direction = angle, distance = power. ↑ ↓ angle, ← → power, X reverse."><span class="wheel-disc"><span class="wheel-face"><span class="wheel-needle"></span><span class="wheel-knob"></span><svg viewBox="0 0 48 48" aria-hidden="true"><circle cx="24" cy="24" r="8" fill="none" stroke="currentColor" stroke-width="1"/><path d="M24 8v8m0 16v8M8 24h8m16 0h8" stroke="currentColor" stroke-width="1.5"/></svg></span></span><span class="wheel-caption">DRAG AIM</span></button>
  <div class="movement-controls"><div class="movement-buttons"><button id="move-left" aria-label="Move left">◀</button><button id="move-right" aria-label="Move right">▶</button></div><div class="fuel-caption"><span>FUEL</span><output id="fuel-value">100%</output></div><div class="fuel-track" id="fuel-meter" role="progressbar" aria-label="Movement fuel" aria-valuemin="0" aria-valuemax="100" aria-valuenow="100"><i id="fuel-fill"></i></div></div>
</section>
<footer class="command-bar" aria-label="Weapon controls">
  <div class="spell-controls" role="group" aria-label="Choose weapon">${spells.map((s,i)=>`<button class="spell ${i===0?'selected':''}" data-spell="${i}" aria-pressed="${i===0}"><span class="spell-icon"><svg viewBox="0 0 48 48" aria-hidden="true">${icons[i]}</svg></span><span>${s}</span></button>`).join('')}</div>
  <button id="fire"><svg viewBox="0 0 48 48" aria-hidden="true"><circle cx="24" cy="24" r="13" fill="none" stroke="currentColor" stroke-width="3"/><path d="M24 4v12m0 16v12M4 24h12m16 0h12" fill="none" stroke="currentColor" stroke-width="3"/><circle cx="24" cy="24" r="4" fill="currentColor"/></svg>FIRE</button>
</footer><div id="ship-aim-info" aria-hidden="true"><div><strong id="ship-power">58</strong><span>POWER</span></div><div><strong id="ship-angle">45°</strong><span>ANGLE</span></div></div>`

const commandBar=document.querySelector<HTMLElement>('.command-bar')!
new ResizeObserver(()=>app.style.setProperty('--command-height',`${commandBar.getBoundingClientRect().height}px`)).observe(commandBar)

export const scene = new LandscapeScene()
new Phaser.Game({ type: Phaser.CANVAS, parent:'game-area', transparent:true, scale:{mode:Phaser.Scale.RESIZE,width:window.innerWidth,height:window.innerHeight},scene:[scene] })
for (const button of document.querySelectorAll<HTMLButtonElement>('.spell')) {
  button.addEventListener('click',()=>scene.selectSpell(Number(button.dataset.spell)))
}
const aimWheel=document.querySelector<HTMLButtonElement>('#aim-wheel')!
let aimPointer:number|undefined
const resetWheel=()=>{
  const pointer=aimPointer;aimPointer=undefined;scene.endAim()
  aimWheel.classList.remove('dragging')
  if(pointer!==undefined&&aimWheel.hasPointerCapture(pointer))aimWheel.releasePointerCapture(pointer)
}
const endAim=(e:PointerEvent)=>{if(e.pointerId===aimPointer)resetWheel()}
const updateWheel=(e:PointerEvent)=>{
  const r=aimWheel.querySelector('.wheel-disc')!.getBoundingClientRect()
  scene.dragWheel(e.clientX-r.left-r.width/2,e.clientY-r.top-r.height/2,r.width*.5)
}
aimWheel.addEventListener('pointerdown',e=>{
  if(aimPointer!==undefined||e.button!==0||!e.isPrimary||!scene.beginAim(e.pointerId))return
  e.preventDefault();aimPointer=e.pointerId;aimWheel.setPointerCapture(e.pointerId)
  aimWheel.classList.add('dragging');updateWheel(e)
})
aimWheel.addEventListener('pointermove',e=>{if(e.pointerId===aimPointer)updateWheel(e)})
for(const type of ['pointerup','pointercancel','lostpointercapture'])aimWheel.addEventListener(type,endAim as EventListener)
window.addEventListener('blur',resetWheel)
document.addEventListener('visibilitychange',()=>{if(document.hidden)resetWheel()})
document.querySelector('#aim-wheel')!.addEventListener('keydown',event=>{
  const e=event as KeyboardEvent
  if(!['ArrowUp','ArrowDown','ArrowLeft','ArrowRight','KeyX'].includes(e.code))return
  e.preventDefault();e.stopPropagation()
  if(e.code==='KeyX'){scene.flipAim();return}
  const player=scene.match.players[scene.match.active]
  const elevation=Math.atan2(-Math.sin(player.aimAngle),Math.abs(Math.cos(player.aimAngle)))*180/Math.PI
  scene.aim(Math.max(3,Math.min(87,elevation+(e.code==='ArrowUp'?2:e.code==='ArrowDown'?-2:0))),Math.max(15,Math.min(100,player.power*100+(e.code==='ArrowRight'?3:e.code==='ArrowLeft'?-3:0))))
})
document.querySelector('#fire')!.addEventListener('click',()=>scene.cast())
document.querySelector('#restart')!.addEventListener('click',()=>{resetWheel();scene.restart()})
document.querySelector('#player-count')!.addEventListener('change',e=>{resetWheel();scene.restart(Number((e.target as HTMLSelectElement).value))})
document.querySelector('#fullscreen')!.addEventListener('click',async()=>{
  try{if(document.fullscreenElement)await document.exitFullscreen();else await app.requestFullscreen()}catch{document.querySelector('#turn-status')!.textContent='Fullscreen unavailable'}
})
for(const [id,axis]of [['move-left',-1],['move-right',1]]as const){
  const button=document.querySelector<HTMLButtonElement>(`#${id}`)!
  button.addEventListener('pointerdown',e=>{if(button.disabled)return;e.preventDefault();button.setPointerCapture(e.pointerId);scene.hold(e.pointerId,axis)})
}
window.addEventListener('keydown',e=>{if(e.code==='Space'&&!e.repeat&&!(e.target instanceof HTMLInputElement)&&!(e.target instanceof HTMLButtonElement)&&!(e.target instanceof HTMLSelectElement)){e.preventDefault();scene.cast()}})
scene.setHud(({match,spell,aimFeedback})=>{
  const ready=match.phase==='MovementAiming',player=match.players[match.active]
  if(!ready&&aimPointer!==undefined)resetWheel()
  aimWheel.disabled=!ready
  aimWheel.style.setProperty('--wheel-progress',`${player.power*360}deg`)
  const knobRange=Math.max(6,(aimWheel.querySelector('.wheel-disc')!.clientWidth-aimWheel.querySelector('.wheel-knob')!.clientWidth)/2-8)
  aimWheel.style.setProperty('--wheel-x',`${Math.cos(player.aimAngle)*player.power*knobRange}px`)
  aimWheel.style.setProperty('--wheel-y',`${Math.sin(player.aimAngle)*player.power*knobRange}px`)
  aimWheel.style.setProperty('--wheel-angle',`${player.aimAngle*180/Math.PI}deg`)
  const readout=document.querySelector<HTMLElement>('#ship-aim-info')!
  readout.style.opacity=String(aimFeedback.alpha)
  readout.setAttribute('aria-hidden',String(aimFeedback.alpha===0))
  // Keep the two small panels on screen even when a ship is near a world edge.
  const x=Math.max(62,Math.min(window.innerWidth-62,aimFeedback.x)),y=Math.max(145,aimFeedback.y-34)
  readout.style.left=`${x}px`;readout.style.top=`${Math.min(y,window.innerHeight-120)}px`
  document.querySelector('#ship-power')!.textContent=String(aimFeedback.power)
  document.querySelector('#ship-angle')!.textContent=`${aimFeedback.angle}°`
  document.querySelectorAll<HTMLButtonElement>('.spell').forEach((button,i)=>{button.disabled=!ready;button.classList.toggle('selected',i===spell);button.setAttribute('aria-pressed',String(i===spell))})
  document.querySelector<HTMLElement>('.hud')!.dataset.count=String(match.players.length)
  document.querySelectorAll<HTMLElement>('.health-card').forEach((card,i)=>{
    const p=match.players[i];card.hidden=!p
    if(!p)return
    document.querySelector(`#health-${i}`)!.textContent=String(p.health)
    card.title=p.health>0?`${SHIPS[i].name}: ${p.health} health`:`${SHIPS[i].name}: eliminated`
    document.querySelector<HTMLElement>(`#health-${i}-bar`)!.style.width=`${p.health}%`
    card.querySelector('.health-track')!.setAttribute('aria-valuenow',String(p.health))
    card.classList.toggle('active',match.active===i&&ready);card.classList.toggle('eliminated',p.health<=0)
  })
  const fuel=Math.max(0,Math.min(100,player.movementRemaining/MOVEMENT_ALLOWANCE*100))
  document.querySelector('#fuel-value')!.textContent=`${Math.round(fuel)}%`
  document.querySelector<HTMLElement>('#fuel-fill')!.style.width=`${fuel}%`
  document.querySelector('#fuel-meter')!.setAttribute('aria-valuenow',String(Math.round(fuel)))
  document.querySelector<HTMLElement>('.movement-controls')!.style.setProperty('--fuel-color','#'+SHIPS[player.id].color.toString(16))
  const winner=match.outcome?.match(/^Player (\d+) wins$/)
  const result=winner?`${SHIPS[Number(winner[1])-1].name} wins!`:match.outcome
  document.querySelector('#turn-status')!.textContent=result??(ready?`P${player.id+1} · ${SHIPS[player.id].name}'s turn` : match.phase==='ProjectileFlight'?'Weapon in flight':match.phase==='Settling'?'Ships settling':'Preparing next turn')
  document.querySelector<HTMLButtonElement>('#fire')!.disabled=!ready||!player.grounded||player.health===0||match.pointerId!==undefined
  for(const id of ['move-left','move-right'])document.querySelector<HTMLButtonElement>(`#${id}`)!.disabled=!ready||player.movementRemaining<=0
})
