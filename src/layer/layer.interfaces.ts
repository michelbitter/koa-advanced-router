import {Middleware, Next, DefaultContext, DefaultState, ParameterizedContext} from 'koa'
import * as httpErrors from 'http-errors'
import * as koaCompose from 'koa-compose'
import {Options} from '../interfaces'
import CORSHandler from '../corsHandler/corsHandler'
import * as path2regexp from 'path-to-regexp'

export interface LayerDependencies {
  readonly httpErrors: typeof httpErrors
  readonly CORSHandler: CORSHandler
  readonly koaCompose: typeof koaCompose
  readonly path2regexp: typeof path2regexp
}

export enum Methods {
  connect = 'CONNECT',
  delete = 'DELETE',
  get = 'GET',
  head = 'HEAD',
  options = 'OPTIONS',
  patch = 'PATCH',
  post = 'POST',
  put = 'PUT',
  trace = 'TRACE',
}

export interface RouteObj {
  readonly methods: Methods[]
  readonly middleware: Middleware[]
  readonly options?: Options
  readonly params?: Params
  readonly path: string | RegExp
}

export type Param<StateT = DefaultState, CustomT = DefaultContext, TParam = unknown> = (
  ctx: ParameterizedContext<StateT, CustomT>,
  next: Next,
  param: TParam,
) => // eslint-disable-next-line @typescript-eslint/no-explicit-any
any

export interface Params {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  [key: string]: Param<any, any, any>
}

export interface MatchedParam {
  readonly [key: string]: unknown
}
