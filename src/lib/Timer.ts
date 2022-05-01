/**
 * Adapted from https://stackoverflow.com/a/55266303
 */
export default class Timer {
  private handler: Function
  interval: number

  private timeout: number
  private expected: number
  private driftHistory = []
  private driftHistorySamples = 10
  private driftCorrection = 0

  constructor(handler: Function, interval = 0) {
    this.handler = handler
    this.interval = interval
  }

  set onstep(handler) {
    this.handler = handler
  }

  start() {
    this.expected = Date.now() + this.interval
    this.timeout = setTimeout(this.step.bind(this), this.interval)
  }

  stop() {
    clearTimeout(this.timeout)
  }

  private calculateDrift() {
    const values = this.driftHistory.concat() // Copy array so it isn't mutated.
    values.sort((a, b) => a - b)

    if (values.length === 0) return 0

    const half = Math.floor(values.length / 2)
    let median: number

    if (values.length % 2) median = values[half]
    else median = (values[half - 1] + values[half]) / 2.0

    return median
  }

  private step() {
    this.handler()

    const drift = Date.now() - this.expected // The drift (positive for overshooting)

    // Don't update the history for exceptionally large values.
    if (drift <= this.interval) {
      // Sample drift amount to history after removing current correction
      // (add to remove because the correction is applied by subtraction)
      this.driftHistory.push(drift + this.driftCorrection)

      // Predict new drift correction.
      this.driftCorrection = this.calculateDrift()

      // Cap and refresh samples.
      if (this.driftHistory.length >= this.driftHistorySamples) {
        this.driftHistory.shift()
      }
    }

    this.expected += this.interval
    // Take into account drift with prediction.
    this.timeout = setTimeout(
      this.step.bind(this),
      Math.max(0, this.interval - drift - this.driftCorrection)
    )
  }
}
