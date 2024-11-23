import createDebug from 'debug'
import { ServerContext } from '..'
import {
  cleanUrl,
  isCSSRequest,
  isImportRequest,
  isJSRequest
} from '../../util'
import { NextHandleFunction } from 'connect'
import { SourceDescription } from 'rollup'

const debug = createDebug('dev')

export async function transformRequest(
  url: string,
  serverContext: ServerContext
) {
  const { pluginContainer } = serverContext
  url = cleanUrl(url)
  const resolvedResult = await pluginContainer.resolveId(url)
  let transformResult
  if (resolvedResult?.id) {
    let code = await pluginContainer.load(resolvedResult.id)
    if (typeof code === 'object' && code !== null) {
      code = code.code
    }

    if (code) {
      transformResult = await pluginContainer.transform(code, resolvedResult.id)
    }
  }
  return transformResult
}

export function transformMiddleware(
  serverContext: ServerContext
): NextHandleFunction {
  return async (req, res, next) => {
    if (req.method !== 'GET' || !req.url) {
      return next()
    }
    const url = req.url
    debug('transformMiddleware: %s', url)
    if (isJSRequest(url) || isCSSRequest(url) || isImportRequest(url)) {
      let result: SourceDescription | null | undefined | string =
        await transformRequest(url, serverContext)
      if (!result) {
        return next()
      }
      if (result && typeof result !== 'string') {
        result = result.code
      }

      res.statusCode = 200
      res.setHeader('Content-Type', 'application/javascript')
      return res.end(result)
    }

    next()
  }
}
