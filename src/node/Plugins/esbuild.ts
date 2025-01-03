import { readFile } from 'fs-extra'
import { Plugin } from '../plugin'
import { isJSRequest } from '../util'
import path from 'path'
import esbuild from 'esbuild'

export function esbuildTransformPlugin(): Plugin {
  return {
    name: 'yzy_vite:esbuild-transform',
    async load(id: string) {
      if (isJSRequest(id)) {
        try {
          const code = await readFile(id, 'utf-8')
          return code
        } catch (e) {
          console.log(e)
          return null
        }
      }
    },
    async transform(code, id) {
      if (isJSRequest(id)) {
        const extname = path.extname(id).slice(1)
        const { code: transformCode, map } = await esbuild.transform(code, {
          target: 'esnext',
          format: 'esm',
          sourcemap: true,
          loader: extname as 'js' | 'ts' | 'jsx' | 'tsx'
        })
        return {
          code: transformCode,
          map
        }
      }
      return null
    }
  }
}
