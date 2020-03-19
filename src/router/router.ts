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

  private middlewares: Middleware[] = []
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

  public all(path: string | RegExp, middlewares: Middleware[], params?: Params, opts?: RouteObj['options']) {
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
      middlewares,
      options: opts,
      params,
      path: path,
    })
  }

  public connect(path: string | RegExp, middlewares: Middleware[], params?: Params, opts?: RouteObj['options']) {
    return this.route({
      methods: [Methods.connect],
      middlewares,
      options: opts,
      params,
      path: path,
    })
  }

  public delete(path: string | RegExp, middlewares: Middleware[], params?: Params, opts?: RouteObj['options']) {
    return this.route({
      methods: [Methods.delete],
      middlewares,
      options: opts,
      params,
      path: path,
    })
  }

  public get(path: string | RegExp, middlewares: Middleware[], params?: Params, opts?: RouteObj['options']) {
    return this.route({
      methods: [Methods.get],
      middlewares,
      options: opts,
      params,
      path: path,
    })
  }

  public head(path: string | RegExp, middlewares: Middleware[], params?: Params, opts?: RouteObj['options']) {
    return this.route({
      methods: [Methods.head],
      middlewares,
      options: opts,
      params,
      path: path,
    })
  }

  public options(path: string | RegExp, middlewares: Middleware[], params?: Params, opts?: RouteObj['options']) {
    return this.route({
      methods: [Methods.options],
      middlewares,
      options: opts,
      params,
      path: path,
    })
  }

  public patch(path: string | RegExp, middlewares: Middleware[], params?: Params, opts?: RouteObj['options']) {
    return this.route({
      methods: [Methods.patch],
      middlewares,
      options: opts,
      params,
      path: path,
    })
  }

  public post(path: string | RegExp, middlewares: Middleware[], params?: Params, opts?: RouteObj['options']) {
    return this.route({
      methods: [Methods.post],
      middlewares,
      options: opts,
      params,
      path: path,
    })
  }

  public put(path: string | RegExp, middlewares: Middleware[], params?: Params, opts?: RouteObj['options']) {
    return this.route({
      methods: [Methods.put],
      middlewares,
      options: opts,
      params,
      path: path,
    })
  }

  public trace(path: string | RegExp, middlewares: Middleware[], params?: Params, opts?: RouteObj['options']) {
    return this.route({
      methods: [Methods.trace],
      middlewares,
      options: opts,
      params,
      path: path,
    })
  }

  public use(middlewares: Middleware | Middleware[]) {
    if (Array.isArray(middlewares)) {
      for (const singleMiddleware of middlewares) {
        this.use(singleMiddleware)
      }
    } else {
      this.middlewares.push(middlewares)
    }

    return this
  }

  public param(param: string, middlewares: Middleware) {
    this.params[param] = middlewares
    return this
  }

  public get routes(): Middleware {
    const routes: Layer[] = []

    for (const route of this.routeList) {
      const layer = this.deps.Layer.factory().register({
        ...route,
        middlewares: [...this.middlewares, ...route.middlewares],
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
