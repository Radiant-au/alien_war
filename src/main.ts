import Phaser from 'phaser'
import './style.css'
import { backgroundMarkup } from './background.ts'
import { SPELLS } from './spells.ts'
import { LandscapeScene } from './landscape-scene.ts'

const icons = [
  '<path d="M8 34 35 7 29 24 42 21 15 44 21 28Z" fill="#35d8ff"/><circle cx="36" cy="12" r="8" fill="#e5fbff"/>',
  '<path d="M25 4C30 18 42 20 38 34S12 47 11 31c-1-8 6-13 8-19 0 8 4 9 6-8Z" fill="#ff9b32"/><path d="M26 23c9 9 5 18-2 18s-10-7 2-18Z" fill="#ffdc70"/>',
  '<path d="M38 17C27-1 4 17 12 33s31 9 27-3-21-12-19-2 11 8 11 2" fill="none" stroke="#b663f8" stroke-width="6" stroke-linecap="round"/>',
  '<path d="m24 4 9 22-9 19-9-19ZM8 23l7 13-7 9-6-9Zm32-5 7 17-7 10-6-10Z" fill="#56e4ff"/>'
]
const spells = SPELLS.map(spell => spell.name)
const app = document.querySelector<HTMLDivElement>('#app')!
app.innerHTML = `${backgroundMarkup()}<main id="game-area" aria-label="Wizard artillery battlefield"></main>
<header class="hud"><div class="health-card azure"><span class="portrait">✦</span><div><span class="player-name">AZURE</span><div class="health-track"><i id="health-one-bar"></i></div><strong id="health-one">100 / 100</strong></div></div><div class="brand"><h1><span>Wizard</span> War</h1><p id="turn-status" role="status">Preparing arena</p></div><div class="health-card ember"><div><span class="player-name">EMBER</span><div class="health-track"><i id="health-two-bar"></i></div><strong id="health-two">100 / 100</strong></div><span class="portrait">✦</span></div></header>
<nav class="utilities" aria-label="Match options"><button id="restart">↻ New match</button><button id="fullscreen">⛶</button></nav>
<footer class="command-bar" aria-label="Spell controls">
  <div class="movement-controls"><button id="move-left" aria-label="Move left">◀</button><button id="move-right" aria-label="Move right">▶</button></div>
  <div class="spell-controls" role="group" aria-label="Choose spell">${spells.map((s,i)=>`<button class="spell ${i===0?'selected':''}" data-spell="${i}" aria-pressed="${i===0}"><span class="spell-icon"><svg viewBox="0 0 48 48" aria-hidden="true">${icons[i]}</svg></span><span>${s}</span></button>`).join('')}</div>
  ${dial('angle','ANGLE',45,3,87,'°')}${dial('power','POWER',70,15,100,'%')}
  <button id="fire"><svg viewBox="0 0 48 48" aria-hidden="true"><path d="m10 40 23-23M30 6v6m12 7h-6M18 11l4 4m15 16-4-4" fill="none" stroke="currentColor" stroke-width="4" stroke-linecap="round"/><path d="m30 14 2 7 7 2-7 2-2 7-2-7-7-2 7-2Z" fill="currentColor"/></svg>FIRE</button>
</footer><p class="help">A / D to move · Drag the dials to aim · Space to cast</p>`

function dial(id:string,label:string,value:number,min:number,max:number,unit:string) {
  return `<div class="dial-control"><div class="dial" id="${id}-dial" style="--progress:${(value-min)/(max-min)*270}deg;--rotation:${-135+(value-min)/(max-min)*270}deg"><span class="needle"></span><output id="${id}-value">${value}${unit}</output><input id="${id}" type="range" min="${min}" max="${max}" value="${value}" aria-label="${label.toLowerCase()}"></div><label for="${id}">${label}</label></div>`
}

const scene = new LandscapeScene()
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
document.querySelector('#fullscreen')!.addEventListener('click',async()=>{
  try{if(document.fullscreenElement)await document.exitFullscreen();else await app.requestFullscreen()}catch{document.querySelector('#turn-status')!.textContent='Fullscreen unavailable'}
})
for(const [id,axis]of [['move-left',-1],['move-right',1]]as const){
  const button=document.querySelector<HTMLButtonElement>(`#${id}`)!
  button.addEventListener('pointerdown',e=>{if(button.disabled)return;e.preventDefault();button.setPointerCapture(e.pointerId);scene.hold(e.pointerId,axis)})
}
window.addEventListener('keydown',e=>{if(e.code==='Space'&&!e.repeat&&!(e.target instanceof HTMLInputElement)&&!(e.target instanceof HTMLButtonElement)){e.preventDefault();scene.cast()}})
scene.setHud(({match,spell})=>{
  const ready=match.phase==='MovementAiming',player=match.players[match.active]
  const elevation=Math.round(Math.atan2(-Math.sin(player.aimAngle),Math.abs(Math.cos(player.aimAngle)))*180/Math.PI)
  for(const [id,value]of [['angle',elevation],['power',Math.round(player.power*100)]]as const){
    const input=document.querySelector<HTMLInputElement>(`#${id}`)!;input.value=String(value);input.disabled=!ready;updateDial(id)
    document.querySelector(`#${id}-dial`)!.classList.toggle('disabled',!ready)
  }
  document.querySelectorAll<HTMLButtonElement>('.spell').forEach((button,i)=>{button.disabled=!ready;button.classList.toggle('selected',i===spell);button.setAttribute('aria-pressed',String(i===spell))})
  match.players.forEach((p,i)=>{
    const name=i===0?'one':'two'
    document.querySelector(`#health-${name}`)!.textContent=`${p.health} / 100`
    document.querySelector<HTMLElement>(`#health-${name}-bar`)!.style.width=`${p.health}%`
    document.querySelectorAll('.health-card')[i].classList.toggle('active',match.active===i&&ready)
  })
  document.querySelector('#turn-status')!.textContent=match.outcome??(ready?`${match.active===0?'Azure':'Ember'}'s turn · ${Math.ceil(player.movementRemaining)} movement` : match.phase==='ProjectileFlight'?'Spell in flight':match.phase==='Settling'?'Ground settling':'Preparing next turn')
  document.querySelector<HTMLButtonElement>('#fire')!.disabled=!ready||!player.grounded||player.health===0
  for(const id of ['move-left','move-right'])document.querySelector<HTMLButtonElement>(`#${id}`)!.disabled=!ready||player.movementRemaining<=0
})
