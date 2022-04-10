import browser from "webextension-polyfill"
import $ from "../utils/$"
import {
  Countdown,
  Message,
  StartCountdownMessage,
  StopCountdownMessage,
  CurrentCountdownMessage,
  ChangeTypeOfKeys,
} from "../types"

const errorMessageElement = $("#error-message") as HTMLParagraphElement
const formElement = $("#form") as HTMLFormElement
const stopCountdownButton = $("#stop-countdown-button") as HTMLButtonElement
const inputElements: ChangeTypeOfKeys<Countdown, HTMLInputElement> = {
  isoDateTime: $("#datetime-input") as HTMLInputElement,
  statusEmoji: $("#status-emoji-input") as HTMLInputElement,
  statusPrefix: $("#status-prefix-input") as HTMLInputElement,
  statusSuffix: $("#status-suffix-input") as HTMLInputElement,
  endStatus: $("#end-status-input") as HTMLInputElement,
  interval: $("#interval-input") as HTMLInputElement,
}

window.addEventListener("load", isCountdownRunning)
formElement.addEventListener("submit", startCountdown)
stopCountdownButton.addEventListener("click", stopCountdown)

// Listen for messages from the back-end.
browser.runtime.onMessage.addListener(async (message: Message) => {
  if (message.type === "ERROR") {
    handleMessage(message)
  }
})

async function isCountdownRunning() {
  const message: CurrentCountdownMessage = {
    type: "CURRENT_COUNTDOWN",
  }
  const response: Message = await browser.runtime.sendMessage(message)

  handleMessage(response, () => {
    if (response?.type === "CURRENT_COUNTDOWN" && response?.payload != null) {
      for (const [key, value] of Object.entries(response.payload)) {
        const inputElement: HTMLInputElement = inputElements[key]
        if (inputElement != null) inputElement.value = value
      }

      formElement
        .querySelectorAll("input")
        .forEach(input => (input.disabled = true))
      stopCountdownButton.disabled = false
    }
  })
}

async function startCountdown(e: SubmitEvent) {
  e.preventDefault()

  const formData = new FormData(formElement)

  const message: StartCountdownMessage = {
    type: "START_COUNTDOWN",
    payload: {
      isoDateTime: formData.get("datetime-input").toString(),
      statusEmoji: formData.get("status-emoji-input").toString(),
      statusPrefix: formData.get("status-prefix-input").toString(),
      statusSuffix: formData.get("status-suffix-input").toString(),
      endStatus: formData.get("end-status-input").toString(),
      interval: parseInt(formData.get("interval-input").toString()),
    },
  }
  const response: Message = await browser.runtime.sendMessage(message)

  handleMessage(response, () => {
    formElement
      .querySelectorAll("input")
      .forEach(input => (input.disabled = true))
    stopCountdownButton.disabled = false
  })
}

async function stopCountdown() {
  const message: StopCountdownMessage = {
    type: "STOP_COUNTDOWN",
  }
  const response: Message = await browser.runtime.sendMessage(message)

  handleMessage(response, () => {
    formElement
      .querySelectorAll("input")
      .forEach(input => (input.disabled = false))
    stopCountdownButton.disabled = true
  })
}

function handleMessage(
  response: Message,
  onSuccess?: Function,
  onError?: Function
) {
  if (response?.type === "ERROR") {
    errorMessageElement.textContent = response.payload
    if (onError) onError()
  } else {
    errorMessageElement.textContent = ""
    if (onSuccess) onSuccess()
  }
}
