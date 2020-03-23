import {RouterOptions as ROptions} from './router/router.interfaces'
import RouterClass from './router/router'
import {Params as IParams, Methods as IMethods, RouteObj, Param as IParam} from './layer/layer.interfaces'
import {DefaultState, DefaultContext} from 'koa'

export type RouterOptions = ROptions
export type Param<StateT = DefaultState, CustomT = DefaultContext, TParam = unknown> = IParam<StateT, CustomT, TParam>
export type Params = IParams
export type Methods = IMethods
export type Route = RouteObj

export function Router(opts?: RouterOptions) {
  return RouterClass.factory(opts)
}

export default Router
