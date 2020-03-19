import {Methods} from '../layer/layer.interfaces'
import {Context} from 'koa'
import * as httpErrors from 'http-errors'

export interface CORSHandlerDependencies {
  httpErrors: typeof httpErrors
}

export type AllowedOriginValues = string | RegExp | ((ctx: Context) => boolean)

export interface CorsSettings {
  allowedOrigin: AllowedOriginValues | AllowedOriginValues[]
  exposedHeaders: string[]
  maxAge: number
  allowCredentials: boolean
  allowedMethods: Methods[]
  allowedHeaders: string[]
}

export interface CorsHeaders {
  'Access-Control-Allow-Credentials': boolean
  'Access-Control-Allow-Headers': string
  'Access-Control-Allow-Methods': string
  'Access-Control-Allow-Origin': string
  'Access-Control-Expose-Headers': string
  'Access-Control-Max-Age': number
}
