/** A bounded, explicit startup handshake, independent of Phaser plugin injection. */
export function startupSignal(timeoutMs = 30000) {
  let ready!: () => void
  let fail!: (error: unknown) => void
  const promise = new Promise<void>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('Arena startup timed out')), timeoutMs)
    ready = () => { clearTimeout(timer); resolve() }
    fail = error => { clearTimeout(timer); reject(error) }
  })
  // Startup can fail before the caller has finished importing the engine module.
  void promise.catch(() => {})
  return { promise, ready, fail }
}

export function withDeadline<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('Loading timed out')), timeoutMs)
    promise.then(value => { clearTimeout(timer); resolve(value) }, error => { clearTimeout(timer); reject(error) })
  })
}


/** Keep the opening screen visible for the requested minimum, even on cache hits. */
export function remainingLoadingTime(startedAt: number, now: number, minimumMs = 20000): number {
  return Math.max(0, minimumMs - Math.max(0, now - startedAt))
}
