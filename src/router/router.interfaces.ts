import Layer from '../layer/layer'
import {Options} from '../interfaces'
import * as httpErrors from 'http-errors'
import * as koaCompose from 'koa-compose'

export interface RouterOptions extends Options {
  version?: false | VersionSettings
  expose?: boolean
}

export interface VersionSettings {
  type: 'url' | 'header' | Function
  identifier: string
}

export interface RouterDependencies {
  readonly Layer: typeof Layer
  readonly httpErrors: typeof httpErrors
  readonly koaCompose: typeof koaCompose
}
