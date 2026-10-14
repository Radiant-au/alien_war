export const SPELLS = [
  { name: 'Magic Bolt', color: 0x39daff, radius: 42, damage: 55 },
  { name: 'Fireball', color: 0xffad42, radius: 62, damage: 60 },
  { name: 'Arcane Orb', color: 0xb45cf5, radius: 52, damage: 65 },
  { name: 'Ice Spike', color: 0x80efff, radius: 35, damage: 70 },
] as const
export type Spell = typeof SPELLS[number]
