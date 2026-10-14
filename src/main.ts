import Phaser from 'phaser'
import './style.css'
import { LandscapeScene } from './landscape-scene.ts'

const icons = [
  '<path d="M8 34 35 7 29 24 42 21 15 44 21 28Z" fill="#35d8ff"/><circle cx="36" cy="12" r="8" fill="#e5fbff"/>',
  '<path d="M25 4C30 18 42 20 38 34S12 47 11 31c-1-8 6-13 8-19 0 8 4 9 6-8Z" fill="#ff9b32"/><path d="M26 23c9 9 5 18-2 18s-10-7 2-18Z" fill="#ffdc70"/>',
  '<path d="M38 17C27-1 4 17 12 33s31 9 27-3-21-12-19-2 11 8 11 2" fill="none" stroke="#b663f8" stroke-width="6" stroke-linecap="round"/>',
  '<path d="m24 4 9 22-9 19-9-19ZM8 23l7 13-7 9-6-9Zm32-5 7 17-7 10-6-10Z" fill="#56e4ff"/>'
]
const spells = ['Magic Bolt', 'Fireball', 'Arcane Orb', 'Ice Spike']
const app = document.querySelector<HTMLDivElement>('#app')!
app.innerHTML = `<main id="game-area" aria-label="Procedural landscape preview"></main>
<footer class="command-bar" aria-label="Spell controls">
  <div class="movement-controls"><button aria-label="Move left" disabled>◀</button><button aria-label="Move right" disabled>▶</button></div>
  <div class="spell-controls" role="group" aria-label="Choose spell">${spells.map((s,i)=>`<button class="spell ${i===0?'selected':''}" data-spell="${i}" aria-pressed="${i===0}"><span class="spell-icon"><svg viewBox="0 0 48 48" aria-hidden="true">${icons[i]}</svg></span><span>${s}</span></button>`).join('')}</div>
  ${dial('angle','ANGLE',45,3,87,'°')}${dial('power','POWER',70,15,100,'%')}
  <button id="fire"><svg viewBox="0 0 48 48" aria-hidden="true"><path d="m10 40 23-23M30 6v6m12 7h-6M18 11l4 4m15 16-4-4" fill="none" stroke="currentColor" stroke-width="4" stroke-linecap="round"/><path d="m30 14 2 7 7 2-7 2-2 7-2-7-7-2 7-2Z" fill="currentColor"/></svg>FIRE</button>
</footer><span id="preview-status" class="sr-only" role="status">Landscape preview. Movement will be available when characters are added.</span>`

function dial(id:string,label:string,value:number,min:number,max:number,unit:string) {
  return `<div class="dial-control"><div class="dial" id="${id}-dial" style="--progress:${(value-min)/(max-min)*270}deg;--rotation:${-135+(value-min)/(max-min)*270}deg"><span class="needle"></span><output id="${id}-value">${value}${unit}</output><input id="${id}" type="range" min="${min}" max="${max}" value="${value}" aria-label="${label.toLowerCase()}"></div><label for="${id}">${label}</label></div>`
}

let selected = 0
const scene = new LandscapeScene()
new Phaser.Game({ type: Phaser.CANVAS, parent:'game-area', backgroundColor:'#111a32', scale:{mode:Phaser.Scale.RESIZE,width:window.innerWidth,height:window.innerHeight},scene:[scene] })
for (const button of document.querySelectorAll<HTMLButtonElement>('.spell')) {
  button.addEventListener('click',()=>{
    selected=Number(button.dataset.spell)
    document.querySelectorAll('.spell').forEach((b,i)=>{b.classList.toggle('selected',i===selected);b.setAttribute('aria-pressed',String(i===selected))})
  })
}
for (const id of ['angle','power']) {
  const input=document.querySelector<HTMLInputElement>(`#${id}`)!
  const update=()=>{
    const progress=(Number(input.value)-Number(input.min))/(Number(input.max)-Number(input.min))
    const element=document.querySelector<HTMLElement>(`#${id}-dial`)!
    element.style.setProperty('--progress',`${progress*270}deg`)
    element.style.setProperty('--rotation',`${-135+progress*270}deg`)
    document.querySelector(`#${id}-value`)!.textContent=input.value+(id==='angle'?'°':'%')
  }
  input.addEventListener('input',update)
  const element=document.querySelector<HTMLElement>(`#${id}-dial`)!
  const setFromPointer=(e:PointerEvent)=>{
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
document.querySelector('#fire')!.addEventListener('click',()=>{
  scene.previewImpact(selected,Number(document.querySelector<HTMLInputElement>('#power')!.value))
  document.querySelector('#preview-status')!.textContent=`${spells[selected]} impact preview`
})
