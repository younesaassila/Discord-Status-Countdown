import CurrentStatusMessage from "./messages/current_status"
import StartCountdownMessage from "./messages/start_countdown"
import StopCountdownMessage from "./messages/stop_countdown"
import ErrorMessage from "./messages/error"

type Message =
  | CurrentStatusMessage
  | StartCountdownMessage
  | StopCountdownMessage
  | ErrorMessage

export default Message
