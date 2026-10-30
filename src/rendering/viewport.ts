import { VIEW_HEIGHT, VIEW_WIDTH } from '../game/config.ts'

/** Keep the battlefield proportional while filling every browser aspect ratio. */
export function viewportMetrics(width: number, height: number) {
  const scale = Math.max(0.1, Math.min(width / VIEW_WIDTH, height / VIEW_HEIGHT))
  return { scale, logicalWidth: width / scale }
}


/** Touch devices need a wide battlefield; desktop portrait windows remain usable. */
export function needsLandscape(width:number,height:number,touchDevice:boolean):boolean {
  return touchDevice && height > width
}
