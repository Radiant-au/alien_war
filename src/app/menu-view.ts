import { SHIPS } from '../rendering/ships.ts'
const icon=(name:'play'|'gear'|'exit'|'back'|'people'|'robot'|'arrow'|'resume')=>{
  const paths={
    play:'<path d="M12 6 32 20 12 34Z" fill="currentColor" stroke="none"/>',
    gear:'<path d="m17 4-1 5-4 2-5-1-3 6 4 4-1 5 5 3 2 6 7 1 2-5 5-1 5-5-2-6 2-5-6-4-5 1Z" fill="currentColor" stroke="none"/><circle cx="19" cy="20" r="6" fill="#102544" stroke="none"/>',
    exit:'<path d="M17 6H6v28h11M13 20h21m-8-9 9 9-9 9"/>',
    back:'<path d="m25 8-12 12 12 12"/>',
    arrow:'<path d="m14 8 12 12-12 12"/>',
    people:'<circle cx="13" cy="11" r="6" fill="currentColor" stroke="none"/><circle cx="29" cy="11" r="6" fill="currentColor" stroke="none"/><path d="M3 33v-8q10-12 20 0v8Zm19 0v-8q7-12 17 0v8Z" fill="currentColor" stroke="none"/>',
    robot:'<rect x="6" y="12" width="28" height="23" rx="7"/><path d="M20 4v8M2 20v8m36-8v8"/><circle cx="20" cy="4" r="2" fill="currentColor"/><circle cx="14" cy="23" r="2" fill="currentColor"/><circle cx="26" cy="23" r="2" fill="currentColor"/>',
    resume:'<path d="M7 7v26M16 7l19 13-19 13Z"/>',
  }
  return `<svg viewBox="0 0 40 40" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">${paths[name]}</svg>`
}
export function menuMarkup(background:string,hero:string,logo:string,shipArt:readonly string[]){return `
<img class="menu-backdrop" src="${background}" alt="" aria-hidden="true" decoding="async">
<div class="menu-vignette" aria-hidden="true"></div>
<div class="menu-sparks" aria-hidden="true">${[0,1,2,3,4,5,6,7].map(i=>`<i style="--x:${8+i*12}%;--y:${8+(i*13)%36}%;--delay:${i*.7}s"></i>`).join('')}</div>
<section id="main-view" class="menu-page main-page" aria-label="Main menu">
  <div class="main-navigation">
    <h1 class="menu-logo"><img src="${logo}" alt="Alien War" width="1760" height="896"></h1>
    <div class="main-buttons">
      <button id="new-game" class="menu-button primary">${icon('play')}<span>NEW GAME</span></button>
      <button id="open-options" class="menu-button">${icon('gear')}<span>OPTIONS</span></button>
      <button id="exit-game" class="menu-button">${icon('exit')}<span>EXIT</span></button>
    </div>
  </div>
  <div class="main-hero" aria-hidden="true"><img src="${hero}" alt="" width="1672" height="941"><div class="hero-rings"><i></i><i></i><i></i></div></div>
</section>
<section id="setup-view" class="menu-page setup-page" aria-labelledby="setup-title" hidden>
  <header class="setup-header"><button id="setup-back" class="back-button">${icon('back')}BACK</button><div><p>ALIEN WAR</p><h2 id="setup-title">MATCH SETUP</h2></div></header>
  <div class="setup-panels">
    <section class="setup-card setup-settings" aria-label="Match settings">
      <div class="setting-block"><h3 id="mode-heading">GAME MODE</h3><div class="mode-choices" role="group" aria-labelledby="mode-heading">
        <button data-mode="local" class="choice mode-card">${icon('people')}<span>LOCAL</span></button>
        <button data-mode="ai" class="choice mode-card">${icon('robot')}<span>VS AI</span></button>
      </div><p class="setting-caption" id="mode-note"></p></div>
      <div class="setting-block"><h3 id="players-label">PLAYERS</h3><div class="count-choices" role="group" aria-labelledby="players-label">${[2,3,4].map(count=>`<button class="choice" data-count="${count}"></button>`).join('')}</div><p class="setting-caption" id="total-ships"></p></div>
      <div class="setting-block difficulty-block" id="difficulty-setting"><h3 id="difficulty-heading">DIFFICULTY</h3><div class="difficulty-choices" role="group" aria-labelledby="difficulty-heading">${['easy','normal','hard'].map(level=>`<button class="choice" data-difficulty="${level}">${level.toUpperCase()}</button>`).join('')}</div></div>
    </section>
    <section class="setup-card setup-ships" aria-label="Choose your ship"><h3>CHOOSE YOUR SHIP</h3>
      <div id="hero-ship" class="setup-hero" aria-hidden="true"></div><div class="setup-hover-ring" aria-hidden="true"></div>
      <h4 id="selected-ship" aria-live="polite"></h4>
      <div class="ship-choices" role="group" aria-label="Player 1 ship">${SHIPS.map((ship,i)=>`<button class="choice" data-ship="${i}" aria-label="Choose ${ship.name}"><img src="${shipArt[i]}" alt="" width="256" height="144"><span>${ship.name}</span></button>`).join('')}</div>
    </section>
  </div>
  <button id="start-battle" class="menu-button primary start-battle"><span>START BATTLE</span>${icon('arrow')}</button>
</section>
<section id="pause-view" class="menu-page pause-page" aria-labelledby="pause-title" hidden><div class="pause-card setup-card">
  <p class="small-brand">ALIEN WAR</p><h2 id="pause-title">PAUSED</h2>
  <button id="resume-game" class="menu-button primary">${icon('resume')}<span>RESUME</span></button>
  <button id="pause-new-game" class="menu-button">${icon('play')}<span>NEW GAME</span></button>
  <button id="pause-options" class="menu-button">${icon('gear')}<span>OPTIONS</span></button>
  <button id="back-to-main" class="menu-button"><span>BACK TO MAIN MENU</span></button>
</div></section>
<dialog id="audio-options" aria-labelledby="options-title"><div class="options-heading"><h2 id="options-title">OPTIONS</h2><button id="close-options" aria-label="Close options">×</button></div>
  <label class="sound-setting">SOUND <input id="sound-enabled" type="checkbox" role="switch"><span id="sound-label"></span></label>
  <label class="volume-setting" for="music-volume">MUSIC VOLUME <output id="music-value" for="music-volume"></output></label><input id="music-volume" type="range" min="0" max="100" step="1">
  <label class="volume-setting" for="sfx-volume">SFX VOLUME <output id="sfx-value" for="sfx-volume"></output></label><input id="sfx-volume" type="range" min="0" max="100" step="1">
</dialog>
<dialog id="exit-dialog" aria-labelledby="exit-title"><h2 id="exit-title">LEAVE THE GAME?</h2><p>You can close this browser tab to exit.</p><button id="stay-game" class="menu-button primary">BACK TO MENU</button></dialog>`}
