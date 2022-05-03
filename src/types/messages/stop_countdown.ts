import { StatusCountdownOptions } from "../../lib/StatusCountdown"

type StopCountdownMessage = {
  type: "stop_countdown"
  payload?: StatusCountdownOptions
}

export default StopCountdownMessage
