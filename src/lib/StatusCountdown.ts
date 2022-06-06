import { DateTime } from "luxon"
import browser from "webextension-polyfill"
import ErrorMessage from "../types/messages/error"
import Timer from "./Timer"

export interface StatusCountdownOptions {
  isoDateTime: string
  statusEmoji: string
  statusPrefix: string
  statusSuffix: string
  statusEnd: string
  interval: number
}

export default class StatusCountdown {
  isoDateTime: string
  statusEmoji: string
  statusPrefix: string
  statusSuffix: string
  statusEnd: string
  interval: number // s

  private token: string
  private timer: Timer
  private _running = false

  constructor(options: StatusCountdownOptions, token: string) {
    this.isoDateTime = options.isoDateTime
    this.statusEmoji = options.statusEmoji
    this.statusPrefix = options.statusPrefix
    this.statusSuffix = options.statusSuffix
    this.statusEnd = options.statusEnd
    this.interval = options.interval

    this.token = token
  }

  get running() {
    return this._running
  }

  start() {
    this._running = true

    const targetDateTime = DateTime.fromISO(this.isoDateTime)

    const callback = async () => {
      let diff = targetDateTime.diffNow(["seconds", "minutes", "hours", "days"])

      // Round second to nearest divisible by interval.
      if (
        Math.abs(diff.seconds % this.interval) < Math.ceil(this.interval / 2)
      ) {
        // Round down
        diff = diff.set({
          seconds: diff.seconds - (diff.seconds % this.interval),
        })
      } else {
        // Round up
        diff = diff.set({
          seconds:
            Math.sign(diff.seconds) *
            (Math.abs(diff.seconds) +
              (this.interval - (Math.abs(diff.seconds) % this.interval))),
        })
      }

      if (diff.toMillis() <= 0) return this.stop()

      const timeString =
        diff.days > 0
          ? diff.toFormat("d:hh:mm:ss")
          : diff.hours > 0
          ? diff.toFormat("h:mm:ss")
          : diff.toFormat("mm:ss")

      const status = `${this.statusPrefix}${timeString}${this.statusSuffix}`
      await this.setStatus(this.statusEmoji, status)
    }

    this.timer = new Timer(callback, this.interval * 1000)
    this.timer.start()
    callback()
  }

  stop() {
    this._running = false

    this.timer.stop()
    this.setStatus(this.statusEmoji, this.statusEnd)
  }

  async setStatus(emoji: string, status: string) {
    const customStatus = `{${
      emoji ? `"emoji_name":"${emoji}",` : ""
    }"text":"${status}"}`

    try {
      const response = await fetch(
        "https://discord.com/api/v9/users/@me/settings",
        {
          headers: {
            authorization: this.token,
            "content-type": "application/json",
          },
          body: `{"custom_status":${status ? customStatus : null}}`,
          method: "PATCH",
          mode: "cors",
          credentials: "include",
        }
      )

      if (response.status === 401) {
        const message: ErrorMessage = {
          type: "error",
          payload: browser.i18n.getMessage("errorInvalidToken"),
        }
        browser.runtime.sendMessage(message)
      }
    } catch (error) {
      console.error(error)
    }
  }
}
