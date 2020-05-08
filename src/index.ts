import {RouterOptions} from './router/router.interfaces'
import RouterClass from './router/router'

export {RouterOptions, VersionOptions, VersionMatchingFunction} from './router/router.interfaces'
export {Params, Methods, RouteObj, Param} from './layer/layer.interfaces'
export {Options as RouteOptions} from './interfaces'

export type Router = RouterClass

export default function (opts?: RouterOptions) {
  return RouterClass.factory(opts)
}
