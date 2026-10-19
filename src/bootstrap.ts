import './menu.css'
import { backgroundMarkup } from './background.ts'
import { SHIPS, shipPortrait } from './ships.ts'
import { readPreferences, savePreferences } from './preferences.ts'
import { withDeadline } from './startup.ts'
import { GameAudio } from './audio.ts'
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
    if(event.key === 'Escape' && menu.hidden && !starting) showMenu()
    event.stopPropagation()
  }
}, true)
function progress(value: number, message: string) {
  get('#loading-fill').style.width = `${value}%`
  get('#loading-progress').setAttribute('aria-valuenow', String(value))
  get('#loading-percent').textContent = `${value}%`
  status.textContent = message
}
async function artwork(id: string, url: string) {
  const image = get<HTMLImageElement>(id)
  image.src = url
  try { await withDeadline(image.decode(), 6000) } catch { image.hidden = true }
}
function showMenu() {
  engine?.pauseMatch()
  get<HTMLButtonElement>('#continue-game').hidden = !hasMatch
  menuVisible(true)
}
async function newGame() {
  if(starting)return
  starting = true; audio.unlock(); audio.click()
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
  audio.unlock(); audio.click(); menuVisible(false);engine?.resumeMatch()
  get('#main-menu').addEventListener('click',showMenu,{once:true})
})
get('#open-options').addEventListener('click',()=>{ audio.unlock(); audio.click();options.showModal() })
get('#close-options').addEventListener('click',()=>{audio.click();options.close()})
get('#exit-game').addEventListener('click',()=>{audio.stop();exitDialog.showModal()})
get('#stay-game').addEventListener('click',()=>{exitDialog.close();audio.unlock()})
get('#previous-ship').addEventListener('click',()=>selectShip((settings.ship+3)%4))
get('#next-ship').addEventListener('click',()=>selectShip((settings.ship+1)%4))
function selectShip(index:number) { settings.ship=index;updateSelection();audio.unlock();audio.click() }
menu.querySelectorAll<HTMLButtonElement>('[data-ship]').forEach(button=>button.addEventListener('click',()=>selectShip(Number(button.dataset.ship))))
get<HTMLSelectElement>('#menu-players').addEventListener('change',event=>{settings.players=Number((event.target as HTMLSelectElement).value);savePreferences(settings)})
get('#sound-enabled').addEventListener('change',event=>{settings.sound=(event.target as HTMLInputElement).checked;audio.unlock();updateAudio();audio.click()})
for(const key of ['music','sfx'] as const)get(`#${key}-volume`).addEventListener('input',event=>{settings[key]=Number((event.target as HTMLInputElement).value);audio.unlock();updateAudio();if(key==='sfx')audio.click()})
window.addEventListener('alien-war-shot',()=>audio.shot())
get('#loading-retry').addEventListener('click',()=>window.location.reload())
get('#loading-back').addEventListener('click',()=>{overlay.hidden=true;showMenu()})
updateSelection();updateAudio();audio.start();menuVisible(true)
// Artwork failure cannot prevent the menu from becoming usable. Phaser is loaded
// only on New Game; its event plugins are never read before initialization.
void (async()=>{
  progress(5,'Loading artwork...')
  await Promise.all([artwork('#loading-logo',logoUrl),artwork('#loading-background',backgroundUrl)])
  if(!starting){overlay.hidden=true;overlay.setAttribute('aria-busy','false');get('#new-game').focus()}
})()
