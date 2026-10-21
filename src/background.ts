/** Asset-free flat background, independent of the moving battlefield camera. */
let backgroundId=0
export function backgroundMarkup(): string {
  const prefix=`sky-${++backgroundId}-`
  const meteors=Array.from({length:4},()=>{
    const x=120+Math.random()*1150,y=35+Math.random()*200
    return `<g class="scenery-meteor" style="--meteor-delay:${-Math.random()*24}s;--meteor-cycle:${18+Math.random()*18}s"><path d="M${x} ${y}l-95-42" stroke="url(#meteor-trail)" stroke-width="2" stroke-linecap="round"/><circle cx="${x}" cy="${y}" r="2" fill="#e5fcff"/></g>`
  }).join('')
  const markup= `<svg class="scenery" viewBox="0 0 1672 940" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
  <defs><linearGradient id="sky" x2="0" y2="1"><stop stop-color="#101a46"/><stop offset=".7" stop-color="#4a4780"/><stop offset="1" stop-color="#727099"/></linearGradient><radialGradient id="moonlight"><stop stop-color="#efedcd" stop-opacity=".22"/><stop offset="1" stop-color="#efedcd" stop-opacity="0"/></radialGradient><radialGradient id="aurora"><stop stop-color="#52e3d5" stop-opacity=".18"/><stop offset="1" stop-color="#52e3d5" stop-opacity="0"/></radialGradient><linearGradient id="mist" x2="0" y2="1"><stop stop-color="#8b91c7" stop-opacity="0"/><stop offset=".5" stop-color="#8b91c7" stop-opacity=".14"/><stop offset="1" stop-color="#8b91c7" stop-opacity="0"/></linearGradient></defs>
  <defs><linearGradient id="meteor-trail"><stop stop-color="#d9faff"/><stop offset="1" stop-color="#a9dfff" stop-opacity="0"/></linearGradient></defs>
  <path fill="url(#sky)" d="M0 0h1672v940H0Z"/>
  <g class="scenery-stars">${Array.from({length:64},(_,i)=>`<circle class="scenery-star" style="--star-cycle:${4+(i%7)}s;--star-delay:${-i*.73}s;--star-brightness:${.4+(i%4)*.18}" cx="${(i*271+89)%1672}" cy="${(i*137+37)%440}" r="${i%5===0?1.8:1}" fill="#e4ebff" opacity="${.25+(i%4)*.15}"/>`).join('')}</g>
  ${meteors}
  <ellipse class="scenery-aurora" cx="830" cy="300" rx="620" ry="150" fill="url(#aurora)"/>
  <circle class="scenery-moon-halo" cx="300" cy="190" r="100" fill="url(#moonlight)"/><circle class="scenery-moon-disc" cx="300" cy="190" r="44" fill="#aaa6e3"/>
  <g fill="#7674b2" opacity=".65"><circle cx="281" cy="175" r="10"/><circle cx="313" cy="208" r="8"/><circle cx="291" cy="206" r="5"/></g>
  <defs><clipPath id="planet-clip"><circle cx="1320" cy="220" r="122"/></clipPath></defs>
  <circle class="scenery-planet-glow" cx="1320" cy="220" r="137" fill="#7a68d4" opacity=".07"/>
  <circle cx="1320" cy="220" r="122" fill="#353080"/><g clip-path="url(#planet-clip)" stroke="#51429c" stroke-width="22" opacity=".45"><path d="m1150 185 290-130m-270 190 290-130m-270 190 290-130m-270 190 290-130m-270 190 290-130"/></g>
  <path fill="#373d70" d="M0 410 90 345 170 391 240 375 360 451 460 392 580 438 690 403 800 466 920 409 1050 445 1190 386 1300 430 1440 355 1530 402 1610 365 1672 393V940H0Z"/>
  <path fill="#29355e" d="m0 492 100-44 110 56 100-37 150 80 120-58 140 59 150-55 160 66 120-40 130 29 180-92 112 47v438H0Z"/>
  <path class="scenery-mist" fill="url(#mist)" d="M-120 510h1912v160H-120Z"/></svg>`
  return markup.replace(/id="([^"]+)"/g,(_,id)=>`id="${prefix}${id}"`).replace(/url\(#([^)]+)\)/g,(_,id)=>`url(#${prefix}${id})`)
}


