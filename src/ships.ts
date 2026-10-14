import Phaser from 'phaser'

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
  const color = '#'+SHIPS[kind].color.toString(16).padStart(6,'0')
  const body = kind === 1
    ? `<path d="M12 25h39l4 13H9Z" fill="${color}"/><path d="m14 35-6 9h13Zm35 0 7 9H43Z" fill="${color}"/>`
    : kind === 2
    ? `<path d="m7 26 37 2 17 11-44 5Z" fill="${color}"/><path d="m12 28-6-20 17 5 8 16ZM23 36 4 45h22Z" fill="${color}"/>`
    : `<ellipse cx="32" cy="31" rx="26" ry="10" fill="${color}"/>${kind === 3 ? `<circle cx="9" cy="31" r="9" fill="${color}" stroke="#0b1735" stroke-width="2"/><circle cx="54" cy="31" r="9" fill="${color}" stroke="#0b1735" stroke-width="2"/>` : ''}`
  return `<svg viewBox="0 0 64 48" aria-hidden="true">${body}<path d="M17 27a15 15 0 0 1 30 0Z" fill="${color}" stroke="#0b1735" stroke-width="2"/><ellipse cx="32" cy="22" rx="7" ry="8" fill="#c8ffef"/><ellipse cx="29" cy="22" rx="1.5" ry="3" fill="#0b1735"/><ellipse cx="35" cy="22" rx="1.5" ry="3" fill="#0b1735"/></svg>`
}
