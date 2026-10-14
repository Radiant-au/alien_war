export const SPELLS = [
  { name: 'Plasma Bolt', color: 0x39daff, radius: 42, damage: 55 },
  { name: 'Acid Bomb', color: 0xffad42, radius: 62, damage: 60 },
  { name: 'Gravity Orb', color: 0xb45cf5, radius: 52, damage: 65 },
  { name: 'Cryo Spike', color: 0x80efff, radius: 35, damage: 70 },
] as const
export type Spell = typeof SPELLS[number]
