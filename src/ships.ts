import type Phaser from 'phaser'

export const SHIPS = [
  { name: 'Scout', color: 0x37d7f3, dark: 0x24577c },
  { name: 'Hopper', color: 0xffa13c, dark: 0x9d502c },
  { name: 'Stinger', color: 0xb967f4, dark: 0x593590 },
  { name: 'Orbit', color: 0x63efad, dark: 0x288672 },
] as const

/** Draw local ship geometry. Phaser Graphics transforms supply position and tilt. */
export function drawShip(g: Phaser.GameObjects.Graphics, kind: number, thrust: number) {
  const { color, dark } = SHIPS[kind % SHIPS.length]
  const outline = 0x0b1735
  const ellipse = (x: number, y: number, w: number, h: number, fill: number) => {
    g.fillStyle(fill); g.fillEllipse(x, y, w, h); g.lineStyle(2, outline); g.strokeEllipse(x, y, w, h)
  }
  const polygon = (points: number[][], fill: number) => {
    g.fillStyle(fill); g.lineStyle(2, outline); g.beginPath();points.forEach(([x,y],i)=>i?g.lineTo(x,y):g.moveTo(x,y));g.closePath();g.fillPath();g.strokePath()
  }
  if (kind === 2) {
    polygon([[-18,-4],[-28,-22],[-14,-18],[-7,-3]],color)
    polygon([[-24,-3],[8,-1],[25,6],[-14,12],[-26,7]],dark)
    polygon([[-24,-3],[8,-1],[25,6],[-12,4]],color)
    polygon([[-7,3],[-30,15],[-15,3]],color)
    ellipse(-28,4,9,12,dark)
  } else if (kind === 1) {
    polygon([[-18,0],[-13,13],[-22,16],[-23,13]],color)
    polygon([[14,0],[23,13],[22,16],[13,13]],color)
    polygon([[-17,-5],[16,-5],[20,7],[12,12],[-14,12],[-20,6]],dark)
    polygon([[-17,-5],[16,-5],[20,4],[-20,4]],color)
    ellipse(-23,0,7,12,dark)
  } else {
    ellipse(0,5,kind===0?54:44,16,dark)
    ellipse(0,0,kind===0?58:47,13,color)
    if (kind===3) {
      ellipse(-23,2,14,17,dark);ellipse(23,2,14,17,dark)
      g.fillStyle(color);g.fillCircle(-24,1,4);g.fillCircle(24,1,4)
    } else {
      g.fillStyle(0x90f8ff);for(const x of [-15,0,15])g.fillCircle(x,6,2.3)
    }
  }
  // Dome is a semicircle; a simple alien face stays readable at gameplay size.
  g.fillStyle(color);g.lineStyle(2,outline);g.beginPath();g.arc(0,-3,kind===1?14:12,Math.PI,Math.PI*2);g.closePath();g.fillPath();g.strokePath()
  g.fillStyle(0xc8ffef);g.fillEllipse(0,-7,11,12)
  g.fillStyle(outline);g.fillEllipse(-2.5,-7,2,4);g.fillEllipse(2.5,-7,2,4)
  g.lineStyle(2,0xe0ffff,.75);g.lineBetween(-8,-9,-5,-12)
  if(thrust>0){
    g.fillStyle(color,.24);g.fillEllipse(-31,4,13+thrust*4,12)
    g.fillStyle(color,.8);g.fillTriangle(-30,0,-30,8,-39-thrust*6,4)
  }
}

export function shipPortrait(kind: number): string {
  const ship=SHIPS[kind % SHIPS.length]
  const color='#'+ship.color.toString(16).padStart(6,'0')
  const dark='#'+ship.dark.toString(16).padStart(6,'0')
  const body=kind===2
    ? `<path d="M-18-4-28-22-14-18-7-3Z" fill="${color}"/><path d="M-24-3 8-1 25 6-14 12-26 7Z" fill="${dark}"/><path d="M-24-3 8-1 25 6-12 4Z" fill="${color}"/><path d="M-7 3-30 15-15 3Z" fill="${color}"/><ellipse cx="-28" cy="4" rx="4.5" ry="6" fill="${dark}"/>`
    : kind===1
    ? `<path d="M-18 0-13 13-22 16-23 13Z M14 0 23 13 22 16 13 13Z" fill="${color}"/><path d="M-17-5 16-5 20 7 12 12-14 12-20 6Z" fill="${dark}"/><path d="M-17-5 16-5 20 4-20 4Z" fill="${color}"/><ellipse cx="-23" cy="0" rx="3.5" ry="6" fill="${dark}"/>`
    : `<ellipse cx="0" cy="5" rx="${kind===0?27:22}" ry="8" fill="${dark}"/><ellipse cx="0" cy="0" rx="${kind===0?29:23.5}" ry="6.5" fill="${color}"/>${kind===3?`<ellipse cx="-23" cy="2" rx="7" ry="8.5" fill="${dark}"/><ellipse cx="23" cy="2" rx="7" ry="8.5" fill="${dark}"/><circle cx="-24" cy="1" r="4" fill="${color}"/><circle cx="24" cy="1" r="4" fill="${color}"/>`:`<g fill="#90f8ff" stroke="none"><circle cx="-15" cy="6" r="2.3"/><circle cx="0" cy="6" r="2.3"/><circle cx="15" cy="6" r="2.3"/></g>`}`
  const radius=kind===1?14:12
  return `<svg viewBox="-38 -28 76 52" aria-hidden="true"><g stroke="#0b1735" stroke-width="2" stroke-linejoin="round">${body}<path d="M${-radius}-3a${radius} ${radius} 0 0 1 ${radius*2} 0Z" fill="${color}"/></g><ellipse cx="0" cy="-7" rx="5.5" ry="6" fill="#c8ffef"/><g fill="#0b1735"><ellipse cx="-2.5" cy="-7" rx="1" ry="2"/><ellipse cx="2.5" cy="-7" rx="1" ry="2"/></g><path d="M-8-9-5-12" stroke="#e0ffff" opacity=".75" stroke-width="2"/></svg>`
}
