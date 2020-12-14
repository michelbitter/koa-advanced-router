import {CORSHandlerDependencies, CorsSettings, CorsHeaders} from './corsHandler.interfaces'
import {Context} from 'koa'
import {RouteObj} from '../layer/layer.interfaces'
import * as httpErrors from 'http-errors'

export class CORSHandler {
  // eslint-disable-next-line no-useless-constructor
  public constructor(private deps: CORSHandlerDependencies) {}

  public static factory() {
    return new this({
      httpErrors,
    })
  }

  public GenerateCORSResponse(ctx: Context, route: RouteObj) {
    if (route.options && route.options.cors) {
      let results: (false | CorsHeaders)[] = []
      if (Array.isArray(route.options.cors)) {
        results = route.options.cors.map(corsSettings => this.handleCorsSettings(ctx, corsSettings))
      } else {
        results = [this.handleCorsSettings(ctx, route.options.cors)]
      }

      const matches = results.filter(result => typeof result !== 'boolean') as CorsHeaders[]

      if (matches.length > 0) {
        ctx.status = 204
        const headers = this.mergeCorsHeaders(matches)
        for (const name in headers) {
          const headerName = name as keyof CorsHeaders
          if (headers[headerName] && headers[headerName].toString().length > 0) {
            ctx.set(headerName, headers[headerName].toString())
          }
        }
        return ctx
      }

      return new this.deps.httpErrors.Forbidden()
    }

    return new this.deps.httpErrors.NotFound()
  }

  public getCORSHeaders(ctx: Context, route: RouteObj) {
    if (route.options && route.options.cors) {
      let results: (false | CorsHeaders)[] = []
      if (Array.isArray(route.options.cors)) {
        results = route.options.cors.map(corsSettings => this.handleCorsSettings(ctx, corsSettings))
      } else {
        results = [this.handleCorsSettings(ctx, route.options.cors)]
      }

      const matches = results.filter(result => typeof result !== 'boolean') as CorsHeaders[]

      if (matches.length > 0) {
        return this.mergeCorsHeaders(matches)
      }
    }

    return false
  }

  private handleCorsSettings(ctx: Context, cors: CorsSettings) {
    if (this.OriginIsAllowed(ctx, cors)) {
      const corsHeaders: CorsHeaders = {
        'Access-Control-Allow-Credentials': cors.allowCredentials,
        'Access-Control-Allow-Headers': this.MakeFromArrayHeaderValue(cors.allowedHeaders),
        'Access-Control-Allow-Methods': this.MakeFromArrayHeaderValue(cors.allowedMethods),
        'Access-Control-Allow-Origin': ctx.request.header.origin,
        'Access-Control-Expose-Headers': this.MakeFromArrayHeaderValue(cors.exposedHeaders),
        'Access-Control-Max-Age': cors.maxAge,
      }

      return corsHeaders
    }

    return false
  }

  private OriginIsAllowed(ctx: Context, cors: CorsSettings) {
    if (Array.isArray(cors.allowedOrigin)) {
      const results: boolean[] = cors.allowedOrigin.map(allowedOrigins =>
        this.OriginIsAllowed(ctx, {...cors, allowedOrigin: allowedOrigins}),
      )
      return results.includes(true)
    } else if (typeof cors.allowedOrigin === 'function') {
      return cors.allowedOrigin(ctx)
    } else if (cors.allowedOrigin instanceof RegExp) {
      return cors.allowedOrigin.test(ctx.request.header.origin)
    } else {
      return cors.allowedOrigin === '*' || ctx.request.header.origin === cors.allowedOrigin
    }
  }

  private mergeCorsHeaders(corsResults: CorsHeaders[]) {
    if (corsResults.length > 1) {
      const allowCredentials = corsResults.map(cors => cors['Access-Control-Allow-Credentials'])
      const allowedHeaders = corsResults.map(cors => cors['Access-Control-Expose-Headers'])
      const allowedMethods = corsResults.map(cors => cors['Access-Control-Allow-Methods'])
      const allowedOrigin = corsResults.map(cors => cors['Access-Control-Allow-Origin'])
      const exposeHeaders = corsResults.map(cors => cors['Access-Control-Expose-Headers'])
      const maxAge = corsResults.map(cors => cors['Access-Control-Max-Age'])

      const result: CorsHeaders = {
        'Access-Control-Allow-Credentials': allowCredentials.includes(true),
        'Access-Control-Allow-Headers': this.MergeHeaderArrays(allowedHeaders),
        'Access-Control-Allow-Methods': this.MergeHeaderArrays(allowedMethods),
        'Access-Control-Allow-Origin': allowedOrigin[0],
        'Access-Control-Expose-Headers': this.MergeHeaderArrays(exposeHeaders),
        'Access-Control-Max-Age': maxAge.sort()[0],
      }

      return result
    } else if (corsResults.length === 1) {
      return corsResults[0]
    }

    throw new this.deps.httpErrors.InternalServerError('Unexpected error during merging CORS headers')
  }

  private MergeHeaderArrays(headerValues: string[]) {
    let allItems: string[] = []

    for (const headerValue of headerValues) {
      allItems = allItems.concat(headerValue.split(', '))
    }

    const UniqueItems = Array.from(new Set(allItems))
    return this.MakeFromArrayHeaderValue(UniqueItems)
  }

  private MakeFromArrayHeaderValue(list: (number | string)[]) {
    let result = ''

    list.forEach(item => {
      result += result.length > 0 ? `, ${item}` : item
    })

    return result
  }
}

export default CORSHandler
