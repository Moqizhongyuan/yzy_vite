import { init, parse } from 'es-module-lexer'
import { Plugin } from '../plugin'
import { ServerContext } from '../server'
import { isJSRequest, normalizePath } from '../util'
import MagicString from 'magic-string'
import { BARE_IMPORT_RE, PRE_BUNDLE_DIR } from '../constants'
import path from 'path'

export function importAnalysisPlugin(): Plugin {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  let serverContext: ServerContext
  return {
    name: 'yzy_vite:import-analysis',
    configureServer(s) {
      serverContext = s
    },
    async transform(code: string, id: string) {
      if (!isJSRequest(id)) {
        return null
      }
      await init
      const [imports] = parse(code)
      const ms = new MagicString(code)
      for (const importInfo of imports) {
        const { s: modStart, e: modEnd, n: modSource } = importInfo
        if (!modSource) continue
        if (BARE_IMPORT_RE.test(modSource)) {
          const bundlePath = normalizePath(
            path.join('/', PRE_BUNDLE_DIR, `${modSource}.js`)
          )
          ms.overwrite(modStart, modEnd, bundlePath)
        }
      }
      return {
        code: ms.toString(),
        map: ms.generateMap()
      }
    }
  }
}
