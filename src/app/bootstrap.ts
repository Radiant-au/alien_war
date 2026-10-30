import '../styles/menu.css'
import '../styles/scenery.css'
import { SHIPS } from '../rendering/ships.ts'
import { menuMarkup } from './menu-view.ts'
import { MenuNavigation } from './menu-state.ts'
import menuBackgroundUrl from '../../assets/menu/planet-menu.webp'
import { SHIP_ART } from './menu-assets.ts'
import menuLogoUrl from '../../assets/menu/alien-war-title.webp'
import { readPreferences, savePreferences } from './preferences.ts'
import { withDeadline, remainingLoadingTime } from './startup.ts'
import { GameAudio, SFX_ASSETS } from './audio.ts'
import logoUrl from '../../assets/loading/alien-war-logo.png'
import backgroundUrl from '../../assets/loading/alien-war-background.png'

const menuHeroUrl=SHIP_ART[0]
const app = document.querySelector<HTMLElement>('#app')!
const overlay = document.querySelector<HTMLElement>('#loading-screen')!
const status = document.querySelector<HTMLElement>('#loading-status')!
const settings = readPreferences()
const audio = new GameAudio(settings)
let engine: typeof import('./main.ts') | undefined
let starting = false
const navigation = new MenuNavigation()
let opening = true
let engineReady = false
let openedAt = 0
let introStarted = false
const loadingDuration = 15_000
const menu = document.createElement('section')
menu.id = 'main-menu-screen'
menu.setAttribute('aria-label', 'Alien War main menu')
menu.innerHTML = menuMarkup(menuBackgroundUrl,menuHeroUrl,menuLogoUrl,SHIP_ART)
document.body.append(menu)
const get = <T extends HTMLElement>(selector: string) => document.querySelector<T>(selector)!
const options = get<HTMLDialogElement>('#audio-options')
const exitDialog = get<HTMLDialogElement>('#exit-dialog')

function updateSelection() {
  const ship=SHIPS[settings.ship]
  get('#hero-ship').innerHTML=`<img src="${SHIP_ART[settings.ship]}" alt="" width="1672" height="941">`
  get('#selected-ship').textContent=ship.name.toUpperCase()
  for(const [attribute,value] of [['ship',settings.ship],['mode',settings.mode],['count',settings.players],['difficulty',settings.difficulty]] as const){
    menu.querySelectorAll<HTMLButtonElement>(`[data-${attribute}]`).forEach(button=>button.setAttribute('aria-pressed',String(button.getAttribute(`data-${attribute}`)===String(value))))
  }
  get('#difficulty-setting').hidden=settings.mode!=='ai'
  get('#players-label').textContent=settings.mode==='ai'?'OPPONENTS':'PLAYERS'
  menu.querySelectorAll<HTMLButtonElement>('[data-count]').forEach(button=>{
    const count=Number(button.dataset.count);button.textContent=settings.mode==='ai'?`${count-1} AI`:`${count} PLAYERS`
  })
  get('#mode-note').textContent=settings.mode==='ai'?'You vs computer opponents':'Pass and play on one device'
  get('#total-ships').textContent=`${settings.players} ships total · ${settings.mode==='ai'?'You are Player 1':'Everyone takes turns'}`
  savePreferences(settings)
}
function updateAudio() {
  get<HTMLInputElement>('#music-boost').checked=settings.musicBoost
  get<HTMLInputElement>('#sound-enabled').checked = settings.sound
  get('#sound-label').textContent = settings.sound ? 'ON' : 'OFF'
  for(const key of ['music','sfx'] as const) {
    get<HTMLInputElement>(`#${key}-volume`).value = String(settings[key])
    get(`#${key}-value`).textContent = `${settings[key]}%`
  }
  audio.update(settings); savePreferences(settings)
}
function renderNavigation() {
  const view=navigation.view,visible=view!=='battle'
  menu.dataset.view=view;menu.hidden=!visible;menu.inert=false
  for(const name of ['main','setup','pause','result'])get(`#${name}-view`).hidden=view!==name
  app.inert=visible;app.setAttribute('aria-hidden',String(visible))
  if(visible){audio.setScene('menu');get(view==='result'?'#play-again':view==='setup'?'#setup-back':view==='pause'?'#resume-game':'#new-game').focus()}
  else{audio.setScene('battle');get<HTMLButtonElement>('#main-menu')?.focus()}
}
function showMain(){
  engine?.pauseMatch();navigation.main();renderNavigation()
}
function showSetup(){
  if(opening||starting)return
  engine?.pauseMatch();audio.unlock();audio.click();navigation.setup();updateSelection();renderNavigation()
}
function showPause(){
  if(navigation.view!=='battle')return
  if(!engineReady||!navigation.hasMatch||starting||opening)return
  engine?.pauseMatch();navigation.pause();renderNavigation()
}
function resumeGame(){
  if(!navigation.resume())return
  audio.unlock();audio.click();renderNavigation();engine?.resumeMatch()
}
window.addEventListener('keydown',event=>{
  if(event.key==='Escape'&&!starting&&!opening&&!options.open&&!exitDialog.open){
    if(navigation.view==='battle')showPause()
    else if(navigation.view==='setup'){navigation.back();renderNavigation()}
    else if(navigation.view==='pause')resumeGame()
    event.preventDefault();event.stopPropagation();return
  }
  if(!menu.hidden||!overlay.hidden)event.stopPropagation()
},true)
function progress(value: number, message: string) {
  get('#loading-fill').style.width = `${value}%`
  get('#loading-progress').setAttribute('aria-valuenow', String(Math.round(value)))
  get('#loading-percent').textContent = `${Math.round(value)}%`
  status.textContent = message
}
async function artwork(id: string, url: string) {
  const image = get<HTMLImageElement>(id)
  image.src = url
  try { await withDeadline(image.decode(), 15000) } catch { image.hidden = true }
}
async function newGame() {
  if(starting || opening || navigation.view!=='setup')return
  starting = true; audio.unlock(); audio.setScene('battle'); audio.click()
  get<HTMLButtonElement>('#loading-retry').hidden = true
  get<HTMLButtonElement>('#loading-back').hidden = true
  overlay.hidden = false; overlay.classList.remove('leaving')
  overlay.setAttribute('aria-busy','true'); app.inert = true; menu.inert = true
  try {
    progress(10,'Starting engine...')
    engine ??= await withDeadline(import('./main.ts'), 30000)
    progress(55,'Preparing arena...')
    await engine.gameReady
    engineReady=true
    engine.startMatch(settings.ship,settings.players,settings.mode,settings.difficulty)
    engine.pauseMatch()
    progress(100,'Ready for battle')
    await new Promise(resolve=>window.setTimeout(resolve,250))
    navigation.start();menu.inert=false;renderNavigation()
    overlay.hidden = true; overlay.setAttribute('aria-busy','false')
    engine.resumeMatch()
  } catch(error) {
    console.error('Game startup failed', error)
    status.textContent = 'Unable to start. Retry or return to menu.'
    get<HTMLButtonElement>('#loading-retry').hidden = false
    get<HTMLButtonElement>('#loading-back').hidden = false
    overlay.setAttribute('aria-busy','false')
  } finally { starting = false; menu.inert = false }
}
get('#new-game').addEventListener('click',showSetup)
get('#pause-new-game').addEventListener('click',showSetup)
get('#setup-back').addEventListener('click',()=>{audio.click();navigation.back();renderNavigation()})
get('#start-battle').addEventListener('click',()=>void newGame())
get('#resume-game').addEventListener('click',resumeGame)
get('#back-to-main').addEventListener('click',showMain)
for(const id of ['#open-options','#pause-options'])get(id).addEventListener('click',()=>{audio.unlock();audio.click();options.showModal()})
get('#close-options').addEventListener('click',()=>{audio.click();options.close()})
get('#exit-game').addEventListener('click',()=>{audio.stop();exitDialog.showModal()})
get('#stay-game').addEventListener('click',()=>{exitDialog.close();audio.unlock();audio.setScene('menu')})
exitDialog.addEventListener('cancel',()=>{audio.unlock();audio.setScene('menu')})
menu.querySelectorAll<HTMLButtonElement>('[data-ship]').forEach(button=>button.addEventListener('click',()=>{
  settings.ship=Number(button.dataset.ship);updateSelection();audio.unlock();audio.character()
}))
menu.querySelectorAll<HTMLButtonElement>('[data-mode]').forEach(button=>button.addEventListener('click',()=>{
  settings.mode=button.dataset.mode==='ai'?'ai':'local';updateSelection();audio.unlock();audio.click()
}))
menu.querySelectorAll<HTMLButtonElement>('[data-count]').forEach(button=>button.addEventListener('click',()=>{
  settings.players=Number(button.dataset.count);updateSelection();audio.click()
}))
menu.querySelectorAll<HTMLButtonElement>('[data-difficulty]').forEach(button=>button.addEventListener('click',()=>{
  const value=button.dataset.difficulty;settings.difficulty=value==='easy'?'easy':value==='hard'?'hard':'normal';updateSelection();audio.click()
}))
// The gameplay button is created once by the dynamic engine import.
document.addEventListener('click',event=>{
  if(event.target instanceof Element&&event.target.closest('#main-menu'))showPause()
})
get('#music-boost').addEventListener('change',event=>{settings.musicBoost=(event.target as HTMLInputElement).checked;audio.unlock();updateAudio()})
get('#sound-enabled').addEventListener('change',event=>{settings.sound=(event.target as HTMLInputElement).checked;audio.unlock();updateAudio();audio.click()})
for(const key of ['music','sfx'] as const)get(`#${key}-volume`).addEventListener('input',event=>{settings[key]=Number((event.target as HTMLInputElement).value);audio.unlock();updateAudio();if(key==='sfx')audio.click()})
window.addEventListener('alien-war-shot',event=>audio.shot((event as CustomEvent).detail?.pan??0))
window.addEventListener('alien-war-impact',event=>{
  const detail=(event as CustomEvent).detail;audio.impact(detail?.effect,detail?.pan??0)
})
window.addEventListener('alien-war-turn',()=>audio.turn())
window.addEventListener('alien-war-victory',event=>{
  audio.victory()
  if(navigation.view!=='battle'||!engine)return
  const detail=(event as CustomEvent).detail
  navigation.finish();engine.pauseMatch()
  const winner=detail?.winner as number|undefined
  const defeated=detail?.outcome==='Defeat'
  get('#result-title').textContent=defeated?'DEFEAT':winner===undefined?'DRAW!':`${detail.mode==='ai'&&winner>0?'COMPUTER '+winner:'PLAYER '+(winner+1)} WINS!`
  const ship=winner===undefined?undefined:detail.shipKinds[winner]
  get('#result-ship').innerHTML=ship===undefined?'✦':`<img src="${SHIP_ART[ship]}" alt="">`
  get('#result-caption').textContent=defeated?'Your ship was eliminated. Ready for a rematch?':winner===undefined?'An evenly matched battle':'Nice shot, Commander'
  renderNavigation()
})
get('#play-again').addEventListener('click',()=>{
  if(!engine||!navigation.replay())return
  audio.unlock();audio.click();engine.scene.restart();renderNavigation();engine.resumeMatch()
})
get('#result-main-menu').addEventListener('click',showMain)
get('#loading-retry').addEventListener('click',()=>window.location.reload())
get('#loading-back').addEventListener('click',()=>{opening=false;audio.setScene('menu');audio.finishLoading();overlay.hidden=true;showMain()})
updateSelection();updateAudio()
menu.hidden=true;menu.inert=true;app.inert=true
overlay.setAttribute('aria-busy','false')
progress(0,'Tap to begin')
void Promise.all([artwork('#loading-logo',logoUrl),artwork('#loading-background',backgroundUrl)])
get('#loading-music').addEventListener('click',()=>{
  if(introStarted)return
  introStarted=true
  openedAt=performance.now()
  audio.setScene('loading')
  audio.unlock()
  get('#loading-music').hidden=true
  get('.loading-panel').hidden=false
  overlay.setAttribute('aria-busy','true')
  void loadOpening()
})
// The opening loader owns asset download and engine startup. Its minimum duration
// is presentation time, never presented as additional network download progress.
async function loadOpening(){
  let completed=0
  let failed=false
  let assetsReady=false
  let progressFrame=0
  const assets=[
    'fire_cluster_spritesheet.svg','electric_weapon_16.png',
    'ice_missile_spritesheet.svg','poison_missile_spritesheet.svg',
    'electric_missile_spritesheet.svg',
    'ice.jpeg','poison.jpeg','electric.jpeg','fire.jpeg',
  ]
  const menuAssets=[menuBackgroundUrl,menuLogoUrl,...SHIP_ART]
  const total=assets.length+3+SFX_ASSETS.length+menuAssets.length
  const downloaded=()=>{if(failed)return;completed++;status.textContent=`Downloading assets · ${completed}/${total}`}
  try {
    progress(1,'Downloading assets...')
    const animateProgress=(now:number)=>{
      const elapsed=(now-openedAt)/loadingDuration
      const value=Math.min(99,1+elapsed*98)
      const message=assetsReady?'Preparing launch...':status.textContent||'Loading assets...'
      progress(value,message)
      if(value<99)progressFrame=requestAnimationFrame(animateProgress)
    }
    progressFrame=requestAnimationFrame(animateProgress)
    const artworkTasks=[artwork('#loading-logo',logoUrl),artwork('#loading-background',backgroundUrl)].map(task=>task.then(downloaded))
    const urls=[...assets.map(path=>`${import.meta.env.BASE_URL}assets/${path}`),...SFX_ASSETS,...menuAssets]
    const downloadTasks=urls.map(async path=>{
      const response=await fetch(path,{cache:'force-cache',signal:AbortSignal.timeout(90000)})
      if(!response.ok)throw new Error(`Asset download failed: ${path} (${response.status})`)
      await response.arrayBuffer();downloaded()
    })
    const engineTask=(async()=>{
      engine=await withDeadline(import('./main.ts'),30000)
      await engine.gameReady
      engineReady=true
      engine.pauseMatch();downloaded()
    })()
    await Promise.all([...artworkTasks,...downloadTasks,engineTask])
    assetsReady=true
    status.textContent='Preparing launch...'
    const remaining=remainingLoadingTime(openedAt,performance.now(),loadingDuration)
    if(remaining>0)await new Promise(resolve=>window.setTimeout(resolve,remaining))
    window.cancelAnimationFrame(progressFrame)
    progress(100,'Ready')
    await new Promise(resolve=>window.setTimeout(resolve,300))
    opening=false;audio.setScene('menu');audio.finishLoading()
    overlay.hidden=true;overlay.setAttribute('aria-busy','false')
    get('#loading-music').hidden=true
    menu.inert=false;showMain()
  } catch(error) {
    failed=true
    window.cancelAnimationFrame(progressFrame)
    console.error('Opening asset load failed',error)
    audio.finishLoading()
    status.textContent='Download interrupted. Retry or return to menu.'
    overlay.setAttribute('aria-busy','false')
    get<HTMLButtonElement>('#loading-retry').hidden=false
    get<HTMLButtonElement>('#loading-back').hidden=false
    menu.inert=false
  }
}



