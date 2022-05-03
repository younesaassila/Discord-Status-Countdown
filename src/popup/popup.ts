import { ChangeTypeOfKeys } from "../types"
import { StatusCountdownOptions } from "../lib/StatusCountdown"
import $ from "../utils/$"
import browser from "webextension-polyfill"
import Message from "../types/message"
import StartCountdownMessage from "../types/messages/start_countdown"
import CurrentStatusMessage from "../types/messages/current_status"
import StopCountdownMessage from "../types/messages/stop_countdown"

const errorMessageElement = $("#error-message") as HTMLParagraphElement
const formElement = $("#form") as HTMLFormElement
const stopCountdownButton = $("#stop-countdown-button") as HTMLButtonElement
const inputElements: ChangeTypeOfKeys<
  StatusCountdownOptions,
  HTMLInputElement
> = {
  isoDateTime: $("#datetime-input") as HTMLInputElement,
  statusEmoji: $("#status-emoji-input") as HTMLInputElement,
  statusPrefix: $("#status-prefix-input") as HTMLInputElement,
  statusSuffix: $("#status-suffix-input") as HTMLInputElement,
  statusEnd: $("#status-end-input") as HTMLInputElement,
  interval: $("#interval-input") as HTMLInputElement,
}

window.addEventListener("load", init)
formElement.addEventListener("submit", startCountdown)
stopCountdownButton.addEventListener("click", stopCountdown)

// Listen for messages from the background script.
browser.runtime.onMessage.addListener((message: Message) => {
  if (message.type === "error") handleMessage(message)
})

async function init() {
  const message: CurrentStatusMessage = {
    type: "current_status",
  }

  const response: Message = await browser.runtime.sendMessage(message)
  handleMessage(response, () => {
    if (response?.type === "current_status") {
      if (response?.payload.countdownOptions != null) {
        for (const [key, value] of Object.entries(
          response.payload.countdownOptions
        )) {
          const inputElement: HTMLInputElement = inputElements[key]
          if (inputElement != null) inputElement.value = value
        }

        setRunningMode(true)
      }
    }
  })
}

async function startCountdown(e: SubmitEvent) {
  e.preventDefault()

  const formData = new FormData(formElement)

  const isoDateTime = formData.get("datetime-input").toString()
  if (!isoDateTime)
    return showError(browser.i18n.getMessage("errorInvalidDateTime"))

  const interval = parseInt(formData.get("interval-input").toString())
  if (!interval)
    return showError(browser.i18n.getMessage("errorInvalidInterval"))

  const message: StartCountdownMessage = {
    type: "start_countdown",
    payload: {
      isoDateTime,
      statusEmoji: formData.get("status-emoji-input").toString(),
      statusPrefix: formData.get("status-prefix-input").toString(),
      statusSuffix: formData.get("status-suffix-input").toString(),
      statusEnd: formData.get("status-end-input").toString(),
      interval,
    },
  }

  const response: Message = await browser.runtime.sendMessage(message)
  handleMessage(response, () => setRunningMode(true))
}

async function stopCountdown() {
  const message: StopCountdownMessage = {
    type: "stop_countdown",
  }

  const response: Message = await browser.runtime.sendMessage(message)
  handleMessage(response, () => setRunningMode(false))
}

function setRunningMode(running: boolean) {
  formElement
    .querySelectorAll("input")
    .forEach(input => (input.disabled = running))
  stopCountdownButton.disabled = !running
}

function showError(message: string) {
  if (!message) {
    errorMessageElement.textContent = ""
  } else {
    errorMessageElement.textContent = message
  }
}

function handleMessage(
  response: Message,
  onSuccess?: Function,
  onError?: Function
) {
  if (response?.type === "error") {
    showError(response.payload)
    if (onError) onError()
  } else {
    showError(null)
    if (onSuccess) onSuccess()
  }
}
