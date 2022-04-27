import browser from "webextension-polyfill"
import Timer from "./lib/Timer"
import { DateTime } from "luxon"
import {
  Countdown,
  Message,
  StartCountdownMessage,
  StopCountdownMessage,
  CurrentCountdownMessage,
  ErrorMessage,
} from "./types"

let token = ""
let countdown: Countdown
let timer: Timer

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
      return handleStartCountdownMessage(message)
    case "STOP_COUNTDOWN":
      return handleStopCountdownMessage(message)
    case "CURRENT_COUNTDOWN":
      return handleCurrentCountdownMessage(message)
    default:
      break
  }
})

function startCountdown(payload: Countdown) {
  countdown = payload

  const targetDateTime = DateTime.fromISO(countdown.isoDateTime)

  const callback = async () => {
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

  timer = new Timer(callback, countdown.interval * 1000)

  callback()
  timer.start()
}

function stopCountdown() {
  setStatus(countdown.statusEmoji, countdown.endStatus)
  timer.stop()
  countdown = null
  timer = null
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

//#region Message handlers

function handleStartCountdownMessage(message: StartCountdownMessage) {
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

  return startCountdown(message.payload)
}

function handleStopCountdownMessage(_message: StopCountdownMessage) {
  return stopCountdown()
}

function handleCurrentCountdownMessage(_message: CurrentCountdownMessage) {
  const response: CurrentCountdownMessage = {
    type: "CURRENT_COUNTDOWN",
    payload: countdown,
  }

  return Promise.resolve(response)
}

//#endregion
