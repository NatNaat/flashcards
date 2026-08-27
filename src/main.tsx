import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { registerSW } from 'virtual:pwa-register'
import './index.css'
import 'katex/dist/katex.min.css'
import App from './App.tsx'

// immediate:true reloads the page as soon as a new deploy's service worker takes over, instead
// of silently sitting fully installed behind the already-open, still-stale tab (see vite.config.ts).
registerSW({ immediate: true })

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
