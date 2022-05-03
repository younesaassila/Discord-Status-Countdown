import $$ from "./$$"
import browser from "webextension-polyfill"

export default function localizeHTML() {
  const elements = [...$$("[data-localize]")]
  const messageNameRegex = /^__MSG_([a-zA-Z0-9-_]+)__$/

  for (const element of elements) {
    const text: string | undefined = element.dataset?.localize
    const textMatch = text?.match(messageNameRegex)
    const messageName = textMatch?.[1]
    if (messageName != null) {
      element.textContent = browser.i18n.getMessage(messageName)
    }

    for (const attribute of Object.values(element.attributes)) {
      if (attribute.name === "data-localize") continue
      const valueMatch = attribute.value.match(messageNameRegex)
      const messageName = valueMatch?.[1]
      if (messageName != null) {
        element.setAttribute(
          attribute.name,
          browser.i18n.getMessage(messageName)
        )
      }
    }
  }
}
