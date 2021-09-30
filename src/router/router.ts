import {RouterDependencies, RouterOptions, VersionOptions} from './router.interfaces'
import {Params, Methods, RouteObj} from '../layer/layer.interfaces'
import Layer from '../layer/layer'
import {Middleware, Context, Next} from 'koa'
import * as httpErrors from 'http-errors'
import * as koaCompose from 'koa-compose'

export default class Router {
  public static factory(opts?: RouterOptions) {
    return new this(
      {
        Layer: Layer,
        httpErrors,
        koaCompose,
      },
      opts,
    )
  }

  private middleware: Middleware[] = []
  private params: Params = {}
  private routeList: RouteObj[] = []
  private versions: {[key: string]: Router} = {}
  private opts: RouterOptions = {
    allowedMethods: true,
    cors: [],
    expose: false,
    prefix: undefined,
    sensitive: false,
    versionHandler: false,
  }

  public constructor(private deps: RouterDependencies, opts?: RouterOptions) {
    if (opts !== undefined) {
      this.opts = {
        ...this.opts,
        ...opts,
      }
    }
  }

  public route(route: RouteObj) {
    this.routeList.push(route)
    return this
  }

  public all(path: string | RegExp, middleware: Middleware[], params?: Params, opts?: RouteObj['options']) {
    return this.route({
      methods: [
        Methods.connect,
        Methods.delete,
        Methods.get,
        Methods.head,
        Methods.options,
        Methods.patch,
        Methods.post,
        Methods.put,
        Methods.trace,
      ],
      middleware,
      options: opts,
      params,
      path: path,
    })
  }

  public connect(path: string | RegExp, middleware: Middleware[], params?: Params, opts?: RouteObj['options']) {
    return this.route({
      methods: [Methods.connect],
      middleware,
      options: opts,
      params,
      path: path,
    })
  }

  public delete(path: string | RegExp, middleware: Middleware[], params?: Params, opts?: RouteObj['options']) {
    return this.route({
      methods: [Methods.delete],
      middleware,
      options: opts,
      params,
      path: path,
    })
  }

  public get(path: string | RegExp, middleware: Middleware[], params?: Params, opts?: RouteObj['options']) {
    return this.route({
      methods: [Methods.get],
      middleware,
      options: opts,
      params,
      path: path,
    })
  }

  public head(path: string | RegExp, middleware: Middleware[], params?: Params, opts?: RouteObj['options']) {
    return this.route({
      methods: [Methods.head],
      middleware,
      options: opts,
      params,
      path: path,
    })
  }

  public options(path: string | RegExp, middleware: Middleware[], params?: Params, opts?: RouteObj['options']) {
    return this.route({
      methods: [Methods.options],
      middleware,
      options: opts,
      params,
      path: path,
    })
  }

  public patch(path: string | RegExp, middleware: Middleware[], params?: Params, opts?: RouteObj['options']) {
    return this.route({
      methods: [Methods.patch],
      middleware,
      options: opts,
      params,
      path: path,
    })
  }

  public post(path: string | RegExp, middleware: Middleware[], params?: Params, opts?: RouteObj['options']) {
    return this.route({
      methods: [Methods.post],
      middleware,
      options: opts,
      params,
      path: path,
    })
  }

  public put(path: string | RegExp, middleware: Middleware[], params?: Params, opts?: RouteObj['options']) {
    return this.route({
      methods: [Methods.put],
      middleware,
      options: opts,
      params,
      path: path,
    })
  }

  public trace(path: string | RegExp, middleware: Middleware[], params?: Params, opts?: RouteObj['options']) {
    return this.route({
      methods: [Methods.trace],
      middleware,
      options: opts,
      params,
      path: path,
    })
  }

  public use(middleware: Middleware | Middleware[]) {
    if (Array.isArray(middleware)) {
      for (const singleMiddleware of middleware) {
        this.use(singleMiddleware)
      }
    } else {
      this.middleware.push(middleware)
    }

    return this
  }

  public param(param: string, middleware: Middleware) {
    this.params[param] = middleware
    return this
  }

  public version(identifier: string, options?: VersionOptions) {
    if (this.opts.versionHandler) {
      if (
        (this.opts.sensitive && !(identifier in this.versions)) ||
        (!this.opts.sensitive && !(identifier.toLowerCase() in this.versions))
      ) {
        const realIdentifier = this.opts.sensitive ? identifier : identifier.toLowerCase()

        let prefix: undefined | string

        if (this.opts.prefix && this.opts.versionHandler === 'url') {
          prefix = `${this.opts.prefix}/${realIdentifier}`
        } else if (this.opts.prefix && this.opts.versionHandler !== 'url') {
          prefix = `${this.opts.prefix}`
        } else if (!this.opts.prefix && this.opts.versionHandler === 'url') {
          prefix = `${realIdentifier}`
        }

        this.versions[realIdentifier] = new Router(this.deps, {
          ...this.opts,
          prefix,
          versionHandler: false,
          ...options,
        })

        return this.versions[identifier]
      } else {
        throw new Error(`Couldn't register version. Version with same identifier already registered`)
      }
    }

    throw new Error(`You're not allowed to to register version. Versionhandling is disabled by router config.`)
  }

  public get routes(): Middleware {
    const routes: Layer[] = []
    const versions: {[key: string]: Middleware} = {}

    for (const route of this.routeList) {
      const layerSetting = {
        ...route,
        middleware: [...this.middleware, ...route.middleware],
        options: {
          ...this.opts,
          ...route.options,
        },
        params: {...this.params, ...route.params},
      }

      const layer = this.deps.Layer.factory().register(layerSetting)

      routes.push(layer)
    }

    for (const versionID in this.versions) {
      versions[versionID] = this.versions[versionID].routes
    }

    const koaCompose = this.deps.koaCompose
    const options = this.opts
    const middleware = this.middleware

    return async function (ctx: Context, next: Next) {
      function matchRequestWithVersion(ctx: Context): Middleware | null {
        if (options.versionHandler) {
          if (typeof options.versionHandler === 'function') {
            const match = options.versionHandler(ctx, Object.keys(versions))
            if (match !== null && match in versions) {
              return versions[match]
            }
          } else if (options.versionHandler === 'header') {
            if (ctx.header.version) {
              const versionValue = Array.isArray(ctx.header.version) ? ctx.header.version.join() : ctx.header.version
              const requestedVersion = options.sensitive ? versionValue : versionValue.toLowerCase()
              if (requestedVersion in versions) {
                return versions[requestedVersion]
              }
            }
          } else {
            const path = ctx.request.path
            let match: Middleware | null = null
            for (const versionID in versions) {
              const prefix = options.prefix ? `/${options.prefix}/${versionID}/` : `/${versionID}/`
              if (path.startsWith(prefix, 0)) {
                match = versions[versionID]
                break
              }
            }
            return match
          }
        }

        return null
      }

      try {
        let httpError: httpErrors.HttpError | undefined
        const stack: Middleware[] = []
        if (!options.prefix || (options.prefix && ctx.request.path.startsWith(`/${options.prefix}`))) {
          const requestedVersion = matchRequestWithVersion(ctx)
          if (typeof requestedVersion === 'function') {
            for (const fnc of middleware) {
              stack.push(fnc)
            }
            stack.push(requestedVersion)
          } else {
            const path = options.prefix ? ctx.request.path.replace(`/${options.prefix}`, '') : ctx.request.path
            for (const route of routes) {
              if (route.match(ctx, path)) {
                const handled = route.handle(ctx, path)

                if (handled instanceof httpErrors.HttpError) {
                  if (httpError === undefined || handled.status >= httpError.status) {
                    httpError = handled
                  }
                } else {
                  stack.push(handled)
                }
              }
            }
          }
        }

        if (stack.length > 0) {
          await koaCompose(stack)(ctx, next)
        } else if (httpError !== undefined) {
          ctx.status = httpError.status
          if (options.expose || httpError.status < 500) {
            ctx.body = httpError.message
          }
          await next()
        }
      } catch (err) {
        ctx.status = err.status || 500
        if (options.expose) {
          ctx.body = err.message
        }
        ctx.app.emit('error', err, ctx)
        await next()
      }
    }
  }
}
