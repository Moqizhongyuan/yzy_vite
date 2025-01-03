import { ModuleGraph } from './../ModuleGraph'
import connect from 'connect'
import { blue, green } from 'picocolors'
import { optimize } from '../optimizer'
import { resolvePlugins } from '../plugins'
import { createPluginContainer, PluginContainer } from '../pluginContainer'
import { Plugin } from '../plugin'
import { indexHtmlMiddleware } from './middlewares/indexHtml'
import { transformMiddleware } from './middlewares/transform'
import { staticMiddleware } from './middlewares/static'
import chokidar, { FSWatcher } from 'chokidar'
import { createWebSocketServer } from '../ws'
import { bindingHMREvents } from '../hmr'

export interface ServerContext {
  root: string
  pluginContainer: PluginContainer
  app: connect.Server
  plugins: Plugin[]
  moduleGraph: ModuleGraph
  ws: { send: (data: object) => void; close: () => void }
  watcher: FSWatcher
}

export async function startDevServer() {
  const moduleGraph = new ModuleGraph(url => pluginContainer.resolveId(url))
  const app = connect()
  const root = process.cwd()
  const startTime = Date.now()
  const plugins = resolvePlugins()
  const pluginContainer = createPluginContainer(plugins)
  const ws = createWebSocketServer(app)
  const watcher = chokidar.watch(root, {
    // 这里按数组写法不知道为什么会有bug？？？
    // ignored: ['**/node_modules/**', '**/.git/**'],
    ignored: file => file.includes('node_modules') || file.includes('.git'),
    ignoreInitial: true
  })
  const serverContext: ServerContext = {
    root: process.cwd(),
    app,
    pluginContainer,
    plugins,
    moduleGraph,
    ws,
    watcher
  }
  bindingHMREvents(serverContext)

  for (const plugin of plugins) {
    if (plugin.configureServer) {
      await plugin.configureServer(serverContext)
    }
  }

  app.use(indexHtmlMiddleware(serverContext))
  app.use(transformMiddleware(serverContext))
  app.use(staticMiddleware(serverContext.root))
  app.listen(3000, async () => {
    await optimize(root)
    console.log(
      green('🚀 No-Bundle 服务已经成功启动!'),
      `耗时: ${Date.now() - startTime}ms`
    )
    console.log(`> 本地访问路径: ${blue('http://localhost:3000')}`)
  })
}
