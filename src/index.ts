import RouterClass from './router/router'
import {RouterOptions} from './router/router.interfaces'

export {RouterOptions, VersionOptions, VersionMatchingFunction} from './router/router.interfaces'
export {Params, Methods, RouteObj, Param} from './layer/layer.interfaces'
export {Options as RouteOptions} from './interfaces'

export function Router(opts?: RouterOptions) {
  return RouterClass.factory(opts)
}

export default Router
