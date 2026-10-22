export const SPELLS = [
  { name: 'Plasma Bolt', color: 0x39daff, radius: 56, damage: 55, effect: 'electric', icon: 'electric.jpeg', destroyTerrain: true },
  { name: 'Acid Bomb', color: 0xffad42, radius: 82, damage: 60, effect: 'poison', icon: 'poison.jpeg', destroyTerrain: false },
  { name: 'Fire Cluster', color: 0xffa13c, radius: 70, damage: 65, effect: 'fire', icon: 'fire_cluster_icon.svg', destroyTerrain: true },
  { name: 'Cryo Spike', color: 0x80efff, radius: 48, damage: 70, effect: 'ice', icon: 'ice.jpeg', destroyTerrain: true },
] as const
export type Spell = typeof SPELLS[number]

