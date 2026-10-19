import logoUrl from '../assets/loading/alien-war-logo.png'
import backgroundUrl from '../assets/loading/alien-war-background.png'

const overlay = document.querySelector<HTMLElement>('#loading-screen')!
const status = document.querySelector<HTMLElement>('#loading-status')!
const retry = document.querySelector<HTMLButtonElement>('#loading-retry')!
const app = document.querySelector<HTMLElement>('#app')!
app.inert = true
const blockKeys = (event: KeyboardEvent) => { event.preventDefault(); event.stopImmediatePropagation() }
window.addEventListener('keydown', blockKeys, true)
window.addEventListener('keyup', blockKeys, true)

function progress(value: number, message: string) {
  document.querySelector<HTMLElement>('#loading-fill')!.style.width = `${value}%`
  document.querySelector('#loading-progress')!.setAttribute('aria-valuenow', String(value))
  document.querySelector('#loading-percent')!.textContent = `${value}%`
  status.textContent = message
}

async function artwork(id: string, url: string) {
  const image = document.querySelector<HTMLImageElement>(id)!
  image.src = url
  try { await image.decode() } catch { image.hidden = true }
}

async function launch() {
  try {
    progress(5, 'Loading artwork...')
    await artwork('#loading-logo', logoUrl)
    progress(25, 'Loading battlefield poster...')
    await artwork('#loading-background', backgroundUrl)
    progress(50, 'Starting engine...')
    const { scene } = await import('./main.ts')
    progress(85, 'Preparing arena...')
    await new Promise<void>((resolve, reject) => {
      const timer = window.setTimeout(() => reject(new Error('Arena startup timed out')), 30000)
      const ready = () => { window.clearTimeout(timer); resolve() }
      if (scene.sys.isActive()) ready()
      else scene.events.once('create', ready)
    })
    scene.scene.pause()
    progress(100, 'Ready for battle')
    // Let the completed bar paint before transitioning into the arena.
    await new Promise(resolve => window.setTimeout(resolve, 650))
    overlay.classList.add('leaving')
    await new Promise(resolve => window.setTimeout(resolve, 400))
    overlay.remove()
    app.inert = false
    window.removeEventListener('keydown', blockKeys, true)
    window.removeEventListener('keyup', blockKeys, true)
    scene.scene.resume()
  } catch {
    status.textContent = 'Unable to start. Please retry.'
    overlay.setAttribute('aria-busy', 'false')
    retry.hidden = false
  }
}

retry.addEventListener('click', () => window.location.reload())
void launch()
