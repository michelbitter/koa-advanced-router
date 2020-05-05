import {CorsSettings} from './corsHandler/corsHandler.interfaces'

export interface Options {
  sensitive?: boolean
  allowedMethods?: boolean
  cors?: CorsSettings | CorsSettings[]
}
