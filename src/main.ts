import Phaser from 'phaser'
import './style.css'
import soilImageUrl from '../assets/terrain.png'
import { EXPLOSION_RADIUS, GRASS_BASE_COLOR, GRASS_HIGHLIGHT_COLOR, GRASS_THICKNESS, GRASS_TUFT_COLOR, PLAYER_HEIGHT, PLAYER_WIDTH, SOIL_TEXTURE_SCALE, VIEW_HEIGHT, VIEW_WIDTH, WORLD_HEIGHT, WORLD_WIDTH } from './config.ts'
import { surfaceAt } from './terrain.ts'
import { createGrassTufts, tuftSupportDestroyed, type GrassTuft } from './terrain-visuals.ts'
import { createShot, STEP_SECONDS, stepShot, trajectory } from './projectile.ts'
import { createMatch, fire, resolveShot, updateMatch, type Match, type Phase } from './match.ts'

const app = document.querySelector<HTMLDivElement>('#app')!
app.innerHTML = `
  <header class="hud">
    <div class="player-card" id="player-one"><span>PLAYER 1</span><strong id="health-one">100 HP</strong></div>
    <div class="match-info"><span id="status">Starting match</span><button id="fire" type="button">Fire</button></div>
    <div class="player-card right" id="player-two"><span>PLAYER 2</span><strong id="health-two">100 HP</strong></div>
    <div class="movement-controls"><button id="move-left" type="button" aria-label="Move left">◀</button><span id="allowance">Move: 120</span><button id="move-right" type="button" aria-label="Move right">▶</button></div>
    <button id="restart" type="button" aria-label="Restart match">Restart</button>
  </header>
  <main id="game-area" aria-label="Artillery battlefield"></main>
  <p class="help">Move with A/D or arrows. Drag the glowing handle to aim and set power, then press Fire.</p>
`

const status = document.querySelector<HTMLElement>('#status')!
const fireButton = document.querySelector<HTMLButtonElement>('#fire')!
const oneHealth = document.querySelector<HTMLElement>('#health-one')!
const twoHealth = document.querySelector<HTMLElement>('#health-two')!
const oneCard = document.querySelector<HTMLElement>('#player-one')!
const twoCard = document.querySelector<HTMLElement>('#player-two')!
const allowance = document.querySelector<HTMLElement>('#allowance')!
const leftButton = document.querySelector<HTMLButtonElement>('#move-left')!
const rightButton = document.querySelector<HTMLButtonElement>('#move-right')!
const restartButton = document.querySelector<HTMLButtonElement>('#restart')!
let match: Match

class ArtilleryScene extends Phaser.Scene {
  private backgroundGraphics!: Phaser.GameObjects.Graphics
  private terrainMaskGraphics!: Phaser.GameObjects.Graphics
  private terrainMask!: Phaser.Display.Masks.GeometryMask
  private soilLayer!: Phaser.GameObjects.TileSprite
  private grassCanvas!: HTMLCanvasElement
  private grassContext!: CanvasRenderingContext2D
  private grassTexture!: Phaser.Textures.CanvasTexture
  private grassTufts: GrassTuft[] = []
  private worldGraphics!: Phaser.GameObjects.Graphics
  private indicator!: Phaser.GameObjects.Text
  private drawnTerrainRevision = -1
  private dragId?: number
  private dragPointerId?: number
  private heldDirections = new Map<number, -1 | 1>()
  private keys!: Record<'A' | 'D' | 'LEFT' | 'RIGHT', Phaser.Input.Keyboard.Key>
  private lastPhase?: Phase

  constructor() { super('battlefield') }

  preload() {
    this.load.image('soil-source', soilImageUrl)
  }

  create() {
    this.backgroundGraphics = this.add.graphics()
    this.drawBackground()
    this.terrainMaskGraphics = this.make.graphics({ x: 0, y: 0 }, false)
    this.terrainMask = this.terrainMaskGraphics.createGeometryMask()
    const source = this.textures.get('soil-source').getSourceImage() as HTMLImageElement
    const soilTile = this.textures.addCanvas('soil-tile', this.makeSeamlessTile(source))
    if (!soilTile) throw new Error('Unable to create soil tile texture')
    this.soilLayer = this.add.tileSprite(0, 0, WORLD_WIDTH, WORLD_HEIGHT, 'soil-tile')
      .setOrigin(0)
      .setTileScale(SOIL_TEXTURE_SCALE)
      .setTilePosition(-match.terrain.textureOffset.x, -match.terrain.textureOffset.y)
      .setMask(this.terrainMask)
    this.grassCanvas = document.createElement('canvas')
    this.grassCanvas.width = WORLD_WIDTH
    this.grassCanvas.height = WORLD_HEIGHT
    this.grassContext = this.grassCanvas.getContext('2d')!
    this.grassTexture = this.textures.addCanvas('grass-surface', this.grassCanvas)!
    this.drawInitialGrass()
    this.add.image(0, 0, 'grass-surface').setOrigin(0)
    this.drawTerrainMask()
    this.worldGraphics = this.add.graphics()
    this.indicator = this.add.text(VIEW_WIDTH / 2, 56, '⬇', { fontFamily: 'system-ui', fontSize: '24px', color: '#ffd36b', stroke: '#111b2e', strokeThickness: 4 }).setOrigin(0.5).setScrollFactor(0).setVisible(false)
    this.cameras.main.setBounds(0, 0, WORLD_WIDTH, WORLD_HEIGHT)
    this.cameras.main.setScroll(0, 0)
    this.keys = this.input.keyboard!.addKeys({ A: 'A', D: 'D', LEFT: 'LEFT', RIGHT: 'RIGHT' }) as typeof this.keys

    this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      if (match.phase !== 'MovementAiming' || this.dragId !== undefined) return
      const player = match.players[match.active]
      if (!player.grounded) return
      const world = this.cameras.main.getWorldPoint(pointer.x, pointer.y)
      const handle = this.handlePosition(player)
      if (Math.hypot(world.x - handle.x, world.y - handle.y) > 30) return
      this.dragId = pointer.id
      this.dragPointerId = pointer.pointerId
      match.pointerId = pointer.id
      this.aimFrom(pointer)
    })
    this.input.on('pointermove', (pointer: Phaser.Input.Pointer) => {
      if (this.dragId === pointer.id && pointer.isDown && match.phase === 'MovementAiming') this.aimFrom(pointer)
    })
    const release = (pointer: Phaser.Input.Pointer) => {
      if (this.dragId !== pointer.id) return
      if (pointer.isDown) this.aimFrom(pointer)
      this.clearAimDrag()
    }
    this.input.on('pointerup', release)
    this.input.on('pointerupoutside', release)
    window.addEventListener('pointerup', this.onWindowPointerEnd)
    window.addEventListener('pointercancel', this.onWindowPointerEnd)
    window.addEventListener('blur', this.clearInputs)
    document.addEventListener('visibilitychange', this.onVisibilityChange)

    this.bindMovementButton(leftButton, -1)
    this.bindMovementButton(rightButton, 1)
    fireButton.addEventListener('click', this.onFire)
    restartButton.addEventListener('click', this.onRestart)
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, this.cleanup, this)
    this.lastPhase = match.phase
    this.draw()
    this.updateHud()
  }

  private makeSeamlessTile(source: HTMLImageElement): HTMLCanvasElement {
    const canvas = document.createElement('canvas')
    canvas.width = source.naturalWidth
    canvas.height = source.naturalHeight
    const context = canvas.getContext('2d')!
    context.drawImage(source, 0, 0)
    const image = context.getImageData(0, 0, canvas.width, canvas.height)
    const pixels = image.data
    const width = canvas.width
    const height = canvas.height
    const band = 48
    const blendAxis = (horizontal: boolean) => {
      const before = new Uint8ClampedArray(pixels)
      const length = horizontal ? width : height
      const rows = horizontal ? height : width
      for (let row = 0; row < rows; row++) {
        const a = horizontal ? (row * width) * 4 : row * 4
        const b = horizontal ? (row * width + width - 1) * 4 : ((height - 1) * width + row) * 4
        for (let i = 0; i < length; i++) {
          const distance = Math.min(i, length - 1 - i)
          if (distance >= band) continue
          const t = distance / band
          const index = horizontal ? (row * width + i) * 4 : (i * width + row) * 4
          for (let channel = 0; channel < 3; channel++) {
            const edge = (before[a + channel] + before[b + channel]) / 2
            pixels[index + channel] = edge * (1 - t) + before[index + channel] * t
          }
        }
      }
    }
    blendAxis(true)
    blendAxis(false)
    context.putImageData(image, 0, 0)
    return canvas
  }

  private drawBackground() {
    const g = this.backgroundGraphics
    g.fillStyle(0x111b2e, 1)
    g.fillRect(0, 0, WORLD_WIDTH, WORLD_HEIGHT)
    g.fillStyle(0x25334c, 0.4)
    for (let i = 0; i < WORLD_WIDTH / 100; i++) g.fillCircle((i * 137) % WORLD_WIDTH, (i * 83) % 300, 1.5)
  }

  private drawTerrainMask() {
    const g = this.terrainMaskGraphics
    g.clear()
    g.fillStyle(0xffffff, 1)
    g.beginPath()
    g.moveTo(0, WORLD_HEIGHT)
    g.lineTo(0, surfaceAt(match.terrain, 0))
    for (let x = 1; x <= WORLD_WIDTH; x++) g.lineTo(x, match.terrain.heights[x])
    g.lineTo(WORLD_WIDTH, WORLD_HEIGHT)
    g.closePath()
    g.fillPath()
  }

  private drawInitialGrass() {
    const context = this.grassContext
    context.clearRect(0, 0, WORLD_WIDTH, WORLD_HEIGHT)
    let state = match.terrain.decorationSeed ^ 0x9e3779b9
    const random = () => {
      state = (state * 1664525 + 1013904223) >>> 0
      return state / 0x100000000
    }
    const edgeVariation = Array.from({ length: WORLD_WIDTH + 1 }, () => random() * 0.75)
    context.beginPath()
    context.moveTo(0, match.terrain.initialHeights[0] + edgeVariation[0])
    for (let x = 1; x <= WORLD_WIDTH; x++) context.lineTo(x, match.terrain.initialHeights[x] + edgeVariation[x])
    for (let x = WORLD_WIDTH; x >= 0; x--) context.lineTo(x, match.terrain.initialHeights[x] + edgeVariation[x] + GRASS_THICKNESS + random() * 2)
    context.closePath()
    context.fillStyle = `#${GRASS_BASE_COLOR.toString(16).padStart(6, '0')}`
    context.fill()

    context.beginPath()
    context.moveTo(0, match.terrain.initialHeights[0] + edgeVariation[0])
    for (let x = 1; x <= WORLD_WIDTH; x++) context.lineTo(x, match.terrain.initialHeights[x] + edgeVariation[x])
    context.strokeStyle = `#${GRASS_HIGHLIGHT_COLOR.toString(16).padStart(6, '0')}`
    context.lineWidth = 1.5
    context.lineJoin = 'round'
    context.stroke()

    this.grassTufts = createGrassTufts(match.terrain)
    context.strokeStyle = `#${GRASS_TUFT_COLOR.toString(16).padStart(6, '0')}`
    context.lineWidth = 1.5
    for (const tuft of this.grassTufts) {
      context.beginPath()
      context.moveTo(tuft.x, tuft.y + 0.5)
      context.lineTo(tuft.x - 3, tuft.y - tuft.height * 0.65)
      context.moveTo(tuft.x, tuft.y + 0.5)
      context.lineTo(tuft.x + 2.5, tuft.y - tuft.height)
      context.stroke()
    }
    this.grassTexture.refresh()
  }

  private eraseGrass(x: number, y: number, radius: number) {
    const context = this.grassContext
    context.save()
    context.globalCompositeOperation = 'destination-out'
    context.beginPath()
    context.arc(x, y, radius, 0, Math.PI * 2)
    context.fill()
    for (const tuft of this.grassTufts) {
      if (!tuftSupportDestroyed(match.terrain, tuft)) continue
      context.fillRect(tuft.x - 4, tuft.y - tuft.height - 1, 8, tuft.height + 2)
    }
    context.restore()
    this.grassTexture.refresh()
  }

  private onWindowPointerEnd = (event: PointerEvent) => {
    this.heldDirections.delete(event.pointerId)
    if (this.dragPointerId === event.pointerId) this.clearAimDrag()
  }

  private onVisibilityChange = () => { if (document.hidden) this.clearInputs() }
  private onFire = () => { if (fire(match)) this.clearInputs() }
  private onRestart = () => {
    this.clearInputs()
    match = createMatch(Math.floor(Math.random() * 0x100000000))
    this.cameras.main.setScroll(0, 0)
    this.soilLayer.setTilePosition(-match.terrain.textureOffset.x, -match.terrain.textureOffset.y)
    this.drawnTerrainRevision = -1
    this.drawInitialGrass()
    this.draw()
    this.updateHud()
  }

  private bindMovementButton(button: HTMLButtonElement, direction: -1 | 1) {
    button.addEventListener('pointerdown', event => {
      if (match.phase !== 'MovementAiming') return
      event.preventDefault()
      button.setPointerCapture(event.pointerId)
      this.heldDirections.set(event.pointerId, direction)
    })
    const release = (event: PointerEvent) => this.heldDirections.delete(event.pointerId)
    button.addEventListener('pointerup', release)
    button.addEventListener('pointercancel', release)
    button.addEventListener('lostpointercapture', release)
  }

  private clearAimDrag() {
    this.dragId = undefined
    this.dragPointerId = undefined
    match.pointerId = undefined
  }

  private clearInputs = () => {
    this.clearAimDrag()
    this.heldDirections.clear()
    if (this.keys) for (const key of Object.values(this.keys)) key.reset()
  }

  private cleanup() {
    this.clearInputs()
    window.removeEventListener('pointerup', this.onWindowPointerEnd)
    window.removeEventListener('pointercancel', this.onWindowPointerEnd)
    window.removeEventListener('blur', this.clearInputs)
    document.removeEventListener('visibilitychange', this.onVisibilityChange)
    fireButton.removeEventListener('click', this.onFire)
    restartButton.removeEventListener('click', this.onRestart)
  }

  private handlePosition(player: Match['players'][number]) {
    const dx = Math.cos(player.aimAngle)
    const dy = Math.sin(player.aimAngle)
    const edge = Math.min((PLAYER_WIDTH / 2) / Math.max(Math.abs(dx), 1e-6), (PLAYER_HEIGHT / 2) / Math.max(Math.abs(dy), 1e-6))
    const reach = edge + 14
    return { x: player.x + dx * reach, y: player.y + dy * reach }
  }

  private aimFrom(pointer: Phaser.Input.Pointer) {
    const player = match.players[match.active]
    const world = this.cameras.main.getWorldPoint(pointer.x, pointer.y)
    const handle = this.handlePosition(player)
    const dx = world.x - handle.x
    const dy = world.y - handle.y
    const distance = Math.hypot(dx, dy)
    if (distance < 12) return
    // Left player fires to the right; right player fires to the left. Drag points from the player toward the target.
    const elevation = Math.max(-Math.PI / 2 + 0.05, Math.min(-0.05, Math.atan2(dy, Math.max(1, Math.abs(dx)))))
    const angle = player.id === 0 ? elevation : Math.PI - elevation
    player.aimAngle = angle
    player.power = Math.min(1, Math.max(0.15, distance / 220))
  }

  private movementAxis(): -1 | 0 | 1 {
    const keyboardAxis = (this.keys.D.isDown || this.keys.RIGHT.isDown ? 1 : 0) - (this.keys.A.isDown || this.keys.LEFT.isDown ? 1 : 0)
    if (keyboardAxis) return keyboardAxis as -1 | 1
    const dirs = [...this.heldDirections.values()]
    if (dirs.includes(-1) && dirs.includes(1)) return 0
    return dirs[0] ?? 0
  }

  update(_time: number, deltaMs: number) {
    const delta = Math.min(deltaMs / 1000, STEP_SECONDS * 8)
    match.accumulator = Math.min(match.accumulator + delta, STEP_SECONDS * 8)
    while (match.accumulator >= STEP_SECONDS) {
      if (match.phase === 'ProjectileFlight' && match.shot) {
        const result = stepShot(match.shot, match.terrain, match.players)
        if (result) {
          this.clearInputs()
          resolveShot(match, result)
          if (result.kind === 'impact') this.eraseGrass(result.x, result.y, EXPLOSION_RADIUS)
        }
      }
      updateMatch(match, STEP_SECONDS, this.movementAxis())
      match.accumulator -= STEP_SECONDS
    }
    if (match.phase !== this.lastPhase && ['CameraTransition', 'NextPlayerReady', 'ProjectileFlight', 'Impact', 'Settling', 'WinnerCheck', 'GameOver'].includes(match.phase)) this.clearInputs()
    this.lastPhase = match.phase
    this.cameras.main.setScroll(match.cameraX, 0)
    this.draw()
    this.updateHud()
  }

  private draw() {
    if (this.drawnTerrainRevision !== match.terrain.revision) {
      this.drawTerrainMask()
      this.drawnTerrainRevision = match.terrain.revision
    }
    const g = this.worldGraphics
    g.clear()
    for (let i = 0; i < match.players.length; i++) {
      const player = match.players[i]
      const color = i === 0 ? 0x4ec5d4 : 0xe58c55
      g.fillStyle(color, 1)
      g.fillRoundedRect(player.x - PLAYER_WIDTH / 2, player.y - PLAYER_HEIGHT / 2, PLAYER_WIDTH, PLAYER_HEIGHT, 4)
      g.lineStyle(2, 0xf8efdb, 1)
      g.strokeRoundedRect(player.x - PLAYER_WIDTH / 2, player.y - PLAYER_HEIGHT / 2, PLAYER_WIDTH, PLAYER_HEIGHT, 4)
      if (match.phase === 'MovementAiming' && match.active === i && player.grounded) {
        const handle = this.handlePosition(player)
        const dots = trajectory(createShot(player), match.terrain, match.players)
        g.fillStyle(0xe9d78c, 0.85)
        for (const dot of dots) g.fillCircle(dot.x, dot.y, 2.2)
        g.lineStyle(3, 0xffd36b, 0.95)
        g.strokeLineShape(new Phaser.Geom.Line(player.x, player.y, handle.x, handle.y))
        g.fillStyle(0xffd36b, 0.3)
        g.fillCircle(handle.x, handle.y, 16)
        g.fillStyle(0xffd36b, 1)
        g.fillCircle(handle.x, handle.y, 7)
      }
    }
    if (match.shot) {
      g.fillStyle(0xfff2c0, 1)
      g.fillCircle(match.shot.x, match.shot.y, 5)
      const screenX = match.shot.x - match.cameraX
      const inCamera = screenX >= 0 && screenX <= VIEW_WIDTH
      this.indicator.setVisible(match.shot.y < 0 || !inCamera)
      this.indicator.setPosition(Math.max(20, Math.min(VIEW_WIDTH - 20, screenX)), match.shot.y < 0 ? 58 : VIEW_HEIGHT / 2)
      this.indicator.setText(match.shot.y < 0 ? (match.shot.vy < 0 ? '↑' : '↓') : (screenX < 0 ? '←' : '→'))
    } else this.indicator.setVisible(false)
    if (match.explosion) {
      g.fillStyle(0xffa742, 0.28)
      g.fillCircle(match.explosion.x, match.explosion.y, EXPLOSION_RADIUS)
      g.lineStyle(3, 0xffd16d, 0.9)
      g.strokeCircle(match.explosion.x, match.explosion.y, EXPLOSION_RADIUS)
    }
  }

  private updateHud() {
    oneHealth.textContent = `${match.players[0].health} HP`
    twoHealth.textContent = `${match.players[1].health} HP`
    const ready = match.phase === 'MovementAiming'
    oneCard.classList.toggle('active', match.active === 0 && ready)
    twoCard.classList.toggle('active', match.active === 1 && ready)
    status.textContent = match.outcome ?? (ready ? `Player ${match.active + 1}'s turn` : match.phase === 'GameOver' ? 'Match over' : match.phase.replace(/([A-Z])/g, ' $1').trim())
    allowance.textContent = ready ? `Move: ${Math.ceil(match.players[match.active].movementRemaining)}` : 'Move: —'
    fireButton.disabled = !ready || !match.players[match.active].grounded || match.players[match.active].health === 0 || match.pointerId !== undefined
    const canMove = ready && match.players[match.active].movementRemaining > 0
    leftButton.disabled = !canMove
    rightButton.disabled = !canMove
  }
}

match = createMatch()
new Phaser.Game({
  type: Phaser.CANVAS,
  width: VIEW_WIDTH,
  height: VIEW_HEIGHT,
  parent: 'game-area',
  backgroundColor: '#111b2e',
  scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
  input: { activePointers: 4 },
  scene: [ArtilleryScene],
})
