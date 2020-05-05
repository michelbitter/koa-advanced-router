import Layer from '../layer/layer'
import {Options} from '../interfaces'
import * as httpErrors from 'http-errors'
import * as koaCompose from 'koa-compose'
import {Context} from 'koa'

export interface VersionOptions extends Options {
  expose?: boolean
}

export interface RouterOptions extends VersionOptions {
  versionHandler?: false | 'url' | 'header' | VersionMatchingFunction
  prefix?: string
}

export type VersionMatchingFunction = (ctx: Context, identifiers: string[]) => string | null

export interface RouterDependencies {
  readonly Layer: typeof Layer
  readonly httpErrors: typeof httpErrors
  readonly koaCompose: typeof koaCompose
}
