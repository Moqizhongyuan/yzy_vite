import { Plugin } from '../plugin'
import { ServerContext } from '../server'
import {
  cleanUrl,
  getShortName,
  normalizePath,
  removeImportQuery
} from '../util'

export function assetPlugin(): Plugin {
  let serverContext: ServerContext
  return {
    name: 'yzy_vite:asset',
    configureServer(s) {
      serverContext = s
    },
    async load(id) {
      const cleanedId = removeImportQuery(cleanUrl(id))
      const resolveId = getShortName(normalizePath(id), serverContext.root)
      if (cleanedId.endsWith('.svg')) {
        return {
          code: `export default "${resolveId}"`
        }
      }
    }
  }
}
