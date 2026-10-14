/** Asset-free flat background, independent of the moving battlefield camera. */
export function backgroundMarkup(): string {
  return `<svg class="scenery" viewBox="0 0 1672 940" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
  <defs><linearGradient id="sky" x2="0" y2="1"><stop stop-color="#101a46"/><stop offset=".7" stop-color="#4a4780"/><stop offset="1" stop-color="#727099"/></linearGradient><radialGradient id="moonlight"><stop stop-color="#efedcd" stop-opacity=".22"/><stop offset="1" stop-color="#efedcd" stop-opacity="0"/></radialGradient><linearGradient id="mist" x2="0" y2="1"><stop stop-color="#8b91c7" stop-opacity="0"/><stop offset=".5" stop-color="#8b91c7" stop-opacity=".14"/><stop offset="1" stop-color="#8b91c7" stop-opacity="0"/></linearGradient></defs>
  <path fill="url(#sky)" d="M0 0h1672v940H0Z"/>
  ${Array.from({length:64},(_,i)=>`<circle cx="${(i*271+89)%1672}" cy="${(i*137+37)%440}" r="${i%5===0?1.8:1}" fill="#e4ebff" opacity="${.25+(i%4)*.15}"/>`).join('')}
  <circle cx="300" cy="190" r="100" fill="url(#moonlight)"/><circle cx="300" cy="190" r="44" fill="#aaa6e3"/>
  <g fill="#7674b2" opacity=".65"><circle cx="281" cy="175" r="10"/><circle cx="313" cy="208" r="8"/><circle cx="291" cy="206" r="5"/></g>
  <defs><clipPath id="planet-clip"><circle cx="1320" cy="220" r="122"/></clipPath></defs>
  <circle cx="1320" cy="220" r="122" fill="#353080"/><g clip-path="url(#planet-clip)" stroke="#51429c" stroke-width="22" opacity=".45"><path d="m1150 185 290-130m-270 190 290-130m-270 190 290-130m-270 190 290-130m-270 190 290-130"/></g>
  <path fill="#373d70" d="M0 410 90 345 170 391 240 375 360 451 460 392 580 438 690 403 800 466 920 409 1050 445 1190 386 1300 430 1440 355 1530 402 1610 365 1672 393V940H0Z"/>
  <path fill="#29355e" d="m0 492 100-44 110 56 100-37 150 80 120-58 140 59 150-55 160 66 120-40 130 29 180-92 112 47v438H0Z"/>
  <path fill="url(#mist)" d="M0 510h1672v160H0Z"/></svg>`
}
