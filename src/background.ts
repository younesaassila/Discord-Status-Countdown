import browser from "webextension-polyfill"
import StatusCountdown, { StatusCountdownOptions } from "./lib/StatusCountdown"
import Message from "./types/message"
import CurrentStatusMessage from "./types/messages/current_status"
import ErrorMessage from "./types/messages/error"

let token = ""
let countdown: StatusCountdown | null = null
;(async () => {
  const storage = await browser.storage.local.get({
    token: "",
    countdownOptions: null,
  })
  token = storage.token
  if (countdown == null && storage.countdownOptions != null) {
    countdown = new StatusCountdown(storage.countdownOptions, token)
    countdown.start()
  }
})()

// Get the user's token to make custom status API requests.
browser.webRequest.onSendHeaders.addListener(
  details => {
    const authorizationHeader = details.requestHeaders?.find(
      header => header.name.toLowerCase() === "authorization"
    )
    if (authorizationHeader && token != authorizationHeader.value) {
      browser.storage.local.set({ token: authorizationHeader.value })
      token = authorizationHeader.value ?? ""
    }
  },
  { urls: ["*://*.discord.com/api/*"] },
  ["requestHeaders"]
)

// Listen for messages from the popup.
browser.runtime.onMessage.addListener((message: Message) => {
  if (message.type === "current_status") {
    if (!countdown) {
      return Promise.resolve({
        type: "current_status",
        payload: {
          countdownOptions: null,
          countdownRunning: false,
        },
      } as CurrentStatusMessage)
    }
    const countdownOptions: StatusCountdownOptions = {
      isoDateTime: countdown.isoDateTime,
      statusEmoji: countdown.statusEmoji,
      statusPrefix: countdown.statusPrefix,
      statusSuffix: countdown.statusSuffix,
      statusEnd: countdown.statusEnd,
      interval: countdown.interval,
    }
    return Promise.resolve({
      type: "current_status",
      payload: {
        countdownOptions: countdownOptions,
        countdownRunning: countdown.running,
      },
    } as CurrentStatusMessage)
  }

  if (message.type === "start_countdown") {
    if (!token) {
      return Promise.resolve({
        type: "error",
        payload: browser.i18n.getMessage("errorMissingToken"),
      } as ErrorMessage)
    }

    browser.storage.local.set({ countdownOptions: message.payload })
    countdown = new StatusCountdown(message.payload, token)
    countdown.start()
  }

  if (message.type === "stop_countdown") {
    browser.storage.local.set({ countdownOptions: null })
    countdown?.stop()
  }
})
