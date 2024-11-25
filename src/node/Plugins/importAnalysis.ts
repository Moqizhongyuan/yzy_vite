import { init, parse } from 'es-module-lexer'
import { Plugin } from '../plugin'
import { ServerContext } from '../server'
import {
  cleanUrl,
  getShortName,
  isInternalRequest,
  isJSRequest,
  normalizePath
} from '../util'
import MagicString from 'magic-string'
import {
  BARE_IMPORT_RE,
  CLIENT_PUBLIC_PATH,
  PRE_BUNDLE_DIR
} from '../constants'
import path from 'path'

export function importAnalysisPlugin(): Plugin {
  let serverContext: ServerContext
  return {
    name: 'yzy_vite:import-analysis',
    configureServer(s) {
      serverContext = s
    },
    async transform(code: string, id: string) {
      if (!isJSRequest(id) || isInternalRequest(id)) {
        return null
      }
      await init
      const [imports] = parse(code)
      const ms = new MagicString(code)
      const resolve = async (id: string, importer?: string) => {
        const resolved = await serverContext.pluginContainer.resolveId(
          id,
          normalizePath(importer ?? '')
        )
        if (!resolved) {
          return
        }
        const cleanId = cleanUrl(resolved?.id)
        const mod = moduleGraph.getModuleById(cleanId)
        let resolveId = `/${getShortName(resolved?.id, serverContext.root)}`
        if (mod && mod.lastHMRTimestamp > 0) {
          resolveId += '?t=' + mod.lastHMRTimestamp
        }
        return resolveId
      }
      const { moduleGraph } = serverContext
      const curMod = moduleGraph.getModuleById(id)
      const importedModules = new Set<string>()
      for (const importInfo of imports) {
        const { s: modStart, e: modEnd, n: modSource } = importInfo
        if (!modSource) continue
        if (modSource.endsWith('.svg')) {
          const resolveUrl = path.join(path.dirname(id), modSource)
          ms.overwrite(modStart, modEnd, `${resolveUrl}?import`)
          continue
        }
        if (BARE_IMPORT_RE.test(modSource)) {
          const bundlePath = normalizePath(
            path.join('/', PRE_BUNDLE_DIR, `${modSource}.js`)
          )
          ms.overwrite(modStart, modEnd, bundlePath)
          importedModules.add(bundlePath)
        } else if (modSource.startsWith('.') || modSource.startsWith('/')) {
          const resolved = await resolve(modSource, id)
          if (resolved) {
            ms.overwrite(modStart, modEnd, resolved)
            importedModules.add(resolved)
          }
        }
      }
      if (!id.includes('node_modules')) {
        ms.prepend(
          `import { createHotContext as __vite__createHotContext } from "${CLIENT_PUBLIC_PATH}";` +
            `import.meta.hot = __vite__createHotContext(${JSON.stringify(
              cleanUrl(curMod!.url)
            )});`
        )
      }
      moduleGraph.updateModuleInfo(curMod!, importedModules)
      return {
        code: ms.toString(),
        map: ms.generateMap()
      }
    }
  }
}
