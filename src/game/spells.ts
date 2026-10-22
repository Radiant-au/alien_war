export const SPELLS = [
  { name: 'Plasma Bolt', color: 0x39daff, radius: 56, damage: 55, effect: 'electric', destroyTerrain: true },
  { name: 'Acid Bomb', color: 0xffad42, radius: 82, damage: 60, effect: 'poison', destroyTerrain: false },
  { name: 'Gravity Orb', color: 0xb45cf5, radius: 70, damage: 65, effect: 'fire', destroyTerrain: true },
  { name: 'Cryo Spike', color: 0x80efff, radius: 48, damage: 70, effect: 'ice', destroyTerrain: true },
] as const
export type Spell = typeof SPELLS[number]
