/** Asset-free flat background, independent of the moving battlefield camera. */
export function backgroundMarkup(): string {
  return `<svg class="scenery" viewBox="0 0 1672 940" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
  <defs><linearGradient id="sky" x2="0" y2="1"><stop stop-color="#101a46"/><stop offset=".7" stop-color="#4a4780"/><stop offset="1" stop-color="#727099"/></linearGradient><radialGradient id="moonlight"><stop stop-color="#efedcd" stop-opacity=".22"/><stop offset="1" stop-color="#efedcd" stop-opacity="0"/></radialGradient><linearGradient id="mist" x2="0" y2="1"><stop stop-color="#8b91c7" stop-opacity="0"/><stop offset=".5" stop-color="#8b91c7" stop-opacity=".14"/><stop offset="1" stop-color="#8b91c7" stop-opacity="0"/></linearGradient></defs>
  <path fill="url(#sky)" d="M0 0h1672v940H0Z"/>
  ${Array.from({length:64},(_,i)=>`<circle cx="${(i*271+89)%1672}" cy="${(i*137+37)%440}" r="${i%5===0?1.8:1}" fill="#e4ebff" opacity="${.25+(i%4)*.15}"/>`).join('')}
  <circle cx="1290" cy="200" r="140" fill="url(#moonlight)"/><circle cx="1290" cy="200" r="44" fill="#f3eed5"/>
  <g fill="#d9d5c7" opacity=".45"><circle cx="1280" cy="183" r="8"/><circle cx="1307" cy="217" r="9"/><circle cx="1268" cy="208" r="6"/></g>
  <path fill="#373d70" d="M0 410 90 345 170 391 240 375 360 451 460 392 580 438 690 403 800 466 920 409 1050 445 1190 386 1300 430 1440 355 1530 402 1610 365 1672 393V940H0Z"/>
  <path fill="#29355e" d="m0 492 100-44 110 56 100-37 150 80 120-58 140 59 150-55 160 66 120-40 130 29 180-92 112 47v438H0Z"/>
  <g fill="#1c2c4e" opacity=".65">${Array.from({length:48},(_,i)=>{const x=i*38-20,y=548+Math.sin(i*.6)*24;return `<path d="m${x} ${y} 12-33 12 33h-6l12 19h-36l12-19Z"/>`}).join('')}</g>
  <path fill="url(#mist)" d="M0 510h1672v160H0Z"/></svg>`
}
