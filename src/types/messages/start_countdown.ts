import { StatusCountdownOptions } from "../../lib/StatusCountdown"

type StartCountdownMessage = {
  type: "start_countdown"
  payload: StatusCountdownOptions
}

export default StartCountdownMessage
