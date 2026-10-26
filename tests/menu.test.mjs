import test from 'node:test'
import assert from 'node:assert/strict'
import { MenuNavigation } from '../src/app/menu-state.ts'
import { menuMarkup } from '../src/app/menu-view.ts'

test('New Game goes through setup, and Back returns without creating a match',()=>{
  const nav=new MenuNavigation()
  assert.equal(nav.view,'main');assert.equal(nav.start(),false);assert.equal(nav.resume(),false)
  nav.setup();assert.equal(nav.view,'setup');assert.equal(nav.hasMatch,false)
  nav.back();assert.equal(nav.view,'main');assert.equal(nav.hasMatch,false)
})
test('pause and setup back preserve a match, while returning to main abandons resume',()=>{
  const nav=new MenuNavigation();nav.setup();assert.equal(nav.start(),true)
  assert.equal(nav.view,'battle');assert.equal(nav.hasMatch,true)
  nav.pause();assert.equal(nav.view,'pause')
  nav.setup();nav.back();assert.equal(nav.view,'pause');assert.equal(nav.hasMatch,true)
  assert.equal(nav.resume(),true);assert.equal(nav.view,'battle')
  nav.pause();nav.main();assert.equal(nav.view,'main');assert.equal(nav.hasMatch,false)
  assert.equal(nav.resume(),false)
})
test('the main menu has three actions and setup/pause own their respective controls',()=>{
  const html=menuMarkup('background.webp','hero.webp','title.webp')
  const main=html.slice(html.indexOf('<section id="main-view"'),html.indexOf('<section id="setup-view"'))
  assert.equal((main.match(/<button /g)||[]).length,3)
  assert.match(main,/id="new-game"/);assert.match(main,/id="open-options"/);assert.match(main,/id="exit-game"/)
  assert.doesNotMatch(main,/CONTINUE|RESUME|data-mode|data-count|data-ship/)
  const setup=html.slice(html.indexOf('<section id="setup-view"'),html.indexOf('<section id="pause-view"'))
  assert.equal((setup.match(/data-mode=/g)||[]).length,2)
  assert.equal((setup.match(/data-count=/g)||[]).length,3)
  assert.equal((setup.match(/data-difficulty=/g)||[]).length,3)
  assert.equal((setup.match(/data-ship=/g)||[]).length,4)
  assert.match(setup,/id="setup-back"/);assert.match(setup,/id="start-battle"/)
  assert.match(html.slice(html.indexOf('<section id="pause-view"')),/id="resume-game"/)
})
