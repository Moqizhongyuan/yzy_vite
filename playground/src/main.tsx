import { StrictMode, useState } from 'react'
import { createRoot } from 'react-dom/client'
import React from 'react'
import reactLogo from './assets/react.svg'
import './index.css'
import './App.css'

// 定义 root 变量，用于复用

function App() {
  const [count, setCount] = useState(0)

  return (
    <>
      <div>
        <a href="https://react.dev" target="_blank">
          <img src={reactLogo} className="logo react" alt="React logo" />
        </a>
      </div>
      <h1>Vite + React</h1>
      <div className="card">
        <button onClick={() => setCount(count => count + 1)}>
          count is {count}
        </button>
        <p>
          Edit <code>src/App.tsx</code> and save to test HMR
        </p>
      </div>
      <p className="read-the-docs">
        Click on the Vite and React logos to learn more
      </p>
    </>
  )
}

// 初次挂载
const container = document.getElementById('root')!
const root: ReturnType<typeof createRoot> = createRoot(container)
root.render(
  <StrictMode>
    <App />
  </StrictMode>
)

// 热更新逻辑
import.meta.hot?.accept(() => {
  root.render(
    <StrictMode>
      <App />
    </StrictMode>
  )
})
