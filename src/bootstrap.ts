import './menu.css'
import './scenery.css'
import { backgroundMarkup } from './background.ts'
import { SHIPS, shipPortrait } from './ships.ts'
import { readPreferences, savePreferences } from './preferences.ts'
import { withDeadline, remainingLoadingTime } from './startup.ts'
import { GameAudio, SFX_ASSETS } from './audio.ts'
import logoUrl from '../assets/loading/alien-war-logo.png'
import backgroundUrl from '../assets/loading/alien-war-background.png'

const app = document.querySelector<HTMLElement>('#app')!
const overlay = document.querySelector<HTMLElement>('#loading-screen')!
const status = document.querySelector<HTMLElement>('#loading-status')!
const settings = readPreferences()
const audio = new GameAudio(settings)
let engine: typeof import('./main.ts') | undefined
let starting = false
let hasMatch = false
let opening = true
let engineReady = false
let openedAt = 0
let introStarted = false
const loadingDuration = 15_000
const menu = document.createElement('section')
menu.id = 'main-menu-screen'
menu.setAttribute('aria-label', 'Alien War main menu')
menu.innerHTML = `${backgroundMarkup()}<div class="menu-ground" aria-hidden="true"></div>
  <div class="menu-layout">
    <div class="menu-navigation"><h1 class="menu-title"><span>ALIEN</span><b>WAR</b></h1>
      <button id="new-game" class="menu-button primary">▶ NEW GAME</button>
      <button id="continue-game" class="menu-button" hidden>▶ CONTINUE</button>
      <button id="open-options" class="menu-button">⚙ OPTIONS</button>
      <button id="exit-game" class="menu-button">↪ EXIT</button>
    </div>
    <div class="menu-selection"><div id="hero-ship" aria-hidden="true"></div><div class="hover-rings" aria-hidden="true"></div>
      <h2>CHOOSE YOUR SHIP</h2><div class="ship-picker"><button id="previous-ship" aria-label="Previous ship">❮</button><strong id="selected-ship" aria-live="polite"></strong><button id="next-ship" aria-label="Next ship">❯</button></div>
      <div class="ship-choices" role="group" aria-label="Player 1 ship">${SHIPS.map((ship,i)=>`<button data-ship="${i}" aria-label="Choose ${ship.name}" aria-pressed="false">${shipPortrait(i)}<span>${ship.name}</span></button>`).join('')}</div>
      <label class="local-players">LOCAL PLAYERS <select id="menu-players"><option value="2">2 players</option><option value="3">3 players</option><option value="4">4 players</option></select></label>
      <p class="menu-note">Your ship is Player 1. Other players use the remaining ships.</p>
    </div>
  </div>
  <dialog id="audio-options" aria-labelledby="options-title"><div class="options-heading"><h2 id="options-title">OPTIONS</h2><button id="close-options" aria-label="Close options">×</button></div>
    <label class="sound-setting">SOUND <input id="sound-enabled" type="checkbox" role="switch"><span id="sound-label"></span></label>
    <label class="volume-setting" for="music-volume">MUSIC VOLUME <output id="music-value" for="music-volume"></output></label><input id="music-volume" type="range" min="0" max="100" step="1">
    <label class="volume-setting" for="sfx-volume">SFX VOLUME <output id="sfx-value" for="sfx-volume"></output></label><input id="sfx-volume" type="range" min="0" max="100" step="1">
  </dialog>
  <dialog id="exit-dialog" aria-labelledby="exit-title"><h2 id="exit-title">LEAVE THE GAME?</h2><p>You can close this browser tab to exit.</p><button id="stay-game" class="menu-button primary">BACK TO MENU</button></dialog>`
document.body.append(menu)
const get = <T extends HTMLElement>(selector: string) => document.querySelector<T>(selector)!
const options = get<HTMLDialogElement>('#audio-options')
const exitDialog = get<HTMLDialogElement>('#exit-dialog')

function updateSelection() {
  const ship = SHIPS[settings.ship]
  get('#hero-ship').innerHTML = shipPortrait(settings.ship)
  get('#hero-ship').style.setProperty('--ship-color', '#'+ship.color.toString(16))
  get('#selected-ship').textContent = ship.name
  menu.querySelectorAll<HTMLButtonElement>('[data-ship]').forEach(button => button.setAttribute('aria-pressed', String(Number(button.dataset.ship) === settings.ship)))
  get<HTMLSelectElement>('#menu-players').value = String(settings.players)
  savePreferences(settings)
}
function updateAudio() {
  get<HTMLInputElement>('#sound-enabled').checked = settings.sound
  get('#sound-label').textContent = settings.sound ? 'ON' : 'OFF'
  for(const key of ['music','sfx'] as const) {
    get<HTMLInputElement>(`#${key}-volume`).value = String(settings[key])
    get(`#${key}-value`).textContent = `${settings[key]}%`
  }
  audio.update(settings); savePreferences(settings)
}
function menuVisible(visible: boolean) {
  menu.hidden = !visible
  app.inert = visible
  app.setAttribute('aria-hidden', String(visible))
  if(visible) get('#new-game').focus()
  else get<HTMLButtonElement>('#main-menu')?.focus()
}
// Capture gameplay keys only while a menu/loading layer is present. Preserve Tab,
// Enter and range-input keyboard behavior inside the menu and native dialogs.
window.addEventListener('keydown', event => {
  if(!menu.hidden || !overlay.hidden) {
    if(event.key === 'Escape' && menu.hidden && !starting && !opening) showMenu()
    event.stopPropagation()
  }
}, true)
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
function showMenu() {
  if(engineReady)engine?.pauseMatch()
  audio.setScene('menu')
  get<HTMLButtonElement>('#continue-game').hidden = !hasMatch
  menuVisible(true)
}
async function newGame() {
  if(starting || opening)return
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
    engine.startMatch(settings.ship,settings.players)
    engine.pauseMatch()
    progress(100,'Ready for battle')
    await new Promise(resolve=>window.setTimeout(resolve,250))
    menu.inert = false; menuVisible(false)
    overlay.hidden = true; overlay.setAttribute('aria-busy','false')
    engine.resumeMatch(); hasMatch = true
    get('#main-menu').addEventListener('click', showMenu, {once:true})
  } catch(error) {
    console.error('Game startup failed', error)
    status.textContent = 'Unable to start. Retry or return to menu.'
    get<HTMLButtonElement>('#loading-retry').hidden = false
    get<HTMLButtonElement>('#loading-back').hidden = false
    overlay.setAttribute('aria-busy','false')
  } finally { starting = false; menu.inert = false }
}
get('#new-game').addEventListener('click',()=>void newGame())
get('#continue-game').addEventListener('click',()=>{
  audio.unlock(); audio.setScene('battle'); audio.click(); menuVisible(false);engine?.resumeMatch()
  get('#main-menu').addEventListener('click',showMenu,{once:true})
})
get('#open-options').addEventListener('click',()=>{ audio.unlock(); audio.click();options.showModal() })
get('#close-options').addEventListener('click',()=>{audio.click();options.close()})
get('#exit-game').addEventListener('click',()=>{audio.stop();exitDialog.showModal()})
get('#stay-game').addEventListener('click',()=>{exitDialog.close();audio.unlock();audio.setScene('menu')})
get('#previous-ship').addEventListener('click',()=>selectShip((settings.ship+3)%4))
get('#next-ship').addEventListener('click',()=>selectShip((settings.ship+1)%4))
function selectShip(index:number) { settings.ship=index;updateSelection();audio.unlock();audio.character() }
menu.querySelectorAll<HTMLButtonElement>('[data-ship]').forEach(button=>button.addEventListener('click',()=>selectShip(Number(button.dataset.ship))))
get<HTMLSelectElement>('#menu-players').addEventListener('change',event=>{settings.players=Number((event.target as HTMLSelectElement).value);savePreferences(settings)})
get('#sound-enabled').addEventListener('change',event=>{settings.sound=(event.target as HTMLInputElement).checked;audio.unlock();updateAudio();audio.click()})
for(const key of ['music','sfx'] as const)get(`#${key}-volume`).addEventListener('input',event=>{settings[key]=Number((event.target as HTMLInputElement).value);audio.unlock();updateAudio();if(key==='sfx')audio.click()})
window.addEventListener('alien-war-shot',()=>audio.shot())
window.addEventListener('alien-war-electric-impact',()=>audio.electricImpact())
window.addEventListener('alien-war-poison-impact',()=>audio.poisonImpact())
get('#loading-retry').addEventListener('click',()=>window.location.reload())
get('#loading-back').addEventListener('click',()=>{opening=false;audio.setScene('menu');audio.finishLoading();overlay.hidden=true;showMenu()})
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
    'electric_weapon_16.png',
    'ice_missile_spritesheet.svg','poison_missile_spritesheet.svg',
    'electric_missile_spritesheet.svg','fire_cluster_spritesheet.svg',
    'ice.jpeg','poison.jpeg','electric.jpeg','fire.jpeg',
  ]
  const total=assets.length+3+SFX_ASSETS.length
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
    const urls=[...assets.map(path=>`${import.meta.env.BASE_URL}assets/${path}`),...SFX_ASSETS]
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
    menu.inert=false;menuVisible(true)
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


