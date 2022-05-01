import browser from "webextension-polyfill"
import StatusCountdown, { StatusCountdownOptions } from "./lib/StatusCountdown"
import Message from "./types/message"
import CurrentStatusMessage from "./types/messages/current_status"
import ErrorMessage from "./types/messages/error"

let token = ""
let countdown: StatusCountdown

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

// Listen for messages from the popup.
browser.runtime.onMessage.addListener((message: Message) => {
  if (message.type === "current_status") {
    const countdownOptions: StatusCountdownOptions = {
      isoDateTime: countdown.isoDateTime,
      statusEmoji: countdown.statusEmoji,
      statusPrefix: countdown.statusPrefix,
      statusSuffix: countdown.statusSuffix,
      statusEnd: countdown.statusEnd,
      interval: countdown.interval,
    }
    const message: CurrentStatusMessage = {
      type: "current_status",
      payload: {
        countdownOptions: countdown != null ? countdownOptions : null,
      },
    }
    return Promise.resolve(message)
  }

  if (message.type === "start_countdown") {
    if (!token) {
      const message: ErrorMessage = {
        type: "error",
        payload: browser.i18n.getMessage("errorMissingToken"),
      }
      return Promise.resolve(message)
    }

    countdown = new StatusCountdown(message.payload, token)
    countdown.start()
  }

  if (message.type === "stop_countdown") {
    countdown.stop()
  }
})
