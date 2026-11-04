import test from 'node:test'
import assert from 'node:assert/strict'
import { Rooms, RECONNECT_MS } from '../server/rooms.ts'
import { Simulation } from '../server/simulation.ts'
import { validCommand } from '../server/index.ts'
import { SPELLS } from '../src/game/spells.ts'
import { STEP_SECONDS } from '../src/game/projectile.ts'

function setup(count=2){const rooms=new Rooms(),host=rooms.create('Host',count,0,'s0');const guests=Array.from({length:count-1},(_,i)=>rooms.join(host.lobby.code,`Guest ${i}`,i+1,`s${i+1}`));for(let i=0;i<count;i++)rooms.ready(`s${i}`,true,i);return {rooms,host,guests}}
function ready(sim:Simulation){for(let i=0;i<400&&sim.match.phase!=='MovementAiming';i++)sim.step(i*STEP_SECONDS*1000,false);assert.equal(sim.match.phase,'MovementAiming')}
const fireCommand=(sim:Simulation,seq=0,spell=0)=>({kind:'fire' as const,seq,turn:sim.turn,matchId:sim.id,angle:-Math.PI/4,power:.6,spell})

test('2–4 players: slots, readiness, host-only start, full-room joins and start races',()=>{
  for(const count of [2,3,4]){
    const {rooms,host}=setup(count)
    assert.throws(()=>rooms.join(host.lobby.code,'Extra',0,'extra'),/full/)
    assert.throws(()=>rooms.start('s1'),/creator/)
    const r=rooms.start('s0');assert.equal(r.simulation!.match.players.length,count)
    assert.throws(()=>rooms.start('s0'),/ready/)
    assert.throws(()=>rooms.join(host.lobby.code,'Extra',0,'extra'),/started/)
  }
})
test('ship/membership changes reset ready; creator departure transfers ownership and reuses slots',()=>{
  const {rooms}=setup(3)
  rooms.ready('s1',false,3)
  assert.ok(rooms.find('s0').room.sessions.every(s=>!s.member.ready))
  const r=rooms.leave('s0');assert.equal(r.host,r.sessions[0].member.id)
  const joined=rooms.join(r.code,'Replacement',0,'new');assert.equal(joined.lobby.members.find(m=>m.id===joined.memberId)!.slot,0)
  for(const s of r.sessions)rooms.ready(s.socketId!,true,s.member.ship)
  rooms.start('s1');assert.deepEqual(r.sessions.map(s=>s.member.slot),[0,1,2])
})
test('room isolation, out-of-turn commands, duplicate fire and stale match IDs',()=>{
  const {rooms}=setup();const other=rooms.create('Other',2,0,'other')
  const r=rooms.start('s0'),sim=r.simulation!;ready(sim)
  const command=fireCommand(sim)
  assert.equal(rooms.command('other',command),false)
  assert.equal(rooms.command('s1',command),false)
  assert.equal(rooms.command('s0',{...command,matchId:'old'}),false)
  assert.equal(rooms.command('s0',{...command,seq:1}),true)
  assert.equal(rooms.command('s0',{...command,seq:1}),false)
  assert.equal(sim.events.filter(e=>e.kind==='shot').length,1)
  assert.equal(rooms.rooms.get(other.lobby.code)!.simulation,undefined)
})
test('disconnect pauses at safe boundary, reserves token, resumes with full state and sequence',()=>{
  const {rooms,host}=setup();const r=rooms.start('s0'),sim=r.simulation!;ready(sim)
  rooms.command('s0',{...fireCommand(sim,42),kind:'input',axis:1})
  const x=sim.match.players[0].x
  rooms.disconnect('s0',1000);assert.equal(rooms.waiting(r),true)
  sim.step(1050,true);assert.equal(sim.match.players[0].x,x)
  assert.throws(()=>rooms.resume(r.code,'bad','replacement',1500),/expired/)
  const welcome=rooms.resume(r.code,host.token,'replacement',1500)
  assert.ok(welcome.frame?.terrain);assert.equal(welcome.nextSeq,43);assert.equal(rooms.waiting(r),false)
  assert.throws(()=>rooms.resume(r.code,host.token,'hijack',1500),/connected/)
})
test('volley finishes while disconnected, timeout forfeits and winner resolves',()=>{
  const {rooms}=setup();const r=rooms.start('s0'),sim=r.simulation!;ready(sim)
  assert.equal(sim.command(0,fireCommand(sim),0),true)
  rooms.disconnect('s1',1000)
  for(let i=0;i<3000&&sim.match.phase!=='WinnerCheck';i++)sim.step(1000+i*9,true)
  assert.equal(sim.shots.length,0)
  rooms.sweep(1000+RECONNECT_MS)
  for(let i=0;i<400&&sim.match.phase!=='GameOver';i++)sim.step(40000,false)
  assert.equal(sim.match.phase,'GameOver');assert.equal(sim.match.outcome,'Player 1 wins')
})
test('all weapon volleys resolve, terrain revisions and status damage remain authoritative',()=>{
  for(let spell=0;spell<SPELLS.length;spell++){
    const sim=new Simulation(2,123);ready(sim)
    // Land a low shot on the adjacent opponent to exercise every damage effect.
    const p=sim.match.players[0],target=sim.match.players[1]
    target.x=p.x+70;target.y=p.y
    assert.equal(sim.command(0,{...fireCommand(sim,0,spell),angle:-.1,power:.15},0),true)
    for(let i=0;i<4000&&sim.turn===0&&sim.match.phase!=='GameOver';i++)sim.step(i*9,false)
    assert.ok(sim.events.some(e=>e.kind==='impact'))
    assert.ok(sim.turn>0||sim.match.phase==='GameOver')
    assert.equal(sim.shots.length,0)
    if(SPELLS[spell].destroyTerrain)assert.ok(sim.match.terrain.revision>0)
    else assert.equal(sim.match.terrain.revision,0)
    assert.ok(sim.match.players.some(p=>p.health<100)||sim.match.poisons.length>0)
  }
})
test('support consumes unlock and server rejects premature or invalid commands',()=>{
  const sim=new Simulation(2,123);ready(sim)
  const c={kind:'support' as const,choice:'shield' as const,seq:0,turn:sim.turn,matchId:sim.id}
  assert.equal(sim.command(0,c,0),false)
  sim.match.support[0].ready=true
  assert.equal(sim.command(0,c,0),true);assert.equal(sim.match.players[0].shield,20)
  assert.equal(sim.command(0,c,0),false)
  assert.equal(validCommand({...fireCommand(sim),power:NaN}),false)
  assert.equal(validCommand({...fireCommand(sim),spell:4}),false)
  assert.equal(validCommand({...fireCommand(sim),kind:'input',axis:2}),false)
  assert.equal(validCommand({...fireCommand(sim),kind:'support',choice:'cheat'}),false)
  assert.equal(validCommand(null),false)
})
test('state snapshots omit device state; terrain is optional, isolated and complete on resume',()=>{
  const sim=new Simulation(2),full=sim.frame(),delta=sim.frame(false,false)
  assert.ok(full.terrain);assert.equal(delta.terrain,undefined)
  assert.equal('cameraX' in full.state,false);assert.equal('pointerId' in full.state,false)
  full.state.players[0].health=0;assert.equal(sim.match.players[0].health,100)
})
test('abandoned lobbies expire and empty rooms are removed',()=>{
  const rooms=new Rooms(),host=rooms.create('Host',2,0,'s0')
  rooms.leave('s0');assert.equal(rooms.rooms.size,0)
  rooms.create('Host',2,0,'s0');rooms.sweep(Date.now()+31*60_000);assert.equal(rooms.rooms.size,0)
  assert.throws(()=>rooms.join(host.lobby.code,'Guest',0,'s1'),/expired/)
})

test('each of 2–4 players completes a server-authoritative turn; stale turns cannot fire',()=>{
  for(const count of [2,3,4]){
    const sim=new Simulation(count,123);ready(sim)
    for(let slot=0;slot<count;slot++){
      assert.equal(sim.match.active,slot)
      const command={...fireCommand(sim,slot),angle:-Math.PI/2}
      assert.equal(sim.command(slot,command,0),true)
      for(let i=0;i<4000&&(sim.turn===command.turn||sim.match.phase!=='MovementAiming');i++)sim.step(i*9,false)
      assert.equal(sim.turn,command.turn+1)
      assert.equal(sim.command(sim.match.active,{...command,seq:100},0),false)
    }
    assert.equal(sim.match.active,0)
  }
})

test('movement expires after 300 ms and an inactive forfeit preserves the current turn',()=>{
  const sim=new Simulation(3,123);ready(sim)
  const p=sim.match.players[0],x=p.x
  assert.equal(sim.command(0,{...fireCommand(sim),kind:'input',axis:1},1000),true)
  for(let i=0;i<20;i++)sim.step(1050,false)
  assert.ok(p.x>x)
  const stopped=p.x
  for(let i=0;i<20;i++)sim.step(1400,false)
  assert.equal(p.x,stopped)
  sim.forfeit(2);assert.equal(sim.match.active,0);assert.equal(sim.match.phase,'MovementAiming')
})
