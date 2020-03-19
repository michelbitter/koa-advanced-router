import {RouterDependencies, RouterOptions} from './router.interfaces'
import {Params, Methods, RouteObj} from '../layer/layer.interfaces'
import Layer from '../layer/layer'
import {Middleware, Context, Next} from 'koa'
import {v4 as uuidV4} from 'uuid'
import * as httpErrors from 'http-errors'
import * as koaCompose from 'koa-compose'

export default class Router {
  private opts: RouterOptions = {
    allowedMethods: true,
    version: false,
    expose: false,
  }

  public static factory(opts?: RouterOptions) {
    return new this(
      {
        uuid: uuidV4,
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
      path: path,
      middlewares,
      params,
      options: opts,
    })
  }

  public connect(path: string | RegExp, middlewares: Middleware[], opts?: RouteObj['options']) {
    return this.route({
      methods: [Methods.connect],
      path: path,
      middlewares,
      options: opts,
    })
  }

  public delete(path: string | RegExp, middlewares: Middleware[], opts?: RouteObj['options']) {
    return this.route({
      methods: [Methods.delete],
      path: path,
      middlewares,
      options: opts,
    })
  }

  public get(path: string | RegExp, middlewares: Middleware[], opts?: RouteObj['options']) {
    return this.route({
      methods: [Methods.get],
      path: path,
      middlewares,
      options: opts,
    })
  }

  public head(path: string | RegExp, middlewares: Middleware[], opts?: RouteObj['options']) {
    return this.route({
      methods: [Methods.head],
      path: path,
      middlewares,
      options: opts,
    })
  }

  public options(path: string | RegExp, middlewares: Middleware[], opts?: RouteObj['options']) {
    return this.route({
      methods: [Methods.options],
      path: path,
      middlewares,
      options: opts,
    })
  }

  public patch(path: string | RegExp, middlewares: Middleware[], opts?: RouteObj['options']) {
    return this.route({
      methods: [Methods.patch],
      path: path,
      middlewares,
      options: opts,
    })
  }

  public post(path: string | RegExp, middlewares: Middleware[], opts?: RouteObj['options']) {
    return this.route({
      methods: [Methods.post],
      path: path,
      middlewares,
      options: opts,
    })
  }

  public put(path: string | RegExp, middlewares: Middleware[], opts?: RouteObj['options']) {
    return this.route({
      methods: [Methods.put],
      path: path,
      middlewares,
      options: opts,
    })
  }

  public trace(path: string | RegExp, middlewares: Middleware[], opts?: RouteObj['options']) {
    return this.route({
      methods: [Methods.trace],
      path: path,
      middlewares,
      options: opts,
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
        params: {...this.params, ...route.params},
        options: {
          ...this.opts,
          ...route.options,
        },
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
