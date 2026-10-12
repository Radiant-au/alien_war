import { VIEW_HEIGHT, VIEW_WIDTH } from './config.ts'

/** Keep the battlefield proportional while filling every browser aspect ratio. */
export function viewportMetrics(width: number, height: number) {
  const scale = Math.max(0.1, Math.min(width / VIEW_WIDTH, height / VIEW_HEIGHT))
  return { scale, logicalWidth: width / scale }
}
