import { StrictMode } from 'react'
import { flushSync } from 'react-dom'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App.jsx'
import AuthProvider from './context/AuthProvider.jsx'
import './index.css'

const root = createRoot(document.getElementById('root'))

flushSync(() => {
  root.render(
    <StrictMode>
      <BrowserRouter>
        <AuthProvider>
          <App />
        </AuthProvider>
      </BrowserRouter>
    </StrictMode>,
  )
})

document.documentElement.classList.remove('app-loading')
document.documentElement.classList.add('app-ready')
document.getElementById('initial-loading-shell')?.remove()
