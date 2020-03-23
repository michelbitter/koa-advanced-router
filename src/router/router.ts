import {RouterDependencies, RouterOptions} from './router.interfaces'
import {Params, Methods, RouteObj} from '../layer/layer.interfaces'
import Layer from '../layer/layer'
import {Middleware, Context, Next} from 'koa'
import * as httpErrors from 'http-errors'
import * as koaCompose from 'koa-compose'

export default class Router {
  private opts: RouterOptions = {
    allowedMethods: true,
    expose: false,
    version: false,
  }

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

  public get routes(): Middleware {
    const routes: Layer[] = []

    for (const route of this.routeList) {
      const layer = this.deps.Layer.factory().register({
        ...route,
        middleware: [...this.middleware, ...route.middleware],
        options: {
          ...this.opts,
          ...route.options,
        },
        params: {...this.params, ...route.params},
      })

      routes.push(layer)
    }
    const koaCompose = this.deps.koaCompose
    const opts = this.opts
    return async function(ctx: Context, next: Next) {
      try {
        let httpError: httpErrors.HttpError | undefined
        const stack: Middleware[] = []

        for (const route of routes) {
          if (route.match(ctx)) {
            const handled = route.handle(ctx)

            if (handled instanceof httpErrors.HttpError) {
              if (httpError === undefined || handled.status >= httpError.status) {
                httpError = handled
              }
            } else {
              stack.push(handled)
            }
          }
        }

        if (stack.length > 0) {
          await koaCompose(stack)(ctx, next)
        } else if (httpError !== undefined) {
          ctx.status = httpError.status
          if (opts.expose || httpError.status < 500) {
            ctx.body = httpError.message
          }
          await next()
        }
      } catch (err) {
        ctx.status = err.status || 500
        if (opts.expose) {
          ctx.body = err.message
        }
        ctx.app.emit('error', err, ctx)
        await next()
      }
    }
  }
}
