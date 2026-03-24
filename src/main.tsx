import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { initAutoSearchScheduler } from './services/autoSearchScheduler'

// 初始化自动搜索调度器（在应用启动时）
initAutoSearchScheduler()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)