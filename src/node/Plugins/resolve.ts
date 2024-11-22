import { pathExists } from 'fs-extra'
import { Plugin } from '../plugin'
import { ServerContext } from '../server'
import path from 'path'
import { normalizePath } from '../util'
import resolve from 'resolve'
import { DEFAULT_EXTERSIONS } from '../constants'

export function resolvePlugin(): Plugin {
  let serverContext: ServerContext
  return {
    name: 'yzy_vite:resolve',
    configureServer(s) {
      serverContext = s
    },
    async resolveId(id: string, importer?: string) {
      if (path.isAbsolute(id)) {
        if (await pathExists(id)) {
          return { id }
        }
        id = path.join(serverContext.root, id)
        if (await pathExists(id)) {
          return { id }
        }
      } else if (id.startsWith('.')) {
        if (!importer) {
          throw new Error('`importer` should not be undefined')
        }
        const hasExtension = path.extname(id).length > 1
        let resolveId: string
        if (hasExtension) {
          resolveId = normalizePath(
            resolve.sync(id, { basedir: path.dirname(importer) })
          )
          if (await pathExists(resolveId)) {
            return { id: resolveId }
          }
        } else {
          for (const extname of DEFAULT_EXTERSIONS) {
            try {
              const withExtension = `${id}${extname}`
              resolveId = normalizePath(
                resolve.sync(withExtension, {
                  basedir: path.dirname(importer)
                })
              )
              if (await pathExists(resolveId)) {
                return { id: resolveId }
              }
            } catch (e) {
              console.log(e)
              continue
            }
          }
        }
      }
      return null
    }
  }
}
