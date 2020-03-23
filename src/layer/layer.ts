import {LayerDependencies, RouteObj, Methods, MatchedParam} from './layer.interfaces'
import {Context, Middleware, Next} from 'koa'
import * as httpErrors from 'http-errors'
import CORSHandler from '../corsHandler/corsHandler'
import * as koaCompose from 'koa-compose'
import * as path2regexp from 'path-to-regexp'

export class Route {
  private route?: RouteObj

  public static factory() {
    return new this({
      CORSHandler: CORSHandler.factory(),
      httpErrors,
      koaCompose,
      path2regexp,
    })
  }

  // eslint-disable-next-line no-useless-constructor
  public constructor(private deps: LayerDependencies) {}

  public register(route: RouteObj) {
    if (this.route !== undefined) {
      this.route = route
      return this
    }

    throw new Error('Route is already registered.')
  }

  public handle(ctx: Context) {
    if (this.route !== undefined) {
      const path = ctx.request.path
      if (this.route.path instanceof RegExp) {
        const match = this.route.path.exec(path)
        if (match) {
          return this.HandleRequestAfterPathMatches(ctx, {
            index: match.index,
            params: match.groups || {},
            path: path,
          })
        }
      } else {
        const matchFnc = this.deps.path2regexp.match<MatchedParam>(path, this.route.options)
        const match = matchFnc(path)
        if (match) {
          return this.HandleRequestAfterPathMatches(ctx, match)
        }
      }
    }

    return new this.deps.httpErrors.NotFound()
  }

  public match(ctx: Context) {
    if (this.route !== undefined) {
      const path = ctx.request.path
      if (this.route.path instanceof RegExp) {
        const match = this.route.path.exec(path)
        if (match) {
          return this.MatchRequestAfterPathMatches(ctx)
        }
      } else {
        const matchFnc = this.deps.path2regexp.match(path, this.route.options)
        const match = matchFnc(path)
        if (match) {
          return this.MatchRequestAfterPathMatches(ctx)
        }
      }
    }

    return new this.deps.httpErrors.NotFound()
  }

  private MakeFromArrayHeaderValue(list: (number | string)[]) {
    let result = ''

    list.forEach(item => {
      result += result.length > 0 ? `, ${item}` : item
    })

    return result
  }

  private HandleRequestAfterPathMatches(ctx: Context, match: path2regexp.MatchResult<MatchedParam>) {
    if (this.route !== undefined) {
      const method: string = ctx.request.method.toUpperCase()
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      if (this.route.methods.includes(method as any)) {
        const stack: Middleware[] = []
        if (this.route.params) {
          const params = this.route.params
          const matchedGroups = match.params
          if (matchedGroups) {
            for (const matchedGroupName in matchedGroups) {
              if (params[matchedGroupName]) {
                stack.push(async function(ctx: Context, next: Next) {
                  await params[matchedGroupName](ctx, next, matchedGroups[matchedGroupName])
                })
              }
            }
          }
        }

        for (const middleware of this.route.middleware) {
          stack.push(middleware)
        }

        return this.deps.koaCompose(stack)
      } else if (
        method === Methods.options &&
        this.route.options !== undefined &&
        this.route.options.cors !== undefined
      ) {
        const result = this.deps.CORSHandler.GenerateCORSResponse(ctx, this.route)
        const stack: Middleware[] = [
          async function(ctx: Context) {
            if (result instanceof httpErrors.HttpError) {
              ctx.response.status = result.status
            } else {
              ctx.response = result.response
            }
          },
        ]

        return this.deps.koaCompose(stack)
      } else {
        const httpError = new this.deps.httpErrors.MethodNotAllowed()
        httpError.headers = {
          Allow: this.MakeFromArrayHeaderValue(this.route.methods),
        }

        return httpError
      }
    }

    return new this.deps.httpErrors.NotFound()
  }

  private MatchRequestAfterPathMatches(ctx: Context) {
    if (this.route !== undefined) {
      const method: string = ctx.request.method.toUpperCase()
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      if (this.route.methods.includes(method as any)) {
        return true
      } else if (
        method === Methods.options &&
        this.route.options !== undefined &&
        this.route.options.cors !== undefined
      ) {
        return true
      } else if (this.route.options && this.route.options.allowedMethods) {
        return true
      }
    }

    return false
  }
}

export default Route
