/**
 * Adapted from https://gist.github.com/jakearchibald/cb03f15670817001b1157e62a076fe95
 */
export default class Timer {
  private handler: Function
  interval: number // ms

  private controller: AbortController
  private startTime: number

  constructor(handler: Function, interval = 0) {
    this.handler = handler
    this.interval = interval
  }

  start() {
    this.controller = new AbortController()
    // Prefer currentTime, as it'll better sync animations queued in the
    // same frame, but if it isn't supported, performance.now() is fine.
    this.startTime = document.timeline
      ? document.timeline.currentTime
      : performance.now()

    setTimeout(this.step.bind(this), this.interval)
  }

  stop() {
    this.controller.abort()
  }

  private step() {
    if (this.controller.signal.aborted) return

    const currentTime = performance.now()
    const elapsedTime = currentTime - this.startTime
    const roundedElapsed =
      Math.round(elapsedTime / this.interval) * this.interval

    this.handler(elapsedTime)

    const targetNext = this.startTime + roundedElapsed + this.interval
    const delay = targetNext - performance.now()
    setTimeout(this.step.bind(this), delay)
  }
}
