/** Convert a drag from the ship into a world-space aim, independent of camera zoom. */
export function dragAim(dx: number, dy: number, reach: number) {
  const elevation = Math.max(3, Math.min(87, Math.atan2(Math.max(0, -dy), Math.abs(dx)) * 180 / Math.PI))
  const angle = -elevation * Math.PI / 180
  return {
    angle: dx < 0 ? Math.PI - angle : angle,
    power: Math.max(.15, Math.min(1, Math.hypot(dx, dy) / Math.max(1, reach))),
  }
}

/** Hold the readout briefly after release, then fade without changing the saved aim. */
export function aimFeedbackAlpha(now: number, lastInteraction: number, dragging: boolean) {
  if (dragging) return 1
  return Math.max(0, Math.min(1, 1 - (now - lastInteraction - 1.2) / .5))
}
