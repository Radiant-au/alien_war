export const SPELLS = [
  { name: 'Plasma Bolt', color: 0x39daff, radius: 64, terrainRadius: 56, damage: 36, effect: 'electric', destroyTerrain: true },
  { name: 'Acid Bomb', color: 0x75ef39, radius: 90, terrainRadius: 0, damage: 18, effect: 'poison', destroyTerrain: false },
  { name: 'Flame Volley', color: 0xff913d, radius: 80, terrainRadius: 56, damage: 30, effect: 'fire', destroyTerrain: true },
  { name: 'Cryo Shards', color: 0x80efff, radius: 58, terrainRadius: 44, damage: 30, effect: 'ice', destroyTerrain: true },
] as const
export type Spell = typeof SPELLS[number]
export function projectileCount(spell:Spell){return spell.effect==='ice'?5:spell.effect==='electric'||spell.effect==='fire'?3:1}
/** A full volley shares one budget; terrain and health radii are independent. */
export function weaponBlast(spell:Spell){return {...spell,damage:spell.damage/projectileCount(spell)}}

export const BURN_DAMAGE=6
