export const SPELLS = [
  { name: 'Plasma Bolt', color: 0x39daff, radius: 56, damage: 48, effect: 'electric', destroyTerrain: true },
  { name: 'Acid Bomb', color: 0x75ef39, radius: 82, damage: 20, effect: 'poison', destroyTerrain: false },
  { name: 'Gravity Orb', color: 0xb45cf5, radius: 70, damage: 56, effect: 'fire', destroyTerrain: true },
  { name: 'Cryo Spike', color: 0x80efff, radius: 48, damage: 60, effect: 'ice', destroyTerrain: true },
] as const
export type Spell = typeof SPELLS[number]

/** Damage is a whole-shot budget; the electric volley divides it across 3 pellets. */
export function weaponBlast(spell:Spell){return {...spell,damage:spell.damage/(spell.effect==='electric'?3:1)}}
