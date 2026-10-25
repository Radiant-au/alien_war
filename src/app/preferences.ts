export interface Preferences { ship: number; players: number; sound: boolean; music: number; sfx: number }
export const defaults: Preferences = { ship: 0, players: 4, sound: true, music: 70, sfx: 85 }
export function normalizePreferences(raw: Partial<Preferences> = {}): Preferences {
  const volume = (v: unknown, fallback: number) => typeof v === 'number' && Number.isFinite(v) ? Math.max(0, Math.min(100, v)) : fallback
  return {
    ship: Number.isInteger(raw.ship) && raw.ship! >= 0 && raw.ship! < 4 ? raw.ship! : 0,
    players: [2,3,4].includes(raw.players!) ? raw.players! : 4,
    sound: typeof raw.sound === 'boolean' ? raw.sound : true,
    music: volume(raw.music, defaults.music), sfx: volume(raw.sfx, defaults.sfx),
  }
}
export function shipOrder(selected: number) { return [selected, ...[0,1,2,3].filter(i => i !== selected)] }
export function readPreferences(): Preferences {
  try {
    const raw = JSON.parse(localStorage.getItem('alien-war-settings') || '{}') ?? {}
    if (raw.music === 40 && (raw.sfx === 85 || raw.sfx === undefined)) {
      raw.music = defaults.music
    }
    return normalizePreferences(raw)
  } catch {
    return {...defaults}
  }
}
export function savePreferences(value: Preferences) {
  try { localStorage.setItem('alien-war-settings', JSON.stringify(value)) } catch { /* Private mode can deny storage. */ }
}
