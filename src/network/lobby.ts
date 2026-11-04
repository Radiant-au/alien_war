import { OnlineClient } from './client.ts'
import { SHIP_ART } from '../app/menu-assets.ts'
import { SHIPS } from '../rendering/ships.ts'
import type { Frame } from '../../shared/protocol.ts'
import type { LandscapeScene } from '../rendering/landscape-scene.ts'
import '../styles/online.css'

export function mountOnline(parent:HTMLElement,hooks:{open:()=>void;battle:(frame:Frame,client:OnlineClient)=>Promise<LandscapeScene>;main:()=>void}){
  const client=new OnlineClient()
  let scene:LandscapeScene|undefined
  let starting=false
  let pending:Frame|undefined
  let busy=false
  let ship=0
  const panel=document.createElement('section');panel.id='online-view';panel.className='menu-page online-page';panel.hidden=true
  panel.innerHTML=`<div class="online-card setup-card"><header><button id="online-back" class="back-button">← BACK</button><div><p>ALIEN WAR · ONLINE</p><h2>PRIVATE ROOM</h2></div></header>
  <p id="online-status" role="status" aria-live="polite">Connecting…</p>
  <div id="online-entry"><label>YOUR NICKNAME<input id="online-name" maxlength="20" autocomplete="nickname" placeholder="Commander"></label>
  <label>ROOM SIZE<select id="online-capacity"><option value="2">2 players</option><option value="3">3 players</option><option value="4">4 players</option></select></label>
  <button id="online-create" class="menu-button primary">CREATE ROOM</button>
  <div class="online-join"><label>ROOM CODE<input id="online-code" maxlength="6" placeholder="AB7K9Q" autocapitalize="characters" spellcheck="false"></label><button id="online-join" class="menu-button">JOIN ROOM</button></div></div>
  <div id="online-room" hidden><div class="online-invite"><strong id="online-room-code"></strong><button id="online-copy">COPY INVITE LINK</button><button id="online-copy-code">COPY CODE</button></div><p id="online-count"></p><div id="online-members"></div>
  <h3>YOUR SHIP</h3><div class="online-ships">${SHIPS.map((s,i)=>`<button data-online-ship="${i}" aria-label="Choose ${s.name}" aria-pressed="${i===0}"><img src="${SHIP_ART[i]}" alt="">${s.name}</button>`).join('')}</div>
  <div class="online-actions"><button id="online-ready" class="menu-button">READY</button><button id="online-start" class="menu-button primary">START MATCH</button></div><p id="online-help">Waiting for players</p></div></div>`
  parent.append(panel)
  const el=<T extends HTMLElement>(id:string)=>panel.querySelector<T>(`#online-${id}`)!
  const status=(message:string)=>{el('status').textContent=message}
  const run=async(task:()=>Promise<unknown>)=>{if(busy)return;busy=true;render();try{await task()}catch(e){status(e instanceof Error?e.message:'Request failed.')}finally{busy=false;render()}}
  function render(){
    const room=client.lobby,me=room?.members.find(p=>p.id===client.memberId)
    el('entry').hidden=!!room;el('room').hidden=!room
    for(const id of ['create','join'])el<HTMLButtonElement>(id).disabled=busy||!client.connected
    if(!room)return
    if(me)ship=me.ship
    el('room-code').textContent=room.code
    el('count').textContent=`${room.members.length} / ${room.capacity} players · ${room.status==='lobby'?'Lobby':room.status==='finished'?'Battle complete':'In battle'}`
    el('members').replaceChildren(...room.members.map(p=>{
      const row=document.createElement('div');row.className='online-member'
      const name=document.createElement('strong');name.textContent=`${p.name}${p.id===room.host?' · HOST':''}${p.id===client.memberId?' · YOU':''}`
      const state=document.createElement('span');state.textContent=`${SHIPS[p.ship].name} · ${!p.connected?'RECONNECTING':p.ready?'READY':'NOT READY'}`
      row.append(name,state);return row
    }))
    el('ready').textContent=me?.ready?'UNREADY':'READY'
    el<HTMLButtonElement>('ready').disabled=busy||!client.connected||!me||room.status!=='lobby'
    el('start').hidden=room.host!==client.memberId
    el<HTMLButtonElement>('start').disabled=busy||!client.connected||room.status!=='lobby'||room.members.length!==room.capacity||room.members.some(p=>!p.ready||!p.connected)
    el('help').textContent=room.status!=='lobby'?'Match in progress':room.members.length<room.capacity?'Share the invite to fill the remaining slots.':room.members.some(p=>!p.ready)?'Everyone must press Ready.':'All ready. The room creator can start.'
    panel.querySelectorAll<HTMLButtonElement>('[data-online-ship]').forEach(b=>{b.setAttribute('aria-pressed',String(Number(b.dataset.onlineShip)===ship));b.disabled=busy||room.status!=='lobby'||!client.connected})
  }
  client.onStatus=message=>{status(message);render();scene?.setOnlineConnected(client.connected)}
  client.onClosed=()=>{scene?.disconnectOnline();scene=undefined;hooks.open();render()}
  client.onRoom=room=>{render();if(room.status==='lobby'){pending=undefined;client.frame=undefined;if(scene){scene.disconnectOnline();scene=undefined;hooks.open()}}else if(scene)scene.onlineNames=Object.fromEntries(room.members.map(p=>[p.slot,p.name]))}
  client.onFrame=(frame,initial)=>{
    pending=frame
    if(starting)return
    if(initial||!scene){
      starting=true
      void hooks.battle(frame,client).then(s=>{scene=s;scene.setOnlineConnected(client.connected);scene.receiveOnlineFrame(pending??frame,true)}).catch(e=>status(`Unable to open battle: ${e.message}`)).finally(()=>{starting=false})
    }else scene.receiveOnlineFrame(frame)
  }
  const values=()=>({name:el<HTMLInputElement>('name').value.trim(),ship})
  el('create').onclick=()=>void run(()=>client.enter('create',{...values(),capacity:Number(el<HTMLSelectElement>('capacity').value)}))
  el('join').onclick=()=>void run(()=>client.enter('join',{...values(),code:el<HTMLInputElement>('code').value.trim().toUpperCase()}))
  el('ready').onclick=()=>void run(()=>client.request('ready',{ready:!client.lobby?.members.find(m=>m.id===client.memberId)?.ready,ship}))
  el('start').onclick=()=>void run(()=>client.request('start'))
  const invite=()=>{const url=new URL(location.href);url.search='';url.searchParams.set('room',client.lobby!.code);url.hash='';return url.href}
  for(const [id,value]of [['copy',invite],['copy-code',()=>client.lobby!.code]] as const)el(id).onclick=()=>void run(async()=>{try{await navigator.clipboard.writeText(value());status('Copied!')}catch{status(`Copy this: ${value()}`)}})
  panel.querySelectorAll<HTMLButtonElement>('[data-online-ship]').forEach(b=>b.onclick=()=>void run(async()=>{ship=Number(b.dataset.onlineShip);await client.request('ready',{ship,ready:false})}))
  el('back').onclick=()=>void run(async()=>{await client.leave();scene?.disconnectOnline();scene=undefined;hooks.main()})
  const code=new URL(location.href).searchParams.get('room');if(code)el<HTMLInputElement>('code').value=code.slice(0,6)
  return {
    client,
    open(){hooks.open();client.connect();render()},
    hasInvite:!!code,
    async leave(){await client.leave();scene?.disconnectOnline();scene=undefined},
    async returnToLobby(){try{if(client.lobby?.status==='finished')await client.request('lobby');hooks.open();render()}catch(e){status(e instanceof Error?e.message:'Unable to return to lobby.');hooks.open()}},
  }
}
