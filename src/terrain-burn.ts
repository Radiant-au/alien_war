import { surfaceAt, type Terrain } from './game/terrain.ts'

export const BURN_SECONDS = 7
export const SCORCH_SECONDS = 22
export const MAX_BURN_PATCHES = 6
export interface BurnPoint { x:number; y:number }
export interface BurnPatch { age:number; radius:number; points:BurnPoint[] }

/** Capture the exposed surface once: later destruction must extinguish old fuel. */
export function createBurnPatch(terrain:Terrain,x:number,radius:number):BurnPatch {
  const left=Math.max(0,x-radius*.9),right=Math.min(terrain.heights.length-1,x+radius*.9)
  const count=Math.max(2,Math.ceil((right-left)/6))
  return {age:0,radius,points:Array.from({length:count+1},(_,i)=>{
    const px=left+(right-left)*i/count
    return {x:px,y:surfaceAt(terrain,px)}
  })}
}
export function burnSupported(terrain:Terrain,point:BurnPoint):boolean {
  return Math.abs(surfaceAt(terrain,point.x)-point.y)<3
}
export function burnStrength(age:number):number {
  return Math.max(0,Math.min(1,age/.18,(BURN_SECONDS-age)/2))
}
export function scorchStrength(age:number):number {
  return Math.max(0,Math.min(1,(SCORCH_SECONDS-age)/6))
}
