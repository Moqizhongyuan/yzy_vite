console.log('[vite] connecting...')

interface IPayload {
  type: string
  updates: Array<Update>
}

interface Update {
  type: 'js-update' | 'css-update'
  path: string
  acceptedPath: string
  timestamp: number
}

// 1. 创建客户端 WebSocket 实例
// 其中的 __HMR_PORT__ 之后会被 no-bundle 服务编译成具体的端口号
const socket = new WebSocket(`ws://localhost:__HMR_PORT__`, 'vite-hmr')

// 2. 接收服务端的更新信息
socket.addEventListener('message', async ({ data }) => {
  handleMessage(JSON.parse(data)).catch(console.error)
})

// 3. 根据不同的更新类型进行更新
async function handleMessage(payload: IPayload) {
  switch (payload.type) {
    case 'connected':
      console.log(`[vite] connected.`)
      // 心跳检测
      setInterval(() => {
        socket.send('ping')
      }, 1000)
      break

    case 'update':
      // 进行具体的模块更新
      payload.updates.forEach(async (update: Update) => {
        if (update.type === 'js-update') {
          // 具体的更新逻辑，后续来开发
          const fn = await fetchUpdate(update)
          if (fn) {
            fn()
          }
        }
      })
      break
  }
}

interface HotModule {
  id: string
  callbacks: HotCallback[]
}
interface HotCallback {
  deps: string[]
  fn: (modules: object[]) => void
}

const hotModulesMap = new Map<string, HotModule>()

const pruneMap = new Map<string, (data: unknown) => void | Promise<void>>()

export const createHotContext = (ownerPath: string) => {
  const mod = hotModulesMap.get(ownerPath)
  if (mod) {
    mod.callbacks = []
  }

  function acceptDeps(deps: string[], callback: (modules: object[]) => void) {
    const mod: HotModule = hotModulesMap.get(ownerPath) || {
      id: ownerPath,
      callbacks: []
    }

    mod.callbacks.push({
      deps,
      fn: callback
    })
    hotModulesMap.set(ownerPath, mod)
  }

  return {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars
    accept(deps: any, callback?: any) {
      // 这里仅考虑接受自身模块更新的情况
      // import.meta.hot.accept()
      if (typeof deps === 'function' || !deps) {
        acceptDeps([ownerPath], ([mod]) => deps && deps(mod))
      }
    },
    // 模块不再生效的回调
    // import.meta.hot.prune(() => {})
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    prune(cb: (data: any) => void) {
      pruneMap.set(ownerPath, cb)
    }
  }
}

async function fetchUpdate({ path, timestamp }: Update) {
  const mod = hotModulesMap.get(path)
  if (!mod) return

  const moduleMap = new Map()
  const modulesToUpdate = new Set<string>()
  modulesToUpdate.add(path)

  await Promise.all(
    Array.from(modulesToUpdate).map(async dep => {
      const [path, query] = dep.split(`?`)
      try {
        // 通过动态 import 拉取最新模块
        const newMod = await import(
          path + `?t=${timestamp}${query ? `&${query}` : ''}`
        )
        moduleMap.set(dep, newMod)
      } catch (e) {
        console.log(e)
      }
    })
  )

  return () => {
    // 拉取最新模块后执行更新回调
    for (const { deps, fn } of mod.callbacks) {
      fn(deps.map((dep: string) => moduleMap.get(dep)))
    }
    console.log(`[vite] hot updated: ${path}`)
  }
}

const sheetsMap = new Map()

export function updateStyle(id: string, content: string) {
  let style = sheetsMap.get(id)
  if (!style) {
    style = document.createElement('style')
    style.setAttribute('type', 'text/css')
    style.innerHTML = content
    document.head.appendChild(style)
  } else {
    style.innerHTML = content
  }
  sheetsMap.set(id, style)
}

export function removeStyle(id: string): void {
  const style = sheetsMap.get(id)
  if (style) {
    document.head.removeChild(style)
  }
  sheetsMap.delete(id)
}
