import type { Preferences } from './preferences.ts'
import { AudioMixer } from './audio-mixer.ts'
import introTrack from '../../assets/music/intro.mp3?url'
import menuTrack from '../../assets/music/main_menu.mp3?url'
import shootSound from '../../assets/Sfx/shoot.mp3?url'
import electricSound from '../../assets/Sfx/electric.ogg?url'
import poisonSound from '../../assets/Sfx/poison.ogg?url'
import fireSound from '../../assets/Sfx/fire.mp3?url'
import iceSound from '../../assets/Sfx/ice.mp3?url'
export const SFX_ASSETS=[shootSound,electricSound,poisonSound,fireSound,iceSound]
export class GameAudio extends AudioMixer {
  constructor(settings:Preferences){super(settings,{intro:introTrack,menu:menuTrack,shot:shootSound,electric:electricSound,poison:poisonSound,fire:fireSound,ice:iceSound})}
}
