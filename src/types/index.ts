export type ChangeTypeOfKeys<Obj, NewType> = {
  [K in keyof Obj]: NewType
}
