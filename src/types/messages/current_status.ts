import { StatusCountdownOptions } from "../../lib/StatusCountdown"

type CurrentStatusMessage = {
  type: "current_status"
  payload?: {
    countdownOptions: StatusCountdownOptions | null
    countdownRunning: boolean
  }
}

export default CurrentStatusMessage
