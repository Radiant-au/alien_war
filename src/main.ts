import Phaser from 'phaser'
import './style.css'
import { backgroundMarkup } from './background.ts'
import { SPELLS } from './spells.ts'
import { SHIPS, shipPortrait } from './ships.ts'
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
${SHIPS.map((ship,i)=>`<div class="health-card" data-player="${i}" style="--ship-color:#${ship.color.toString(16)}"><span class="portrait">${shipPortrait(i)}</span><div><span class="player-name">P${i+1} · ${ship.name.toUpperCase()}</span><div class="health-track"><i id="health-${i}-bar"></i></div><strong id="health-${i}">100 / 100</strong></div></div>`).join('')}
<div class="brand"><h1><span>Crater</span><br><b>Clash</b></h1><p id="turn-status" role="status">Preparing arena</p></div></header>
<nav class="utilities" aria-label="Match options"><label for="player-count">LOCAL</label><select id="player-count" aria-label="Local player count"><option value="2">2 players</option><option value="3">3 players</option><option value="4" selected>4 players</option></select><button id="restart">↻ New match</button><button id="fullscreen" aria-label="Fullscreen">⛶</button></nav>
<footer class="command-bar" aria-label="Weapon controls">
  <div class="movement-controls"><div class="movement-buttons"><button id="move-left" aria-label="Move left">◀</button><button id="move-right" aria-label="Move right">▶</button></div><div class="fuel-caption"><span>FUEL</span><output id="fuel-value">100%</output></div><div class="fuel-track" id="fuel-meter" role="progressbar" aria-label="Movement fuel" aria-valuemin="0" aria-valuemax="100" aria-valuenow="100"><i id="fuel-fill"></i></div></div>
  <div class="spell-controls" role="group" aria-label="Choose weapon">${spells.map((s,i)=>`<button class="spell ${i===0?'selected':''}" data-spell="${i}" aria-pressed="${i===0}"><span class="spell-icon"><svg viewBox="0 0 48 48" aria-hidden="true">${icons[i]}</svg></span><span>${s}</span></button>`).join('')}</div>
  ${dial('angle','ANGLE',45,3,87,'°')}${dial('power','POWER',70,15,100,'%')}
  <button id="fire"><svg viewBox="0 0 48 48" aria-hidden="true"><circle cx="24" cy="24" r="13" fill="none" stroke="currentColor" stroke-width="3"/><path d="M24 4v12m0 16v12M4 24h12m16 0h12" fill="none" stroke="currentColor" stroke-width="3"/><circle cx="24" cy="24" r="4" fill="currentColor"/></svg>FIRE</button>
</footer><p class="help">A / D to move · Drag the dials to aim · Space to cast</p>`

function dial(id:string,label:string,value:number,min:number,max:number,unit:string) {
  return `<div class="dial-control"><div class="dial" id="${id}-dial" style="--progress:${(value-min)/(max-min)*270}deg;--rotation:${-135+(value-min)/(max-min)*270}deg"><span class="needle"></span><output id="${id}-value">${value}${unit}</output><input id="${id}" type="range" min="${min}" max="${max}" value="${value}" aria-label="${label.toLowerCase()}"></div><label for="${id}">${label}</label>${id==='angle'?'<button id="aim-direction" type="button" aria-label="Switch aiming direction">Aim →</button>':''}</div>`
}

export const scene = new LandscapeScene()
new Phaser.Game({ type: Phaser.CANVAS, parent:'game-area', transparent:true, scale:{mode:Phaser.Scale.RESIZE,width:window.innerWidth,height:window.innerHeight},scene:[scene] })
for (const button of document.querySelectorAll<HTMLButtonElement>('.spell')) {
  button.addEventListener('click',()=>scene.selectSpell(Number(button.dataset.spell)))
}
function updateDial(id:string){
  const input=document.querySelector<HTMLInputElement>(`#${id}`)!
  const progress=(Number(input.value)-Number(input.min))/(Number(input.max)-Number(input.min))
  const element=document.querySelector<HTMLElement>(`#${id}-dial`)!
  element.style.setProperty('--progress',`${progress*270}deg`)
  element.style.setProperty('--rotation',`${-135+progress*270}deg`)
  document.querySelector(`#${id}-value`)!.textContent=input.value+(id==='angle'?'°':'%')
}
for (const id of ['angle','power']) {
  const input=document.querySelector<HTMLInputElement>(`#${id}`)!
  const update=()=>{
    updateDial(id)
    scene.aim(Number(document.querySelector<HTMLInputElement>('#angle')!.value),Number(document.querySelector<HTMLInputElement>('#power')!.value))
  }
  input.addEventListener('input',update)
  const element=document.querySelector<HTMLElement>(`#${id}-dial`)!
  const setFromPointer=(e:PointerEvent)=>{
    if(input.disabled)return
    const r=element.getBoundingClientRect()
    let degrees=Math.atan2(e.clientY-r.top-r.height/2,e.clientX-r.left-r.width/2)*180/Math.PI+90
    if(degrees>180) degrees-=360
    degrees=Math.max(-135,Math.min(135,degrees))
    input.value=String(Math.round(Number(input.min)+(degrees+135)/270*(Number(input.max)-Number(input.min))))
    update()
  }
  element.addEventListener('pointerdown',e=>{element.setPointerCapture(e.pointerId);setFromPointer(e)})
  element.addEventListener('pointermove',e=>{if(element.hasPointerCapture(e.pointerId))setFromPointer(e)})
}
document.querySelector('#fire')!.addEventListener('click',()=>scene.cast())
document.querySelector('#restart')!.addEventListener('click',()=>scene.restart())
document.querySelector('#aim-direction')!.addEventListener('click',()=>scene.flipAim())
document.querySelector('#player-count')!.addEventListener('change',e=>scene.restart(Number((e.target as HTMLSelectElement).value)))
document.querySelector('#fullscreen')!.addEventListener('click',async()=>{
  try{if(document.fullscreenElement)await document.exitFullscreen();else await app.requestFullscreen()}catch{document.querySelector('#turn-status')!.textContent='Fullscreen unavailable'}
})
for(const [id,axis]of [['move-left',-1],['move-right',1]]as const){
  const button=document.querySelector<HTMLButtonElement>(`#${id}`)!
  button.addEventListener('pointerdown',e=>{if(button.disabled)return;e.preventDefault();button.setPointerCapture(e.pointerId);scene.hold(e.pointerId,axis)})
}
window.addEventListener('keydown',e=>{if(e.code==='Space'&&!e.repeat&&!(e.target instanceof HTMLInputElement)&&!(e.target instanceof HTMLButtonElement)&&!(e.target instanceof HTMLSelectElement)){e.preventDefault();scene.cast()}})
scene.setHud(({match,spell})=>{
  const ready=match.phase==='MovementAiming',player=match.players[match.active]
  const elevation=Math.round(Math.atan2(-Math.sin(player.aimAngle),Math.abs(Math.cos(player.aimAngle)))*180/Math.PI)
  for(const [id,value]of [['angle',elevation],['power',Math.round(player.power*100)]]as const){
    const input=document.querySelector<HTMLInputElement>(`#${id}`)!;input.value=String(value);input.disabled=!ready;updateDial(id)
    document.querySelector(`#${id}-dial`)!.classList.toggle('disabled',!ready)
  }
  document.querySelectorAll<HTMLButtonElement>('.spell').forEach((button,i)=>{button.disabled=!ready;button.classList.toggle('selected',i===spell);button.setAttribute('aria-pressed',String(i===spell))})
  document.querySelector<HTMLElement>('.hud')!.dataset.count=String(match.players.length)
  document.querySelectorAll<HTMLElement>('.health-card').forEach((card,i)=>{
    const p=match.players[i];card.hidden=!p
    if(!p)return
    document.querySelector(`#health-${i}`)!.textContent=p.health>0?`${p.health} / 100`:'ELIMINATED'
    document.querySelector<HTMLElement>(`#health-${i}-bar`)!.style.width=`${p.health}%`
    card.classList.toggle('active',match.active===i&&ready);card.classList.toggle('eliminated',p.health<=0)
  })
  const fuel=Math.max(0,Math.min(100,player.movementRemaining/MOVEMENT_ALLOWANCE*100))
  document.querySelector('#fuel-value')!.textContent=`${Math.round(fuel)}%`
  document.querySelector<HTMLElement>('#fuel-fill')!.style.width=`${fuel}%`
  document.querySelector('#fuel-meter')!.setAttribute('aria-valuenow',String(Math.round(fuel)))
  document.querySelector<HTMLElement>('.movement-controls')!.style.setProperty('--fuel-color','#'+SHIPS[player.id].color.toString(16))
  const facingRight=Math.cos(player.aimAngle)>=0
  document.querySelector<HTMLButtonElement>('#aim-direction')!.disabled=!ready
  document.querySelector('#aim-direction')!.textContent=facingRight?'Aim →':'Aim ←'
  const winner=match.outcome?.match(/^Player (\d+) wins$/)
  const result=winner?`${SHIPS[Number(winner[1])-1].name} wins!`:match.outcome
  document.querySelector('#turn-status')!.textContent=result??(ready?`P${player.id+1} · ${SHIPS[player.id].name}'s turn` : match.phase==='ProjectileFlight'?'Weapon in flight':match.phase==='Settling'?'Ships settling':'Preparing next turn')
  document.querySelector<HTMLButtonElement>('#fire')!.disabled=!ready||!player.grounded||player.health===0
  for(const id of ['move-left','move-right'])document.querySelector<HTMLButtonElement>(`#${id}`)!.disabled=!ready||player.movementRemaining<=0
})
