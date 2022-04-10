import browser from "webextension-polyfill"
import { DateTime } from "luxon"
import {
  Countdown,
  Message,
  CurrentCountdownMessage,
  ErrorMessage,
} from "./types"

let token = ""
let countdown: Countdown
let controller: AbortController

// Get the user's token to make custom status API requests.
browser.webRequest.onSendHeaders.addListener(
  details => {
    const authorizationHeader = details.requestHeaders.find(
      header => header.name.toLowerCase() === "authorization"
    )
    if (authorizationHeader) {
      token = authorizationHeader.value
    }
  },
  { urls: ["*://*.discord.com/api/*"] },
  ["requestHeaders"]
)

// Listen for messages from the front-end.
browser.runtime.onMessage.addListener(async (message: Message) => {
  switch (message.type) {
    case "START_COUNTDOWN":
      if (!message.payload.isoDateTime) {
        const response: ErrorMessage = {
          type: "ERROR",
          payload: "Please enter a valid date and time",
        }
        return Promise.resolve(response)
      }
      if (!token) {
        const response: ErrorMessage = {
          type: "ERROR",
          payload:
            "Your Discord token is unknown. Please log in to or refresh discord.com",
        }
        return Promise.resolve(response)
      }
      startCountdown(message.payload)
      break
    case "STOP_COUNTDOWN":
      stopCountdown()
      break
    case "CURRENT_COUNTDOWN":
      const response: CurrentCountdownMessage = {
        type: "CURRENT_COUNTDOWN",
        payload: countdown,
      }
      return Promise.resolve(response)
    default:
      break
  }
})

function startCountdown(_countdown: Countdown) {
  countdown = _countdown

  const targetDateTime = DateTime.fromISO(countdown.isoDateTime)
  controller = new AbortController()

  async function callback() {
    let diff = targetDateTime.diffNow(["seconds", "minutes", "hours", "days"])

    // Round to nearest divisible by interval.
    if (
      Math.abs(diff.seconds % countdown.interval) <
      Math.ceil(countdown.interval / 2)
    ) {
      diff = diff.set({
        seconds: diff.seconds - (diff.seconds % countdown.interval),
      })
    } else {
      diff = diff.set({
        seconds:
          Math.sign(diff.seconds) *
          (Math.abs(diff.seconds) +
            (countdown.interval -
              (Math.abs(diff.seconds) % countdown.interval))),
      })
    }

    if (diff.seconds < 0) return stopCountdown()

    const timeString =
      diff.days > 0
        ? diff.toFormat("d:hh:mm:ss")
        : diff.hours > 0
        ? diff.toFormat("h:mm:ss")
        : diff.toFormat("mm:ss")

    const status = `${countdown.statusPrefix}${timeString}${countdown.statusSuffix}`
    await setStatus(countdown.statusEmoji, status)
  }

  createInterval(countdown.interval * 1000, controller.signal, callback)
  callback()
}

function stopCountdown() {
  setStatus(countdown.statusEmoji, countdown.endStatus)
  controller.abort()
  countdown = null
  controller = null
}

async function setStatus(emoji: string, status: string) {
  const customStatus = `{${
    emoji ? `"emoji_name":"${emoji}",` : ""
  }"text":"${status}"}`

  try {
    const response = await fetch(
      "https://discord.com/api/v9/users/@me/settings",
      {
        headers: {
          authorization: token,
          "content-type": "application/json",
        },
        body: `{"custom_status":${status ? customStatus : null}}`,
        method: "PATCH",
        mode: "cors",
        credentials: "include",
      }
    )

    if (response.status === 401) {
      token = ""
      const message: ErrorMessage = {
        type: "ERROR",
        payload:
          "Your Discord token is invalid. Please log in to or refresh discord.com",
      }
      browser.runtime.sendMessage(message)
    }
  } catch (error) {
    console.error(error)
  }
}

// From https://gist.github.com/jakearchibald/cb03f15670817001b1157e62a076fe95
function createInterval(ms: number, signal: AbortSignal, callback: Function) {
  const start = document.timeline
    ? document.timeline.currentTime
    : performance.now()

  function frame(time: number) {
    if (signal.aborted) return
    callback(time)
    scheduleFrame(time)
  }

  function scheduleFrame(time: number) {
    const elapsed = time - start
    const roundedElapsed = Math.round(elapsed / ms) * ms
    const targetNext = start + roundedElapsed + ms
    const delay = targetNext - performance.now()
    setTimeout(() => requestAnimationFrame(frame), delay)
  }

  scheduleFrame(start)
}
