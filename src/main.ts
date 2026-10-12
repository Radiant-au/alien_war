import Phaser from 'phaser'
import './style.css'
import soilImageUrl from '../assets/soil.png'
import { EXPLOSION_RADIUS, GRASS_BASE_COLOR, GRASS_HIGHLIGHT_COLOR, GRASS_THICKNESS, GRASS_TUFT_COLOR, PLAYER_HEIGHT, PLAYER_WIDTH, SOIL_TEXTURE_SCALE, VIEW_HEIGHT, VIEW_WIDTH, WORLD_HEIGHT, WORLD_WIDTH } from './config.ts'
import { createDecorations, decorationDestroyed, type TerrainDecoration } from './decorations.ts'
import { viewportMetrics } from './viewport.ts'
import { surfaceAt } from './terrain.ts'
import { createGrassTufts, tuftSupportDestroyed, type GrassTuft } from './terrain-visuals.ts'
import { createShot, STEP_SECONDS, stepShot, trajectory } from './projectile.ts'
import { createMatch, fire, resolveShot, updateMatch, type Match, type Phase, overviewZoom, overviewScrollX } from './match.ts'

const decorationUrls = import.meta.glob('../assets/[cp][1-6].png', { eager: true, query: '?url', import: 'default' }) as Record<string, string>
const grassImageUrl = new URL('../assets/grass.png', import.meta.url).href

const app = document.querySelector<HTMLDivElement>('#app')!
app.innerHTML = `
  <main id="game-area" aria-label="Artillery battlefield"></main>
  <header class="hud">
    <div class="player-card" id="player-one"><span class="sigil">✦</span><div><span>PLAYER 01 · AZURE</span><strong id="health-one">100 HP</strong><div class="health-track"><i id="bar-one"></i></div></div></div>
    <div class="match-info"><span class="eyebrow">WIZARD WAR</span><span id="status" role="status">Starting match</span><span class="arena-name">THE MOONLIT WILDS</span></div>
    <div class="player-card right" id="player-two"><span class="sigil">✧</span><div><span>PLAYER 02 · EMBER</span><strong id="health-two">100 HP</strong><div class="health-track"><i id="bar-two"></i></div></div></div>
  </header>
  <nav class="utility" aria-label="Match options"><button id="fullscreen" type="button">⛶ Fullscreen</button><button id="restart" type="button">↻ New match</button></nav>
  <footer class="command-bar">
    <div class="movement-controls"><span class="control-label">MOVE <small>A / D</small></span><div><button id="move-left" type="button" aria-label="Move left">◀</button><span id="allowance">120</span><button id="move-right" type="button" aria-label="Move right">▶</button></div></div>
    <div class="aim-controls"><label for="angle">ANGLE <output id="angle-value">45°</output></label><input id="angle" aria-label="Aim elevation" type="range" min="3" max="87" value="45"></div>
    <div class="aim-controls"><label for="power">POWER <output id="power-value">58%</output></label><input id="power" aria-label="Shot power" type="range" min="15" max="100" value="58"></div>
    <button id="fire" type="button"><span>✦</span> Cast spell</button>
  </footer>
  <p class="help">Drag the golden orb to aim · A / D to move</p>
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
const angleInput = document.querySelector<HTMLInputElement>('#angle')!
const powerInput = document.querySelector<HTMLInputElement>('#power')!
const angleValue = document.querySelector<HTMLOutputElement>('#angle-value')!
const powerValue = document.querySelector<HTMLOutputElement>('#power-value')!
const healthBars = [document.querySelector<HTMLElement>('#bar-one')!, document.querySelector<HTMLElement>('#bar-two')!]
const fullscreenButton = document.querySelector<HTMLButtonElement>('#fullscreen')!
fullscreenButton.addEventListener('click', async () => {
  try {
    if (document.fullscreenElement) await document.exitFullscreen()
    else await app.requestFullscreen()
  } catch { fullscreenButton.textContent = 'Fullscreen unavailable' }
})
document.addEventListener('fullscreenchange', () => { fullscreenButton.textContent = document.fullscreenElement ? '⛶ Exit fullscreen' : '⛶ Fullscreen' })
let match: Match

class ArtilleryScene extends Phaser.Scene {
  private viewScale = 1
  private decorations: { data: TerrainDecoration; sprite: Phaser.GameObjects.Image }[] = []
  private grassSource!: HTMLCanvasElement
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
    this.load.image('grass-source', grassImageUrl)
    for (const [path, url] of Object.entries(decorationUrls)) this.load.image(path.split('/').pop()!.replace('.png', ''), url)
  }

  create() {
    this.grassSource = this.trimGrass(this.textures.get('grass-source').getSourceImage() as HTMLImageElement)
    this.terrainMaskGraphics = this.make.graphics({ x: 0, y: 0 }, false)
    this.terrainMask = this.terrainMaskGraphics.createGeometryMask()
    const source = this.textures.get('soil-source').getSourceImage() as HTMLImageElement
    const soilTile = this.textures.addCanvas('soil-tile', this.makeSeamlessTile(source))
    if (!soilTile) throw new Error('Unable to create soil tile texture')
    this.soilLayer = this.add.tileSprite(0, 0, WORLD_WIDTH, WORLD_HEIGHT + 2048, 'soil-tile')
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
    this.drawDecorations()
    this.worldGraphics = this.add.graphics().setDepth(3)
    this.indicator = this.add.text(VIEW_WIDTH / 2, 56, '⬇', { fontFamily: 'system-ui', fontSize: '24px', color: '#ffd36b', stroke: '#111b2e', strokeThickness: 4 }).setOrigin(0.5).setScrollFactor(0).setDepth(4).setVisible(false)
    this.scale.on(Phaser.Scale.Events.RESIZE, this.resizeView, this)
    this.cameras.main.setOrigin(0, 0)
    this.resizeView()
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
    angleInput.addEventListener('input', this.onAimControl)
    powerInput.addEventListener('input', this.onAimControl)
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

  private resizeView = () => {
    const metrics = viewportMetrics(this.scale.width, this.scale.height)
    this.viewScale = metrics.scale
    match.viewWidth = metrics.logicalWidth
    match.cameraZoom = overviewZoom(match.players, match.viewWidth)
    match.cameraX = overviewScrollX(match.players, match.cameraZoom, match.viewWidth)
    match.cameraFromX = match.cameraX
    match.cameraToX = match.cameraX
    this.positionCamera()
  }

  private positionCamera() {
    const zoom = match.cameraZoom * this.viewScale
    this.cameras.main.setZoom(zoom)
    this.cameras.main.setScroll(match.cameraX, WORLD_HEIGHT - (this.scale.height - (this.scale.width < 480 ? 210 : 90)) / zoom)
  }

  private trimGrass(source: HTMLImageElement) {
    const canvas = document.createElement('canvas')
    canvas.width = source.naturalWidth
    canvas.height = source.naturalHeight
    const context = canvas.getContext('2d')!
    context.drawImage(source, 0, 0)
    const data = context.getImageData(0, 0, canvas.width, canvas.height).data
    let top = canvas.height, bottom = 0
    for (let y = 0; y < canvas.height; y++) for (let x = 0; x < canvas.width; x++) {
      if (data[(y * canvas.width + x) * 4 + 3] > 32) { top = Math.min(top, y); bottom = Math.max(bottom, y) }
    }
    const cropped = document.createElement('canvas')
    cropped.width = canvas.width
    cropped.height = Math.max(1, bottom - top + 1)
    cropped.getContext('2d')!.drawImage(canvas, 0, top, canvas.width, cropped.height, 0, 0, cropped.width, cropped.height)
    return cropped
  }

  private drawDecorations() {
    for (const item of this.decorations) item.sprite.destroy()
    this.decorations = createDecorations(match.terrain).map(data => {
      const sprite = this.add.image(data.x, data.y, data.key).setOrigin(0.5, 1).setDepth(1)
      sprite.setDisplaySize(data.width, data.width * sprite.height / sprite.width)
      if (data.kind === 'crystal') sprite.setMask(this.terrainMask)
      return { data, sprite }
    })
  }

  private onAimControl = () => {
    if (match.phase !== 'MovementAiming') return
    const player = match.players[match.active]
    const elevation = -Number(angleInput.value) * Math.PI / 180
    player.aimAngle = player.id === 0 ? elevation : Math.PI - elevation
    player.power = Number(powerInput.value) / 100
  }

  private drawTerrainMask() {
    const g = this.terrainMaskGraphics
    g.clear()
    g.fillStyle(0xffffff, 1)
    g.beginPath()
    g.moveTo(0, WORLD_HEIGHT + 2048)
    g.lineTo(0, surfaceAt(match.terrain, 0))
    for (let x = 1; x <= WORLD_WIDTH; x++) g.lineTo(x, match.terrain.heights[x])
    g.lineTo(WORLD_WIDTH, WORLD_HEIGHT + 2048)
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

    // Sample narrow slices so the painted grass follows each procedural slope.
    const stripHeight = 15
    const stripWidth = this.grassSource.width * stripHeight / this.grassSource.height
    for (let x = 0; x < WORLD_WIDTH; x += 2) {
      const sx = (x % stripWidth) / stripWidth * this.grassSource.width
      context.drawImage(this.grassSource, sx, 0, Math.min(2 * this.grassSource.height / stripHeight, this.grassSource.width - sx), this.grassSource.height, x, match.terrain.initialHeights[x] - 3, 2.5, stripHeight)
    }
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
    // The heightmap also removes soil above the crater arc; erase that grass too.
    for (let px = Math.max(0, Math.floor(x - radius)); px <= Math.min(WORLD_WIDTH, Math.ceil(x + radius)); px++) {
      if (match.terrain.heights[px] > match.terrain.initialHeights[px] + 0.5)
        context.fillRect(px, match.terrain.initialHeights[px] - 16, 1, match.terrain.heights[px] - match.terrain.initialHeights[px] + 16)
    }
    context.restore()
    for (const item of this.decorations) {
      if (decorationDestroyed(match.terrain, item.data, x, y, radius)) item.sprite.setVisible(false)
    }
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
    this.resizeView()
    this.soilLayer.setTilePosition(-match.terrain.textureOffset.x, -match.terrain.textureOffset.y)
    this.drawnTerrainRevision = -1
    this.drawInitialGrass()
    this.drawDecorations()
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
    this.scale.off(Phaser.Scale.Events.RESIZE, this.resizeView, this)
    angleInput.removeEventListener('input', this.onAimControl)
    powerInput.removeEventListener('input', this.onAimControl)
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
    this.positionCamera()
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
      g.fillStyle(0x071425, 0.35)
      g.fillEllipse(player.x, player.y + PLAYER_HEIGHT / 2, PLAYER_WIDTH + 8, 7)
      g.fillStyle(color, 1)
      g.fillTriangle(player.x, player.y - 9, player.x - 15, player.y + 12, player.x + 15, player.y + 12)
      g.fillStyle(0xffdab1, 1)
      g.fillCircle(player.x, player.y - 7, 6)
      g.fillStyle(i === 0 ? 0x245881 : 0x794269, 1)
      g.fillTriangle(player.x - 11, player.y - 11, player.x + 9, player.y - 11, player.x - 3, player.y - 27)
      g.fillEllipse(player.x, player.y - 11, 29, 6)
      g.lineStyle(2, 0xf4d9a0, 0.9)
      g.lineBetween(player.x + 14, player.y + 10, player.x + 17, player.y - 15)
      g.fillStyle(i === 0 ? 0x95ffff : 0xffc685, 1)
      g.fillCircle(player.x + 17, player.y - 17, 3)
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
      const screenX = (match.shot.x - match.cameraX) * match.cameraZoom * this.viewScale
      const screenY = (match.shot.y - this.cameras.main.scrollY) * this.cameras.main.zoom
      const inCamera = screenX >= 0 && screenX <= this.scale.width && screenY >= 0 && screenY <= this.scale.height
      this.indicator.setVisible(!inCamera)
      this.indicator.setScale(1 / this.cameras.main.zoom)
      this.indicator.setPosition(Math.max(20, Math.min(this.scale.width - 20, screenX)) / this.cameras.main.zoom, Math.max(100, Math.min(this.scale.height - 110, screenY)) / this.cameras.main.zoom)
      this.indicator.setText(screenY < 0 ? (match.shot.vy < 0 ? '↑' : '↓') : screenY > this.scale.height ? '↓' : (screenX < 0 ? '←' : '→'))
    } else this.indicator.setVisible(false)
    if (match.explosion) {
      g.fillStyle(0xffa742, 0.28)
      g.fillCircle(match.explosion.x, match.explosion.y, EXPLOSION_RADIUS)
      g.lineStyle(3, 0xffd16d, 0.9)
      g.strokeCircle(match.explosion.x, match.explosion.y, EXPLOSION_RADIUS)
    }
  }

  private updateHud() {
    const current = match.players[match.active]
    const elevation = Math.round(Math.atan2(-Math.sin(current.aimAngle), Math.abs(Math.cos(current.aimAngle))) * 180 / Math.PI)
    angleInput.value = String(elevation)
    powerInput.value = String(Math.round(current.power * 100))
    angleValue.textContent = `${elevation}°`
    powerValue.textContent = `${Math.round(current.power * 100)}%`
    healthBars.forEach((bar, i) => { bar.style.width = `${match.players[i].health}%` })
    angleInput.disabled = powerInput.disabled = match.phase !== 'MovementAiming'
    oneHealth.textContent = `${match.players[0].health} HP`
    twoHealth.textContent = `${match.players[1].health} HP`
    const ready = match.phase === 'MovementAiming'
    oneCard.classList.toggle('active', match.active === 0 && ready)
    twoCard.classList.toggle('active', match.active === 1 && ready)
    status.textContent = match.outcome ?? (ready ? `Player ${match.active + 1}'s turn` : match.phase === 'GameOver' ? 'Match over' : match.phase.replace(/([A-Z])/g, ' $1').trim())
    allowance.textContent = ready ? `${Math.ceil(match.players[match.active].movementRemaining)}` : '—'
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
  transparent: true,
  scale: { mode: Phaser.Scale.RESIZE, autoCenter: Phaser.Scale.CENTER_BOTH },
  input: { activePointers: 4 },
  scene: [ArtilleryScene],
})

