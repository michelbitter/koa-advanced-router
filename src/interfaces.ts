import {CorsSettings} from './corsHandler/corsHandler.interfaces'

export interface Options {
  allowedMethods?: boolean
  prefixes?: string
  ignoreCaptures?: boolean
  sensitive?: boolean
  strict?: boolean
  end?: boolean
  cors?: CorsSettings | CorsSettings[]
}
