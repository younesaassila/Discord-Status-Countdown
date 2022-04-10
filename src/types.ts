export interface Countdown {
  isoDateTime: string
  statusEmoji: string
  statusPrefix: string
  statusSuffix: string
  endStatus: string
  interval: number
}

export type StartCountdownMessage = {
  type: "START_COUNTDOWN"
  payload: Countdown
}

export type StopCountdownMessage = {
  type: "STOP_COUNTDOWN"
}

export type CurrentCountdownMessage = {
  type: "CURRENT_COUNTDOWN"
  payload?: Countdown
}

export type ErrorMessage = {
  type: "ERROR"
  payload: string
}

export type Message =
  | StartCountdownMessage
  | StopCountdownMessage
  | CurrentCountdownMessage
  | ErrorMessage

export type ChangeTypeOfKeys<Obj, NewType> = {
  [K in keyof Obj]: NewType
}
